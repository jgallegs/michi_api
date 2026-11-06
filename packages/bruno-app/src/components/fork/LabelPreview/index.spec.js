import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import LabelPreviewBar from './index';

jest.mock('./zpl', () => ({
  renderZpl: jest.fn(async () => ['QUJD'])
}));

jest.mock('react-pdf', () => ({
  Document: ({ children }) => <div data-testid="pdf-document">{children}</div>,
  Page: () => null
}));

const zpl = '^XA\n^FO50,50^ADN,36,20^FDSample shipping label^FS\n^XZ';
const pdf = btoa('%PDF-1.4\n' + 'x'.repeat(120));
const item = { uid: 'r1', pathname: '/collection/Create shipment.bru', requestSent: { url: 'https://example.test/shipments' } };

const renderBar = (data) =>
  render(
    <ThemeProvider theme={themes.light}>
      <LabelPreviewBar data={data} item={item} />
    </ThemeProvider>
  );

describe('LabelPreviewBar', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve({ success: true })) };
  });

  it('stays hidden when the response has no labels', () => {
    renderBar({ codigoRetorno: 0, datosResultado: '3230007581000210350026' });
    expect(screen.queryByTestId('label-preview-bar')).toBeNull();
  });

  it('counts the labels, draws the ZPL and shows the rest on request', async () => {
    renderBar({ labels: [{ front: pdf }, { back: zpl }] });
    expect(screen.getByText('2 labels in this response (PDF, ZPL)')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('label-preview-open'));
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByText(/Sample shipping label/)).toBeInTheDocument();
    expect(await screen.findByTestId('zpl-image')).toHaveAttribute('src', 'data:image/png;base64,QUJD');
    expect(screen.getByText('labels[1].back')).toBeInTheDocument();
  });

  it('saves a label through the response download dialog', () => {
    renderBar({ labels: zpl });
    fireEvent.click(screen.getByTestId('label-preview-open'));
    fireEvent.click(screen.getByText('Save'));

    const [channel, response, url, pathname] = window.ipcRenderer.invoke.mock.calls[0];
    expect(channel).toBe('renderer:save-response-to-file');
    expect(response.headers['content-disposition']).toBe('attachment; filename="label-1.zpl"');
    expect(atob(response.dataBuffer)).toBe(zpl);
    expect(url).toBe('https://example.test/shipments');
    expect(pathname).toBe(item.pathname);
  });

  it('does nothing when the switch is off', () => {
    renderBar({ labels: zpl });
    act(() => setForkSetting(FORK_SETTINGS.LABEL_PREVIEW, false));
    expect(screen.queryByTestId('label-preview-bar')).toBeNull();
  });
});
