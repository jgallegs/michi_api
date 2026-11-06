import fs from 'node:fs';
import path from 'node:path';

// @zebrash/core (label drawing) downloads its fonts from a CDN by default. The fork must not call
// third-party services, so the build:
// 1. points the alias michi-zebrash-fonts at the TTFs shipped inside the package, and
// 2. swaps the library's font loader for src/components/fork/LabelPreview/zebrashFonts.js.
// If either step cannot be done, the build fails instead of shipping the CDN loader.

const LOADER = /[\\/]@zebrash[\\/]core[\\/]dist[\\/]assets[\\/]fonts(?:-browser)?\.js$/;
const CDN_LOADER = /cdn\.jsdelivr\.net\/(?:npm\/@zebrash|gh\/Fountain-Bio)/;

const findFontsDir = (start) => {
  let dir = start;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '@zebrash', 'core', 'src', 'assets', 'fonts');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('fork: @zebrash/core fonts not found; run npm install');
    }
    dir = parent;
  }
};

export const setupZebrashFonts = (api) => {
  const rootPath = api.context.rootPath;
  const replacement = path.join(rootPath, 'src', 'components', 'fork', 'LabelPreview', 'zebrashFonts.js');

  api.modifyRsbuildConfig((config) => {
    config.resolve = {
      ...config.resolve,
      alias: { ...config.resolve?.alias, 'michi-zebrash-fonts': findFontsDir(rootPath) }
    };
  });

  api.modifyRspackConfig((config, { rspack }) => {
    config.plugins = config.plugins || [];
    config.plugins.push(new rspack.NormalModuleReplacementPlugin(LOADER, replacement));
  });

  // Safety net: no bundle may contain the CDN loader.
  api.onAfterBuild(() => {
    const outDir = api.context.distPath;
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.js') && CDN_LOADER.test(fs.readFileSync(full, 'utf8'))) {
          offenders.push(path.relative(outDir, full));
        }
      }
    };
    if (fs.existsSync(outDir)) {
      walk(outDir);
    }
    if (offenders.length) {
      throw new Error(`fork: label font loader still points at the CDN in ${offenders.join(', ')}`);
    }
  });
};
