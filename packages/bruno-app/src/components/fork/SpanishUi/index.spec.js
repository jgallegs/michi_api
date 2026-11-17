import { installSpanishUi, startSpanishUi, stopSpanishUi, translatePhrase } from './index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Spanish interface', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    document.body.innerHTML = '';
  });

  afterEach(() => stopSpanishUi());

  it('translates known texts and keeps the surrounding spaces', () => {
    expect(translatePhrase('Headers')).toBe('Cabeceras');
    expect(translatePhrase('  Save ')).toBe('  Guardar ');
    expect(translatePhrase('2 labels in this response (PDF, ZPL)')).toBe('2 etiquetas en esta respuesta (PDF, ZPL)');
    expect(translatePhrase('List · orders')).toBe('Lista · orders');
    expect(translatePhrase('Unknown text')).toBeNull();
    expect(translatePhrase('Cabeceras')).toBeNull();
    expect(translatePhrase('constructor')).toBeNull();
  });

  it('translates the page and puts the English back when stopped', () => {
    document.body.innerHTML = `
      <div class="tabs"><div>Headers</div> <div title="Preferences">Body</div></div>
      <span class="item-name">Settings</span>
      <div class="CodeMirror"><span>Headers</span></div>
      <input placeholder="Search" />
      <textarea>Save</textarea>
      <button aria-label="Close">Save</button>`;

    startSpanishUi();
    const text = document.body.textContent.replace(/\s+/g, ' ').trim();
    expect(text).toBe('Cabeceras Cuerpo Settings Headers Save Guardar');
    expect(document.querySelector('[title]').getAttribute('title')).toBe('Preferencias');
    expect(document.querySelector('button').getAttribute('aria-label')).toBe('Cerrar');
    expect(document.querySelector('input').getAttribute('placeholder')).toBe('Buscar');

    expect(document.querySelector('textarea').value).toBe('Save');

    stopSpanishUi();
    expect(document.querySelector('input').getAttribute('placeholder')).toBe('Search');
    expect(document.body.textContent.replace(/\s+/g, ' ').trim()).toBe('Headers Body Settings Headers Save Save');
    expect(document.querySelector('[title]').getAttribute('title')).toBe('Preferences');
  });

  it('translates what the app renders later', async () => {
    startSpanishUi();
    const added = document.createElement('div');
    added.innerHTML = '<span>Timeline</span>';
    document.body.appendChild(added);
    await flush();
    expect(added.textContent).toBe('Cronología');

    added.firstChild.firstChild.nodeValue = 'Response';
    await flush();
    expect(added.textContent).toBe('Respuesta');
  });

  it('follows the switch in the preferences, off by default', () => {
    document.body.innerHTML = '<div>Docs</div>';
    const cleanup = installSpanishUi();
    expect(document.body.textContent).toBe('Docs');

    setForkSetting(FORK_SETTINGS.SPANISH_UI, true);
    expect(document.body.textContent).toBe('Documentación');

    setForkSetting(FORK_SETTINGS.SPANISH_UI, false);
    expect(document.body.textContent).toBe('Docs');
    cleanup();
  });
});
