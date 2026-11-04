const aboutPage = require('./about-page');
const { APP_NAME } = require('./branding');

describe('about page', () => {
  it('shows the app name and version, the logo and the upstream attribution', () => {
    const html = aboutPage({ version: '1.2.3-fork.4' });
    expect(html).toContain(`<title>About ${APP_NAME}</title>`);
    expect(html).toContain(`${APP_NAME} 1.2.3-fork.4`);
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).toContain('Bruno Software Inc');
  });
});
