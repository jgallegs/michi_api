# Logo

El logo de Michi es una gata calicó (DEC-15). Todo sale de un único SVG fuente, `fork/packaging/icons/app-logo.svg`, y un script genera el resto de ficheros. Cambiar el logo no exige tocar código de Bruno.

## Ficheros

| Fichero | Qué es |
|---|---|
| `fork/packaging/icons/app-logo.svg` | Fuente única del logo. Solo trazados rellenos |
| `fork/packaging/make-icon.py` | Script que genera los demás ficheros a partir del SVG |
| `fork/packaging/icons/256x256.png` | Logo a 256 px, para revisar el resultado y para la portada del repositorio |
| `fork/packaging/icons/icon.ico` | Icono del ejecutable, del instalador y de los accesos directos |
| `packages/bruno-electron/src/about/256x256.png` | Icono de la ventana, de la barra de tareas y de "Acerca de". Sustituye al de Bruno (enganche H-07) |
| `packages/bruno-app/src/components/fork/AppLogo/logo-paths.js` | Trazados del logo para el componente de la interfaz |

## Generar los iconos

```bash
python fork/packaging/make-icon.py
```

Necesita `pip install numpy opencv-python pillow`. El script rasteriza el SVG con OpenCV, sin motor de SVG, así que el fichero debe usar solo trazados rellenos de la forma `<path fill="#rrggbb" d="M… Z">`.

## Dónde se usa

| Dónde se ve | Fichero | Cómo llega a la app |
|---|---|---|
| Logo dentro de la app: barra de título, bienvenida, pantalla de error | `components/fork/AppLogo/logo-paths.js` | Enganche H-06 en el componente `Bruno` |
| Icono de la ventana, barra de tareas y "Acerca de" | `packages/bruno-electron/src/about/256x256.png` | Fichero de Bruno reemplazado: enganche H-07 (al actualizar Bruno, se conserva el del fork) |
| Icono del `.exe`, del instalador y de los accesos directos | `fork/packaging/icons/icon.ico` | Configuración propia de empaquetado, sin enganche (DEC-14) |

## Cambiar el logo

1. Sustituir `fork/packaging/icons/app-logo.svg` por el diseño nuevo, con trazados rellenos. Si el SVG trae `clipPath`, grupos o transformaciones, hay que aplanarlo antes (en Inkscape: *Trayecto → Objeto a trayecto* y *Recortar → Aplicar*).
2. Ejecutar `make-icon.py` y revisar `fork/packaging/icons/256x256.png`.
3. Pasar los tests (`npx jest src/components/fork` en `packages/bruno-app`) y `check-diff`.
4. Subir el número de `fork/packaging/RELEASE`, compilar con `node fork/scripts/build-win.mjs` y publicar ([compilar-y-publicar.md](compilar-y-publicar.md)).

Para volver al logo de Bruno sin borrar nada: `USE_APP_LOGO = false` en `packages/bruno-app/src/components/fork/AppLogo/index.js` ([reglas.md](reglas.md), R-14).
