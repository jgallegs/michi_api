# Changelog

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
