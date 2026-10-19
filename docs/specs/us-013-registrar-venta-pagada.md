# US-013 — Registrar la venta después del pago

## Descripción

Como operador, quiero registrar la venta y el método utilizado después de recibir el dinero, para conservar la operación y reflejar sus resultados.

## Objetivo

Registrar una venta pagada completa y sin duplicados, conservando sus datos y comunicando un resultado fiable al operador.

## Alcance

- Módulo: Gestión de ventas.
- Incluye: registro manual posterior al pago, un único método por venta, conservación de datos, confirmación y tratamiento de fallos o resultados inciertos.
- Recorrido aprobado: preparar selección, revisar total, recibir dinero, elegir efectivo o QR y registrar.
- Excluye: procesar pagos, verificar automáticamente QR, pagos mixtos, comprobantes, anulaciones, devoluciones, inventario, facturación fiscal y detalle de ventas anteriores. No se añaden por ser habituales en otros POS.
- No introduce pedidos independientes, cola de cocina ni estados operativos de restaurante.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Tras revisar el total y recibir el dinero, el operador puede elegir exactamente un método, efectivo o QR, y registrar manualmente la venta. La acción final comunica que registra una venta ya pagada; Kofi no procesa ni verifica el pago. |
| CA-02 | La venta conserva identidad estable del producto, nombre, precio unitario, cantidades e importes de la operación. Editar o desactivar productos posteriormente no altera esos datos ni sus ingresos históricos. Si el catálogo cambia después del cobro, se conservan precio y productos de la revisión confirmada según US-012. |
| CA-03 | La operación guarda la venta completa o no la guarda. Un doble clic o reintento de la misma operación no crea ventas duplicadas ni ingresos adicionales. |
| CA-04 | La selección no se borra hasta confirmar el registro exitoso. Tras el éxito se muestra confirmación y queda una selección vacía para la siguiente venta. |
| CA-05 | Si se pierde la respuesta y no se conoce el resultado, se comunica que se está comprobando si la venta se registró, sin anunciar éxito o fracaso prematuros. Se puede comprobar o reintentar la misma operación sin crear otra venta. |
| CA-06 | Solo una venta registrada alimenta la actualización en tiempo real del Dashboard, también entre computadoras y sesiones sin recargar, conforme a US-003 a US-005. Seleccionar, revisar, fallar o repetir una operación ya registrada no agrega ventas o ingresos adicionales. |
| CA-07 | Antes del primer envío final se conserva en el navegador solo una referencia opaca de la operación enviada. Tras recargar, cerrar la pestaña o terminar sesión, se puede comprobar su resultado con autorización válida de la pestaña; si la sesión terminó, exige autenticarse nuevamente. Recargar conserva la sesión según US-001, pero no recupera selección, revisión ni credenciales desde la referencia. Una venta existente se informa sin registrarla otra vez. |
| CA-08 | Una respuesta «no existe» no se presenta como fracaso definitivo mientras un envío retrasado pueda registrarla. La conciliación resuelve esa identidad sin que una solicitud tardía contradiga el resultado definitivo comunicado. Mientras sea incierto, no se inicia otra operación para sustituirla. |

### Condiciones previas a implementar

