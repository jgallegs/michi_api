const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

// Shared per-collection settings of the fork. It lives in the collection root so it travels with the
// collection through git. Upstream Bruno only reads .bru/.yml requests and its own config files, so an
// extra JSON file is ignored there in both the bru and the yml formats.
const SETTINGS_FILE = '.michi.json';
const COLLECTION_MARKERS = ['bruno.json', 'opencollection.yml'];

const isCollectionRoot = (collectionPath) =>
  typeof collectionPath === 'string'
  && path.isAbsolute(collectionPath)
  && COLLECTION_MARKERS.some((marker) => fs.existsSync(path.join(collectionPath, marker)));

const settingsPath = (collectionPath) => path.join(collectionPath, SETTINGS_FILE);

const readSettings = (collectionPath) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(collectionPath), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const readSensitiveEnvironments = (collectionPath) => {
  if (!isCollectionRoot(collectionPath)) {
    return [];
  }
  const list = readSettings(collectionPath).sensitiveEnvironments;
  return Array.isArray(list) ? list.filter((name) => typeof name === 'string') : [];
};

const writeSensitiveEnvironment = (collectionPath, environmentName, sensitive) => {
  if (!isCollectionRoot(collectionPath)) {
    throw new Error('Not a collection folder');
  }
  if (typeof environmentName !== 'string' || !environmentName) {
    throw new Error('Invalid environment name');
  }

  const settings = readSettings(collectionPath);
  const names = new Set(Array.isArray(settings.sensitiveEnvironments) ? settings.sensitiveEnvironments : []);
  if (sensitive) {
    names.add(environmentName);
  } else {
    names.delete(environmentName);
  }

  const next = { ...settings, sensitiveEnvironments: [...names].sort() };
  if (!next.sensitiveEnvironments.length) {
    delete next.sensitiveEnvironments;
  }

  const file = settingsPath(collectionPath);
  if (!Object.keys(next).length) {
    fs.rmSync(file, { force: true });
  } else {
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  }
  return next.sensitiveEnvironments || [];
};

const register = () => {
  ipcMain.handle('fork:sensitive-environments:read', (_event, collectionPath) => readSensitiveEnvironments(collectionPath));
  ipcMain.handle('fork:sensitive-environments:write', (_event, collectionPath, environmentName, sensitive) =>
    writeSensitiveEnvironment(collectionPath, environmentName, sensitive)
  );
};

module.exports = { SETTINGS_FILE, readSensitiveEnvironments, writeSensitiveEnvironment, register };
