// bru.visualize(type, { name, content }) — keeps HTML panels produced by a script so the app
// can show them next to the response. Bruno 4.3 still calls bru.visualize from its sandbox but
// no longer implements it; scripts written for earlier versions rely on it.
//
// Accepted forms:
//   bru.visualize('html', { name: 'Panel', content: '<p>…</p>' })
//   bru.visualize('html', '<p>…</p>')
//   bru.visualize('<p>…</p>')
// Panels with the same name replace each other, so a script that runs twice keeps one tab.

const MAX_PANELS = 10;
const MAX_CONTENT = 2 * 1024 * 1024;
const DEFAULT_NAME = 'Panel';

const normalise = (typeOrContent, options) => {
  let type = 'html';
  let name = DEFAULT_NAME;
  let content;

  if (options === undefined && typeof typeOrContent === 'string' && /</.test(typeOrContent)) {
    content = typeOrContent;
  } else {
    type = String(typeOrContent || 'html').toLowerCase();
    if (typeof options === 'string') {
      content = options;
    } else if (options && typeof options === 'object') {
      content = options.content;
      if (options.name) {
        name = String(options.name);
      }
    }
  }

  if (type !== 'html') {
    throw new Error(`bru.visualize: only "html" is supported (got "${type}")`);
  }
  if (typeof content !== 'string') {
    throw new Error('bru.visualize: content must be an HTML string');
  }
  if (content.length > MAX_CONTENT) {
    throw new Error('bru.visualize: content is larger than 2 MB');
  }
  return { type, name: name.slice(0, 60), content };
};

const visualize = (bru, typeOrContent, options) => {
  const panel = normalise(typeOrContent, options);
  if (!Array.isArray(bru.visualizations)) {
    bru.visualizations = [];
  }
  const existing = bru.visualizations.findIndex((item) => item.name === panel.name);
  if (existing !== -1) {
    bru.visualizations[existing] = panel;
  } else if (bru.visualizations.length < MAX_PANELS) {
    bru.visualizations.push(panel);
  }
};

module.exports = { visualize };
