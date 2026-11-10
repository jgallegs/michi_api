# Documentación del fork

Michi es un fork de [Bruno](https://github.com/usebruno/bruno) (licencia MIT) que añade funciones a la aplicación de escritorio sin cambiar el formato de las colecciones. El fork es genérico: no contiene nada de ninguna empresa, cliente ni proyecto concreto, para que se pueda usar en cualquier sitio.

Estos documentos son las reglas y procedimientos del fork. Son obligatorios para cualquiera que cambie el código:

1. Nadie toca el fork sin haber leído [reglas.md](reglas.md).
2. Si algo no está cubierto por las reglas, no se hace: se pregunta a los mantenedores y, si se aprueba, se añade aquí.
3. Las reglas solo cambian con el visto bueno de los mantenedores y una entrada en [decisiones.md](decisiones.md).

La presentación para usuarios está en [.github/README.md](../../.github/README.md); la guía rápida de mantenimiento, en [fork/README.md](../README.md); el registro de enganches, en [fork/HOOKS.md](../HOOKS.md), y los cambios de cada versión, en [fork/CHANGELOG.md](../CHANGELOG.md).

## Documentos

| Documento | Contenido |
|---|---|
| [reglas.md](reglas.md) | Reglas obligatorias numeradas (R-xx). Es el documento principal |
| [arquitectura-y-enganches.md](arquitectura-y-enganches.md) | Dónde va el código propio, cómo se engancha con el de Bruno y qué comprueba `check-diff` |
| [flujo-de-trabajo.md](flujo-de-trabajo.md) | Ramas, commits, push continuo y pull requests |
| [actualizar-desde-bruno.md](actualizar-desde-bruno.md) | Qué hacer cuando sale una versión nueva de Bruno |
| [compilar-y-publicar.md](compilar-y-publicar.md) | Compilar, publicar y retirar versiones |
| [seguridad.md](seguridad.md) | Electron, secretos, dependencias y entornos de producción |
| [decisiones.md](decisiones.md) | Registro de decisiones y de cambios en las reglas |
| [colecciones-en-equipo.md](colecciones-en-equipo.md) | Reglas para cualquier repositorio de colecciones compartido. No dependen del fork: valen también con el Bruno oficial |
| [logo.md](logo.md) | Ficheros del logo, cómo se generan y dónde se usa cada uno |
| [funciones/entornos-sensibles.md](funciones/entornos-sensibles.md) | Marcar entornos como sensibles y confirmar antes de enviar |
| [funciones/panel-git.md](funciones/panel-git.md) | Panel Git: sincronizar sin perder trabajo, resolver conflictos y salir de un detached HEAD |
| [funciones/flows.md](funciones/flows.md) | Flows: encadenar peticiones en un lienzo, sin código, y ejecutarlas viendo cada paso |
| [funciones/fork-9-a-11.md](funciones/fork-9-a-11.md) | Preferencias de Michi, etiquetas PDF/ZPL, QR, historial, hora local, interfaz en español, barrera solo en escrituras, sin telemetría y paneles de `bru.visualize` |

## Versión vigente

`4.3.0-fork.11`, sobre Bruno v4.3.0. Las versiones se publican en las [Releases del repositorio](https://github.com/jgallegs/michi_api/releases): instalador, zip para usar la app sin instalar y el `.sha256` de cada fichero. Detalle en [compilar-y-publicar.md](compilar-y-publicar.md).

## Roles

| Rol | Qué hace |
|---|---|
| Mantenedor principal | Aprueba enganches, dependencias y actualizaciones de Bruno. Etiqueta y publica versiones |
| Segundo mantenedor | Revisa las pull requests del principal. Lo sustituye en actualizaciones urgentes |

Cada pull request la revisa el mantenedor que no la ha hecho.
