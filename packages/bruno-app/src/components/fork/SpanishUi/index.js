import { FORK_SETTINGS, getForkSetting, subscribeToForkSettings } from 'components/fork/settings/store';
import { PATTERNS, PHRASES } from './phrases';

// Translates the interface on screen, without touching Bruno's components: a MutationObserver swaps
// known English texts (text nodes and the placeholder, title and aria-label attributes) for Spanish.
// Editors, inputs and anything the user named (requests, collections, tabs) are left alone.
// Turning the switch off puts the English texts back.

const ATTRIBUTES = ['placeholder', 'title', 'aria-label'];
// Containers whose content is never touched (editors and names the user chose).
const SKIP = [
  '.CodeMirror',
  'pre',
  'code',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '.item-name',
  '.collection-name',
  '.transient-item-name',
  '.git-collection-name',
  '.tab-label',
  '[data-testid="response-preview-container"]',
  '.fork-no-translate'
].join(', ');
// Text inside these is a value the user typed, but their placeholder and title are interface texts.
const SKIP_TEXT = `${SKIP}, textarea, input, select`;
const MAX_LENGTH = 400;
const SPANISH = new Set(Object.values(PHRASES));

const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
let observer = null;

export const translatePhrase = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH || SPANISH.has(trimmed)) {
    return null;
  }
  let translated = Object.prototype.hasOwnProperty.call(PHRASES, trimmed) ? PHRASES[trimmed] : null;
  if (!translated) {
    for (const [pattern, build] of PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        translated = build(...match.slice(1));
        break;
      }
    }
  }
  if (!translated || translated === trimmed) {
    return null;
  }
  const start = text.indexOf(trimmed);
  return text.slice(0, start) + translated + text.slice(start + trimmed.length);
};

const isSkipped = (element) => !element || Boolean(element.closest(SKIP));

const translateTextNode = (node) => {
  if (!node.parentElement || node.parentElement.closest(SKIP_TEXT)) {
    return;
  }
  const translated = translatePhrase(node.nodeValue);
  if (translated !== null) {
    textOriginals.set(node, { english: node.nodeValue, spanish: translated });
    node.nodeValue = translated;
  }
};

const translateAttribute = (element, name) => {
  const value = element.getAttribute(name);
  const translated = translatePhrase(value);
  if (translated !== null) {
    const saved = attributeOriginals.get(element) || {};
    saved[name] = { english: value, spanish: translated };
    attributeOriginals.set(element, saved);
    element.setAttribute(name, translated);
  }
};

const translateElement = (element) => {
  ATTRIBUTES.forEach((name) => element.hasAttribute(name) && translateAttribute(element, name));
};

const walk = (root, visit) => {
  const start = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
  if (isSkipped(start)) {
    return;
  }
  if (root.nodeType === Node.TEXT_NODE) {
    visit.text(root);
    return;
  }
  visit.element(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeType === Node.ELEMENT_NODE && node.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      visit.text(node);
    } else {
      visit.element(node);
    }
    node = walker.nextNode();
  }
};

const translator = { text: translateTextNode, element: translateElement };

const restorer = {
  text: (node) => {
    const saved = textOriginals.get(node);
    if (saved && node.nodeValue === saved.spanish) {
      node.nodeValue = saved.english;
    }
    textOriginals.delete(node);
  },
  element: (element) => {
    const saved = attributeOriginals.get(element);
    if (saved) {
      Object.entries(saved).forEach(([name, { english, spanish }]) => {
        if (element.getAttribute(name) === spanish) {
          element.setAttribute(name, english);
        }
      });
      attributeOriginals.delete(element);
    }
  }
};

export const startSpanishUi = (root = document.body) => {
  if (observer || !root) {
    return;
  }
  walk(root, translator);
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        translateTextNode(mutation.target);
      } else if (mutation.type === 'attributes') {
        if (!isSkipped(mutation.target)) {
          translateAttribute(mutation.target, mutation.attributeName);
        }
      } else {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
            walk(node, translator);
          }
        });
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
};

export const stopSpanishUi = (root = document.body) => {
  if (!observer) {
    return;
  }
  observer.disconnect();
  observer = null;
  if (root) {
    walk(root, restorer);
  }
};

// Follows the switch in Preferences → Michi. Returns the cleanup.
export const installSpanishUi = () => {
  const apply = () => (getForkSetting(FORK_SETTINGS.SPANISH_UI) ? startSpanishUi() : stopSpanishUi());
  apply();
  const unsubscribe = subscribeToForkSettings(apply);
  return () => {
    unsubscribe();
    stopSpanishUi();
  };
};
