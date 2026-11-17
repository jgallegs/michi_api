# Compilar y publicar

Publica el mantenedor principal (R-30). Se compila desde el tag, en una carpeta limpia, con `npm ci`. Los ficheros se publican con su `.sha256` en las [Releases del repositorio](https://github.com/jgallegs/michi_api/releases), y se conservan las versiones anteriores para poder volver atrás.

## Estado

- Versión vigente: **Michi 4.3.0-fork.13**, sobre Bruno v4.3.0 (un `.michi.json` dañado ya no se pisa y sección Flujos, apagada por defecto, DEC-26).
- La 4.3.0-fork.10 y la 4.3.0-fork.11 están **retiradas**: incluían una fuente sin licencia de redistribución (DEC-25).
- Versiones anteriores: fork.1 se publicó como Brunillo con un icono provisional, fork.2 no se publicó, y de fork.3 a fork.12 ya como Michi. Los cambios de cada una están en [fork/CHANGELOG.md](../CHANGELOG.md).
- Bruno de código abierto no tiene actualización automática, así que R-39 se cumple sin hacer nada.
- Nombre y logo propios en toda la app: enganches H-06 a H-15, más el plugin de textos (H-11, desde la fork.4). El protocolo `bruno://` también lo registra Michi al arrancar.

## 1. Compilar

```bash
node fork/scripts/build-win.mjs
```

Hace el build web y empaqueta con `fork/packaging/electron-builder-config.js`, que extiende la configuración de Bruno sin modificarla (DEC-14). El número de versión del fork (`<n>` de `-fork.<n>`) está en `fork/packaging/RELEASE`.

Salida en `packages/bruno-electron/out/`:

| Fichero | Qué es |
|---|---|
| `Michi-Setup-<versión>.exe` | Instalador NSIS. Crea acceso directo y entrada en el menú Inicio |
| `Michi-<versión>-portable.exe` | Portable de un solo fichero. No se publica: descomprime unos 460 MB en cada arranque (DEC-21) |
| `fast-portable/` | Lanzador para usar la app sin instalarla: `Michi.vbs` y, al lado, la carpeta `Michi/` con `launcher.ps1` y `Michi-<versión>-win.zip` |

El lanzador descomprime la app solo la primera vez de cada versión, en `%LOCALAPPDATA%\Michi-portable\<versión>`, y a partir de ahí la abre directamente. Las versiones antiguas se borran solas. Comparte los datos con la versión instalada (`%APPDATA%\Michi`), así que no deben abrirse las dos a la vez. Las plantillas del lanzador están en `fork/packaging/launcher/`.

Problema conocido en Windows sin permisos de administrador: electron-builder falla al extraer `winCodeSign` por los enlaces simbólicos de macOS que trae el paquete. La solución está en [fork/README.md](../README.md).

## 2. Requisitos de una versión

- Nombre de producto propio (no "Bruno", que es marca registrada) e icono propio, genéricos y sin ninguna empresa (R-50).
- Actualización automática desactivada (R-39). Si no, la app se actualizaría sola al Bruno oficial y se perderían las funciones del fork.
- Versión visible en "Acerca de": `v4.3.0-fork.13` (R-32).
- Configuración por defecto vacía: sin entornos marcados ni datos de ningún proyecto (R-52).
- Licencias dentro de la aplicación (carpeta `resources`): `LICENSE-Bruno.md` (la de Bruno, sin cambios: MIT obliga a conservar el aviso de copyright) y `THIRD-PARTY-NOTICES.md` (lo que añade el fork). Las copia la configuración de empaquetado (`fork/packaging/electron-builder-config.js`).
- Avisos de terceros al día: cualquier dependencia, fuente o recurso de terceros que añada el fork se apunta en [fork/THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) con su licencia completa antes de publicar. Nada sin licencia que permita redistribuirlo.
- Sin telemetría: el plugin de compilación deja vacía la clave de analítica de Bruno (R-37).

## 3. Pasos para publicar

1. `main` tiene fusionado todo lo que va en la versión.
2. Actualizar `fork/CHANGELOG.md` (funciones, correcciones y versión de Bruno base), `fork/packaging/RELEASE` y la versión de ejemplo de `.github/README.md`, en una pull request pequeña.
3. Crear y subir el tag:
   ```bash
   git tag -a v4.3.0-fork.11 -m "v4.3.0-fork.11"
   ```
   ```bash
   git push origin v4.3.0-fork.11
   ```
4. Compilar desde el tag, en una carpeta limpia, nunca desde la carpeta de trabajo (allí hay ficheros locales que no deben acabar en el paquete):
   ```bash
   git clone --branch v4.3.0-fork.11 <url-del-repositorio> fork-build
   ```
   Después, `npm ci` y `node fork/scripts/build-win.mjs`.
5. Comprobar que el paquete no contiene ficheros locales ni palabras prohibidas (`check-diff` sobre el tag y un vistazo al contenido empaquetado).
6. Preparar el zip sin instalar: comprimir el contenido de `out/fast-portable/` (`Michi.vbs` y la carpeta `Michi/`) como `Michi-<versión>-sin-instalar.zip`.
7. Calcular el hash de cada fichero que se va a publicar y guardarlo en un `.sha256` al lado:
   ```powershell
   Get-FileHash .\Michi-Setup-4.3.0-fork.11.exe -Algorithm SHA256
   ```
8. Prueba de humo con el instalador (no en modo desarrollo): instalar, abrir una colección, lanzar una petición contra un entorno que no sea de producción, probar la barrera de entornos sensibles con un host simulado y comprobar que no ofrece actualizarse.
9. Crear la Release del tag en GitHub y adjuntar el instalador, el zip sin instalar y sus `.sha256`, con el changelog de la versión como descripción.

## 4. Conservar versiones

- En Releases quedan todas las versiones. La vigente es la marcada como *Latest*.
- Los instaladores y los zips nunca se suben como ficheros del repositorio, solo como adjuntos de la Release.
- Si un proyecto necesita tener el instalador o el lanzador en una carpeta compartida suya, los copia desde la Release. Ese sitio es del proyecto, no forma parte del fork.

## 5. Firma del instalador (pendiente de decidir)

Sin firma, Windows SmartScreen y algunos antivirus pueden avisar o bloquear. Como el fork no es de ninguna empresa, la firma depende de quien lo distribuya: certificado de firma o lista blanca por hash. Mientras tanto se publica sin firmar y cada persona puede comprobar el `.sha256` antes de instalar.

## 6. Retirar una versión

1. Se marca la anterior como *Latest* en Releases y se avisa a quien use el fork.
2. Se anota en [decisiones.md](decisiones.md).
3. Se corrige con una rama `fix/…` normal, que sale como `-fork.<n+1>`.
