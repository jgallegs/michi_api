import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { resetForkSettingsCache } from 'components/fork/settings/store';
import ReportModal from 'components/fork/Flows/report/ReportModal';
import { getVisualizations, resetVisualizations, setVisualizations } from 'components/fork/Visualizations/store';
import BarcodeBar from './index';
import { addToSession, getSession, resetSessions } from './session';

jest.mock('./png', () => ({ barcodePng: jest.fn(() => 'UE5H') }));

const request = { uid: 'r1', type: 'http-request', name: 'Create shipment', pathname: '/collection/Shipments/Create shipment.bru', request: { vars: { req: [] } } };
const variables = (extra = []) => [{ name: 'michi.barcodes', value: 'shipmentNumber', enabled: true }, ...extra];
const makeState = (vars = variables(), runtimeVariables = {}) => ({
  tabs: { tabs: [{ uid: 'r1', collectionUid: 'c1' }] },
  collections: {
    collections: [
      { uid: 'c1', name: 'Shop', runtimeVariables, root: { request: { vars: { req: [] } } }, items: [{ uid: 'f1', type: 'folder', root: { request: { vars: { req: vars } } }, items: [request] }] }
    ]
  }
});

const code = (value) => ({ id: value, field: 'shipmentNumber', path: 'shipmentNumber', source: 'shipmentNumber', value, position: 1, of: 1 });

const renderBar = (data, state = makeState()) => {
  const dispatch = jest.fn();
  const store = { getState: () => state, subscribe: () => () => {}, dispatch };
  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <BarcodeBar data={data} item={request} />
      </ThemeProvider>
    </Provider>
  );
  return dispatch;
};

describe('barcode session in the response bar', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    resetSessions();
    resetVisualizations();
    window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve({ success: true })) };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('says nothing about the session while it is empty', () => {
    renderBar({ shipmentNumber: '1234' });
    expect(screen.getByTestId('barcode-bar').textContent).toContain('1 barcode in this response');
    expect(screen.queryByTestId('barcode-session')).toBeNull();
  });

  it('counts the session, draws it all under each request and saves it as one page', async () => {
    addToSession('c1', 'Create shipment · 10:00', [code('1234'), code('5678')]);
    addToSession('c1', 'Create shipment · 10:01', [code('9012')]);
    renderBar({ shipmentNumber: '9012' });
    expect(screen.getByTestId('barcode-session').textContent).toContain('In this session: 3');

    fireEvent.click(screen.getByTestId('barcode-session-open'));
    expect(screen.getAllByTestId('barcode-card')).toHaveLength(3);
    expect(screen.getAllByTestId('barcode-caption').map((caption) => caption.textContent)).toEqual(['Create shipment · 10:00', 'Create shipment · 10:01']);

    fireEvent.click(screen.getByTestId('barcode-save-page'));
    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(1));
    const saved = window.ipcRenderer.invoke.mock.calls[0][1];
    expect(saved.headers['content-type']).toBe('text/html');
    expect(saved.headers['content-disposition']).toContain('Barcodes_of_the_session.html');
    expect(atob(saved.dataBuffer)).toContain('5678');
  });

  it('still offers the session when this response has no barcodes', () => {
    addToSession('c1', 'Create shipment · 10:00', [code('1234')]);
    renderBar({ returnCode: 7 });
    expect(screen.getByTestId('barcode-bar').textContent).toContain('No barcodes in this response');
    expect(screen.queryByTestId('barcode-open')).toBeNull();
    expect(screen.getByTestId('barcode-session-open')).toBeTruthy();
  });

  it('clears the session, the session variables the folder names and the panels drawn from them', () => {
    addToSession('c1', 'Create shipment · 10:00', [code('1234')]);
    setVisualizations({ itemUid: 'r1', requestUid: 'q1', visualizations: [{ name: 'Session', content: '<p>1234</p>' }] });
    setVisualizations({ itemUid: 'elsewhere', requestUid: 'q2', visualizations: [{ name: 'Other', content: '<p></p>' }] });
    const state = makeState(variables([{ name: 'michi.barcodes.clear', value: 'history, missing', enabled: true }]), { history: '[1]', token: 'keep' });
    const dispatch = renderBar({ shipmentNumber: '1234' }, state);

    act(() => {
      fireEvent.click(screen.getByTestId('barcode-session-clear'));
    });

    expect(getSession('c1')).toEqual([]);
    expect(screen.queryByTestId('barcode-session')).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].payload).toEqual({ collectionUid: 'c1', runtimeVariables: { token: 'keep' } });
    expect(getVisualizations('r1')).toBeNull();
    expect(getVisualizations('elsewhere')).not.toBeNull();
  });

  it('leaves the variables and the panels of the app alone when the folder names none', () => {
    addToSession('c1', 'Create shipment · 10:00', [code('1234')]);
    setVisualizations({ itemUid: 'r1', requestUid: 'q1', visualizations: [{ name: 'Session', content: '<p>1234</p>' }] });
    const dispatch = renderBar({ shipmentNumber: '1234' }, makeState(variables(), { history: '[1]' }));
    act(() => {
      fireEvent.click(screen.getByTestId('barcode-session-clear'));
    });
    expect(getSession('c1')).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();
    expect(getVisualizations('r1')).not.toBeNull();
  });
});

describe('barcodes in the report of a list', () => {
  const items = [
    { case: 'Paq 10', shipment: '3230007581000210350026' },
    { case: 'Paq 14', shipment: '3230007581000210350027' }
  ];
  const renderReport = (list) =>
    render(
      <ThemeProvider theme={themes.light}>
        <ReportModal title="List · Created" flowName="Battery" items={list} onClose={() => {}} />
      </ThemeProvider>
    );

  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
  });

  it('offers them when a column holds codes, drawn with the case of each', () => {
    renderReport(items);
    fireEvent.click(screen.getByTestId('flow-report-barcodes'));

    expect(screen.getAllByTestId('barcode-card')).toHaveLength(2);
    expect(screen.getAllByTestId('barcode-caption').map((caption) => caption.textContent)).toEqual(['#1 · Paq 10', '#2 · Paq 14']);
    expect(screen.getByTestId('barcode-column-shipment').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('barcode-column-case').getAttribute('aria-pressed')).toBe('false');
  });

  it('lets the columns be chosen', () => {
    renderReport(items);
    fireEvent.click(screen.getByTestId('flow-report-barcodes'));
    fireEvent.click(screen.getByTestId('barcode-column-shipment'));
    expect(screen.getByTestId('barcode-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('barcode-column-case'));
    expect(screen.getAllByTestId('barcode-card')).toHaveLength(2);
    expect(screen.getAllByTestId('barcode-caption')[0].textContent).toBe('#1 · 3230007581000210350026');
  });

  it('does not offer them for a list without codes', () => {
    renderReport([{ step: 'Create', result: 'It went fine' }]);
    expect(screen.getByTestId('flow-report-table')).toBeTruthy();
    expect(screen.queryByTestId('flow-report-barcodes')).toBeNull();
  });
});
