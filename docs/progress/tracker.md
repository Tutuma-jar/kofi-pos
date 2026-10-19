# Kofi — Tracker de historias y tareas

Fuente oficial del estado del trabajo aprobado. Consultar el [formato y las reglas](../ai-context/documentation.md#6-changelog-y-tracker) antes de registrar o completar elementos.

## Historias y tareas

- [ ] US-001 — Iniciar sesión — Pendiente — [Especificación](../specs/us-001-iniciar-sesion.md)
  - [ ] TASK-001 — Validar credenciales e integrar el inicio de sesión — Pendiente
  - [ ] TASK-002 — Gestionar sesiones simultáneas y presencia — Pendiente
  - [ ] TASK-003 — Proteger operaciones — Pendiente
  - [ ] TASK-005 — Mantener la pestaña autorizada y proteger pantallas — Pendiente
- [ ] US-002 — Cerrar sesión — Pendiente — [Especificación](../specs/us-002-cerrar-sesion.md)
  - [ ] TASK-006 — Finalizar manualmente la sesión e integrar el cierre — Pendiente
- [ ] US-003 — Consultar el resumen de ventas — Pendiente — [Especificación](../specs/us-003-consultar-resumen-ventas.md)
  - [ ] TASK-008 — Obtener e integrar el resumen del período — Pendiente
  - [ ] TASK-010 — Habilitar e integrar la actualización compartida tras registrar ventas — Pendiente
- [ ] US-004 — Consultar los productos vendidos — Pendiente — [Especificación](../specs/us-004-consultar-productos-vendidos.md)
  - [ ] TASK-012 — Obtener e integrar los productos vendidos y sus resultados históricos — Pendiente
- [ ] US-005 — Identificar las horas con más ventas — Pendiente — [Especificación](../specs/us-005-identificar-horas-mas-ventas.md)
  - [ ] TASK-014 — Obtener e integrar la cantidad de ventas por hora — Pendiente
- [ ] US-006 — Registrar productos — Pendiente — [Especificación](../specs/us-006-registrar-productos.md)
  - [ ] TASK-016 — Registrar y consultar productos e integrar su administración — Pendiente
- [ ] US-007 — Editar productos — Pendiente — [Especificación](../specs/us-007-editar-productos.md)
  - [ ] TASK-018 — Actualizar el producto preservando identidad e integridad e integrar la edición — Pendiente
- [ ] US-008 — Administrar categorías — Pendiente — [Especificación](../specs/us-008-administrar-categorias.md)
  - [ ] TASK-020 — Mantener categorías, proteger sus asociaciones e integrar su administración — Pendiente
- [ ] US-009 — Desactivar y reactivar productos — Pendiente — [Especificación](../specs/us-009-desactivar-reactivar-productos.md)
  - [ ] TASK-022 — Cambiar la activación sin perder datos ni cambios concurrentes e integrarla en administración — Pendiente
- [ ] US-010 — Consultar y seleccionar productos para vender — Pendiente — [Especificación](../specs/us-010-consultar-seleccionar-productos-venta.md)
  - [ ] TASK-024 — Proveer e integrar el catálogo para vender — Pendiente
- [ ] US-011 — Ajustar y revisar la venta en curso — Pendiente — [Especificación](../specs/us-011-ajustar-revisar-venta-en-curso.md)
  - [ ] TASK-027 — Calcular los importes de la venta en curso e integrar su detalle — Pendiente
- [ ] US-012 — Revisar cambios del catálogo antes de cobrar — Pendiente — [Especificación](../specs/us-012-revisar-cambios-catalogo-antes-cobro.md)
  - [ ] TASK-028 — Comprobar y proteger la revisión e integrar su resolución y confirmación — Pendiente
- [ ] US-013 — Registrar la venta después del pago — Pendiente — [Especificación](../specs/us-013-registrar-venta-pagada.md)
  - [ ] TASK-030 — Registrar íntegramente la operación sin duplicados e integrar el registro manual — Pendiente
  - [ ] TASK-031 — Resolver resultados inciertos de la misma operación e integrar su comunicación — Pendiente
- [ ] US-014 — Consultar el historial de ventas por fecha — Pendiente — [Especificación](../specs/us-014-consultar-historial-ventas.md)
  - [ ] TASK-033 — Filtrar y paginar el historial de ventas registradas e integrar la lista — Pendiente
- [ ] US-015 — Consultar el detalle de una venta — Pendiente — [Especificación](../specs/us-015-consultar-detalle-venta.md)
  - [ ] TASK-034 — Obtener el detalle registrado de una venta e integrar su consulta — Pendiente
- [ ] US-016 — Consultar el resumen del período — Pendiente — [Especificación](../specs/us-016-consultar-resumen-periodo.md)
  - [ ] TASK-035 — Calcular el resumen del rango e integrarlo en Historial — Pendiente
- [ ] US-017 — Identificar los productos más vendidos — Pendiente — [Especificación](../specs/us-017-identificar-productos-mas-vendidos.md)
  - [ ] TASK-036 — Calcular el ranking de productos más vendidos del rango e integrarlo en Historial — Pendiente

Las historias vigentes están aprobadas para su registro documental. Desde el 2026-10-19 hay 22 tareas vigentes, todas de backend con integración de la interfaz; Frontend implementa las interfaces sin tareas, según la [constitución](../ai-context/constitution.md#11-etapa-actual), y su avance se registra como entrega de interfaz en las especificaciones. US-006 a US-009 corresponden exclusivamente a Administración del menú, renumeradas por solicitud explícita del responsable el 2026-10-18. US-010 a US-013 corresponden a Gestión de ventas; sus decisiones previas a implementar siguen descritas en sus especificaciones. US-014 a US-017 corresponden a Historial y reportes, aprobadas por el responsable el 2026-10-19 («apruebo»), y sus tareas TASK-033 a TASK-036 el mismo día («Apruebo las tareas TASK-033 a TASK-036»); su interfaz no está autorizada por la constitución. Las definiciones y dependencias se encuentran en las especificaciones enlazadas. El registro no representa funcionalidades implementadas ni autoriza comenzar su implementación.

## Antecedentes retirados del trabajo vigente

- Consultar y seleccionar productos (identificador original US-006) — Retirada por autorización del responsable el 2026-10-18 al separar Administración del menú de Gestión de ventas. No se traslada como historia aprobada de ventas ni se considera completada. Se conserva su [redacción histórica](../specs/antecedente-consultar-seleccionar-productos.md), separada de la US-006 vigente, Registrar productos, tras la renumeración solicitada expresamente por el responsable. Gestión de ventas se definió y aprobó posteriormente como US-010 a US-013; no se reactiva ni se reutiliza el antecedente.
- Tareas frontend TASK-004, TASK-007, TASK-009, TASK-011, TASK-013, TASK-015, TASK-017, TASK-019, TASK-021, TASK-023, TASK-025, TASK-026, TASK-029 y TASK-032 — Retiradas el 2026-10-19 por aprobación del responsable («Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)») al asignar la integración a backend. No se consideran completadas ni se reutilizan sus IDs. Cobertura: 004→001/002, 007→006, 009→008/012, 011→010, 013→012, 015→014, 017→016, 019→018, 021→020, 023→022, 025→024, 026→024 (verificación; implementación de Frontend), 029→028, 032→030/031.
