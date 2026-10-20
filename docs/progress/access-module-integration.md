# Acceso — implementación conjunta y evidencia local

## Encargo y continuidad

El 2026-10-19 el responsable autorizó completar US-001/US-002 conjuntamente mediante Backend, sin separar ramas por TASK ni detener el trabajo por dependencias internas. Autorizó recuperar trabajo propio necesario, ajustes mínimos de componentes y proxy, Docker/MongoDB local y verificaciones reales; sin push ni cambios remotos. Se conservan los criterios originales, incluida la identidad de pestaña no completamente demostrada.

Se trabajó en `feat/task-001-auth-credentials`, sobre `c111be37b13bf7e302e46b29e01fa6038ede9774`. Se reutilizaron credenciales y pruebas existentes y se recuperaron únicamente el runner y registro del experimento propio `d806682`. No se crearon ramas ni se incorporaron ramas ajenas. Backend implementó API y cliente; el principal hizo ajustes mínimos de componentes/configuración, verificaciones y documentación. No se usaron otros subagentes ni skills visuales; la revisión React fue técnica, sin rediseño.

El estado oficial pertenece exclusivamente al [tracker](tracker.md). Esta entrega local no acredita integración en `develop`, CI remota ni DoD total.

## Archivos

- Backend nuevos: `backend/scripts/provision-account.ts`; `backend/src/auth/auth.routes.ts`, `require-session.ts`, `session.model.ts`, `sessions.schemas.ts`, `sessions.service.ts`, `sessions.integration.test.ts`; `backend/src/shared/http/api-error.ts`, `error-codes.ts`, `error-handler.ts`, `not-found.ts`.
- Backend modificados: `backend/src/app.ts`, `backend/src/server.ts`. Se reutiliza `backend/src/auth/` de credenciales sin reimplementarlo ni cambiar dependencias.
- API frontend nuevos: `frontend/src/auth/api/fixture-auth-client.ts`, `real-auth-client.ts`, `real-auth-client.test.ts`, `tab-authorization.ts`, `access-flow.browser.mjs`; recuperado `tab-identity.experiment.mjs`.
- API frontend modificados: `auth-client.ts`, `contract.provisional.ts`, `demo-client.ts`, `http-client.ts`, `http-client.test.ts`, en la misma carpeta. Los fixtures solo se usan explícitamente en pruebas; la instancia de aplicación no tiene fallback simulado de autenticación.
- Interfaz/configuración: `frontend/src/auth/components/AuthenticatedAccess.tsx`, `ProtectedRoute.tsx`, `frontend/src/auth/pages/LoginPage.tsx`, `frontend/src/App.test.tsx`, `frontend/vite.config.ts`. Retirada la demostración de Acceso, mensajes mínimos de error y protección del estado sin conexión; sin estilos ni rediseño.
- Documentación: este registro, `README.md`, ambas especificaciones de Acceso, tracker, CHANGELOG y registro recuperado del experimento.
- Local no versionado: `backend/.env` con puerto 3000 y URI de desarrollo; contexto de controles `.opencode/task-access-module.local.json`.

## Contrato HTTP implementado

Mismo origen, `/api`, `Cache-Control: no-store`, sin ETag automático ni `X-Powered-By`, JSON máximo 100 KB, validación Zod estricta y fechas UTC ISO. Éxitos sin envoltorio adicional y errores `{ error: { code, message, details? } }`, sin contraseñas, tokens ni detalles MongoDB.

| Método y ruta                          | Entrada                              | Resultado                           |
| -------------------------------------- | ------------------------------------ | ----------------------------------- |
| `POST /api/sessions`                   | `{ username, password, tabBinding }` | 201 `{ session, sessionToken }`     |
| `GET /api/sessions/current`            | Cabeceras de autorización            | 200 `session`                       |
| `POST /api/sessions/current/presences` | `{}` y cabeceras                     | 200 `{ lastPresenceAt, expiresAt }` |
| `DELETE /api/sessions/current`         | Cabeceras, sin `version`             | 204 sin cuerpo                      |

