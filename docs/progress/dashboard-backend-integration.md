# Dashboard — Implementación integrada y límites

## Alcance y autorización

Implementación conjunta de US-003, US-004 y US-005, trazable a TASK-008,
TASK-010, TASK-012 y TASK-014. Contrato autoritativo en
[US-003](../specs/us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización).
El responsable autorizó expresamente el consumidor completo, datos aislados,
SSE sobre fetch, adaptación de Acceso y ajustes mínimos de composición/texto.
Posteriormente exigió mover todos los cambios a otra rama y reducir las
verificaciones al mínimo. Rama: `feat/dashboard-backend-integrado`; la entrega
inicial quedó sin commits ni push. La ampliación posterior autoriza un commit,
push de esta misma rama y PR hacia develop si sus comprobaciones pasan, sin merge,
rebase, ramas nuevas ni modificación del tracker. Sin subagentes.

## Archivos y arquitectura

- `backend/src/dashboard/`: contrato/proyección, validación, períodos, lectura
  MongoDB, rutas, emisor SSE y pruebas. Sin modelos comerciales nuevos.
- `backend/src/app.ts`: monta Dashboard antes del router de sesiones, comparte
  el servicio de autorización y expone el emisor al punto de composición.
- `backend/src/auth/auth.routes.ts` y `sessions.service.ts`: reutilización del
  servicio y notificación después de revocar una sesión; no cambian credenciales.
- `backend/src/server.ts`: cierra streams antes de cerrar el servidor.
- `frontend/src/dashboard/api/`: transporte real, validación de respuesta,
  parser SSE, reconexión y agrupación de lecturas, con sus pruebas.
- `frontend/src/auth/api/`: transporte autorizado de respuestas sin consumir
  JSON; misma seguridad de origen, cabeceras y generación de sesión.
- `frontend/src/auth/api/application-client.ts`: renombra el anterior
  `demo-client.ts`, que ya creaba una instancia real. `App.tsx` usa el nombre
  inequívoco. No se introducen cookies ni credenciales en URL.
- `DashboardPage.tsx`: instancia real y estado veraz de lectura confirmada;
  conserva componentes, estructura, estilos y los fixtures solo por inyección
  explícita para pruebas/demostraciones. Prueba de página ajustada al single-flight.

## HTTP y SSE

- `GET /api/dashboard-periods/today|month`: un snapshot con `period`,
  `periodEndsAt`, `summary`, `products` y exactamente 24 `hourlySales`.
- `GET /api/dashboard-events`: `sales-changed` con `{}`, comentario de latido
  cada 25 segundos, sin replay, período, ids de eventos ni resultados numéricos.
- Ambos requieren Bearer y `X-Tab-Authorization`, sin query ni cuerpo.
  Conservan no-store, ETag desactivado y envoltorio de error común.
- Apertura no autorizada: 401 JSON. Se revalida la sesión antes de cada envío,
  al vencimiento conocido y tras ampliaciones externas de presencia. Revocación
  en el proceso cierra inmediatamente los streams. El stream no renueva presencia.
- Desconexión, cliente lento, comprobación de autorización solapada o apagado
  limpian suscriptores/temporizadores; no existe cola ilimitada por cliente.

## Fuente de datos: no confundir consumidor con productor

`DashboardSource` es configuración interna confiable: nombres de dos colecciones
y etapas de proyección. No se recibe por HTTP. Las proyecciones semánticas
`DashboardSaleProjection` y `DashboardCatalogProjection` describen únicamente
la entrada de lectura, no el esquema definitivo de Gestión de ventas.

La aplicación normal **no tiene una fuente comercial configurada**. Por petición
posterior expresa del responsable, `server.ts` activa `dashboardDemo: true`:
`dashboard-demo.ts` sustituye exclusivamente la fuente ausente con datos coherentes
en memoria, y las rutas HTTP/SSE y sesiones continúan siendo reales. No tiene
dependencia de MongoDB ni escribe ventas ficticias. Sin esa opción, la ausencia
de fuente sigue siendo 500; una fuente real tiene prioridad sobre la demostración
y un fallo real nunca activa un fallback. Para conectar Gestión de ventas basta
retirar esa opción e inyectar `DashboardSource`.

El cuerpo JSON permanece idéntico al contrato aprobado. La cabecera de lectura
`X-Kofi-Dashboard-Mode: demo` permite al cliente mostrar discretamente «Datos de
demostración», también en vacío. Un temporizador de 15 segundos modifica la
muestra en memoria y publica `sales-changed` mediante `publishSimulatedChange`
solo con suscriptores presentes. Los conteos no decrecen y la muestra está acotada
a 40 operaciones del día; al alcanzar el límite se siguen enviando invalidaciones
sin inventar nuevos registros. Se detiene al cerrar el emisor. El hook
`publishPersistedSale` del productor definitivo permanece separado.
Se conservan carga, vacío, error y recuperación. Los escenarios vacío/error se
inyectan exclusivamente en pruebas; no se agregan endpoints para simular ventas.

Solo las pruebas usan `fixture_sales` y `fixture_products` dentro de una base
local única `kofi_dashboard_test_<id>`. El helper valida conexión local y nombre
antes de limpiar. Allí una venta contiene `registered`, `registeredAt`,
`paymentMethod`, `totalTenths` y líneas con `productId`, `quantity`,
`revenueTenths`; los enteros se guardan como Long. El catálogo proyecta `name`
como `currentName`, sin filtrar inactivos. Esto es infraestructura de prueba.

La lectura usa `$match` temporal, `$facet`, agrupaciones y `$lookup` posterior
a agrupar productos. Se ejecuta con readConcern snapshot y preferencia primary,
comprobados contra MongoDB real. El índice temporal solo se instala en pruebas;
el productor definitivo será responsable de sus índices comerciales.

