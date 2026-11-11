// The output of one run as the rows of a report: what each step did, in the order it happened.
const textOf = (part, say) => {
  const item = typeof part === 'string' ? { text: part } : part;
  return item.translate ? say(item.text) : item.text;
};

// The lines that belong to the run a header opens: the ones of its flow up to the next header of that flow.
export const entriesOfRun = (log, headerId) => {
  const at = log.findIndex((entry) => entry.id === headerId);
  if (at < 0) {
    return [];
  }
  const { flowId } = log[at];
  const rest = log.slice(at + 1);
  const next = rest.findIndex((entry) => entry.kind === 'header' && entry.flowId === flowId);
  return (next < 0 ? rest : rest.slice(0, next)).filter((entry) => entry.flowId === flowId && entry.kind !== 'header');
};

// "names" are the titles of the columns, in the language of the interface.
export const buildRunItems = (entries, say, names) =>
  entries.map((entry) => ({
    [names.step]: entry.label ? textOf(entry.label, say) : '',
    [names.result]: (entry.parts || []).map((part) => textOf(part, say)).join(' '),
    [names.time]: new Date(entry.time).toLocaleTimeString([], { hour12: false })
  }));
