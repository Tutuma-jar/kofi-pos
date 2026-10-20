# US-016 — Consultar el resumen del período

## Descripción

Como operador, quiero consultar los ingresos y estadísticas básicas del rango de fechas filtrado, para conocer el rendimiento del negocio en ese período.

## Objetivo

Resumir las ventas registradas del rango con indicadores básicos calculados sobre los importes registrados.

## Alcance

- Módulo: Historial y reportes. Usa el rango del filtro de [US-014](us-014-consultar-historial-ventas.md).
- Incluye: número de ventas, ingresos totales, ticket promedio e ingresos por efectivo y por QR del rango, y el caso de rango sin ventas.
- Excluye: comparación entre períodos, otros indicadores o gráficos, filtros adicionales, tiempo real, exportación e impresión, y recálculo con precios actuales. El Dashboard (US-003) no se modifica.
- Limitación conocida aprobada: sin anulaciones, devoluciones ni correcciones, una venta registrada por error sigue contando en estos resultados.
- No fija disposición visual: se define en el diseño de la página.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El resumen corresponde al rango aplicado en el filtro de US-014 y se lee con la misma consulta o refresco que la lista. |
| CA-02 | Se muestra el número de ventas registradas del rango. |
| CA-03 | Se muestran los ingresos totales del rango como suma de los totales registrados de sus ventas, independientemente del método de pago, según la definición del [producto](../ai-context/product.md#32-dashboard). Se usan los importes registrados al vender, no precios actuales del catálogo. |
| CA-04 | Se muestran los ingresos de las ventas con efectivo y de las ventas con QR; su suma es igual a los ingresos totales. |
| CA-05 | Con al menos una venta, se muestra el ticket promedio: ingresos totales divididos entre el número de ventas, en BOB con un decimal. El backend calcula el cociente en décimas enteras y lo redondea a la décima más cercana, con la mitad hacia arriba, y devuelve el promedio ya redondeado. |
| CA-06 | Sin ventas en el rango, no se calcula el ticket promedio ni se divide por cero: el resumen muestra el estado vacío de US-014 («No se registraron ventas en este rango») y no presenta un ticket de BOB 0.0 como si fuera un promedio. |
| CA-07 | Importes, incluido el ticket promedio, con el [formato de importes de US-003](us-003-consultar-resumen-ventas.md#decisiones-de-presentación-y-medición): `BOB`, un decimal con punto y sin separador de miles. Carga y error se distinguen del rango sin ventas, como en [US-014 CA-08](us-014-consultar-historial-ventas.md#criterios-de-aceptación). |

### Verificación prevista de los criterios

- CA-01: integración con la lista: cambiar de rango y refrescar, comprobando que resumen y lista corresponden al mismo rango.
- CA-02 a CA-04: pruebas de cálculo e integración con ventas conocidas de ambos métodos, ventas fuera del rango y cambios posteriores de precio en el catálogo; comprobar que los ingresos no cambian. Incluir los límites UTC/`America/La_Paz` cerca de medianoche y fin de mes.
- CA-05: pruebas unitarias del promedio con divisiones exactas, inexactas y con resto exactamente en la mitad (por ejemplo, 3 décimas entre 2 ventas da 2 décimas).
- CA-06: rango sin ventas, comprobando ausencia de división por cero y de un promedio ficticio.
- CA-07: revisión manual del formato y simulación de carga y error con y sin datos previos.
- Coherencia con el Dashboard (CA-02 y CA-03): con el rango «Hoy» y después de refrescar, sin ventas registradas entre ambas lecturas, la cantidad de ventas y los ingresos totales coinciden con los de [US-003](us-003-consultar-resumen-ventas.md) para hoy. Es una verificación cruzada; no modifica el Dashboard.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing). Hoy no hay aplicación ni pruebas del POS configuradas.

## Preguntas abiertas

1. Resuelta el 2026-10-19: redondeo a la décima más cercana con la mitad hacia arriba, calculado y devuelto por el backend (CA-05). Planteamiento original: redondeo del ticket promedio. La [arquitectura](../ai-context/architecture.md#api-dinero-y-tiempo) fija importes en enteros de décimas de BOB y presentación con un decimal, pero no define cómo redondear un cociente no entero (por ejemplo, mitad hacia arriba, mitad al par o truncamiento). Debe aprobarse antes de cerrar CA-05; tampoco se decide si el backend devuelve el promedio ya redondeado.

## Dependencias relevantes

- [US-014 — Consultar el historial de ventas por fecha](us-014-consultar-historial-ventas.md): rango, consulta, refresco y estados.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): totales y método registrados.
- [Producto: Dashboard](../ai-context/product.md#32-dashboard): definición de ingresos. El Dashboard sigue mostrando solo hoy y este mes.
- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso protegido.

## Aprobación

El 2026-10-19 el responsable del proyecto aprobó esta historia, que fusiona «Consultar ingresos por períodos» y «Mostrar estadísticas básicas» del producto: para el rango filtrado, número de ventas, ingresos totales, ticket promedio y desglose de ingresos por efectivo y QR, con importes registrados, ingresos según el producto y sin comparación entre períodos. Encargó definir la presentación del ticket promedio con un decimal y el caso sin ventas sin dividir por cero, dejando como pregunta abierta el redondeo no deducible de la arquitectura. Autorizó redactar esta especificación con «apruebo».

El 2026-10-19 el responsable respondió «sigue tus sugerencias» a las mejoras de `requirements-analyst`. CA-07 remite al formato de importes de US-003, y se añade la verificación cruzada con US-003 para «Hoy» (pregunta P11, opción a). Siguen pendientes la pregunta abierta 1, el texto del estado vacío de CA-06 (que depende de la pregunta 4 de US-014) y la autorización de la interfaz.

El 2026-10-19 el responsable respondió «para todo esto usa tus sugerencias» a las preguntas pendientes de Gestión de ventas e Historial, y se adoptaron las sugerencias del principal. Se resuelven la pregunta abierta 1 (CA-05) y el texto del estado vacío de CA-06. La autorización de la interfaz sigue pendiente. No autoriza implementación ni cambios en el tracker.

La aprobación corresponde a la historia y sus criterios; su tarea técnica se aprobó por separado el 2026-10-19. Ninguna de las dos autoriza implementación. La interfaz de Historial requiere autorización explícita pendiente, como se indica en [US-014](us-014-consultar-historial-ventas.md#aprobación).

## Tareas técnicas asociadas

Tarea de `requirements-analyst` aprobada por el responsable el 2026-10-19 para registro documental; su estado se consulta únicamente en el [tracker](../progress/tracker.md) y el registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-014](us-014-consultar-historial-ventas.md#condiciones-previas-compartidas).

### TASK-035 — Calcular el resumen del rango e integrarlo en Historial

- Historia relacionada: [US-016](us-016-consultar-resumen-periodo.md).
- Responsabilidad: backend.
- Descripción y objetivo: calcular en servidor los indicadores del rango filtrado sobre ventas registradas y conectarlos en la capa de acceso de Historial.
- Alcance y exclusiones: reutilizar la definición y validación del rango de TASK-033; contar ventas, sumar ingresos totales y por método en décimas de BOB, y calcular el ticket promedio solo con ventas, según la regla de redondeo aprobada. Verifica en la página integrada el resumen junto a la lista, el formato BOB y los estados. Excluye comparación entre períodos, otros indicadores, recálculo con precios actuales y cambios en el Dashboard.
- Resultado esperado: indicadores iguales a los calculados a mano sobre ventas conocidas, coherentes entre sí y sin promedio en un rango vacío.
- Criterios aplicables: CA-01 (C), CA-02 a CA-04, CA-05 (P), CA-06 (P) y CA-07 (P).
- Verificación prevista: la de esta historia.
- Dependencias: TASK-033 (definición del rango y página integrada); TASK-030 de US-013; TASK-003 y TASK-005 de US-001; aprobación de la regla de redondeo; autorización de la interfaz de Historial y su registro de entrega.

## Entrega de interfaz relacionada

La autorización y entrega frontend posterior del 2026-10-20 se registran en [US-014](us-014-consultar-historial-ventas.md#interfaz--historial-y-reportes-registro-de-entrega). Incluye resumen simulado del rango, ventas, ingresos, efectivo/QR y ticket promedio recibido, con carga, vacío sin promedio ficticio, error y reintento. No acredita integración ni DoD de esta historia.
