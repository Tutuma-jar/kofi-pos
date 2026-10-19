# US-017 — Identificar los productos más vendidos

## Descripción

Como operador, quiero conocer los productos más vendidos del rango de fechas filtrado, para saber cuáles tienen mayor demanda.

## Objetivo

Ofrecer en Historial y reportes un ranking breve por unidades vendidas, distinto de la lista del Dashboard ordenada por venta más reciente.

## Alcance

- Módulo: Historial y reportes. Usa el rango del filtro de [US-014](us-014-consultar-historial-ventas.md).
- Incluye: los 10 primeros productos del rango por unidades vendidas, con ingresos como dato secundario, agrupados por identidad estable y con el nombre actual, incluidos los productos desactivados.
- Excluye: ranking por ingresos como orden principal, más de 10 posiciones, filtros por producto o categoría, comparación entre períodos, tiempo real, exportación e impresión. La lista del Dashboard de [US-004](us-004-consultar-productos-vendidos.md) no cambia.
- Limitación conocida aprobada: sin anulaciones, devoluciones ni correcciones, una venta registrada por error sigue contando en el ranking.
- No fija disposición visual: se define en el diseño de la página.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El ranking corresponde al rango aplicado en el filtro de US-014 y se lee con la misma consulta o refresco que la lista. |
| CA-02 | Cada producto aparece una sola vez, agrupado por su identidad estable y mostrado con su nombre actual, de forma coherente con US-004. Renombrar un producto no divide sus resultados. El nombre original de cada venta solo se muestra en el detalle de [US-015](us-015-consultar-detalle-venta.md). |
| CA-03 | Por cada producto se muestran las unidades vendidas en el rango y, como dato secundario, sus ingresos con el [formato de importes de US-003](us-003-consultar-resumen-ventas.md#decisiones-de-presentación-y-medición) (`BOB`, un decimal con punto y sin separador de miles), calculados con los importes registrados al vender. |
| CA-04 | Se muestran como máximo 10 productos, ordenados por unidades vendidas de mayor a menor. A igualdad de unidades, primero el de mayores ingresos; a igualdad de ambos, por orden alfabético del nombre actual, comparado por el backend en español sin distinguir mayúsculas ni tildes. Si hay menos de 10 productos vendidos, se muestran todos. |
| CA-05 | Los productos desactivados con ventas en el rango se incluyen en el ranking. |
| CA-06 | Carga, error y rango sin ventas se distinguen, como en [US-014 CA-08](us-014-consultar-historial-ventas.md#criterios-de-aceptación). |

### Verificación prevista de los criterios

- CA-01: integración con la lista: cambiar de rango y refrescar, comprobando que ranking y lista corresponden al mismo rango; incluir los límites UTC/`America/La_Paz` cerca de medianoche y fin de mes.
- CA-02, CA-03 y CA-05: integración con ventas conocidas de productos repetidos en varias ventas, renombrados, con cambio de precio y desactivados después de vender; comprobar agrupación, nombre actual, unidades e ingresos históricos.
- CA-04: pruebas de cálculo e integración con más de 10 productos, empates en unidades, empates en unidades e ingresos y menos de 10 productos.
- CA-06: simular carga, error y rango vacío.
- Coherencia con el Dashboard (CA-02 y CA-03): con el rango «Hoy» y después de refrescar, sin ventas registradas entre ambas lecturas, las unidades y los ingresos de cada producto del ranking coinciden con los de ese producto en [US-004](us-004-consultar-productos-vendidos.md) para hoy. Es una verificación cruzada; no cambia el orden ni el límite de 10 ni modifica el Dashboard.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing). Hoy no hay aplicación ni pruebas del POS configuradas.

## Preguntas abiertas

1. Resuelta el 2026-10-19: comparación en español sin distinguir mayúsculas ni tildes, aplicada por el backend (CA-04). Planteamiento original: falta fijar la comparación (por ejemplo, intercalación en español sin distinguir mayúsculas ni tildes). Los nombres son únicos en el catálogo según [US-006](us-006-registrar-productos.md), por lo que el desempate final es total una vez fijada la comparación.

## Dependencias relevantes

- [US-014 — Consultar el historial de ventas por fecha](us-014-consultar-historial-ventas.md): rango, consulta, refresco y estados.
- [US-004 — Consultar los productos vendidos](us-004-consultar-productos-vendidos.md): misma agrupación por identidad y nombre actual.
- [US-007 — Editar productos](us-007-editar-productos.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): identidad estable, nombre actual y conservación de ventas anteriores.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): identidad de producto, cantidades e importes registrados.
- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso protegido.

