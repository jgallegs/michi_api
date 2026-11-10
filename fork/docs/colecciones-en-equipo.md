# Colecciones en equipo

Reglas para cualquier repositorio de colecciones de Bruno compartido por varias personas, de cualquier proyecto. No dependen del fork: valen igual con el Bruno oficial.

Resumen: una sola rama `main` y carpetas por tema, no por persona ni por equipo. Lo personal nunca va en una request compartida: va en variables locales o en la carpeta `_local/`, que git ignora. Lo que usan los demás (variables, scripts de colección o carpeta, nombres de request) es un contrato: no se renombra ni se borra sin avisar. Commit antes de hacer pull, siempre.

## 1. Por qué se rompen las requests cuando otro sube un commit

| Lo que pasa | Por qué | Regla que lo evita |
|---|---|---|
| Alguien cambia una request compartida para sus pruebas, otro la cambia, y al hacer pull se pisa una de las dos | La request compartida se está usando como si fuera personal | C-10, C-02 |
| Un código postal, teléfono o usuario personal acaba en el repositorio y luego otro lo "corrige" | Valores personales escritos en la request | C-11, C-12 |
| Alguien renombra una variable o cambia el script de la colección y dejan de funcionar requests de otros | Se ha cambiado el contrato compartido sin avisar | C-20 a C-23 |
| Se hace pull con cambios sin guardar en git y se lía todo | Pull con el directorio sucio | C-31 |
| Diffs enormes sin cambios reales, y conflictos raros | Saltos de línea Windows/Linux (CRLF/LF) | C-40 |
| Conflictos en `seq:` | Dos personas reordenan requests de la misma carpeta | C-33, C-34 |

## 2. Estructura

- **C-01 · Una sola rama `main`, protegida.** Nada de ramas por equipo o por persona como espacio de trabajo permanente.
- **C-02 · Carpetas por tema** (por API, módulo o funcionalidad), nunca por persona. Para lo personal, cada uno tiene `_local/` dentro de la colección. Está en `.gitignore`, así que Bruno la muestra pero git no la sube.
- **C-03 · Cada carpeta tiene dueño** en `CODEOWNERS`, que revisa los cambios en ella. Si la plataforma no obliga a esa aprobación, la pull request se asigna a mano al dueño.

```
<colección>/
├── bruno.json
├── collection.bru           contrato: scripts, cabeceras y auth de toda la colección
├── .env.example             todas las variables personales, con valores de ejemplo
├── .env                     valores propios (ignorado por git)
├── .gitignore
├── .gitattributes
├── CODEOWNERS
├── README.md                versión mínima de Bruno, formato, dueños, cómo empezar
├── .michi.json              solo si se usa Michi: entornos sensibles compartidos y, cuando lleguen, los flows (se sube a git; si da conflicto, resolverlo antes de abrir la colección)
├── environments/            entornos compartidos, sin secretos
├── <tema-1>/
│   ├── folder.bru           contrato de la carpeta
│   └── *.bru
├── <tema-2>/ …
└── _local/                  lo personal (ignorado por git)
```

## 3. Lo compartido y lo personal

- **C-10 · Una request compartida no se modifica para uso personal.** Para probar algo, se duplica en `_local/` y se trabaja ahí. Solo se cambia la compartida cuando el cambio sirve para todos.
- **C-11 · Ningún valor personal dentro de una request compartida.** Código postal, coordenadas, teléfono, usuario, IDs de prueba propios… siempre como variable: `{{process.env.MI_CP}}` o `{{miVariable}}`.
- **C-12 · Dónde va cada valor:**

| Tipo de valor | Dónde | ¿En git? |
|---|---|---|
| Personal, no secreto (código postal, teléfono, ID de pruebas) | `.env` de la colección | No (sí su clave en `.env.example`) |
| Secreto (token, contraseña) | Variable secreta del entorno en Bruno, o `.env` | No |
| Compartido, no secreto (URL base de desarrollo, timeouts) | `environments/*.bru` | Sí |
| Personal y válido para cualquier colección | Entorno global de la app | No |

- **C-13 · `.env.example` es la lista oficial.** Al añadir una variable personal nueva, se añade a `.env.example` en el mismo commit, con un valor de ejemplo y un comentario. Así los demás ven, al hacer pull, que tienen que añadirla a su `.env`.

## 4. El contrato compartido

Es todo aquello de lo que dependen requests de otras personas:

- `collection.bru` y cada `folder.bru` (scripts, cabeceras, auth),
- los nombres de las variables (entornos y `.env.example`),
- las rutas y nombres de requests que otros llaman desde scripts (`bru.runRequest(...)`) o desde el runner.

Reglas:

- **C-20 · Cambiar el contrato es un cambio que rompe**, y va siempre en una pull request revisada por los dueños de las carpetas afectadas.
- **C-21 · No se renombra ni se borra de golpe.** Primero se añade lo nuevo y se mantiene lo viejo, se avisa al equipo y, pasadas 2 semanas, se borra lo viejo en otra pull request.
- **C-22 · Scripts de colección y de carpeta: los mínimos.** Lo que solo necesita una request va en el script de esa request.
- **C-23 · Las requests encadenadas se documentan.** En la pestaña Docs: qué variables lee, cuáles escribe y de qué otras requests depende.

## 5. Git en el día a día

- **C-30 · Cambios en `main` por pull request**, desde ramas cortas que se fusionan el mismo día o al siguiente. Pull requests pequeñas.
- **C-31 · Commit antes de pull. Siempre.** Antes de `git pull`: guardar en Bruno, hacer commit (o `git stash`) y después pull. Nunca pull con cambios sin commit.
- **C-32 · Pull al empezar el día y antes de cada cambio.** Push el mismo día.
- **C-33 · Conflictos:** en líneas `seq:`, quedarse con la del otro. Nunca se resuelve un conflicto quedándose con el fichero propio entero: se resuelve línea a línea o se pregunta al autor.
- **C-34 · No se reordenan ni se mueven requests de carpetas de otros**, porque cambia el `seq` de todas.

## 6. Formato y compatibilidad

- **C-40 · Saltos de línea fijos** con `.gitattributes` (abajo). Se pone el primer día. Si se añade después, se hace en un commit aparte de normalización.
  - Antes de añadirlo a un repositorio existente, se comprueba cómo está con `git ls-files --eol`. Si en la primera columna todo sale `i/lf`, el repositorio ya guarda LF y el `.gitattributes` es un commit de un solo fichero, sin efecto en el resto (`git add --renormalize .` no cambia nada). Si salen `i/crlf`, hace falta ese commit de normalización, en un momento en que nadie tenga trabajo pendiente.
  - Si los "ficheros modificados que nadie ha tocado" siguen apareciendo con el repositorio ya en LF, la causa no son los saltos de línea. Hay que mirar el diff (en Michi, clic sobre el fichero en el panel Git): suelen ser `seq:` reordenados (C-34) o valores personales escritos en requests compartidas (C-10, C-11).
- **C-41 · Versión mínima de Bruno y formato declarados** en el `README.md` (por ejemplo: "Bruno ≥ 2.10, formato `.bru`"). Nadie usa funciones de una versión más nueva hasta que todo el equipo la tenga. Cambiar el formato o la versión mínima es una pull request planificada y avisada.
- **C-42 · No se sube:** `.env`, `_local/`, `node_modules/`, logs ni resultados del runner.
- **C-43 · Librerías npm en scripts: evitarlas.** Si hacen falta: `package.json` y lockfile en la raíz de la colección, aprobado en pull request y documentado en el `README.md`.
- **C-44 · Nombres de fichero y carpeta simples:** sin `: * ? " < > |`, sin espacios al final y mejor sin emojis. Algunos sistemas y herramientas fallan con ellos.

## 7. Calidad mínima

- **C-50 · Cada request compartida** tiene en Docs qué hace, qué variables necesita y en qué entornos es válida, y al menos una aserción (por ejemplo, el código de estado esperado).
- **C-51 · Antes de fusionar un cambio de contrato**, se ejecutan con la CLI las carpetas afectadas contra un entorno que no sea de producción (`bru run <carpeta> --env <entorno-no-producción>`) y se pega el resultado en la pull request.
- **C-52 · Producción:** si existe un entorno de producción, se llama claramente (por ejemplo `PRO` o `PROD`), no lleva credenciales en git y nunca se usa con el runner. Las requests que modifican datos llevan un aviso en su Docs. Con Michi, además, se marca como entorno sensible ([funciones/entornos-sensibles.md](funciones/entornos-sensibles.md)).

## 8. Plantillas

`.gitignore`

```gitignore
.env
_local/
node_modules/
*.log
```

`.gitattributes`

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.pdf binary
```

`.env.example`

```dotenv
# Copia este fichero como .env y pon tus valores. Nunca subas .env.
# Al añadir una variable nueva, añádela aquí en el mismo commit (C-13).
# Código postal para pruebas
MI_CP=28001
# Teléfono de pruebas
MI_TELEFONO=600000000
```

`CODEOWNERS` (rutas de ejemplo)

```
/collection.bru      @dueno-1 @dueno-2
/environments/       @dueno-1 @dueno-2
/tema-1/             @dueno-1
/tema-2/             @dueno-2
```

`README.md` (mínimo)

```markdown
# <Nombre de la colección>
- Bruno mínimo: X.Y · Formato: .bru
- Primeros pasos: clona, copia .env.example a .env y rellénalo, abre la carpeta en Bruno
- Dueños: ver CODEOWNERS · Reglas: commit antes de pull, nada personal en requests compartidas
```
