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
