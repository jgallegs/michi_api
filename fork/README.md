# Fork

Este repositorio es un fork de [Bruno](https://github.com/usebruno/bruno) (MIT) con funciones añadidas a la aplicación de escritorio.
Las colecciones no cambian: todo lo que se abre o se guarda con el fork sigue siendo compatible con el Bruno oficial.

## Cómo está organizado

- El código propio vive en carpetas `fork/`: esta carpeta, `packages/bruno-app/src/components/fork/`, etc.
- En ficheros de Bruno solo hay **enganches** de pocas líneas, marcados con `[FORK H-xx]` y registrados en [HOOKS.md](HOOKS.md).
- `UPSTREAM_VERSION` indica el tag de Bruno sobre el que está la rama.

## Antes de abrir una MR

```bash
node fork/scripts/check-diff.mjs
```

Comprueba que fuera de `fork/` solo cambian enganches registrados, y que no hay palabras prohibidas ni secretos en las líneas añadidas.

## Compilar para Windows

```bash
node fork/scripts/build-win.mjs
```

Genera en `packages/bruno-electron/out/` el instalador (`Brunillo-Setup-<versión>.exe`) y el ejecutable portable (`Brunillo-<versión>-portable.exe`). La identidad de la app (nombre, `appId`, icono, versión `<upstream>-fork.<n>`) está en `fork/packaging/` y extiende la configuración de Bruno sin modificarla. La app se instala y guarda sus datos (`%APPDATA%\Brunillo`) aparte de una instalación del Bruno oficial. El número de versión del fork está en `fork/packaging/RELEASE`.

Si electron-builder falla al extraer `winCodeSign` con un error de enlaces simbólicos ("no dispone de un privilegio requerido"), extrae el paquete a mano, sin la carpeta `darwin`, en `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`.

## Funciones

| Función | Desde | Descripción |
|---|---|---|
| Entornos sensibles | v4.3.0-fork.1 | Interruptor *Sensitive* en el detalle de cada entorno de colección. Con él activo, el selector de entorno muestra un aviso y cada envío o ejecución del runner pide confirmación. La marca se guarda solo en el equipo (no en la colección) |
| Logo propio | v4.3.0-fork.2 | El logo de la app sale de `fork/packaging/icons/app-logo.svg`. `python fork/packaging/make-icon.py` genera el icono del ejecutable, el icono de la ventana (H-07) y el componente `components/fork/AppLogo`, que sustituye al logo de Bruno en la interfaz (H-06). Con `USE_APP_LOGO = false` vuelve el logo original |
