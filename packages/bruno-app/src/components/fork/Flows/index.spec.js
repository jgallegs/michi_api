import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { SidebarAccordionProvider } from 'components/Sidebar/SidebarAccordionContext';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import FlowsSection from './index';
import { FLOW_VERSION } from './model';
import { resetFlowsStore } from './store';
import { patchRunSession, resetRunSessions } from './run/session';

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'generated-uid', nanoid: () => 'generated-uid' }));

const COLLECTION = { uid: 'c1', name: 'Orders', pathname: '/collections/orders' };

const makeFlow = (id, name, folder = '') => ({ id, name, version: FLOW_VERSION, folder, nodes: [], edges: [] });

const renderSection = () => {
  const store = configureStore({
    reducer: {
      collections: () => ({ collections: [COLLECTION] }),
      tabs: (state = { tabs: [], activeTabUid: null }, action) =>
        action.type === 'tabs/addTab' ? { tabs: [...state.tabs, action.payload], activeTabUid: action.payload.uid } : state,
      workspaces: () => ({ workspaces: [] })
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <SidebarAccordionProvider defaultExpanded={['flows']}>
          <FlowsSection />
        </SidebarAccordionProvider>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

describe('FlowsSection', () => {
  let files;

  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    resetFlowsStore();
    resetRunSessions();
    files = {};
    window.ipcRenderer = {
      invoke: jest.fn(async (channel, _path, arg) => {
        if (channel === 'fork:flows:list') return Object.values(files);
        if (channel === 'fork:flows:save') {
          files[arg.id] = arg;
          return arg;
        }
        throw new Error(`unexpected channel ${channel}`);
      })
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('renders nothing while the feature is off', () => {
    renderSection();
    expect(screen.queryByText('Flows')).not.toBeInTheDocument();
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  describe('when turned on', () => {
    beforeEach(() => setForkSetting(FORK_SETTINGS.FLOWS, true));

    it('lists the flows grouped by folder', async () => {
      files = { a: makeFlow('a', 'Root flow'), b: makeFlow('b', 'Nested flow', 'Warehouse') };
      renderSection();
      expect(await screen.findByText('Root flow')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Warehouse'));
      expect(screen.queryByText('Nested flow')).not.toBeInTheDocument();
    });

    it('finds a flow by its name or its folder', async () => {
      files = { a: makeFlow('a', 'Create shipments'), b: makeFlow('b', 'Close day', 'Warehouse'), c: makeFlow('c', 'Labels', 'Warehouse') };
      renderSection();
      await screen.findByText('Create shipments');

      fireEvent.change(screen.getByTestId('flow-search'), { target: { value: 'ship' } });
      expect(screen.getAllByTestId('flow-row').map((row) => row.textContent)).toEqual(['Create shipments']);
      fireEvent.change(screen.getByTestId('flow-search'), { target: { value: 'WAREHOUSE' } });
      expect(screen.getAllByTestId('flow-row').map((row) => row.textContent)).toEqual(['Close day', 'Labels']);
      fireEvent.change(screen.getByTestId('flow-search'), { target: { value: 'nothing' } });
      expect(screen.getByText('No flow is called like that.')).toBeInTheDocument();
    });

    it('duplicates a flow with its steps, under a name that is free, and opens the copy', async () => {
      const steps = [{ id: 'start', type: 'start', x: 0, y: 0, config: {} }];
      files = { a: { ...makeFlow('a', 'Create shipments', 'Daily'), nodes: steps }, b: makeFlow('b', 'Create shipments (2)') };
      const store = renderSection();
      await screen.findByText('Create shipments');

      fireEvent.click(screen.getAllByTitle('Duplicate flow')[0]);
      await waitFor(() => expect(files['generated-uid']).toBeDefined());
      expect(files['generated-uid']).toMatchObject({ name: 'Create shipments (3)', folder: 'Daily', nodes: steps });
      await waitFor(() => expect(store.getState().tabs.activeTabUid).toBe('/collections/orders#flow:generated-uid'));
    });

    it('marks next to each flow how its last run went', async () => {
      files = { a: makeFlow('a', 'Good one'), b: makeFlow('b', 'Bad one'), c: makeFlow('c', 'Never run') };
      patchRunSession('a', { phase: 'done', outcome: 'completed' });
      patchRunSession('b', { phase: 'done', outcome: 'failed' });
      renderSection();
      await screen.findByText('Good one');
      expect(screen.getAllByTestId('flow-run-mark').map((mark) => [mark.className.replace('flow-run-mark ', ''), mark.title])).toEqual([
        ['bad', 'Its last run failed'],
        ['ok', 'Its last run finished']
      ]);
    });

    it('creates a flow and opens its tab', async () => {
      const store = renderSection();
      await screen.findByText('No flows in this collection yet.');

      fireEvent.click(screen.getByTestId('flow-new'));
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New one' } });
      fireEvent.click(screen.getByTestId('flow-form-submit-btn'));

      await waitFor(() => expect(store.getState().tabs.activeTabUid).toBe('/collections/orders#flow:generated-uid'));
      expect(store.getState().tabs.tabs[0].type).toBe('fork-flow:generated-uid');
      expect(files['generated-uid'].name).toBe('New one');
    });

    it('shows why the flows cannot be read and blocks creating new ones', async () => {
      window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error('.michi.json cannot be read')));
      renderSection();
      expect(await screen.findByTestId('flows-error')).toHaveTextContent('.michi.json cannot be read');
      expect(screen.getByTestId('flow-new')).toBeDisabled();
    });
  });
});
