# Kofi

POS web en desarrollo. Acceso tiene implementación local conectada a Express y MongoDB; los límites de identidad de pestaña y la evidencia se registran en la [entrega de Acceso](docs/progress/access-module-integration.md). Consultar el [tracker](docs/progress/tracker.md) para el estado oficial, no asumir el resto del POS implementado.

## Requisitos

- Node **24.19.0** (`.node-version`); engines admite versiones compatibles de la rama 24 desde esa versión.
- npm **11.17.0**, sin modificar instalaciones globales.
- Docker con Docker Compose para MongoDB local (replica set de un nodo, necesario para transacciones). El acceso real requiere frontend, API y MongoDB; las pruebas unitarias de frontend no requieren Docker.

## Instalación

Desde la raíz:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
```

Se usa un único `package-lock.json` y npm workspaces. `.npmrc` fija versiones exactas y deshabilita lifecycle scripts de terceros; los comandos locales se ejecutan explícitamente con `npm run`. Si una futura dependencia necesita un script de instalación, revisarlo antes de habilitarlo. No usar `npm audit fix --force` ni cambiar versiones indiscriminadamente.

## Desarrollo

En una terminal:

```powershell
npm run dev:frontend
```

En otra, con MongoDB local levantado y `backend/.env` creado a partir de `backend/.env.example`:

```powershell
npm run db:up --workspace @kofi/backend
```

```powershell
npm run dev:backend
```

`db:up` inicia [backend/compose.yaml](backend/compose.yaml) y espera a que el replica set `rs0` esté listo; la primera vez lo inicializa. Los datos persisten en el volumen `kofi_mongo-data`. `npm run db:down --workspace @kofi/backend` detiene el contenedor sin borrar el volumen. El backend no arranca sin `MONGODB_URI` válido o si MongoDB no es replica set.

- React: <http://127.0.0.1:5173>. Login y pantallas existentes; Vite redirige `/api` a Express en 3000 para usar el mismo origen. No usar secretos en parámetros de URL.
- Express: <http://127.0.0.1:3000>. API de sesiones en `/api/sessions`; `/api` sin ruta concreta devuelve **404**, no indica un fallo de arranque.
- Puertos fijos en Vite para evitar cambiar de puerto silenciosamente. Express admite `PORT` entre 1 y 65535; opcionalmente copiar `backend/.env.example` a `backend/.env`. Nunca guardar credenciales en Git.
- Los servidores escuchan solo en loopback y usan HTTP local. En producción se requiere HTTPS y proxy de `/api` en el mismo origen; el proxy de Vite es únicamente de desarrollo.

### Cuenta externa y Acceso

No se crea ninguna cuenta automáticamente ni existe contraseña predeterminada. La provisión es un paso administrativo externo a la aplicación. Con `MONGODB_URI` en el entorno, ejecutar desde la raíz `node --import tsx backend/scripts/provision-account.ts` y suministrar un único objeto JSON por entrada estándar, con `username` y `password`. No pasar secretos por argumentos, URL, comandos guardados o archivos versionados. El script crea una cuenta nueva con scrypt y sal individual; no modifica ni recupera cuentas existentes. Usar una entrada estándar segura, sin eco ni historial, desde el gestor de secretos del operador.

Para desarrollo, `backend/.env` contiene `PORT=3000` y `MONGODB_URI=mongodb://127.0.0.1:27017/kofi?replicaSet=rs0`. Es un archivo local ignorado por Git. `PRODUCT_IMAGES_DIR` indica dónde el backend guarda las imágenes de producto: es obligatoria con `NODE_ENV=production` y, si falta en desarrollo, se usa `backend/var/product-images`, también ignorada por Git. El provisionador lee el entorno del proceso, no carga ese archivo automáticamente. Chrome y Edge requieren almacenamiento del sitio y Web Locks; otras plataformas no se acreditan. No considerar almacenamiento o navegación una prueba infalible de identidad de pestaña.

## Comprobaciones técnicas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm test` ejecuta pruebas React/cliente HTTP con Vitest/Testing Library/jsdom y pruebas unitarias de Express, credenciales y configuración. No sustituye MongoDB real, navegador real ni prueba ventas.

Con MongoDB local levantado, las pruebas de integración del backend usan una base temporal que se elimina al terminar. No forman parte de `npm test` ni de la CI:

```powershell
npm run test:integration --workspace @kofi/backend
```

`npm run format` formatea solo los archivos del arranque, no los documentos, herramientas o prototipos previos.

Tras compilar:

```powershell
npm run preview --workspace @kofi/frontend
```

```powershell
npm start --workspace @kofi/backend
```

Preview: <http://127.0.0.1:4173>. Es una comprobación del build local, **no un servidor de producción**. Detener cada proceso con `Ctrl+C`.

## CI inicial en GitHub Actions

El workflow [CI](.github/workflows/ci.yml) se ejecutará al publicar cambios en
`develop`, abrir/actualizar PR hacia `develop` o solicitar una ejecución manual.
El check estable se llama **`technical-checks`**. La ejecución manual requiere que
el workflow esté disponible en la rama predeterminada del repositorio GitHub.

- Usa Node de `.node-version`, npm exacto de `packageManager` y el lockfile raíz.
  Un ajuste de npm ocurre solo en el runner efímero, no en la instalación del usuario.
- Para cambios técnicos ejecuta instalación sin lifecycle de terceros y los cinco
  comandos de comprobación anteriores. Solo cachea la descarga npm, no resultados
  locales de pruebas ni `node_modules`.
- Documentación en `docs/` y Markdown fuera de aplicaciones omite instalación/build/pruebas.
  README raíz conserva solo formato, sin build. Los archivos de frontend/backend,
  incluso Markdown o fixtures, se consideran entradas técnicas por seguridad.
- Primer push, ejecución manual, cambios de CI o diff incierto ejecutan la base completa.
  Las reglas del selector se comprueban siempre y el check existe también en PR documentales.
- No necesita secretos, MongoDB, navegadores, despliegues o permisos de escritura.
  El resultado actual solo acredita la base técnica y sus pruebas disponibles, no las US.

Para comprobar localmente las reglas de selección:

```powershell
node --test .github/scripts/ci-scope.test.mjs
```

La base está publicada en GitHub y la primera ejecución completa de CI pasó;
la [evidencia remota](docs/progress/CHANGELOG.md#2026-10-19) identifica el commit y la ejecución.
La política de integración autorizada para `develop` exige `technical-checks` de
GitHub Actions correcto y la rama actualizada antes de integrar, también para administradores.
Esa protección se configura y verifica en GitHub, no se activa por el YAML.
Para trabajo nuevo, crea una rama de trabajo y abre una PR hacia `develop`; no
se exige un revisor humano adicional como parte de esta configuración inicial.

## Límites y próximos pasos

Acceso incorpora sesiones opacas revocables y presencia, con protección conservadora de pestaña y limitaciones explícitas de restauración/duplicación nativas. Dashboard es el destino de entrada; no se implementan aquí indicadores, catálogo real, ventas ni almacenamiento de imágenes. React Router ya está instalado; no se añade Playwright. La CI remota previa no acredita estos cambios locales ni los requisitos de las US.

El control rápido de OpenCode sigue comprobando configuración y documentación. No acredita por sí mismo las US; el principal selecciona y ejecuta las comprobaciones técnicas conforme a [documentación](docs/ai-context/documentation.md#7-procedimiento-de-testing).
