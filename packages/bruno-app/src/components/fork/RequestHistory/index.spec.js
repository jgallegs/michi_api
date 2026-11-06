import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import { addHistoryEntry, resetHistoryCache } from './store';
import RequestHistoryButton, { matchesFilter } from './index';

const entry = (overrides) => ({
  at: Date.parse('2026-11-06T09:00:00Z'),
  collection: { name: 'Shipping', pathname: '/repo/shipping' },
  request: { name: 'Create shipment', pathname: '/repo/shipping/Create shipment.bru', type: 'http-request' },
  method: 'POST',
  url: 'https://pre.example.test/shipments',
  environment: 'PRE',
  status: 200,
  statusText: 'OK',
  duration: 412,
  size: 2048,
  isError: false,
  error: '',
  excerpt: '{"id":7}',
  ...overrides
});

const renderButton = () => {
  const store = configureStore({ reducer: { collections: () => ({ collections: [] }) } });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <RequestHistoryButton />
      </ThemeProvider>
    </Provider>
  );
};

describe('RequestHistoryButton', () => {
  beforeEach(() => {
    localStorage.clear();
    resetHistoryCache();
    resetForkSettingsCache();
  });

  it('filters by every word typed', () => {
    expect(matchesFilter(entry(), 'pre post')).toBe(true);
    expect(matchesFilter(entry(), 'shipment 500')).toBe(false);
    expect(matchesFilter(entry(), '  ')).toBe(true);
  });

  it('lists the requests sent and shows the details of one', () => {
    addHistoryEntry(entry());
    addHistoryEntry(entry({ environment: 'DEV', status: 500, request: { name: 'Cancel shipment', pathname: '' } }));
    renderButton();

    fireEvent.click(screen.getByLabelText('Open request history'));
    expect(screen.getByText('Create shipment')).toBeInTheDocument();
    expect(screen.getByText('Cancel shipment')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('request-history-filter'), { target: { value: 'dev' } });
    expect(screen.queryByText('Create shipment')).toBeNull();

    fireEvent.change(screen.getByTestId('request-history-filter'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Create shipment'));
    expect(screen.getByText('POST https://pre.example.test/shipments')).toBeInTheDocument();
    expect(screen.getByText('{"id":7}')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear history'));
    expect(screen.getByText('No requests sent yet.')).toBeInTheDocument();
  });

  it('is hidden when the history is turned off', () => {
    renderButton();
    act(() => setForkSetting(FORK_SETTINGS.REQUEST_HISTORY, false));
    expect(screen.queryByLabelText('Open request history')).toBeNull();
  });
});
