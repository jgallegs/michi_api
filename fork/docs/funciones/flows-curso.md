# Curso guiado de Flows

El mismo curso que trae Michi dentro del lienzo, para leerlo seguido. En la app se abre con el botón **?** de la barra de un flow y **Curso guiado**; cada lección tiene allí un botón para practicar lo que explica sobre el propio lienzo.

Son 6 capítulos y 37 lecciones. Para una vista rápida está la [guía rápida](flows-guia.md); para el detalle de cada cosa, [flows.md](flows.md).

| Capítulo | Lecciones |
|---|---|
| 1. El lienzo | Qué es un flow · Moverse por el lienzo · Las tres formas · Añadir pasos, peticiones y bloques · Tu primer flow: varias peticiones seguidas · Ejecutar un flow · La salida y el informe de una ejecución |
| 2. Valores | Usar un valor de una respuesta en la llamada siguiente · Coger un campo de una respuesta · Texto, o un valor de otro paso · Cuando el valor está dentro de una lista · Guardar variable: un valor con nombre · Preguntar antes de ejecutar |
| 3. Decidir | Si: elegir un camino · Comprobar un valor de la respuesta · Validar: un 200 con un error dentro · Los tests de tus peticiones · Nota y Parar · Esperar: dar un momento al servidor |
| 4. Repetir | Repetir: lo mismo varias veces · Lista y Añadir a lista · Guardar solo las respuestas que valen · Por cada elemento: una vez por cada elemento de una lista · Una tabla de datos: cada vuelta con sus valores · Salir del bucle: reintentar hasta que funcione · Esperar a que algo esté listo · Recorrer las páginas de un resultado |
| 5. Casos típicos | Comprobar que varios servicios responden · Crear, comprobar y borrar · Crear algo solo si no está |
| 6. Trabajar bien | Leer los cables · Probar un paso sin ejecutarlo todo · Tus propios bloques · Un flow dentro de otro · Datos de verdad y entornos sensibles · Guardar y compartir · Cuando algo no sale |

## 1. El lienzo

### 1.1 Qué es un flow

Un flow es una lista de cosas que hacer con las peticiones de tu colección, en orden: envía esta, mira lo que contesta, envía la siguiente con un valor de la primera, repítelo cinco veces.

Se monta uniendo pasos en un lienzo. Nadie escribe código: cada paso es una caja con sus ajustes, y los cables entre cajas dicen qué va después de qué.

Un flow se guarda en la colección, así que le llega a todo el equipo. Las peticiones que envía son las mismas que ya tienes, con su entorno y sus scripts.

### 1.2 Moverse por el lienzo

Arrastra con el botón derecho para mover el lienzo y gira la rueda para acercar y alejar. El botón de las cuatro esquinas de la barra enseña el flow entero.

Arrastra un paso por su título para moverlo. Arrastra sobre el fondo para seleccionar varios, o púlsalos con Ctrl. Los pasos nunca quedan unos encima de otros: se apartan al soltarlos.

Ctrl+Z deshace y Ctrl+Y rehace. Ordenar coloca todos los pasos por columnas, siguiendo el orden del flow.

### 1.3 Las tres formas

Un triángulo es el orden. Un cable del triángulo de un paso al triángulo de otro significa: cuando este termine, se ejecuta aquel.

Un círculo es un valor que sale de un paso, como un campo de una respuesta. Un cuadrado es un valor que un paso necesita, como una variable de su petición.

Una forma está rellena solo mientras tiene un cable. Deja el ratón sobre cualquiera y te dice para qué sirve.

### 1.4 Añadir pasos, peticiones y bloques

Hay tres clases de cosas que añadir, cada una con su lista: pasos que hacen algo (Si, Repetir, Esperar), peticiones de tu colección y bloques, que son varios pasos ya unidos.

La barra tiene un botón para cada una. Un clic derecho en un hueco ofrece las tres y deja lo que elijas ahí mismo.

