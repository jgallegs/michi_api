import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconQrcode } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import StyledWrapper from './StyledWrapper';

// QR codes drawn on this machine, for payloads that a test needs to scan (for example a pickup
// point's QR). The text can be typed or taken from a variable of the active collection: runtime
// variables (the ones scripts set with bru.setVar) and the non-secret variables of the environment.

const valueToText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
};

export const collectVariables = (collection) => {
  if (!collection) {
    return [];
  }
  const runtime = Object.entries(collection.runtimeVariables || {}).map(([name, value]) => ({
    id: `runtime:${name}`,
    label: `${name} (runtime)`,
    value: valueToText(value)
  }));
  const environment = (collection.environments || []).find((env) => env.uid === collection.activeEnvironmentUid);
  const fromEnvironment = (environment?.variables || [])
    .filter((variable) => variable.enabled !== false && !variable.secret && variable.name)
    .map((variable) => ({
      id: `env:${variable.name}`,
      label: `${variable.name} (${environment.name})`,
      value: valueToText(variable.value)
    }));
  return [...runtime, ...fromEnvironment];
};

const QrCodeModal = ({ onClose }) => {
  const collection = useSelector((state) => {
    const tab = state.tabs.tabs.find((t) => t.uid === state.tabs.activeTabUid);
    return tab ? state.collections.collections.find((c) => c.uid === tab.collectionUid) : null;
  });
  const variables = useMemo(() => collectVariables(collection), [collection]);
  const [text, setText] = useState('');
  const [image, setImage] = useState({ png: null, error: null });

  useEffect(() => {
    if (!text) {
      setImage({ png: null, error: null });
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      import('components/fork/LabelPreview/zpl')
        .then(({ renderQr }) => renderQr(text))
        .then((png) => !cancelled && setImage({ png, error: null }))
        .catch((err) => !cancelled && setImage({ png: null, error: err?.message || 'Could not draw the QR code' }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  const pickVariable = (id) => {
    const variable = variables.find((v) => v.id === id);
    if (variable) {
      setText(variable.value);
    }
  };

  const save = () => {
    const response = {
      headers: { 'content-type': 'image/png', 'content-disposition': 'attachment; filename="qr.png"' },
      dataBuffer: image.png
    };
    window.ipcRenderer
      .invoke('renderer:save-response-to-file', response, '', collection?.pathname ? `${collection.pathname}/qr.png` : '')
      .then((result) => result?.success && toast.success('QR code saved'))
      .catch(() => toast.error('Could not save the QR code'));
  };

  return (
    <Modal size="md" title="QR code" hideFooter={true} handleCancel={onClose} closeModalFadeTimeout={0}>
      <StyledWrapper>
        {variables.length ? (
          <select className="source" defaultValue="" onChange={(e) => pickVariable(e.target.value)} data-testid="qr-variable">
            <option value="" disabled>
              Take the text from a variable…
            </option>
            {variables.map((variable) => (
              <option key={variable.id} value={variable.id}>
                {variable.label}
              </option>
            ))}
          </select>
        ) : null}
        <textarea
          className="text"
          rows={4}
          placeholder="Text to encode"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          data-testid="qr-text"
        />
        <div className="muted hint">Drawn on this machine; nothing is sent anywhere.</div>
        <div className="result">
          {image.error ? <div className="error-text">{image.error}</div> : null}
          {image.png ? <img alt="QR code" src={`data:image/png;base64,${image.png}`} data-testid="qr-image" /> : null}
        </div>
        <div className="actions">
          <Button size="sm" variant="ghost" onClick={save} disabled={!image.png}>
            Save PNG
          </Button>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

// Status bar button. Hidden when the QR tool is turned off.
const QrCodeButton = () => {
  const enabled = useForkSetting(FORK_SETTINGS.QR_TOOL);
  const [open, setOpen] = useState(false);
  if (!enabled) {
    return null;
  }
  return (
    <>
      <button
        className="status-bar-button"
        data-trigger="qr-code"
        onClick={() => setOpen(true)}
        tabIndex={0}
        aria-label="Open the QR code tool"
      >
        <div className="console-button-content">
          <IconQrcode size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="console-label">QR</span>
        </div>
      </button>
      {open ? <QrCodeModal onClose={() => setOpen(false)} /> : null}
    </>
  );
};

export default QrCodeButton;
