import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import QrCodeButton, { collectVariables } from './index';

jest.mock('components/fork/LabelPreview/zpl', () => ({
  renderQr: jest.fn(async (text) => btoa(`png:${text}`))
}));

const collection = {
  uid: 'c1',
  pathname: '/repo/points',
  activeEnvironmentUid: 'e1',
  runtimeVariables: { qrPayload: '{"DP_ID":43}', count: 2 },
  environments: [
    {
      uid: 'e1',
      name: 'PRE',
      variables: [
        { name: 'host', value: 'https://pre.example.test', enabled: true },
        { name: 'password', value: 'hidden', enabled: true, secret: true },
        { name: 'old', value: 'x', enabled: false }
      ]
    }
  ]
};

const renderButton = () => {
  const store = configureStore({
    reducer: {
      tabs: () => ({ tabs: [{ uid: 't1', collectionUid: 'c1' }], activeTabUid: 't1' }),
      collections: () => ({ collections: [collection] })
    }
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <QrCodeButton />
      </ThemeProvider>
    </Provider>
  );
};

describe('QR code tool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    resetForkSettingsCache();
  });

  afterEach(() => jest.useRealTimers());

  it('offers runtime variables and non-secret environment variables', () => {
    expect(collectVariables(collection).map((v) => [v.label, v.value])).toEqual([
      ['qrPayload (runtime)', '{"DP_ID":43}'],
      ['count (runtime)', '2'],
      ['host (PRE)', 'https://pre.example.test']
    ]);
    expect(collectVariables(null)).toEqual([]);
  });

  it('draws the QR of a variable', async () => {
    renderButton();
    fireEvent.click(screen.getByLabelText('Open the QR code tool'));
    fireEvent.change(screen.getByTestId('qr-variable'), { target: { value: 'runtime:qrPayload' } });
    expect(screen.getByTestId('qr-text').value).toBe('{"DP_ID":43}');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('qr-image').getAttribute('src')).toBe(`data:image/png;base64,${btoa('png:{"DP_ID":43}')}`);
  });

  it('is hidden when the tool is turned off', () => {
    renderButton();
    act(() => setForkSetting(FORK_SETTINGS.QR_TOOL, false));
    expect(screen.queryByLabelText('Open the QR code tool')).toBeNull();
  });
});
