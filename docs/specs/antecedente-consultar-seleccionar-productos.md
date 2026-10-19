# Antecedente — Consultar y seleccionar productos

## Nota de trazabilidad

Este archivo conserva únicamente el antecedente de la redacción original aprobada el 2026-10-18 con el identificador original US-006. En esta conversación, el responsable aclaró después que Administración del menú no maneja ningún tipo de venta y autorizó corregir producto, historias y referencias. La decisión y su efecto sobre el trabajo vigente se registran en el [tracker](../progress/tracker.md#antecedentes-retirados-del-trabajo-vigente).

**Todas las secciones siguientes son históricas: no constituyen una especificación habilitante ni tareas por implementar.** No se traslada esta historia a Gestión de ventas. Por solicitud explícita posterior del responsable, las cuatro historias de Administración se renumeraron; la US-006 vigente es ahora [Registrar productos](us-006-registrar-productos.md), no esta historia retirada. La consulta y selección para vender deberán especificarse y atomizarse al definir ese módulo, según el [alcance general del producto](../ai-context/product.md#34-gestión-de-ventas).

## Redacción original conservada

### Descripción

Como operador, quiero consultar el menú por categorías y seleccionar productos, para preparar una venta.

### Objetivo

Separar el uso operativo del menú de su administración, facilitando la selección de productos para una venta en curso.

### Alcance

- Incluye: consulta por categorías, datos de los productos, selección de productos activos y revisión ante cambios de precio o desactivación de un producto seleccionado.
- Excluye: cobro, registro definitivo de la venta, pedidos independientes, estados operativos, cola de preparación, stock y persistencia o recuperación de ventas en curso.
- No fija disposición visual, actualización en tiempo real del menú ni tecnología para detectar cambios.

### Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El operador puede consultar los productos por categoría y sus datos: nombre, descripción, precio en BOB e imagen, o marcador neutro si no tienen imagen. |
| CA-02 | Solo los productos activos pueden seleccionarse para una nueva venta; los desactivados no se ofrecen para nuevas selecciones. |
| CA-03 | Seleccionar un producto lo incorpora a la venta en curso, sin cobrarla ni registrarla como venta realizada. |
| CA-04 | Si cambia el precio o se desactiva un producto ya seleccionado, se avisa y se exige revisar la venta antes del cobro. El total no se modifica silenciosamente. |

#### Verificación prevista de los criterios

- CA-01: revisión manual de consulta por categorías, datos y productos con y sin imagen; apropiada para comprobar la presentación sin imponer una disposición.
- CA-02 a CA-04: integración entre catálogo y venta en curso, con productos activos/inactivos y cambios de precio o desactivación desde otra sesión. Comprobar selección permitida, ausencia de registro de venta por seleccionar y revisión obligatoria sin cambios silenciosos del total.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

### Dependencias relevantes

- [Producto: gestión de ventas](../ai-context/product.md#34-gestión-de-ventas) y [US-001 — Iniciar sesión](us-001-iniciar-sesion.md). El enlace de producto apunta a la sección vigente; la antigua agrupación de menú y ventas ya no se aplica.
- [Registrar productos](us-006-registrar-productos.md): campos, precios e imágenes. Los enlaces de estas referencias apuntan a las historias con su numeración vigente.
- [Editar productos](us-007-editar-productos.md), [Administrar categorías](us-008-administrar-categorias.md) y [Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): catálogo disponible y cambios que afectan a la selección.
- Especificación futura de ventas: cantidades, subtotales, total y registro después de recibir el pago. Antes de implementar debe concretarse el recorrido de revisión de CA-04 coordinado con esa especificación, sin asumir actualización automática del total ni conservación del precio anterior.

### Aprobación original

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación corresponde a la historia y sus criterios; no autoriza implementación ni aprueba tareas técnicas.

### Tareas técnicas asociadas en la redacción original

No se han definido ni aprobado tareas técnicas en esta aprobación. Su descomposición y aprobación deben realizarse antes de implementar.
