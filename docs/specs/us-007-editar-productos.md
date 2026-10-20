# US-007 — Editar productos

## Descripción

Como operador, quiero modificar la información de un producto, para mantener actualizado el catálogo.

## Objetivo

Actualizar el catálogo sin perder la identidad de los productos, alterar ventas anteriores ni sobrescribir cambios de otra sesión.

## Alcance

- Módulo: Administración del menú. La conservación de datos históricos es una regla de integridad frente a cambios del catálogo, no una operación de ventas en este módulo.
- Incluye: edición de nombre, descripción, precio, categoría e imagen; protección ante ediciones simultáneas y conservación de referencias históricas.
- Excluye: consultar o seleccionar productos para vender, preparar ventas en curso, cobrar, registrar o cambiar ventas, bloqueos globales del catálogo, stock y eliminación definitiva.
- Los contratos detallados siguen pendientes; versión optimista, índices y persistencia se seleccionaron en la [base técnica aprobada](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), sin implementación.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El operador puede cambiar nombre, descripción, precio, categoría e imagen del producto, y también quitar la imagen para volver al marcador neutro. Al guardar se muestran los datos actualizados y se conserva la identidad del producto. |
| CA-02 | La edición cumple las reglas de campos obligatorios, exactamente una categoría, unicidad del nombre, precio e imagen de US-006. Conservar el nombre del propio producto no se considera un duplicado. |
| CA-03 | Si dos sesiones modifican la misma versión del mismo producto, solo el primer guardado válido se aplica. El siguiente se rechaza sin sobrescribir el cambio guardado, con el mensaje y la recarga de la [regla compartida](#regla-compartida-de-concurrencia). |
| CA-04 | La protección de CA-03 no bloquea modificaciones sobre productos distintos ni ventas independientes. |
| CA-05 | Las ventas anteriores conservan nombre, precio unitario, cantidades e importes registrados al vender, aunque se edite el producto. El Dashboard mantiene la agrupación por identidad del producto y muestra su nombre actual. |
| CA-06 | Si falla la carga de una imagen nueva, se conserva la imagen anterior y el producto no cambia; se muestra un mensaje de error y el operador puede reintentar. |

### Regla compartida de concurrencia

La prioridad corresponde al primer guardado válido sobre una misma versión, no a la sesión que abrió primero la edición. La misma protección se aplica al cambiar la activación del producto en US-009 y al modificar una misma categoría en US-008; una edición no puede sobrescribir una desactivación concurrente ni a la inversa.

Al rechazar un guardado obsoleto se muestra «Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.» (en categorías, «Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.»), se carga la versión vigente y se descartan los cambios no guardados. Esto no define la atomicidad o prevención de duplicados del registro de ventas, que requiere su propia especificación.

### Verificación prevista de los criterios

- CA-01 y CA-02: integración de edición y consulta conservando identidad y aplicando las validaciones de US-006, incluidos nombres que colisionan con otro producto y conservación del propio nombre.
- CA-01 y CA-06: quitar la imagen y comprobar el marcador; simular un fallo de carga de imagen nueva y comprobar que se conservan imagen y datos anteriores, el mensaje de error y el reintento.
- CA-03 y CA-04: integración con dos sesiones editando una misma versión; comprobar un único guardado válido, rechazo del obsoleto, mensaje exacto de conflicto y recarga de la versión vigente. Contrastar con modificaciones independientes, sin imponer un bloqueo global.
- CA-05: integración futura entre catálogo, ventas, Dashboard e historial con ventas anteriores a un cambio de nombre/precio; comprobar datos históricos intactos y una sola agrupación del producto con su nombre actual.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): sesiones simultáneas.
- [US-006 — Registrar productos](us-006-registrar-productos.md): reglas de los datos editables.
- [Producto: administración del menú](../ai-context/product.md#33-administración-del-menú): límites del mantenimiento del catálogo. El tratamiento de una venta en curso ante cambios de precio corresponde a [US-012](us-012-revisar-cambios-catalogo-antes-cobro.md), no a esta historia.
- [US-008 — Administrar categorías](us-008-administrar-categorias.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): protección compartida ante cambios concurrentes.
- [US-004 — Consultar los productos vendidos](us-004-consultar-productos-vendidos.md), [US-013](us-013-registrar-venta-pagada.md), [US-015 — Consultar el detalle de una venta](us-015-consultar-detalle-venta.md) y [US-017 — Identificar los productos más vendidos](us-017-identificar-productos-mas-vendidos.md): identidad estable, snapshots y nombre en agregaciones. Antes de implementar deben concretarse sus contratos de integración.

## Aprobación

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó tareas técnicas.

La corrección autorizada por el responsable en esta conversación del 2026-10-18 delimita esta historia a Administración del menú y elimina su dependencia de la antigua historia de consulta y selección para vender. Se conservan concurrencia, identidad y protección de datos históricos; no se define el flujo de ventas.

Por solicitud explícita posterior del responsable el mismo día, esta historia pasa de US-008 a US-007, sin cambiar sus criterios ni tareas; las referencias usan la numeración vigente.

Posteriormente, el responsable respondió «si» el 2026-10-18 a aprobar las ocho propuestas de tareas de Administración del menú y autorizar asignarles IDs y registrarlas como pendientes, sin implementar. Esta aprobación incluye TASK-018 y TASK-019 y conserva las condiciones técnicas previas; no autoriza comenzar su implementación.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-018 se amplía con la conexión en `frontend/src/menu/api/` y la verificación integrada; TASK-019 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

El 2026-10-19 el responsable respondió «estoy de acuerdo» a las respuestas sugeridas por el principal a las preguntas abiertas del menú, tras el análisis de `requirements-analyst`. En esta historia CA-01 permite quitar la imagen, se añade CA-06 (fallo de imagen nueva), la regla compartida fija mensaje y recarga ante conflicto y las referencias históricas enlazan US-015 y US-017. No autoriza implementación ni cambios en el tracker.

## Tareas técnicas asociadas

Las siguientes tareas fueron aprobadas para su registro. TASK-018 sustituyó la etiqueta local `MENU-EDIT-BE`; TASK-019 (`MENU-EDIT-FE`) se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md); la aprobación no autoriza implementación.

