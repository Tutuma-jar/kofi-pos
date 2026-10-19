# Kofi

Base técnica de un POS web. Las funcionalidades de las US todavía no están implementadas: consulta el [tracker](docs/progress/tracker.md), el [producto](docs/ai-context/product.md) y el [alcance fundacional autorizado](docs/specs/technical-bootstrap.md).

## Requisitos

- Node **24.19.0** (`.node-version`); engines admite versiones compatibles de la rama 24 desde esa versión.
- npm **11.17.0**, sin modificar instalaciones globales.
- No se necesita MongoDB para este arranque.

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

En otra:

```powershell
npm run dev:backend
```

- React: <http://127.0.0.1:5173>. Muestra solo contenido técnico, sin página funcional o diseño definitivo.
- Express: <http://127.0.0.1:3000>. No tiene endpoints de negocio: `/api` devuelve **404**, no indica un fallo de arranque.
- Puertos fijos en Vite para evitar cambiar de puerto silenciosamente. Express admite `PORT` entre 1 y 65535; opcionalmente copiar `backend/.env.example` a `backend/.env`. Nunca guardar credenciales en Git.
- Los servidores escuchan solo en loopback y usan HTTP local. Esto no constituye despliegue ni resuelve HTTPS, origen común, proxy, sesiones o contratos de API de las futuras US.

## Comprobaciones técnicas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm test` ejecuta únicamente el montaje React con Vitest/Testing Library/jsdom y el humo de Express con Vitest/Supertest. No prueba ventas, autenticación, datos ni criterios de las US. `npm run format` formatea solo los archivos del arranque, no los documentos, herramientas o prototipos previos.

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

No hay login, sesiones, Dashboard, catálogo, ventas, modelos, conexión MongoDB, almacenamiento de imágenes, infraestructura operativa ni prototipo de pestaña. React Router, MongoDB, Zod y Playwright están elegidos, pero se instalarán cuando exista trabajo autorizado que los necesite. La primera CI remota verifica exclusivamente el bootstrap, no requisitos de las US ni despliegue.

El control rápido de OpenCode sigue comprobando configuración y documentación. No ejecuta estos scripts ni acredita las US; el principal selecciona y ejecuta las comprobaciones técnicas por separado, conforme a [documentación](docs/ai-context/documentation.md#7-procedimiento-de-testing). Las funcionalidades requieren autorización posterior.
