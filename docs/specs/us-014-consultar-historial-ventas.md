# US-014 — Consultar el historial de ventas por fecha

## Descripción

Como operador, quiero consultar las ventas registradas dentro de un rango de fechas, para revisar la actividad del negocio en el período que me interesa.

## Objetivo

Ofrecer en Historial y reportes una lista fiable de las ventas registradas, filtrada por fechas en horario de Bolivia, y fijar el filtro común que también aplican el resumen del período y los productos más vendidos.

## Alcance

- Módulo: Historial y reportes. Solo consulta ventas registradas; no prepara, cobra, registra ni modifica ventas ni administra el catálogo.
- Incluye: filtro por rango de fechas con atajos, lista paginada de ventas registradas del rango, actualización al consultar o refrescar y estados de carga, error y vacío.
- El filtro definido aquí es el mismo para la lista, el resumen de [US-016](us-016-consultar-resumen-periodo.md) y el ranking de [US-017](us-017-identificar-productos-mas-vendidos.md).
- Excluye: ventas en curso, revisiones o envíos fallidos; detalle de cada venta (pertenece a [US-015](us-015-consultar-detalle-venta.md)); anulaciones, devoluciones y correcciones; exportación e impresión; filtros por método, producto o importe; búsqueda; comparación entre períodos; actualización en tiempo real; número visible de venta.
- No fija disposición visual: se define en el diseño de la página. El scroll está permitido.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | La lista incluye únicamente ventas registradas. Una venta en curso, una revisión, un envío fallido o un resultado aún incierto no aparecen. Un reintento o doble envío de la misma operación aparece como una sola venta. |
| CA-02 | El filtro define un rango con fecha de inicio y fecha de fin, ambas inclusivas y entendidas como días completos en `America/La_Paz`, nunca según la zona del navegador. Una venta pertenece al rango por la fecha de su registro en ese horario. |
| CA-03 | Al abrir Historial el rango seleccionado es «Hoy». Se ofrecen los atajos «Hoy», «Últimos 7 días» (hoy y los seis días anteriores), «Este mes» (del día 1 del mes actual hasta hoy) y «Mes anterior», además de elegir inicio y fin; todos en `America/La_Paz`. |
| CA-04 | No se pueden seleccionar fechas posteriores al día actual en Bolivia. Un rango con inicio posterior al fin no se consulta. Un rango de más de 366 días, contando inicio y fin, no se consulta. En estos casos se indica el motivo y no se muestran resultados como si correspondieran a ese rango. El backend rechaza también estas entradas. |
| CA-05 | Cada fila muestra fecha y hora del registro en `America/La_Paz`, unidades de la venta (suma de sus cantidades), método de pago (efectivo o QR) y total con el [formato de importes de US-003](us-003-consultar-resumen-ventas.md#decisiones-de-presentación-y-medición): `BOB`, un decimal con punto y sin separador de miles. No se muestra un número de venta. |
| CA-06 | Las ventas se ordenan de la más reciente a la más antigua. La lista se pagina en el servidor con 50 ventas por página y permite pasar a la página siguiente y volver a la anterior, sin saltar a una página numerada, sin omitir ni repetir ventas del rango consultado. Cambiar el rango o refrescar vuelve a la primera página. |
| CA-07 | La lista no se actualiza en tiempo real: refleja el rango al consultarlo o al usar una acción de refrescar, que vuelve a leer el rango aplicado. El resumen y el ranking del mismo rango se leen con la misma consulta o refresco. |
| CA-08 | Carga, error y rango sin ventas se distinguen, como en [US-003 CA-09](us-003-consultar-resumen-ventas.md#criterios-de-aceptación). Un rango sin ventas muestra «No se registraron ventas en este rango». Una consulta fallida nunca se presenta como ausencia de ventas; si falla un refresco con datos previos, se conservan marcados como no actualizados, sin presentarlos como vigentes. |

### Verificación prevista de los criterios

- CA-01: integración con ventas registradas junto a ventas en curso, revisiones, envíos fallidos y reintentos de la misma operación de [US-013](us-013-registrar-venta-pagada.md); comprobar que solo aparecen las registradas y sin duplicados.
- CA-02 y CA-03: pruebas de cálculo de límites e integración con reloj controlado. **Riesgo prioritario:** ventas cerca de medianoche en Bolivia (por ejemplo 23:59 y 00:00 hora de La Paz, que en UTC caen en días distintos), primer y último día de mes, «Mes anterior» en enero y meses de 28, 29, 30 y 31 días; comprobar que el resultado no cambia con la zona del navegador.
- CA-04: validación en interfaz y en backend con fecha futura, inicio posterior al fin, rangos de 366 días (aceptado) y de 367 días (rechazado), contando inicio y fin; atajos en límites de mes y de año.
- CA-05 y CA-06: integración con más de 50 ventas conocidas en el rango, con vuelta a la primera página al refrescar o cambiar el rango, incluidas ventas con el mismo instante de registro y una venta confirmada durante el recorrido con fecha y hora anterior al corte; contrastar orden, contenido de filas, páginas completas y última página sin omisiones ni repeticiones. Revisión manual de filas y formato en BOB.
- CA-07: registrar una venta después de consultar y comprobar que no aparece hasta refrescar o volver a consultar; comprobar que resumen y ranking cambian con el mismo refresco.
- CA-08: simular carga, error de lectura y rango vacío, con y sin datos previos; comprobar que el error no activa el estado vacío.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing). Hoy no hay aplicación ni pruebas del POS configuradas.

## Preguntas abiertas

Resueltas el 2026-10-19 (ver Aprobación):

1. «Últimos 7 días»: hoy y los seis días anteriores en Bolivia (CA-03).
2. «Este mes»: del día 1 del mes actual hasta hoy, sin días futuros (CA-03).
3. Rango máximo: 366 días contando inicio y fin (CA-04).
4. Estado vacío: «No se registraron ventas en este rango» (CA-08).
5. Refrescar o cambiar el rango vuelve a la primera página (CA-06).

## Dependencias relevantes

- [Producto: Historial y reportes](../ai-context/product.md#35-historial-y-reportes) y [arquitectura: API, dinero y tiempo](../ai-context/architecture.md#api-dinero-y-tiempo): registro en UTC, límites en `America/La_Paz`, importes en décimas de BOB.
- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso protegido.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): ventas registradas con fecha/hora del servidor, método, total y cantidades.
- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md): referencia de estados de carga, error y vacío. El Dashboard no se modifica.
- [US-015](us-015-consultar-detalle-venta.md), [US-016](us-016-consultar-resumen-periodo.md) y [US-017](us-017-identificar-productos-mas-vendidos.md): consumen el filtro y la página de Historial.

