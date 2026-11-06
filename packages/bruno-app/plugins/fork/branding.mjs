import path from 'node:path';
import { createRequire } from 'node:module';
import { setupZebrashFonts } from './zebrash-fonts.mjs';

const require = createRequire(import.meta.url);
const { APP_NAME, applyPhrases } = require('./branding-phrases.js');

// Brands the renderer at build time without editing upstream sources: sets the document title,
// rewrites the user-facing phrases listed in branding-phrases.js in files under src/ and blanks the
// usage telemetry key so builds never report anything.
// It also keeps the label renderer offline (zebrash-fonts.mjs).
export const pluginForkBranding = () => ({
  name: 'fork-branding',
  setup(api) {
    const srcDir = path.join(api.context.rootPath, 'src') + path.sep;
    setupZebrashFonts(api);

    api.modifyRsbuildConfig((config) => {
      config.html = { ...config.html, title: APP_NAME };
      // No usage telemetry from our builds, whatever the build environment holds.
      config.source = {
        ...config.source,
        define: { ...config.source?.define, 'process.env.NEXT_PUBLIC_POSTHOG_API_KEY': JSON.stringify('') }
      };
    });

    api.transform({ test: /\.(?:js|jsx)$/ }, ({ code, resourcePath }) => {
      if (!resourcePath.startsWith(srcDir)) {
        return code;
      }
      return applyPhrases(code);
    });
  }
});
