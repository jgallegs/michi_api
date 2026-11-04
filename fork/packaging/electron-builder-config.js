// Packaging config for the fork. It extends the upstream config instead of editing it, and gives the
// app its own identity so it installs and stores data side by side with an official Bruno install.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const electronDir = path.join(repoRoot, 'packages/bruno-electron');
const upstream = require(path.join(electronDir, 'electron-builder-config.js'));

const PRODUCT_NAME = 'Brunillo';
const PACKAGE_NAME = 'brunillo';
const APP_ID = 'app.brunillo.desktop';

const readTrimmed = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8').trim();
const upstreamVersion = readTrimmed('fork/UPSTREAM_VERSION').replace(/^v/, '');
const forkRelease = readTrimmed('fork/packaging/RELEASE');
const version = `${upstreamVersion}-fork.${forkRelease}`;

module.exports = {
  ...upstream,
  appId: APP_ID,
  productName: PRODUCT_NAME,
  extraMetadata: {
    ...upstream.extraMetadata,
    name: PACKAGE_NAME,
    productName: PRODUCT_NAME,
    version
  },
  directories: {
    buildResources: path.join(electronDir, 'resources'),
    output: path.join(electronDir, 'out')
  },
  afterSign: undefined,
  win: {
    ...upstream.win,
    icon: path.join(__dirname, 'icons/icon.ico'),
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    publisherName: PRODUCT_NAME
  },
  nsis: {
    ...upstream.nsis,
    include: path.join(electronDir, 'resources/installer.nsh'),
    artifactName: '${productName}-Setup-${version}.${ext}',
    shortcutName: PRODUCT_NAME,
    uninstallDisplayName: PRODUCT_NAME
  },
  portable: {
    artifactName: '${productName}-${version}-portable.${ext}'
  }
};
