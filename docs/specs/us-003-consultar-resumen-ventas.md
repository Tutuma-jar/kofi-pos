# US-003 — Consultar el resumen de ventas

## Descripción

Como operador, quiero consultar las ventas e ingresos de hoy o de este mes, para conocer los resultados generales del negocio.

## Objetivo

Ofrecer un resumen general del negocio en el Dashboard, sin duplicar el detalle de Historial y reportes ni contar pedidos por separado.

## Alcance

- Incluye: selección de hoy o este mes, cantidad de ventas, ingresos totales en BOB y cantidad de ventas por método de pago, efectivo y QR.
- Incluye los criterios comunes del Dashboard: actualización en tiempo real entre sesiones, ausencia de ventas y contenido en una pantalla.
- Excluye: preparar, cobrar o registrar ventas, administrar el catálogo, contador de pedidos, jornadas operativas, otros períodos o filtros, detalle de ventas y métricas adicionales de reportes.
- La actualización SSE y lectura común se seleccionan en la [base técnica aprobada](../ai-context/architecture.md#7-base-técnica-mínima-aprobada); esta historia concreta latencia, dimensiones de comprobación y el [contrato de lectura y actualización](#contrato-de-lectura-y-actualización) común a US-003 a US-005, no una distribución visual.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Al abrir el Dashboard se selecciona hoy por defecto y se permite cambiar a este mes. La selección se aplica al resumen, los productos vendidos y el gráfico. |
| CA-02 | Hoy y este mes se determinan por las fechas en horario de Bolivia, sin jornadas operativas ni horas de corte propias del negocio. |
| CA-03 | Para un período con ventas, se muestra la cantidad de ventas registradas y la suma de sus totales, identificada en BOB. Los ingresos incluyen las ventas independientemente del método de pago. |
| CA-04 | Se muestra la cantidad de ventas del período registradas con efectivo y con QR. No se muestra un contador separado de pedidos. |
| CA-05 | Cuando el operador recibe el dinero y registra manualmente la venta en el módulo de ventas, el resumen, la lista de productos y el gráfico del período correspondiente se actualizan en tiempo real, sin recargar la página. Esto también se cumple si la venta se registra desde otra computadora o sesión. |
| CA-06 | Si no hay ventas en el período seleccionado, el contenido informativo se sustituye únicamente por «Aún no se realizaron ventas hoy» o «Aún no se realizaron ventas este mes», según corresponda. |
| CA-07 | En el uso principal desde computadora o laptop, el Dashboard se mantiene en una pantalla sin scroll general. Solo la lista de productos vendidos tiene scroll interno cuando su contenido supera el espacio disponible. Se verifica en ventanas de 1280 × 720 y 1366 × 768 píxeles CSS, no mediante la resolución física del monitor. |
| CA-08 | Con conexión activa y bajo condiciones de prueba acordadas, los tres bloques reflejan una venta registrada en hasta 2 segundos desde la confirmación del registro. Se releen resultados al reconectar y al cambiar el día o mes en Bolivia; los avisos perdidos se cubren mediante conciliación según el contrato técnico. |
| CA-09 | Carga, error y período sin ventas se distinguen. Una consulta fallida no se presenta como «sin ventas» ni se hace pasar información no confirmada por resultados vigentes. |

### Verificación prevista de los criterios

- CA-01 y CA-02: comprobar selección inicial, cambio de período y límites de día y mes en horario de Bolivia con fechas controladas, incluidas ventas fuera del período.
- CA-03 y CA-04: contrastar cantidades, sumas y desglose por método con ventas conocidas mediante pruebas de cálculos e integración de los datos del resumen.
- CA-05: integración del registro de ventas y actualización de los tres bloques; recorrido con dos sesiones autenticadas para observar cambios sin recarga, sin duplicar cantidades o importes.
- CA-06 y CA-07: revisión manual del período vacío y del Dashboard con suficientes productos para requerir scroll interno, en las dos dimensiones CSS acordadas y navegadores de US-001. La inspección visual es apropiada para comprobar mensajes y desplazamiento; registrar tamaño efectivo de la ventana y zoom.
- CA-08: recorrido con dos sesiones y medición entre confirmación del registro y presentación de los tres bloques, con reloj y datos controlados. Acordar entorno, red, volumen de datos y carga antes de ejecutarlo; sin esas condiciones no se acredita el objetivo. Incluir reconexión, aviso perdido y cambio de día/mes en Bolivia, coordinados con CA-02 y CA-05.
- CA-09: simular carga y error de lectura/actualización con período vacío y con ventas; comprobar que el fallo no activa el mensaje de ausencia de ventas ni una confirmación falsa de vigencia.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Las herramientas están elegidas en arquitectura, pero no instaladas ni configuradas; el mecanismo y umbral anteriores fueron aprobados, no verificados.

## Dependencias relevantes

- [Producto: Dashboard](../ai-context/product.md#32-dashboard).
- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso y sesiones simultáneas de la cuenta compartida.
- [US-004 — Consultar los productos vendidos](us-004-consultar-productos-vendidos.md) y [US-005 — Identificar las horas con más ventas](us-005-identificar-horas-mas-ventas.md): contenido restante del Dashboard.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): fecha/hora, total y método de las ventas registradas. Gestión de ventas ya tiene historias y tareas documentadas, no implementadas. El Dashboard consulta esos resultados; una venta en curso no se cuenta ni aporta ingresos y esta historia no implementa selección ni registro.
- Los contratos de datos, actualización y carga/error conforme a CA-08/CA-09 están en el [contrato de lectura y actualización](#contrato-de-lectura-y-actualización), sin incorporar funcionalidades nuevas ni suponer acceso sin conexión. Sus pendientes deben resolverse antes de la integración afectada.

## Aprobación

El responsable del proyecto respondió «si» a «¿Apruebas estas tres historias con este alcance?» en la conversación del 2026-10-18, después de confirmar la propuesta consolidada del Dashboard. Posteriormente respondió «autorizo» al cambio de US-001 para permitir varias sesiones simultáneas de la cuenta compartida, necesario para la actualización entre computadoras y sesiones.

La aprobación inicial corresponde a las historias y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

En la aprobación del menú del 2026-10-18, el responsable autorizó actualizar las referencias afectadas del Dashboard: se sustituye «módulo de pedidos» por «módulo de ventas» y se reconoce la venta en curso sin pedidos independientes. No cambian métricas, períodos ni actualización del Dashboard.

En la corrección posterior autorizada en esta conversación del 2026-10-18 se elimina la dependencia de la antigua historia de consulta y selección para vender y se explicita que solo Gestión de ventas prepara y registra ventas. Los criterios del Dashboard no cambian.

Posteriormente, el 2026-10-18, el responsable respondió «ok apruebo las tareas» tras revisar las ocho tareas propuestas con `requirements-analyst` y su formato oficial de numeración global. Se aprueban TASK-008 a TASK-015 para registro documental; esta historia define TASK-008 a TASK-011. Se conservan alcance, criterios y condiciones técnicas previas. La aprobación no autoriza iniciar implementación.

El 2026-10-18, al aprobar todas las recomendaciones de la base técnica mínima y su registro sin implementación, el responsable aprobó SSE, lectura común, objetivo de hasta 2 segundos con conexión activa y condiciones acordadas, las dos dimensiones CSS y la distinción carga/error/vacío. CA-07 se concreta y CA-08/CA-09 amplían la verificación dentro de las tareas existentes; no se crean tareas ni se certifica cumplimiento.

El 2026-10-19, tras revisar la propuesta redactada con `requirements-analyst`, el responsable respondió «Apruebo el contrato del Dashboard, las dos excepciones y tus recomendaciones de la tabla». Se aprueban el [contrato de lectura y actualización](#contrato-de-lectura-y-actualización) y sus decisiones: lectura única por período a cargo de TASK-008, aviso SSE sin período, `periodEndsAt`, conservación de datos previos marcados como no actualizados, desempate por `productId`, eje de 24 horas y exclusión de «ventas recientes». Se autoriza sustituir la frase que excluía DTO/rutas del alcance. No cambian criterios ni tareas.

## Contrato de lectura y actualización

Común a US-003, [US-004](us-004-consultar-productos-vendidos.md) y [US-005](us-005-identificar-horas-mas-ventas.md). Aplica la [base técnica aprobada](../ai-context/architecture.md#dashboard-y-actualización-compartida): una lectura común de los tres bloques y SSE solo como invalidación. Importes en enteros de décimas de BOB; períodos y horas en `America/La_Paz`, nunca según la zona del navegador.

### Lectura común

- `GET /api/dashboard-periods/{period}`, con `period` = `today` | `month`. Requiere la sesión protegida de US-001; su mecanismo concreto sigue pendiente.
- TASK-008 es responsable de la ruta, de la definición compartida de períodos, de `summary` y de agregar las secciones. TASK-012 aporta `products` y TASK-014 `hourlySales`; ambas dependen de TASK-008 para integrarse, no para construirse.

Respuesta 200:

```json
{
  "period": "today",
  "periodEndsAt": "2026-10-20T04:00:00.000Z",
  "summary": { "salesCount": 12, "revenueTenths": 4550, "cashSalesCount": 7, "qrSalesCount": 5 },
  "products": [{ "productId": "…", "currentName": "…", "unitsSold": 3, "revenueTenths": 450 }],
  "hourlySales": [{ "hour": 0, "salesCount": 0 }]
}
```

| Campo | Significado y origen |
| --- | --- |
| `period` | Eco de la selección, para descartar respuestas de un período ya no seleccionado. CA-01; US-004 CA-01. |
| `periodEndsAt` | Instante UTC en que termina el período en Bolivia; el cliente relee al alcanzarlo. CA-02 y CA-08. No se muestra. |
| `summary.salesCount`, `summary.revenueTenths` | Cantidad de ventas registradas y suma de sus totales. CA-03. «BOB» lo añade la presentación. |
| `summary.cashSalesCount`, `summary.qrSalesCount` | Ventas por método de pago, sin contador de pedidos. CA-04. |
| `products[]` | Un elemento por identidad estable, con nombre actual, unidades e ingresos de lo registrado al vender. US-004 CA-02 y CA-06. El orden del arreglo es contractual: venta más reciente primero y, a igual instante, `productId` ascendente; el cliente no reordena. Sin paginación ni límite (US-004 CA-03 y CA-04). |
| `hourlySales[]` | Exactamente 24 entradas, `hour` de 0 a 23, con `salesCount` entero ≥ 0. En `month` cada hora suma esa franja de todos los días, sin promedios. US-005 CA-01 a CA-04. |

No se incluyen moneda, ventas recientes, ingresos por hora ni otros períodos o filtros.

**Vacío, carga y error (CA-06 y CA-09).** Vacío es una respuesta 200 con `summary.salesCount` igual a 0, `products` vacío y las 24 horas en 0; solo este caso muestra el mensaje de CA-06. Cualquier respuesta no 2xx o fallo de red es error y nunca se presenta como vacío. La carga es un estado del cliente. Si falla la carga inicial se muestra el error; si falla una relectura con datos previos, se conservan marcados como no actualizados, con aviso, sin presentarlos como vigentes.

Errores:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

| Estado | `code` | Caso |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `period` distinto de `today` o `month`. |
| 401 | `UNAUTHORIZED` | Sesión inválida, expirada o revocada. |
| 500 | `INTERNAL_ERROR` | Fallo del servidor, incluida la base de datos no disponible. |

Conflicto y resultado incierto no aplican a una lectura. El envoltorio se alineará con el formato de error común de la API cuando se defina.

### Aviso de actualización

- `GET /api/dashboard-events`, `text/event-stream`. Emite `event: sales-changed` con `data: {}` solo después de confirmar la persistencia de una venta registrada (US-013 CA-06; TASK-010). No indica período: toda venta registrada afecta a la vez a hoy y al mes vigentes.
- El cliente relee el período seleccionado. Un aviso repetido solo provoca otra relectura y no puede duplicar ventas ni ingresos (CA-05). El orden se resuelve descartando respuestas de solicitudes anteriores o de otro período.
- Se relee al abrir, al reconectar, al alcanzar `periodEndsAt` y en cada conciliación periódica (CA-08). No se usa `Last-Event-ID`.
- El rechazo de apertura o reconexión responde 401 `UNAUTHORIZED` con el envoltorio de error. El servidor cierra el stream al revocar o expirar la sesión. Un fallo de relectura usa los errores de la lectura (CA-09; TASK-010).

### Pendientes del contrato

1. Autorización del stream sin credenciales en URL (`EventSource` no admite cabeceras: cookie de sesión o stream sobre `fetch`) y cómo distingue el cliente un cierre por autorización de un corte de red. Depende del acceso e identidad de pestaña de US-001.
2. Frecuencia de la conciliación periódica y, si se usan, latidos del stream.
3. Condiciones de medición de CA-08: entorno, red, volumen de datos sin paginación, carga y reloj.
4. Agrupación de relecturas ante ráfagas de avisos sin comprometer los 2 segundos.
5. Envoltorio de error común a toda la API.

Construir contra este contrato con datos simulados no acredita integración, CA-05 entre sesiones, el cierre definitivo de CA-07 ni CA-08.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-008 y TASK-010 se amplían con la conexión de la página y de la actualización; TASK-009 y TASK-011 se retiran. El orden de interfaz aprobado antes (TASK-009 → TASK-013 y TASK-015 → TASK-011) se conserva como trabajo de interfaz del Dashboard sin tareas. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-008 y TASK-010 sustituyeron las etiquetas locales RES-BE y ACT-BE; las de RES-FE y ACT-FE se retiraron el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación.

### Condiciones previas compartidas

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Fuente de datos: [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md) y sus tareas están aprobadas documentalmente, no implementadas. Se necesitan fecha/hora, total, método y snapshots de productos. Para US-004, identidad estable y nombre actual con cantidades/importes históricos intactos; el Dashboard no implementa registro ni modifica catálogo.
- El [contrato de lectura y actualización](#contrato-de-lectura-y-actualización) concreta DTO, rutas, errores y aviso SSE de los tres bloques. Siguen pendientes la autorización del stream, la frecuencia de conciliación y las condiciones de medición enumeradas allí, no una nueva elección de transporte o umbral.
- Disponer de las estructuras de backend/frontend y del acceso protegido de US-001 para la integración correspondiente. Esta aprobación no autoriza tareas fundacionales ni implementación de otros módulos.
- Usar las dimensiones de CA-07 al cerrar la comprobación visual de una pantalla sin scroll general.
- Las verificaciones de cada tarea reutilizan la sección de verificación prevista de esta historia. El principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing). No hay pruebas del POS configuradas ni resultados ejecutados.
- Frontend construye la página sin tareas y sigue el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices sobre la página completa, sin repetir revisiones por bloque ni sustituir las verificaciones funcionales.
- Las dependencias siguientes distinguen construcción de cada parte y comprobación conjunta: esta última requiere los tres bloques y el registro de ventas integrados, pero no crea prerrequisitos circulares para construirlos. Las tareas están aprobadas para registro; la autorización de implementación sigue siendo necesaria.
- CA-08 corresponde a TASK-010 (aviso tras persistencia, autorización, relectura, recuperación y medición conjunta). CA-09 corresponde a TASK-008 en lectura y a TASK-010 en actualizaciones. US-003 CA-07 definitivo se acredita en TASK-012 con los tres bloques integrados. Las tareas de US-004/US-005 reutilizan esos estados y verificaciones, sin duplicarlas.

### TASK-008 — Obtener e integrar el resumen del período

- Historia relacionada: [US-003](us-003-consultar-resumen-ventas.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener cantidades e ingresos fiables de las ventas registradas para hoy y este mes mediante `GET /api/dashboard-periods/{period}` del contrato aprobado, y conectarlos en `frontend/src/dashboard/api/`.
- Alcance y exclusiones: delimitar ambos períodos en horario de Bolivia; contar ventas, sumar sus totales y contar las realizadas con efectivo y QR. Excluir ventas en curso, pedidos independientes, métricas adicionales y escritura de ventas. Compartir la definición de períodos con los demás bloques, sin imponer una estructura técnica. Agrega las secciones de TASK-012 y TASK-014, responde los errores 400, 401 y 500 y verifica en la página integrada el selector, el estado vacío y la carga/error. Excluye el aviso (TASK-010) y el cierre definitivo de CA-07 (TASK-012).
- Resultado esperado: hoy por defecto y cambio a este mes; cifras iguales a ventas conocidas; mensaje exacto de período vacío solo con un 200 vacío y error distinguible.
- Criterios aplicables: CA-01 (P), CA-02, CA-03 (BOB, P), CA-04, CA-06 (P) y CA-09 en lectura (P).
- Verificación prevista: contrastar cálculos e integración con ventas conocidas, límites de día/mes, métodos distintos, períodos vacíos y ventas ajenas al período.
- Dependencias: contratos y datos de las condiciones compartidas; protección de operaciones y sesiones de [US-001](us-001-iniciar-sesion.md). No depende de TASK-012 ni TASK-014. Ventas aisladas o TASK-030 y registro de entrega de interfaz del Dashboard.

### TASK-010 — Habilitar e integrar la actualización compartida tras registrar ventas

- Historia relacionada: [US-003](us-003-consultar-resumen-ventas.md); reutilizada por US-004 y US-005.
- Responsabilidad: backend.
- Descripción y objetivo: emitir `sales-changed` tras la persistencia de una venta registrada y sustituir el emisor simulado de `frontend/src/dashboard/api/` por la suscripción real con relectura, para que los tres bloques se actualicen sin recargar, también desde otras sesiones.
- Alcance y exclusiones: stream autorizado sin credenciales en URL que se cierra al revocar la sesión; en la capa de acceso, relectura al abrir, al reconectar, al alcanzar `periodEndsAt` y en la conciliación periódica, descarte de respuestas obsoletas y agrupación de ráfagas; resolver con aprobación los pendientes 1 a 4 del contrato; medición de CA-08 y recorrido con dos sesiones. Excluye registro de ventas, procesamiento de pagos, cálculos por bloque y mecanismos independientes para cada bloque.
- Resultado esperado: actualización en hasta 2 segundos en las condiciones acordadas, sin contar ventas en curso ni duplicar resultados ante avisos repetidos; si falla una relectura, los datos previos se marcan como no actualizados.
- Criterios aplicables: CA-05, CA-08 y CA-09 en actualización (P). Evidencia reutilizable por US-004 CA-05, US-005 CA-05 y US-013 CA-06.
- Verificación prevista: integrar con ventas registradas y sesiones autorizadas; comprobar que selección, fallos y repetición de una misma operación o actualización no agregan ventas ni ingresos adicionales, en coordinación con US-013 CA-06.
- Dependencias: TASK-008, TASK-030 y TASK-005 de US-001; TASK-012 y TASK-014 integradas para la prueba conjunta, no para construir.

### Tareas retiradas

- TASK-009 — Presentar el resumen y el marco común del Dashboard — Retirada el 2026-10-19; cobertura en TASK-008 y, para CA-07 definitivo, TASK-012.
- TASK-011 — Consumir una actualización común sin recargar — Retirada el 2026-10-19; cobertura en TASK-010. Frontend construye la página y sus estados sin tareas.
