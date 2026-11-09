# Flujo de trabajo

Se reserva la tarea en una issue, se trabaja en una rama corta propia, se hace commit en cuanto algo funciona y push en el acto, cada mañana se trae `main` a la rama con merge (nunca rebase ni force-push), se abre una pull request en borrador desde el primer push, la revisa el otro mantenedor y se fusiona con squash.

## 1. Por qué se pisa el trabajo y qué lo evita

| Causa | Qué la evita |
|---|---|
| Dos personas tocan la misma zona sin saberlo | Reservar en una issue antes de empezar (R-27) |
| Ramas que viven semanas y se alejan de `main` | Ramas de máximo 3 días (R-23) y traer `main` cada día |
| Trabajo sin subir en un portátil | Commit y push continuos (R-26) |
| Alguien reescribe historia (rebase y force-push) | Prohibido el force-push (R-21): `main` se trae con merge |
| Cambios enormes imposibles de revisar | Una función por rama y pull request en borrador desde el principio |

## 2. Ramas

| Rama | Para qué | Dueño |
|---|---|---|
| `main` | Lo publicado o a punto de publicarse. Protegida (sin push directo ni force-push) | — |
| `feature/<tema>` | Función nueva (`feature/sensitive-environments`) | Una sola persona |
| `fix/<tema>` | Corrección | Una sola persona |
| `update/vX.Y.Z` | Traer una versión de Bruno ([actualizar-desde-bruno.md](actualizar-desde-bruno.md)) | Mantenedor principal |

Una rama tiene un único dueño. Si dos personas necesitan trabajar en la misma función, se parte en dos ramas con zonas distintas, o una espera a que se fusione lo de la otra.

## 3. Reservar antes de empezar (R-27)

En las issues del repositorio:

1. Una issue por tarea, asignada a quien la hace.
2. En la descripción: la zona que se va a tocar (función, carpeta `fork/…`, ficheros de Bruno) y el ID de enganche que se reserva (`H-37`).
3. Si la zona ya está reservada por el otro mantenedor, no se empieza: se habla antes.

## 4. El ciclo de cada día

Al empezar:

```bash
git switch main && git pull --ff-only
```

```bash
git switch feature/<tema> && git merge main
```

Si hay conflictos al traer `main`, se resuelven en la propia rama, se hace commit y push.

Mientras se trabaja, cada vez que un paso funciona (compila, o pasa su test):

```bash
git add <ficheros> && git commit -m "feat(sensitive-env): ..."
```

```bash
git push
```

Commits pequeños y frecuentes. No importa que sean muchos: al fusionar se hace squash.

Al terminar la sesión: `git status` limpio y `git log origin/<rama>..HEAD` vacío. Nada se queda solo en un equipo.

## 5. Pull requests

1. Desde el primer push, se abre una pull request en borrador (*Draft*) enlazada a la issue. Así el otro mantenedor ve en qué se está trabajando.
2. Cuando esté lista, se quita el borrador y se pegan las evidencias (R-25).
3. Revisa el otro mantenedor (R-22). Las correcciones van en commits nuevos.
4. Se fusiona con **squash**. Quien fusiona revisa que el mensaje final tenga el formato correcto.
5. Se borra la rama.

Plantilla de la pull request (obligatoria):

```markdown
## Qué hace
<una frase> · Issue: #<n>

## Tipo
[ ] feature  [ ] fix  [ ] update de Bruno  [ ] build

## Enganches (fork/HOOKS.md)
Nuevos: H-xx … / Ninguno · Modificados: … / Ninguno

## Compatibilidad con Bruno oficial
[ ] No cambia formato de colecciones ni entornos (R-10, R-13)
[ ] No añade API de scripts (R-12)
[ ] Se puede desactivar (R-14)
[ ] Afecta a la CLI: sí / no (R-15)

## Dependencias
[ ] No toca package.json ni package-lock.json  [ ] Sí, aprobado (motivo: …)

## Evidencias (salida real)
check-diff: … · tests: … · build: … · prueba manual: …
```

## 6. Commits

Formato: `tipo(área): descripción`

| Tipo | Uso |
|---|---|
| `feat` | Función nueva |
| `fix` | Corrección |
| `hook` | Alta, cambio o retirada de un enganche (indica `H-xx`) |
| `build` | Build, marca, instalador |
| `test` | Solo tests |
| `wip` | Trabajo a medias que hay que subir igualmente (R-26). Desaparece con el squash |
| `docs` | Documentación de `fork/` |
| `chore(upstream)` | Solo en `update/…`: traer una versión de Bruno |

Los commits van firmados con el correo personal de su autor (DEC-23).

## 7. Hooks de git del repositorio (pendiente)

Bruno instala sus propios hooks de git con husky (`npm` ejecuta `husky` en `prepare` y fija `core.hooksPath`). Un `fork/githooks/` propio lo pisaría o sería pisado. Por eso, de momento, los hooks de abajo no están implementados (DEC-12). Cuando se hagan, irán como enganche registrado en `.husky/` (llamando a scripts de `fork/`) o con otra solución que se decida en [decisiones.md](decisiones.md). Mientras tanto, las protecciones son `main` protegida en el servidor y ejecutar `check-diff` antes de cada pull request.

Hooks previstos:

| Hook | Qué hace |
|---|---|
| `pre-commit` | Rechaza commits en `main` |
| `commit-msg` | Comprueba el formato `tipo(área): …` |
| `pre-push` | Rechaza el push a `main` y el force-push, y ejecuta `check-diff` |

Son una red de seguridad. La protección de verdad está en el servidor: `main` protegida.

## 8. Qué rechaza siempre la revisión

- Ficheros de Bruno cambiados sin enganche registrado (R-02), o con cambios de formato o refactors (R-04, R-05).
- Cualquier cambio que el Bruno oficial no entendería: formato, API de scripts, ficheros nuevos en colecciones (R-10 a R-13).
- Referencias a empresas o datos reales (R-50 a R-52).
- Dependencias sin aprobar (R-33), falta de tests o de evidencias (R-24, R-25).