### Condiciones previas y verificación futura

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Aplicar las restricciones de campos/imágenes ya aprobadas en US-006 también a la edición, con pruebas de fronteras y rechazo según CA-02. Concretar unidades y contratos de lectura/escritura/imagen y conflicto sobre identidad estable y versión optimista compartida con activación de US-009; índices y transacciones protegen unicidad y referencias.
- Disponer de estructuras y ejecución autorizadas sobre la base elegida. Las herramientas no están instaladas ni tienen comandos del POS; no se agregan tareas fundacionales. El almacenamiento y seguridad de imágenes están elegidos en arquitectura; el comportamiento ante fallos está aprobado en CA-06 y falta concretar el flujo técnico de reemplazo y asociación que lo garantice.
- Acordar el contrato de identidad y datos históricos con [US-013 CA-02](us-013-registrar-venta-pagada.md#criterios-de-aceptación) y de identidad/nombre actual con [US-004 CA-02 y CA-06](us-004-consultar-productos-vendidos.md#criterios-de-aceptación). El catálogo puede conservar identidad y no modificar ventas, pero eso no certifica por sí solo CA-05 ni la independencia respecto de ventas de CA-04. Su comprobación completa requiere la futura integración con esas historias y con [US-015](us-015-consultar-detalle-venta.md) y [US-017](us-017-identificar-productos-mas-vendidos.md); no se implementan ventas, Dashboard ni reportes aquí.
- Ambas tareas remiten al [plan existente de CA-01 a CA-06](#verificación-prevista-de-los-criterios), sin duplicarlo. El principal concretará casos y comandos conforme a [documentación §7](../ai-context/documentation.md#7-procedimiento-de-testing); el hook ejecutará las comprobaciones rápidas disponibles. No hay pruebas ejecutadas ni tarea genérica de QA en esta descomposición.
- Las revisiones del [sistema de diseño](../ai-context/design-system.md), Impeccable → Emil → React Best Practices, corresponden solo al futuro diseño o implementación autorizados de la página React; no se ejecutan ahora.

### TASK-018 — Actualizar el producto preservando identidad e integridad e integrar la edición

- Historia relacionada: [US-007 — Editar productos](us-007-editar-productos.md).
- Responsabilidad: backend y persistencia del catálogo, incluido su contrato con consumidores históricos.
- Descripción y objetivo: actualizar los datos editables de un producto existente manteniendo su identidad, las reglas de registro y el primer guardado válido de una misma versión.
- Alcance y exclusiones: nombre, descripción, precio, categoría e imagen; reutilizar las reglas de US-006, aceptar el nombre propio sin falso duplicado y proteger la unicidad frente a altas y renombrados simultáneos. Preservar referencias de categoría ante asignación/eliminación concurrentes. Compartir el control del mismo producto con activación, sin bloqueos globales ni escrituras sobre ventas anteriores. Excluye eliminación definitiva, cobro, registro de ventas, agregaciones y detalle histórico. Conecta la edición de Frontend en `frontend/src/menu/api/` y verifica que se muestran los datos guardados del mismo producto y que entradas inválidas y guardados obsoletos se comunican como rechazados.
- Resultado esperado: la consulta devuelve los datos actualizados bajo la misma identidad; una modificación inválida o de versión obsoleta no sobrescribe lo guardado y el conflicto es comunicable al frontend. Cambiar productos distintos no queda bloqueado por este control. El contrato mantiene identidad y nombre actual disponibles para US-004, sin recalcular ni sustituir datos históricos de US-013.
- Criterios de aceptación aplicables: CA-01 (datos mostrados, P) y CA-02; CA-03, admisión del primer guardado válido, rechazo del obsoleto y mensaje de conflicto (P); CA-04, aislamiento del control por producto y ausencia de bloqueo global en la interfaz; CA-05, contribución del catálogo mediante identidad estable y ausencia de alteración histórica, no certificación integral del Dashboard o historial; CA-06, conservación ante fallo de imagen, mensaje y reintento (P).
- Dependencias: condiciones anteriores; [TASK-016 de US-006](us-006-registrar-productos.md#task-016--registrar-y-consultar-productos-e-integrar-su-administración) para datos y reglas del producto; [TASK-020 de US-008](us-008-administrar-categorias.md#task-020--mantener-categorías-proteger-sus-asociaciones-e-integrar-su-administración) para consulta y contrato de asignación/eliminación; [US-001, TASK-003](us-001-iniciar-sesion.md#task-003--proteger-operaciones). Acordar con TASK-022 de US-009 el control compartido antes de implementar; comprobar edición frente a activación cuando ambas operaciones existan, sin exigir completar US-009 para iniciar edición. CA-05 completo depende de US-013 CA-02, US-004 CA-02/CA-06, US-015 y US-017, no de añadir aquí tareas de esos módulos. Para conectar, [registro de entrega de interfaz de Administración del menú](us-006-registrar-productos.md#interfaz--administración-del-menú-registro-de-entrega).

### Tareas retiradas

- TASK-019 — Editar datos y comunicar rechazos y conflictos — Retirada el 2026-10-19; cobertura en TASK-018. La interfaz la implementa Frontend sin tareas.
