# US-005 — Identificar las horas con más ventas

## Descripción

Como operador, quiero visualizar la cantidad de ventas por hora, para identificar las horas de mayor actividad.

## Objetivo

Mostrar cómo se distribuye la cantidad de ventas entre las horas del día, tanto para hoy como para el conjunto del mes actual.

## Alcance

- Incluye: gráfico de líneas de cantidad de ventas agrupadas por hora para hoy o este mes.
- Excluye: gráfico de ingresos, unidades de productos, evolución por días del mes, comparativas y métricas adicionales de reportes.
- No selecciona biblioteca de gráficos. Consume la actualización común SSE y lectura del Dashboard elegidas en la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), sin un mecanismo propio.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El Dashboard presenta un gráfico de líneas con las horas del día en el eje horizontal y la cantidad de ventas en el eje vertical. |
| CA-02 | Para hoy, cada punto horario representa la cantidad de ventas registradas en esa hora del día, según el horario de Bolivia y el período definido en US-003. |
| CA-03 | Para este mes, cada punto horario suma las ventas de esa franja horaria de todos los días del mes. Por ejemplo, las 10:00 reúne las ventas entre las 10:00 y las 10:59 de sus días; no representa una serie por días ni un promedio. |
| CA-04 | Cada venta cuenta como una venta en su franja horaria, independientemente del método de pago o de las unidades de productos que contenga. |
| CA-05 | El gráfico cumple los criterios comunes de US-003 CA-05 a CA-07: actualización en tiempo real, también entre sesiones; mensaje del período sin ventas; y Dashboard sin scroll general. |

### Verificación prevista de los criterios

- CA-01: revisión manual de representación en líneas y ejes; es apropiada para comprobar la presentación visual.
- CA-02 a CA-04: contrastar la agrupación con ventas de horas y fechas controladas, incluyendo cambios de hora, día y mes en horario de Bolivia, varios días con ventas en la misma franja y ventas con varias unidades y métodos distintos. Usar pruebas de cálculos e integración de datos.
- CA-05: comprobar con el recorrido común de actualización y ausencia de datos previsto en [US-003](us-003-consultar-resumen-ventas.md#verificación-prevista-de-los-criterios), sin duplicar pruebas equivalentes.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no hay aplicación ni herramientas de pruebas del POS configuradas.

## Dependencias relevantes

- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md): períodos y criterios comunes del Dashboard. El gráfico consume la sección `hourlySales`, de 24 horas, del [contrato de lectura y actualización](us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización).
- [US-013](us-013-registrar-venta-pagada.md): fecha/hora de registro del servidor y venta íntegra. Aplican latencia, dimensiones y carga/error comunes de US-003. Esta historia no introduce pedidos independientes ni estados operativos.

## Aprobación

El responsable del proyecto confirmó en la conversación del 2026-10-18 que, para este mes, se suman las ventas de todos sus días por hora para identificar las horas pico. Después respondió «si» a la propuesta consolidada de las tres historias del Dashboard.

La aprobación inicial corresponde a la historia y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

La autorización documental del menú del 2026-10-18 permite adecuar la referencia a ventas sin pedidos independientes; no modifica los criterios del gráfico.

Posteriormente, el 2026-10-18, el responsable respondió «ok apruebo las tareas» a las ocho tareas propuestas del Dashboard. Se aprueban TASK-008 a TASK-015 para registro documental; esta historia define TASK-014 y TASK-015. No se cambian criterios ni se autoriza iniciar implementación.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-014 se amplía con la verificación integrada del gráfico; TASK-015 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-014 sustituyó la etiqueta local HOR-BE; la de HOR-FE se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-003](us-003-consultar-resumen-ventas.md#condiciones-previas-compartidas), incluida la integración común.

### TASK-014 — Obtener e integrar la cantidad de ventas por hora

- Historia relacionada: [US-005](us-005-identificar-horas-mas-ventas.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener la distribución horaria de ventas registradas para el período seleccionado.
- Alcance y exclusiones: para hoy, contar ventas por hora en Bolivia; para este mes, sumar las ventas de la misma franja horaria de todos sus días. Contar cada venta una vez, independientemente del método y unidades. Excluir promedios, ingresos, series por días y ventas en curso. Aporta la sección `hourlySales` a la lectura común y verifica el gráfico integrado: revisión manual de líneas y ejes y contraste de los puntos con datos conocidos.
- Resultado esperado: cantidades horarias coincidentes con las ventas registradas del período, sin promediar el mes ni contar productos como ventas.
- Criterios aplicables: CA-01 (P), CA-02 a CA-04 y CA-05 (reutiliza la evidencia de TASK-008 y TASK-010).
- Verificación prevista: contrastar cálculos e integración con límites horarios y de período, varios días del mes en la misma franja y ventas con distintos métodos y cantidades.
- Dependencias: definición de períodos de TASK-008 y contrato de US-003; fecha/hora y datos del registro de [US-013](us-013-registrar-venta-pagada.md) (TASK-030); registro de entrega del gráfico. No depende de TASK-012.

### Tareas retiradas

- TASK-015 — Presentar e integrar el gráfico horario — Retirada el 2026-10-19; cobertura en TASK-014. El gráfico lo implementa Frontend sin tareas.