## Aprobación

El 2026-10-19 el responsable del proyecto aprobó la atomización de Historial y reportes en cuatro historias (lista y filtro fusionados; ingresos y estadísticas básicas fusionados) y las decisiones de esta historia: solo ventas registradas, rango inclusivo en `America/La_Paz`, «Hoy» por defecto, los cuatro atajos, máximo un año, sin fechas futuras ni inicio posterior al fin, filtro común a lista, resumen y ranking, contenido y orden de filas sin número visible, paginación en servidor de 50, sin tiempo real con refresco manual, estados como US-003, scroll permitido y disposición a definir en el diseño. También aprobó las exclusiones del módulo y autorizó redactar esta especificación con «apruebo».

El 2026-10-19 el responsable respondió «sigue tus sugerencias» a las mejoras de `requirements-analyst`. CA-05 remite al formato de importes de US-003 en lugar de repetir «BOB con un decimal», y la fecha y hora del registro queda definida en US-013 CA-02 como el instante del guardado confirmado en el servidor. Las preguntas abiertas 1 a 5 y la autorización de la interfaz siguen pendientes.

El 2026-10-19 el responsable respondió «para todo esto usa tus sugerencias» a las preguntas pendientes de Gestión de ventas e Historial, y se adoptaron las sugerencias del principal. Se resuelven las preguntas abiertas 1 a 5 (CA-03, CA-04, CA-06 y CA-08) y los pendientes del contrato de TASK-033. La autorización de la interfaz de Historial sigue pendiente, porque requiere modificar la constitución. No autoriza implementación ni cambios en el tracker.

