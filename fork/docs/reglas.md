# Reglas del fork

El código propio va aparte, en carpetas `fork/`. En el código de Bruno solo se tocan enganches registrados de pocas líneas. Todo tiene que ser compatible con el Bruno oficial de cualquier versión, y nada puede ser específico de una empresa. Se trabaja en ramas cortas con commit y push continuos.

## Cómo se leen estas reglas

- **DEBE** / **NO DEBE**: obligatorio, sin excepciones. Una pull request que incumple una regla se rechaza aunque funcione.
- Cada regla tiene un código (`R-xx`). Se cita en las revisiones ("incumple R-04").
- Si hay dudas de si algo está permitido, no lo está hasta que el otro mantenedor diga que sí.

## A. Cambios en el código de Bruno

- **R-01 · Código propio en carpetas propias.** Todo el código propio DEBE ir en carpetas `fork/` ([arquitectura-y-enganches.md](arquitectura-y-enganches.md)). Bruno no usa ese nombre, así que ahí no habrá conflictos al actualizar.
- **R-02 · En ficheros de Bruno, solo enganches registrados.** Solo se puede añadir la llamada mínima al código propio (1–3 líneas y un `import`), marcada con `[FORK H-xx]` y apuntada en `fork/HOOKS.md`.
- **R-03 · Un enganche nuevo necesita aprobación** del otro mantenedor, antes de programarlo.
- **R-04 · Prohibido reformatear código de Bruno.** Nada de Prettier, `eslint --fix`, renombrados, reordenar imports, cambiar comillas o espacios en ficheros de Bruno.
- **R-05 · Nada de refactors ni arreglos "de paso"** en código de Bruno. Los bugs de Bruno se reportan al proyecto oficial.
- **R-06 · Comprobación automática.** Antes de abrir una pull request se ejecuta `node fork/scripts/check-diff.mjs`. Si falla, la pull request no se abre.

## B. Compatibilidad con el Bruno oficial (cualquier versión)

Quien abra con el Bruno oficial una colección tocada con el fork no debe notar nada, y al revés tampoco. El fork añade funciones a la aplicación, nunca a las colecciones.

- **R-10 · El formato de las colecciones no se toca.** NO DEBEN cambiar ni ampliarse los ficheros `.bru`/`.yml`, entornos, `bruno.json`/`opencollection.yml`, `collection.bru` o `folder.*`: ni campos nuevos ni valores nuevos. Única excepción: el fichero opcional `.michi.json`, en la raíz de la colección, para ajustes del fork que se comparten con el equipo (DEC-19). No es `.bru` ni `.yml`, así que el Bruno oficial no lo lee en ninguno de los dos formatos. Cualquier otro fichero nuevo dentro de una colección necesita una decisión en [decisiones.md](decisiones.md).
- **R-11 · Configuración propia fuera de los ficheros de Bruno.** Lo personal de las funciones del fork se guarda en la configuración de la app, en el equipo del usuario. Lo que deba compartirse con el equipo va en `.michi.json` (R-10), nunca dentro de los ficheros de Bruno.
- **R-12 · Sin API nueva para scripts.** NO DEBEN añadirse funciones nuevas a `bru.*`, `req.*` o `res.*`, ni librerías extra al entorno de scripts. Un script que las usara fallaría en el Bruno oficial. (Implementar una función que Bruno ya expone, como `bru.visualize`, no es API nueva: DEC-24.)
- **R-13 · Guardar no "migra".** Abrir y guardar una colección con el fork DEBE dejar los ficheros byte a byte iguales a lo que dejaría el Bruno oficial de la misma versión base.
- **R-14 · Las funciones del fork se pueden desactivar.** Cada función tiene un interruptor en la configuración de la app. Con todo desactivado, el fork se comporta como el Bruno oficial.
- **R-15 · CLI.** Si una función afecta al envío de peticiones, la pull request indica si aplica también a `bru` (CLI). Las mismas reglas de compatibilidad valen para la CLI.