- Concretar contratos de registro, validación, identidad de operación, integridad, consulta/reintento y actualización del Dashboard sobre la [base técnica aprobada](../ai-context/architecture.md#7-base-técnica-mínima-aprobada): venta completa en un documento, identidad única, snapshots, validación backend y escritura duradera.
- CA-07/CA-08 fijan la continuidad tras salida, no un mecanismo terminal completo. Concretar almacenamiento de la referencia, conservación, limpieza, consulta autenticada y conciliación frente a envíos tardíos. No se aprueba guardar el comando completo ni recuperar borradores; la referencia de operación no recupera una sesión. Definir cómo evitar repeticiones después de cualquier limpieza sin debilitar la unicidad aprobada.
- Concretar protección y carreras de confirmación del contrato de US-012; sus reglas de fijación y ajustes ya están aprobadas. Sin verificación automática del dinero recibido.

### Verificación prevista de los criterios

- CA-01: recorrido completo para cada método, incluyendo ausencia de método y rechazo de uno no admitido; comprobar que no se exige integración de pagos.
- CA-02: integración de registro con datos conocidos y cambios posteriores de nombre, precio y activación; contrastar datos conservados y agregación por identidad con nombre actual en Dashboard. Incluir el caso de cambio posterior al cobro definido en US-012.
- CA-03 y CA-05: integración en entorno aislado con fallos durante el guardado, doble envío simultáneo, reintento y respuesta perdida tanto si hubo guardado como si no; comprobar una sola venta completa o ninguna y el resultado comunicado. No se opera sobre datos reales.
- CA-04: recorrido de éxito, fallo confirmado y resultado incierto, verificando que la selección solo se limpia tras éxito confirmado, sin perjuicio de su descarte por salida conforme a US-010.
- CA-06: recorrido E2E de registro desde una sesión con Dashboard abierto en otra, comprobando métricas sin recarga y ausencia de duplicación por reintentos.
- CA-07: navegador real con referencia guardada antes del envío y respuesta perdida; recargar conservando autorización válida o cerrar/cerrar sesión y autenticarse de nuevo para comprobar éxito o incertidumbre de la misma operación. Verificar descarte de selección/revisión, ausencia de credenciales/comando completo en esa referencia y que no concede acceso por sí sola.
- CA-08: integración aislada con consulta adelantada al envío, solicitud retrasada, reintentos concurrentes, timeout de escritura y conciliación terminal según el contrato pendiente. Comprobar que «no existe» no anuncia un fracaso prematuro y que no se ofrece otra operación sustitutiva mientras siga incierto.
- Para CA-03/CA-05, incluir misma identidad con contenido idéntico y distinto, y repetición tras reinicio de backend; el resultado no depende solo de memoria del proceso. Aplicar también los límites técnicos de US-011 y validar la evidencia de revisión de US-012.

Estas verificaciones están previstas, no ejecutadas. Hoy no hay aplicación ni comandos de pruebas del POS; antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing).

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): autorización y sesiones simultáneas.
- [US-010 — Consultar y seleccionar productos para vender](us-010-consultar-seleccionar-productos-venta.md), [US-011 — Ajustar y revisar la venta en curso](us-011-ajustar-revisar-venta-en-curso.md) y [US-012 — Revisar cambios del catálogo antes de cobrar](us-012-revisar-cambios-catalogo-antes-cobro.md): selección, cálculos y revisión previa.
- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md), [US-004 — Consultar los productos vendidos](us-004-consultar-productos-vendidos.md) y [US-005 — Identificar las horas con más ventas](us-005-identificar-horas-mas-ventas.md): consumo de ventas registradas; fechas y agrupaciones según sus contratos.
- Historial y reportes consultará las ventas registradas; sus historias siguen por definir. Su detalle no se incorpora a Gestión de ventas.

## Aprobación

El responsable respondió «si apruebo todo» en la conversación del 2026-10-18 a las cuatro historias propuestas con `requirements-analyst` y las siete recomendaciones del principal. Esta historia formaliza el recorrido posterior al pago, método único, integridad, protección contra duplicados, selección conservada hasta confirmar éxito y comprobación o reintento de resultados inciertos. La aprobación autoriza el registro documental, no implementar código ni aprobar tareas técnicas todavía no presentadas.

