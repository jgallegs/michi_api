# Actualizar desde el Bruno oficial

Lo hace el mantenedor principal, o el segundo si hay un parche de seguridad urgente (R-30). Se hace un **merge** del tag nuevo de Bruno en una rama `update/vX.Y.Z`. Los conflictos solo deberían salir en los ficheros con enganches: se coge la versión de Bruno y se vuelve a poner la línea del enganche. Después, build, tests, `check-diff`, la lista de comprobación de abajo, pull request y versión nueva.

**Merge, no rebase.** En un fork con varias personas no se reescribe la historia. Se hace `git merge` del tag de Bruno, y la pull request de actualización se fusiona **sin squash**: hay que conservar la historia de Bruno para que el siguiente merge funcione. Es distinto de las pull requests de funciones, que sí van con squash.

## Cuándo

- **Mensual:** primera semana de cada mes, si hay versión nueva estable.
- **Urgente:** cuando Bruno o Electron publiquen un parche de seguridad.
- **Límite:** nunca más de 2 versiones menores por detrás (R-34).
- Siempre a un tag publicado y estable, nunca a `main` de Bruno ni a betas (R-31).

## Antes de empezar

1. Leer las notas de versión de Bruno entre la versión actual (`fork/UPSTREAM_VERSION`) y la nueva. Buscar:
   - cambios en el envío de peticiones, en el proceso principal, en el entorno de scripts o en la interfaz donde hay enganches (ver [fork/HOOKS.md](../HOOKS.md));
   - cambios de versión de Electron o de Node;
   - cambios en el formato de colecciones.
2. Si una versión rehace a fondo una zona donde hay un enganche, avisar: esa actualización llevará más tiempo.

## Procedimiento

Los ejemplos usan `v4.4.0` como versión nueva.

1. Traer los tags de Bruno y subir el tag nuevo al repositorio del fork (`origin`), porque el otro mantenedor lo necesita para `check-diff`:
   ```bash
   git fetch upstream --tags
   ```
   ```bash
   git push origin v4.4.0
   ```
2. Partir de `main` actualizada y crear la rama:
   ```bash
   git switch main && git pull && git switch -c update/v4.4.0
   ```
3. Fusionar el tag nuevo:
   ```bash
   git merge --no-ff v4.4.0 -m "chore(upstream): Bruno v4.4.0"
   ```
4. Si hay conflictos, se resuelven con esta regla fija:
   - **Fichero con enganche:** quedarse con la versión de Bruno completa (`git checkout --theirs <fichero>`) y volver a poner solo la línea `[FORK H-xx]` en el sitio equivalente. Nunca se conserva código antiguo de Bruno.
   - **`package.json` o `package-lock.json`:** quedarse con los de Bruno (`--theirs`) y volver a añadir a mano las dependencias aprobadas que figuren como enganches de tipo `dependencias` (R-33; hoy, H-27 y H-28).
   - **`.github/dependabot.yml`:** el de Bruno, con `open-pull-requests-limit: 0` y la marca de H-30 en cada entrada.
   - **Ficheros binarios reemplazados** (icono de la ventana, H-07): conservar el del fork.
   - **Ficheros dentro de `fork/`:** no deberían tener conflicto. Si lo tienen, algo se ha hecho fuera de las reglas: parar y revisar.
   - **Si la zona del enganche ha desaparecido en Bruno:** parar. Hay que diseñar el enganche de nuevo, con una pull request aparte aprobada por los dos mantenedores.
5. Actualizar `fork/UPSTREAM_VERSION` con el tag nuevo y, si algún enganche ha cambiado de sitio, su fila en `fork/HOOKS.md`.
6. Instalar, compilar y probar:
   ```bash
   npm ci
   ```
   Después, el build de escritorio, los tests de Bruno y de `fork/`, y `node fork/scripts/check-diff.mjs`. Si Bruno ha cambiado alguna frase de la interfaz que el fork sustituye por el nombre de la app, `branding-phrases.spec.js` falla: hay que actualizar la lista.
7. Repasar la lista de comprobación de abajo.
8. Abrir la pull request `update/v4.4.0` → `main` con la plantilla de [flujo-de-trabajo.md](flujo-de-trabajo.md) y las evidencias. La aprueba el otro mantenedor y se fusiona con merge commit, sin squash.
9. Publicar `v4.4.0-fork.1` siguiendo [compilar-y-publicar.md](compilar-y-publicar.md).

## Lista de comprobación de cada actualización

- [ ] `check-diff` limpio: fuera de `fork/` solo hay ficheros de `HOOKS.md`
- [ ] Tests de Bruno en verde (o los mismos fallos que en el tag oficial, anotados en la pull request)
- [ ] Tests de `fork/` en verde
- [ ] La app arranca con el nombre y el icono del fork
- [ ] Actualización automática desactivada: no ofrece actualizar al Bruno oficial (R-39)
- [ ] Se abre una colección real (una grande, con scripts y entornos) y se lanzan peticiones contra un entorno que no sea de producción
- [ ] Entornos, `.env` y variables secretas cargan igual que en el Bruno oficial
- [ ] Scripts pre y post y tests de las colecciones funcionan
- [ ] Cada función del fork funciona (la barrera de entornos sensibles se prueba con un host simulado, nunca uno real, R-38) y se puede desactivar (R-14)
- [ ] Abrir y guardar no cambia nada: se abre la colección con el fork, se guardan varias requests sin tocarlas y `git status` de la colección sale limpio (R-13)
- [ ] La colección, tocada con el fork, se abre bien en el Bruno oficial de la versión mínima declarada en su `README.md` (R-10)
- [ ] La CLI funciona, si aplica (R-15)

## Si algo sale mal

- **El build o los tests fallan y no se ve claro por qué:** no se publica. Se sigue con la versión anterior del fork y se anota en [decisiones.md](decisiones.md).
- **Problema detectado después de publicar:** se vuelve a la versión anterior, que siempre se conserva en Releases ([compilar-y-publicar.md](compilar-y-publicar.md)), y se avisa a quien use el fork.

## Tiempo esperado

Con pocos enganches, de 1 a 3 horas al mes. Si una actualización pasa de un día de trabajo, se revisa en [decisiones.md](decisiones.md) si compensa seguir con el fork o pasar a otra solución (por ejemplo, un proxy que filtre las peticiones a producción).
