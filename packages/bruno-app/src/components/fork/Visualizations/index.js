import React, { useSyncExternalStore } from 'react';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import { getVisualizations, showPanel, subscribeToVisualizations } from './store';
import StyledWrapper from './StyledWrapper';

const useVisualizations = (itemUid) =>
  useSyncExternalStore(subscribeToVisualizations, () => getVisualizations(itemUid));

// Next to the response format selector: "Response" plus one tab per panel.
export const VisualizationTabs = ({ itemUid }) => {
  const enabled = useForkSetting(FORK_SETTINGS.VISUALIZE);
  const current = useVisualizations(itemUid);
  if (!enabled || !current || !current.panels.length) {
    return null;
  }
  return (
    <StyledWrapper className="fork-visualization-tabs" role="tablist" aria-label="Script panels">
      <button
        type="button"
        role="tab"
        aria-selected={!current.active}
        className={current.active ? '' : 'active'}
        onClick={() => showPanel(itemUid, null)}
      >
        Response
      </button>
      {current.panels.map((panel) => (
        <button
          type="button"
          role="tab"
          key={panel.name}
          aria-selected={current.active === panel.name}
          className={current.active === panel.name ? 'active fork-no-translate' : 'fork-no-translate'}
          onClick={() => showPanel(itemUid, panel.name)}
          data-testid="visualization-tab"
        >
          {panel.name}
        </button>
      ))}
    </StyledWrapper>
  );
};

// Over the response body while a panel is open. The panel runs in a sandboxed frame: its own
// scripts may run, but it cannot reach the app.
export const VisualizationView = ({ itemUid }) => {
  const enabled = useForkSetting(FORK_SETTINGS.VISUALIZE);
  const current = useVisualizations(itemUid);
  const panel = enabled && current && current.active ? current.panels.find((p) => p.name === current.active) : null;
  if (!panel) {
    return null;
  }
  return (
    <iframe
      title={panel.name}
      sandbox="allow-scripts"
      srcDoc={panel.content}
      data-testid="visualization-view"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff', zIndex: 5 }}
    />
  );
};