El reloj se captura una vez. Límites civiles en America/La_Paz, intervalo
[inicio, fin), exclusión de instantes futuros y horas mediante timezone IANA.
Sumas Decimal128 desde enteros exactos, comprobación antes de convertir a number
y comprobación cruzada de los tres bloques mediante BigInt. Desbordamiento,
método desconocido, líneas incoherentes o referencia ausente generan 500 controlado.
No se omite el producto roto ni se sustituye su nombre actual por el histórico.

## Actualización del cliente

Lectura inicial, invalidación, reconexión, conciliación de 30 segundos,
cambio de hora/día/mes, periodEndsAt y retorno de suspensión. Detector de
silencio de 60 segundos, comprobado cada segundo; apertura/lecturas con abort.
Reconexión inmediata inicial y backoff con jitter acotado a 10 segundos.
SSE se decodifica incrementalmente con UTF-8, CRLF, comentarios y frames múltiples,
limitando el tamaño de líneas/frames. No usa EventSource nativo.

Una lectura en curso por período y una relectura pendiente agrupan ráfagas.
El cambio de período puede sustituir una generación anterior sin esperar su red.
Las generaciones descartan respuestas antiguas; el cliente común de Acceso
impide que un 401 anterior termine una sesión posterior. Actualización conjunta
del snapshot, nunca incrementos de cifras. Fallo conserva datos marcados como
no actualizados, no como vacío.

## Verificación ejecutada

- Docker existente: `kofi-mongo-1`, imagen 8.0.34, healthy; ping=1,
  isWritablePrimary=true, setName=rs0. Puertos 27017, 3000 y 5173 escuchando.
  Sin eliminar contenedores, volúmenes ni datos ajenos.
- `npm run typecheck`: ambos workspaces correctos.
- Backend: 46 pruebas unitarias correctas en la ejecución realizada.
- `npm run test:integration --workspace @kofi/backend -- src/dashboard/dashboard.integration.test.ts src/dashboard/dashboard-events.integration.test.ts`:
  20 pruebas correctas con MongoDB aislado. Incluyen snapshot concurrente,
  integridad, límites, renombrado/desactivación, autorización, SSE real,
  latido, expiración, revocación, clientes lentos y cierre.
- Frontend afectado: cinco archivos, 34 pruebas correctas (cliente compartido
  streaming, parser, coordinación, transporte real y página). La primera suite
  completa detectó dos expectativas de tiempo incompatibles con single-flight
  y el tick del watchdog; se corrigieron con diagnóstico y se verificó el alcance
  afectado, sin repetir toda la suite por petición del responsable.
- Integración real aislada:
  `node --import tsx backend/src/dashboard/dashboard-flow.check.mjs`, con
  MONGODB_URI local explícita: login de credenciales real, autorización real,
  frontend HTTP/SSE contra Express/MongoDB, actualización de los tres bloques,
  cambio a mes y cierre/401 correctos. Limpieza de la base temporal al terminar.
- Formato limitado a archivos modificados, sin normalización masiva.
- ESLint sobre los archivos TypeScript modificados/nuevos: correcto, cero avisos.
  Tras acotar el tiempo de apertura del stream se repitió únicamente su archivo
  afectado: seis pruebas correctas. No se repitieron las suites completas.
- No se ejecutaron builds, CI remota ni inspección visual de las dos dimensiones
  CSS en esta entrega reducida. No se declara ausencia de regresiones visuales
  comprobada en navegador. No se instalaron dependencias ni cambiaron estilos.

Lo anterior corresponde a la verificación inicial del consumidor. Para la
ampliación posterior de demostración se ejecutaron únicamente:

- `npm run typecheck`: ambos workspaces correctos.
- `npm run build`: backend y frontend correctos.
- `npm run test --workspace @kofi/backend -- src/dashboard/dashboard-demo.test.ts`:
  cinco pruebas correctas.
- Frontend: `real-dashboard-client`, `dashboard-client`, `DashboardPage`,
  `http-client` y `authorized-stream`: 43 pruebas correctas.
- Integración MongoDB local aislada, filtro `explicit demonstration|simulated notice`
  sobre los dos archivos de integración Dashboard: dos pruebas correctas,
  20 no seleccionadas. Comprueban HTTP autorizado, indicador de demostración,
  prioridad de la fuente real, ausencia de escrituras de ventas y aviso SSE simulado.

Las 50 pruebas seleccionadas pasaron; no se repitieron suites completas, lint,
CI ni revisión visual. No hubo cambios de dependencias, estilos ni tracker.

## Criterios y pendientes reales

La evidencia aislada cubre lógica de períodos y métricas de US-003 CA-01–04,
vacío/error de CA-06/09, agrupación/orden/históricos de US-004 CA-01–03/06/07,
y agrupación horaria de US-005 CA-02–04. Las pruebas de página cubren estados
y comportamiento de presentación existente, no una certificación visual final.

Quedan pendientes del productor real TASK-030/031 y catálogo TASK-016/018/022:
adaptar la proyección al esquema definitivo, preservar snapshots e idempotencia,
y llamar `app.locals.dashboardEvents.publishPersistedSale()` **solo después de
confirmar escritura duradera**. El Dashboard no implementa esas escrituras.
No se acredita CA-05 de actualización comercial entre sesiones ni CA-08 de
latencia (20 mediciones con el conjunto acordado), CA-07 visual definitivo,
accesibilidad manual de US-005 CA-06, ni garantías pendientes de pestaña TASK-005.
La precisión ante relojes de navegador muy desfasados y el único proceso Express
siguen siendo límites conocidos. Sin cierre de historias/TASK ni cambio del tracker.
