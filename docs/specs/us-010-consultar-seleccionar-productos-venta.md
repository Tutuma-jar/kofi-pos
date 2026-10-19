# US-010 — Consultar y seleccionar productos para vender

## Descripción

Como operador, quiero consultar los productos activos por categoría y seleccionarlos, para preparar una venta.

## Objetivo

Elegir los productos que se venderán sin confundir la preparación con una venta registrada ni con la administración del catálogo.

## Alcance

- Módulo: Gestión de ventas.
- Incluye: consulta por categoría, datos para elegir productos activos y selección de varios productos en una venta en curso.
- Excluye: administrar el catálogo, registrar ventas, pedidos independientes, existencias y borradores persistentes.
- La selección es independiente por pestaña autenticada, conforme a US-001; no se comparte entre computadoras.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El operador puede consultar productos activos por categoría; los inactivos no se ofrecen para nuevas selecciones. |
| CA-02 | Para elegir se muestran nombre, precio en BOB con un decimal e imagen o marcador neutro. La descripción está disponible al consultar el producto, sin exigir que aparezca en cada tarjeta. |
| CA-03 | Se pueden agregar varios productos activos a la venta en curso. Volver a seleccionar el mismo producto suma una unidad a su cantidad. |
| CA-04 | La selección se conserva al navegar entre módulos dentro de la misma pestaña. Es independiente de otras pestañas autenticadas y no genera ventas ni ingresos en el Dashboard. |
| CA-05 | Recargar, cerrar la pestaña o cerrar sesión descarta la selección; no se recupera al volver. Se advierte cuando una salida vaya a descartarla, cuando el navegador lo permita; no se promete que el navegador siempre muestre el aviso. Recargar puede conservar la sesión de acceso según US-001, pero no la selección. |

### Verificación prevista de los criterios

- CA-01 a CA-03: integración de consulta con categorías, productos activos e inactivos y productos con y sin imagen; recorrido de selección de productos distintos y repetidos.
- CA-04: recorrido entre módulos y con dos pestañas autenticadas independientemente; contrastar sus selecciones y comprobar que no se registran ventas ni cambian las métricas por seleccionar.
- CA-05: recorrido en navegador real para navegación, recarga, cierre de pestaña y cierre de sesión; comprobar descarte y comportamiento del aviso bajo las restricciones del navegador. El navegador real es necesario para verificar estos eventos.

Estas verificaciones están previstas, no ejecutadas. Hoy no hay aplicación ni comandos de pruebas del POS; antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing).

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md) y [US-002 — Cerrar sesión](us-002-cerrar-sesion.md): autorización y ciclo de vida por pestaña.
- [US-006 — Registrar productos](us-006-registrar-productos.md), [US-008 — Administrar categorías](us-008-administrar-categorias.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): catálogo consumido, no administrado aquí.
- [US-011 — Ajustar y revisar la venta en curso](us-011-ajustar-revisar-venta-en-curso.md): cantidades, detalle y cálculos.
- [US-012 — Revisar cambios del catálogo antes de cobrar](us-012-revisar-cambios-catalogo-antes-cobro.md): revisión de productos ya seleccionados.

## Aprobación

El responsable respondió «si apruebo todo» en la conversación del 2026-10-18 a las cuatro historias propuestas con `requirements-analyst` y las siete recomendaciones del principal. Esta historia formaliza la consulta, selección e independencia y descarte por pestaña aprobados. La aprobación autoriza el registro documental, no implementar código ni aprobar tareas técnicas todavía no presentadas.

Posteriormente, el 2026-10-18, el responsable respondió «si» a «¿Apruebas estas nueve tareas para asignarles IDs y registrarlas como pendientes, sin iniciar implementación?». Queda aprobado su registro documental como TASK-024 a TASK-032 en US-010 a US-013. La aprobación no resuelve las decisiones pendientes de revisión/cobro, ajustes posteriores o comprobación de registros inciertos tras salida ni autoriza implementar.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-024 se amplía con la conexión en `frontend/src/sales/api/` y la verificación integrada del catálogo y de la selección; TASK-025 y TASK-026 se retiran porque su interfaz y la selección en memoria las implementa Frontend. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-024 sustituyó la etiqueta local P10-A; TASK-025 (P10-B) y TASK-026 (P10-C) se retiraron el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas compartidas

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Concretar contratos de catálogo/selección sobre Context/reducer y estado en memoria por encima de la navegación, elegidos en la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), sin persistencia ni recuperación de borradores. Coordinar límites numéricos con US-011 y descarte de revisión con US-012; la referencia opaca enviada de US-013 no conserva selección.
- Disponer del catálogo y acceso protegido de US-001/US-002. Las tareas de Administración del menú proveen sus datos; este registro no las recrea ni autoriza tareas fundacionales.
- Las dependencias distinguen construcción e integración: se pueden desarrollar las partes contra contratos aprobados, sin exigir una pantalla finalizada para construir la otra parte.
- Frontend construye la interfaz de Gestión de ventas sin tareas y sigue el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices sobre la página, sin sustituir verificaciones funcionales. La selección temporal (Context/reducer en memoria) es comportamiento de cliente (C) de Frontend; la lógica que dependa de transporte o sesión vive en `frontend/src/sales/api/`. Esta condición aplica también a US-011 a US-013.
- Las verificaciones de las tareas siguientes son futuras, no ejecutadas; el principal concretará comandos y casos según el procedimiento documental de testing. No hay pruebas del POS configuradas.

### TASK-024 — Proveer e integrar el catálogo para vender

- Historia relacionada: [US-010](us-010-consultar-seleccionar-productos-venta.md).
- Responsabilidad: backend.
- Descripción y objetivo: proporcionar la consulta autorizada por categoría y los datos para elegir productos activos.
- Alcance y exclusiones: identidad estable, categoría, nombre, precio, descripción e imagen disponible; sin administrar catálogo, guardar selecciones ni registrar ventas. Reutilizar los datos de Administración del menú, sin duplicar su mantenimiento. Conecta el catálogo en `frontend/src/sales/api/` y verifica en navegador real la selección construida por Frontend: selección repetida y distinta, navegación entre módulos, dos pestañas, recarga, cierre de pestaña, cierre de sesión y aviso cuando el navegador lo permita. No implementa la selección.
- Resultado esperado: el frontend obtiene los productos seleccionables y sus datos sin ofrecer inactivos para nuevas selecciones. Catálogo integrado y selección conservada o descartada según los criterios, sin registrar ventas ni ingresos.
- Criterios aplicables: CA-01, CA-02 (P) y CA-03 a CA-05 (C). La ausencia de ventas por seleccionar reutiliza la evidencia de US-013 CA-06 (TASK-030).
- Verificación prevista: integración con categorías, productos activos e inactivos y productos con y sin imagen; contrastar datos y protección de acceso.
- Dependencias: contrato de consulta, protección de US-001 (TASK-003 y TASK-005) y TASK-006 de US-002 para el descarte por salida; catálogo de US-006, US-008 y US-009 (TASK-016, TASK-020 y TASK-022); registro de entrega de interfaz de Gestión de ventas.

### Tareas retiradas

- TASK-025 — Presentar el catálogo para vender — Retirada el 2026-10-19; cobertura en TASK-024. La interfaz la implementa Frontend sin tareas.
- TASK-026 — Mantener la selección temporal independiente por pestaña — Retirada el 2026-10-19; la implementa Frontend sin tareas y su verificación (CA-03 a CA-05) corresponde a TASK-024.
