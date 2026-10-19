# US-011 — Ajustar y revisar la venta en curso

## Descripción

Como operador, quiero modificar cantidades, quitar productos y consultar los importes, para revisar la venta antes del cobro.

## Objetivo

Preparar una selección y conocer su detalle y total antes de recibir el dinero.

## Alcance

- Módulo: Gestión de ventas.
- Incluye: cantidades, eliminación explícita de productos, detalle, subtotales y total de la venta en curso.
- Excluye: editar el catálogo o ventas registradas, descuentos, recargos e impuestos adicionales.
- No se fija un máximo comercial arbitrario; los límites técnicos deben concretarse antes de implementar.
- Representación aprobada: precios, subtotales y total en enteros de décimas de BOB, conforme a la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada). No introduce impuestos ni redondeos nuevos.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El operador puede aumentar, disminuir o escribir cantidades enteras positivas. Se rechazan cero, negativos y decimales; introducirlos no elimina el producto. |
| CA-02 | El operador puede quitar un producto mediante una acción explícita; el detalle y los importes se actualizan según los productos restantes. |
| CA-03 | El subtotal de cada producto es su precio unitario multiplicado por la cantidad; el total es la suma de los subtotales. Se recalculan automáticamente al cambiar la selección o cantidades. |
| CA-04 | El detalle muestra nombre, precio unitario, cantidad y subtotal por producto, con el total claramente visible. Precios, subtotales y total se expresan en BOB con un decimal. No se agregan descuentos, recargos ni impuestos adicionales. |
| CA-05 | Sin productos, se muestra «Agrega productos para preparar una venta», el total es BOB 0.0 y el registro está deshabilitado. |
| CA-06 | La revisión y los ajustes no modifican el catálogo ni ventas anteriores. Los cambios de precio y desactivación no alteran silenciosamente el total; se tratan conforme a US-012. |
| CA-07 | Se rechazan valores y operaciones fuera del rango entero exacto o de los límites técnicos de tamaño aprobados para el contrato, sin calcular ni registrar importes imprecisos. Los valores concretos siguen por justificar antes de implementar; no se introduce un máximo comercial arbitrario. |

### Verificación prevista de los criterios

- CA-01: pruebas unitarias de cantidades válidas e inválidas y recorrido de aumentar, disminuir y escribir; incluir los límites técnicos una vez definidos.
- CA-02 a CA-04: unitarias con resultados conocidos de multiplicación y suma, incluidos precios de un decimal y varias unidades; recorrido de cambios y eliminación, comprobando detalle y presentación sin errores de precisión monetaria.
- CA-05: recorrido de selección inicialmente vacía y de eliminación del último producto, verificando mensaje, importe y registro deshabilitado.
- CA-06: integración con catálogo y datos de ventas anteriores para comprobar que ajustar la selección no los modifica; revisión concurrente conforme a US-012.
- CA-07: unitarias en las fronteras del rango elegido para precio, cantidad, producto y suma, y límites de tamaño definidos; comprobar rechazo antes del desbordamiento, coincidencia frontend/backend y precisión de décimas. US-013 comprueba el rechazo autoritativo al registrar.

Estas verificaciones están previstas, no ejecutadas. Hoy no hay aplicación ni comandos de pruebas del POS; antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing).

## Dependencias relevantes

- [US-010 — Consultar y seleccionar productos para vender](us-010-consultar-seleccionar-productos-venta.md): selección y ciclo de vida por pestaña.
- [US-006 — Registrar productos](us-006-registrar-productos.md): precios positivos con un decimal.
- [US-012 — Revisar cambios del catálogo antes de cobrar](us-012-revisar-cambios-catalogo-antes-cobro.md): cambios que afectan la revisión.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): registro posterior; no se efectúa en esta historia.

## Aprobación

El responsable respondió «si apruebo todo» en la conversación del 2026-10-18 a las cuatro historias propuestas con `requirements-analyst` y las siete recomendaciones del principal. Esta historia formaliza cantidades, cálculos, información visible y selección vacía aprobados. La aprobación autoriza el registro documental, no implementar código ni aprobar tareas técnicas todavía no presentadas.

Posteriormente, el 2026-10-18, el responsable respondió «si» a «¿Apruebas estas nueve tareas para asignarles IDs y registrarlas como pendientes, sin iniciar implementación?». Queda aprobado su registro documental como TASK-024 a TASK-032 en US-010 a US-013. La aprobación no resuelve las decisiones pendientes de revisión/cobro, ajustes posteriores o comprobación de registros inciertos tras salida ni autoriza implementar.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y su registro sin implementación: décimas enteras, validación de rango en multiplicaciones/sumas y límites técnicos de tamaño, sin máximos comerciales arbitrarios. CA-07 y sus verificaciones se incorporan a TASK-027; no se asignan valores técnicos todavía no concretados.

## Tareas técnicas asociadas

La siguiente tarea de `requirements-analyst` está aprobada para registro documental. TASK-027 sustituye la etiqueta local P11-A. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas

- La representación en décimas enteras ya está elegida. Concretar el rango entero exacto y límites de cantidades, precios, multiplicaciones, sumas y tamaño de solicitud/documento; justificar valores y rechazos, sin máximos comerciales arbitrarios. La validación autoritativa al registrar corresponde a US-013.
- Acordar el contrato de selección de US-010 y su intercambio con la revisión de US-012. No se exige implementar US-012 para construir los cálculos contra un contrato acordado; la comprobación conjunta de cambios concurrentes sí requiere su integración.
- Aplican las condiciones de cierre visual de [US-010](us-010-consultar-seleccionar-productos-venta.md#condiciones-previas-compartidas). Las verificaciones siguientes son futuras, no ejecutadas; no hay pruebas del POS configuradas.

### TASK-027 — Ajustar cantidades y presentar el detalle calculado

- Historia relacionada: [US-011](us-011-ajustar-revisar-venta-en-curso.md).
- Responsabilidad: frontend; opera sobre la selección temporal. La validación del registro no se delega al navegador.
- Descripción y objetivo: permitir ajustar la selección y conocer sus importes antes del cobro.
- Alcance y exclusiones: aumentar, disminuir y escribir cantidades válidas, eliminación explícita, subtotales, total, detalle y selección vacía. Sin descuentos, recargos, impuestos adicionales ni escritura del catálogo o ventas.
- Resultado esperado: detalle e importes coherentes con cada ajuste, sin cambios silenciosos por modificaciones del catálogo.
- Criterios aplicables: CA-01 a CA-07; el tratamiento concurrente de CA-06 se integra con US-012 y el rechazo de registro de CA-07 con US-013.
- Verificación prevista: unitarias de cantidades válidas, cero, negativos, decimales y límites acordados; cálculos con resultados conocidos y precios de un decimal. Recorrido de ajuste, eliminación y eliminación del último producto para verificar detalle, mensaje exacto, BOB 0.0 y registro deshabilitado. Integración para comprobar que no se modifica catálogo ni ventas anteriores y que los cambios del catálogo no se aplican silenciosamente.
- Dependencias: TASK-026 de US-010, contratos y límites de las condiciones previas; TASK-028/TASK-029 de US-012 para la comprobación conjunta de revisión, no para construir las operaciones numéricas.