Lo más rápido: tira de un triángulo y suelta el cable en vacío. Se abre la lista, y lo que elijas nace ya unido. También puedes arrastrar una petición desde la barra lateral al lienzo.

### 1.5 Tu primer flow: varias peticiones seguidas

Pulsa el botón de abajo. Caen en el lienzo tres pasos de petición, unidos uno detrás de otro, y se abre una guía con lo que falta.

Cada paso pregunta qué petición envía. Pulsa dentro y elige una; para una primera prueba, coge peticiones que solo leen, como un GET.

Los puntos de la guía se tachan solos según avanzas, y el lienzo se mueve por sí mismo hasta el paso siguiente.

**Para practicar:** bloque «Llamar a varias peticiones seguidas».

### 1.6 Ejecutar un flow

Ejecutar recorre el flow entero desde Inicio. Paso ejecuta un paso y espera, para seguirlo despacio. Parar corta la ejecución, también una petición a medias.

El entorno contra el que se ejecuta el flow está siempre junto a Ejecutar. Si sale en rojo es un entorno sensible y la app te pregunta antes de enviar nada.

Un 404 o un 500 no detienen un flow: es una respuesta, y el flow puede reaccionar a ella. Lo que lo detiene es no poder enviar una petición. Entonces espera en ese paso, y Continuar sigue desde ahí cuando esté arreglado.

### 1.7 La salida y el informe de una ejecución

A la derecha, Salida cuenta lo que hizo cada ejecución: el código y el tiempo de cada petición, la vuelta de cada bucle, lo que entró en cada lista y cómo terminó. Una línea con flecha se despliega para ver la respuesta entera.

Cada ejecución empieza con el nombre del flow. El botón de tabla de esa línea abre el informe de esa ejecución: cada paso con su resultado, listo para copiar en un correo o guardar como una página.

La salida conserva todas las ejecuciones desde que abriste la app, hasta que pulses Limpiar.

## 2. Valores

### 2.1 Usar un valor de una respuesta en la llamada siguiente

Es para lo que más se usan los flows: el token de un login, el número de lo que se acaba de crear.

Un paso de petición enseña a su izquierda los valores que usa, que son las variables escritas en la petición, y a su derecha lo que devuelve.

Para pasar un valor, pulsa el cuadrado del paso que lo necesita y elige de dónde viene. La caja se convierte en una ficha con el nombre del paso y del campo.

**Para practicar:** bloque «Usar un dato de una respuesta en la siguiente llamada».

### 2.2 Coger un campo de una respuesta

Respuesta completa es el cuerpo entero. Para un solo dato, pulsa Añadir un campo en la petición y elígelo: pasa a ser una salida más del paso.

La lista ya conoce los campos sin ejecutar nada. Recuerda los que se vieron la última vez que se envió esa petición, desde un flow o desde su pestaña; lee los que declara el Swagger del servicio, si está abierto en API Specs; y los que menciona el script de la petición.

Si un campo sigue sin salir, escribe su nombre: datos.numero.

### 2.3 Texto, o un valor de otro paso

Lo que escribes dentro de una caja es texto tal cual. Si escribes token, el paso usa la palabra token, no el campo.

Para usar el campo hay que unirlo. Mientras escribes, el lienzo ofrece debajo los valores que se llaman así: elige uno, o pulsa Intro si el nombre coincide, y la caja se convierte en ficha.

En un texto también puedes escribir un nombre entre dobles llaves, y se sustituye por la variable del flow o del entorno que se llame así.

### 2.4 Cuando el valor está dentro de una lista

Una respuesta trae a menudo listas: los bultos de un envío, las líneas de un pedido. Un campo dentro de una lista lee el primer elemento, y lo dice con una ficha pequeña: #1.

Pulsa esa ficha para leer otro: el primero, el último o la posición que escribas. Si escribes 3 lee el tercero.

También puedes pedir el elemento que tiene algo: escribe estado=abierto y el campo lee el primer elemento cuyo estado es abierto.

