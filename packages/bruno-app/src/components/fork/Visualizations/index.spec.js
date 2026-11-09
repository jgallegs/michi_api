import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import { CHANNEL, installVisualizationsListener, resetVisualizations, setVisualizations } from './store';
import { VisualizationTabs, VisualizationView } from './index';

const panels = [
  { type: 'html', name: 'Babel', content: '<p>estado</p>' },
  { type: 'html', name: 'Detalle', content: '<p>detalle</p>' }
];

const renderBoth = () =>
  render(
    <ThemeProvider theme={themes.light}>
      <VisualizationTabs itemUid="r1" />
      <VisualizationView itemUid="r1" />
    </ThemeProvider>
  );

describe('script panels (bru.visualize)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    resetVisualizations();
  });

  it('shows nothing until a response brings panels', () => {
    renderBoth();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('visualization-view')).toBeNull();
  });

  it('opens the first panel and switches between panels and the response', () => {
    renderBoth();
    act(() => setVisualizations({ itemUid: 'r1', requestUid: 'q1', visualizations: panels }));

    expect(screen.getAllByTestId('visualization-tab').map((tab) => tab.textContent)).toEqual(['Babel', 'Detalle']);
    expect(screen.getByTestId('visualization-view')).toHaveAttribute('srcdoc', '<p>estado</p>');
    expect(screen.getByTestId('visualization-view')).toHaveAttribute('sandbox', 'allow-scripts');

    fireEvent.click(screen.getByText('Detalle'));
    expect(screen.getByTestId('visualization-view')).toHaveAttribute('srcdoc', '<p>detalle</p>');

    fireEvent.click(screen.getByText('Response'));
    expect(screen.queryByTestId('visualization-view')).toBeNull();
  });

  it('clears the panels when a new response has none', () => {
    renderBoth();
    act(() => setVisualizations({ itemUid: 'r1', visualizations: panels }));
    act(() => setVisualizations({ itemUid: 'r1', visualizations: [] }));
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('visualization-view')).toBeNull();
  });

  it('listens to Electron on its own channel', () => {
    const handlers = {};
    window.ipcRenderer = { on: jest.fn((channel, handler) => {
      handlers[channel] = handler; return () => delete handlers[channel];
    }) };
    const cleanup = installVisualizationsListener();
    renderBoth();
    act(() => handlers[CHANNEL]({ itemUid: 'r1', visualizations: panels }));
    expect(screen.getByTestId('visualization-view')).toBeInTheDocument();
    cleanup();
    expect(handlers[CHANNEL]).toBeUndefined();
  });

  it('is hidden when turned off', () => {
    renderBoth();
    act(() => setVisualizations({ itemUid: 'r1', visualizations: panels }));
    act(() => setForkSetting(FORK_SETTINGS.VISUALIZE, false));
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('visualization-view')).toBeNull();
  });
});
