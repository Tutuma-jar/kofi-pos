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
| CA-02 | Cada producto vendido aparece una sola vez, agrupado por su identidad estable y mostrado con su nombre actual, cantidad total de unidades vendidas e ingresos correspondientes dentro del período, expresados en BOB. Renombrar un producto no divide sus resultados. |
| CA-03 | Los productos se ordenan por su venta más reciente dentro del período, primero el vendido más recientemente. No se ordenan por cantidad de unidades ni se repite un producto por cada venta. |
| CA-04 | Cuando los productos superan el espacio disponible, se pueden consultar mediante scroll interno de la lista sin producir scroll general en el Dashboard. No se recorta la lista a un ranking de tamaño fijo. |
| CA-05 | La lista cumple los criterios comunes de US-003 CA-05 a CA-07: actualización en tiempo real, también entre sesiones; mensaje del período sin ventas; y Dashboard en una pantalla con desplazamiento solo dentro de la lista. |
| CA-06 | Editar o desactivar productos no cambia las unidades ni ingresos de ventas anteriores ni elimina sus referencias de la lista. Los importes proceden de lo registrado al vender, no del precio actual del catálogo. |

### Verificación prevista de los criterios

- CA-01 a CA-03 y CA-06: contrastar con ventas conocidas de ambos períodos, incluyendo productos repetidos en distintas ventas, varias unidades por venta y fechas de última venta diferentes. Comprobar agregación de unidades e ingresos y orden mediante pruebas de cálculos e integración; incluir renombrado, cambio de precio y desactivación posteriores para verificar agrupación estable, nombre actual e importes históricos intactos.
- CA-04: revisión manual con suficientes productos para superar el espacio disponible, comprobando acceso a todos sin scroll general; es apropiada para validar el comportamiento visual.
- CA-05: comprobar con el recorrido común de actualización y ausencia de datos previsto en [US-003](us-003-consultar-resumen-ventas.md#verificación-prevista-de-los-criterios), sin duplicar pruebas equivalentes.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no hay aplicación ni herramientas de pruebas del POS configuradas.

## Dependencias relevantes

- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md): períodos y criterios comunes del Dashboard. La lista se entrega en la sección `products` del [contrato de lectura y actualización](us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización).
- [US-007 — Editar productos](us-007-editar-productos.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): identidad estable, nombre actual en el Dashboard y conservación de ventas anteriores; no existe eliminación definitiva de productos.
- [US-013](us-013-registrar-venta-pagada.md) y futura especificación de historial: identificación de cada producto, snapshots de nombre/precio/unidades/importes y fecha/hora del servidor. El detalle histórico conserva el nombre original aunque el Dashboard muestre el actual. Se consume la lectura común y actualización elegidas en [arquitectura](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), con latencia, dimensiones y carga/error de US-003; no se implementa una actualización independiente de esta lista.

## Aprobación

El responsable del proyecto respondió «si» a la lista de cada producto una sola vez, con unidades e ingresos del período y orden por venta más reciente, sustituyendo el orden inicialmente propuesto por unidades vendidas. Después aprobó las tres historias consolidadas del Dashboard respondiendo «si» en la conversación del 2026-10-18.

La aprobación inicial corresponde a la historia y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

En la aprobación del menú del 2026-10-18, el responsable confirmó conservar los datos originales de cada venta, agrupar el Dashboard por identidad del producto con su nombre actual y permitir desactivación/reactivación sin eliminación definitiva. Autorizó actualizar esta referencia afectada al aprobar las cinco historias consolidadas del menú. CA-02 y CA-06 reflejan ese acuerdo.

Posteriormente, el 2026-10-18, el responsable respondió «ok apruebo las tareas» a las ocho tareas propuestas del Dashboard. Se aprueban TASK-008 a TASK-015 para registro documental; esta historia define TASK-012 y TASK-013. No se cambian criterios ni se autoriza iniciar implementación.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-012 y TASK-013 sustituyen respectivamente las etiquetas locales PROD-BE y PROD-FE. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-003](us-003-consultar-resumen-ventas.md#condiciones-previas-compartidas).

### TASK-012 — Obtener productos vendidos y sus resultados históricos

- Historia relacionada: [US-004](us-004-consultar-productos-vendidos.md).
- Responsabilidad: backend.
- Descripción y objetivo: obtener una entrada por producto vendido con sus resultados del período y prioridad por venta más reciente.
- Alcance y exclusiones: agrupar por identidad estable, resolver el nombre actual y sumar unidades e ingresos históricos del período; ordenar por última venta dentro de él. Conservar referencias y resultados tras edición o desactivación. Excluir recálculo con precios actuales, ranking por unidades, recorte a un tamaño fijo y modificación del catálogo o las ventas.
- Resultado esperado: productos sin repeticiones, nombre actual, cantidades e ingresos históricos correctos y orden por venta más reciente, incluidos los productos desactivados que se vendieron en el período.
- Criterios aplicables: CA-01 a CA-03 y CA-06; datos completos para CA-04.
- Verificación prevista: contrastar cálculos e integración con productos repetidos, varias unidades, distintas últimas ventas y ventas fuera del período; incluir renombrado, cambio de precio y desactivación posteriores.
- Dependencias: definición de períodos de TASK-008 y contratos de US-003; identidad, nombre actual y conservación histórica de [US-007](us-007-editar-productos.md) y [US-009](us-009-desactivar-reactivar-productos.md); datos registrados al vender de [US-013](us-013-registrar-venta-pagada.md). No depende de TASK-009 ni TASK-014.

### TASK-013 — Presentar e integrar la lista completa de productos vendidos

- Historia relacionada: [US-004](us-004-consultar-productos-vendidos.md).
- Responsabilidad: frontend.
- Descripción y objetivo: permitir consultar todos los productos vendidos y sus resultados sin desbordar la pantalla.
- Alcance y exclusiones: mostrar nombre actual, unidades e ingresos en BOB, manteniendo agrupación y orden recibidos; consumir período y actualización compartidos. Implementar scroll interno cuando sea necesario, sin ranking fijo. Reutilizar el mensaje vacío y marco del Dashboard; no duplicar actualización ni agregaciones backend.
- Resultado esperado: todos los productos del período consultables dentro de la lista, con datos y orden correctos; cambio de período y actualización entre sesiones sin recarga ni scroll general.
- Criterios aplicables: presentación de CA-01 a CA-03 y CA-06; CA-04 y CA-05.
- Verificación prevista: comprobar correspondencia entre filas y datos, cambio de período y acceso a todos los productos con scroll interno. Reutilizar el recorrido común de actualización entre sesiones y ausencia de ventas de US-003.
- Dependencias: TASK-012 de esta historia; TASK-009 y TASK-011 de US-003; dimensiones acordadas para verificar el desplazamiento.
