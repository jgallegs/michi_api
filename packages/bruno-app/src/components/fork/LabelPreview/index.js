import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconDownload, IconTag } from '@tabler/icons';
import { Document, Page } from 'react-pdf';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
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

const LabelBody = ({ label }) => {
  if (label.kind === 'pdf') {
    return <PdfLabel base64={label.base64} />;
  }
  if (label.kind === 'zpl') {
    return (
      <>
        <div className="muted note">
          ZPL is the Zebra printer language. It is shown as text: drawing it needs a renderer that is not bundled. Save it
          as .zpl to send it to a printer.
        </div>
        <pre className="zpl">{label.text}</pre>
      </>
    );
  }
  return <img alt="Label" src={`data:${LABEL_KINDS[label.kind].mime};base64,${label.base64}`} />;
};

const LabelPreviewBar = ({ data, item }) => {
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

export default LabelPreviewBar;
