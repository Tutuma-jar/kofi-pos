# US-008 — Administrar categorías

## Descripción

Como operador, quiero crear, editar y eliminar categorías vacías, para organizar el menú.

## Objetivo

Mantener las categorías del catálogo sin dejar productos sin la categoría que les corresponde.

## Alcance

- Módulo: Administración del menú, según el [producto](../ai-context/product.md#33-administración-del-menú). Esta historia organiza el catálogo; no selecciona productos para vender, prepara ventas en curso, cobra ni registra ventas.
- Incluye: creación, edición y eliminación de categorías sin productos asociados; nombres únicos y protección de cambios simultáneos sobre la misma categoría.
- Excluye: eliminación de categorías con productos, reasignación automática, múltiples categorías por producto y jerarquías de categorías.
- La comparación de nombres fue aprobada expresamente: ignorar mayúsculas y espacios extremos, conservando diferencias de acentos. No se adopta por suposición ni se amplía a otras equivalencias.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Las categorías creadas están disponibles para asignar productos. |
| CA-02 | Se rechazan nombres de categoría duplicados, ignorando mayúsculas y espacios extremos y conservando diferencias de acentos. |
| CA-03 | Al editar una categoría se conservan sus asociaciones con productos. |
| CA-04 | Solo se permite eliminar una categoría si no tiene productos asociados, incluidos los desactivados. Si tiene productos, se rechaza la eliminación sin alterar sus asociaciones. |
| CA-05 | Los cambios simultáneos sobre una misma versión de la misma categoría respetan la regla de concurrencia de US-007: primer guardado válido, rechazo del obsoleto y mensaje de conflicto. |
| CA-06 | El nombre tiene de 1 a 80 caracteres tras quitar espacios extremos; se rechaza vacío, solo espacios o fuera de rango, tanto al crear como al editar. |

### Verificación prevista de los criterios

- CA-01 a CA-04: integración de mantenimiento de categorías y asignación de productos; cubrir nombres duplicados, renombrado con asociaciones, eliminación de categoría vacía y rechazo cuando tiene productos activos o desactivados. Incluir asignación y eliminación concurrentes para comprobar que no queden productos sin categoría.
- CA-05: aplicar a categorías el recorrido de dos sesiones de US-007 y comprobar rechazo sin sobrescritura; no repetir la verificación de productos si su evidencia sigue vigente.
- CA-02 y CA-06: incluir altas/renombrados simultáneos, diferencias de mayúsculas/espacios extremos y acentos, conservación del propio nombre, extremos de longitud y valores inmediatamente fuera de rango. Concretar unidad de caracteres junto con US-006. Verificar rechazo en API e interfaz sin persistir una operación inválida.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): sesiones simultáneas.
- [US-006 — Registrar productos](us-006-registrar-productos.md) y [US-007 — Editar productos](us-007-editar-productos.md): cada producto tiene exactamente una categoría y se protege la concurrencia.
- [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): los desactivados conservan su categoría y también impiden eliminarla.
- La comparación y longitud ya están aprobadas. Concretar su implementación y las transacciones/contador de asociaciones según la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), sin perder integridad ante carreras de asignación y eliminación.

## Aprobación

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó tareas técnicas.

La corrección autorizada por el responsable en esta conversación del 2026-10-18 explicita su pertenencia exclusiva a Administración del menú, sin cambiar las reglas ni los criterios de categorías.

Por solicitud explícita posterior del responsable el mismo día, esta historia pasa de US-009 a US-008, sin cambiar sus criterios ni tareas; las referencias usan la numeración vigente.

Posteriormente, el responsable respondió «si» el 2026-10-18 a aprobar las ocho propuestas de tareas de Administración del menú y autorizar asignarles IDs y registrarlas como pendientes, sin implementar. Esta aprobación incluye TASK-020 y TASK-021 y conserva las condiciones técnicas previas; no autoriza comenzar su implementación.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y su registro: comparación de nombres, longitud y protección transaccional de asociaciones. Se concreta CA-02 y se añade CA-06 y su cobertura en las tareas existentes, sin implementación, instalaciones ni cambios de estado.

## Tareas técnicas asociadas

Las siguientes tareas fueron aprobadas para su registro. TASK-020 sustituye la etiqueta local `MENU-CAT-BE` y TASK-021 sustituye `MENU-CAT-FE`. Su estado se consulta únicamente en el [tracker](../progress/tracker.md); la aprobación no autoriza implementación.

### Condiciones previas y verificación futura

