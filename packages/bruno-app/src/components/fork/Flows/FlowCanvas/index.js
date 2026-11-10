import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useStore } from 'react-redux';
import { findEnvironmentInCollection } from 'utils/collections';
import { useIsSensitiveEnvironment } from 'components/fork/SensitiveEnvironment/store';
import { translatePhrase } from 'components/fork/SpanishUi';
import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';
import toast from 'react-hot-toast';
import { findLoopBody, findReachedNodeIds, findStartNode, validateFlow } from '../engine/graph';
import { NODE_DEFINITIONS, OUT_PORT, isLoopNode } from '../engine/nodes';
import { COLUMN, buildOwnBlock, buildReadyBlock, canFollow, insertBlock, makeOwnBlock } from '../blocks/building';
import { closeGuide, noteGuideRun, readGuide, startGuide, tickGuidePoint, useGuide } from '../blocks/guide';
import { deleteOwnBlock, saveOwnBlock, useOwnBlocks } from '../blocks/store';
import Gallery from '../blocks/Gallery';
import GuidePanel from '../blocks/GuidePanel';
import HelpPanel from '../blocks/HelpPanel';
import SaveBlockModal from '../blocks/SaveBlockModal';
import { discardFlowDraft, saveFlow, useFlowDirty, useFlowStale } from '../store';
import Cables from '../canvas/Cables';
import Picker from '../canvas/Picker';
import Piece from '../canvas/Piece';
import Toolbar from '../canvas/Toolbar';
import {
  addListField,
  addNode,
  addRequestField,
  canConnect,
  connect,
  copyNodes,
  createNode,
  findFittingPort,
  moveNodes,
  pasteNodes,
  removeEdges,
  removeListField,
  removeNodes,
  removeRequestField,
  setEdgeBends,
  setNodePositions,
  targetKind,
  toggleSection,
  updateNodeConfig
} from '../canvas/editing';
import { canRedo, canUndo, editFlow, forgetHistory, redo, undo } from '../canvas/history';
import { settle, tidy } from '../canvas/layout';
import { listFieldOptions, listPieceOptions, listRequestOptions, listTypedFieldOptions, listValueOptions, titleOf } from '../canvas/pickers';
import { HEADER_HEIGHT, PIECE_WIDTH, PORT_KIND, describePiece, findPort } from '../canvas/pieces';
import { describeRequest, relativeRequestPath } from '../canvas/requests';
import { defaultBends, dragBend, grabSegment, nearestSegment, routePoints, simplifyBends } from '../canvas/routing';
import { RUN_MODE, startRun, stopRun } from '../run/controller';
import { RUN_PHASE, useRunSession } from '../run/session';
import StyledWrapper from './StyledWrapper';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const SNAP_DISTANCE = 28;
const CLICK_DISTANCE = 4;
const ZONE_PADDING = 16;
const ZONE_LABEL = 22;
const VIEW_MARGIN = 40;
const TOOLBAR_SPACE = 70;
const REQUEST_ITEM_TYPES = ['http-request', 'graphql-request'];
const FIELD_PATH = /^\S+$/;

const GUIDE_MARK_OFFSET = 11;

// Where each flow was left on screen, the steps copied last and the flows whose opening gallery was
// closed, while the app is open.
const viewports = new Map();
const startedByHand = new Set();
let copied = null;

// Only for tests.
export const resetCanvasMemory = () => {
  viewports.clear();
  startedByHand.clear();
  copied = null;
};

// Messages that end up typed inside a step follow the language of the interface.
const say = (text) => (getForkSetting(FORK_SETTINGS.SPANISH_UI) && translatePhrase(text)) || text;

