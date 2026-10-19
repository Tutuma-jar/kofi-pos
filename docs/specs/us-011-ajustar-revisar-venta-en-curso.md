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

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-027 se reescribe como tarea backend de reglas de importes y conserva su ID: la regla de cálculo vive en el backend y una copia verificada con las mismas pruebas, mantenida por Backend, vive en `frontend/src/sales/api/` (opción A); TASK-028 y TASK-030 recalculan con autoridad. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Tareas técnicas asociadas

La siguiente tarea de `requirements-analyst` está aprobada para registro documental. TASK-027 sustituyó la etiqueta local P11-A y desde el 2026-10-19 es de backend. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- La representación en décimas enteras ya está elegida. Concretar el rango entero exacto y límites de cantidades, precios, multiplicaciones, sumas y tamaño de solicitud/documento; justificar valores y rechazos, sin máximos comerciales arbitrarios. La validación autoritativa al registrar corresponde a US-013.
- Acordar el contrato de selección de US-010 y su intercambio con la revisión de US-012. No se exige implementar US-012 para construir los cálculos contra un contrato acordado; la comprobación conjunta de cambios concurrentes sí requiere su integración.
- Aplican las condiciones de cierre visual de [US-010](us-010-consultar-seleccionar-productos-venta.md#condiciones-previas-compartidas). Las verificaciones siguientes son futuras, no ejecutadas; no hay pruebas del POS configuradas.

### TASK-027 — Calcular los importes de la venta en curso e integrar su detalle

- Historia relacionada: [US-011](us-011-ajustar-revisar-venta-en-curso.md).
- Responsabilidad: backend (reglas de importes). La validación del registro no se delega al navegador.
- Descripción y objetivo: definir los límites técnicos y el contrato de cantidades e importes, implementar una única regla de cálculo en décimas de BOB, reutilizada por TASK-028 y TASK-030, y proveerla a la interfaz como copia verificada en `frontend/src/sales/api/`, para que subtotales y total sean exactos y se recalculen con cada ajuste.
- Alcance y exclusiones: justificar y aprobar los valores de CA-07; sustituir el cálculo simulado de Frontend por la copia verificada con las mismas pruebas que la regla del backend; verificación unitaria e integrada. La entrada de cantidades, la eliminación y la selección vacía son interfaz de Frontend. Sin descuentos, recargos, impuestos adicionales ni escritura del catálogo o ventas.
- Resultado esperado: el detalle integrado coincide con resultados de referencia en cada ajuste, rechaza lo que está fuera de rango y no aplica silenciosamente cambios del catálogo.
- Criterios aplicables: CA-01 y CA-02 (C), CA-03, CA-04 (P), CA-05 (P), CA-06 (con TASK-028) y CA-07; el rechazo de registro de CA-07 se integra con US-013.
- Verificación prevista: unitarias de la regla y de su copia con cantidades válidas, cero, negativos, decimales y límites acordados; cálculos con resultados conocidos y precios de un decimal. Recorrido integrado de ajuste, eliminación y eliminación del último producto para verificar detalle, mensaje exacto, BOB 0.0 y registro deshabilitado. Integración para comprobar que no se modifica catálogo ni ventas anteriores y que los cambios del catálogo no se aplican silenciosamente.
- Dependencias: contratos y límites de las condiciones previas; TASK-024 de US-010; registro de entrega de la venta en curso; TASK-028 de US-012 para CA-06, no para construir las operaciones numéricas.

