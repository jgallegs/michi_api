// Colours that help follow a flow at a glance. Every step that hands out values gets its own colour,
// shared by its outputs, its cables and the inputs they reach, so a value can be traced without
// following the line. The outputs that answer a question are told apart too: one colour for the good
// way and another for the other.
export const VALUE_COLORS = ['#0d9488', '#6366f1', '#c026d3', '#0284c7', '#7c3aed', '#db2777', '#64748b'];

export const BRANCH_TONES = { yes: 'good', valid: 'good', no: 'bad', invalid: 'bad' };

// Colours go in the order of the steps, so adding a step never recolours the ones before it.
export const colorValueSources = (flow, isValueCable) => {
  const sources = flow.nodes.filter((node) => flow.edges.some((edge) => edge.source === node.id && isValueCable(edge)));
  return new Map(sources.map((node, index) => [node.id, VALUE_COLORS[index % VALUE_COLORS.length]]));
};
