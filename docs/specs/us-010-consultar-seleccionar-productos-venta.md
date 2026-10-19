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

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-024, TASK-025 y TASK-026 sustituyen respectivamente las etiquetas locales P10-A, P10-B y P10-C. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas compartidas

- Concretar contratos de catálogo/selección sobre Context/reducer y estado en memoria por encima de la navegación, elegidos en la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), sin persistencia ni recuperación de borradores. Coordinar límites numéricos con US-011 y descarte de revisión con US-012; la referencia opaca enviada de US-013 no conserva selección.
- Disponer del catálogo y acceso protegido de US-001/US-002. Las tareas de Administración del menú proveen sus datos; este registro no las recrea ni autoriza tareas fundacionales.
- Las dependencias distinguen construcción e integración: se pueden desarrollar las partes contra contratos aprobados, sin exigir una pantalla finalizada para construir la otra parte.
- Frontend seguirá el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices cuando corresponda código React. El cierre se coordina sobre la página integrada de Gestión de ventas, sin repetir revisiones por tarea ni sustituir verificaciones funcionales. Esta condición aplica también a las tareas frontend de US-011 a US-013.
- Las verificaciones de las tareas siguientes son futuras, no ejecutadas; el principal concretará comandos y casos según el procedimiento documental de testing. No hay pruebas del POS configuradas.

### TASK-024 — Proveer el catálogo para seleccionar productos

- Historia relacionada: [US-010](us-010-consultar-seleccionar-productos-venta.md).
- Responsabilidad: backend.
- Descripción y objetivo: proporcionar la consulta autorizada por categoría y los datos para elegir productos activos.
- Alcance y exclusiones: identidad estable, categoría, nombre, precio, descripción e imagen disponible; sin administrar catálogo, guardar selecciones ni registrar ventas. Reutilizar los datos de Administración del menú, sin duplicar su mantenimiento.
- Resultado esperado: el frontend obtiene los productos seleccionables y sus datos sin ofrecer inactivos para nuevas selecciones.
- Criterios aplicables: CA-01 y provisión de datos de CA-02.
- Verificación prevista: integración con categorías, productos activos e inactivos y productos con y sin imagen; contrastar datos y protección de acceso.
- Dependencias: contrato de consulta, protección de US-001 y catálogo de US-006, US-008 y US-009. No depende de la construcción de TASK-025 ni TASK-026.

### TASK-025 — Presentar el catálogo para vender

- Historia relacionada: [US-010](us-010-consultar-seleccionar-productos-venta.md).
- Responsabilidad: frontend.
- Descripción y objetivo: permitir consultar por categoría y elegir productos con la información aprobada.
- Alcance y exclusiones: nombre, precio BOB con un decimal, imagen o marcador neutro y acceso a descripción. Sin editar catálogo ni consultar detalle histórico.
- Resultado esperado: catálogo navegable conectado a la selección de la pestaña.
- Criterios aplicables: CA-01, CA-02 e interacción de selección de CA-03.
- Verificación prevista: recorrido por categorías, productos con y sin imagen, consulta de descripción y selección; comprobar que no se ofrecen inactivos.
- Dependencias: contratos de TASK-024 y TASK-026; integración final con ambas tareas. TASK-026 no necesita esta presentación para construir su comportamiento.

### TASK-026 — Mantener la selección temporal independiente por pestaña

- Historia relacionada: [US-010](us-010-consultar-seleccionar-productos-venta.md).
- Responsabilidad: frontend.
- Descripción y objetivo: agregar productos y conservar la selección únicamente durante el recorrido permitido de cada pestaña autenticada.
- Alcance y exclusiones: varios productos, incremento al repetir selección, conservación entre módulos, independencia por pestaña, descarte y aviso cuando el navegador lo permita. Sin persistencia, recuperación ni sincronización de borradores.
- Resultado esperado: selección temporal disponible para US-011, sin registrar ventas ni ingresos.
- Criterios aplicables: CA-03 a CA-05.
- Verificación prevista: selección repetida y de productos distintos, navegación entre módulos y dos pestañas autenticadas independientemente; navegador real para recarga, cierre de pestaña y cierre de sesión. Comprobar descarte, aviso cuando sea posible y ausencia de recuperación o registro por seleccionar. Contrastar métricas cuando esté disponible el Dashboard.
- Dependencias: US-001/US-002, contrato de catálogo de TASK-024, mecanismo temporal y límites numéricos acordados con US-011. La comprobación conjunta de métricas requiere el Dashboard, no su construcción inicial.
