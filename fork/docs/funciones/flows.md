# Función: flows

En la barra lateral de Michi hay una sección **Flows** para encadenar las peticiones de una colección en un lienzo, sin escribir código: iniciar sesión, usar el token en la siguiente petición, repetir, guardar valores en una lista o parar según lo que responda el servidor. Los flows se guardan en la colección y los comparte todo el equipo a través de git.

Está apagada por defecto mientras es nueva. Se enciende en *Preferences → Michi → Flows*.

Para empezar a usarla sin leer todo esto está la [guía rápida](flows-guia.md), con capturas.

## Cómo se usa

1. En la sección **Flows**, el botón **+** pide un nombre y, si se quiere, una carpeta. El flow se abre en una pestaña con su pieza **Start** y pregunta **What do you want to do?**: una galería de bloques ya montados (ver [Los bloques](#los-bloques)). **Start from scratch** la cierra y deja el lienzo vacío.
2. Añadir pasos, de cualquiera de estas formas:
   - Tirar de un triángulo y soltar el cable en vacío: sale un selector con los pasos que encajan y las peticiones de la colección. El paso elegido nace ya conectado.
   - Arrastrar una petición desde la barra lateral al lienzo.
   - Doble clic en vacío, o el botón **Add step**.
3. Conectar valores: cada petición enseña a la izquierda las variables que usa (`{{token}}`) y a la derecha lo que devuelve. Se une una salida con una entrada tirando un cable, o pulsando el cuadrado de la entrada y eligiendo el valor de la lista. En esa lista también se puede escribir el nombre de un campo que todavía no se ha visto (`envios.info.id`): se ofrece en cada paso que entrega campos y, al elegirlo, queda añadido. Con **Add a field** se añade un campo de la respuesta, también anidado, sin haber ejecutado antes.
4. **Run** ejecuta el flow contra el entorno que se ve al lado del botón. **Step** ejecuta un paso y espera. Si una petición no se puede enviar, la ejecución se queda en ese paso y se retoma con **Continue** o con el botón del propio paso.
5. **Save** guarda el flow en la colección. Mientras no se guarde, los cambios se conservan al cambiar de pestaña, hasta que se cierre la app.

### Los pasos

| Paso | Qué hace |
|---|---|
| Start | Donde empieza el flow. Siempre hay uno y no se puede borrar |
| Request | Envía una petición de la colección, igual que desde su pestaña: mismo entorno, mismos scripts y la respuesta queda también en la pestaña de la petición |
| If | Elige un camino. Comprueba si la última respuesta fue correcta (2xx), si su código es uno concreto, o compara dos valores |
| Repeat | Repite lo que cuelga de *On each round* las veces indicadas. Lo que repite queda dentro de un marco. La vuelta termina cuando el camino se acaba o cuando llega a *End of round* |
| For each item | Como Repeat, pero da una vuelta por cada elemento de una lista: una lista del flow o un campo de una respuesta que sea una lista. En cada vuelta entrega el elemento (*Item*), los campos suyos que se añadan con *Add a field* y el número de vuelta |
| Leave loop | Termina el bucle en el que está, aunque le queden vueltas, y el flow sigue por su *When finished*. Sirve para reintentar hasta que algo funcione o esperar a que un proceso termine. Fuera de un bucle lleva un aviso y el flow no se ejecuta |
| List y Add to list | Una lista que se va llenando, con un valor o con varios campos por vuelta. Se puede usar después del bucle |
| Set variable | Guarda un valor con un nombre para usarlo en pasos posteriores como `{{nombre}}` |
| Wait | Espera unos segundos |
| Note | Escribe un mensaje en la salida y sigue |
| Stop | Termina el flow con un mensaje |

### Los bloques

Un bloque son varios pasos ya unidos que resuelven algo que se hace a menudo. Se elige y cae en el lienzo conectado: detrás de **Start** si no tiene nada detrás, o colgando del cable desde el que se pidió.

| Dónde | Qué se hace |
|---|---|
| Al abrir un flow vacío | La galería sale sola |
| Botón **Blocks** de la barra | Abre y cierra la galería |
| Selector de pasos | La entrada **Choose a block…** abre la galería, y el bloque elegido queda unido al cable que se había soltado |

Bloques que trae Michi:

| Grupo | Bloques |
|---|---|
| The basics | Llamar a varias peticiones seguidas · usar un valor de una respuesta en la siguiente llamada · esperar entre dos llamadas |
| When something fails | Parar si una llamada falla · comprobar un valor de la respuesta · reintentar hasta que funcione · comprobar que varios servicios responden |
| Repeating | Repetir una llamada y guardar los resultados · recorrer las páginas de un resultado · enviar una petición por cada elemento de una lista · esperar a que algo esté listo |
| Typical cases | Crear, comprobar y borrar · crear solo si no existe |

**La guía.** Un bloque de Michi abre abajo a la izquierda la lista de lo que falta por rellenar, en orden. Cada punto se tacha solo cuando el lienzo muestra que está hecho (se eligió la petición, se conectó el valor, se pulsó **Run**), y los que no se pueden comprobar se tachan a mano pulsando su número. El paso al que se refiere cada punto lleva ese número encima; pulsar el texto de un punto lleva a su paso. La guía se cierra con su aspa y no se guarda.

**Bloques propios.** Con uno o más pasos seleccionados aparece **Save as block**, que pide un nombre. El bloque guarda los pasos tal como están, con sus peticiones ya elegidas, sus ajustes y los cables entre ellos, y sale en la galería bajo **My blocks**. Se guarda en la colección, así que le llega a todo el equipo. Se borra desde la propia galería, con una segunda pulsación para confirmar. Insertar un bloque se deshace de una vez con `Ctrl+Z`.

### La ayuda

El botón **?** de la barra abre un panel con lo necesario para leer un flow: qué significa cada forma, cómo se monta, cómo se ejecuta y las teclas. Además, cada puerto dice para qué sirve al dejar el ratón encima.

### Los puertos y los cables

- **Triángulo**: el orden de los pasos. **Círculo**: un valor que sale. **Cuadrado**: un valor que entra. Solo están rellenos si tienen un cable.
- Mientras se arrastra un cable solo se iluminan los puertos donde encaja.
- Conectar un valor a un paso que no tiene orden propio ya hace que se ejecute después: no hace falta unir además los triángulos.
- Los cables van siempre en ángulo recto. Se les da forma arrastrando cualquier tramo; tirar del primero o del último crea un codo nuevo. Doble clic en un cable lo devuelve a su forma normal.

### Moverse por el lienzo

| Acción | Cómo |
|---|---|
| Seleccionar varios pasos | Arrastrar sobre el fondo, o `Ctrl` + clic |
| Mover el lienzo | Arrastrar con el botón derecho o central, o `Alt` + arrastrar |
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
| `canvas/` | El lienzo sin React: descripción de cada pieza y sus puertos (`pieces.js`), edición del flow (`editing.js`), trazado de cables (`routing.js`), colocación sin solapes y ordenar (`layout.js`), deshacer (`history.js`), lectura de las peticiones de la colección (`requests.js`) y contenido de los selectores (`pickers.js`). Más los componentes `Piece`, `Cables`, `Picker` y `Toolbar` |
| `FlowCanvas/` | El componente que junta lo anterior: selección, arrastres, zoom, teclado y soltar desde la barra lateral |
| `blocks/` | Los bloques: el catálogo de los que trae Michi (`catalog.js`), cómo se montan, se insertan y se guardan los propios (`building.js`), la guía y cómo sabe que un punto está hecho (`guide.js`), los bloques de cada colección (`store.js`) y los componentes `Gallery`, `GuidePanel`, `HelpPanel` y `SaveBlockModal` |
| `run/` | La ejecución en la app: `host.js` envía cada petición con `sendNetworkRequest`, como hace Bruno; `controller.js` pide la confirmación de entorno sensible y traduce los eventos del motor; `session.js` guarda el estado de cada ejecución y la salida; `OutputPanel/` la pinta |

- Un flow es un JSON con `nodes` (tipo, posición y ajustes) y `edges` (de qué puerto a qué puerto, y los codos si se les ha dado forma).
- Cada flow tiene su `version`. Un flow de una versión que la app no conoce no se abre ni se sobrescribe.
- Un bloque propio es el mismo JSON que un flow, sin **Start** y con las posiciones contadas desde su esquina. Un bloque de Michi se describe en `catalog.js` con sus pasos, sus cables y los puntos de su guía; un test comprueba que todos se montan enteros, que no se solapan y que tienen cada texto en español.
- Los textos que la interfaz en español no puede cambiar en pantalla, porque van dentro de un desplegable o de una caja, pasan por `language.js`.
- Pruebas: `*.spec.js` junto a cada módulo. El motor y la lógica del lienzo se prueban sin interfaz; `FlowCanvas` y `run/controller` con la app simulada.