`session` contiene `id`, `label`, `createdAt`, `lastPresenceAt`, `expiresAt`. Cabeceras: `Authorization: Bearer <token>` y `X-Tab-Authorization: <secreto de pestaña>`. No se aceptan tokens por URL ni parámetros de consulta. El transporte de pestaña sigue siendo una solución conservadora con los límites siguientes, no prueba de identidad física.

Credenciales incorrectas: 401 `INVALID_CREDENTIALS`; autorización inválida: 401 `UNAUTHORIZED`; intentos excesivos: 429 `AUTH_RATE_LIMITED` y `Retry-After`; entradas inválidas: 400; tamaño: 413; medio: 415; recurso/método desconocido: 404; fallos internos: 500 saneado. DELETE repetido con autorización revocada devuelve 401, no una confirmación inventada.

## Seguridad, sesiones y concurrencia

- Cuenta externa exacta y única por usuario. Scrypt asíncrono, sal individual y formato versionado ya implementado; se conserva comparación segura, derivación ficticia para usuarios desconocidos, cola acotada e intentos por IP de la conexión. No se confía en `X-Forwarded-For` enviado por el cliente.
- Token opaco de 32 bytes aleatorios y vinculador de pestaña de 32 bytes. MongoDB solo conserva sus hashes SHA-256; no conserva contraseñas ni tokens en claro.
- Cada sesión tiene `_id`, `accountId`, hashes, fechas de creación/última presencia/expiración, `revokedAt` y `endReason`. Índice único de token; no se depende de TTL para autorizar.
- Servidor autoritativo e inyectable para pruebas: `expiresAt > now` y `revokedAt: null` en cada autorización, renovación y revocación. La frontera `now >= expiresAt` rechaza; ni GET ni operaciones ordinarias renuevan.
- Renovación atómica con filtro de vigencia y `$max`; cierre atómico sin upsert. Una carrera puede admitir presencia antes del cierre, pero nunca reanimar una sesión ya revocada. Una operación admitida antes del cierre no se cancela retroactivamente.
- Varias sesiones no se desplazan; cierre/expiración solo afectan la actual. La caducidad es lógica y autoritativa aunque el documento histórico permanezca en MongoDB.
- Middleware `require-session` disponible y usado por las rutas protegidas de Acceso. Los endpoints de negocio de módulos aún simulados no se implementan ni se declaran protegidos por esta entrega. Al añadirlos deberán usar el middleware y el cliente autorizado común.
- Cliente: comprobación inicial antes del contenido protegido, presencia a 30 s sin teclado/ratón, un envío de presencia en curso, descarte por generación de respuestas antiguas, 401 de login separado de expiración y 204 sin parsing JSON. El deadline local es conservador, no sustituye el filtro del servidor.
- Cierre suspende operaciones locales. Solo 204 confirma; fallos conocidos e inciertos permanecen diferenciados y permiten reintento. Un 401 retira autorización, sin inventar un cierre confirmado anterior. Dispose/HMR no revocan sesiones automáticamente.

## Pestaña: garantías observadas y límites

Se combina `sessionStorage`, secreto por sesión y Web Lock exclusivo por ID de sesión, sin espera ni robo del lock. Un nuevo documento solo intenta reutilizar almacenamiento con navegación clasificada `reload`; `navigate` y `back_forward` lo descartan. Una copia que no obtiene lock descarta solo su autorización local, sin cerrar la sesión original. Sesiones independientes tienen locks independientes. No se usan cookies, `localStorage` ni mensajes con secretos.

Se bloquea el acceso si no hay almacenamiento/Web Locks utilizables. Reload valida contra el servidor antes de mostrar contenido. Al reanudar se comprueba la sesión; no se envía una revocación indiscriminada en `pagehide`, porque también sucede al recargar. Un cierre no notificado deja expirar la sesión en el servidor a los 120 s desde la última presencia válida.

