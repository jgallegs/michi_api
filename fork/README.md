# Fork

Notas para quien mantiene **Michi**, el fork de [Bruno](https://github.com/usebruno/bruno) (MIT) con funciones añadidas a la aplicación de escritorio. La presentación para usuarios está en [.github/README.md](../.github/README.md), que es lo que enseña GitHub. La documentación completa del fork (reglas, flujo de trabajo, actualización, publicación y funciones) está en [fork/docs/README.md](docs/README.md).
Las colecciones no cambian: todo lo que se abre o se guarda con el fork sigue siendo compatible con el Bruno oficial.

## Cómo está organizado

- El código propio vive en carpetas `fork/`: esta carpeta, `packages/bruno-app/src/components/fork/`, etc.
- En ficheros de Bruno solo hay **enganches** de pocas líneas, marcados con `[FORK H-xx]` y registrados en [HOOKS.md](HOOKS.md).
- `UPSTREAM_VERSION` indica el tag de Bruno sobre el que está la rama.

## Antes de abrir una PR

```bash
node fork/scripts/check-diff.mjs
```

Comprueba que fuera de `fork/` solo cambian enganches registrados, y que no hay palabras prohibidas ni secretos en las líneas añadidas.

## Compilar para Windows

```bash
node fork/scripts/build-win.mjs
```

Genera en `packages/bruno-electron/out/` el instalador (`Michi-Setup-<versión>.exe`) y el ejecutable portable (`Michi-<versión>-portable.exe`). La identidad de la app (nombre, `appId`, icono, versión `<upstream>-fork.<n>`) está en `fork/packaging/` y extiende la configuración de Bruno sin modificarla. La app se instala y guarda sus datos (`%APPDATA%\Michi`) aparte de una instalación del Bruno oficial. El número de versión del fork está en `fork/packaging/RELEASE`.

También genera `out/fast-portable/`: un lanzador (`Michi.vbs` y la carpeta `Michi/` con `launcher.ps1` y el `.zip` de la app) para usar la app sin instalarla. Descomprime solo la primera vez de cada versión, en `%LOCALAPPDATA%\Michi-portable\<versión>`, y comparte los datos con la versión instalada (`%APPDATA%\Michi`).

Si electron-builder falla al extraer `winCodeSign` con un error de enlaces simbólicos ("no dispone de un privilegio requerido"), extrae el paquete a mano, sin la carpeta `darwin`, en `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`.

## Funciones

| Función | Desde | Descripción |
|---|---|---|
| Entornos sensibles | v4.3.0-fork.1 | Interruptor *Sensitive* en el detalle de cada entorno de colección. Con él activo, el selector de entorno muestra un aviso y cada envío o ejecución del runner pide confirmación. La marca se guarda en `.michi.json` en la raíz de la colección (compartida con git; el Bruno oficial ignora el fichero en formato `.bru` y YAML). Si no se puede escribir, se guarda solo en el equipo. Si el fichero está dañado (conflicto de git), todos los entornos cuentan como sensibles y no se escribe en él (fork.13) |
| Logo propio | v4.3.0-fork.2 | El logo de la app sale de `fork/packaging/icons/app-logo.svg`. `python fork/packaging/make-icon.py` genera el icono del ejecutable, el icono de la ventana (H-07) y el componente `components/fork/AppLogo`, que sustituye al logo de Bruno en la interfaz (H-06). Con `USE_APP_LOGO = false` vuelve el logo original |
| Nombre propio | v4.3.0-fork.3 | La app se presenta como **Michi**. Nombre en `src/components/fork/branding.js` (renderer), `src/fork/branding.js` (Electron) y `plugins/fork/branding-phrases.js` (frases sustituidas al compilar). `branding-phrases.spec.js` falla si Bruno cambia una de las frases, para actualizar la lista |
| Panel Git | v4.3.0-fork.7 | Sección *Git* de la barra lateral (`components/fork/SourceControl`) sobre `src/fork/git/git-service.js` (Electron). Nunca borra trabajo: descartar y sincronizar guardan los cambios en stashes `michi:` ("Saved changes"), y salir de un detached HEAD crea una rama de rescate si hay commits sueltos. Tests con repos reales en `git-service.spec.js` |
| Vista Git | v4.3.0-fork.8 | Pestaña `fork-git` (`components/fork/SourceControl/GitTab.js`): panel a la izquierda y diff a dos columnas a la derecha (`diffRows.js`, `SideBySideDiff.js`), también para comparar las dos versiones de un conflicto (`conflictDiff` en el servicio) |
| Preferencias de Michi | v4.3.0-fork.9 | Pestaña *Michi* en *Preferences* (`components/fork/settings`): un interruptor por función, guardado en `localStorage` (`michi.settings`). Cada función nueva añade su entrada en `registry.js` (R-14) |
| Barrera solo en escrituras | v4.3.0-fork.9 | La confirmación de entornos sensibles enseña la URL resuelta y, con el interruptor activo, solo pregunta en escrituras (`SensitiveEnvironment/guard.js`) |
| Hora local | v4.3.0-fork.9 | Complemento global de CodeMirror (`components/fork/LocalTime`, `defineInitHook`): marca con un widget la hora local junto a cada fecha ISO con zona en los editores de solo lectura. No cambia el texto |
| Etiquetas | v4.3.0-fork.9 | Barra sobre el cuerpo de la respuesta (`components/fork/LabelPreview`, H-24) que detecta PDF, PNG, JPEG y ZPL en cualquier campo. Desde la fork.10 el ZPL se dibuja con `@zebrash/browser` (DEC-22); el plugin `plugins/fork/zebrash-fonts.mjs` sustituye su cargador de fuentes por las del paquete y falla si el bundle conserva la URL del CDN |
| Historial | v4.3.0-fork.9 | Middleware de Redux (H-25) que apunta cada `responseReceived` en `localStorage` (`michi.history`, 300 entradas, sin cabeceras y con credenciales enmascaradas). Botón *History* en la barra de estado (H-26) |
| Interfaz en español | v4.3.0-fork.9 | `components/fork/SpanishUi`: diccionario aplicado en pantalla con un `MutationObserver`. Apagada por defecto. Las frases están en `phrases.js` |
| Sin telemetría | v4.3.0-fork.9 | El plugin de build deja vacía la clave de analítica de Bruno |
| QR | v4.3.0-fork.10 | Botón *QR* en la barra de estado (`components/fork/QrCode`): QR de un texto o de una variable de la colección, dibujado con el comando `^BQ` de ZPL |
| Paneles de scripts | v4.3.0-fork.11 | `bru.visualize` (`bruno-js/src/fork/visualize.js`, H-31 a H-33) llega a la ventana por `main:fork-visualizations` (H-34) y se pinta como pestañas junto al formato de la respuesta (`components/fork/Visualizations`, H-35 y H-36) |
