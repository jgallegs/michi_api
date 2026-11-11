# Función: flows

En la barra lateral de Michi hay una sección **Flows** para encadenar las peticiones de una colección en un lienzo, sin escribir código: iniciar sesión, usar el token en la siguiente petición, repetir, guardar valores en una lista o parar según lo que responda el servidor. Los flows se guardan en la colección y los comparte todo el equipo a través de git.

Está apagada por defecto mientras es nueva. Se enciende en *Preferences → Michi → Flows*.

Para empezar a usarla sin leer todo esto está la [guía rápida](flows-guia.md), con capturas.

## Cómo se usa

1. En la sección **Flows**, el botón **+** pide un nombre y, si se quiere, una carpeta. El flow se abre en una pestaña con su pieza **Start** y pregunta **What do you want to do?**: una galería de bloques ya montados (ver [Los bloques](#los-bloques)). **Start from scratch** la cierra y deja el lienzo vacío.
2. Añadir pasos, de cualquiera de estas formas:
   - Tirar de un triángulo y soltar el cable en vacío: sale la lista de lo que encaja ahí, y lo elegido nace ya conectado. La lista tiene tres pestañas, para no mezclar cosas distintas: **Steps** (los pasos), **Requests** (las peticiones de la colección, agrupadas por carpeta) y **Blocks** (abre la galería).
   - Arrastrar una petición desde la barra lateral al lienzo.
   - Doble clic en vacío, o los botones **Add step** y **Add request** de la barra, que abren la misma lista en su pestaña.
   - Clic con el botón derecho en vacío: un menú ofrece añadir un paso, una petición o un bloque donde está el puntero, y pegar si hay algo copiado.
3. Conectar valores: cada petición enseña a la izquierda las variables que usa (`{{token}}`) y a la derecha lo que devuelve. Se une una salida con una entrada tirando un cable, o pulsando el cuadrado de la entrada y eligiendo el valor de la lista. En esa lista también se puede escribir el nombre de un campo que todavía no se ha visto (`envios.info.id`): se ofrece en cada paso que entrega campos y, al elegirlo, queda añadido. Con **Add a field** se añade un campo de la respuesta, también anidado, sin haber ejecutado antes (ver [Los campos de una respuesta](#los-campos-de-una-respuesta)).
4. **Run** ejecuta el flow contra el entorno que se ve al lado del botón. **Step** ejecuta un paso y espera. Si una petición no se puede enviar, la ejecución se queda en ese paso y se retoma con **Continue** o con el botón del propio paso.
5. **Save** guarda el flow en la colección. Mientras no se guarde, los cambios se conservan al cambiar de pestaña, hasta que se cierre la app.

### Los pasos

| Paso | Qué hace |
|---|---|
| Start | Donde empieza el flow. Siempre hay uno y no se puede borrar. Puede hacer preguntas antes de ejecutar (ver [Preguntar antes de ejecutar](#preguntar-antes-de-ejecutar)) |
| Request | Envía una petición de la colección, igual que desde su pestaña: mismo entorno, mismos scripts y la respuesta queda también en la pestaña de la petición |
| If | Elige un camino. Comprueba si la última respuesta fue correcta (2xx), si su código es uno concreto, si pasan los tests que lleva la petición, o compara dos valores |
| Validate | Mira un valor y decide si lo que llegó vale: *Not valid if* [valor] [comparación] [otro valor]. Sigue por **Valid** o por **Not valid**. Es para las respuestas que llegan con un 200 pero traen un código de error dentro: lo que cuelga de **Valid** no las ve. Dentro de un bucle, si de **Not valid** no cuelga nada, la vuelta termina y empieza la siguiente |
| Repeat | Repite lo que cuelga de *On each round* las veces indicadas. Lo que repite queda dentro de un marco. La vuelta termina cuando el camino se acaba o cuando llega a *End of round* |
| For each item | Como Repeat, pero da una vuelta por cada elemento de una lista: una lista del flow o un campo de una respuesta que sea una lista. En cada vuelta entrega el elemento (*Item*), los campos suyos que se añadan con *Add a field* y el número de vuelta |
| Leave loop | Termina el bucle en el que está, aunque le queden vueltas, y el flow sigue por su *When finished*. Sirve para reintentar hasta que algo funcione o esperar a que un proceso termine. Fuera de un bucle lleva un aviso y el flow no se ejecuta |
| List y Add to list | Una lista que se va llenando, con un valor o con varios campos por vuelta. Se puede usar después del bucle. **Add to list** elige su lista por nombre en un desplegable; si el flow solo tiene una, ya viene elegida. El paso **List** enseña dentro lo que va guardando y abre su informe (ver [El informe de una lista](#el-informe-de-una-lista)) |
| Data table | Una tabla de datos escrita en el flow, para recorrerla con **For each item**: cada fila es un elemento y sus columnas, sus campos (ver [Tabla de datos](#tabla-de-datos)) |
| Run a flow | Ejecuta otro flow de la colección como un paso (ver [Flows dentro de flows](#flows-dentro-de-flows)) |
| Set variable | Guarda un valor con un nombre para usarlo en pasos posteriores como `{{nombre}}` |
| Wait | Espera unos segundos |
| Note | Escribe un mensaje en la salida y sigue |
| Stop | Termina el flow con un mensaje |

### Los campos de una respuesta

La lista de **Add a field**, y la de valores de otros pasos, ofrece los campos de la respuesta de cada petición. Los saca, por este orden, de:

| De dónde | Cuándo |
|---|---|
| La última respuesta recibida | En esta sesión, enviada desde su pestaña o desde un flow |
| Un ejemplo guardado en la petición | Siempre |
| Lo visto en sesiones anteriores | Cada respuesta que llega deja recordados los nombres de sus campos, venga de un flow o de la pestaña de la petición. Se guardan en este ordenador, y solo los nombres: nunca un valor de una respuesta |
| Un documento OpenAPI o Swagger | Si en **API Specs** hay abierto uno con una ruta y un método que encajen con la petición, se lee el esquema de su respuesta correcta. En la lista sale como *from the API spec* |
| Los scripts de la petición | Los campos que mencionan (`res.body.token`, `res.getBody().id`…). Se leen como texto, no se ejecuta nada. En la lista sale como *from the script* |

Lo que no aparece se puede escribir a mano, también como en los scripts: `pedidos[2].id`.

**Listas.** Un campo que pasa por una lista lee, si no se dice otra cosa, el primer elemento. En su fila sale una ficha con el elemento que lee (`#1`); al pulsarla se elige **The first item**, **The last item**, se escribe una posición contando desde 1, o se escribe `campo=valor` para leer el primer elemento que lo cumple (`estado=abierto`). A mano también vale `pedidos[estado=abierto].id`. Una lista entera se entrega tal cual (`all`) y también se puede pedir uno solo de sus elementos. Para pasar por todos está el paso **For each item**.

### Texto o valor de otro paso

Lo que se escribe en la caja de una entrada es texto tal cual: escribir `token` guarda la palabra, no el campo. Para usar un valor de otro paso hay que unirlo, y entonces la caja se convierte en una ficha con el paso del que viene. Como lo natural es escribir el nombre, mientras se escribe sale debajo una lista con los valores de otros pasos que se llaman así; se elige con el ratón o, si el nombre coincide entero, con `Enter`.

Al cambiar un ajuste que quita entradas o salidas de un paso (pasar **Add to list** de *One value* a *Several fields*, por ejemplo), los cables que llegaban a ellas se quitan también.

### El informe de una lista

El paso **List** tiene dentro un recuadro con lo que guarda después de la última ejecución, una línea por elemento, que se va llenando mientras el flow se ejecuta. El texto se puede seleccionar y copiar.

**View report** abre lo mismo como una tabla para leer: una fila por elemento y una columna por campo. Un campo que es a su vez una lista (los bultos de un envío) se abre en tantas filas como tenga, y los campos de alrededor las abarcan, de modo que cada elemento queda junto a lo suyo.

| Botón | Qué hace |
|---|---|
| **Copy table** | Copia la tabla para pegarla en una hoja de cálculo, un correo o un documento |
| **Copy as JSON** | Copia los datos tal como están en la lista |
| **Save as HTML** | Guarda el informe como una página suelta, con su título, el flow, la fecha y la tabla |

Lo que enseña es lo de la última ejecución y vive mientras la app está abierta; no se guarda en la colección.

### Los bloques

Un bloque son varios pasos ya unidos que resuelven algo que se hace a menudo. Se elige y cae en el lienzo conectado: detrás de **Start** si no tiene nada detrás, o colgando del cable desde el que se pidió.

| Dónde | Qué se hace |
|---|---|
| Al abrir un flow vacío | La galería sale sola |
| Botón **Blocks** de la barra | Abre y cierra la galería |
| Lista de añadir | La pestaña **Blocks** abre la galería, y el bloque elegido queda unido al cable que se había soltado |
| Botón derecho en vacío | **Add a block** abre la galería y el bloque cae donde estaba el puntero |

Bloques que trae Michi:

| Grupo | Bloques |
|---|---|
| The basics | Llamar a varias peticiones seguidas · usar un valor de una respuesta en la siguiente llamada · esperar entre dos llamadas |
| When something fails | Parar si una llamada falla · comprobar un valor de la respuesta · validar un campo de la respuesta · reintentar hasta que funcione · comprobar que varios servicios responden |
| Repeating | Repetir una llamada y guardar los resultados · repetir una llamada y guardar solo las respuestas válidas · recorrer las páginas de un resultado · enviar una petición por cada elemento de una lista · enviar una petición por cada fila de una tabla · esperar a que algo esté listo |
| Typical cases | Crear, comprobar y borrar · crear solo si no existe |

**La guía.** Un bloque de Michi abre abajo a la izquierda la lista de lo que falta por rellenar, en orden. Cada punto se tacha solo cuando el lienzo muestra que está hecho (se eligió la petición, se conectó el valor, se pulsó **Run**), y los que no se pueden comprobar se tachan a mano pulsando su número. El paso al que se refiere cada punto lleva ese número encima; pulsar el texto de un punto lleva a su paso. La guía se cierra con su aspa y no se guarda.

**Bloques propios.** Con uno o más pasos seleccionados aparece **Save as block**, que pide un nombre. El bloque guarda los pasos tal como están, con sus peticiones ya elegidas, sus ajustes y los cables entre ellos, y sale en la galería bajo **My blocks**. Se guarda en la colección, así que le llega a todo el equipo. Se borra desde la propia galería, con una segunda pulsación para confirmar. Insertar un bloque se deshace de una vez con `Ctrl+Z`.

### Preguntar antes de ejecutar

El paso **Start** tiene **Ask before running**: cada pregunta lleva un nombre y, si se quiere, su respuesta habitual. Al pulsar **Run**, una ventana las hace, rellenas con lo que se contestó la última vez. Cada respuesta sale de **Start** como un valor para unir a lo que la necesite, y es además una variable con el nombre de la pregunta (`{{cuantos}}`). **Step** pregunta igual al empezar; **Continue** no vuelve a preguntar.

### Tabla de datos

**Data table** guarda filas pegadas desde una hoja de cálculo (o escritas como CSV con comas o punto y coma); la primera línea son los nombres de las columnas. **Edit the data** abre la ventana donde se pegan y enseña lo que se va a guardar. Se une a **For each item**, que da una vuelta por fila y ofrece las columnas como campos. Caben 1000 filas y 30 columnas, y los datos se guardan con el flow.

### Flows dentro de flows

**Run a flow** ejecuta otro flow de la colección como un solo paso. Las preguntas que ese flow hace en **Start** son las entradas del paso, y lo que deja con nombre (variables de **Set variable**, listas con nombre y las propias respuestas) son sus salidas. La salida cuenta lo que pasa dentro, con el nombre del flow delante. Si el flow de dentro falla, falla el paso; continuar lo ejecuta entero otra vez. No se admiten más de cinco niveles, que es también lo que corta un flow que se llame a sí mismo.

### Probar un paso

Clic derecho sobre un paso: **Run only this step** lo ejecuta a él solo y **Run from this step** ejecuta desde él hasta el final. Los dos parten de lo que dejó la última ejecución (respuestas, variables y listas), así que no hay que volver a enviar lo anterior. Si no ha habido ninguna ejecución, los valores de los pasos anteriores llegan vacíos y la salida lo avisa.

### Tests de las peticiones

Los tests y aserciones que lleva una petición se ejecutan cuando un flow la envía. La salida dice cuántos pasan junto a su respuesta (`3/4 tests`) y, al final de la ejecución, el total. Una petición con un test que falla destaca, y al desplegar su línea se ve cuál. **If** puede ramificarse por ellos con **The tests of the response pass**.

### El informe de una ejecución

Cada ejecución empieza en la salida con el nombre del flow; el botón de tabla de esa línea abre su informe: cada paso con su resultado y su hora, con los mismos botones de copiar y guardar que el informe de una lista.

### La sección de la barra lateral

La sección **Flows** tiene un buscador por nombre o carpeta cuando hay más de un flow, un botón para duplicar un flow (la copia lleva sus pasos y un número detrás del nombre) y un punto junto a cada flow que dice cómo fue su última ejecución desde que se abrió la app.

### El curso guiado

**Guided course**, en la ayuda y en la galería de un flow nuevo, abre a la izquierda del lienzo un curso de 37 lecciones en seis capítulos. Cada lección que lo permite tiene **Try it on the canvas**, que deja su bloque o su paso en el flow abierto. El progreso es de cada persona. La versión escrita está en [flows-curso.md](flows-curso.md).

### La ayuda

El botón **?** de la barra abre un panel con lo necesario para leer un flow: qué significa cada forma, cómo se monta, cómo se ejecuta y las teclas. Además, cada puerto dice para qué sirve al dejar el ratón encima.

### Los puertos y los cables

- **Triángulo**: el orden de los pasos. **Círculo**: un valor que sale. **Cuadrado**: un valor que entra. Solo están rellenos si tienen un cable.
- Mientras se arrastra un cable solo se iluminan los puertos donde encaja.
- Conectar un valor a un paso que no tiene orden propio ya hace que se ejecute después: no hace falta unir además los triángulos.
- Los cables van siempre en ángulo recto. Se les da forma arrastrando cualquier tramo; tirar del primero o del último crea un codo nuevo. Doble clic en un cable lo devuelve a su forma normal.
- Los cables a los que nadie ha dado forma se reparten solos: no van unos encima de otros y giran donde menos se cruzan. Donde dos se cruzan, uno se ve pasar por encima del otro.
- **Qué cables se ven.** Los de orden, siempre: son más gruesos y llevan una marca que dice hacia dónde van. Los de valores, finos, solo se dibujan para el paso sobre el que está el ratón o que está seleccionado, porque cada entrada ya dice en su ficha de dónde toma el valor. El botón del ojo, en la barra, los enseña todos; la elección se recuerda en el ordenador de cada persona.
- **Colores.** Los cables de orden llevan el color principal; los que salen de **Yes** o **Valid** van en verde y los de **No** o **Not valid** en rojo. Cada paso que entrega valores tiene un color propio, que llevan sus cables, sus salidas y las entradas y fichas a las que llegan: así se ve de dónde viene un valor sin seguir la línea.
- Al dejar el ratón sobre un paso sus cables se resaltan y los demás se atenúan. Seleccionar un paso o un cable también resalta los suyos.
- Un flow hecho cuando la lista se unía a **Add to list** con un cable lo conserva y sigue funcionando; al elegir una lista en el desplegable, ese cable se quita.

### Moverse por el lienzo

| Acción | Cómo |
|---|---|
| Seleccionar varios pasos | Arrastrar sobre el fondo, o `Ctrl` + clic |
| Mover el lienzo | Arrastrar con el botón derecho o central, o `Alt` + arrastrar |
| Añadir donde está el puntero | Clic con el botón derecho, sin arrastrar |
| Acercar y alejar | Rueda del ratón |
| Borrar | `Supr` con pasos o un cable seleccionados |
| Deshacer y rehacer | `Ctrl+Z`, `Ctrl+Y` |
| Copiar, pegar, duplicar | `Ctrl+C`, `Ctrl+V`, `Ctrl+D` |
| Guardar | `Ctrl+S` |
| Ejecutar | `Ctrl+Enter` |
| Ordenar | **Tidy up** coloca los pasos por columnas |

Los pasos no se pueden dejar unos encima de otros: al soltarlos se apartan lo justo.

### La salida

El panel **Output**, a la derecha, cuenta lo que hace cada ejecución: código y tiempo de cada petición, la vuelta de cada bucle, lo que se añade a las listas y cómo termina. Cada respuesta se puede desplegar. Conserva todas las ejecuciones desde que se abrió la app, hasta que se pulsa **Clear**.

## Qué hay que saber

| Tema | Comportamiento |
|---|---|
| Sin código | Un flow no ejecuta JavaScript. `{{nombre}}` en un texto es una sustitución, nunca una expresión. Los scripts que tenga cada petición sí se ejecutan, como al enviarla a mano |
| Entornos sensibles | Con un entorno marcado como *Sensitive*, el nombre sale en rojo junto a **Run** y la ejecución pide confirmación una vez por flow, y otra si se cambia de entorno antes de continuar ([entornos-sensibles.md](entornos-sensibles.md)) |
| Un 500 no detiene el flow | Una respuesta de error es una respuesta: para reaccionar a ella está el paso **If**. Solo detiene el flow un fallo real, como no poder conectar |
| Pasos sueltos | Lo que no está conectado a **Start** se ve atenuado y no se ejecuta ni se valida, así que se pueden dejar piezas de reserva |
| Avisos | Un paso mal montado lleva un aviso encima con lo que le falta. **Run** escribe esos mismos avisos en la salida y no envía nada |
| Dónde se guarda | En `.michi.json`, en la raíz de la colección: los flows en la clave `flows` y los bloques propios en `flowBlocks` ([decisiones.md](../decisiones.md), DEC-26 y DEC-27). Las peticiones se apuntan por su ruta dentro de la colección, así que flows y bloques sirven en cualquier equipo |
| Idioma | Con *Spanish interface* encendido, el lienzo, la galería, la guía y la ayuda salen en español, y los mensajes que un bloque escribe dentro de sus pasos (el de **Stop**, por ejemplo) también. El buscador de los selectores encuentra los pasos por su nombre en los dos idiomas |
| Ventanas estrechas | La barra del lienzo va quitando el texto de sus botones, primero los menos necesarios, y deja el icono. El nombre sigue saliendo al dejar el ratón encima |
| Campos recordados | Los nombres de los campos vistos en cada respuesta se guardan en este ordenador (no en la colección), así que cada persona los tiene al enviar la petición una vez. Con *Flows* apagado no se guarda nada ([decisiones.md](../decisiones.md), DEC-28) |
| Bruno oficial | Ignora `.michi.json`: la colección funciona igual, sin los flows |
| Mover o renombrar una petición | El paso la pierde y pide elegirla otra vez |
| Trabajo en equipo | Si un `pull` trae otra versión de un flow que se está editando, la barra lo avisa y deja descartar los cambios propios. Guardar sin descartar pisa la versión que llegó |
| Lo que no se guarda | El zoom, la posición del lienzo, el historial de deshacer, la guía de un bloque y la salida viven solo mientras la app está abierta |
| Peticiones admitidas | HTTP y GraphQL. gRPC y WebSocket no se pueden encadenar |
| Variables de petición con pregunta | Las variables que Bruno pide por pantalla al enviar (`{{?nombre}}`) no se piden desde un flow |
| CLI `bru` | No aplica: los flows viven en la app de escritorio ([reglas.md](../reglas.md), R-15) |
| Desactivar | Apagando *Flows* en *Preferences → Michi* desaparecen la sección y las pestañas. Los flows guardados no se tocan (R-14) |

## Cómo está hecho

Todo el código está en `packages/bruno-app/src/components/fork/Flows/` y en `packages/bruno-electron/src/fork/flows-file.js`. No añade enganches sobre los que ya trajo el almacenamiento (H-18 a H-21 y H-37).

| Carpeta | Qué contiene |
|---|---|
| `engine/` | El motor: en qué orden van los pasos (`graph.js`), qué hace cada uno (`nodes.js`) y la ejecución con pausa, paso a paso y reanudación (`run.js`). No sabe nada de la app: las peticiones salen por un `host` que se le pasa |
| `canvas/` | El lienzo sin React: descripción de cada pieza y sus puertos (`pieces.js`), edición del flow (`editing.js`), trazado de cables (`routing.js`), colocación sin solapes y ordenar (`layout.js`), deshacer (`history.js`), lectura de las peticiones de la colección (`requests.js`) contenido de los selectores (`pickers.js`) y colores de los cables (`colors.js`). Más los componentes `Piece`, `Cables`, `Picker`, `ContextMenu` y `Toolbar` |
| `fields/` | Qué campos tiene la respuesta de una petición antes de enviarla: rutas y posiciones en listas (`paths.js`), lectura de documentos OpenAPI (`spec.js`), lectura de los scripts como texto (`script.js`), lo recordado entre sesiones (`memory.js`) y el observador que anota cada respuesta que llega (`watch.js`, instalado desde `ForkRoot`) |
| `FlowCanvas/` | El componente que junta lo anterior: selección, arrastres, zoom, teclado y soltar desde la barra lateral |
| `blocks/` | Los bloques: el catálogo de los que trae Michi (`catalog.js`), cómo se montan, se insertan y se guardan los propios (`building.js`), la guía y cómo sabe que un punto está hecho (`guide.js`), los bloques de cada colección (`store.js`) y los componentes `Gallery`, `GuidePanel`, `HelpPanel` y `SaveBlockModal` |
| `report/` | Los informes: de los datos a filas y columnas (`table.js`), a texto, tabla y página HTML (`export.js`), de la salida de una ejecución a filas (`runReport.js`) y la ventana `ReportModal` |
| `data/` | La tabla de datos: de texto pegado a columnas y filas (`parse.js`) y la ventana `TableModal` |
| `course/` | El curso guiado: las lecciones (`lessons.js`, con su español en `SpanishUi/flowsCourse.js`), el progreso de cada persona (`progress.js`) y el panel `CoursePanel` |
| `run/` | La ejecución en la app: `host.js` envía cada petición con `sendNetworkRequest`, como hace Bruno; `controller.js` pide la confirmación de entorno sensible y traduce los eventos del motor; `session.js` guarda el estado de cada ejecución y la salida; `OutputPanel/` la pinta |

- Un flow es un JSON con `nodes` (tipo, posición y ajustes) y `edges` (de qué puerto a qué puerto, y los codos si se les ha dado forma).
- Cada flow tiene su `version`. Un flow de una versión que la app no conoce no se abre ni se sobrescribe.
- Un bloque propio es el mismo JSON que un flow, sin **Start** y con las posiciones contadas desde su esquina. Un bloque de Michi se describe en `catalog.js` con sus pasos, sus cables y los puntos de su guía; un test comprueba que todos se montan enteros, que no se solapan y que tienen cada texto en español.
- Los textos que la interfaz en español no puede cambiar en pantalla, porque van dentro de un desplegable o de una caja, pasan por `language.js`.
- Pruebas: `*.spec.js` junto a cada módulo. El motor y la lógica del lienzo se prueban sin interfaz; `FlowCanvas` y `run/controller` con la app simulada.
