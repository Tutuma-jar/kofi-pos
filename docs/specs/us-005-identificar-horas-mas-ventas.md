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

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-014 y TASK-015 sustituyen respectivamente las etiquetas locales HOR-BE y HOR-FE. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-003](us-003-consultar-resumen-ventas.md#condiciones-previas-compartidas).

### TASK-014 — Obtener la cantidad de ventas por hora

- Historia relacionada: [US-005](us-005-identificar-horas-mas-ventas.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener la distribución horaria de ventas registradas para el período seleccionado.
- Alcance y exclusiones: para hoy, contar ventas por hora en Bolivia; para este mes, sumar las ventas de la misma franja horaria de todos sus días. Contar cada venta una vez, independientemente del método y unidades. Excluir promedios, ingresos, series por días y ventas en curso.
- Resultado esperado: cantidades horarias coincidentes con las ventas registradas del período, sin promediar el mes ni contar productos como ventas.
- Criterios aplicables: CA-02 a CA-04 y datos para CA-01.
- Verificación prevista: contrastar cálculos e integración con límites horarios y de período, varios días del mes en la misma franja y ventas con distintos métodos y cantidades.
- Dependencias: definición de períodos de TASK-008 y contratos de US-003; fecha/hora y datos del registro de [US-013](us-013-registrar-venta-pagada.md). No depende de TASK-012 ni de tareas frontend.

### TASK-015 — Presentar e integrar el gráfico horario

- Historia relacionada: [US-005](us-005-identificar-horas-mas-ventas.md).
- Responsabilidad: frontend.
- Descripción y objetivo: representar de forma observable la distribución horaria sin alterar su significado.
- Alcance y exclusiones: gráfico de líneas con horas en el eje horizontal y cantidad de ventas en el vertical; consumir período y actualización comunes e integrarse sin scroll general. Reutilizar el mensaje del período vacío. Excluir biblioteca impuesta, cálculos alternativos, ingresos y comparativas.
- Resultado esperado: líneas, ejes y puntos coherentes con el período, actualización sin recarga entre sesiones e integración en una pantalla con los demás bloques.
- Criterios aplicables: CA-01, representación de CA-02 a CA-04 y CA-05.
- Verificación prevista: inspeccionar líneas y ejes y contrastar puntos con datos conocidos de hoy y del mes; reutilizar el recorrido común de actualización entre sesiones, ausencia de ventas y composición del Dashboard de US-003.
- Dependencias: TASK-014 de esta historia; TASK-009 y TASK-011 de US-003; dimensiones acordadas para verificar la composición.
