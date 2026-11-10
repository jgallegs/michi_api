const { ipcMain } = require('electron');
const { SETTINGS_FILE, isCollectionRoot, assertCollectionRoot, readSettings, writeSettings } = require('./collection-settings-file');

// Environments marked as sensitive, shared with the team through .michi.json.
const readSensitiveEnvironments = (collectionPath) => {
  if (!isCollectionRoot(collectionPath)) {
    return [];
  }
  const list = readSettings(collectionPath).sensitiveEnvironments;
  return Array.isArray(list) ? list.filter((name) => typeof name === 'string') : [];
};

const writeSensitiveEnvironment = (collectionPath, environmentName, sensitive) => {
  assertCollectionRoot(collectionPath);
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

  writeSettings(collectionPath, next);
  return next.sensitiveEnvironments || [];
};

const register = () => {
  ipcMain.handle('fork:sensitive-environments:read', (_event, collectionPath) => readSensitiveEnvironments(collectionPath));
  ipcMain.handle('fork:sensitive-environments:write', (_event, collectionPath, environmentName, sensitive) =>
    writeSensitiveEnvironment(collectionPath, environmentName, sensitive)
  );
};

module.exports = { SETTINGS_FILE, readSensitiveEnvironments, writeSensitiveEnvironment, register };
