# Seguridad

Bruno guarda tokens y credenciales, y lleva dentro Chromium y Node. Un fork desactualizado o mal tocado es un riesgo real. Por eso las protecciones de Electron no se tocan, no hay secretos en el repositorio, no se envían datos a terceros, no se prueba contra producción y se actualiza a tiempo.

## 1. Electron (R-35)

En ninguna ventana se cambia:

| Opción | Valor obligatorio |
|---|---|
| `contextIsolation` | `true` |
| `sandbox` | El que traiga Bruno (no se desactiva) |
| `nodeIntegration` | `false` |
| `webSecurity` | `true` |

- La interfaz (`bruno-app`) no accede a Node directamente: lo que necesite del sistema (git, `.michi.json`, ventanas nativas) se pide al proceso principal por IPC, con canales propios con prefijo `fork:` (por ejemplo `fork:git:*`, `fork:sensitive-environments:*`).
- No se carga contenido remoto en la app, ni se abren URLs externas desde el código del fork sin que el usuario haga clic.
- Los paneles HTML de `bru.visualize` se pintan en un iframe aislado (`sandbox="allow-scripts"`): pueden ejecutar sus propios scripts, pero no acceden a la aplicación (DEC-24).

## 2. Secretos (R-36)

- Nunca en el repositorio: tokens, contraseñas, certificados privados, ficheros `.env` reales ni entornos de Bruno con valores reales.
- Los entornos con credenciales se quedan en el equipo de cada uno, fuera de git ([colecciones-en-equipo.md](colecciones-en-equipo.md), C-12).
- Qué entornos son de producción en cada proyecto no va en el repositorio del fork (R-52): no es un secreto, pero es específico de un proyecto. Se marca en la app y, si se comparte, en `.michi.json` del repositorio de colecciones.
- Los ejemplos y tests usan dominios reservados (`*.example.test`, R-51).
- `check-diff` busca secretos evidentes en las líneas añadidas ([arquitectura-y-enganches.md](arquitectura-y-enganches.md)).
- Si se sube un secreto por error: se avisa al otro mantenedor, **se revoca el secreto** (borrarlo del repositorio no basta) y se anota en [decisiones.md](decisiones.md).

## 3. Red y datos (R-37, R-38)

- El código del fork no envía nada a ningún servicio: ni telemetría, ni analítica, ni "comprobar versión". Las builds del fork dejan vacía la clave de analítica de Bruno.
- Las funciones que podrían depender de un servicio externo se resuelven en el equipo: el dibujo de etiquetas ZPL y de QR usa las fuentes incluidas en el paquete, y la compilación falla si el bundle conserva la URL del CDN (DEC-22).
- El historial de requests solo se guarda en el equipo, sin cabeceras y con credenciales enmascaradas.
- Los tests no salen a la red: usan mocks o un servidor local (`127.0.0.1`).
- Nunca se lanza una petición real contra producción para probar una función del fork, tampoco la barrera de entornos sensibles. Se prueba con un host simulado marcado como sensible.

## 4. Dependencias (R-33)

- Sin dependencias nuevas salvo aprobación de los dos mantenedores. Cada dependencia es código de terceros que se ejecuta con acceso a las credenciales del usuario.
- Si se aprueba una: tiene que estar mantenida, tener licencia compatible (MIT, Apache-2.0, BSD), quedar anotada en la pull request y en [decisiones.md](decisiones.md), y registrarse como enganche de tipo `dependencias`. Hoy solo hay una: `@zebrash/browser` (DEC-22, H-27 y H-28).
- Las dependencias se actualizan solo al pasar a una versión nueva de Bruno. Por eso Dependabot está desactivado en el repositorio del fork (H-30, DEC-23).
- `npm audit` se revisa en cada actualización de Bruno. Las vulnerabilidades críticas que afecten a las funciones del fork se tratan en el momento.

## 5. Actualizaciones de seguridad (R-34)

- Si Bruno o Electron publican un parche de seguridad, se actualiza sin esperar al ciclo mensual. Lo hace el mantenedor principal o, si no está, el segundo ([README.md](README.md), roles).
- Si no se puede actualizar a tiempo, se avisa a quien use el fork y se valora usar temporalmente el Bruno oficial.

## 6. Límite de la barrera de entornos sensibles

La barrera de entornos sensibles es una protección contra despistes, no una medida de seguridad: no impide que alguien use el Bruno oficial, curl u otra herramienta contra producción. Sigue siendo responsabilidad de cada uno no lanzar contra producción lo que no toca.