## Aprobación

El 2026-10-19 el responsable del proyecto aprobó esta historia dentro de la atomización de Historial y reportes en cuatro historias: los 10 primeros productos del rango por unidades vendidas, con ingresos como dato secundario, agrupados por identidad estable con el nombre actual (coherente con US-004; el nombre original solo en el detalle de US-015), incluidos los desactivados, y desempate por mayores ingresos y luego orden alfabético del nombre. Autorizó redactar esta especificación con «apruebo».

El 2026-10-19 el responsable respondió «sigue tus sugerencias» a las mejoras de `requirements-analyst`. CA-03 remite al formato de importes de US-003, y se añade la verificación cruzada con US-004 para «Hoy» (pregunta P11, opción a). Siguen pendientes la pregunta abierta 1 y la autorización de la interfaz.

El 2026-10-19 el responsable respondió «para todo esto usa tus sugerencias» a las preguntas pendientes de Gestión de ventas e Historial, y se adoptaron las sugerencias del principal. Se resuelve la pregunta abierta 1 (CA-04). La autorización de la interfaz sigue pendiente. No autoriza implementación ni cambios en el tracker.

La aprobación corresponde a la historia y sus criterios; su tarea técnica se aprobó por separado el 2026-10-19. Ninguna de las dos autoriza implementación. La interfaz de Historial requiere autorización explícita pendiente, como se indica en [US-014](us-014-consultar-historial-ventas.md#aprobación).

## Tareas técnicas asociadas

Tarea de `requirements-analyst` aprobada por el responsable el 2026-10-19 para registro documental; su estado se consulta únicamente en el [tracker](../progress/tracker.md) y el registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-014](us-014-consultar-historial-ventas.md#condiciones-previas-compartidas).

### TASK-036 — Calcular el ranking de productos más vendidos del rango e integrarlo en Historial

- Historia relacionada: [US-017](us-017-identificar-productos-mas-vendidos.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener en servidor los 10 productos con más unidades vendidas en el rango y conectarlos en la capa de acceso de Historial.
- Alcance y exclusiones: reutilizar la definición y validación del rango de TASK-033; agrupar por identidad estable, resolver el nombre actual (también de productos desactivados), sumar unidades e ingresos históricos y aplicar el orden y los desempates aprobados en servidor; el cliente no reordena. Verifica en la página integrada el ranking, el formato BOB y los estados. Excluye recálculo con precios actuales, más de 10 posiciones, otros órdenes y cambios en la lista del Dashboard.
- Resultado esperado: ranking igual al calculado sobre ventas conocidas, con agrupación estable, nombre actual y desempates deterministas.
- Criterios aplicables: CA-01 (C), CA-02, CA-03 (P), CA-04, CA-05 y CA-06 (P).
- Verificación prevista: la de esta historia.
- Dependencias: TASK-033 (definición del rango y página integrada); TASK-030 de US-013; TASK-016, TASK-018 y TASK-022 de US-006, US-007 y US-009 para identidad, nombre actual y conservación histórica; TASK-003 y TASK-005 de US-001; fijar la comparación alfabética; autorización de la interfaz de Historial y su registro de entrega.
