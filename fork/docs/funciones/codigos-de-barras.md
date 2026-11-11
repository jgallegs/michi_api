# Códigos de barras de la respuesta

Dibuja como código de barras los valores que trae una respuesta (un número de envío, los números de sus bultos), para leerlos con un lector o una PDA directamente desde la pantalla. Se activa por carpeta, con una variable.

## Activarlo en una carpeta

En los ajustes de la carpeta, pestaña **Vars**, se añade una variable:

| Nombre | Valor |
|---|---|
| `michi.barcodes` | Los campos de la respuesta que se quieren dibujar, separados por comas |

Ejemplo, para una respuesta `{"shipmentNumber": "…", "parcels": [{"code": "…"}, {"code": "…"}]}`:

```
michi.barcodes = shipmentNumber, parcels.code
```

Desde ese momento, todas las peticiones de esa carpeta (y de sus subcarpetas) enseñan una barra azul encima del cuerpo cuando la respuesta trae esos campos: *"3 barcodes in this response (shipmentNumber, code)"* → **Show**.

![Un código de barras de la respuesta, visto de uno en uno](../img/codigos-de-barras.png)

## Cómo se escriben los campos

| Se escribe | Qué dibuja |
|---|---|
| `shipmentNumber` | El valor de ese campo |
| `sender.reference` | Un campo dentro de otro |
| `parcels.code` | Un código por cada elemento de la lista `parcels` |
| `parcels.0.code` o `parcels[0].code` | Solo el del primer elemento |
| `references` | Si el campo es una lista de textos o números, uno por cada valor |

- Los campos se separan con comas, punto y coma o saltos de línea.
- Un campo que no viene en la respuesta, que viene vacío o que no es un texto ni un número se salta. Si no queda ninguno, la barra no aparece (una respuesta de error, por ejemplo).
- Como mucho se dibujan 100 códigos por respuesta.

## Dónde puede ir la variable

La variable es una variable normal de Bruno, así que vale en la carpeta, en la colección y en una petición suelta. Gana la más cercana a la petición: **petición → carpeta → carpetas de encima → colección**. Sirve para pedir otros campos en una subcarpeta concreta.

Para que una carpeta deje de dibujarlos basta con desmarcar la variable o borrarla.

## La ventana

- **All / One at a time**: todos seguidos o de uno en uno. De uno en uno el código sale más grande y se pasa con las flechas del teclado o con los botones; es la vista cómoda para un lector, que coge el primer código que ve.
- **Copy number** copia el valor; **Copy all the numbers** los copia todos, uno por línea.
- **Save** guarda el código como PNG (`barcode-<valor>.png`) con el mismo diálogo que *Download response*.
- El código se dibuja siempre en negro sobre blanco, con su margen, sea cual sea el tema de la app.

## Detalles

| Tema | Comportamiento |
|---|---|
| Tipo de código | **Code 128**, con los juegos B y C: letras, números y signos corrientes (ASCII imprimible), hasta 80 caracteres. Los tramos de cifras se empaquetan de dos en dos, así un número largo ocupa la mitad |
| Valores que no caben | Un valor con tildes, eñes u otros caracteres fuera de ese juego, o de más de 80 caracteres, se lista con un aviso en lugar del código |
| Dónde se dibuja | En el equipo. No se envía nada a ningún servicio ([seguridad.md](../seguridad.md)) y no se añade ninguna dependencia: el codificador está en `components/fork/Barcodes/code128.js` |
| Formato de la colección | No cambia: la carpeta guarda una variable más, como cualquier otra ([reglas.md](../reglas.md), R-10; [decisiones.md](../decisiones.md), DEC-30) |
| Bruno oficial | Ve una variable que nadie usa. La colección funciona igual |
| Scripts | No hay API nueva: ningún script necesita saber de la variable (R-12) |
| CLI `bru` | No aplica: es solo lo que se ve en la respuesta (R-15) |
| Enganches | Ninguno nuevo. La barra se pinta en el hueco que ya había encima del cuerpo de la respuesta (H-24), debajo de la de etiquetas |
| Desactivar | *Preferences → Michi → Barcodes of response fields*. Activado por defecto: sin la variable no hace nada (R-14) |
| Idioma | Con *Spanish interface* encendido, la barra y la ventana salen en español |

## Ficheros

| Fichero | Qué hace |
|---|---|
| `components/fork/Barcodes/code128.js` | Codificador Code 128 (símbolos, dígito de control y módulos) |
| `components/fork/Barcodes/fields.js` | Lee la variable, con su orden de preferencia, y saca los valores de la respuesta |
| `components/fork/Barcodes/BarcodeImage.js` | El código como SVG |
| `components/fork/Barcodes/png.js` | El código como PNG, para guardarlo |
| `components/fork/Barcodes/index.js` | La barra y la ventana |
| `components/fork/LabelPreview/index.js` | Monta las dos barras (etiquetas y códigos) en el hueco de H-24 |
