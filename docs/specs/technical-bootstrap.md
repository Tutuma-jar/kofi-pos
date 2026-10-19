# Kofi — Arranque técnico mínimo

## Objetivo y aprobación

El 2026-10-18 el responsable respondió «ok autorizo» a implementar el arranque técnico propuesto con `architect`, después de confirmar que no implementa ninguna de TASK-001 a TASK-032. Se autoriza una única entrega fundacional con código técnico, dependencias y comprobaciones locales. No se crean US ni IDs de tareas funcionales; las 13 historias y 32 tareas mantienen sus estados en el [tracker](../progress/tracker.md).

Esta excepción acotada a la etapa documental se recoge en la [constitución](../ai-context/constitution.md#11-etapa-actual). Aplica la [base técnica aprobada](../ai-context/architecture.md#7-base-técnica-mínima-aprobada); los pendientes de identidad de pestaña, catálogo y ventas no bloquean este esqueleto sin funcionalidades.

## Alcance autorizado

- npm workspaces, lockfile raíz y aplicaciones mínimas en `frontend/` y `backend/`.
- React montado con Vite y Express arrancable, sin rutas de negocio ni comunicación funcional entre aplicaciones.
- TypeScript, desarrollo, build, tipos, lint y formato con comandos reproducibles.
- Pruebas de humo técnicas de montaje React y aplicación Express; no casos de negocio ni pruebas de las US.
- Configuración local y ejemplos sin secretos; instalación únicamente de dependencias aprobadas necesarias para esta entrega.
- Documentar comandos, versiones y resultados reales. No activar hooks nuevos ni CI.

## Exclusiones

Sin login, sesiones, identidad de pestaña, prototipos experimentales, navegación funcional, mocks de negocio, Dashboard, catálogo, selección, cálculos de ventas, revisión, registro, modelos, acceso a MongoDB, imágenes, Atlas, despliegue, HTTPS operativo, CI, commits o pushes. Sin inicio/cierre de tareas o historias del tracker.

## Criterios y verificación seleccionada

- B-01: workspaces y lockfile resuelven versiones compatibles con Node 24.19.0 y npm 11.17.0. Verificar instalación y árbol de dependencias; las versiones exactas se guardan en manifests/lockfile. No actualizar Node/npm globales.
- B-02: React monta contenido exclusivamente técnico. Verificar humo con Vitest/Testing Library y servir el build para comprobar HTML/módulos; no es diseño de página de producto.
- B-03: Express arranca sin servicios externos y sin endpoints funcionales. Verificar con Vitest/Supertest una ruta no definida y con el proceso compilado mediante HTTP local.
- B-04: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` y `npm run build` pasan. Repetir solo comprobaciones afectadas por correcciones; no generar pruebas ficticias de módulos inexistentes.
- B-05: alcance y documentación coherentes, tracker y especificaciones funcionales intactos. Ejecutar control local de sintaxis/JSON/enlaces y comparar fingerprints anteriores a este trabajo. El control rápido no ejecuta los comandos nuevos ni verifica el POS; su limitación se informa, no se elimina ampliando el hook sin autorización.
- B-06: comandos de desarrollo y producción técnica arrancan localmente; comprobar recursos de frontend y respuesta HTTP de Express, y detener los procesos creados. Sin conexiones a datos reales.

Los comandos concretos se mantienen en el [README](../../README.md). Las pruebas de humo no acreditan criterios de ninguna US. La selección y revisión de React Best Practices son técnicas: no se diseña una página con Impeccable y no procede una revisión visual de producto en este alcance.

## Versiones y dependencias

Se fija Node 24.19.0, disponible en el entorno, y npm 11.17.0, sin cambiar instalaciones globales. TypeScript 6.0.3 se elige frente a 7 porque `typescript-eslint` 8.71.2 declara soporte `>=4.8.4 <6.1.0`. Se comprobaron engines y peers de las dependencias directas en el registro npm antes de instalar.

Se instalan React/React DOM, Vite/plugin React, Express, TypeScript, tsx, ESLint y sus adaptadores necesarios, Prettier, Vitest, Testing Library/DOM con jsdom y Supertest, además de tipos asociados. jsdom proporciona DOM al humo React; globals y los adaptadores de ESLint son soporte de la herramienta ya aprobada. No son funcionalidades ni decisiones de producto nuevas.

React Router, MongoDB, Zod y Playwright permanecen seleccionados para su trabajo posterior, pero no se instalan sin uso en este arranque. No se descargan navegadores. npm ignora lifecycle scripts de terceros y usa versiones exactas; los scripts locales se ejecutan explícitamente.

## Evidencia de ejecución

Verificación local del 2026-10-18 con Node 24.19.0 y npm 11.17.0, ejecutada por herramientas de shell del principal. Sin commits ni integración a rama de destino. Cubre exclusivamente los archivos del bootstrap y su documentación, no criterios de las US.

| Criterio | Comprobación y resultado real |
| --- | --- |
| B-01 | `npm install --ignore-scripts --no-audit --no-fund` y después `npm ci --ignore-scripts --no-audit --no-fund`: instalación y reinstalación desde lockfile correctas, sin lifecycle de terceros. `npm ls --depth=0` sin dependencias inválidas; comparación manifests/lockfile consistente y versiones exactas. `npm audit --json`: cero vulnerabilidades conocidas en la consulta realizada; no es garantía permanente. |
| B-02/B-03/B-04 | `npm test`: dos archivos y dos pruebas de humo correctas, una React y una Express; repetidas después de `npm ci`. React monta contenido técnico; Express responde 404 en `/api` sin `x-powered-by`. |
| B-04 | `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`: correctos. Frontend genera HTML/bundle y backend emite JavaScript sin incluir tests en `dist/`. `npm run format` se aplicó antes, únicamente a archivos nuevos del alcance. |
| B-05 | `node .opencode/scripts/kofi-check.mjs verify --context .opencode/.cache/kofi-check/bootstrap-foundation.context.json`: alcance sin desviaciones, sintaxis de un módulo, ocho JSON y 117 destinos de enlaces válidos. El script mantiene su salida 2 y advertencia `PENDIENTE aplicación` por la limitación descrita debajo; no se declara éxito integral del control. Comparación SHA-256 contra su base inicial: 30 archivos nuevos/modificados dentro del alcance, 235 archivos previos fuera de alcance intactos, incluidas las 13 US y el tracker con sus 32 tareas pendientes. Comprobados además 28 anchors locales. |
| B-06 | Ejecución de los comandos npm reales `dev:frontend`, `dev:backend`, `preview --workspace @kofi/frontend` y `start --workspace @kofi/backend`. HTTP y módulos de frontend correctos en 5173/4173; Express 404 esperado en 3000 y, para evitar colisión durante la comprobación paralela, desarrollo con `PORT=3001`. Rechazados `PORT=abc`, `0`, `65536` y `1.5` con salida 1 y mensaje de configuración. Detenidos únicamente los árboles de procesos creados para comprobarlo y verificados sus puertos libres. |

La comparación y el recorrido HTTP se ejecutaron con utilidades locales en `.opencode/.cache/kofi-check/`, ignoradas por Git; no son un nuevo sistema de testing ni otra fuente de estado. Para reproducir el recorrido se usan los comandos del README, consultas HTTP a los puertos indicados y los límites de PORT anteriores. No se comprobaron navegador real, identidad de pestaña, acceso, persistencia, ventas, métricas, imágenes, despliegue o restauración: están excluidos y no se presentan como pruebas superadas.

### Limitación del control rápido

`kofi-check.mjs` tiene una condición fija que emite `PENDIENTE aplicación` ante cualquier archivo de frontend/backend y no reconoce los comandos recién configurados. No se modificó el control ni se omitió su resultado. Las verificaciones técnicas seleccionadas en B-01 a B-06 se ejecutaron por separado, con los resultados anteriores. Esto no autoriza ni acredita pruebas funcionales del POS; registrar comandos en el hook o ampliar su mecanismo requiere otro alcance. No hay criterios funcionales implementados pendientes de cerrar, porque no se implementó ninguna US.

Revisión técnica React con `react-best-practices`: componente estático sin estado, efectos, fetch, dependencias visuales o abstracciones; importación directa de App y un único montaje bajo StrictMode. Sin optimizaciones especulativas ni reglas de Next.js. No se realizó un diseño de página de producto con Impeccable, por lo que no procede cierre visual con Emil en esta entrega técnica.