**No es una identidad criptográfica de pestaña.** Una restauración nativa clasificada como reload y con almacenamiento intacto podría adquirir el lock liberado antes de los 120 s. No se demostró el comando nativo Duplicar, restauración de cierre/crash dentro del margen, BFCache ni carreras de discard/transferencia en los dos navegadores. La copia controlada y `window.open` no acreditan Duplicar. No se afirma que CA-04/CA-05 estén completamente satisfechos ni se sustituyen sus exigencias por heurísticas.

## MongoDB local y provisión

Antes de levantar servicios se comprobó 27017 sin escucha, un contenedor ajeno detenido (`mi-contenedor`) y dos volúmenes preexistentes ajenos; no se modificaron. Se ejecutó `docker compose -f backend/compose.yaml up -d --wait`. Se crearon los recursos propios `kofi-mongo-1`, red `kofi_default` y volumen persistente `kofi_mongo-data`; no se ejecutó `down -v` ni se borraron datos previos.

La conexión real mediante `connectDatabase` confirmó base `kofi`, puerto **27017**, replica set **rs0** y `isWritablePrimary: true`. No se usó 27018. Configuración local ignorada: `PORT=3000`, `MONGODB_URI=mongodb://127.0.0.1:27017/kofi?replicaSet=rs0`. Vite sirve 5173 y proxy `/api` a 3000. HTTPS y proxy de producción quedan para despliegue; HTTP solo loopback.

