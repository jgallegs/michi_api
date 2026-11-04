// Name the app shows for itself. Keep in sync with src/components/fork/branding.js (checked by a test).
const APP_NAME = 'Michi';

// Exact source fragments rewritten at build time. Each one must appear somewhere in src/;
// branding-phrases.spec.js fails when upstream rewords a fragment so the list can be updated.
// Not listed on purpose: values written into files (exportedUsing, .gitignore markers), and texts that
// refer to the upstream project itself (its documentation, GitHub issues, Golden Edition, changelog).
const PHRASES = [
  ['supported in Bruno', `supported in ${APP_NAME}`],
  ['Create a Bruno request', `Create a ${APP_NAME} request`],
  ['Supports both Bruno and Postman formats', `Supports both ${APP_NAME} and Postman formats`],
  ['Bruno will pick the next available port', `${APP_NAME} will pick the next available port`],
  ['Bruno talks to providers directly', `${APP_NAME} talks to providers directly`],
  ['Point Bruno at any', `Point ${APP_NAME} at any`],
  ['when Bruno lists them', `when ${APP_NAME} lists them`],
  ['Bruno refreshes the cache', `${APP_NAME} refreshes the cache`],
  ['directly updated in Bruno', `directly updated in ${APP_NAME}`],
  ['Bruno automatically generates', `${APP_NAME} automatically generates`],
  ['Restart Bruno to recover', `Restart ${APP_NAME} to recover`],
  ['Bruno stores your collections', `${APP_NAME} stores your collections`],
  ['Bruno stores your workspaces', `${APP_NAME} stores your workspaces`],
  ['Bruno\'s native file format', `${APP_NAME}'s native file format`],
  ['Bruno uses{\' \'}', `${APP_NAME} uses{' '}`],
  ['>Bruno Format<', `>${APP_NAME} Format<`],
  ['Bruno Collection (ZIP)', `${APP_NAME} Collection (ZIP)`],
  ['open directly in Bruno', `open directly in ${APP_NAME}`],
  ['in Bruno?', `in ${APP_NAME}?`],
  ['label: \'Bruno Collection\'', `label: '${APP_NAME} Collection'`],
  ['|| \'Bruno Collection\'', `|| '${APP_NAME} Collection'`],
  ['Scanning for Bruno files', `Scanning for ${APP_NAME} files`],
  ['No Bruno collections', `No ${APP_NAME} collections`],
  ['Bruno saves each request', `${APP_NAME} saves each request`],
  ['Bruno saves collections as plain files', `${APP_NAME} saves collections as plain files`],
  ['\'Bruno (JSON)\'', `'${APP_NAME} (JSON)'`],
  ['Export Bruno scripts', `Export ${APP_NAME} scripts`],
  ['not a valid Bruno collection', `not a valid ${APP_NAME} collection`],
  ['Supports Bruno, OpenCollection', `Supports ${APP_NAME}, OpenCollection`],
  ['without a Bruno equivalent', `without a ${APP_NAME} equivalent`],
  ['Open a Bruno collection', `Open a ${APP_NAME} collection`],
  ['Bruno works entirely offline', `${APP_NAME} works entirely offline`],
  ['exported Bruno workspace', `exported ${APP_NAME} workspace`],
  ['It looks like Bruno was launched', `It looks like ${APP_NAME} was launched`],
  ['opened Bruno inside your web browser', `opened ${APP_NAME} inside your web browser`],
  ['Bruno only works within Electron', `${APP_NAME} only works within Electron`],
  ['name: \'Close Bruno\'', `name: 'Close ${APP_NAME}'`],
  ['Hello from a Bruno app', `Hello from a ${APP_NAME} app`],
  ['mock server in Bruno.', `mock server in ${APP_NAME}.`],
  ['Import Bruno environment failed', `Import ${APP_NAME} environment failed`]
];

const applyPhrases = (code) => {
  let result = code;
  for (const [from, to] of PHRASES) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }
  return result;
};

module.exports = { APP_NAME, PHRASES, applyPhrases };
