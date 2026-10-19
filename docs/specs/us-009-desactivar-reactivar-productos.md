# US-009 — Desactivar y reactivar productos

## Descripción

Como operador, quiero desactivar y reactivar productos, para controlar cuáles se ofrecen sin eliminarlos.

## Objetivo

Retirar y volver a ofrecer productos conservando su información y sus referencias históricas, sin relacionarlo con existencias.

## Alcance

- Módulo: Administración del menú. Se mantiene el estado del producto en el catálogo; no se opera una venta desde esta historia.
- Incluye: desactivación y reactivación, consulta en administración y protección ante cambios simultáneos del mismo producto.
- Excluye: consultar o seleccionar productos para vender, preparar o revisar ventas en curso, cobrar o registrar ventas, eliminación definitiva, control de disponibilidad por stock y programación de activación.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El operador puede desactivar un producto; al guardar, queda inactivo en el catálogo y se muestra ese estado en administración. |
| CA-02 | El producto desactivado sigue accesible en administración y conserva sus datos, categoría e identidad. |
| CA-03 | El operador puede reactivar un producto; al guardar, vuelve a quedar activo en el catálogo y se muestra ese estado en administración, sin tener que registrarlo otra vez. |
| CA-04 | No existe eliminación definitiva de productos. |
| CA-05 | Los cambios de activación respetan la regla de concurrencia de US-007, también frente a una edición simultánea del mismo producto. |

### Verificación prevista de los criterios

