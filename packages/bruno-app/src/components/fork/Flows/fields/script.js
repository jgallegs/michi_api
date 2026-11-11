import { MAX_FIELDS } from './paths';

// Reads, as plain text, which fields of the response the scripts of a request mention. Nothing is run:
// it is a guess that lets a field be offered before the request has been sent in this session.
const NAME = '[A-Za-z_$][\\w$]*';
const NOT_INSIDE = '(?<![\\w$.])';
const BODY = `${NOT_INSIDE}res\\s*\\.\\s*(?:getBody\\s*\\(\\s*\\)|body)`;
const STEP = `\\s*\\??\\.\\s*${NAME}|\\s*\\[\\s*\\d+\\s*\\]|\\s*\\[\\s*['"][^'"\\]]+['"]\\s*\\]`;
const ALIAS = new RegExp(`(?:const|let|var)\\s+(${NAME})\\s*=\\s*(?:await\\s+)?${BODY}(?!\\s*[.\\[\\w$?])`, 'g');
const UNPACKED = new RegExp(`(?:const|let|var)\\s*\\{([^{}]*)\\}\\s*=\\s*(?:await\\s+)?${BODY}(?!\\s*[.\\[\\w$?])`, 'g');
const QUERY = new RegExp(`${NOT_INSIDE}res\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
const STEP_PARTS = new RegExp(`\\.\\s*(${NAME})|\\[\\s*(\\d+)\\s*\\]|\\[\\s*['"]([^'"\\]]+)['"]\\s*\\]`, 'g');
// Members of a value, not fields of the response.
const NOT_FIELDS = ['length', 'toString', 'constructor', 'prototype'];

const textOf = (request) =>
  [request?.script?.res, request?.tests, ...(request?.vars?.res || []).map((variable) => variable?.value)]
    .filter((text) => typeof text === 'string')
    .join('\n')
    .replace(COMMENT, ' ');

const escape = (name) => name.replace(/[$]/g, '\\$&');

const readScripts = (request) => {
  const text = textOf(request);
  if (!text.includes('res')) {
    return null;
  }
  const fields = [];
  const lists = [];
  const add = (names, listsOnTheWay = []) => {
    names.forEach((name, index) => {
      const path = names.slice(0, index + 1).join('.');
      if (!fields.includes(path) && fields.length < MAX_FIELDS) {
        fields.push(path);
      }
    });
    listsOnTheWay.filter((path) => !lists.includes(path)).forEach((path) => lists.push(path));
  };

  const readChains = (source) => {
    const chain = new RegExp(`${source}((?:${STEP})+)(\\s*\\()?`, 'g');
    [...text.matchAll(chain)].forEach(([, steps, called]) => {
      const names = [];
      const seenLists = [];
      [...steps.matchAll(STEP_PARTS)].forEach(([, dotted, index, quoted]) => {
        if (index !== undefined) {
          if (names.length) {
            seenLists.push(names.join('.'));
          }
          return;
        }
        names.push(dotted || quoted);
      });
      // "body.items.map(" calls something on items: the last name is not a field.
      const kept = called ? names.slice(0, -1) : names;
      const cut = kept.findIndex((name) => NOT_FIELDS.includes(name));
      const clean = cut === -1 ? kept : kept.slice(0, cut);
      add(clean, seenLists.filter((path) => path.split('.').length <= clean.length));
    });
  };

  readChains(BODY);
  [...text.matchAll(ALIAS)].forEach(([, alias]) => readChains(`${NOT_INSIDE}${escape(alias)}(?![\\w$])`));
  [...text.matchAll(UNPACKED)].forEach(([, inside]) =>
    inside
      .split(',')
      .map((part) => part.split(/[:=]/)[0].trim())
      .filter((name) => new RegExp(`^${NAME}$`).test(name))
      .forEach((name) => add([name]))
  );
  [...text.matchAll(QUERY)].forEach(([, query]) => {
    const plain = query.replace(/\[\d*\]/g, '');
    if (new RegExp(`^${NAME}(\\.${NAME})*$`).test(plain)) {
      add(plain.split('.'));
    }
  });

  return fields.length ? { fields, lists } : null;
};

const cache = new WeakMap();

// A request is read once: it is a new object whenever it changes.
export const shapeFromScript = (request) => {
  if (!request || typeof request !== 'object') {
    return null;
  }
  if (!cache.has(request)) {
    cache.set(request, readScripts(request));
  }
  return cache.get(request);
};
