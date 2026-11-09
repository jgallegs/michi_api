import fs from 'node:fs';
import path from 'node:path';

// @zebrash/core (label drawing) downloads its fonts from a CDN by default. The fork must not call
// third-party services, so the build:
// 1. points the alias michi-zebrash-fonts at the TTFs shipped inside the package, and
// 2. swaps the library's font loader for src/components/fork/LabelPreview/zebrashFonts.js.
// If either step cannot be done, the build fails instead of shipping the CDN loader.
// The package's HelveticaBoldCondensedCustom.ttf is all rights reserved: the app uses a font under
// the Open Font License instead, and the build also fails if that file reaches the bundle.

const LOADER = /[\\/]@zebrash[\\/]core[\\/]dist[\\/]assets[\\/]fonts(?:-browser)?\.js$/;
const CDN_LOADER = /cdn\.jsdelivr\.net\/(?:npm\/@zebrash|gh\/Fountain-Bio)/;
const RESTRICTED_FONT = 'HelveticaBoldCondensedCustom.ttf';

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
  const fontsDir = findFontsDir(rootPath);
  // Start of the restricted font as it would appear inlined (base64) in a bundle.
  const restrictedSignature = fs.readFileSync(path.join(fontsDir, RESTRICTED_FONT)).toString('base64').slice(0, 160);

  api.modifyRsbuildConfig((config) => {
    config.resolve = {
      ...config.resolve,
      alias: { ...config.resolve?.alias, 'michi-zebrash-fonts': fontsDir }
    };
  });

  api.modifyRspackConfig((config, { rspack }) => {
    config.plugins = config.plugins || [];
    config.plugins.push(new rspack.NormalModuleReplacementPlugin(LOADER, replacement));
  });

  // Safety net: no bundle may contain the CDN loader or the restricted font.
  api.onAfterBuild(() => {
    const outDir = api.context.distPath;
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.startsWith(RESTRICTED_FONT.replace('.ttf', ''))) {
          offenders.push(`${path.relative(outDir, full)} (restricted font)`);
        } else if (entry.name.endsWith('.js')) {
          const code = fs.readFileSync(full, 'utf8');
          if (CDN_LOADER.test(code)) {
            offenders.push(`${path.relative(outDir, full)} (CDN font loader)`);
          }
          if (code.includes(restrictedSignature)) {
            offenders.push(`${path.relative(outDir, full)} (restricted font)`);
          }
        }
      }
    };
    if (fs.existsSync(outDir)) {
      walk(outDir);
    }
    if (offenders.length) {
      throw new Error(`fork: label fonts not allowed in the bundle: ${offenders.join(', ')}`);
    }
  });
};
