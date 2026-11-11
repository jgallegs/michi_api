// Spanish for the guided course of Flows (components/fork/Flows/course/lessons.js): one entry per
// title and per paragraph, with the exact English text as the key.
export const FLOWS_COURSE = {
  'The canvas':
    'El lienzo',
  'What a flow is':
    'Qué es un flow',
  'A flow is a list of things to do with the requests of your collection, in order: send this one, look at what it answers, send the next one with a value of the first, repeat it five times.':
    'Un flow es una lista de cosas que hacer con las peticiones de tu colección, en orden: envía esta, mira lo que contesta, envía la siguiente con un valor de la primera, repítelo cinco veces.',
  'You build it by joining steps on a canvas. Nobody writes code: every step is a box with its settings, and the cables between boxes say what goes after what.':
    'Se monta uniendo pasos en un lienzo. Nadie escribe código: cada paso es una caja con sus ajustes, y los cables entre cajas dicen qué va después de qué.',
  'A flow is saved in the collection, so the whole team gets it. The requests it sends are the same ones you already have, with their environment and their scripts.':
    'Un flow se guarda en la colección, así que le llega a todo el equipo. Las peticiones que envía son las mismas que ya tienes, con su entorno y sus scripts.',
  'Moving around the canvas':
    'Moverse por el lienzo',
  'Drag with the right button to move the canvas, and turn the wheel to zoom in and out. The button with four corners in the bar shows the whole flow.':
    'Arrastra con el botón derecho para mover el lienzo y gira la rueda para acercar y alejar. El botón de las cuatro esquinas de la barra enseña el flow entero.',
  'Drag a step by its title to move it. Drag over the background to select several, or click them holding Ctrl. Steps never end up on top of each other: they step aside when you drop them.':
    'Arrastra un paso por su título para moverlo. Arrastra sobre el fondo para seleccionar varios, o púlsalos con Ctrl. Los pasos nunca quedan unos encima de otros: se apartan al soltarlos.',
  'Ctrl+Z undoes and Ctrl+Y redoes. Tidy up puts every step in columns, following the order of the flow.':
    'Ctrl+Z deshace y Ctrl+Y rehace. Ordenar coloca todos los pasos por columnas, siguiendo el orden del flow.',
  'The three shapes':
    'Las tres formas',
  'A triangle is the order. A cable from the triangle of one step to the triangle of another means: when this one finishes, that one runs.':
    'Un triángulo es el orden. Un cable del triángulo de un paso al triángulo de otro significa: cuando este termine, se ejecuta aquel.',
  'A circle is a value that comes out of a step, like a field of a response. A square is a value a step needs, like a variable of its request.':
    'Un círculo es un valor que sale de un paso, como un campo de una respuesta. Un cuadrado es un valor que un paso necesita, como una variable de su petición.',
  'A shape is filled only while it has a cable. Rest the pointer on any of them and it tells you what it is for.':
    'Una forma está rellena solo mientras tiene un cable. Deja el ratón sobre cualquiera y te dice para qué sirve.',
  'Adding steps, requests and blocks':
    'Añadir pasos, peticiones y bloques',
  'There are three kinds of things to add, each with its own list: steps that do something (If, Repeat, Wait), requests of your collection, and blocks, which are several steps already joined.':
    'Hay tres clases de cosas que añadir, cada una con su lista: pasos que hacen algo (Si, Repetir, Esperar), peticiones de tu colección y bloques, que son varios pasos ya unidos.',
  'The bar has a button for each. A right click on an empty spot offers the three and drops what you pick right there.':
    'La barra tiene un botón para cada una. Un clic derecho en un hueco ofrece las tres y deja lo que elijas ahí mismo.',
  'The quickest way: pull a cable out of a triangle and let go on empty space. The list opens, and what you pick is born already joined. You can also drag a request from the sidebar onto the canvas.':
    'Lo más rápido: tira de un triángulo y suelta el cable en vacío. Se abre la lista, y lo que elijas nace ya unido. También puedes arrastrar una petición desde la barra lateral al lienzo.',
  'Your first flow: several requests in a row':
    'Tu primer flow: varias peticiones seguidas',
  'Press the button below. Three request steps land on the canvas, joined one after the other, and a guide opens with what is left to do.':
    'Pulsa el botón de abajo. Caen en el lienzo tres pasos de petición, unidos uno detrás de otro, y se abre una guía con lo que falta.',
  'Each step asks which request it sends. Click inside it and choose one; for a first try, pick requests that only read, like a GET.':
    'Cada paso pregunta qué petición envía. Pulsa dentro y elige una; para una primera prueba, coge peticiones que solo leen, como un GET.',
  'The points of the guide tick themselves as you go, and the canvas moves to the next step on its own.':
    'Los puntos de la guía se tachan solos según avanzas, y el lienzo se mueve por sí mismo hasta el paso siguiente.',
  'Running a flow':
    'Ejecutar un flow',
  'Run goes through the whole flow from Start. Step runs one step and waits, to follow it slowly. Stop cuts the run, also a request on its way.':
    'Ejecutar recorre el flow entero desde Inicio. Paso ejecuta un paso y espera, para seguirlo despacio. Parar corta la ejecución, también una petición a medias.',
  'The environment the flow runs against is always next to Run. If it is red, it is a sensitive environment and the app asks you before sending anything.':
    'El entorno contra el que se ejecuta el flow está siempre junto a Ejecutar. Si sale en rojo es un entorno sensible y la app te pregunta antes de enviar nada.',
  'A 404 or a 500 does not stop a flow: it is an answer, and the flow can react to it. What stops it is not being able to send a request at all. Then it waits on that step, and Continue goes on from there once it is fixed.':
    'Un 404 o un 500 no detienen un flow: es una respuesta, y el flow puede reaccionar a ella. Lo que lo detiene es no poder enviar una petición. Entonces espera en ese paso, y Continuar sigue desde ahí cuando esté arreglado.',
  'The output and the report of a run':
    'La salida y el informe de una ejecución',
  'On the right, Output tells what each run did: the status and the time of every request, the round of every loop, what went into each list and how it ended. A line with an arrow unfolds to show the whole response.':
    'A la derecha, Salida cuenta lo que hizo cada ejecución: el código y el tiempo de cada petición, la vuelta de cada bucle, lo que entró en cada lista y cómo terminó. Una línea con flecha se despliega para ver la respuesta entera.',
  'Each run starts with the name of the flow. The small table button on that line opens the report of that run: every step with its result, ready to copy into a mail or to save as a page.':
    'Cada ejecución empieza con el nombre del flow. El botón de tabla de esa línea abre el informe de esa ejecución: cada paso con su resultado, listo para copiar en un correo o guardar como una página.',
  'The output keeps every run since you opened the app, until you press Clear.':
    'La salida conserva todas las ejecuciones desde que abriste la app, hasta que pulses Limpiar.',
  'Values':
    'Valores',
  'Using a value of one response in the next call':
    'Usar un valor de una respuesta en la llamada siguiente',
  'This is what flows are used for the most: the token of a login, the number of what was just created.':
    'Es para lo que más se usan los flows: el token de un login, el número de lo que se acaba de crear.',
  'A request step shows on its left the values it uses, which are the variables written in the request, and on its right what it returns.':
    'Un paso de petición enseña a su izquierda los valores que usa, que son las variables escritas en la petición, y a su derecha lo que devuelve.',
  'To hand a value over, click the square of the step that needs it and choose where it comes from. The box becomes a tag with the name of the step and the field.':
    'Para pasar un valor, pulsa el cuadrado del paso que lo necesita y elige de dónde viene. La caja se convierte en una ficha con el nombre del paso y del campo.',
  'Picking one field of a response':
    'Coger un campo de una respuesta',
  'Whole response is the entire body. For a single piece of it, press Add a field on the request and choose it: it becomes one more output of the step.':
    'Respuesta completa es el cuerpo entero. Para un solo dato, pulsa Añadir un campo en la petición y elígelo: pasa a ser una salida más del paso.',
  'The list already knows the fields without running anything. It remembers the ones seen the last time that request was sent, from a flow or from its own tab; it reads the ones the Swagger of the service declares, if it is open in API Specs; and the ones the script of the request mentions.':
    'La lista ya conoce los campos sin ejecutar nada. Recuerda los que se vieron la última vez que se envió esa petición, desde un flow o desde su pestaña; lee los que declara el Swagger del servicio, si está abierto en API Specs; y los que menciona el script de la petición.',
  'If a field is still not there, type its name: data.number.':
    'Si un campo sigue sin salir, escribe su nombre: datos.numero.',
  'Text, or a value of another step':
    'Texto, o un valor de otro paso',
  'What you type inside a box is text as it is. If you type token, the step uses the word token, not the field.':
    'Lo que escribes dentro de una caja es texto tal cual. Si escribes token, el paso usa la palabra token, no el campo.',
  'To use the field you have to join it. While you type, the canvas offers underneath the values called like that: pick one, or press Enter if the name matches, and the box becomes a tag.':
    'Para usar el campo hay que unirlo. Mientras escribes, el lienzo ofrece debajo los valores que se llaman así: elige uno, o pulsa Intro si el nombre coincide, y la caja se convierte en ficha.',
  'In a text you can also write a name between double braces, and it is replaced by the variable of the flow or of the environment with that name.':
    'En un texto también puedes escribir un nombre entre dobles llaves, y se sustituye por la variable del flow o del entorno que se llame así.',
  'When the value is inside a list':
    'Cuando el valor está dentro de una lista',
  'A response often carries lists: the parcels of a shipment, the lines of an order. A field inside a list reads the first item, and says so with a small tag: #1.':
    'Una respuesta trae a menudo listas: los bultos de un envío, las líneas de un pedido. Un campo dentro de una lista lee el primer elemento, y lo dice con una ficha pequeña: #1.',
  'Click that tag to read another one: the first, the last, or the position you type. Typing 3 reads the third.':
    'Pulsa esa ficha para leer otro: el primero, el último o la posición que escribas. Si escribes 3 lee el tercero.',
  'You can also ask for the item that holds something: type state=open and the field reads the first item whose state is open.':
    'También puedes pedir el elemento que tiene algo: escribe estado=abierto y el campo lee el primer elemento cuyo estado es abierto.',
  'To do something with every item, use the For each item step, a few lessons ahead.':
    'Para hacer algo con todos los elementos, usa el paso Por cada elemento, unas lecciones más adelante.',
  'Set variable: a value with a name':
    'Guardar variable: un valor con nombre',
  'Set variable keeps a value under a name. From then on, any later step can use it by writing that name between double braces in its texts, or by joining its output.':
    'Guardar variable guarda un valor con un nombre. Desde entonces, cualquier paso posterior puede usarlo escribiendo ese nombre entre dobles llaves en sus textos, o uniendo su salida.',
  'It is useful for a value used in many places, or to give a clear name to something that comes out of a long response.':
    'Sirve para un valor que se usa en muchos sitios, o para dar un nombre claro a algo que sale de una respuesta larga.',
  'Asking before running':
    'Preguntar antes de ejecutar',
  'A flow can ask what it needs to know before it runs: how many shipments, which product. On the Start step, press Ask before running, write the question and, if you want, its usual answer.':
    'Un flow puede preguntar lo que necesita saber antes de ejecutarse: cuántos envíos, qué producto. En el paso Inicio, pulsa Preguntar antes de ejecutar, escribe la pregunta y, si quieres, su respuesta habitual.',
  'Each question is a value Start hands out: join it to whatever needs it, like the number of rounds of a Repeat.':
    'Cada pregunta es un valor que entrega Inicio: únelo a lo que lo necesite, como el número de vueltas de un Repetir.',
  'When someone presses Run, a small window asks the questions. That way anybody can use the flow without touching the canvas.':
    'Cuando alguien pulsa Ejecutar, una ventana pequeña hace las preguntas. Así cualquiera puede usar el flow sin tocar el lienzo.',
  'Deciding':
    'Decidir',
  'If: choosing a way':
    'Si: elegir un camino',
  'If has two outputs, Yes and No, and the flow follows one of them. The cable that leaves Yes is green and the one that leaves No is red.':
    'Si tiene dos salidas, Sí y No, y el flow sigue por una de ellas. El cable que sale de Sí es verde y el que sale de No es rojo.',
  'It can check three things: that the last response was fine, that its status code is a given one, or that two values compare the way you say.':
    'Puede comprobar tres cosas: que la última respuesta fue correcta, que su código de estado es uno concreto, o que dos valores se comparan como tú digas.',
  'This block stops the flow when a call fails: from No hangs a Stop step, and from Yes you go on with whatever comes next.':
    'Este bloque para el flow cuando una llamada falla: de No cuelga un paso Parar, y de Sí sigues con lo que venga después.',
  'Checking a value of the response':
    'Comprobar un valor de la respuesta',
  'Set If to compare two values. Join the first one, This, to a field of the response, and type in the second what it should be.':
    'Pon Si a comparar dos valores. Une el primero, Esto, a un campo de la respuesta, y escribe en el segundo lo que debería valer.',
  'There are many ways to compare: is equal to, is greater than, contains, starts with, is empty. Choose the one that reads like what you mean.':
    'Hay muchas formas de comparar: es igual a, es mayor que, contiene, empieza por, está vacío. Elige la que se lea como lo que quieres decir.',
  'Validate: a 200 with an error inside':
    'Validar: un 200 con un error dentro',
  'Some services answer 200 and carry inside a code that says nothing was done. Validate tells those answers apart.':
    'Hay servicios que contestan 200 y dentro traen un código que dice que no se hizo nada. Validar distingue esas respuestas.',
  'It reads as a sentence: Not valid if this value is equal to that one. Join the value to the field that holds the code, choose the comparison and type the value.':
    'Se lee como una frase: No válido si este valor es igual a aquel. Une el valor al campo que lleva el código, elige la comparación y escribe el valor.',
  'The flow goes on through Valid or through Not valid. What hangs from Valid never sees the bad answers.':
    'El flow sigue por Válido o por No válido. Lo que cuelga de Válido nunca ve las respuestas malas.',
  'The tests of your requests':
    'Los tests de tus peticiones',
  'If a request has tests or assertions, they run when a flow sends it, exactly as when you send it by hand.':
    'Si una petición tiene tests o aserciones, se ejecutan cuando un flow la envía, igual que cuando la envías a mano.',
  'The output tells how many passed next to each answer, and at the end of the run, the total. A request with a test that fails stands out, and unfolding its line shows which one.':
    'La salida cuenta cuántos pasaron junto a cada respuesta y, al final de la ejecución, el total. Una petición con un test que falla destaca, y al desplegar su línea se ve cuál.',
  'If can follow them too: choose The tests of the response pass, and the flow goes through Yes only when none fails.':
    'Si también puede seguirlos: elige Los tests de la respuesta pasan, y el flow va por Sí solo cuando no falla ninguno.',
  'Note and Stop':
    'Nota y Parar',
  'Note writes a message in the output and goes on. Use it to leave a trace of what happened: a value, a warning, which way the flow took.':
    'Nota escribe un mensaje en la salida y sigue. Úsala para dejar rastro de lo que pasó: un valor, un aviso, por qué camino fue el flow.',
  'Stop ends the flow right there, with a message. Nothing after it runs.':
    'Parar termina el flow ahí mismo, con un mensaje. Nada de lo que viene detrás se ejecuta.',
  'Wait: giving the server a moment':
    'Esperar: dar un momento al servidor',
  'Wait pauses the flow for the seconds you say. It is for when what one request starts needs time before the next one can see it.':
    'Esperar detiene el flow los segundos que digas. Es para cuando lo que una petición pone en marcha necesita tiempo antes de que la siguiente lo vea.',
  'The number of seconds can also arrive through a cable, if it depends on something.':
    'El número de segundos también puede llegar por un cable, si depende de algo.',
  'Repeating':
    'Repetir',
  'Repeat: the same thing several times':
    'Repetir: lo mismo varias veces',
  'Repeat runs what hangs from On each round as many times as you say. What it repeats is drawn inside a frame, with the number of rounds.':
    'Repetir ejecuta lo que cuelga de En cada vuelta tantas veces como digas. Lo que repite se dibuja dentro de un marco, con el número de vueltas.',
  'A round ends when its way has nothing else to run, or when it reaches End of round. When there are no rounds left, the flow goes on through When finished.':
    'Una vuelta termina cuando su camino no tiene nada más que ejecutar, o cuando llega a Fin de vuelta. Cuando no quedan vueltas, el flow sigue por Al terminar.',
  'Round number is a value you can use inside the loop, to make each round different.':
    'Número de vuelta es un valor que puedes usar dentro del bucle, para que cada vuelta sea distinta.',
  'List and Add to list':
    'Lista y Añadir a lista',
  'A List starts empty on every run. Add to list puts something in it each time the flow goes through: one value, or several fields with the names you give them.':
    'Una Lista empieza vacía en cada ejecución. Añadir a lista mete algo en ella cada vez que el flow pasa: un valor, o varios campos con los nombres que les pongas.',
  'Add to list chooses its list by name inside the step. If the flow has only one, it is already chosen.':
    'Añadir a lista elige su lista por nombre dentro del paso. Si el flow solo tiene una, ya viene elegida.',
  'The List step shows inside what it holds as the flow runs. View report opens it as a table, one row per item, to copy into a spreadsheet or a mail, or to save as a page.':
    'El paso Lista enseña dentro lo que guarda mientras el flow se ejecuta. Ver informe la abre como una tabla, una fila por elemento, para copiarla en una hoja de cálculo o en un correo, o guardarla como una página.',
  'Keeping only the answers that are valid':
    'Guardar solo las respuestas que valen',
  'Put a Validate between the request and Add to list, and join Add to list to Valid.':
    'Pon un Validar entre la petición y Añadir a lista, y une Añadir a lista a Válido.',
  'When an answer is not valid, nothing hangs from that way, so the round ends there and the next one starts. The bad answer never reaches the list and the flow goes on.':
    'Cuando una respuesta no vale, de ese camino no cuelga nada, así que la vuelta acaba ahí y empieza la siguiente. La respuesta mala nunca llega a la lista y el flow sigue.',
  'For each item: once per item of a list':
    'Por cada elemento: una vez por cada elemento de una lista',
  'For each item goes through a list and runs its round once for every item. The list can be a field of a response, a List of the flow or a table of data.':
    'Por cada elemento recorre una lista y ejecuta su vuelta una vez por cada elemento. La lista puede ser un campo de una respuesta, una Lista del flow o una tabla de datos.',
  'On each round it hands out the item and, with Add a field, the fields of the item you need. Join them to the request of the round.':
    'En cada vuelta entrega el elemento y, con Añadir un campo, los campos del elemento que necesites. Únelos a la petición de la vuelta.',
  'A typical use: one request returns the shipments, and another one is sent for each of them.':
    'Un uso típico: una petición devuelve los envíos, y se envía otra por cada uno de ellos.',
  'A table of data: each round with its own values':
    'Una tabla de datos: cada vuelta con sus valores',
  'A Data table step holds rows that you paste from a spreadsheet. The first line holds the names of the columns.':
    'Un paso Tabla de datos guarda filas que pegas desde una hoja de cálculo. La primera línea lleva los nombres de las columnas.',
  'Join it to a For each item step: each round gets one row, and its columns are the fields to join to the request.':
    'Únela a un paso Por cada elemento: cada vuelta recibe una fila, y sus columnas son los campos que unir a la petición.',
  'That is how the same request is sent many times with different data: a reference and a phone number per row, for example.':
    'Así se envía la misma petición muchas veces con datos distintos: una referencia y un teléfono por fila, por ejemplo.',
  'Leave loop: retrying until it works':
    'Salir del bucle: reintentar hasta que funcione',
  'Leave loop ends the loop it is in, even if it had rounds left, and the flow goes on through When finished.':
    'Salir del bucle termina el bucle en el que está, aunque le queden vueltas, y el flow sigue por Al terminar.',
  'With it a Repeat becomes a retry: send the request; if it went fine, leave; if not, wait a little and let the round end.':
    'Con él un Repetir se convierte en un reintento: envía la petición; si fue bien, sal; si no, espera un poco y deja que la vuelta termine.',
  'After the loop, an If checks whether it finally worked or the tries ran out.':
    'Después del bucle, un Si comprueba si al final funcionó o se acabaron los intentos.',
  'Waiting until something is ready':
    'Esperar a que algo esté listo',
  'The same idea serves to wait for a process: each round asks how it is going and, when the value is the one that means done, leaves the loop.':
    'La misma idea sirve para esperar a un proceso: cada vuelta pregunta cómo va y, cuando el valor es el que significa terminado, sale del bucle.',
  'Between one question and the next there is a Wait, so the service is not asked without pause.':
    'Entre una pregunta y la siguiente hay un Esperar, para no preguntar al servicio sin pausa.',
  'Going through the pages of a result':
    'Recorrer las páginas de un resultado',
  'When a list comes in pages, a Repeat asks for one page per round and Add to list keeps what each one brings.':
    'Cuando un listado viene por páginas, un Repetir pide una página por vuelta y Añadir a lista guarda lo que trae cada una.',
  'The number of the page is the Round number of the loop: join it to the variable of the request that says which page to bring.':
    'El número de página es el Número de vuelta del bucle: únelo a la variable de la petición que dice qué página traer.',
  'Typical cases':
    'Casos típicos',
  'Checking that several services answer':
    'Comprobar que varios servicios responden',
  'A chain of requests, each followed by an If that checks it went fine. The first one that fails stops the flow with a message that says which.':
    'Una cadena de peticiones, cada una seguida de un Si que comprueba que fue bien. La primera que falla para el flow con un mensaje que dice cuál.',
  'It is a quick way to know, before a test session, that everything you depend on is up.':
    'Es una forma rápida de saber, antes de una sesión de pruebas, que todo de lo que dependes está en pie.',
  'Create, check and delete':
    'Crear, comprobar y borrar',
  'The full life of something: one request creates it, another reads it to see it is there, and a third deletes it.':
    'La vida completa de algo: una petición lo crea, otra lo lee para ver que está y una tercera lo borra.',
  'The identifier that the first one returns travels by cable to the other two. It is the pattern of most end to end tests.':
    'El identificador que devuelve la primera viaja por cable a las otras dos. Es el patrón de la mayoría de las pruebas de punta a punta.',
  'Creating something only if it is not there':
    'Crear algo solo si no está',
  'First a request looks for it. An If checks whether the status code is 404: if it is, the flow creates it; if not, it updates the one that exists.':
    'Primero una petición lo busca. Un Si comprueba si el código de estado es 404: si lo es, el flow lo crea; si no, actualiza el que existe.',
  'It shows that an error status is just one more answer, and a flow can take a different way because of it.':
    'Enseña que un código de error es una respuesta más, y que un flow puede tomar otro camino por ella.',
  'Working well':
    'Trabajar bien',
  'Reading the cables':
    'Leer los cables',
  'The thick cables are the order, and they carry a mark that says which way they run: orange the usual one, green what leaves Yes or Valid, red what leaves No or Not valid.':
    'Los cables gruesos son el orden, y llevan una marca que dice hacia dónde van: naranja lo normal, verde lo que sale de Sí o Válido, rojo lo que sale de No o No válido.',
  'The cables of the values are not drawn until you rest the pointer on a step or select it: then its own appear, thin and in the colour of the step the value comes from. They are not needed to read the flow, because each input already says it in its tag.':
    'Los cables de los valores no se dibujan hasta que dejas el ratón sobre un paso o lo seleccionas: entonces salen los suyos, finos y del color del paso del que viene el valor. No hacen falta para leer el flow, porque cada entrada ya lo dice en su ficha.',
  'The eye in the bar shows them all. Drag any stretch of a cable to shape it, and double click to put it back.':
    'El ojo de la barra los enseña todos. Arrastra cualquier tramo de un cable para darle forma, y haz doble clic para devolverlo a su sitio.',
  'Trying one step without running everything':
    'Probar un paso sin ejecutarlo todo',
  'While you build a flow that creates things, running it whole for every change creates them again and again.':
    'Mientras montas un flow que crea cosas, ejecutarlo entero a cada cambio las crea una y otra vez.',
  'Right click on a step: Run only this step runs it alone, and Run from this step runs from it to the end. Both use what the last run left, so the values of the steps before are still there.':
    'Clic derecho sobre un paso: Ejecutar solo este paso lo ejecuta a él solo, y Ejecutar desde este paso ejecuta desde él hasta el final. Los dos usan lo que dejó la última ejecución, así que los valores de los pasos anteriores siguen ahí.',
  'The first time, run the whole flow once so there is something to start from.':
    'La primera vez, ejecuta el flow entero una vez para que haya de dónde partir.',
  'Your own blocks':
    'Tus propios bloques',
  'When you have a few steps you are going to repeat in other flows, like your login with its request already chosen, select them and press Save as block.':
    'Cuando tengas unos pasos que vas a repetir en otros flows, como tu login con su petición ya elegida, selecciónalos y pulsa Guardar como bloque.',
  'From then on the block is in the gallery, under My blocks, for you and for everyone who has the collection. It keeps the requests, the settings and the cables between its steps.':
    'Desde entonces el bloque está en la galería, bajo Mis bloques, para ti y para todo el que tenga la colección. Guarda las peticiones, los ajustes y los cables entre sus pasos.',
  'A flow inside another flow':
    'Un flow dentro de otro',
  'Run a flow uses another flow of the collection as one step. If the original changes, it changes everywhere it is used, which a copied block does not do.':
    'Ejecutar un flow usa otro flow de la colección como un paso. Si el original cambia, cambia en todos los sitios donde se usa, cosa que un bloque copiado no hace.',
  'The questions that flow asks at Start are the inputs of the step, and what it leaves with a name, its variables and its lists, are the outputs.':
    'Las preguntas que ese flow hace en Inicio son las entradas del paso, y lo que deja con nombre, sus variables y sus listas, son las salidas.',
  'The output tells what happens inside, with the name of the flow in front of each line.':
    'La salida cuenta lo que pasa dentro, con el nombre del flow delante de cada línea.',
  'Real data and sensitive environments':
    'Datos de verdad y entornos sensibles',
  'A flow sends real requests. One that creates shipments in a loop creates real shipments in the environment that is chosen: look at the name next to Run before pressing it.':
    'Un flow envía peticiones de verdad. Uno que crea envíos en bucle crea envíos reales en el entorno elegido: mira el nombre que hay junto a Ejecutar antes de pulsarlo.',
  'In an environment marked as sensitive the name is red and the app asks for confirmation once per run. If you change the environment before continuing, it asks again.':
    'En un entorno marcado como sensible el nombre sale en rojo y la app pide confirmación una vez por ejecución. Si cambias de entorno antes de continuar, vuelve a pedirla.',
  'Saving and sharing':
    'Guardar y compartir',
  'Save keeps the flow in the collection, in a file the official Bruno ignores. With the next push, the team has it.':
    'Guardar deja el flow en la colección, en un fichero que el Bruno oficial ignora. Con el siguiente push, el equipo lo tiene.',
  'In the Flows section of the sidebar you can search a flow by name, duplicate it to start from a copy, and see with a dot how its last run went.':
    'En la sección Flujos de la barra lateral puedes buscar un flow por su nombre, duplicarlo para partir de una copia y ver con un punto cómo fue su última ejecución.',
  'If a pull brings another version of a flow you are editing, the bar tells you, and lets you discard your changes to see the one that arrived.':
    'Si un pull trae otra versión de un flow que estás editando, la barra te avisa y te deja descartar tus cambios para ver la que llegó.',
  'When something does not come out':
    'Cuando algo no sale',
  'A faded step is not joined to Start and does not run: pull a cable from the triangle of the step before it. It is also a way to leave spare pieces on the canvas.':
    'Un paso atenuado no está unido a Inicio y no se ejecuta: saca un cable del triángulo del paso anterior hasta él. También es una forma de dejar piezas de reserva en el lienzo.',
  'A step with an orange warning says underneath what it is missing. While there are warnings, Run sends nothing and writes them in the output.':
    'Un paso con un aviso naranja dice debajo lo que le falta. Mientras haya avisos, Ejecutar no envía nada y los escribe en la salida.',
  'If a step lost its request because it was moved or renamed in the collection, click inside the step and choose it again.':
    'Si un paso perdió su petición porque se movió o se renombró en la colección, pulsa dentro del paso y elígela otra vez.'
};