- CA-01 a CA-04: integración de administración y consulta del catálogo durante desactivación y reactivación; comprobar estados guardados y mostrados, conservación de datos e identidad y ausencia de eliminación definitiva. No requiere seleccionar productos ni preparar una venta.
- CA-05: integración con dos sesiones cambiando la misma versión, incluidos edición frente a desactivación y cambios de activación entre sí; comprobar que el segundo guardado obsoleto se rechaza sin sobrescribir el primero.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): sesiones simultáneas.
- [Producto: administración del menú](../ai-context/product.md#33-administración-del-menú) y [US-010](us-010-consultar-seleccionar-productos-venta.md)/[US-012](us-012-revisar-cambios-catalogo-antes-cobro.md): solo activos para nuevas selecciones; las revisiones confirmadas se respetan según sus reglas. Ese consumo y revisión se verifican en Ventas, no como operaciones de Administración del menú.
- [US-006 — Registrar productos](us-006-registrar-productos.md): datos e identidad conservados; estado activo al registrar aprobado posteriormente en CA-06, sin implementar.
- [US-007 — Editar productos](us-007-editar-productos.md): protección compartida de concurrencia y conservación de datos originales de ventas anteriores.
- [US-008 — Administrar categorías](us-008-administrar-categorias.md): un producto desactivado continúa asociado a su categoría.
- [US-004 — Consultar los productos vendidos](us-004-consultar-productos-vendidos.md) y futuras especificaciones de ventas e historial: desactivar no elimina referencias ni cambia unidades o ingresos de ventas anteriores.

## Aprobación

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó tareas técnicas.

La corrección autorizada por el responsable en esta conversación del 2026-10-18 delimita CA-01 y CA-03 y su verificación al cambio de estado en el catálogo, elimina la dependencia de la antigua historia de consulta y selección para vender y deja la selección y revisión de ventas para la futura definición de Gestión de ventas. No cambia la regla general de ofrecer solo productos activos ni la protección de referencias históricas.

Por solicitud explícita posterior del responsable el mismo día, esta historia pasa de US-010 a US-009, sin cambiar sus criterios ni tareas; las referencias usan la numeración vigente.

Posteriormente, el responsable respondió «si» el 2026-10-18 a aprobar las ocho propuestas de tareas de Administración del menú y autorizar asignarles IDs y registrarlas como pendientes, sin implementar. Esta aprobación incluye TASK-022 y TASK-023 y conserva las condiciones técnicas previas; no autoriza comenzar su implementación.

## Tareas técnicas asociadas

Las siguientes tareas fueron aprobadas para su registro. TASK-022 sustituye la etiqueta local `MENU-ACT-BE` y TASK-023 sustituye `MENU-ACT-FE`. Su estado se consulta únicamente en el [tracker](../progress/tracker.md); la aprobación no autoriza implementación.

### Condiciones previas y verificación futura

- El estado inicial activo ya está aprobado en US-006. Concretar consulta administrativa, cambio de activación y conflicto sobre versión optimista compartida con edición de US-007, no controles independientes por operación. La [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada) selecciona mecanismos, no los DTO/rutas.
- Disponer de estructuras y ejecución autorizadas sobre la base elegida; las herramientas no están instaladas ni tienen comandos del POS. No se agregan tareas fundacionales.
- Concretar el contrato de identidad estable y conservación histórica con [US-013 CA-02](us-013-registrar-venta-pagada.md#criterios-de-aceptación) y [US-004 CA-02/CA-06](us-004-consultar-productos-vendidos.md#criterios-de-aceptación). Cambiar solo el catálogo no certifica la conservación de ventas o agregaciones: esa integración futura necesita ambos consumidores y el futuro contrato del detalle histórico. No se incorporan aquí registro de ventas, Dashboard ni reportes.
- Ambas tareas remiten al [plan de CA-01 a CA-05](#verificación-prevista-de-los-criterios), sin duplicarlo; la comprobación histórica reutilizará la integración prevista en [US-007 CA-05](us-007-editar-productos.md#verificación-prevista-de-los-criterios), US-013 y US-004 cuando exista. El principal concretará casos y comandos conforme a [documentación §7](../ai-context/documentation.md#7-procedimiento-de-testing); el hook ejecutará las comprobaciones rápidas disponibles. No se ejecutan pruebas ni se crea una tarea genérica de QA.
- Solo en futuro diseño o implementación autorizados de una página React se aplicará el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices. No se ejecutan esas revisiones en esta descomposición.

### TASK-022 — Cambiar la activación sin perder datos ni cambios concurrentes

- Historia relacionada: [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md).
- Responsabilidad: backend y persistencia del estado del producto.
- Descripción y objetivo: desactivar y reactivar el producto existente manteniendo datos, categoría, identidad y acceso administrativo, con la misma protección de concurrencia que la edición.
- Alcance y exclusiones: persistencia y lectura del estado, sin eliminar el producto ni alterar su información o las referencias históricas. Aplicar primer guardado válido de la misma versión tanto entre cambios de estado como frente a edición, sin bloqueos globales. Excluye eliminación definitiva, stock, programación de activación, selección para vender, revisión previa al cobro y registro de ventas.
- Resultado esperado: al desactivar o reactivar se recupera el estado guardado del mismo producto; inactivo sigue siendo consultable en administración y conserva todos sus datos y categoría. No se habilita eliminación definitiva. Un cambio obsoleto, sea edición o activación, se rechaza sin sobrescribir el primero y permite comunicar conflicto; productos distintos permanecen independientes.
- Criterios de aceptación aplicables: CA-01 y CA-03, cambio persistido y lectura del estado; CA-02, conservación y consulta administrativa; CA-04, ausencia de eliminación definitiva en backend; CA-05, control compartido del producto y rechazo de cambios obsoletos. La conservación histórica es una contribución del catálogo pendiente de integración, no una acreditación de ventas o Dashboard.
- Dependencias: condiciones anteriores; [TASK-016 de US-006](us-006-registrar-productos.md#task-016--registrar-y-consultar-productos-con-datos-válidos) para producto e identidad; contrato y control compartidos con [TASK-018 de US-007](us-007-editar-productos.md#task-018--actualizar-el-producto-preservando-identidad-e-integridad), con ambas operaciones disponibles para verificar CA-05 cruzado, sin requerir completar su frontend; [US-001, TASK-003](us-001-iniciar-sesion.md#task-003--proteger-operaciones). Integrar con [TASK-020 de US-008](us-008-administrar-categorias.md#task-020--mantener-categorías-y-proteger-sus-asociaciones) para comprobar que inactivos impiden eliminación de su categoría, sin exigir toda US-008 para iniciar el cambio de estado. La certificación histórica depende de US-013 CA-02, US-004 CA-02/CA-06 y del futuro detalle histórico, no de implementarlos aquí.

### TASK-023 — Desactivar y reactivar desde administración

- Historia relacionada: [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md).
- Responsabilidad: frontend React con TypeScript.
- Descripción y objetivo: permitir cambiar la activación y consultar el estado efectivamente guardado del producto, conservando su acceso administrativo y comunicando conflictos.
- Alcance y exclusiones: interacción de desactivar/reactivar, consulta de activos e inactivos con sus datos, presentación del estado y del rechazo por conflicto. Sin eliminación definitiva, registro de un nuevo producto para reactivarlo, comportamiento de ventas ni controles de stock. No fija filtros, diálogos de confirmación, recuperación automática o disposición visual no aprobados.
- Resultado esperado: el operador desactiva y reactiva el mismo producto, ve su estado persistido y puede seguir consultando sus datos y categoría cuando está inactivo. La interfaz no ofrece eliminación definitiva ni presenta como exitoso un cambio rechazado; muestra el mensaje de conflicto.
- Criterios de aceptación aplicables: CA-01 a CA-03, cobertura frontend de interacción y consulta; CA-04, ausencia de eliminación definitiva en interfaz; CA-05, comunicación de conflicto y respeto del rechazo del backend. La identidad persistida y el control concurrente corresponden a TASK-022.
- Dependencias: contratos anteriores, TASK-022, estructura frontend y [US-001, TASK-005](us-001-iniciar-sesion.md#task-005--mantener-la-pestaña-autorizada-y-proteger-pantallas). Integrar con [TASK-019](us-007-editar-productos.md#task-019--editar-datos-y-comunicar-rechazos-y-conflictos) cuando esté disponible para el recorrido cruzado de CA-05; no depende de interfaces de selección, cobro o registro de ventas.
