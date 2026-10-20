# US-015 — Consultar el detalle de una venta

## Descripción

Como operador, quiero consultar el detalle de una venta registrada, para saber exactamente qué se vendió, a qué precio y cómo se pagó.

## Objetivo

Mostrar los datos de una venta tal como se registraron, sin que los cambios posteriores del catálogo los alteren.

## Alcance

- Módulo: Historial y reportes. Se accede desde una fila del historial de [US-014](us-014-consultar-historial-ventas.md).
- Incluye: productos de la venta con nombre, precio unitario, cantidad e importe registrados; total; método de pago; fecha y hora en `America/La_Paz`; estados de carga y error.
- Excluye: modificar, re-registrar, anular, devolver o corregir la venta; imprimir o exportar comprobantes; número visible de venta; datos actuales del catálogo.
- No fija disposición visual: se define en el diseño de la página.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Desde una venta de la lista de US-014 se puede consultar su detalle. |
| CA-02 | Por cada producto se muestran nombre, precio unitario, cantidad e importe tal como se registraron. El nombre es el original de la venta (el vigente en la revisión confirmada, según US-013 CA-02) aunque el producto se haya editado, renombrado o desactivado después; el precio y los importes no se recalculan con el catálogo actual. |
| CA-03 | Se muestran el total, el método de pago (efectivo o QR) y la fecha y hora del registro en `America/La_Paz`, nunca según la zona del navegador. |
| CA-04 | Precios, importes y total se expresan con el [formato de importes de US-003](us-003-consultar-resumen-ventas.md#decisiones-de-presentación-y-medición): `BOB`, un decimal con punto y sin separador de miles. |
| CA-05 | El detalle es de solo lectura: no ofrece acciones para modificar, volver a registrar o anular la venta, y consultarlo no cambia la venta ni los resultados del negocio. |
| CA-06 | Carga y error del detalle se distinguen como en [US-014 CA-08](us-014-consultar-historial-ventas.md#criterios-de-aceptación). Un fallo o una venta no encontrada no se presentan como una venta sin productos. |

### Verificación prevista de los criterios

- CA-01 y CA-03: recorrido desde la lista integrada; contrastar fecha y hora con ventas registradas cerca de medianoche en Bolivia, con el navegador en otra zona horaria.
- CA-02: integración con una venta conocida y, después, renombrado, cambio de precio y desactivación de sus productos (US-007 y US-009); comprobar que el detalle conserva nombre, precio, cantidades e importes originales.
- CA-04: revisión manual del formato con importes enteros y con decimal.
- CA-05: revisión manual de acciones disponibles e integración que compruebe que consultar no modifica el documento de la venta ni los resultados del Dashboard o de US-016.
- CA-06: simular carga, error de lectura y una referencia de venta inexistente.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing). Hoy no hay aplicación ni pruebas del POS configuradas.

## Dependencias relevantes

- [US-014 — Consultar el historial de ventas por fecha](us-014-consultar-historial-ventas.md): acceso al detalle desde la lista y estados.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): snapshots de nombre, precio, cantidades e importes, método y fecha/hora del servidor.
- [US-007 — Editar productos](us-007-editar-productos.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): conservación de los datos históricos. El nombre original solo se muestra aquí; el Dashboard y [US-017](us-017-identificar-productos-mas-vendidos.md) usan el nombre actual.
- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso protegido.

## Aprobación

El 2026-10-19 el responsable del proyecto aprobó esta historia dentro de la atomización de Historial y reportes en cuatro historias: detalle por producto con nombre, precio unitario, cantidad e importe registrados (nombre original aunque luego se edite, renombre o desactive el producto), total, método de pago y fecha y hora en `America/La_Paz`, solo lectura y BOB con un decimal. Autorizó redactar esta especificación con «apruebo».

El 2026-10-19 el responsable respondió «sigue tus sugerencias» a las mejoras de `requirements-analyst`. CA-04 remite al formato de importes de US-003 y CA-02 precisa que el nombre original es el vigente en la revisión confirmada (US-013 CA-02, pregunta P8). La fecha y hora de CA-03 es la del guardado confirmado en el servidor (US-013 CA-02, pregunta P7).

La aprobación corresponde a la historia y sus criterios; su tarea técnica se aprobó por separado el 2026-10-19. Ninguna de las dos autoriza implementación. La interfaz de Historial no está autorizada por la [constitución](../ai-context/constitution.md#11-etapa-actual); su entrega requiere autorización explícita pendiente, como se indica en [US-014](us-014-consultar-historial-ventas.md#aprobación).

## Tareas técnicas asociadas

Tarea de `requirements-analyst` aprobada por el responsable el 2026-10-19 para registro documental; su estado se consulta únicamente en el [tracker](../progress/tracker.md) y el registro no autoriza implementación. Aplican las [condiciones previas compartidas de US-014](us-014-consultar-historial-ventas.md#condiciones-previas-compartidas).

### TASK-034 — Obtener el detalle registrado de una venta e integrar su consulta

- Historia relacionada: [US-015](us-015-consultar-detalle-venta.md).
- Responsabilidad: backend.
- Descripción y objetivo: devolver los datos registrados de una venta identificada desde la lista y conectarlos en la capa de acceso de Historial.
- Alcance y exclusiones: lectura por una referencia de venta no visible como número para el operador; productos con nombre, precio unitario, cantidad e importe de los snapshots; total, método y fecha/hora para presentar en `America/La_Paz`; error distinguible para venta inexistente, sesión inválida y fallo del servidor. Verifica en la página integrada el acceso desde la fila, el formato BOB y los estados. Excluye toda escritura, anulación, corrección, comprobantes y lectura del catálogo actual para resolver nombres o precios.
- Resultado esperado: detalle idéntico a lo registrado, también después de editar, renombrar o desactivar los productos.
- Criterios aplicables: CA-01 (C), CA-02, CA-03, CA-04 (P), CA-05 (P) y CA-06 (P).
- Verificación prevista: la de esta historia.
- Dependencias: TASK-033 (referencia de venta en las filas y lista integrada); TASK-030 de US-013; TASK-018 y TASK-022 de US-007 y US-009 para comprobar la conservación histórica; TASK-003 y TASK-005 de US-001; autorización de la interfaz de Historial y su registro de entrega.

## Entrega de interfaz relacionada

La autorización y entrega frontend posterior del 2026-10-20 se registran en [US-014](us-014-consultar-historial-ventas.md#interfaz--historial-y-reportes-registro-de-entrega). Incluye detalle histórico simulado, carga, error, venta no encontrada, reintento y cierre accesible. No acredita integración ni DoD de esta historia.
