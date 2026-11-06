// Finds printable labels inside a response: PDF, PNG or JPEG files sent as base64, and ZPL
// (Zebra printer language) sent as base64 or as plain text. The field name does not matter, so
// it works with any API that embeds its labels in JSON.

const MAX_NODES = 5000;
const MAX_LABELS = 50;
const MIN_BASE64_LENGTH = 64;
const BASE64_HEAD = /^[A-Za-z0-9+/]+={0,2}$/;
const DATA_URI = /^data:[\w.+-]+\/[\w.+-]+;base64,/i;

export const LABEL_KINDS = {
  pdf: { label: 'PDF', mime: 'application/pdf', extension: 'pdf' },
  png: { label: 'PNG', mime: 'image/png', extension: 'png' },
  jpeg: { label: 'JPEG', mime: 'image/jpeg', extension: 'jpg' },
  zpl: { label: 'ZPL', mime: 'text/plain', extension: 'zpl' }
};

const decodeHead = (base64) => {
  const head = base64.slice(0, 344);
  try {
    return atob(head.slice(0, head.length - (head.length % 4)));
  } catch (err) {
    return null;
  }
};

const decodeText = (base64) => {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    return null;
  }
};

const looksLikeZpl = (text) => {
  const start = text.indexOf('^XA');
  return start !== -1 && start < 256 && text.indexOf('^XZ', start) !== -1;
};

const looksLikeZplStart = (text) => {
  const start = text.indexOf('^XA');
  return start !== -1 && start < 256;
};

// Returns { kind, base64?, text? } for a single string, or null.
export const classifyString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (looksLikeZpl(trimmed)) {
    return { kind: 'zpl', text: trimmed };
  }
  if (trimmed.length < MIN_BASE64_LENGTH) {
    return null;
  }

  const base64 = trimmed.replace(DATA_URI, '').replace(/\s+/g, '');
  if (base64.length < MIN_BASE64_LENGTH || !BASE64_HEAD.test(base64.slice(0, 256))) {
    return null;
  }
  const head = decodeHead(base64);
  if (!head) {
    return null;
  }
  if (head.startsWith('%PDF')) {
    return { kind: 'pdf', base64 };
  }
  if (head.startsWith('\x89PNG')) {
    return { kind: 'png', base64 };
  }
  if (head.startsWith('\xFF\xD8\xFF')) {
    return { kind: 'jpeg', base64 };
  }
  if (looksLikeZplStart(head)) {
    const text = decodeText(base64);
    if (text && looksLikeZpl(text)) {
      return { kind: 'zpl', base64, text };
    }
  }
  return null;
};

const parseIfJson = (data) => {
  if (typeof data !== 'string') {
    return data;
  }
  const first = data.trimStart()[0];
  if (first !== '{' && first !== '[') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};

// Walks the response and returns [{ path, kind, base64?, text? }] in document order.
export const findLabels = (data) => {
  const labels = [];
  let visited = 0;
  const stack = [{ value: parseIfJson(data), path: '' }];

  while (stack.length && visited < MAX_NODES && labels.length < MAX_LABELS) {
    const { value, path } = stack.pop();
    visited += 1;

    if (typeof value === 'string') {
      const found = classifyString(value);
      if (found) {
        labels.push({ path: path || '(body)', ...found });
      }
    } else if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: value[index], path: `${path}[${index}]` });
      }
    } else if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        stack.push({ value: value[key], path: path ? `${path}.${key}` : key });
      }
    }
  }

  return labels;
};
