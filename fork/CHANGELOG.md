# Changelog

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