Posteriormente, el 2026-10-18, el responsable respondió «si» a «¿Apruebas estas nueve tareas para asignarles IDs y registrarlas como pendientes, sin iniciar implementación?». Queda aprobado su registro documental como TASK-024 a TASK-032 en US-010 a US-013. La aprobación no resuelve las decisiones pendientes de revisión/cobro, ajustes posteriores o comprobación de registros inciertos tras salida ni autoriza implementar.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y su registro sin implementar ni instalar: identidad idempotente y venta documental íntegra, referencia opaca para comprobación tras salida/autenticación y resolución frente a envíos tardíos sin sustituir una operación incierta. Se añaden CA-07/CA-08 a las tareas existentes. Se mantiene pendiente concretar y aprobar conservación/limpieza y protocolo terminal; no se presume recuperación de borradores ni se crean estados operativos de pedidos.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-030 y TASK-031 se amplían con la conexión del registro manual y de la comunicación de incertidumbre en `frontend/src/sales/api/`; TASK-032 se retira y se reparte entre ambas. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-030 y TASK-031 sustituyeron las etiquetas locales P13-A y P13-B; TASK-032 (P13-C) se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas compartidas

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Concretar DTO/rutas, validación autoritativa y persistencia sobre identidad única y venta completa elegidas en arquitectura. Misma identidad y contenido devuelve el mismo resultado; contenido distinto se rechaza como conflicto. No volver a elegir stack o transportar importes sin validación backend.
- Resolver los detalles técnicos de las condiciones previas de esta historia y de US-012, incluidos almacenamiento/conservación/limpieza de referencia y conciliación terminal. Las reglas de continuidad y descarte de CA-07/CA-08 ya están aprobadas.
- La actualización común del Dashboard ya corresponde a TASK-010 de [US-003](us-003-consultar-resumen-ventas.md#tareas-técnicas-asociadas). Estas tareas solo proveen la confirmación del registro y se integran con ese contrato; no recrean el mecanismo ni sus consumidores. Las dependencias de integración conjunta no son ciclos de construcción.
- Aplican las condiciones de cierre visual de [US-010](us-010-consultar-seleccionar-productos-venta.md#condiciones-previas-compartidas). Las verificaciones siguientes son futuras, no ejecutadas; el principal concretará casos y comandos, reutilizando evidencia de integración con Dashboard sin repetir pruebas equivalentes. No hay pruebas del POS configuradas.

### TASK-030 — Registrar íntegramente la operación sin duplicados e integrar el registro manual

- Historia relacionada: [US-013](us-013-registrar-venta-pagada.md).
- Responsabilidad: backend.
- Descripción y objetivo: guardar una venta pagada completa, validada y vinculada a una única operación.
- Alcance y exclusiones: método único admitido, identidad estable del producto y datos históricos, validación de cantidades/importes, respeto de la revisión confirmada, integridad y protección frente a dobles envíos/reintentos. Proporcionar la confirmación al contrato común de actualización; sin implementar Dashboard, procesar pagos, anular ni devolver ventas. Conecta el registro manual de Frontend en `frontend/src/sales/api/`: elección de efectivo o QR, acción inequívoca de registrar una venta ya pagada, selección conservada hasta confirmar el éxito y limpieza tras él.
- Resultado esperado: una venta completa o ninguna; repetir la misma operación no genera otra venta ni ingresos adicionales.
- Criterios aplicables: CA-01 (texto de la acción y método, P), CA-02, CA-03, CA-04 (C) y CA-06 (con TASK-010); contribución atómica e idempotente a CA-08 en coordinación con TASK-031.
- Verificación prevista: integración aislada con datos conocidos, métodos inválidos, cantidades/importes inválidos según los contratos aprobados, fallos durante el guardado, doble envío simultáneo y reintentos. Contrastar datos conservados tras editar/desactivar productos y cambios posteriores al cobro. Para CA-06, recorrido conjunto con TASK-010 y el Dashboard integrado, sin duplicar su implementación.
- Dependencias: protección de US-001 (TASK-003 y TASK-005), TASK-027 de US-011, contrato de revisión de TASK-028 y contratos/límites aprobados; registro de entrega del registro manual. La construcción no exige Dashboard terminado; la comprobación de CA-06 requiere TASK-010 y las tareas de US-003 a US-005 integradas.

### TASK-031 — Resolver resultados inciertos de la misma operación e integrar su comunicación

- Historia relacionada: [US-013](us-013-registrar-venta-pagada.md).
- Responsabilidad: backend.
- Descripción y objetivo: permitir comprobar o reintentar un registro cuya respuesta se perdió sin crear otra operación.
- Alcance y exclusiones: comunicar el resultado comprobado y reutilizar con seguridad la identidad de operación. Sin recuperar selecciones descartadas ni construir consultas de Historial. La protección de guardado y duplicados se implementa una sola vez en TASK-030 y se reutiliza aquí. Guarda y consulta la referencia opaca en el navegador (`frontend/src/sales/api/`) y conecta la comprobación y el reintento con la comunicación de Frontend, sin éxito ni fracaso prematuros.
- Resultado esperado: el frontend puede resolver la incertidumbre sin deducir fracaso de una respuesta perdida ni provocar duplicados.
- Criterios aplicables: CA-03 (reintentos), CA-05 (P), CA-07 en conservación y consulta autenticada de la referencia y CA-08 (P) en resolución terminal y comunicación sin sustitución prematura.
- Verificación prevista: pérdida de respuesta con guardado realizado y sin guardado, comprobaciones y reintentos repetidos o concurrentes; incluir recarga, cierre y fin de sesión según la decisión aprobada, sin duplicados ni recuperación de borradores.
- Dependencias: TASK-030, TASK-005 de US-001, TASK-006 de US-002 y concreción del contrato de comprobación/reintento, conciliación y conservación de referencias sobre la continuidad aprobada tras salida. No depende de implementar Historial.

### Tareas retiradas

- TASK-032 — Completar el registro manual y comunicar su resultado — Retirada el 2026-10-19; cobertura de CA-01 y CA-04 en TASK-030 y de CA-05, CA-07 y CA-08 en TASK-031. La interfaz la implementa Frontend sin tareas.