Para hacer algo con todos los elementos, usa el paso Por cada elemento, unas lecciones más adelante.

### 2.5 Guardar variable: un valor con nombre

Guardar variable guarda un valor con un nombre. Desde entonces, cualquier paso posterior puede usarlo escribiendo ese nombre entre dobles llaves en sus textos, o uniendo su salida.

Sirve para un valor que se usa en muchos sitios, o para dar un nombre claro a algo que sale de una respuesta larga.

**Para practicar:** paso «Guardar variable».

### 2.6 Preguntar antes de ejecutar

Un flow puede preguntar lo que necesita saber antes de ejecutarse: cuántos envíos, qué producto. En el paso Inicio, pulsa Preguntar antes de ejecutar, escribe la pregunta y, si quieres, su respuesta habitual.

Cada pregunta es un valor que entrega Inicio: únelo a lo que lo necesite, como el número de vueltas de un Repetir.

Cuando alguien pulsa Ejecutar, una ventana pequeña hace las preguntas. Así cualquiera puede usar el flow sin tocar el lienzo.

## 3. Decidir

### 3.1 Si: elegir un camino

Si tiene dos salidas, Sí y No, y el flow sigue por una de ellas. El cable que sale de Sí es verde y el que sale de No es rojo.

Puede comprobar tres cosas: que la última respuesta fue correcta, que su código de estado es uno concreto, o que dos valores se comparan como tú digas.

Este bloque para el flow cuando una llamada falla: de No cuelga un paso Parar, y de Sí sigues con lo que venga después.

**Para practicar:** bloque «Parar si una llamada falla».

### 3.2 Comprobar un valor de la respuesta

Pon Si a comparar dos valores. Une el primero, Esto, a un campo de la respuesta, y escribe en el segundo lo que debería valer.

Hay muchas formas de comparar: es igual a, es mayor que, contiene, empieza por, está vacío. Elige la que se lea como lo que quieres decir.

**Para practicar:** bloque «Comprobar un valor de la respuesta».

### 3.3 Validar: un 200 con un error dentro

Hay servicios que contestan 200 y dentro traen un código que dice que no se hizo nada. Validar distingue esas respuestas.

Se lee como una frase: No válido si este valor es igual a aquel. Une el valor al campo que lleva el código, elige la comparación y escribe el valor.

El flow sigue por Válido o por No válido. Lo que cuelga de Válido nunca ve las respuestas malas.

**Para practicar:** bloque «Validar un campo de la respuesta».

### 3.4 Los tests de tus peticiones

Si una petición tiene tests o aserciones, se ejecutan cuando un flow la envía, igual que cuando la envías a mano.

La salida cuenta cuántos pasaron junto a cada respuesta y, al final de la ejecución, el total. Una petición con un test que falla destaca, y al desplegar su línea se ve cuál.

Si también puede seguirlos: elige Los tests de la respuesta pasan, y el flow va por Sí solo cuando no falla ninguno.

### 3.5 Nota y Parar

Nota escribe un mensaje en la salida y sigue. Úsala para dejar rastro de lo que pasó: un valor, un aviso, por qué camino fue el flow.

Parar termina el flow ahí mismo, con un mensaje. Nada de lo que viene detrás se ejecuta.

**Para practicar:** paso «Nota».

### 3.6 Esperar: dar un momento al servidor

Esperar detiene el flow los segundos que digas. Es para cuando lo que una petición pone en marcha necesita tiempo antes de que la siguiente lo vea.

El número de segundos también puede llegar por un cable, si depende de algo.

**Para practicar:** bloque «Esperar entre dos llamadas».

## 4. Repetir

### 4.1 Repetir: lo mismo varias veces

Repetir ejecuta lo que cuelga de En cada vuelta tantas veces como digas. Lo que repite se dibuja dentro de un marco, con el número de vueltas.

