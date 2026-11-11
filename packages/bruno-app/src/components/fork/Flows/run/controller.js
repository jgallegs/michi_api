import { findCollectionByUid, findEnvironmentInCollection, getAllVariables } from 'utils/collections';
import { confirmFlowInSensitiveEnvironment } from 'components/fork/SensitiveEnvironment';
import { RUN_STATUS, runFlow } from '../engine/run';
import { getFlow } from '../store';
import { titleOf } from '../canvas/pickers';
import { OPERATOR_LABELS } from '../canvas/pieces';
import { describeRequest } from '../canvas/requests';
import { say as inWords } from '../language';
import { createRunHost } from './host';
import { RUN_PHASE, appendRunLog, getRunSession, patchRunSession } from './session';

export const RUN_MODE = { RUN: 'run', STEP: 'step', CONTINUE: 'continue' };

// Long enough to follow the run on the canvas, short enough not to slow a real flow down.
const STEP_DELAY_MS = 180;
const MAX_DETAIL_LENGTH = 20000;

const active = new Map();

const word = (text) => ({ text, translate: true });

const detailOf = (value) => {
  if (value === undefined) {
    return undefined;
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}\n…` : text;
};

const short = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text === undefined ? '' : text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

const isSuccess = (status) => status >= 200 && status < 300;

// What a finished step leaves on the canvas (a small tag on the step) and in the output.
const describeOutcome = (detail, port) => {
  switch (detail?.kind) {
    case 'response': {
      const { status, statusText, duration, data, tests } = detail.response;
      const tone = isSuccess(status) ? 'ok' : 'bad';
      // The tests the request carries are told next to its answer; one that fails stands out.
      const tested = tests ? ['·', `${tests.passed}/${tests.passed + tests.failed}`, word('tests')] : [];
      return {
        tag: { text: `${status} · ${duration ?? 0} ms`, tone: tests?.failed ? 'bad' : tone },
        tone: tests?.failed ? 'warning' : tone,
        parts: [`${status}${statusText ? ` ${statusText}` : ''}`, '·', `${duration ?? 0} ms`, ...tested],
        detail: tests?.failed ? `${tests.failures.map((failure) => `✗ ${failure}`).join('\n')}\n\n${detailOf(data) ?? ''}` : detailOf(data)
      };
    }
    case 'start':
      return detail.answers?.length ? { parts: detail.answers.map((answer) => `${answer.name || '?'} = ${short(answer.value)}`).flatMap((text, index) => (index ? ['·', text] : [text])) } : null;
    case 'tests':
      return { tag: { text: detail.result ? 'Yes' : 'No', translate: true }, parts: [`${detail.passed}/${detail.passed + detail.failed}`, word('tests'), '→', word(detail.result ? 'Yes' : 'No')] };
    case 'flow':
      return { parts: [word('Ran the flow'), detail.name] };
    case 'check':
      return { tag: { text: detail.result ? 'Yes' : 'No', translate: true }, parts: [`${detail.status}`, '→', word(detail.result ? 'Yes' : 'No')] };
    case 'comparison':
      return {
        tag: { text: detail.result ? 'Yes' : 'No', translate: true },
        parts: [short(detail.left), word(OPERATOR_LABELS[detail.operator]), short(detail.right), '→', word(detail.result ? 'Yes' : 'No')]
      };
    case 'validation': {
      const verdict = detail.valid ? 'Valid' : 'Not valid';
      return {
        tag: { text: verdict, translate: true, tone: detail.valid ? 'ok' : 'bad' },
        ...(detail.valid ? {} : { tone: 'warning' }),
        parts: [short(detail.left), word(OPERATOR_LABELS[detail.operator]), short(detail.right), '→', word(verdict)]
      };
    }
    case 'repeat':
      return { parts: port === 'exit' ? [word('Nothing to repeat')] : [word('Round'), '1', word('of'), `${detail.times}`] };
    case 'leave':
      return { parts: [word('Leaves the loop on round'), `${detail.index}`, word('of'), `${detail.times}`] };
    case 'note':
      return { parts: [short(detail.message)], detail: typeof detail.message === 'object' ? detailOf(detail.message) : undefined };
    case 'wait':
      return { tag: { text: `${detail.seconds} s` }, parts: [`${detail.seconds} s`] };
    case 'value':
      return { parts: [`${detail.name} =`, short(detail.value)], detail: typeof detail.value === 'object' ? detailOf(detail.value) : undefined };
    case 'list':
      return { parts: [`${detail.items.length}`, word(detail.items.length === 1 ? 'item' : 'items')], detail: detailOf(detail.items) };
    case 'stop':
      return { parts: detail.message ? [short(detail.message)] : [] };
    default:
      return null;
  }
};

const ENDINGS = {
  [RUN_STATUS.COMPLETED]: { tone: 'ok', parts: [word('Finished')] },
  [RUN_STATUS.STOPPED]: { tone: 'ok', parts: [word('Stopped by a Stop step')] },
  [RUN_STATUS.CANCELLED]: { tone: 'warning', parts: [word('Stopped')] },
  [RUN_STATUS.PAUSED]: null,
  [RUN_STATUS.FAILED]: null,
  [RUN_STATUS.INVALID]: null
};

const readCollection = (store, collectionUid) => findCollectionByUid(store.getState().collections.collections, collectionUid);

const environmentOf = (collection) => findEnvironmentInCollection(collection, collection.activeEnvironmentUid) || null;

// A sensitive environment is confirmed once per run, and again if the environment changes before continuing.
const confirmEnvironment = async (flowId, collection, isFresh) => {
  const environmentUid = collection.activeEnvironmentUid || null;
  if (!isFresh && getRunSession(flowId).confirmedEnvironment === environmentUid) {
    return true;
  }
  const confirmed = await confirmFlowInSensitiveEnvironment(collection);
  if (confirmed) {
    patchRunSession(flowId, { confirmedEnvironment: environmentUid });
  }
  return confirmed;
};

export const stopRun = (flowId) => {
  const run = active.get(flowId);
  if (run) {
    run.controller.abort();
    run.host.cancelSending();
  }
};

// "inputs" are the answers to the questions of Start. "from" starts at that step with what the last
// run left, instead of at Start; with "only", it runs that step and waits.
export const startRun = async ({ store, collectionUid, collectionPath, flowId, mode = RUN_MODE.RUN, inputs, from, only = false }) => {
  if (active.has(flowId)) {
    return;
  }
  const flow = getFlow(collectionPath, flowId);
  const collection = readCollection(store, collectionUid);
  if (!flow || !collection) {
    return;
  }

  const previous = getRunSession(flowId);
  const isFresh = !from && (mode === RUN_MODE.RUN || !previous.resume);
  const controller = new AbortController();
  const host = createRunHost({ store, collectionUid, collectionPath, signal: controller.signal });
  active.set(flowId, { controller, host });

  try {
    if (!(await confirmEnvironment(flowId, collection, isFresh))) {
      return;
    }

    const titles = new Map(flow.nodes.map((node) => [node.id, titleOf(node, node.type === 'request' ? describeRequest(collection, node) : null)]));
    const labelOf = (nodeId) => ({ text: titles.get(nodeId), translate: flow.nodes.find((node) => node.id === nodeId)?.type !== 'request' });
    const say = (entry) => appendRunLog({ flowId, ...entry });

    // Tests of the requests, counted over the whole run, the flows inside included.
    const tally = isFresh || from ? { passed: 0, failed: 0 } : { ...(previous.tests || { passed: 0, failed: 0 }) };
    const count = (detail) => {
      const tests = detail?.kind === 'response' ? detail.response.tests : null;
      if (tests) {
        tally.passed += tests.passed;
        tally.failed += tests.failed;
      }
    };

    if (isFresh) {
      patchRunSession(flowId, { phase: RUN_PHASE.RUNNING, outcome: null, steps: {}, loops: {}, lists: {}, contents: {}, tests: null, hop: null, resume: null });
      say({ kind: 'header', label: { text: flow.name }, parts: [environmentOf(collection)?.name || word('No environment')] });
    } else if (from) {
      patchRunSession(flowId, { phase: RUN_PHASE.RUNNING, outcome: null, tests: null, hop: null, resume: null });
      say({ kind: 'header', label: { text: flow.name }, parts: [environmentOf(collection)?.name || word('No environment'), '·', word(only ? 'only the step' : 'from the step'), inWords(titles.get(from) || '')] });
    } else {
      patchRunSession(flowId, { phase: RUN_PHASE.RUNNING, outcome: null });
    }

    let left = null;
    let hops = 0;
    // What happens in a flow run by a step is told under that step, with the name of the flow in front.
    const tellInside = (inner, event, prefix) => {
      const path = `${prefix}${inner.name} › `;
      const node = inner.nodes.find((candidate) => candidate.id === event.nodeId);
      const title = node ? titleOf(node, node.type === 'request' ? describeRequest(collection, node) : null) : '';
      const label = { text: `${path}${node?.type === 'request' ? title : inWords(title)}` };
      if (event.type === 'inside') {
        tellInside(event.flow, event.event, path);
      } else if (event.type === 'node-finished') {
        count(event.detail);
        const outcome = describeOutcome(event.detail, event.port);
        if (outcome) {
          say({ kind: 'step', tone: outcome.tone, label, parts: outcome.parts, detail: outcome.detail });
        }
      } else if (event.type === 'iteration') {
        say({ kind: 'step', label, parts: [word('Round'), `${event.index}`, word('of'), `${event.times}`] });
      } else if (event.type === 'warning' || event.type === 'node-failed') {
        say({ kind: 'step', tone: event.type === 'warning' ? 'warning' : 'bad', label, parts: [{ text: event.message || event.error, translate: true }] });
      }
    };

    const onEvent = (event) => {
      if (event.type === 'inside') {
        tellInside(event.flow, event.event, '');
      } else if (event.type === 'node-started') {
        const between = left ? flow.edges.filter((edge) => edge.source === left.nodeId && edge.target === event.nodeId) : [];
        // A step can also follow another one through a cable that carries a value.
        const cable = between.find((edge) => edge.sourcePort === left.port) || between[0];
        hops += 1;
        patchRunSession(flowId, (session) => ({
          steps: { ...session.steps, [event.nodeId]: { ...session.steps[event.nodeId], state: 'running' } },
          hop: cable ? { edgeId: cable.id, key: `${flowId}:${hops}` } : session.hop
        }));
      } else if (event.type === 'node-finished') {
        const outcome = describeOutcome(event.detail, event.port);
        count(event.detail);
        left = { nodeId: event.nodeId, port: event.port };
        patchRunSession(flowId, (session) => ({
          steps: { ...session.steps, [event.nodeId]: { state: 'done', tag: outcome?.tag || session.steps[event.nodeId]?.tag } },
          loops: event.detail?.kind === 'repeat' && event.port === 'body' ? { ...session.loops, [event.nodeId]: { index: 1, times: event.detail.times } } : session.loops,
          lists: event.detail?.kind === 'list' ? { ...session.lists, [event.detail.listNodeId]: event.detail.items.length } : session.lists,
          // What each list holds, for the step to show it and for its report.
          contents: event.detail?.kind === 'list' ? { ...session.contents, [event.detail.listNodeId]: event.detail.items } : session.contents
        }));
        if (outcome) {
          say({ kind: 'step', tone: outcome.tone, label: labelOf(event.nodeId), parts: outcome.parts, detail: outcome.detail });
        }
      } else if (event.type === 'iteration') {
        left = { nodeId: event.nodeId, port: 'body' };
        patchRunSession(flowId, (session) => ({ loops: { ...session.loops, [event.nodeId]: { index: event.index, times: event.times } } }));
        say({ kind: 'step', label: labelOf(event.nodeId), parts: [word('Round'), `${event.index}`, word('of'), `${event.times}`] });
      } else if (event.type === 'warning') {
        say({ kind: 'step', tone: 'warning', label: labelOf(event.nodeId), parts: [{ text: event.message, translate: true }] });
      } else if (event.type === 'node-failed') {
        patchRunSession(flowId, (session) => ({ steps: { ...session.steps, [event.nodeId]: { state: 'failed' } } }));
        say({ kind: 'step', tone: 'bad', label: labelOf(event.nodeId), parts: [{ text: event.error, translate: true }] });
      }
    };

    const result = await runFlow(flow, host, {
      onEvent,
      signal: controller.signal,
      environment: getAllVariables(collection),
      resume: isFresh || from ? undefined : previous.resume,
      from: from ? { nodeId: from, state: previous.lastState } : undefined,
      inputs,
      step: mode === RUN_MODE.STEP || only,
      stepDelay: mode === RUN_MODE.STEP ? 0 : STEP_DELAY_MS
    });

    if (result.status === RUN_STATUS.INVALID) {
      result.issues.forEach((issue) => say({ kind: 'step', tone: 'bad', label: issue.nodeId ? labelOf(issue.nodeId) : null, parts: [{ text: issue.message, translate: true }] }));
    }
    const ended = result.status === RUN_STATUS.COMPLETED || result.status === RUN_STATUS.STOPPED;
    if (ended && tally.passed + tally.failed > 0) {
      say({ kind: 'step', tone: tally.failed ? 'bad' : 'ok', label: word('Tests'), parts: [`${tally.passed}`, word('pass'), '·', `${tally.failed}`, word('fail')] });
    }
    if (ENDINGS[result.status]) {
      say({ kind: 'end', ...ENDINGS[result.status] });
    }
    const waiting = [RUN_STATUS.PAUSED, RUN_STATUS.FAILED, RUN_STATUS.CANCELLED].includes(result.status) && result.resume;
    patchRunSession(flowId, (session) => ({
      phase: waiting ? RUN_PHASE.PAUSED : RUN_PHASE.DONE,
      outcome: result.status,
      tests: { ...tally },
      // What the run left, so a step can be tried again without running everything before it.
      lastState: result.state || result.resume?.state || session.lastState,
      resume: waiting ? result.resume : null,
      // A step left half way is no longer running: it is the one to continue from.
      steps: Object.fromEntries(Object.entries(session.steps).map(([nodeId, step]) => [nodeId, step.state === 'running' ? { ...step, state: 'waiting' } : step]))
    }));
  } finally {
    active.delete(flowId);
  }
};
