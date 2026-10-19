# Kofi — Tracker de historias y tareas

Fuente oficial del estado del trabajo aprobado. Consultar el [formato y las reglas](../ai-context/documentation.md#6-changelog-y-tracker) antes de registrar o completar elementos.

## Historias y tareas

- [ ] US-001 — Iniciar sesión — Pendiente — [Especificación](../specs/us-001-iniciar-sesion.md)
  - [ ] TASK-001 — Validar credenciales — Pendiente
  - [ ] TASK-002 — Gestionar sesiones simultáneas y presencia — Pendiente
  - [ ] TASK-003 — Proteger operaciones — Pendiente
  - [ ] TASK-004 — Completar el inicio de sesión — Pendiente
  - [ ] TASK-005 — Mantener la pestaña autorizada y proteger pantallas — Pendiente
- [ ] US-002 — Cerrar sesión — Pendiente — [Especificación](../specs/us-002-cerrar-sesion.md)
  - [ ] TASK-006 — Finalizar manualmente la sesión — Pendiente
  - [ ] TASK-007 — Integrar cierre en el menú compartido — Pendiente
- [ ] US-003 — Consultar el resumen de ventas — Pendiente — [Especificación](../specs/us-003-consultar-resumen-ventas.md)
  - [ ] TASK-008 — Obtener el resumen del período — Pendiente
  - [ ] TASK-009 — Presentar el resumen y el marco común del Dashboard — Pendiente
  - [ ] TASK-010 — Habilitar la actualización compartida tras registrar ventas — Pendiente
  - [ ] TASK-011 — Consumir una actualización común sin recargar — Pendiente
- [ ] US-004 — Consultar los productos vendidos — Pendiente — [Especificación](../specs/us-004-consultar-productos-vendidos.md)
  - [ ] TASK-012 — Obtener productos vendidos y sus resultados históricos — Pendiente
  - [ ] TASK-013 — Presentar e integrar la lista completa de productos vendidos — Pendiente
- [ ] US-005 — Identificar las horas con más ventas — Pendiente — [Especificación](../specs/us-005-identificar-horas-mas-ventas.md)
  - [ ] TASK-014 — Obtener la cantidad de ventas por hora — Pendiente
  - [ ] TASK-015 — Presentar e integrar el gráfico horario — Pendiente
- [ ] US-006 — Registrar productos — Pendiente — [Especificación](../specs/us-006-registrar-productos.md)
  - [ ] TASK-016 — Registrar y consultar productos con datos válidos — Pendiente
  - [ ] TASK-017 — Completar el registro y la consulta administrativa — Pendiente
- [ ] US-007 — Editar productos — Pendiente — [Especificación](../specs/us-007-editar-productos.md)
  - [ ] TASK-018 — Actualizar el producto preservando identidad e integridad — Pendiente
  - [ ] TASK-019 — Editar datos y comunicar rechazos y conflictos — Pendiente
- [ ] US-008 — Administrar categorías — Pendiente — [Especificación](../specs/us-008-administrar-categorias.md)
  - [ ] TASK-020 — Mantener categorías y proteger sus asociaciones — Pendiente
  - [ ] TASK-021 — Administrar categorías y comunicar restricciones — Pendiente
- [ ] US-009 — Desactivar y reactivar productos — Pendiente — [Especificación](../specs/us-009-desactivar-reactivar-productos.md)
  - [ ] TASK-022 — Cambiar la activación sin perder datos ni cambios concurrentes — Pendiente
  - [ ] TASK-023 — Desactivar y reactivar desde administración — Pendiente
- [ ] US-010 — Consultar y seleccionar productos para vender — Pendiente — [Especificación](../specs/us-010-consultar-seleccionar-productos-venta.md)
  - [ ] TASK-024 — Proveer el catálogo para seleccionar productos — Pendiente
  - [ ] TASK-025 — Presentar el catálogo para vender — Pendiente
  - [ ] TASK-026 — Mantener la selección temporal independiente por pestaña — Pendiente
- [ ] US-011 — Ajustar y revisar la venta en curso — Pendiente — [Especificación](../specs/us-011-ajustar-revisar-venta-en-curso.md)
  - [ ] TASK-027 — Ajustar cantidades y presentar el detalle calculado — Pendiente
- [ ] US-012 — Revisar cambios del catálogo antes de cobrar — Pendiente — [Especificación](../specs/us-012-revisar-cambios-catalogo-antes-cobro.md)
  - [ ] TASK-028 — Comprobar y proteger la revisión frente al catálogo concurrente — Pendiente
  - [ ] TASK-029 — Guiar la resolución y confirmación explícita de la revisión — Pendiente
- [ ] US-013 — Registrar la venta después del pago — Pendiente — [Especificación](../specs/us-013-registrar-venta-pagada.md)
  - [ ] TASK-030 — Registrar íntegramente la operación sin duplicados — Pendiente
  - [ ] TASK-031 — Resolver resultados inciertos de la misma operación — Pendiente
  - [ ] TASK-032 — Completar el registro manual y comunicar su resultado — Pendiente

Las historias vigentes están aprobadas para su registro documental. US-001 y US-002 tienen siete tareas técnicas aprobadas; US-003 a US-005 tienen ocho tareas técnicas aprobadas; US-006 a US-009 tienen ocho tareas técnicas aprobadas; US-010 a US-013 tienen nueve tareas técnicas aprobadas. US-006 a US-009 corresponden exclusivamente a Administración del menú, renumeradas por solicitud explícita del responsable el 2026-10-18. US-010 a US-013 corresponden a Gestión de ventas, aprobadas por el responsable en esta conversación del 2026-10-18; el registro de sus tareas se aprobó posteriormente el mismo día, sin resolver las decisiones previas a implementar descritas en sus especificaciones. Historial y reportes todavía no tiene historias ni atomización aprobadas. Las definiciones y dependencias se encuentran en las especificaciones enlazadas. El registro no representa funcionalidades implementadas ni autoriza comenzar su implementación.

## Antecedentes retirados del trabajo vigente

- Consultar y seleccionar productos (identificador original US-006) — Retirada por autorización del responsable el 2026-10-18 al separar Administración del menú de Gestión de ventas. No se traslada como historia aprobada de ventas ni se considera completada. Se conserva su [redacción histórica](../specs/antecedente-consultar-seleccionar-productos.md), separada de la US-006 vigente, Registrar productos, tras la renumeración solicitada expresamente por el responsable. Gestión de ventas se definió y aprobó posteriormente como US-010 a US-013; no se reactiva ni se reutiliza el antecedente.
