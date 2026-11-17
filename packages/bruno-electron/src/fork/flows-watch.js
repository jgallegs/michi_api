const fs = require('fs');
const path = require('path');
const { SETTINGS_FILE, isCollectionRoot } = require('./collection-settings-file');

// Flows and blocks also reach .michi.json from outside the app: a git pull, a copy from a colleague, a
// tool that writes the file. The file of every collection whose flows were asked for is looked at once
// a second, and whoever asked is told when it changes, so nobody has to reopen the app to see a new flow.
// The file is polled instead of watched: git replaces it instead of rewriting it, which leaves a plain
// watcher holding the old file, and the file may not exist yet.
const CHANGED_CHANNEL = 'main:fork-flows-changed';
const INTERVAL_MS = 1000;

const watched = new Map();

const hasChanged = (current, previous) => current.mtimeMs !== previous.mtimeMs || current.size !== previous.size;

const unwatchCollection = (collectionPath) => {
  const entry = watched.get(collectionPath);
  if (!entry) {
    return;
  }
  fs.unwatchFile(entry.file, entry.listener);
  watched.delete(collectionPath);
};

const watchCollection = (collectionPath, notify, interval = INTERVAL_MS) => {
  if (watched.has(collectionPath) || !isCollectionRoot(collectionPath)) {
    return;
  }
  const file = path.join(collectionPath, SETTINGS_FILE);
  const listener = (current, previous) => {
    // A collection that was deleted or moved has nothing left to tell.
    if (!isCollectionRoot(collectionPath)) {
      unwatchCollection(collectionPath);
      return;
    }
    if (hasChanged(current, previous)) {
      notify(collectionPath);
    }
  };
  fs.watchFile(file, { interval, persistent: false }, listener);
  watched.set(collectionPath, { file, listener });
};

const unwatchAll = () => [...watched.keys()].forEach(unwatchCollection);

const isWatched = (collectionPath) => watched.has(collectionPath);

module.exports = { CHANGED_CHANNEL, watchCollection, unwatchCollection, unwatchAll, isWatched };