No se provisionó ninguna cuenta de desarrollo real ni se inventaron credenciales. El provisionador administrativo offline recibe JSON por stdin, usa el scrypt existente y crea una cuenta nueva; no es endpoint, registro público ni administrador de usuarios. El operador debe proporcionar la cuenta compartida por un canal seguro antes de usar el login local. Ver [instrucciones](../../README.md#cuenta-externa-y-acceso).

Las pruebas usan exclusivamente bases UUID generadas y cuentas efímeras; el cleanup comprueba el nombre exacto antes de eliminar su base. MongoDB y su volumen de desarrollo quedan disponibles, no se desmontan al acabar.

## Verificaciones ejecutadas

Por el principal con herramientas locales, sobre este conjunto de cambios:

- `npm run typecheck`: ambos workspaces correctos.
- `npm run lint`: correcto tras corregir dos diagnósticos iniciales de variables no usadas.
- `npm test`: **99 frontend y 30 backend**, todos correctos. Incluye UI/rutas, credenciales, 401/204, rate limit, errores, generaciones obsoletas, refresh colgado y deadline, presencia, cierre fallido/incierto, concurrencia del cliente y transporte de autorización. jsdom no acredita ciclo de pestaña real.
- `MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0` y `npm run test:integration --workspace @kofi/backend`: **15 correctas** con MongoDB real, incluidas credenciales, replica set/transacción y sesiones. Cubren emisión, hashes/índices, simultaneidad, GET sin renovación, frontera exacta de 120000 ms, renovaciones y revocaciones concurrentes, binding incorrecto, señales tardías, validación HTTP, límites, 429 y 500 saneado.
- `npm run build`: ambos workspaces correctos.
- Provisionador externo: comprobación adicional con proceso real, usuario/contraseña generados y entrada UTF-8 partida entre chunks; salida correcta, contraseña original verificada con scrypt y ausencia de contraseña en claro en MongoDB. Se usó exclusivamente una base `kofi_provision_test_<UUID>`, eliminada al acabar. El diagnóstico inicial de importación Windows del runner temporal se corrigió antes de ejecutar la provisión; no afectó datos de desarrollo.
- Formato: Prettier específico sobre todos los archivos afectados correcto; `git diff --check` correcto. `npm run format:check` global devuelve 1 por **68 archivos preexistentes** fuera del cambio, principalmente CRLF; no se hizo normalización masiva ni se atribuye éxito global.
- Control `/kofi-start`: referencias/alcance aceptados; su base inicial incluía cambios propios recuperados y ya aplicados durante este encargo, revisados expresamente por el principal. No se usa ese control para atribuirlos a terceros ni omitir su revisión.
- Control `/kofi-verify`: requisitos, alcance, sintaxis y enlaces correctos (141 destinos al ejecutarlo); salida 1 por `PENDIENTE aplicación`, porque el control rápido no tiene comandos aprobados de pruebas del POS. Las comprobaciones de aplicación fueron seleccionadas y ejecutadas externamente, registradas arriba; no se modificó ni eludió el control para anunciar éxito.

### Navegadores reales

Runner CDP sin dependencias nuevas, ejecutables instalados en modo headless, perfiles propios y base UUID; no es emulación jsdom. `frontend/src/auth/api/access-flow.browser.mjs` inicia la API en 3000 con base aislada y requiere Vite en 5173; no ejecutar si un backend de desarrollo ya ocupa 3000. Desde la raíz:

```powershell
npm run dev:frontend
```

En otra terminal, uno cada vez:

```powershell
node --import tsx frontend/src/auth/api/access-flow.browser.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
node --import tsx frontend/src/auth/api/access-flow.browser.mjs "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

- Chrome **155.0.8059.80**: 20 observaciones integradas correctas, incluida desconexión/congelación CDP durante 121 segundos reales y login obligatorio al reanudar; amplía las 18 observaciones iniciales.
- Edge **155.0.4283.62**: 20 observaciones correctas, incluida desconexión/congelación CDP durante 121 segundos reales, rechazo de la autorización y login obligatorio al reanudar.
- Ambos: ruta protegida sin login, rechazo visible de contraseña incorrecta, login a Dashboard, persistencia solo de hashes, presencia sin actividad, reload normal/forzado, pestaña nueva, fallo de red, dos logins independientes, copia por opener y copia controlada sin lock, cierre desde hamburguesa, presencia tardía rechazada, otra sesión intacta, nuevo login, rechazo de sesión expirada al recargar y cierre de pestaña propia.
- Perfiles propios y bases efímeras eliminados. Primer intento del runner se detuvo antes de abrir navegador porque un argumento duplicado de Vite provocó 404; corregido el lanzamiento, el recorrido de Chrome pasó. No se ocultó el intento inicial ni se tocó otro servicio.
- No se acredita suspensión física del equipo, comando nativo Duplicar/restaurar, cierre/restauración completa de ventana ni acceso simultáneo desde dos computadoras. Congelación CDP es un escenario controlado, no suspensión del sistema operativo.

## Criterios y pendientes reales

- US-001 CA-01/02: entrada y rechazo acreditados con UI + API + MongoDB reales; otro login no desplaza al primero.
- CA-03/06: guardas de pantallas existentes y operaciones de Acceso comprobadas, sin roles. La cobertura debe ampliarse al incorporar operaciones reales de otros módulos; no se afirma un POS completo.
- CA-04: simultaneidad de sesiones y bloqueo de copias controladas observados; duplicación/restauración nativas sin garantía completa.
- CA-05/07: presencia sin actividad, cierre manual y reload observados. Cierre/restauración nativa y su margen no completamente acreditados.
- CA-08: frontera temporal exacta y aislamiento en MongoDB; presencia y desconexión/congelación durante 121 segundos reales en ambos navegadores. Suspensión física no verificada.
- CA-09: autorización revocada/expirada rechazada por el servidor, sin reactivación, y nuevo login comprobado; no garantiza distinguir todo origen de pestaña antes de expirar.
- US-002 CA-01: acción compartida existente; pruebas React cubren acceso y navegación de pantallas existentes, con recorrido real de cierre desde Dashboard. No se acreditan pantallas futuras.
- US-002 CA-02/03: 204 y revocación inmediata de solo la sesión actual, señales tardías rechazadas, retorno a login y nuevo acceso comprobados. Errores y resultados inciertos también cubiertos con transporte controlado.
- Continúan pendientes los casos nativos señalados, la cuenta externa real de desarrollo, comprobaciones del despliegue HTTPS y la integración/CI de destino. No se declara el módulo totalmente terminado ni se marcan historias completadas.

## Comprobación final de operación local

Frontend en 5173 y backend de desarrollo en 3000 quedaron ejecutándose conjuntamente con MongoDB. Petición real a `http://127.0.0.1:5173/login`: 200; vía proxy a `/api/sessions/current` sin autorización: 401 `UNAUTHORIZED` con `no-store`. Docker confirmó `kofi-mongo-1` saludable, mapeo `127.0.0.1:27017`; conexión final confirmó `rs0` primario escribible. La base `kofi` conserva **0 cuentas y 0 sesiones**, sin cuentas de prueba ni credenciales fijas. No quedaron bases de las suites de Acceso. Para entrar con credenciales propias hace falta la provisión externa indicada; los recorridos reales ya se validaron con cuentas efímeras aisladas.

Al cerrar la entrega conjunta inicial, los cambios permanecían locales en la rama existente, sin nuevo commit, push ni modificaciones remotas. Los dos commits anteriores conservan su historial. El registro de archivos incluye también los nuevos no rastreados, no solo el resumen de `git diff`.

## Actualización posterior: cuenta local de prueba

Por encargo expreso del responsable, el principal provisionó `kofi-demo`, sin subagentes, en `kofi.accounts` de `127.0.0.1:27017`, replica set `rs0` primario escribible. Esta operación posterior cambia la fotografía anterior de cero cuentas: ahora existe una cuenta de prueba, sin aprovisionar una cuenta de producción.

Se reutilizó `backend/scripts/provision-account.ts`, añadiendo consulta previa de existencia antes de derivar el hash o insertar. El índice único conserva la protección frente a carreras. Se generó una contraseña aleatoria de 24 bytes con `node:crypto`, suministrada por stdin, sin secretos en código, archivos de configuración o este registro. Se verificaron el hash scrypt existente y el rechazo de una segunda provisión sin cambiar el hash ni duplicar la cuenta.

Verificación real desde el frontend en navegador: login con `kofi-demo`, llegada a `/dashboard`, presencia recibida sin actividad, cierre mediante menú hamburguesa y retorno a `/login` con mensaje de cierre confirmado. MongoDB confirmó `revokedAt` persistido y `endReason: manual`. Volver a `/dashboard` después del cierre redirigió a login. Tipos de backend, ESLint del script y Prettier específico correctos. No se modificaron componentes, diseño, otros módulos, ramas ni remotos.

Para Compass: URI `mongodb://127.0.0.1:27017/kofi?replicaSet=rs0`, base `kofi`, colección `accounts`, filtro `{ "username": "kofi-demo" }`. La contraseña no es recuperable desde Compass: solo se guarda su hash salado.

## Solicitud posterior de detener servicios y preparar PR

El responsable pidió detener la ejecución y crear una PR. El principal detuvo los procesos propios de Vite y Express, incluido el watcher, y ejecutó `docker compose -f backend/compose.yaml stop`, sin eliminar contenedores, volúmenes ni la cuenta de prueba. Se comprobó que 5173, 3000 y 27017 quedaron sin escucha. Para volver a usar Kofi o Compass hay que iniciar MongoDB y los servidores con los comandos del README.

Esta solicitud autoriza publicar la rama existente para revisión, no integrar ni modificar criterios. La PR debe conservar explícitos el formato global preexistente fallido, los casos nativos de pestaña no acreditados y la ausencia de DoD total. No se publican la contraseña de prueba ni archivos locales ignorados.
