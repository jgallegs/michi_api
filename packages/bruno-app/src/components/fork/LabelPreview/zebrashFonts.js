// Replaces @zebrash/core's font loader at build time (plugins/fork/zebrash-fonts.mjs). The original
// downloads its fonts from a CDN; this one serves them from the app, inlined in the bundle, so
// drawing a label never touches the network.
//
// The bold condensed face (ZPL font 0) is Fira Sans Condensed Bold, under the SIL Open Font License
// (fonts/OFL.txt). The package's own HelveticaBoldCondensedCustom.ttf carries an all-rights-reserved
// notice and is never bundled: the build fails if it shows up.
import HelveticaBold from './fonts/FiraSansCondensed-Bold.ttf?inline';
import DejavuSansMono from 'michi-zebrash-fonts/DejaVuSansMono.ttf?inline';
import DejavuSansMonoBold from 'michi-zebrash-fonts/DejaVuSansMonoBold.ttf?inline';
import ZplGS from 'michi-zebrash-fonts/ZplGSCustom.ttf?inline';

const sources = { HelveticaBold, DejavuSansMono, DejavuSansMonoBold, ZplGS };
const filenames = {
  HelveticaBold: 'FiraSansCondensed-Bold.ttf',
  DejavuSansMono: 'DejaVuSansMono.ttf',
  DejavuSansMonoBold: 'DejaVuSansMonoBold.ttf',
  ZplGS: 'ZplGSCustom.ttf'
};
const cache = new Map();

const decodeDataUrl = (dataUrl) => {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export async function getEmbeddedFont(key) {
  if (!cache.has(key)) {
    if (!sources[key]) {
      throw new Error(`Unknown label font "${key}"`);
    }
    cache.set(key, decodeDataUrl(sources[key]));
  }
  return cache.get(key);
}

// Kept for API compatibility: the fonts always come from the app.
export function setFontBaseUrl() {}

export function getFontBaseUrl() {
  return '';
}

export function getFontFilename(key) {
  return filenames[key];
}
