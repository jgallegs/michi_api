const fs = require('fs');
const path = require('path');
const { APP_NAME } = require('./branding');

const LOGO_PATH = path.join(__dirname, '..', 'about', '256x256.png');

const readLogo = () => {
  try {
    return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  } catch {
    return '';
  }
};

// Same contract as app/about-bruno.js: returns the HTML of the About window.
module.exports = function aboutPage({ version }) {
  const currentYear = new Date().getFullYear();
  const logo = readLogo();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About ${APP_NAME}</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 10px; background-color: #f4f4f4; color: #333; }
            .logo { width: 96px; height: 96px; margin-top: 6px; }
            .title { font-size: 24px; margin: 4px 0 2px; font-weight: bold; color: #222; }
            .description { font-size: 12px; color: #444; margin: 0; }
            .footer { font-size: 11px; color: #666; margin-top: 12px; }
        </style>
    </head>
    <body>
      ${logo ? `<img class="logo" src="${logo}" alt="${APP_NAME}">` : ''}
      <h2 class="title">${APP_NAME} ${version}</h2>
      <p class="description">Based on Bruno, open source under the MIT license.</p>
      <footer class="footer">Bruno ©${currentYear} Bruno Software Inc</footer>
    </body>
    </html>
  `;
};