const portKey = (nodeId, side, port) => `${nodeId}|${side}|${port}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isTyping = (target) => Boolean(target.closest?.('input, select, textarea'));

const describeNode = (collection, flow, node) => {
  const request = node.type === 'request' ? describeRequest(collection, node) : null;
  return { node, request, description: describePiece(node, flow, request), title: titleOf(node, request) };
};

const boxesOf = (collection, flow) =>
  flow.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, width: PIECE_WIDTH, height: describeNode(collection, flow, node).description.height }));

// Moves the given steps the least they need so that nothing overlaps.
const makeRoom = (collection, flow, looseIds) => setNodePositions(flow, settle(boxesOf(collection, flow), looseIds));

const makeRoomAround = (collection, flow, nodeId) =>
  makeRoom(collection, flow, flow.nodes.filter((node) => node.id !== nodeId).map((node) => node.id));

const track = (onMove, onEnd) => {
  const finish = (event) => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', finish);
    onEnd(event);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', finish);
};

const FlowCanvas = ({ collection, flow }) => {
  const collectionPath = collection.pathname;
  const rootRef = useRef(null);
  const viewRef = useRef(null);
  const gestureRef = useRef(null);
  const [view, setView] = useState(() => viewports.get(flow.id) || null);
  const [selection, setSelection] = useState({ nodeIds: [], edgeId: null });
  const [gesture, setGestureState] = useState(null);
  const [picker, setPicker] = useState(null);
  // gallery: where the block picked from it goes (a point, the loose end of a cable). A new flow opens with it.
  const [gallery, setGallery] = useState(null);
  const [startsByHand, setStartsByHand] = useState(() => startedByHand.has(flow.id));
  const [help, setHelp] = useState(false);
  const [namingBlock, setNamingBlock] = useState(false);
  const ownBlocks = useOwnBlocks(collectionPath);
  const guide = useGuide(flow.id);
  const dirty = useFlowDirty(collectionPath, flow.id);
  const stale = useFlowStale(collectionPath, flow.id);
  const store = useStore();
  const session = useRunSession(flow.id);
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid) || null;
  const isSensitive = useIsSensitiveEnvironment(collection, environment);
  const isRunning = session.phase === RUN_PHASE.RUNNING;
  const isNew = flow.nodes.length === 1;
  const showsGallery = Boolean(gallery) || (isNew && !startsByHand);
  const canContinue = session.phase === RUN_PHASE.PAUSED && Boolean(session.resume);
  viewRef.current = view || { x: 0, y: 0, zoom: 1 };

  const setGesture = (next) => {
    gestureRef.current = next;
    setGestureState(next);
  };

  const edit = useCallback((change, options) => editFlow(collectionPath, flow.id, change, options), [collectionPath, flow.id]);

  const pieces = useMemo(() => new Map(flow.nodes.map((node) => [node.id, describeNode(collection, flow, node)])), [collection, flow]);

  // A flow edited by hand or merged badly can hold steps and cables the canvas does not know; the rest still works.
  const isSound = useMemo(
    () => flow.nodes.every((node) => NODE_DEFINITIONS[node.type]) && flow.edges.every((edge) => pieces.has(edge.source) && pieces.has(edge.target)),
    [flow, pieces]
  );
  const issues = useMemo(() => validateFlow(flow), [flow]);
  const reached = useMemo(() => (isSound ? findReachedNodeIds(flow) : null), [flow, isSound]);

  const moving = gesture?.type === 'move' ? gesture : null;
  const isMoving = (nodeId) => Boolean(moving && moving.nodeIds.includes(nodeId));
  const positionOf = (node) => (isMoving(node.id) ? { x: node.x + moving.dx, y: node.y + moving.dy } : { x: node.x, y: node.y });
  const boxOf = (node) => ({ id: node.id, ...positionOf(node), width: PIECE_WIDTH, height: pieces.get(node.id).description.height });

  const portPoint = (nodeId, port, side) => {
    const piece = pieces.get(nodeId);
    if (!piece) {
      return null;
    }
    const box = boxOf(piece.node);
    const found = findPort(piece.description, port, side);
    return { x: side === 'left' ? box.x : box.x + PIECE_WIDTH, y: box.y + (found ? found.y : HEADER_HEIGHT / 2) };
  };

  const cables = flow.edges
    .map((edge) => {
      const start = portPoint(edge.source, edge.sourcePort, 'right');
      const end = portPoint(edge.target, edge.targetPort, 'left');
      if (!start || !end) {
        return null;
      }
      const movesWhole = isMoving(edge.source) && isMoving(edge.target);
      const stored = edge.bends?.length % 2 === 1 ? edge.bends.map((coordinate, index) => coordinate + (movesWhole ? (index % 2 === 0 ? moving.dx : moving.dy) : 0)) : null;
      const shaping = gesture?.type === 'bend' && gesture.edgeId === edge.id ? gesture.bends : null;
      const bends = shaping || stored || defaultBends(start, end, boxOf(pieces.get(edge.source).node), boxOf(pieces.get(edge.target).node));
      return {
        edge,
        start,
        end,
        bends,
        points: routePoints(start, end, bends),
        kind: targetKind(edge.targetPort) === PORT_KIND.ORDER ? 'order' : 'value',
        selected: selection.edgeId === edge.id
      };
    })
    .filter(Boolean);

  const connectedPorts = useMemo(
    () => new Set(flow.edges.flatMap((edge) => [portKey(edge.source, 'right', edge.sourcePort), portKey(edge.target, 'left', edge.targetPort)])),
    [flow.edges]
  );

  const toWorld = (event) => {
    const rect = rootRef.current.getBoundingClientRect();
    const { x, y, zoom } = viewRef.current;
    return { x: (event.clientX - rect.left - x) / zoom, y: (event.clientY - rect.top - y) / zoom };
  };

  const toLocal = (event) => {
    const rect = rootRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const anchorBelow = (element) => {
    const rect = rootRef.current.getBoundingClientRect();
    const target = element.getBoundingClientRect();
    return { x: target.left - rect.left, y: target.bottom - rect.top + 4 };
  };

  const fitView = useCallback(() => {
    const root = rootRef.current;
    if (!root || !flow.nodes.length) {
      return;
    }
    if (flow.nodes.length === 1) {
      // A new flow opens with Start on the left, with room for the steps that will follow.
      setView({ zoom: 1, x: 80 - flow.nodes[0].x, y: root.clientHeight / 2 - flow.nodes[0].y - HEADER_HEIGHT });
      return;
    }
    const boxes = boxesOf(collection, flow);
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const width = Math.max(...boxes.map((box) => box.x + box.width)) - left;
    const height = Math.max(...boxes.map((box) => box.y + box.height)) - top;
    const zoom = clamp(Math.min((root.clientWidth - 120) / width, (root.clientHeight - 160) / height), MIN_ZOOM, 1);
    setView({ zoom, x: (root.clientWidth - width * zoom) / 2 - left * zoom, y: (root.clientHeight - height * zoom) / 2 - top * zoom });
  }, [collection, flow]);

  useLayoutEffect(() => {
    if (!view) {
      fitView();
    }
  }, [view, fitView]);

  useEffect(() => {
    if (view) {
      viewports.set(flow.id, view);
    }
  }, [flow.id, view]);

  useEffect(() => {
    const root = rootRef.current;
    const onWheel = (event) => {
      // Lists and panels on top of the canvas scroll on their own.
      if (event.target.closest?.('.flow-overlay')) {
        return;
      }
      event.preventDefault();
      const point = toLocal(event);
      setView((current) => {
        const from = current || viewRef.current;
        const zoom = clamp(from.zoom * Math.exp(-event.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM);
        const ratio = zoom / from.zoom;
        return { zoom, x: point.x - (point.x - from.x) * ratio, y: point.y - (point.y - from.y) * ratio };
      });
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const run = useCallback(
    (mode) => {
      noteGuideRun(flow.id);
      return startRun({ store, collectionUid: collection.uid, collectionPath, flowId: flow.id, mode }).catch((err) => toast.error(err.message));
    },
    [store, collection.uid, collectionPath, flow.id]
  );

  // The mark each step carries from the last run: its result, the round a Repeat is on, what a List holds.
  const runMarkOf = (node) => {
    const step = session.steps[node.id] || {};
    const loop = session.loops[node.id];
    const count = session.lists[node.id];
    const tag = loop ? { text: `${loop.index} / ${loop.times}` } : count !== undefined ? { text: `${count}` } : step.tag;
    const isNext = canContinue && session.resume.nodeId === node.id;
    return { state: isNext ? 'waiting' : step.state, tag, onContinue: isNext ? () => run(RUN_MODE.CONTINUE) : null };
  };

  const save = useCallback(() => {
    saveFlow(collectionPath, flow.id)
      .then(() => toast.success('Flow saved'))
      .catch((err) => toast.error(err.message));
  }, [collectionPath, flow.id]);

  // Slides the canvas just enough to show a step that was added outside what is on screen.
  const reveal = (box) => {
    const root = rootRef.current;
    const { x, y, zoom } = viewRef.current;
    const [left, top] = [box.x * zoom + x, box.y * zoom + y];
    const [right, bottom] = [left + box.width * zoom, top + box.height * zoom];
    const shift = (near, far, min, max) => (near < min ? min - near : far > max ? Math.max(max - far, min - near) : 0);
    const [dx, dy] = [shift(left, right, VIEW_MARGIN, root.clientWidth - VIEW_MARGIN), shift(top, bottom, TOOLBAR_SPACE, root.clientHeight - VIEW_MARGIN)];
    if (dx || dy) {
      setView({ zoom, x: x + dx, y: y + dy });
    }
  };

  const addPiece = (type, config, world, loose) => {
    const draft = createNode(type, world, config);
    const fitting = loose ? findFittingPort(flow, describeNode(collection, flow, draft).description, draft, loose) : null;
    // The new step appears with the port the cable arrives at under the pointer.
    const node = { ...draft, x: draft.x - (loose?.side === 'left' ? PIECE_WIDTH : 0), y: draft.y - (fitting ? fitting.y : 0) };
    edit((current) => {
      const added = addNode(current, node);
      const own = { nodeId: node.id, port: fitting?.port };
      const joined = !fitting ? added : loose.side === 'right' ? connect(added, loose, own) : connect(added, own, loose);
      const settled = makeRoom(collection, joined, [node.id]);
      reveal(boxesOf(collection, settled).find((box) => box.id === node.id));
      return settled;
    });
    setSelection({ nodeIds: [node.id], edgeId: null });
  };

  const centerOfView = () => {
    const rect = rootRef.current.getBoundingClientRect();
    return toWorld({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
  };

  const closeGallery = () => {
    startedByHand.add(flow.id);
    setStartsByHand(true);
    setGallery(null);
  };

  // A block hangs from the cable it was asked from or, while nothing follows Start, from Start.
  const placeBlock = ({ kind, block }) => {
    const built = kind === 'own' ? buildOwnBlock(block) : buildReadyBlock(block, say);
    const start = findStartNode(flow);
    const startIsFree = Boolean(start) && !flow.edges.some((item) => item.source === start.id && item.sourcePort === OUT_PORT);
    const loose = gallery?.loose && canFollow(flow, gallery.loose) ? gallery.loose : null;
    const from = loose ? { nodeId: loose.nodeId, port: loose.port } : startIsFree ? { nodeId: start.id, port: OUT_PORT } : null;
    const free = gallery?.world || centerOfView();
    const origin = loose ? { x: free.x, y: free.y - HEADER_HEIGHT / 2 } : startIsFree ? { x: start.x + COLUMN, y: start.y } : free;
    const newIds = built.nodes.map((item) => item.id);
    edit((current) => makeRoom(collection, insertBlock(current, built, origin, from), newIds));
    setSelection({ nodeIds: newIds, edgeId: null });
    if (built.guide.length) {
      startGuide(flow.id, { title: built.title, translate: built.translate, points: built.guide });
    }
    closeGallery();
    setView(null);
  };

  const saveBlock = (name) => {
    const block = makeOwnBlock(flow, selection.nodeIds, name);
    setNamingBlock(false);
    if (block) {
      saveOwnBlock(collectionPath, block)
        .then(() => toast.success('Block saved'))
        .catch((err) => toast.error(err.message));
    }
  };

  const [, drop] = useDrop(
    {
      accept: 'collection-item',
      canDrop: (item) => REQUEST_ITEM_TYPES.includes(item.type) && item.sourceCollectionUid === collection.uid,
      drop: (item, monitor) => {
        const offset = monitor.getClientOffset();
        addPiece('request', { pathname: relativeRequestPath(collection, item) }, toWorld({ clientX: offset.x, clientY: offset.y }), null);
      }
    },
    [collection, flow]
  );

  const setRoot = useCallback(
    (element) => {
      rootRef.current = element;
      drop(element);
    },
    [drop]
  );

  const startPan = (event) => {
    const origin = { x: event.clientX, y: event.clientY, view: viewRef.current };
    track(
      (move) => setView({ ...origin.view, x: origin.view.x + move.clientX - origin.x, y: origin.view.y + move.clientY - origin.y }),
      () => {}
    );
  };

  const startBoxSelect = (event) => {
    const start = toWorld(event);
    const keep = event.shiftKey || event.ctrlKey || event.metaKey ? selection.nodeIds : [];
    setGesture({ type: 'box', start, end: start });
    track(
      (move) => setGesture({ type: 'box', start, end: toWorld(move) }),
      () => {
        const { end } = gestureRef.current;
        const [left, right] = [Math.min(start.x, end.x), Math.max(start.x, end.x)];
        const [top, bottom] = [Math.min(start.y, end.y), Math.max(start.y, end.y)];
        const isClick = right - left < CLICK_DISTANCE && bottom - top < CLICK_DISTANCE;
        const inside = isClick
          ? []
          : flow.nodes
              .filter((node) => node.x < right && node.x + PIECE_WIDTH > left && node.y < bottom && node.y + pieces.get(node.id).description.height > top)
              .map((node) => node.id);
        setSelection({ nodeIds: [...new Set([...keep, ...inside])], edgeId: null });
        setGesture(null);
      }
    );
  };

  const onCanvasMouseDown = (event) => {
    rootRef.current.focus();
    setPicker(null);
    if (event.button === 1 || event.button === 2 || (event.button === 0 && event.altKey)) {
      event.preventDefault();
      startPan(event);
    } else if (event.button === 0) {
      startBoxSelect(event);
    }
  };

  const onCanvasDoubleClick = (event) => {
    if (event.target.closest('.flow-piece, .flow-cable, .flow-toolbar, .flow-picker')) {
      return;
    }
    setPicker({ kind: 'piece', position: toLocal(event), world: toWorld(event), loose: null });
  };

  const onPieceMouseDown = (event, node) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    setPicker(null);
    if (event.target.closest('input, select, button, .flow-port')) {
      return;
    }
    rootRef.current.focus();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const wasSelected = selection.nodeIds.includes(node.id);
    const nodeIds = additive
      ? wasSelected ? selection.nodeIds.filter((id) => id !== node.id) : [...selection.nodeIds, node.id]
      : wasSelected ? selection.nodeIds : [node.id];
    setSelection({ nodeIds, edgeId: null });
    if (!nodeIds.includes(node.id)) {
      return;
    }
    const start = toWorld(event);
    track(
      (move) => {
        const point = toWorld(move);
        const [dx, dy] = [Math.round((point.x - start.x) / 10) * 10, Math.round((point.y - start.y) / 10) * 10];
        if (dx || dy || gestureRef.current) {
          setGesture({ type: 'move', nodeIds, dx, dy });
        }
      },
      () => {
        const moved = gestureRef.current;
        setGesture(null);
        if (moved && (moved.dx || moved.dy)) {
          edit((current) => makeRoom(collection, moveNodes(current, nodeIds, moved.dx, moved.dy), nodeIds));
        } else if (!additive && wasSelected) {
          setSelection({ nodeIds: [node.id], edgeId: null });
        }
      }
    );
  };

  const listConnectable = (from) => {
    const targets = [];
    pieces.forEach(({ node, description }) => {
      description.ports
        .filter((port) => !port.hidden && port.side !== from.side)
        .forEach((port) => {
          const other = { nodeId: node.id, port: port.port };
          const fits = from.side === 'right' ? canConnect(flow, from, other) : canConnect(flow, other, from);
          if (fits) {
            targets.push({ ...other, side: port.side, point: portPoint(node.id, port.port, port.side) });
          }
        });
    });
    return targets;
  };

  const join = (from, other) =>
    edit((current) => (from.side === 'right' ? connect(current, from, other) : connect(current, other, from)));

  const onPortMouseDown = (event, node, port) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    rootRef.current.focus();
    setPicker(null);
    const from = { nodeId: node.id, port: port.port, side: port.side, kind: port.kind };
    const origin = portPoint(node.id, port.port, port.side);
    const targets = listConnectable(from);
    const valid = new Set(targets.map((target) => portKey(target.nodeId, target.side, target.port)));
    setGesture({ type: 'cable', from, origin, point: origin, valid, snap: null });
    track(
      (move) => {
        const point = toWorld(move);
        const nearest = targets
          .map((target) => ({ target, distance: Math.hypot(target.point.x - point.x, target.point.y - point.y) }))
          .filter(({ distance }) => distance <= SNAP_DISTANCE)
          .sort((a, b) => a.distance - b.distance)[0];
        setGesture({ ...gestureRef.current, point, snap: nearest ? nearest.target : null });
      },
      (up) => {
        const { snap, point } = gestureRef.current;
        setGesture(null);
        if (snap) {
          join(from, snap);
          return;
        }
        const dragged = Math.hypot(point.x - origin.x, point.y - origin.y) > CLICK_DISTANCE;
        const pointsToValue = port.side === 'left' && port.kind !== PORT_KIND.ORDER;
        if (!dragged && pointsToValue) {
          setPicker({ kind: 'value', position: toLocal(up), nodeId: node.id, port: port.port });
        } else if (dragged || port.side === 'right') {
          const world = dragged ? point : { x: origin.x + 80, y: origin.y };
          setPicker({ kind: 'piece', position: toLocal(up), world, loose: from });
        }
      }
    );
  };

  const onCableMouseDown = (event, edge) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    rootRef.current.focus();
    setPicker(null);
    setSelection({ nodeIds: [], edgeId: edge.id });
    const cable = cables.find((candidate) => candidate.edge.id === edge.id);
    const start = toWorld(event);
    const grabbed = grabSegment(cable.bends, nearestSegment(cable.points, start), cable.start, cable.end);
    track(
      (move) => {
        const point = toWorld(move);
        if (gestureRef.current || Math.hypot(point.x - start.x, point.y - start.y) > CLICK_DISTANCE) {
          setGesture({ type: 'bend', edgeId: edge.id, bends: dragBend(grabbed.bends, grabbed.index, point) });
        }
      },
      () => {
        const shaped = gestureRef.current;
        setGesture(null);
        if (shaped) {
          edit((current) => setEdgeBends(current, edge.id, simplifyBends(shaped.bends, cable.start, cable.end)));
        }
      }
    );
  };

  const onCableDoubleClick = (event, edge) => {
    event.stopPropagation();
    edit((current) => setEdgeBends(current, edge.id, null));
  };

  const removeSelection = () => {
    const { nodeIds, edgeId } = selection;
    if (!nodeIds.length && !edgeId) {
      return;
    }
    edit((current) => removeEdges(removeNodes(current, nodeIds), edgeId ? [edgeId] : []));
    setSelection({ nodeIds: [], edgeId: null });
  };

  const paste = () => {
    if (!copied?.nodes.length) {
      return;
    }
    let newIds = [];
    edit((current) => {
      const pasted = pasteNodes(current, copied);
      newIds = pasted.newIds;
      return makeRoom(collection, pasted.flow, newIds);
    });
    setSelection({ nodeIds: newIds, edgeId: null });
  };

  const onKeyDown = (event) => {
    if (isTyping(event.target)) {
      return;
    }
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const closeOnTop = () => {
      if (help) {
        setHelp(false);
      } else if (showsGallery) {
        closeGallery();
      } else {
        setSelection({ nodeIds: [], edgeId: null });
      }
    };
    const actions = {
      delete: !command && removeSelection,
      backspace: !command && removeSelection,
      escape: !command && closeOnTop,
      z: command && (() => (event.shiftKey ? redo(collectionPath, flow.id) : undo(collectionPath, flow.id))),
      y: command && (() => redo(collectionPath, flow.id)),
      s: command && save,
      enter: command && (() => run(RUN_MODE.RUN)),
      a: command && (() => setSelection({ nodeIds: flow.nodes.map((node) => node.id), edgeId: null })),
      c: command && (() => {
        copied = copyNodes(flow, selection.nodeIds);
      }),
      v: command && paste,
      d: command && (() => {
        copied = copyNodes(flow, selection.nodeIds);
        paste();
      })
    };
    if (actions[key]) {
      event.preventDefault();
      event.stopPropagation();
      actions[key]();
    }
  };

  const onConfig = (node, path, value) =>
    edit((current) => makeRoomAround(collection, updateNodeConfig(current, node.id, path, value), node.id), { mergeKey: `${node.id}:${path.join('.')}` });

  const onAction = (node, action, payload, event) => {
    const grow = (change) => edit((current) => makeRoomAround(collection, change(current), node.id));
    const handlers = {
      'toggle-section': () => grow((current) => toggleSection(current, node.id, payload)),
      'add-field': () => setPicker({ kind: 'field', position: anchorBelow(event.currentTarget), nodeId: node.id }),
      'remove-field': () => edit((current) => removeRequestField(current, node.id, payload)),
      'add-list-field': () => grow((current) => addListField(current, node.id)),
      'remove-list-field': () => edit((current) => removeListField(current, node.id, payload)),
      'pick-request': () => setPicker({ kind: 'request', position: anchorBelow(event.currentTarget), nodeId: node.id }),
      'pick-value': () => setPicker({ kind: 'value', position: anchorBelow(event.currentTarget), nodeId: node.id, port: payload }),
      'disconnect': () =>
        edit((current) => removeEdges(current, current.edges.filter((edge) => edge.target === node.id && edge.targetPort === payload).map((edge) => edge.id)))
    };
    handlers[action]();
  };

  const pickers = {
    piece: () => ({
      title: picker.loose ? 'What goes here?' : 'Add a step',
      options: listPieceOptions(flow, collection, picker.loose),
      onPick: (option) => (option.opensBlocks ? setGallery({ world: picker.world, loose: picker.loose }) : addPiece(option.type, option.config, picker.world, picker.loose))
    }),
    request: () => ({
      title: 'Which request does it send?',
      options: listRequestOptions(collection),
      emptyText: 'This collection has no requests',
      onPick: (option) => edit((current) => makeRoomAround(collection, updateNodeConfig(current, picker.nodeId, ['pathname'], option.path), picker.nodeId))
    }),
    value: () => ({
      title: 'Take the value from',
      placeholder: 'Search or type a field, like order.id',
      options: listValueOptions(flow, { nodeId: picker.nodeId, port: picker.port }, (node) => pieces.get(node.id)),
      emptyText: 'No other step hands out a value yet',
      custom: (text) => (FIELD_PATH.test(text) ? listTypedFieldOptions(flow, { nodeId: picker.nodeId, port: picker.port }, (node) => pieces.get(node.id), text) : null),
      onPick: (option) =>
        edit((current) => {
          const shown = option.addField ? addRequestField(current, option.nodeId, option.addField) : current;
          const joined = connect(shown, { nodeId: option.nodeId, port: option.port }, { nodeId: picker.nodeId, port: picker.port });
          return makeRoomAround(collection, joined, option.nodeId);
        })
    }),
    field: () => ({
      title: 'Which field of the response?',
      placeholder: 'Search or type a field, like order.id',
      options: listFieldOptions(pieces.get(picker.nodeId).node, pieces.get(picker.nodeId).request),
      emptyText: 'Type the name of the field, like order.id',
      custom: (text) => (FIELD_PATH.test(text) ? { id: text, label: text, path: text } : null),
      onPick: (option) => edit((current) => makeRoomAround(collection, addRequestField(current, picker.nodeId, option.path), picker.nodeId))
    })
  };
  const openPicker = picker && (picker.kind === 'piece' || pieces.has(picker.nodeId)) ? pickers[picker.kind]() : null;

  const zones = !isSound
    ? []
    : flow.nodes
        .filter(isLoopNode)
        .map((repeat) => {
          const boxes = [...findLoopBody(flow, repeat)].map((id) => boxOf(pieces.get(id).node));
          if (!boxes.length) {
            return null;
          }
          const left = Math.min(...boxes.map((box) => box.x)) - ZONE_PADDING;
          const top = Math.min(...boxes.map((box) => box.y)) - ZONE_PADDING - ZONE_LABEL;
          const typedTimes = String(repeat.config?.times ?? '').trim();
          return {
            id: repeat.id,
            times: connectedPorts.has(portKey(repeat.id, 'left', 'value:times')) ? '' : typedTimes,
            style: {
              left,
              top,
              width: Math.max(...boxes.map((box) => box.x + box.width)) + ZONE_PADDING - left,
              height: Math.max(...boxes.map((box) => box.y + box.height)) + ZONE_PADDING - top
            }
          };
        })
        .filter(Boolean);

  const sourcesOf = (nodeId) => {
    const sources = new Map();
    flow.edges
      .filter((edge) => edge.target === nodeId && targetKind(edge.targetPort) !== PORT_KIND.ORDER && pieces.has(edge.source))
      .forEach((edge) => {
        const source = pieces.get(edge.source);
        const row = source.description.rows.find((candidate) => candidate.right?.port === edge.sourcePort);
        sources.set(edge.targetPort, { title: source.title, label: row?.label || edge.sourcePort.replace(/^field:/, '') || 'value' });
      });
    return sources;
  };

  const cableGesture = gesture?.type === 'cable' ? gesture : null;
  const portStateOf = (nodeId) => (port) => {
    const key = portKey(nodeId, port.side, port.port);
    const isOrigin = cableGesture && portKey(cableGesture.from.nodeId, cableGesture.from.side, cableGesture.from.port) === key;
    const isSnap = cableGesture?.snap && portKey(cableGesture.snap.nodeId, cableGesture.snap.side, cableGesture.snap.port) === key;
    const highlight = !cableGesture ? '' : isSnap ? 'snap' : isOrigin || cableGesture.valid.has(key) ? 'valid' : 'faded';
    return { filled: connectedPorts.has(key) || Boolean(isOrigin) || Boolean(isSnap), highlight };
  };

  const draftCable = cableGesture
    ? (() => {
        const loose = cableGesture.snap ? cableGesture.snap.point : cableGesture.point;
        const [start, end] = cableGesture.from.side === 'right' ? [cableGesture.origin, loose] : [loose, cableGesture.origin];
        const around = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: 0, height: Math.abs(start.y - end.y) };
        return { kind: cableGesture.from.kind === PORT_KIND.ORDER ? 'order' : 'value', points: routePoints(start, end, defaultBends(start, end, around, around)) };
      })()
    : null;

  const box = gesture?.type === 'box' ? gesture : null;
  const current = viewRef.current;
  const generalIssue = issues.find((item) => !item.nodeId);
  const guideNow = readGuide(guide, flow);
  // Each step shows the number of the first point of the guide it still has to do.
  const guideMarks = (guideNow?.points || []).filter(
    (point, index, points) => point.nodeId && !point.done && pieces.has(point.nodeId) && points.findIndex((other) => other.nodeId === point.nodeId && !other.done) === index
  );
  const canSaveBlock = selection.nodeIds.some((id) => pieces.has(id) && pieces.get(id).node.type !== 'start');

  const canvas = (
    <StyledWrapper
      ref={setRoot}
      tabIndex={0}
      className={`flow-canvas ${cableGesture ? 'connecting' : ''}`}
      style={{ backgroundPosition: `${current.x}px ${current.y}px`, backgroundSize: `${20 * current.zoom}px ${20 * current.zoom}px` }}
      onMouseDown={onCanvasMouseDown}
      onDoubleClick={onCanvasDoubleClick}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
      data-testid="flow-canvas"
    >
      <div className="flow-world" style={{ transform: `translate(${current.x}px, ${current.y}px) scale(${current.zoom})` }}>
        {zones.map((zone) => (
          <div key={zone.id} className="flow-zone" style={zone.style} data-testid={`flow-zone-${zone.id}`}>
            <span className="flow-zone-label">
              <span>Repeats</span>
              {zone.times ? <span className="fork-no-translate"> × {zone.times}</span> : null}
            </span>
          </div>
        ))}
        <Cables cables={cables} draft={draftCable} hop={isRunning ? session.hop : null} onMouseDown={onCableMouseDown} onDoubleClick={onCableDoubleClick} />
        {flow.nodes.map((node) => {
          const piece = pieces.get(node.id);
          return (
            <Piece
              key={node.id}
              node={node}
              description={piece.description}
              request={piece.request}
              title={piece.title}
              position={positionOf(node)}
              selected={selection.nodeIds.includes(node.id)}
              dimmed={Boolean(reached) && !reached.has(node.id) && node.type !== 'list'}
              issues={flow.nodes.length === 1 ? [] : issues.filter((item) => item.nodeId === node.id)}
              run={runMarkOf(node)}
              portState={portStateOf(node.id)}
              sources={sourcesOf(node.id)}
              onMouseDown={onPieceMouseDown}
              onPortMouseDown={onPortMouseDown}
              onConfig={(path, value) => onConfig(node, path, value)}
              onAction={(action, payload, event) => onAction(node, action, payload, event)}
            />
          );
        })}
        {flow.nodes.length === 1 ? (
          <div className="flow-hint" style={{ left: flow.nodes[0].x, top: flow.nodes[0].y + 56 }}>
            Pull a cable out of the triangle to add the first step, or drop a request from the sidebar here.
          </div>
        ) : null}
        {guideMarks.map((point) => {
          const at = positionOf(pieces.get(point.nodeId).node);
          return (
            <span
              key={point.id}
              className={`flow-guide-mark fork-no-translate ${point.current ? 'current' : ''}`}
              style={{ left: at.x - GUIDE_MARK_OFFSET, top: at.y - GUIDE_MARK_OFFSET }}
              data-testid={`flow-guide-mark-${point.nodeId}`}
            >
              {point.number}
            </span>
          );
        })}
        {box ? (
          <div
            className="flow-selection-box"
            style={{
              left: Math.min(box.start.x, box.end.x),
              top: Math.min(box.start.y, box.end.y),
              width: Math.abs(box.end.x - box.start.x),
              height: Math.abs(box.end.y - box.start.y)
            }}
          />
        ) : null}
      </div>
      <Toolbar
        run={{
          isRunning,
          canContinue,
          environment: { name: environment?.name, sensitive: isSensitive },
          onRun: () => run(RUN_MODE.RUN),
          onStep: () => run(RUN_MODE.STEP),
          onContinue: () => run(RUN_MODE.CONTINUE),
          onStop: () => stopRun(flow.id)
        }}
        dirty={dirty}
        stale={stale}
        onDiscard={() => {
          discardFlowDraft(collectionPath, flow.id);
          forgetHistory(flow.id);
          setSelection({ nodeIds: [], edgeId: null });
        }}
        canUndo={canUndo(flow.id)}
        canRedo={canRedo(flow.id)}
        message={generalIssue?.message}
        onAdd={() => setPicker({ kind: 'piece', position: { x: 12, y: 52 }, world: centerOfView(), loose: null })}
        onBlocks={() => (showsGallery ? closeGallery() : setGallery({ world: centerOfView(), loose: null }))}
        onSaveBlock={canSaveBlock ? () => setNamingBlock(true) : null}
        onHelp={() => setHelp((shown) => !shown)}
        onUndo={() => undo(collectionPath, flow.id)}
        onRedo={() => redo(collectionPath, flow.id)}
        onTidy={() => {
          edit((flowNow) => tidy(flowNow, (node) => describeNode(collection, flowNow, node).description.height));
          setView(null);
        }}
        onFit={fitView}
        onSave={save}
      />
      {openPicker ? (
        <Picker
          key={`${picker.kind}:${picker.nodeId || ''}:${picker.port || ''}`}
          {...openPicker}
          position={picker.position}
          onClose={() => setPicker(null)}
          onPick={(option) => {
            openPicker.onPick(option);
            setPicker(null);
          }}
        />
      ) : null}
      {showsGallery ? (
        <Gallery
          ownBlocks={ownBlocks}
          startsFlow={isNew}
          onPick={placeBlock}
          onDeleteOwn={(blockId) => deleteOwnBlock(collectionPath, blockId).catch((err) => toast.error(err.message))}
          onClose={closeGallery}
        />
      ) : null}
      {guideNow && !showsGallery ? (
        <GuidePanel
          guide={guideNow}
          onTick={(pointId) => tickGuidePoint(flow.id, pointId)}
          onFocus={(point) => {
            setSelection({ nodeIds: [point.nodeId], edgeId: null });
            reveal(boxOf(pieces.get(point.nodeId).node));
          }}
          onClose={() => closeGuide(flow.id)}
        />
      ) : null}
      {help ? (
        <HelpPanel
          onClose={() => setHelp(false)}
          onShowBlocks={() => {
            setHelp(false);
            setGallery({ world: centerOfView(), loose: null });
          }}
        />
      ) : null}
    </StyledWrapper>
  );

  // The dialog goes next to the canvas, not inside it, so its clicks and keys are its own.
  return (
    <>
      {canvas}
      {namingBlock ? (
        <SaveBlockModal
          count={selection.nodeIds.filter((id) => pieces.get(id)?.node.type !== 'start').length}
          onCancel={() => setNamingBlock(false)}
          onSubmit={saveBlock}
        />
      ) : null}
    </>
  );
};

export default FlowCanvas;