La aprobación corresponde a la historia y sus criterios; su tarea técnica se aprobó por separado el 2026-10-19. Ninguna de las dos autoriza implementación. **La interfaz de Historial no está autorizada:** la [constitución](../ai-context/constitution.md#11-etapa-actual) solo autoriza a Frontend los módulos `auth`, `dashboard`, `menu` y `sales`. La entrega de interfaz de esta página requiere una autorización explícita del responsable, todavía pendiente.

## Tareas técnicas asociadas

Tarea de `requirements-analyst` aprobada por el responsable el 2026-10-19 («Apruebo las tareas TASK-033 a TASK-036») para registro documental. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación.

### Condiciones previas compartidas

Comunes a TASK-033 a TASK-036 de US-014 a US-017:

- **Integración común.** Cada tarea define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación, implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de Historial, que a su vez requiere la autorización pendiente de su interfaz; sin ella la tarea queda `Bloqueado: falta la entrega de interfaz de Historial`. Los ajustes de interfaz que exija el contrato vuelven a Frontend.
- Backend autoritativo: límites del rango, validación, paginación, agregaciones y ordenaciones se calculan en el servidor; el cliente no recalcula ni reordena.
- Fuente de datos: ventas registradas de US-013 (TASK-030), aprobadas documentalmente, no implementadas. Historial no escribe ventas ni catálogo.
- Acceso protegido de US-001 (TASK-003 y TASK-005).
- Las verificaciones son futuras, no ejecutadas; el principal concretará casos y comandos. No hay pruebas del POS configuradas.

Pendientes del contrato que debe resolver TASK-033 con aprobación: representación del rango en la petición, cómo obtiene el cliente el día actual en Bolivia para impedir fechas futuras, orden estable ante ventas con el mismo instante y paginación coherente si se registran ventas mientras se recorren páginas (sin introducir tiempo real).

Criterios aprobados el 2026-10-19 para ese contrato: el rango viaja como fechas `AAAA-MM-DD` de inicio y fin en `America/La_Paz`; cada respuesta incluye la fecha actual en Bolivia según el servidor, que la interfaz usa para limitar el selector; el orden es fecha y hora de registro descendente con la identidad de la venta como desempate; la primera consulta fija un instante de corte que acompaña a las páginas siguientes, de modo que una venta registrada después no desplaza páginas hasta refrescar.

Corrección aprobada el 2026-10-19 («Apruebo las 9 recomendaciones de architect»): la paginación usa un cursor por clave, no un desplazamiento. `architect` detectó que, con desplazamiento y corte, una venta cuya fecha y hora se asigna antes del corte pero se confirma después puede insertarse en una página ya recorrida y repetir otra venta en las siguientes. El cursor es opaco, incluye el corte y la última clave (fecha y hora, identidad) y la respuesta sigue las [convenciones comunes](../ai-context/architecture.md#convenciones-comunes-del-contrato-http): `{ items, pageSize, cutoffAt, nextCursor, currentDate }`. Volver a la página anterior usa los cursores ya recorridos, guardados por la capa `api/`. Lista, resumen (US-016) y ranking (US-017) del mismo refresco comparten el corte, preferentemente con una lectura conjunta que concretan TASK-033, TASK-035 y TASK-036.

### TASK-033 — Filtrar y paginar el historial de ventas registradas e integrar la lista

- Historia relacionada: [US-014](us-014-consultar-historial-ventas.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener las ventas registradas de un rango de fechas en Bolivia, ordenadas y paginadas en servidor, y conectarlas en la capa de acceso de Historial.
- Alcance y exclusiones: definición compartida del rango (inicio y fin inclusivos en `America/La_Paz`, atajos, máximo un año, sin futuro, inicio no posterior al fin) reutilizada por TASK-035 y TASK-036; validación en backend con error distinguible; filas con fecha y hora, unidades, método y total en décimas de BOB; orden más reciente primero; 50 por página; lectura bajo demanda y refresco. Verifica en la página integrada el filtro, los atajos, la paginación, el refresco y los estados. Excluye detalle de venta (TASK-034), resumen (TASK-035), ranking (TASK-036), tiempo real, exportación, otros filtros y cualquier escritura.
- Resultado esperado: lista igual a las ventas registradas conocidas del rango, sin duplicados ni ventas no registradas, con límites de día y mes correctos en Bolivia y error distinguible de vacío.
- Criterios aplicables: CA-01, CA-02, CA-03 (P), CA-04 (C en interfaz y validación en backend), CA-05 (P), CA-06, CA-07 (C) y CA-08 (P).
- Verificación prevista: la de esta historia, con prioridad en los límites UTC/`America/La_Paz` cerca de medianoche y fin de mes.
- Dependencias: TASK-030 de US-013; TASK-003 y TASK-005 de US-001; autorización de la interfaz de Historial y su registro de entrega; las preguntas abiertas 1 a 5 quedaron resueltas el 2026-10-19.
