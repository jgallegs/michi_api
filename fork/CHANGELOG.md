# Changelog

## Sin publicar

- **Sin PRs de Dependabot**: `.github/dependabot.yml` con `open-pull-requests-limit: 0` (enganche H-30). Las dependencias solo se actualizan al pasar a una versión nueva de Bruno (R-33).
- **Repositorio en GitHub**: portada para usuarios en `.github/README.md` (enganche H-29) con capturas en `fork/docs/img/`. `fork/README.md` queda como guía de mantenimiento, con la tabla de funciones al día.

## v4.3.0-fork.10 (2026-11-06)

Base: Bruno v4.3.0.

- **Etiquetas ZPL dibujadas**: la vista previa de etiquetas pinta el ZPL como imagen (tamaño según `^PW`/`^LL`, o 4×6" a 203 ppp) y deja el código en *ZPL code*. Usa `@zebrash/browser` sin red: el plugin de build sustituye su cargador de fuentes (que las bajaba de jsDelivr) por las fuentes del propio paquete, incrustadas, y falla si el bundle conserva la URL del CDN.
- **Herramienta de QR**: botón *QR* en la barra de estado. Dibuja en el equipo un código QR a partir de un texto o de una variable de la colección activa (runtime o del entorno, salvo las secretas) y lo guarda en PNG. Se desactiva en Preferencias → Michi (*QR code tool*).
- **Dependencia nueva** `@zebrash/browser` 1.0.4 (con `@zebrash/core` y `fflate`, MIT), DEC-22. Enganches H-27 y H-28 (`package.json` y `package-lock.json`); H-26 pasa a montar todos los botones del fork en la barra de estado. `check-diff` acepta filas de tipo `dependencias` sin marca `[FORK H-xx]`, porque JSON no admite comentarios.
- El bundle que carga al arrancar crece 1,1 MB (de 16,0 a 17,1 MB): Bruno compila los `import()` en modo *eager*, así que el renderizador no se puede cargar aparte.

## v4.3.0-fork.9 (2026-11-06)

Base: Bruno v4.3.0.

- **Preferencias → Michi**: interruptores de las funciones del fork, guardados en el equipo (R-14). Enganches H-22 y H-23.
- **Barrera de entornos sensibles**: la confirmación enseña la URL ya resuelta (con las variables del entorno) y, con la opción *Confirm only write requests* (activa por defecto), solo pregunta en POST, PUT, PATCH, DELETE, mutaciones GraphQL, gRPC, WebSocket y ejecuciones del runner; GET, HEAD, OPTIONS y consultas GraphQL salen sin preguntar.
- **Vista previa de etiquetas**: si la respuesta trae una etiqueta en PDF, PNG, JPEG o ZPL (en base64 o en texto, en cualquier campo, p. ej. el campo de etiqueta de una API de envíos), aparece una barra encima del cuerpo con *Show*: enseña cada etiqueta (el PDF pintado, el ZPL como texto) y la guarda con el mismo diálogo que *Download response*. Sin servicios externos. Se desactiva en Preferencias → Michi. Enganche H-24.
- **Historial de requests**: botón *History* en la barra de estado. Guarda en el equipo las últimas 300 peticiones enviadas desde una pestaña: cuándo, con qué entorno, la URL ya resuelta, el estado, el tiempo, el tamaño y un extracto de la respuesta (1000 caracteres). Filtro por palabras y *Open request* para volver a la petición. No guarda las cabeceras y enmascara tokens y contraseñas en la URL y en el extracto. El runner no se apunta (tiene su propio informe). Se desactiva en Preferencias → Michi. Enganches H-25 y H-26.
- **Interfaz en español** (desactivada por defecto): menús, pestañas, botones, diálogos y textos del propio fork pasan a español con un diccionario que se aplica en pantalla (`components/fork/SpanishUi/phrases.js`). No cambia nombres de peticiones, carpetas, colecciones ni pestañas, ni editores, campos o respuestas; lo que no está en el diccionario sigue en inglés. Al apagarla vuelve el inglés sin reiniciar. Se monta desde `ForkRoot` (H-05), sin enganches nuevos.
- **Hora local junto a las fechas ISO**: en las respuestas, cada fecha con zona (`2026-11-06T09:00:00Z`, `...+01:00`) lleva al lado la hora local y cuánto hace ("6/11/26, 10:00:00 · hace 3 horas"). Solo se pinta en pantalla: el texto de la respuesta no cambia y al copiar sale el original. Se desactiva en Preferencias → Michi. H-05 monta ahora `ForkRoot`.
- **Sin telemetría**: las builds dejan vacía la clave de PostHog, así que la app no envía el aviso diario de uso, se compile donde se compile (plugin de build, H-11). Las promociones de pago de Bruno 4.3 ya no se muestran: el único componente ("Golden Edition") no está montado.

## v4.3.0-fork.8 (2026-11-04)

Base: Bruno v4.3.0.

- **Vista Git en pestaña**: botón "Open the Git view" en el panel (o clic en un fichero). A la izquierda, el panel; a la derecha, el **diff a dos columnas** del fichero elegido. En los conflictos muestra **el remoto a la izquierda y tu versión a la derecha**, con "Take remote (left)" y "Keep mine (right)". Enganches H-19 a H-21.

## v4.3.0-fork.7 (2026-11-04)

Base: Bruno v4.3.0.

- **Panel Git** en la barra lateral, para la colección de la pestaña activa: rama y commits por delante y por detrás (con fetch automático), cambios locales con diff, commit de los ficheros elegidos, **Sync seguro** (fetch, guarda los cambios sin commit, fast-forward o merge, los restaura y hace push), **conflictos guiados** (Keep mine, Take remote, Edit, Mark resolved, Finish, Cancel), aviso de **detached HEAD** con "Return to main" (rescata los commits huérfanos en una rama) y **Discard recuperable** ("Saved changes"). Hecho sobre `simple-git`, que ya traía Bruno.

## v4.3.0-fork.6 (2026-11-04)

Base: Bruno v4.3.0.

- **Portable rápido**: además del instalador y del portable de un solo fichero, el build genera `out/fast-portable/` (`<Product>.vbs` + `<Product>/launcher.ps1` + `<Product>-<versión>-win.zip`). La primera vez descomprime la app en `%LOCALAPPDATA%\<Product>-portable\<versión>` y después arranca directamente. El portable de un solo fichero descomprime unos 460 MB en cada arranque.

## v4.3.0-fork.5 (2026-11-04)

Base: Bruno v4.3.0.

- Entornos sensibles **compartidos por colección**: la marca se guarda en `.michi.json`, en la raíz de la colección, y viaja con git. Funciona en formato `.bru` y YAML, y el Bruno oficial ignora ese fichero. Las marcas locales anteriores se siguen respetando.
- Aviso *Sensitive* rediseñado.

## v4.3.0-fork.4 (2026-11-04)

Base: Bruno v4.3.0.

- El resto de textos de la interfaz que nombran la app (formato de colección, importar/exportar, preferencias, avisos, bienvenida...) pasan a decir **Michi**. Se sustituyen al compilar desde una lista de frases (`packages/bruno-app/plugins/fork/branding-phrases.js`), sin editar los fuentes de Bruno. Se mantienen en "Bruno" los valores que se escriben en ficheros y los textos que se refieren al proyecto Bruno (su documentación, su GitHub, Golden Edition y su changelog).

## v4.3.0-fork.3 (2026-11-04)

Base: Bruno v4.3.0.

- La app pasa a llamarse **Michi**: ejecutable, instalador, accesos directos, carpeta de datos (`%APPDATA%\Michi`), título de la ventana, barra de título, menú y ventana "Acerca de", y bienvenida. Los textos que nombran el formato de colección (Bruno) no cambian.

## v4.3.0-fork.2 (2026-11-04)

Base: Bruno v4.3.0.

- Logo propio (gata calico) en la interfaz, en el icono de la ventana, en el ejecutable y en el instalador. Fuente unica: `fork/packaging/icons/app-logo.svg`.

## v4.3.0-fork.1 (2026-11-04)

Base: Bruno v4.3.0.

- Entornos sensibles: interruptor por entorno, aviso en el selector y confirmación antes de enviar peticiones o lanzar el runner.
- Empaquetado para Windows como **Brunillo** (instalador y portable), con identidad y carpeta de datos propias.
