#!/usr/bin/env node
// Verifies that the working tree only diverges from the upstream base tag in ways the fork allows:
// own code under `fork/` folders, upstream files touched only through hooks registered in fork/HOOKS.md,
// no forbidden words and no obvious secrets in added lines.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const repoRoot = git('rev-parse', '--show-toplevel').trim();
process.chdir(repoRoot);

const HOOK_MARKER = '[FORK H-';
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/
];

const errors = [];
const fail = (message) => errors.push(message);

const isForkPath = (file) => file.split('/').includes('fork');

const readBaseTag = () => {
  const file = 'fork/UPSTREAM_VERSION';
  if (!existsSync(file)) {
    throw new Error(`${file} not found`);
  }
  return readFileSync(file, 'utf8').trim();
};

// Rows of type "dependencias" register package.json / package-lock.json changes approved under
// R-33. JSON cannot carry a [FORK H-xx] marker, so their files are exempt from it.
const DEPENDENCY_FILE = /^(?:[\w.-]+\/)*package(?:-lock)?\.json$/;

const readRegisteredHookFiles = () => {
  const file = 'fork/HOOKS.md';
  if (!existsSync(file)) {
    throw new Error(`${file} not found`);
  }
  const files = new Set();
  const markerless = new Set();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!/^\|\s*H-\d+\s*\|/.test(line) || /RETIRADO|RETIRED/i.test(line)) {
      continue;
    }
    const isDependencyRow = /^\|\s*H-\d+\s*\|\s*(?:dependencias|dependencies)\s*\|/i.test(line);
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      if (isDependencyRow && DEPENDENCY_FILE.test(match[1])) {
        files.add(match[1]);
        markerless.add(match[1]);
      } else if (match[1].includes('/')) {
        files.add(match[1]);
      }
    }
  }
  return { files, markerless };
};

const readForbiddenWords = () => {
  const file = path.resolve(git('rev-parse', '--git-path', 'info/forbidden-words').trim());
  if (!existsSync(file)) {
    throw new Error(`forbidden words list not found at ${file}; install it before running this check`);
  }
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((pattern) => ({ pattern, regex: new RegExp(pattern, 'iu') }));
};

const changedFiles = (baseTag) => {
  const tracked = git('diff', '--name-only', baseTag).split('\n').filter(Boolean);
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
  return { tracked, untracked };
};

// Returns the added lines of a tracked file grouped by hunk.
const addedHunks = (baseTag, file) => {
  const diff = git('diff', '--unified=0', baseTag, '--', file);
  const hunks = [];
  let current = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      current = [];
      hunks.push(current);
    } else if (current && line.startsWith('+') && !line.startsWith('+++')) {
      current.push(line.slice(1));
    }
  }
  return hunks.filter((hunk) => hunk.length);
};

const scanLines = (file, lines, forbiddenWords) => {
  for (const { pattern, regex } of forbiddenWords) {
    if (regex.test(file)) {
      fail(`${file}: file name matches forbidden pattern /${pattern}/`);
    }
  }
  lines.forEach((line) => {
    for (const { pattern, regex } of forbiddenWords) {
      if (regex.test(line)) {
        fail(`${file}: forbidden pattern /${pattern}/ in: ${line.trim().slice(0, 120)}`);
      }
    }
    for (const regex of SECRET_PATTERNS) {
      if (regex.test(line)) {
        fail(`${file}: possible secret in: ${line.trim().slice(0, 60)}...`);
      }
    }
  });
};

const main = () => {
  const baseTag = readBaseTag();
  const { files: hookFiles, markerless } = readRegisteredHookFiles();
  const forbiddenWords = readForbiddenWords();
  const { tracked, untracked } = changedFiles(baseTag);

  for (const file of tracked) {
    const hunks = addedHunks(baseTag, file);
    scanLines(file, hunks.flat(), forbiddenWords);

    if (isForkPath(file)) {
      continue;
    }
    if (!hookFiles.has(file)) {
      fail(`${file}: upstream file changed but not registered in fork/HOOKS.md`);
      continue;
    }
    if (markerless.has(file)) {
      continue;
    }
    hunks.forEach((hunk) => {
      if (!hunk.some((line) => line.includes(HOOK_MARKER))) {
        fail(`${file}: change without a ${HOOK_MARKER}xx] marker: ${hunk[0].trim().slice(0, 120)}`);
      }
    });
  }

  for (const file of untracked) {
    const buffer = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
    const isBinary = buffer.includes(0);
    scanLines(file, isBinary ? [] : buffer.toString('utf8').split(/\r?\n/), forbiddenWords);
    if (!isForkPath(file)) {
      fail(`${file}: new file outside a fork/ folder`);
    }
  }

  const total = tracked.length + untracked.length;
  if (errors.length) {
    console.error(`check-diff: ${errors.length} problem(s) in ${total} changed file(s) against ${baseTag}`);
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
  console.log(`check-diff: OK (${total} changed file(s) against ${baseTag}, ${hookFiles.size} hook file(s) registered)`);
};

try {
  main();
} catch (error) {
  console.error(`check-diff: ${error.message}`);
  process.exit(2);
}
