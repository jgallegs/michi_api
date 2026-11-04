# Registro de enganches

Cada fichero de Bruno modificado tiene que aparecer aquí. Un ID no se reutiliza: los enganches que se quitan se marcan como `RETIRADO`.

| ID | Tipo | Fichero de Bruno | Zona | Qué hace | MR | Desde |
|---|---|---|---|---|---|---|
| H-01 | código | `packages/bruno-app/src/components/Environments/EnvironmentSettings/EnvironmentList/EnvironmentDetails/index.js` | cabecera, bloque `actions` | Muestra el interruptor *Sensitive* del entorno | — | v4.3.0-fork.1 |
| H-02 | código | `packages/bruno-app/src/components/Environments/EnvironmentSelector/index.js` | dentro de `.environment-selector` | Muestra el aviso *Sensitive* junto al selector cuando el entorno activo está marcado | — | v4.3.0-fork.1 |
| H-03 | código | `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js` | `sendRequest`, antes de preparar la petición | Pide confirmación antes de enviar (HTTP, GraphQL, gRPC y WebSocket) | — | v4.3.0-fork.1 |
| H-04 | código | `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/RunCollectionItem/index.js` | `onSubmit` | Pide confirmación antes de lanzar el runner | — | v4.3.0-fork.1 |
| H-05 | código | `packages/bruno-app/src/pages/Main.js` | dentro de los providers, junto a `children` | Monta la ventana de confirmación con el tema de la app | — | v4.3.0-fork.1 |
| H-06 | código | `packages/bruno-app/src/components/Bruno/index.js` | inicio del componente | Muestra el logo propio (`components/fork/AppLogo`) en barra de título, bienvenida y pantalla de error | — | v4.3.0-fork.2 |
| H-07 | build | `packages/bruno-electron/src/about/256x256.png` | fichero completo (binario) | Icono de la ventana y del "Acerca de". Se regenera con `fork/packaging/make-icon.py`; al actualizar Bruno, conservar el nuestro | — | v4.3.0-fork.2 |