- Comparación y longitud ya están decididas. Concretar unidad de caracteres y contratos de creación, consulta, edición, eliminación y conflicto sobre índices únicos, versión optimista y transacciones/contador aprobados en arquitectura. El contador incluye inactivos y no es inventario; la protección no bloquea globalmente categorías o ventas independientes.
- Disponer de estructuras y ejecución autorizadas sobre la base elegida, incluido MongoDB compatible con transacciones. Las herramientas no están instaladas ni tienen comandos del POS; no se crean tareas fundacionales ni endpoints implícitos.
- La creación y consulta de categorías puede habilitar la categoría inicial de US-006 sin depender de que exista la historia completa de productos. La eliminación protegida requiere primero el contrato de referencias y luego la integración con asignación de US-006/US-007 y productos inactivos de US-009; esta secuencia evita un ciclo entre las historias.
- Ambas tareas se vinculan al [plan de CA-01 a CA-06](#verificación-prevista-de-los-criterios), sin duplicarlo. El principal concretará casos y comandos según [documentación §7](../ai-context/documentation.md#7-procedimiento-de-testing), atendiendo a unicidad concurrente e integridad de asociaciones; el hook ejecutará las comprobaciones rápidas disponibles. No se ejecutan pruebas ni se añade una tarea genérica de QA.
- Solo al autorizar el futuro diseño o implementación de la página React se aplicará el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices. No se ejecutan revisiones ahora.

### TASK-020 — Mantener categorías y proteger sus asociaciones

- Historia relacionada: [US-008 — Administrar categorías](us-008-administrar-categorias.md).
- Responsabilidad: backend y persistencia de categorías y sus referencias.
- Descripción y objetivo: crear, consultar, renombrar y eliminar categorías vacías sin duplicar nombres, perder asociaciones ni sobrescribir cambios de otra sesión.
- Alcance y exclusiones: disponibilidad para asignación, unicidad en altas y cambios simultáneos según la comparación acordada, identidad de categoría conservada al editar y eliminación solo sin productos asociados, incluidos inactivos. Aplicar primer guardado válido sobre una misma versión de categoría y preservar referencias ante eliminación/asignación concurrentes, sin bloquear categorías distintas. Excluye reasignación automática, múltiples categorías, jerarquías y operaciones de ventas.
- Resultado esperado: una categoría creada puede consultarse para asignarla; renombrarla conserva sus productos. Los duplicados y cambios obsoletos se rechazan; una categoría con cualquier producto asociado no se elimina. La concurrencia entre asignación y eliminación no deja productos sin categoría ni referencias a una categoría eliminada.
- Criterios de aceptación aplicables: CA-01, disponibilidad backend para asignación; CA-02, unicidad según comparación aprobada; CA-03 y CA-04, integridad de asociaciones y eliminación; CA-05, primer guardado válido y conflicto comunicable; CA-06, validación autoritativa del nombre. La asignación visible y el mensaje al operador se completan en los consumidores frontend correspondientes.
- Dependencias: decisiones y contrato de referencias anteriores; estructura backend y [US-001, TASK-003](us-001-iniciar-sesion.md#task-003--proteger-operaciones). El contrato de concurrencia de [US-007](us-007-editar-productos.md#regla-compartida-de-concurrencia) es previo, no su implementación completa. Creación/consulta no esperan TASK-016; la comprobación integrada de asociaciones y eliminación necesita después [TASK-016](us-006-registrar-productos.md#task-016--registrar-y-consultar-productos-con-datos-válidos), [TASK-018](us-007-editar-productos.md#task-018--actualizar-el-producto-preservando-identidad-e-integridad) para reasignación y [TASK-022](us-009-desactivar-reactivar-productos.md#task-022--cambiar-la-activación-sin-perder-datos-ni-cambios-concurrentes) para asociaciones de inactivos. Son dependencias de integración, no requisitos para iniciar el mantenimiento de categorías.

### TASK-021 — Administrar categorías y comunicar restricciones

- Historia relacionada: [US-008 — Administrar categorías](us-008-administrar-categorias.md).
- Responsabilidad: frontend React con TypeScript.
- Descripción y objetivo: permitir crear, editar y eliminar categorías vacías, mostrando los datos persistidos y los rechazos que protegen nombres y asociaciones.
- Alcance y exclusiones: mantenimiento y consulta administrativa de categorías, comunicación de duplicados, rechazo de eliminación con productos y conflicto por versión obsoleta. No decide disposición, confirmaciones o recuperaciones no acordadas; no reasigna productos automáticamente, crea jerarquías ni implementa la asignación dentro de otras historias.
- Resultado esperado: las categorías guardadas se muestran con sus datos vigentes; una operación rechazada no se presenta como exitosa y el conflicto se comunica al operador. La interfaz no impone un bloqueo sobre todas las categorías para proteger una sola.
- Criterios de aceptación aplicables: CA-01, consulta frontend de la categoría creada, con asignación efectiva completada por TASK-017/TASK-019; CA-02, comunicación de duplicados; CA-03, presentación del renombrado sin alterar asociaciones; CA-04, comunicación del resultado de eliminación; CA-05, mensaje de conflicto y respeto del rechazo; CA-06, validación de entrada y comunicación de rechazo. La integridad se sostiene en TASK-020.
- Dependencias: contratos anteriores, TASK-020, estructura frontend y [US-001, TASK-005](us-001-iniciar-sesion.md#task-005--mantener-la-pestaña-autorizada-y-proteger-pantallas). No requiere completar productos para comenzar esta interfaz; la verificación integrada de CA-01/CA-03/CA-04 se completa con [TASK-017](us-006-registrar-productos.md#task-017--completar-el-registro-y-la-consulta-administrativa), [TASK-019](us-007-editar-productos.md#task-019--editar-datos-y-comunicar-rechazos-y-conflictos) y el estado inactivo aportado por US-009, sin añadir su funcionalidad a esta tarea.
