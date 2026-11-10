# Registro de enganches

Cada fichero de Bruno modificado tiene que aparecer aquí. Un ID no se reutiliza: los enganches que se quitan se marcan como `RETIRADO`.

| ID | Tipo | Fichero de Bruno | Zona | Qué hace | MR | Desde |
|---|---|---|---|---|---|---|
| H-01 | código | `packages/bruno-app/src/components/Environments/EnvironmentSettings/EnvironmentList/EnvironmentDetails/index.js` | cabecera, bloque `actions` | Muestra el interruptor *Sensitive* del entorno | — | v4.3.0-fork.1 |
| H-02 | código | `packages/bruno-app/src/components/Environments/EnvironmentSelector/index.js` | dentro de `.environment-selector` | Muestra el aviso *Sensitive* junto al selector cuando el entorno activo está marcado | — | v4.3.0-fork.1 |
| H-03 | código | `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js` | `sendRequest`, antes de preparar la petición | Pide confirmación antes de enviar (HTTP, GraphQL, gRPC y WebSocket) | — | v4.3.0-fork.1 |
| H-04 | código | `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/RunCollectionItem/index.js` | `onSubmit` | Pide confirmación antes de lanzar el runner | — | v4.3.0-fork.1 |
| H-05 | código | `packages/bruno-app/src/pages/Main.js` | dentro de los providers, junto a `children` | Monta `components/fork/ForkRoot` (ventana de confirmación con el tema de la app y complementos del editor, como la hora local); desde v4.3.0-fork.9 | — | v4.3.0-fork.1 |
| H-06 | código | `packages/bruno-app/src/components/Bruno/index.js` | inicio del componente | Muestra el logo propio (`components/fork/AppLogo`) en barra de título, bienvenida y pantalla de error | — | v4.3.0-fork.2 |
| H-07 | build | `packages/bruno-electron/src/about/256x256.png` | fichero completo (binario) | Icono de la ventana y del "Acerca de". Se regenera con `fork/packaging/make-icon.py`; al actualizar Bruno, conservar el nuestro | — | v4.3.0-fork.2 |
| H-08 | código | `packages/bruno-app/src/components/AppTitleBar/index.js` | barra de título, texto central | Nombre de la app (`APP_NAME`) | — | v4.3.0-fork.3 |
| H-09 | código | `packages/bruno-app/src/components/AppTitleBar/AppMenu/index.js` | menú Help | Etiqueta "About Michi" | — | v4.3.0-fork.3 |
| H-10 | código | `packages/bruno-app/src/components/WelcomeModal/index.js` | cabecera de la bienvenida | "Welcome to / Set up" con el nombre de la app | — | v4.3.0-fork.3 |
| H-11 | build | `packages/bruno-app/rsbuild.config.mjs` | `plugins` | Añade el plugin `plugins/fork/branding.mjs`: título del documento y textos visibles con el nombre de la app, sustituidos al compilar desde la lista `plugins/fork/branding-phrases.js` (sin tocar los fuentes de Bruno) | — | v4.3.0-fork.3 (plugin desde fork.4) |
| H-12 | código | `packages/bruno-electron/src/index.js` | `BrowserWindow` principal, `title` | Título inicial de la ventana | — | v4.3.0-fork.3 |
| H-13 | código | `packages/bruno-electron/src/app/menu-template.js` | menú nativo Help | "About Michi" y ventana Acerca de propia (`src/fork/about-page.js`) | — | v4.3.0-fork.3 |
| H-14 | código | `packages/bruno-electron/src/index.js` | handler de la ventana Acerca de | Usa `src/fork/about-page.js` (logo y nombre propios; mantiene el copyright de Bruno) | — | v4.3.0-fork.3 |
| H-15 | código | `packages/bruno-electron/src/app/mock-server/mock-server.js` | error de puerto ocupado | Nombre de la app en el mensaje | — | v4.3.0-fork.4 |
| H-16 | código | `packages/bruno-electron/src/index.js` | registro de IPC, tras `registerFilesystemIpc` | Registra los canales `fork:sensitive-environments:*`, que leen y escriben `.michi.json` en la raíz de la colección (`src/fork/sensitive-environments-file.js`) | — | v4.3.0-fork.5 |
| H-17 | código | `packages/bruno-electron/src/index.js` | registro de IPC, tras H-16 | Registra los canales `fork:git:*` del panel de git (`src/fork/git/git-ipc.js`) | — | v4.3.0-fork.7 |
| H-18 | código | `packages/bruno-app/src/components/Sidebar/index.js` | `sidebarSections` | Añade las secciones del fork a la barra lateral (`components/fork/registry`): *Git* y *Flows* | — | v4.3.0-fork.7 |
| H-19 | código | `packages/bruno-app/src/components/RequestTabPanel/index.js` | antes de `environment-settings` | Pinta las pestañas del fork (`components/fork/registry`): Git y flows | — | v4.3.0-fork.8 |
| H-20 | código | `packages/bruno-app/src/components/RequestTabs/RequestTab/index.js` | lista `specialTabs` | Registra los tipos de pestaña del fork (`components/fork/registry`) como pestañas especiales | — | v4.3.0-fork.8 |
| H-21 | código | `packages/bruno-app/src/components/RequestTabs/RequestTab/SpecialTab.js` | inicio de `getTabInfo` | Icono y título de las pestañas del fork (`components/fork/registry`) | — | v4.3.0-fork.8 |
| H-22 | código | `packages/bruno-app/src/components/Preferences/index.js` | `import` y lista de pestañas, antes de *Support* | Pestaña *Michi* de Preferencias (`components/fork/settings`), con los interruptores de las funciones del fork | — | v4.3.0-fork.9 |
| H-23 | código | `packages/bruno-app/src/components/Preferences/index.js` | inicio de `getTabPanel` | Pinta el panel de la pestaña *Michi* | — | v4.3.0-fork.9 |
| H-24 | código | `packages/bruno-app/src/components/ResponsePane/QueryResult/index.js` | `import` y encima del cuerpo de la respuesta | Barra *labels in this response* (`components/fork/LabelPreview`): detecta etiquetas PDF/PNG/JPEG/ZPL en la respuesta y las enseña y guarda | — | v4.3.0-fork.9 |
| H-25 | código | `packages/bruno-app/src/providers/ReduxStore/index.js` | `import` y lista `middleware` | Middleware del historial de requests (`components/fork/RequestHistory/middleware`): apunta cada `responseReceived` | — | v4.3.0-fork.9 |
| H-26 | código | `packages/bruno-app/src/components/StatusBar/index.js` | `import` y grupo derecho, antes de *Search* | Botón *History* de la barra de estado, que abre el historial de requests | — | v4.3.0-fork.9 |
| H-27 | dependencias | `packages/bruno-app/package.json` | `dependencies` | Añade `@zebrash/browser` 1.0.4 (dibujo de ZPL y QR), aprobada en DEC-22 | — | v4.3.0-fork.10 |
| H-28 | dependencias | `package-lock.json` | entradas de `@zebrash/browser`, `@zebrash/core` y `fflate` | Las tres entradas del lock de H-27, añadidas a mano sin resolver nada más | — | v4.3.0-fork.10 |
| H-29 | documentación | `.github/README.md` | fichero nuevo | Portada del repositorio en GitHub para usuarios (GitHub la muestra antes que el `README.md` de Bruno). Las capturas están en `fork/docs/img/` | — | v4.3.0-fork.10 |
| H-30 | build | `.github/dependabot.yml` | `open-pull-requests-limit` de cada entrada | Apaga las PRs de Dependabot en el repositorio del fork: las dependencias se actualizan con Bruno (R-33) | — | v4.3.0-fork.10 |
| H-31 | código | `packages/bruno-js/src/bru.js` | `require` y método `visualize` al final de la clase | `bru.visualize(tipo, {name, content})` guarda los paneles HTML del script (`bruno-js/src/fork/visualize.js`). Bruno 4.3 lo llama desde el sandbox pero no lo implementa | — | v4.3.0-fork.11 |
| H-32 | código | `packages/bruno-js/src/sandbox/quickjs/shims/bru.js` | función `visualize` del shim | El modo seguro (QuickJS) pasa todos los argumentos a `bru.visualize`, no solo el primero | — | v4.3.0-fork.11 |
| H-33 | código | `packages/bruno-js/src/runtime/script-runtime.js` | `buildResponseScriptResult` | El resultado del script de respuesta incluye `visualizations` | — | v4.3.0-fork.11 |
| H-34 | código | `packages/bruno-electron/src/ipc/network/index.js` | `require` y tras los resultados de tests post-response | Envía los paneles a la ventana por el canal `main:fork-visualizations` (`bruno-electron/src/fork/visualizations.js`) | — | v4.3.0-fork.11 |
| H-35 | código | `packages/bruno-app/src/components/ResponsePane/index.js` | `import` y dentro de `result-view-tabs` | Pestañas *Response* y una por panel junto al selector de formato (`components/fork/Visualizations`) | — | v4.3.0-fork.11 |
| H-36 | código | `packages/bruno-app/src/components/ResponsePane/QueryResult/index.js` | `import` y dentro del contenedor del cuerpo | Pinta el panel abierto encima del cuerpo, en un iframe aislado (`sandbox="allow-scripts"`) | — | v4.3.0-fork.11 |
| H-37 | código | `packages/bruno-electron/src/index.js` | registro de IPC, tras H-17 | Registra los canales `fork:flows:*`, que leen y escriben los flows en `.michi.json` (`src/fork/flows-file.js`) | — | v4.3.0-fork.13 |
