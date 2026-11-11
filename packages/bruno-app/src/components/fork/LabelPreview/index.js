import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload, IconTag } from '@tabler/icons';
import { Document, Page } from 'react-pdf';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import BarcodeBar from 'components/fork/Barcodes';
import { findLabels, LABEL_KINDS } from './detect';
import StyledWrapper from './StyledWrapper';

const textToBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

// Saves through the same dialog as "Download response", so the file goes where the user picks.
const saveLabel = (item, label, index) => {
  const kind = LABEL_KINDS[label.kind];
  const response = {
    headers: {
      'content-type': kind.mime,
      'content-disposition': `attachment; filename="label-${index + 1}.${kind.extension}"`
    },
    dataBuffer: label.base64 || textToBase64(label.text)
  };
  return window.ipcRenderer
    .invoke('renderer:save-response-to-file', response, get(item, 'requestSent.url', ''), item.pathname)
    .then((result) => {
      if (result && result.success) {
        toast.success('Label saved');
      }
    })
    .catch((err) => toast.error(get(err, 'error.message') || 'Could not save the label'));
};

const PdfLabel = ({ base64 }) => {
  const [pages, setPages] = useState(0);
  return (
    <Document
      file={`data:application/pdf;base64,${base64}`}
      onLoadSuccess={({ numPages }) => setPages(numPages)}
      error={<div className="muted">The PDF could not be opened.</div>}
    >
      {Array.from({ length: pages }, (_, index) => (
        <Page key={index} pageNumber={index + 1} width={560} renderAnnotationLayer={false} renderTextLayer={false} />
      ))}
    </Document>
  );
};

// Draws the ZPL offline; the code stays one click away.
const ZplLabel = ({ text }) => {
  const [state, setState] = useState({ images: null, error: null });

  useEffect(() => {
    let cancelled = false;
    import('./zpl')
      .then(({ renderZpl }) => renderZpl(text))
      .then((images) => !cancelled && setState({ images, error: null }))
      .catch((err) => !cancelled && setState({ images: [], error: err?.message || 'Could not draw the label' }));
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <>
      {state.images === null ? <div className="muted note">Drawing the label…</div> : null}
      {state.error ? <div className="muted note">{`The label could not be drawn: ${state.error}`}</div> : null}
      {(state.images || []).map((png, index) => (
        <img key={index} className="zpl-image" alt="ZPL label" src={`data:image/png;base64,${png}`} data-testid="zpl-image" />
      ))}
      <details className="zpl-code">
        <summary>ZPL code</summary>
        <pre className="zpl">{text}</pre>
      </details>
    </>
  );
};

const LabelBody = ({ label }) => {
  if (label.kind === 'pdf') {
    return <PdfLabel base64={label.base64} />;
  }
  if (label.kind === 'zpl') {
    return <ZplLabel text={label.text} />;
  }
  return <img alt="Label" src={`data:${LABEL_KINDS[label.kind].mime};base64,${label.base64}`} />;
};

export const LabelPreviewBar = ({ data, item }) => {
  const enabled = useForkSetting(FORK_SETTINGS.LABEL_PREVIEW);
  const labels = useMemo(() => (enabled ? findLabels(data) : []), [enabled, data]);
  const [open, setOpen] = useState(false);

  if (!labels.length) {
    return null;
  }

  const kinds = [...new Set(labels.map((label) => LABEL_KINDS[label.kind].label))].join(', ');

  return (
    <StyledWrapper>
      <div className="bar" data-testid="label-preview-bar">
        <IconTag size={14} strokeWidth={1.5} />
        <span>{`${labels.length === 1 ? '1 label' : `${labels.length} labels`} in this response (${kinds})`}</span>
        <button type="button" className="link" onClick={() => setOpen(true)} data-testid="label-preview-open">
          Show
        </button>
      </div>

      {open ? (
        <Modal size="lg" title="Labels in the response" hideFooter={true} handleCancel={() => setOpen(false)} closeModalFadeTimeout={0}>
          <StyledWrapper>
            {labels.map((label, index) => (
              <section key={`${label.path}-${index}`} className="label">
                <div className="label-header">
                  <span className="kind">{LABEL_KINDS[label.kind].label}</span>
                  <span className="path">{label.path}</span>
                  <Button size="sm" variant="ghost" onClick={() => saveLabel(item, label, index)}>
                    <IconDownload size={14} strokeWidth={1.5} className="mr-1" />
                    Save
                  </Button>
                </div>
                <div className="label-body">
                  <LabelBody label={label} />
                </div>
              </section>
            ))}
          </StyledWrapper>
        </Modal>
      ) : null}
    </StyledWrapper>
  );
};

// The response has one place for the fork above its body (H-24): every bar that reads the body goes in it.
const ResponseBars = ({ data, item }) => (
  <>
    <LabelPreviewBar data={data} item={item} />
    <BarcodeBar data={data} item={item} />
  </>
);

export default ResponseBars;
