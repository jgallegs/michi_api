import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import BarcodeBar from './index';
import { barcodePng } from './png';

jest.mock('./png', () => ({ barcodePng: jest.fn(() => 'UE5H') }));

const response = {
  returnCode: 0,
  shipmentNumber: '3230007581000210350026',
  parcels: [{ code: 'P-0001' }, { code: 'P-0002' }]
};

const request = { uid: 'r1', type: 'http-request', pathname: '/collection/Shipments/Create shipment.bru', request: { vars: { req: [] } }, requestSent: { url: 'https://example.test/shipments' } };
const loose = { uid: 'r2', type: 'http-request', pathname: '/collection/Other.bru', request: { vars: { req: [] } } };

const makeState = (value = 'shipmentNumber, parcels.code') => ({
  tabs: { tabs: [{ uid: 'r1', collectionUid: 'c1' }, { uid: 'r2', collectionUid: 'c1' }] },
  collections: {
    collections: [
      {
        uid: 'c1',
        root: { request: { vars: { req: [] } } },
        items: [
          {
            uid: 'f1',
            type: 'folder',
            root: { request: { vars: { req: value === null ? [] : [{ name: 'michi.barcodes', value, enabled: true }] } } },
            items: [request]
          },
          loose
        ]
      }
    ]
  }
});

const renderBar = (data, { item = request, state = makeState() } = {}) => {
  const store = { getState: () => state, subscribe: () => () => {}, dispatch: () => {} };
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <BarcodeBar data={data} item={item} />
      </ThemeProvider>
    </Provider>
  );
};

describe('BarcodeBar', () => {
  let written;

  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    barcodePng.mockClear();
    written = [];
    window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve({ success: true })) };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn((text) => (written.push(text), Promise.resolve())) }
    });
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('stays hidden when no folder asks for barcodes', () => {
    renderBar(response, { state: makeState(null) });
    expect(screen.queryByTestId('barcode-bar')).toBeNull();
  });

  it('stays hidden for a request outside the folder that asks, and when the response lacks the fields', () => {
    renderBar(response, { item: loose });
    expect(screen.queryByTestId('barcode-bar')).toBeNull();
    renderBar({ returnCode: 7, message: 'not created' });
    expect(screen.queryByTestId('barcode-bar')).toBeNull();
  });

  it('stays hidden when the feature is switched off', () => {
    setForkSetting(FORK_SETTINGS.BARCODES, false);
    renderBar(response);
    expect(screen.queryByTestId('barcode-bar')).toBeNull();
  });

  it('counts the barcodes of the fields the folder asks for and draws them on request', () => {
    renderBar(response);
    expect(screen.getByTestId('barcode-bar').textContent).toContain('3 barcodes in this response (shipmentNumber, code)');
    expect(screen.queryByTestId('barcode-card')).toBeNull();

    fireEvent.click(screen.getByTestId('barcode-open'));

    const cards = screen.getAllByTestId('barcode-card');
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('shipmentNumber');
    expect(cards[1].textContent).toContain('1 of 2');
    expect(cards[2].textContent).toContain('parcels[1].code');
    const images = screen.getAllByTestId('barcode-image');
    expect(images).toHaveLength(3);
    expect(images[0].getAttribute('data-modules')).toMatch(/^11010011100[01]+1100011101011$/);
    expect(images[1].textContent).toBe('P-0001');
  });

  it('says so with a single barcode and offers no views', () => {
    renderBar(response, { state: makeState('shipmentNumber') });
    expect(screen.getByTestId('barcode-bar').textContent).toContain('1 barcode in this response (shipmentNumber)');
    fireEvent.click(screen.getByTestId('barcode-open'));
    expect(screen.queryByTestId('barcode-view-one')).toBeNull();
    expect(screen.queryByTestId('barcode-copy-all')).toBeNull();
  });

  it('shows them one at a time, with the buttons and the arrow keys', () => {
    renderBar(response);
    fireEvent.click(screen.getByTestId('barcode-open'));
    fireEvent.click(screen.getByTestId('barcode-view-one'));

    expect(screen.getAllByTestId('barcode-card')).toHaveLength(1);
    expect(screen.getByTestId('barcode-count').textContent).toBe('1 of 3');
    expect(screen.getByTestId('barcode-previous').disabled).toBe(true);

    fireEvent.click(screen.getByTestId('barcode-next'));
    expect(screen.getByTestId('barcode-count').textContent).toBe('2 of 3');
    expect(screen.getByTestId('barcode-card').textContent).toContain('P-0001');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('barcode-count').textContent).toBe('3 of 3');
    expect(screen.getByTestId('barcode-next').disabled).toBe(true);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('barcode-card').textContent).toContain('P-0001');

    fireEvent.click(screen.getByTestId('barcode-view-all'));
    expect(screen.getAllByTestId('barcode-card')).toHaveLength(3);
  });

  it('copies one number or all of them', async () => {
    renderBar(response);
    fireEvent.click(screen.getByTestId('barcode-open'));

    fireEvent.click(screen.getAllByText('Copy number')[1]);
    fireEvent.click(screen.getByTestId('barcode-copy-all'));

    await waitFor(() => expect(written).toEqual(['P-0001', '3230007581000210350026\nP-0001\nP-0002']));
  });

  it('saves a barcode as a PNG through the dialog of the app', async () => {
    renderBar(response);
    fireEvent.click(screen.getByTestId('barcode-open'));
    fireEvent.click(screen.getAllByText('Save')[1]);

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(1));
    const [channel, saved, url, pathname] = window.ipcRenderer.invoke.mock.calls[0];
    expect(channel).toBe('renderer:save-response-to-file');
    expect(barcodePng).toHaveBeenCalledWith('P-0001');
    expect(saved.headers['content-type']).toBe('image/png');
    expect(saved.headers['content-disposition']).toContain('barcode-P-0001.png');
    expect(saved.dataBuffer).toBe('UE5H');
    expect(url).toBe('https://example.test/shipments');
    expect(pathname).toBe(request.pathname);
  });

  it('does not save what could not be drawn', async () => {
    barcodePng.mockReturnValueOnce(null);
    renderBar(response);
    fireEvent.click(screen.getByTestId('barcode-open'));
    fireEvent.click(screen.getAllByText('Save')[0]);
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('tells which values cannot be drawn instead of leaving a gap', () => {
    renderBar({ shipmentNumber: 'envío ñ' }, { state: makeState('shipmentNumber') });
    fireEvent.click(screen.getByTestId('barcode-open'));
    expect(screen.getByTestId('barcode-undrawable')).toBeTruthy();
    expect(screen.queryByTestId('barcode-image')).toBeNull();
  });
});
