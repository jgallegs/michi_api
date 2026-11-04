# Changelog

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
