const fs = require('fs');
const path = require('path');

// Shared per-collection settings of the fork. The file lives in the collection root so it travels with
// the collection through git. Upstream Bruno only reads .bru/.yml requests and its own config files, so
// an extra JSON file is ignored there in both the bru and the yml formats.
const SETTINGS_FILE = '.michi.json';
const COLLECTION_MARKERS = ['bruno.json', 'opencollection.yml'];

const isCollectionRoot = (collectionPath) =>
  typeof collectionPath === 'string'
  && path.isAbsolute(collectionPath)
  && COLLECTION_MARKERS.some((marker) => fs.existsSync(path.join(collectionPath, marker)));

const assertCollectionRoot = (collectionPath) => {
  if (!isCollectionRoot(collectionPath)) {
    throw new Error('Not a collection folder');
  }
};

const settingsPath = (collectionPath) => path.join(collectionPath, SETTINGS_FILE);

const unreadableSettingsError = () =>
  new Error(`${SETTINGS_FILE} cannot be read or is not valid JSON. Check whether it has an unresolved git conflict.`);

// Only a missing file counts as empty. Anything else throws, because treating a damaged file as empty
// would drop its protections silently and let the next write replace everything in it.
const readSettings = (collectionPath) => {
  let content;
  try {
    content = fs.readFileSync(settingsPath(collectionPath), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    }
    throw unreadableSettingsError();
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw unreadableSettingsError();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw unreadableSettingsError();
  }
  return parsed;
};

// An empty settings object removes the file, so a collection that stops using the fork leaves no trace.
const writeSettings = (collectionPath, settings) => {
  const file = settingsPath(collectionPath);
  if (!Object.keys(settings).length) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
};

module.exports = { SETTINGS_FILE, isCollectionRoot, assertCollectionRoot, readSettings, writeSettings };
