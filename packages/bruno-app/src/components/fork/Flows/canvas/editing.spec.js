jest.mock('utils/common', () => {
  let next = 0;
  return { uuid: () => `id-${(next += 1)}` };
});

import {
  addListField,
  addRequestField,
  canConnect,
  connect,
  copyNodes,
  createNode,
  findFittingPort,
  moveNodes,
  pasteNodes,
  moveRequestField,
  removeCablesWithoutPort,
  removeListField,
  removeNodes,
  removeRequestField,
  setEdgeBends,
  toggleSection,
  updateNodeConfig
} from './editing';
import { describePiece } from './pieces';

const node = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const start = node('start', 'start');
const flowOf = (nodes, edges = []) => ({ id: 'f', nodes: [start, ...nodes], edges });
const end = (nodeId, port) => ({ nodeId, port });
const cable = (flow) => flow.edges.map((edge) => `${edge.source}.${edge.sourcePort}>${edge.target}.${edge.targetPort}`);

describe('flow editing', () => {
  it('creates steps on the grid with their starting settings', () => {
    expect(createNode('repeat', { x: 103, y: 48 })).toMatchObject({ type: 'repeat', x: 100, y: 50, config: { times: '3' } });
    expect(createNode('request', { x: 0, y: 0 }, { pathname: 'a.bru' }).config).toEqual({ pathname: 'a.bru' });
  });

  describe('which ports fit', () => {
    const flow = flowOf([node('a', 'request'), node('b', 'request'), node('r', 'repeat'), node('l', 'list'), node('p', 'listappend')]);

    it('joins order to order and values to values', () => {
      expect(canConnect(flow, end('a', 'out'), end('b', 'in'))).toBe(true);
      expect(canConnect(flow, end('a', 'field:id'), end('b', 'var:id'))).toBe(true);
      expect(canConnect(flow, end('a', 'status'), end('r', 'value:times'))).toBe(true);
      expect(canConnect(flow, end('a', 'out'), end('b', 'var:id'))).toBe(false);
      expect(canConnect(flow, end('a', 'field:id'), end('b', 'in'))).toBe(false);
    });

    it('keeps Start first and a step away from itself', () => {
      expect(canConnect(flow, end('a', 'out'), end('start', 'in'))).toBe(false);
      expect(canConnect(flow, end('a', 'out'), end('a', 'in'))).toBe(false);
      expect(canConnect(flow, end('gone', 'out'), end('a', 'in'))).toBe(false);
    });

    it('only lets the end of a round reach a Repeat', () => {
      expect(canConnect(flow, end('a', 'out'), end('r', 'loopback'))).toBe(true);
      expect(canConnect(flow, end('a', 'out'), end('b', 'loopback'))).toBe(false);
    });

    it('only lets a list into the list input, and a list anywhere a value fits', () => {
      expect(canConnect(flow, end('l', 'field:items'), end('p', 'list'))).toBe(true);
      expect(canConnect(flow, end('a', 'field:items'), end('p', 'list'))).toBe(false);
      expect(canConnect(flow, end('l', 'field:length'), end('p', 'list'))).toBe(false);
      expect(canConnect(flow, end('l', 'field:items'), end('b', 'var:all'))).toBe(true);
    });
  });

  describe('connecting', () => {
    const flow = flowOf([node('a', 'request'), node('b', 'request'), node('c', 'request')]);

    it('ignores a cable that does not fit', () => {
      expect(connect(flow, end('a', 'out'), end('b', 'var:x'))).toBe(flow);
    });

    it('leads an order output to one step only', () => {
      const first = connect(flow, end('a', 'out'), end('b', 'in'));
      expect(cable(connect(first, end('a', 'out'), end('c', 'in')))).toEqual(['a.out>c.in']);
    });

    it('lets several steps lead to the same one', () => {
      const first = connect(flow, end('a', 'out'), end('c', 'in'));
      expect(cable(connect(first, end('b', 'out'), end('c', 'in')))).toEqual(['a.out>c.in', 'b.out>c.in']);
    });

    it('holds one cable per value input and lets a value feed several inputs', () => {
      const first = connect(flow, end('a', 'field:id'), end('c', 'var:id'));
      const replaced = connect(first, end('b', 'field:id'), end('c', 'var:id'));
      expect(cable(replaced)).toEqual(['b.field:id>c.var:id']);
      expect(cable(connect(replaced, end('b', 'field:id'), end('a', 'var:id')))).toHaveLength(2);
    });
  });

  it('removes steps with their cables but never Start', () => {
    const flow = connect(connect(flowOf([node('a', 'request'), node('b', 'request')]), end('start', 'out'), end('a', 'in')), end('a', 'out'), end('b', 'in'));
    const result = removeNodes(flow, ['start', 'a']);
    expect(result.nodes.map((item) => item.id)).toEqual(['start', 'b']);
    expect(result.edges).toEqual([]);
  });

  it('moves steps on the grid and keeps the shape of the cables that move whole', () => {
    const flow = {
      ...flowOf([node('a', 'request'), node('b', 'request')]),
      edges: [
        { id: 'inside', source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in', bends: [50, 80, 120] },
        { id: 'outside', source: 'start', sourcePort: 'out', target: 'a', targetPort: 'in', bends: [10] }
      ]
    };
    const moved = moveNodes(flow, ['a', 'b'], 20, 30);
    expect(moved.nodes.find((item) => item.id === 'a')).toMatchObject({ x: 20, y: 30 });
    expect(moved.edges[0].bends).toEqual([70, 110, 140]);
    expect(moved.edges[1].bends).toEqual([10]);
  });

  it('changes settings by path without touching the original', () => {
    const flow = flowOf([node('p', 'listappend', { fields: [{ id: 'f1', key: 'a', value: '' }] })]);
    const changed = updateNodeConfig(updateNodeConfig(flow, 'p', ['fields', 0, 'key'], 'code'), 'p', ['variables', 'token'], 'x');
    expect(changed.nodes[1].config).toEqual({ fields: [{ id: 'f1', key: 'code', value: '' }], variables: { token: 'x' } });
    expect(flow.nodes[1].config.fields[0].key).toBe('a');
  });

  it('collapses and expands a section', () => {
    const collapsed = toggleSection(flowOf([node('a', 'request')]), 'a', 'outputs');
    expect(collapsed.nodes[1].collapsed).toEqual({ outputs: true });
    expect(toggleSection(collapsed, 'a', 'outputs').nodes[1].collapsed).toEqual({ outputs: false });
  });

  it('stores the shape of a cable and forgets it when it is reset', () => {
    const flow = { ...flowOf([node('a', 'request')]), edges: [{ id: 'e', source: 'start', sourcePort: 'out', target: 'a', targetPort: 'in' }] };
    const shaped = setEdgeBends(flow, 'e', [40, 90, 60]);
    expect(shaped.edges[0].bends).toEqual([40, 90, 60]);
    expect(setEdgeBends(shaped, 'e', null).edges[0]).not.toHaveProperty('bends');
  });

  it('shows a response field once and takes its cables away with it', () => {
    const flow = addRequestField(addRequestField(flowOf([node('a', 'request'), node('b', 'request')]), 'a', 'order.id'), 'a', 'order.id');
    expect(flow.nodes[1].config.fields).toEqual(['order.id']);
    const joined = connect(flow, end('a', 'field:order.id'), end('b', 'var:id'));
    const removed = removeRequestField(joined, 'a', 'order.id');
    expect(removed.nodes[1].config.fields).toEqual([]);
    expect(removed.edges).toEqual([]);
  });

  it('changes the path of a field and keeps its cables', () => {
    const flow = connect(addRequestField(addRequestField(flowOf([node('a', 'request'), node('b', 'request')]), 'a', 'orders.id'), 'a', 'orders.2.id'), end('a', 'field:orders.id'), end('b', 'var:id'));
    const moved = moveRequestField(flow, 'a', 'orders.id', 'orders.-1.id');
    expect(moved.nodes[1].config.fields).toEqual(['orders.-1.id', 'orders.2.id']);
    expect(cable(moved)).toEqual(['a.field:orders.-1.id>b.var:id']);
    const merged = moveRequestField(moved, 'a', 'orders.-1.id', 'orders.2.id');
    expect(merged.nodes[1].config.fields).toEqual(['orders.2.id']);
    expect(cable(merged)).toEqual(['a.field:orders.2.id>b.var:id']);
    expect(moveRequestField(flow, 'a', 'orders.id', 'orders.id')).toBe(flow);
  });

  it('takes away the cables of the ports a step no longer has', () => {
    const flow = {
      nodes: [{ id: 'a', type: 'request', config: {} }, { id: 'add', type: 'listappend', config: {} }, { id: 'b', type: 'wait', config: {} }],
      edges: [
        { id: 'e1', source: 'a', sourcePort: 'out', target: 'add', targetPort: 'in' },
        { id: 'e2', source: 'a', sourcePort: 'field:', target: 'add', targetPort: 'value:value' },
        { id: 'e3', source: 'add', sourcePort: 'out', target: 'b', targetPort: 'in' }
      ]
    };
    const several = { ...flow, nodes: flow.nodes.map((item) => (item.id === 'add' ? { ...item, config: { mode: 'object', fields: [] } } : item)) };
    const { ports } = describePiece(several.nodes[1], several, null);
    expect(removeCablesWithoutPort(several, 'add', ports).edges.map((item) => item.id)).toEqual(['e1', 'e3']);
    expect(removeCablesWithoutPort(flow, 'add', describePiece(flow.nodes[1], flow, null).ports)).toBe(flow);
  });

  it('takes the cables of a field of the item away with it', () => {
    const flow = {
      nodes: [{ id: 'each', type: 'foreach', config: { fields: ['id', 'name'] } }, { id: 'b', type: 'request', config: {} }],
      edges: [
        { id: 'e1', source: 'each', sourcePort: 'field:item.id', target: 'b', targetPort: 'var:id' },
        { id: 'e2', source: 'each', sourcePort: 'field:item.name', target: 'b', targetPort: 'var:name' }
      ]
    };
    const next = removeRequestField(flow, 'each', 'id');
    expect(next.nodes[0].config.fields).toEqual(['name']);
    expect(next.edges.map((item) => item.id)).toEqual(['e2']);
  });

  it('adds fields to "Add to list" and takes their cables away with them', () => {
    const flow = addListField(flowOf([node('a', 'request'), node('p', 'listappend', { mode: 'object' })]), 'p');
    const [field] = flow.nodes[2].config.fields;
    const joined = connect(flow, end('a', 'field:id'), end('p', `value:${field.id}`));
    expect(joined.edges).toHaveLength(1);
    const removed = removeListField(joined, 'p', 0);
    expect(removed.nodes[2].config.fields).toEqual([]);
    expect(removed.edges).toEqual([]);
  });

  it('copies steps with the cables between them and pastes them under new ids', () => {
    const flow = connect(connect(flowOf([node('a', 'request'), node('b', 'request')]), end('start', 'out'), end('a', 'in')), end('a', 'out'), end('b', 'in'));
    const copied = copyNodes(flow, ['start', 'a', 'b']);
    expect(copied.nodes.map((item) => item.id)).toEqual(['a', 'b']);
    expect(copied.edges).toHaveLength(1);

    const { flow: pasted, newIds } = pasteNodes(flow, copied);
    expect(pasted.nodes).toHaveLength(5);
    expect(newIds).toHaveLength(2);
    expect(pasted.nodes.find((item) => item.id === newIds[0])).toMatchObject({ type: 'request', x: 40, y: 40 });
    expect(pasted.edges[2]).toMatchObject({ source: newIds[0], target: newIds[1] });
  });

  it('finds the port of a new step that the loose end of a cable fits', () => {
    const flow = flowOf([node('a', 'request')]);
    const describe = (item) => describePiece(item, flow, null);
    const repeat = node('r', 'repeat');
    const list = node('l', 'list');
    expect(findFittingPort(flow, describe(repeat), repeat, { nodeId: 'a', port: 'out', side: 'right' }).port).toBe('in');
    expect(findFittingPort(flow, describe(repeat), repeat, { nodeId: 'a', port: 'field:n', side: 'right' }).port).toBe('value:times');
    expect(findFittingPort(flow, describe(repeat), repeat, { nodeId: 'a', port: 'in', side: 'left' }).port).toBe('body');
    expect(findFittingPort(flow, describe(list), list, { nodeId: 'a', port: 'out', side: 'right' })).toBeNull();
  });
});
