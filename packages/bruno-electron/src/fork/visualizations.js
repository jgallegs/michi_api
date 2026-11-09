// Sends the HTML panels a post-response script drew with bru.visualize to the window, on a
// channel of its own (the app's request-event reducer stays untouched). An empty list is sent
// too, so the previous panels of that request disappear when a new response has none.

const CHANNEL = 'main:fork-visualizations';

const sendVisualizations = (win, scriptResult, { itemUid, requestUid, collectionUid }) => {
  if (!win || !win.webContents || win.isDestroyed?.()) {
    return;
  }
  const panels = Array.isArray(scriptResult?.visualizations) ? scriptResult.visualizations : [];
  win.webContents.send(CHANNEL, {
    itemUid,
    requestUid,
    collectionUid,
    visualizations: panels.filter((panel) => panel && typeof panel.content === 'string')
  });
};

module.exports = { CHANNEL, sendVisualizations };
