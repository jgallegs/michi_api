import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { APP_NAME, applyPhrases } = require('./branding-phrases.js');

// Brands the renderer at build time without editing upstream sources: sets the document title and
// rewrites the user-facing phrases listed in branding-phrases.js in files under src/.
export const pluginForkBranding = () => ({
  name: 'fork-branding',
  setup(api) {
    const srcDir = path.join(api.context.rootPath, 'src') + path.sep;

    api.modifyRsbuildConfig((config) => {
      config.html = { ...config.html, title: APP_NAME };
    });

    api.transform({ test: /\.(?:js|jsx)$/ }, ({ code, resourcePath }) => {
      if (!resourcePath.startsWith(srcDir)) {
        return code;
      }
      return applyPhrases(code);
    });
  }
});
