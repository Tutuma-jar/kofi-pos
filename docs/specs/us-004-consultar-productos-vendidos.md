# US-004 — Consultar los productos vendidos

## Descripción

Como operador, quiero consultar los productos vendidos del período, para conocer sus unidades e ingresos.

## Objetivo

Resumir los productos vendidos sin repetirlos por cada venta y dar prioridad a los que se vendieron más recientemente.

## Alcance

- Incluye: lista de productos vendidos de hoy o este mes con unidades e ingresos por producto, ordenada por venta más reciente.
- Excluye: ranking por unidades vendidas, listado de ventas individuales, detalle de cada venta y filtros adicionales.
- No fija un número máximo de productos visibles ni una distribución visual.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | La lista corresponde al período seleccionado en el Dashboard: hoy o este mes, conforme a US-003. |
| CA-02 | Cada producto vendido aparece una sola vez, agrupado por su identidad estable y mostrado con su nombre actual, cantidad total de unidades vendidas e ingresos correspondientes dentro del período, expresados con el [formato de importes del Dashboard](us-003-consultar-resumen-ventas.md#decisiones-de-presentación-y-medición). Renombrar un producto no divide sus resultados. |
| CA-03 | Los productos se ordenan por su venta más reciente dentro del período, primero el vendido más recientemente. No se ordenan por cantidad de unidades ni se repite un producto por cada venta. Cuando varios productos comparten el mismo instante de última venta, como los de una misma venta, se mantiene el desempate aprobado por `productId` ascendente. |
| CA-04 | Cuando los productos superan el espacio disponible, se pueden consultar mediante scroll interno de la lista sin producir scroll general en el Dashboard. No se recorta la lista a un ranking de tamaño fijo. |
| CA-05 | La lista cumple los criterios comunes de US-003 CA-05 a CA-07: actualización en tiempo real, también entre sesiones; mensaje del período sin ventas; y Dashboard en una pantalla con desplazamiento solo dentro de la lista. |
| CA-06 | Editar o desactivar productos no cambia las unidades ni ingresos de ventas anteriores ni elimina sus referencias de la lista. Los importes proceden de lo registrado al vender, no del precio actual del catálogo. |
| CA-07 | Si un producto se renombra con el Dashboard abierto, su nombre actual aparece en la siguiente relectura del período: aviso de una venta, conciliación periódica de 30 segundos, cambio de período o reconexión. Los cambios del catálogo no emiten un aviso propio. |

### Verificación prevista de los criterios

- CA-01 a CA-03 y CA-06: contrastar con ventas conocidas de ambos períodos, incluyendo productos repetidos en distintas ventas, varias unidades por venta y fechas de última venta diferentes. Comprobar agregación de unidades e ingresos y orden mediante pruebas de cálculos e integración; incluir renombrado, cambio de precio y desactivación posteriores para verificar agrupación estable, nombre actual e importes históricos intactos. Incluir varios productos de una misma venta para el desempate y comprobar que la suma de `revenueTenths` de la lista coincide con los ingresos del resumen.
- CA-04: revisión manual con suficientes productos para superar el espacio disponible, comprobando acceso a todos sin scroll general; es apropiada para validar el comportamiento visual.
- CA-07: renombrar un producto vendido con el Dashboard abierto y comprobar que el nuevo nombre aparece tras la siguiente relectura, como máximo en el intervalo de conciliación, sin dividir sus resultados.
- CA-05: comprobar con el recorrido común de actualización y ausencia de datos previsto en [US-003](us-003-consultar-resumen-ventas.md#verificación-prevista-de-los-criterios), sin duplicar pruebas equivalentes.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no hay aplicación ni herramientas de pruebas del POS configuradas.

## Dependencias relevantes

- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md): períodos y criterios comunes del Dashboard. La lista se entrega en la sección `products` del [contrato de lectura y actualización](us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización).
- [US-007 — Editar productos](us-007-editar-productos.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): identidad estable, nombre actual en el Dashboard y conservación de ventas anteriores; no existe eliminación definitiva de productos.
- [US-013](us-013-registrar-venta-pagada.md), [US-014](us-014-consultar-historial-ventas.md) y [US-015](us-015-consultar-detalle-venta.md): identificación de cada producto, snapshots de nombre/precio/unidades/importes y fecha/hora del servidor. El detalle histórico conserva el nombre original aunque el Dashboard muestre el actual. Se consume la lectura común y actualización elegidas en [arquitectura](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), con latencia, dimensiones y carga/error de US-003; no se implementa una actualización independiente de esta lista.

## Aprobación

El responsable del proyecto respondió «si» a la lista de cada producto una sola vez, con unidades e ingresos del período y orden por venta más reciente, sustituyendo el orden inicialmente propuesto por unidades vendidas. Después aprobó las tres historias consolidadas del Dashboard respondiendo «si» en la conversación del 2026-10-18.

La aprobación inicial corresponde a la historia y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

En la aprobación del menú del 2026-10-18, el responsable confirmó conservar los datos originales de cada venta, agrupar el Dashboard por identidad del producto con su nombre actual y permitir desactivación/reactivación sin eliminación definitiva. Autorizó actualizar esta referencia afectada al aprobar las cinco historias consolidadas del menú. CA-02 y CA-06 reflejan ese acuerdo.

Posteriormente, el 2026-10-18, el responsable respondió «ok apruebo las tareas» a las ocho tareas propuestas del Dashboard. Se aprueban TASK-008 a TASK-015 para registro documental; esta historia define TASK-012 y TASK-013. No se cambian criterios ni se autoriza iniciar implementación.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-012 se amplía con la verificación integrada de la lista y el cierre de US-003 CA-07; TASK-013 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

El 2026-10-19, tras revisar con `requirements-analyst` las mejoras y preguntas abiertas del Dashboard, el responsable respondió «usa tus sugerencias para cada uno». Se aprueban el formato de importes común (CA-02), la confirmación del desempate por `productId` dentro de una misma venta (CA-03), la nueva CA-07 sobre renombrado con el Dashboard abierto y el enlace a US-014 y US-015 en lugar de la futura especificación de historial. No cambian alcance ni tareas, ni se autoriza implementación.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-012 sustituyó la etiqueta local PROD-BE; la de PROD-FE se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-003](us-003-consultar-resumen-ventas.md#condiciones-previas-compartidas), incluida la integración común.

### TASK-012 — Obtener e integrar los productos vendidos y sus resultados históricos

- Historia relacionada: [US-004](us-004-consultar-productos-vendidos.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener una entrada por producto vendido con sus resultados del período y prioridad por venta más reciente.
- Alcance y exclusiones: agrupar por identidad estable, resolver el nombre actual y sumar unidades e ingresos históricos del período; ordenar por última venta dentro de él. Conservar referencias y resultados tras edición o desactivación. Excluir recálculo con precios actuales, ranking por unidades, recorte a un tamaño fijo y modificación del catálogo o las ventas. Aporta la sección `products` a la lectura común y verifica en la página integrada las filas, el orden recibido y el scroll interno a 1280 × 720 y 1366 × 768, además de US-003 CA-07 con los tres bloques.
- Resultado esperado: productos sin repeticiones, nombre actual, cantidades e ingresos históricos correctos y orden por venta más reciente, incluidos los productos desactivados que se vendieron en el período. Lista integrada sin scroll general del Dashboard.
- Criterios aplicables: CA-01 a CA-03, CA-04 (P), CA-05 (reutiliza la evidencia de TASK-008 y TASK-010), CA-06 y CA-07; US-003 CA-07 (P).
- Verificación prevista: contrastar cálculos e integración con productos repetidos, varias unidades, distintas últimas ventas y ventas fuera del período; incluir renombrado, cambio de precio y desactivación posteriores.
- Dependencias: definición de períodos de TASK-008 y contrato de US-003; TASK-014 integrada para US-003 CA-07; identidad, nombre actual y conservación histórica de [US-007](us-007-editar-productos.md) y [US-009](us-009-desactivar-reactivar-productos.md) (TASK-016, TASK-018 y TASK-022); datos registrados al vender de [US-013](us-013-registrar-venta-pagada.md) (TASK-030); registro de entrega de la lista.

### Tareas retiradas

- TASK-013 — Presentar e integrar la lista completa de productos vendidos — Retirada el 2026-10-19; cobertura en TASK-012. La lista la implementa Frontend sin tareas.
