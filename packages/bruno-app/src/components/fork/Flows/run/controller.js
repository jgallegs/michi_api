import { findCollectionByUid, findEnvironmentInCollection, getAllVariables } from 'utils/collections';
import { confirmFlowInSensitiveEnvironment } from 'components/fork/SensitiveEnvironment';
import { RUN_STATUS, runFlow } from '../engine/run';
import { getFlow } from '../store';
import { titleOf } from '../canvas/pickers';
import { OPERATOR_LABELS } from '../canvas/pieces';
import { describeRequest } from '../canvas/requests';
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
      const { status, statusText, duration, data } = detail.response;
      const tone = isSuccess(status) ? 'ok' : 'bad';
      return {
        tag: { text: `${status} · ${duration ?? 0} ms`, tone },
        tone,
        parts: [`${status}${statusText ? ` ${statusText}` : ''}`, '·', `${duration ?? 0} ms`],
        detail: detailOf(data)
      };
    }
    case 'check':
      return { tag: { text: detail.result ? 'Yes' : 'No', translate: true }, parts: [`${detail.status}`, '→', word(detail.result ? 'Yes' : 'No')] };
    case 'comparison':
      return {
        tag: { text: detail.result ? 'Yes' : 'No', translate: true },
        parts: [short(detail.left), word(OPERATOR_LABELS[detail.operator]), short(detail.right), '→', word(detail.result ? 'Yes' : 'No')]
      };
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

export const startRun = async ({ store, collectionUid, collectionPath, flowId, mode = RUN_MODE.RUN }) => {
  if (active.has(flowId)) {
    return;
  }
  const flow = getFlow(collectionPath, flowId);
  const collection = readCollection(store, collectionUid);
  if (!flow || !collection) {
    return;
  }

  const previous = getRunSession(flowId);
  const isFresh = mode === RUN_MODE.RUN || !previous.resume;
  const controller = new AbortController();
  const host = createRunHost({ store, collectionUid, signal: controller.signal });
  active.set(flowId, { controller, host });

  try {
    if (!(await confirmEnvironment(flowId, collection, isFresh))) {
      return;
    }

    const titles = new Map(flow.nodes.map((node) => [node.id, titleOf(node, node.type === 'request' ? describeRequest(collection, node) : null)]));
    const labelOf = (nodeId) => ({ text: titles.get(nodeId), translate: flow.nodes.find((node) => node.id === nodeId)?.type !== 'request' });
    const say = (entry) => appendRunLog({ flowId, ...entry });

    if (isFresh) {
      patchRunSession(flowId, { phase: RUN_PHASE.RUNNING, outcome: null, steps: {}, loops: {}, lists: {}, hop: null, resume: null });
      say({ kind: 'header', label: { text: flow.name }, parts: [environmentOf(collection)?.name || word('No environment')] });
    } else {
      patchRunSession(flowId, { phase: RUN_PHASE.RUNNING, outcome: null });
    }

    let left = null;
    let hops = 0;
    const onEvent = (event) => {
      if (event.type === 'node-started') {
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
        left = { nodeId: event.nodeId, port: event.port };
        patchRunSession(flowId, (session) => ({
          steps: { ...session.steps, [event.nodeId]: { state: 'done', tag: outcome?.tag || session.steps[event.nodeId]?.tag } },
          loops: event.detail?.kind === 'repeat' && event.port === 'body' ? { ...session.loops, [event.nodeId]: { index: 1, times: event.detail.times } } : session.loops,
          lists: event.detail?.kind === 'list' ? { ...session.lists, [event.detail.listNodeId]: event.detail.items.length } : session.lists
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
      resume: isFresh ? undefined : previous.resume,
      step: mode === RUN_MODE.STEP,
      stepDelay: mode === RUN_MODE.STEP ? 0 : STEP_DELAY_MS
    });

    if (result.status === RUN_STATUS.INVALID) {
      result.issues.forEach((issue) => say({ kind: 'step', tone: 'bad', label: issue.nodeId ? labelOf(issue.nodeId) : null, parts: [{ text: issue.message, translate: true }] }));
    }
    if (ENDINGS[result.status]) {
      say({ kind: 'end', ...ENDINGS[result.status] });
    }
    const waiting = [RUN_STATUS.PAUSED, RUN_STATUS.FAILED, RUN_STATUS.CANCELLED].includes(result.status) && result.resume;
    patchRunSession(flowId, (session) => ({
      phase: waiting ? RUN_PHASE.PAUSED : RUN_PHASE.DONE,
      outcome: result.status,
      resume: waiting ? result.resume : null,
      // A step left half way is no longer running: it is the one to continue from.
      steps: Object.fromEntries(Object.entries(session.steps).map(([nodeId, step]) => [nodeId, step.state === 'running' ? { ...step, state: 'waiting' } : step]))
    }));
  } finally {
    active.delete(flowId);
  }
};
