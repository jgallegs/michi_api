# Arquitectura y enganches

El código de Bruno se queda tal cual. Lo propio vive en carpetas `fork/`. Donde Bruno tiene que llamar al código del fork se pone un **enganche**: una línea marcada con `[FORK H-xx]` y apuntada en `fork/HOOKS.md`. El script `check-diff` comprueba que no se ha tocado nada más y que no hay palabras prohibidas ni secretos.

## 1. Estructura de carpetas

```
<repositorio del fork>/
├── fork/
│   ├── README.md                  guía rápida de mantenimiento y tabla de funciones
│   ├── docs/                      esta documentación
│   ├── HOOKS.md                   registro de enganches (R-02)
│   ├── UPSTREAM_VERSION           tag de Bruno base (v4.3.0)
│   ├── CHANGELOG.md               cambios del fork por versión
│   ├── packaging/                 identidad de la app: RELEASE, configuración de electron-builder,
│   │                              iconos, make-icon.py y el lanzador sin instalar
│   └── scripts/
│       ├── build-win.mjs          compilación para Windows
│       └── check-diff.mjs         comprobación de R-02 y R-06
└── packages/
    ├── bruno-app/src/components/fork/   interfaz y lógica del renderer (cada función en su carpeta)
    ├── bruno-app/plugins/fork/          plugins de compilación (nombre de la app, fuentes de ZPL, analítica)
    ├── bruno-electron/src/fork/         proceso principal (git, .michi.json, ventana Acerca de, paneles)
    ├── bruno-js/src/fork/               entorno de scripts (bru.visualize)
    └── bruno-cli/src/fork/              CLI, solo si una función aplica (R-15); hoy no existe
```

Comprobado sobre Bruno v4.3.0:

- En `bruno-app`, los imports se resuelven con los alias de `jsconfig.json` (`components/…`, `ui/…`). Por eso el código del renderer va en `src/components/fork/`, que entra en el alias `components/`, en vez de en `src/fork/`, que obligaría a tocar la configuración de build (DEC-11). Sigue siendo una carpeta `fork/` (R-01).
- Bruno usa husky para sus hooks de git. Ver [flujo-de-trabajo.md](flujo-de-trabajo.md), apartado 7.

## 2. Qué es un enganche

Es el único cambio permitido en un fichero de Bruno (R-02). Tiene que ser:

- **Mínimo:** una llamada al código propio y, si hace falta, su `import`. La lógica nunca va en el fichero de Bruno.
- **Marcado:** con `[FORK H-xx]` en la misma línea o justo encima.
- **Registrado** en `fork/HOOKS.md` y **aprobado** antes de programarlo (R-03).
- **Desactivable:** si la función está apagada (R-14), el enganche no hace nada.

```js
// actions.js, sendRequest: enganche H-03
if (!(await confirmSendInSensitiveEnvironment(collection, item))) { // [FORK H-03]
  return resolve();
}
```

Tipos de enganche que se usan en el registro:

| Tipo | Qué cubre |
|---|---|
| `código` | Una o pocas líneas en un fuente de Bruno |
| `build` | Configuración de compilación o ficheros de marca (icono de la ventana, plugins de compilación, `.github/dependabot.yml`) |
| `dependencias` | Cambios aprobados en `package.json` o `package-lock.json` (R-33). JSON no admite comentarios, así que no llevan la marca `[FORK H-xx]` |
| `documentación` | Ficheros de documentación fuera de `fork/`, como la portada `.github/README.md` |

## 3. Registro de enganches: `fork/HOOKS.md`

El registro completo, con fichero, zona, qué hace y desde qué versión, está en [fork/HOOKS.md](../HOOKS.md). Hoy llega hasta **H-36**.

- Un ID no se reutiliza nunca. Si un enganche se quita, su fila se marca `RETIRADO`.
- **Pocos enganches:** cada uno es un posible conflicto al actualizar. Si una función necesita más de 3, se replantea y, si se mantiene, se justifica en [decisiones.md](decisiones.md) (como DEC-09).
- Como `HOOKS.md` lo tocan todas las pull requests con enganche, el ID se reserva en la issue antes de usarlo (R-27). Así dos ramas no cogen el mismo ID.

## 4. `check-diff`: lo que comprueba

```bash
node fork/scripts/check-diff.mjs
```

Compara el árbol de trabajo (incluidos los ficheros nuevos sin seguimiento) con el tag de `fork/UPSTREAM_VERSION`:

1. **Ficheros de Bruno modificados.** Todo fichero cambiado fuera de una carpeta `fork/` tiene que estar en `HOOKS.md` (filas no retiradas), y cada bloque de líneas añadidas tiene que llevar la marca `[FORK H-`. Excepción: los ficheros `package.json` y `package-lock.json` registrados en filas de tipo `dependencias` se aceptan sin marca.
2. **Ficheros nuevos fuera de `fork/`.** Solo se aceptan si están registrados en `HOOKS.md` y llevan la marca (por ejemplo, `.github/README.md`, H-29).
3. **Palabras prohibidas** en las líneas añadidas y en los nombres de fichero. La lista no está en el repositorio, porque si estuviera sería ella misma una referencia: es un fichero local, `.git/info/forbidden-words` (una expresión regular por línea, `#` para comentarios), que cada mantenedor instala en su copia. Si el fichero no existe, el script falla: no se puede pasar sin él.
4. **Secretos evidentes:** claves privadas, asignaciones de contraseñas o tokens, y formatos conocidos de tokens de servicios (R-36).

Si todo va bien termina con `check-diff: OK (...)`. Si encuentra problemas, los lista y sale con código 1; si falta un fichero necesario, sale con código 2.

El formato de las colecciones (R-10, R-13) no lo comprueba el script: lo vigila la revisión y la lista de comprobación de [actualizar-desde-bruno.md](actualizar-desde-bruno.md).

Se ejecuta antes de abrir cada pull request (R-06).

## 5. Dónde va cada cosa

| Qué | Dónde |
|---|---|
| Reglas y procedimientos | `fork/docs/` |
| Registro de enganches, versión base, changelog | `fork/` |
| Identidad de la app, iconos y lanzador | `fork/packaging/` |
| Configuración real de un proyecto (qué entornos son de producción, etc.) | En el equipo de cada usuario o en `.michi.json` de la colección, nunca en el repositorio del fork (R-52) |
| Lista de palabras prohibidas y otros ficheros locales de cada mantenedor | Fuera del repositorio (`.git/info/`) |