Si el propio Bruno cambia su formato entre versiones, eso no depende del fork. Para eso está la regla de versión mínima de cada colección en [colecciones-en-equipo.md](colecciones-en-equipo.md).

## C. Genérico: nada de ninguna empresa

- **R-50 · Cero referencias a empresas, clientes o proyectos** en código, tests, configuración por defecto, textos, iconos, nombres de ramas, tags, pull requests y documentación del repositorio. Nada de nombres de empresa, dominios internos, hosts reales, URLs de repositorios internos ni nombres de personas.
- **R-51 · Ejemplos con dominios reservados.** Los ejemplos y tests usan `example.com`, `example.test` o `localhost`.
- **R-52 · La configuración real va en el equipo, no en el repositorio.** Lo específico de un proyecto (por ejemplo, qué entornos son de producción) lo pone cada usuario o cada repositorio de colecciones. El repositorio del fork no trae datos de ningún proyecto.
- **R-53 · Idioma.** Código, identificadores, comentarios y textos de interfaz en inglés, como el resto de Bruno. Los commits, las pull requests y la documentación pueden ir en español.

## D. Reservadas

- **R-40 a R-45:** reservadas (normas internas del equipo).

## E. Flujo de trabajo (detalle en [flujo-de-trabajo.md](flujo-de-trabajo.md))

- **R-20 · `main` protegida.** Sin push directo. Todo entra por pull request.
- **R-21 · Prohibido el force-push** en cualquier rama. Nunca se reescribe historia publicada.
- **R-22 · El otro revisa.** Toda pull request la aprueba el mantenedor que no la ha hecho.
- **R-23 · Una función por rama y por pull request.** Ramas cortas: máximo 3 días sin fusionar.
- **R-24 · Tests de cada función** en `fork/` (por ejemplo: "una petición a un entorno sensible sin confirmar no sale").
- **R-25 · Evidencias reales en la pull request:** salida de `check-diff`, tests y build.
- **R-26 · Commit y push continuos.** Se hace commit en cuanto un paso funciona, y push inmediatamente después. Nunca se acaba una sesión con trabajo sin commit o sin push.
- **R-27 · Se reserva antes de empezar.** Antes de tocar una zona (una función, un enganche, un fichero de Bruno), se apunta en una issue quién la lleva. Dos personas no trabajan a la vez en la misma zona.

## F. Versiones y dependencias

- **R-30 · Publicar y actualizar Bruno** lo hace el mantenedor principal, o el segundo si es urgente ([actualizar-desde-bruno.md](actualizar-desde-bruno.md), [compilar-y-publicar.md](compilar-y-publicar.md)).
- **R-31 · Siempre sobre tags publicados de Bruno** (`vX.Y.Z`), nunca sobre su `main`.
- **R-32 · Versión:** `v<versión Bruno>-fork.<n>` (ejemplo: `v4.3.0-fork.11`).
- **R-33 · Dependencias congeladas.** No se añaden, quitan ni actualizan paquetes, ni se toca `package-lock.json`, fuera del procedimiento de actualización, salvo aprobación de los dos mantenedores. Un cambio aprobado se registra como enganche de tipo `dependencias` en `fork/HOOKS.md`.
- **R-34 · Ritmo:** actualización mensual, e inmediata si hay un parche de seguridad. Nunca más de 2 versiones menores por detrás.

## G. Seguridad (detalle en [seguridad.md](seguridad.md))

- **R-35 · Las protecciones de Electron no se tocan:** `contextIsolation`, `sandbox` y `webSecurity` se quedan activadas y `nodeIntegration` desactivada.
- **R-36 · Cero secretos en el repositorio.**
- **R-37 · Sin telemetría ni llamadas a terceros** desde el código del fork.
- **R-38 · Las pruebas nunca van contra producción.** Se usan mocks o servidores locales.
- **R-39 · Actualización automática desactivada** en las versiones del fork.