Una vuelta termina cuando su camino no tiene nada más que ejecutar, o cuando llega a Fin de vuelta. Cuando no quedan vueltas, el flow sigue por Al terminar.

Número de vuelta es un valor que puedes usar dentro del bucle, para que cada vuelta sea distinta.

**Para practicar:** bloque «Repetir una llamada y guardar los resultados».

### 4.2 Lista y Añadir a lista

Una Lista empieza vacía en cada ejecución. Añadir a lista mete algo en ella cada vez que el flow pasa: un valor, o varios campos con los nombres que les pongas.

Añadir a lista elige su lista por nombre dentro del paso. Si el flow solo tiene una, ya viene elegida.

El paso Lista enseña dentro lo que guarda mientras el flow se ejecuta. Ver informe la abre como una tabla, una fila por elemento, para copiarla en una hoja de cálculo o en un correo, o guardarla como una página.

### 4.3 Guardar solo las respuestas que valen

Pon un Validar entre la petición y Añadir a lista, y une Añadir a lista a Válido.

Cuando una respuesta no vale, de ese camino no cuelga nada, así que la vuelta acaba ahí y empieza la siguiente. La respuesta mala nunca llega a la lista y el flow sigue.

**Para practicar:** bloque «Repetir una llamada y guardar solo las respuestas válidas».

### 4.4 Por cada elemento: una vez por cada elemento de una lista

Por cada elemento recorre una lista y ejecuta su vuelta una vez por cada elemento. La lista puede ser un campo de una respuesta, una Lista del flow o una tabla de datos.

En cada vuelta entrega el elemento y, con Añadir un campo, los campos del elemento que necesites. Únelos a la petición de la vuelta.

Un uso típico: una petición devuelve los envíos, y se envía otra por cada uno de ellos.

**Para practicar:** bloque «Enviar una petición por cada elemento de una lista».

### 4.5 Una tabla de datos: cada vuelta con sus valores

Un paso Tabla de datos guarda filas que pegas desde una hoja de cálculo. La primera línea lleva los nombres de las columnas.

Únela a un paso Por cada elemento: cada vuelta recibe una fila, y sus columnas son los campos que unir a la petición.

Así se envía la misma petición muchas veces con datos distintos: una referencia y un teléfono por fila, por ejemplo.

**Para practicar:** bloque «Enviar una petición por cada fila de una tabla».

### 4.6 Salir del bucle: reintentar hasta que funcione

Salir del bucle termina el bucle en el que está, aunque le queden vueltas, y el flow sigue por Al terminar.

Con él un Repetir se convierte en un reintento: envía la petición; si fue bien, sal; si no, espera un poco y deja que la vuelta termine.

Después del bucle, un Si comprueba si al final funcionó o se acabaron los intentos.

**Para practicar:** bloque «Reintentar hasta que funcione».

### 4.7 Esperar a que algo esté listo

La misma idea sirve para esperar a un proceso: cada vuelta pregunta cómo va y, cuando el valor es el que significa terminado, sale del bucle.

Entre una pregunta y la siguiente hay un Esperar, para no preguntar al servicio sin pausa.

**Para practicar:** bloque «Esperar a que algo esté listo».

### 4.8 Recorrer las páginas de un resultado

Cuando un listado viene por páginas, un Repetir pide una página por vuelta y Añadir a lista guarda lo que trae cada una.

El número de página es el Número de vuelta del bucle: únelo a la variable de la petición que dice qué página traer.

**Para practicar:** bloque «Recorrer las páginas de un resultado».

## 5. Casos típicos

### 5.1 Comprobar que varios servicios responden

Una cadena de peticiones, cada una seguida de un Si que comprueba que fue bien. La primera que falla para el flow con un mensaje que dice cuál.

Es una forma rápida de saber, antes de una sesión de pruebas, que todo de lo que dependes está en pie.

**Para practicar:** bloque «Comprobar que varios servicios responden».

### 5.2 Crear, comprobar y borrar

