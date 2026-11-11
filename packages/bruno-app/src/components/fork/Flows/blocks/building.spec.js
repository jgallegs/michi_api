jest.mock('utils/common', () => {
  let next = 0;
  return { uuid: () => `id-${(next += 1)}` };
});

import { PHRASES } from 'components/fork/SpanishUi/phrases';
import { validateFlow } from '../engine/graph';
import { describePiece, PIECE_WIDTH } from '../canvas/pieces';
import { buildOwnBlock, buildReadyBlock, canFollow, insertBlock, makeOwnBlock, stepTypesOf } from './building';
import { BLOCK_GROUPS, READY_BLOCKS } from './catalog';

const start = { id: 'start', type: 'start', x: 80, y: 120, config: {} };
const emptyFlow = () => ({ id: 'f', nodes: [start], edges: [] });
const fromStart = { nodeId: 'start', port: 'out' };
const find = (id) => READY_BLOCKS.find((block) => block.id === id);

describe('ready-made blocks', () => {
  it.each(READY_BLOCKS.map((block) => [block.id, block]))('%s lands with every cable and only what is left to fill in is missing', (id, block) => {
    const built = buildReadyBlock(block);
    expect(built.edges).toHaveLength(block.cables.length);
    expect(built.guide.filter((point) => point.check !== 'run').every((point) => Boolean(point.nodeId))).toBe(true);

    const flow = insertBlock(emptyFlow(), built, { x: 420, y: 120 }, fromStart);
    expect(flow.edges).toHaveLength(block.cables.length + 1);
    const unexpected = validateFlow(flow).filter((issue) => !['request-not-set', 'list-not-chosen'].includes(issue.code));
    expect(unexpected).toEqual([]);
  });

  it.each(READY_BLOCKS.map((block) => [block.id, block]))('%s leaves room between its steps', (id, block) => {
    const { nodes, edges } = buildReadyBlock(block);
    const boxes = nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, bottom: node.y + describePiece(node, { nodes, edges }, null).height }));
    const tooClose = boxes.flatMap((a, index) =>
      boxes.slice(index + 1).filter((b) => Math.abs(a.x - b.x) < PIECE_WIDTH + 20 && a.y < b.bottom + 20 && b.y < a.bottom + 20).map((b) => `${a.id}-${b.id}`)
    );
    expect(tooClose).toEqual([]);
  });

  it('have their own ids and every text in Spanish too', () => {
    expect(new Set(READY_BLOCKS.map((block) => block.id)).size).toBe(READY_BLOCKS.length);
    const texts = [
      ...BLOCK_GROUPS.map((group) => group.title),
      ...READY_BLOCKS.flatMap((block) => [
        block.title,
        block.description,
        ...block.guide.map((point) => point.text),
        ...block.steps.map((item) => item.config?.message).filter(Boolean)
      ])
    ];
    expect(texts.filter((text) => !Object.prototype.hasOwnProperty.call(PHRASES, text))).toEqual([]);
  });

  it('writes the messages of its steps in the language asked for', () => {
    const built = buildReadyBlock(find('stop-on-failure'), (text) => `es: ${text}`);
    expect(built.nodes.find((node) => node.type === 'stop').config.message).toBe('es: The call failed');
    expect(built.title).toBe('Stop if a call fails');
  });

  it('puts its first step where asked and joins it to the output given', () => {
    const built = buildReadyBlock(find('sequence'));
    const flow = insertBlock(emptyFlow(), built, { x: 423, y: 118 }, fromStart);
    const [, first, second] = flow.nodes;
    expect(first).toMatchObject({ type: 'request', x: 420, y: 120 });
    expect(second.x).toBe(first.x + PIECE_WIDTH + 100);
    expect(flow.edges[flow.edges.length - 1]).toMatchObject({ source: 'start', sourcePort: 'out', target: first.id, targetPort: 'in' });

    expect(insertBlock(emptyFlow(), built, { x: 0, y: 0 }, null).edges).toHaveLength(2);
  });

  it('can hang only from an output that says what runs next', () => {
    const flow = { nodes: [start, { id: 'a', type: 'request', config: {} }], edges: [] };
    expect(canFollow(flow, { nodeId: 'start', port: 'out', side: 'right' })).toBe(true);
    expect(canFollow(flow, { nodeId: 'a', port: 'status', side: 'right' })).toBe(false);
    expect(canFollow(flow, { nodeId: 'a', port: 'in', side: 'left' })).toBe(false);
  });

  it('tells the kinds of step it brings', () => {
    expect(stepTypesOf(find('wait-between'))).toEqual(['request', 'wait', 'request']);
    expect(stepTypesOf({ nodes: [{ type: 'if' }] })).toEqual(['if']);
  });
});

describe('own blocks', () => {
  const flow = {
    id: 'f',
    nodes: [
      start,
      { id: 'a', type: 'request', x: 400, y: 300, config: { pathname: 'login.bru', fields: ['token'] } },
      { id: 'b', type: 'request', x: 740, y: 260, config: { pathname: 'orders/get order.bru' } },
      { id: 'c', type: 'wait', x: 1080, y: 260, config: { seconds: '1' } }
    ],
    edges: [
      { id: 'e0', source: 'start', sourcePort: 'out', target: 'a', targetPort: 'in' },
      { id: 'e1', source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in', bends: [600, 280, 640] },
      { id: 'e2', source: 'a', sourcePort: 'field:token', target: 'b', targetPort: 'var:token' },
      { id: 'e3', source: 'b', sourcePort: 'out', target: 'c', targetPort: 'in' }
    ]
  };

  it('keeps the selected steps with the cables between them, from the corner, and never Start', () => {
    const block = makeOwnBlock(flow, ['start', 'a', 'b'], '  Log in and read  ');
    expect(block).toMatchObject({ name: 'Log in and read', version: 1 });
    expect(block.nodes.map((node) => [node.id, node.x, node.y])).toEqual([['a', 0, 40], ['b', 340, 0]]);
    expect(block.nodes[0].config).toEqual({ pathname: 'login.bru', fields: ['token'] });
    expect(block.edges.map((edge) => edge.id)).toEqual(['e1', 'e2']);
    expect(block.edges[0].bends).toBeUndefined();
    expect(makeOwnBlock(flow, ['start'], 'Nothing')).toBeNull();
  });

  it('comes back as fresh copies that a cable can arrive at', () => {
    const block = makeOwnBlock(flow, ['a', 'b'], 'Log in and read');
    const built = buildOwnBlock(block);
    expect(built.nodes.map((node) => node.id)).not.toEqual(expect.arrayContaining(['a', 'b']));
    expect(built.nodes.find((node) => node.id === built.entryId).config.pathname).toBe('login.bru');
    expect(built.guide).toEqual([]);

    const placed = insertBlock(flow, built, { x: 400, y: 600 }, { nodeId: 'c', port: 'out' });
    expect(placed.nodes).toHaveLength(6);
    expect(placed.edges[placed.edges.length - 1]).toMatchObject({ source: 'c', target: built.entryId, targetPort: 'in' });
    expect(placed.nodes.find((node) => node.id === built.entryId)).toMatchObject({ x: 400, y: 600 });
  });
});
