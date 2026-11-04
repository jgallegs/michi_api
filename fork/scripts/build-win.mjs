#!/usr/bin/env node
// Builds the Windows installer and portable executable with the fork identity (fork/packaging/).
// Mirrors scripts/build-electron.js up to packaging, then packages with the fork config.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const electronDir = path.join(repoRoot, 'packages/bruno-electron');
const webDir = path.join(electronDir, 'web');
const appDist = path.join(repoRoot, 'packages/bruno-app/dist');
const config = path.join(repoRoot, 'fork/packaging/electron-builder-config.js');

const run = (command, cwd = repoRoot) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
};

const rewriteFiles = (dir, extension, replace) => {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(extension)) {
      const target = path.join(dir, file);
      fs.writeFileSync(target, replace(fs.readFileSync(target, 'utf8')));
    }
  }
};

run('npm run build:web');

fs.rmSync(path.join(electronDir, 'out'), { recursive: true, force: true });
fs.rmSync(webDir, { recursive: true, force: true });
fs.cpSync(appDist, webDir, { recursive: true });

rewriteFiles(webDir, '.html', (content) => content.replace(/\/static/g, './static'));
rewriteFiles(path.join(webDir, 'static/css'), '.css', (content) => content.replace(/\/static\/font/g, '../../static/font'));
for (const file of fs.readdirSync(webDir)) {
  if (file.endsWith('.map')) {
    fs.rmSync(path.join(webDir, file));
  }
}

run(`npx electron-builder --win --config "${config}"`, electronDir);

console.log(`\nArtifacts in ${path.join(electronDir, 'out')}`);