La vida completa de algo: una petición lo crea, otra lo lee para ver que está y una tercera lo borra.

El identificador que devuelve la primera viaja por cable a las otras dos. Es el patrón de la mayoría de las pruebas de punta a punta.

**Para practicar:** bloque «Crear, comprobar y borrar».

### 5.3 Crear algo solo si no está

Primero una petición lo busca. Un Si comprueba si el código de estado es 404: si lo es, el flow lo crea; si no, actualiza el que existe.

Enseña que un código de error es una respuesta más, y que un flow puede tomar otro camino por ella.

**Para practicar:** bloque «Crear solo si no existe».

## 6. Trabajar bien

### 6.1 Leer los cables

Los cables gruesos son el orden, y llevan una marca que dice hacia dónde van: naranja lo normal, verde lo que sale de Sí o Válido, rojo lo que sale de No o No válido.

Los cables de los valores no se dibujan hasta que dejas el ratón sobre un paso o lo seleccionas: entonces salen los suyos, finos y del color del paso del que viene el valor. No hacen falta para leer el flow, porque cada entrada ya lo dice en su ficha.

El ojo de la barra los enseña todos. Arrastra cualquier tramo de un cable para darle forma, y haz doble clic para devolverlo a su sitio.

### 6.2 Probar un paso sin ejecutarlo todo

Mientras montas un flow que crea cosas, ejecutarlo entero a cada cambio las crea una y otra vez.

Clic derecho sobre un paso: Ejecutar solo este paso lo ejecuta a él solo, y Ejecutar desde este paso ejecuta desde él hasta el final. Los dos usan lo que dejó la última ejecución, así que los valores de los pasos anteriores siguen ahí.

La primera vez, ejecuta el flow entero una vez para que haya de dónde partir.

### 6.3 Tus propios bloques

Cuando tengas unos pasos que vas a repetir en otros flows, como tu login con su petición ya elegida, selecciónalos y pulsa Guardar como bloque.

Desde entonces el bloque está en la galería, bajo Mis bloques, para ti y para todo el que tenga la colección. Guarda las peticiones, los ajustes y los cables entre sus pasos.

### 6.4 Un flow dentro de otro

Ejecutar un flow usa otro flow de la colección como un paso. Si el original cambia, cambia en todos los sitios donde se usa, cosa que un bloque copiado no hace.

Las preguntas que ese flow hace en Inicio son las entradas del paso, y lo que deja con nombre, sus variables y sus listas, son las salidas.

La salida cuenta lo que pasa dentro, con el nombre del flow delante de cada línea.

**Para practicar:** paso «Ejecutar un flow».

### 6.5 Datos de verdad y entornos sensibles

Un flow envía peticiones de verdad. Uno que crea envíos en bucle crea envíos reales en el entorno elegido: mira el nombre que hay junto a Ejecutar antes de pulsarlo.

En un entorno marcado como sensible el nombre sale en rojo y la app pide confirmación una vez por ejecución. Si cambias de entorno antes de continuar, vuelve a pedirla.

### 6.6 Guardar y compartir

Guardar deja el flow en la colección, en un fichero que el Bruno oficial ignora. Con el siguiente push, el equipo lo tiene.

En la sección Flujos de la barra lateral puedes buscar un flow por su nombre, duplicarlo para partir de una copia y ver con un punto cómo fue su última ejecución.

Si un pull trae otra versión de un flow que estás editando, la barra te avisa y te deja descartar tus cambios para ver la que llegó.

### 6.7 Cuando algo no sale

Un paso atenuado no está unido a Inicio y no se ejecuta: saca un cable del triángulo del paso anterior hasta él. También es una forma de dejar piezas de reserva en el lienzo.

Un paso con un aviso naranja dice debajo lo que le falta. Mientras haya avisos, Ejecutar no envía nada y los escribe en la salida.

Si un paso perdió su petición porque se movió o se renombró en la colección, pulsa dentro del paso y elígela otra vez.
