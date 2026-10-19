# Kofi — Contexto del producto

## 1. Propósito

Kofi es un sistema web de punto de venta (POS) para cafeterías y pequeños emprendimientos gastronómicos, como food trucks y puestos de venta.

Su objetivo es facilitar la operación diaria mediante una aplicación sencilla, moderna e intuitiva que permita administrar productos, preparar y registrar ventas, y consultar información básica del negocio. Busca agilizar la atención al cliente y reducir el trabajo manual.

## 2. Usuarios y contexto de uso

- Negocios pequeños atendidos por una o dos personas.
- Un único perfil de operador, sin roles ni permisos diferenciados.
- Inicio de sesión incluido en el MVP.
- Una sola sucursal.
- Operación en Bolivia, con importes expresados en bolivianos (`BOB`).
- Uso principal desde computadoras o laptops dentro del establecimiento.
- Se requiere conexión: el funcionamiento sin conexión no forma parte del alcance actual.

Para el alcance actual se aprobó una cuenta compartida, creada fuera del sistema, que admite varias sesiones simultáneas en distintos navegadores o computadoras. Las reglas de acceso y sesión se definen en la [especificación de inicio de sesión](../specs/us-001-iniciar-sesion.md).

## 3. Módulos y funcionalidades del MVP

### 3.1. Inicio de sesión

Permitir al operador iniciar sesión para acceder al sistema.

Los detalles aprobados de acceso, credenciales y uso de sesiones se definen en [US-001 — Iniciar sesión](../specs/us-001-iniciar-sesion.md) y [US-002 — Cerrar sesión](../specs/us-002-cerrar-sesion.md). Se concretaron navegadores y presencia; sigue pendiente validar la identidad de pestaña antes de integrar acceso. Estas especificaciones no equivalen a funcionalidades implementadas.

### 3.2. Dashboard

Pantalla principal con información general de **hoy** por defecto y opción de cambiar a **este mes**, según fechas en horario de Bolivia y sin jornadas operativas:

- Cantidad de ventas, ingresos totales en BOB y cantidad de ventas por método de pago, efectivo y QR. Los ingresos suman los totales de las ventas independientemente del método; no hay contador separado de pedidos.
- Productos vendidos: cada producto aparece una sola vez, con unidades e ingresos del período, ordenado por su venta más reciente. No es un ranking por unidades vendidas.
- Gráfico de líneas con cantidad de ventas por hora. Para hoy agrupa las ventas del día; para este mes suma las ventas de todos sus días en cada franja horaria.
- Actualización en tiempo real, sin recargar la página, al registrar manualmente una venta después de recibir el dinero, también entre computadoras y sesiones.
- Una pantalla de computadora o laptop sin scroll general; solo la lista de productos tiene desplazamiento interno si lo necesita.
- Sin ventas en el período, el contenido informativo se sustituye por «Aún no se realizaron ventas hoy» o «Aún no se realizaron ventas este mes», según corresponda.

Los detalles aprobados se definen en [US-003 — Consultar el resumen de ventas](../specs/us-003-consultar-resumen-ventas.md), [US-004 — Consultar los productos vendidos](../specs/us-004-consultar-productos-vendidos.md) y [US-005 — Identificar las horas con más ventas](../specs/us-005-identificar-horas-mas-ventas.md). US-003 concreta latencia con conexión activa, dimensiones CSS, distinción de carga/error/vacío y el contrato de lectura y actualización común, con formato de importes `BOB 0.0` y condiciones de medición aprobados el 2026-10-19; no se confunde un fallo de consulta con ausencia de ventas. Las métricas adicionales y el detalle de ventas quedan en Historial y reportes. Estas historias no representan funcionalidades implementadas.

El Dashboard consulta resultados de ventas registradas; no prepara ni registra ventas. Una venta en curso no se cuenta como venta realizada ni genera ingresos en sus métricas.

### 3.3. Administración del menú

Este módulo administra exclusivamente el catálogo para el mismo perfil de operador, sin permisos diferenciados:

- Registrar, consultar y editar los datos de productos: nombre, descripción, precio, categoría e imagen.
- Crear, editar y eliminar categorías vacías.
- Desactivar y reactivar productos, sin eliminación definitiva.

**No maneja ventas en curso ni registradas:** no permite seleccionar productos para vender, agregarlos a una cuenta, cambiar cantidades de venta, calcular subtotales o totales, cobrar ni registrar ventas. Consultar productos aquí sirve para mantener el catálogo, no para preparar una venta. La consulta y selección para vender pertenecen exclusivamente a Gestión de ventas.

Cada producto tiene nombre, descripción, precio y exactamente una categoría obligatorios. La imagen es opcional y se carga desde la computadora; sin imagen se muestra un marcador neutro. Los precios son mayores que cero, en BOB, con máximo un decimal y presentación siempre con uno. Los nombres de producto son únicos en todo el catálogo, incluidos los desactivados, ignorando mayúsculas y espacios al inicio/final. Los nombres de categoría también son únicos y solo se elimina una categoría sin productos asociados, incluidos los desactivados.

La edición simultánea de una misma versión del mismo producto o categoría admite solo el primer guardado válido; los posteriores se rechazan con un mensaje de conflicto, sin sobrescribir cambios. Esto incluye activación frente a edición, sin bloquear productos distintos ni ventas independientes; no sustituye las reglas de integridad del registro de ventas.

Los detalles aprobados se definen en [US-006 — Registrar productos](../specs/us-006-registrar-productos.md), [US-007 — Editar productos](../specs/us-007-editar-productos.md), [US-008 — Administrar categorías](../specs/us-008-administrar-categorias.md) y [US-009 — Desactivar y reactivar productos](../specs/us-009-desactivar-reactivar-productos.md). Estas historias no representan funcionalidades implementadas ni definen el flujo de ventas.

La aprobación posterior de la base mínima fija productos activos al registrar y las restricciones de campos/imágenes en US-006; la comparación y longitud del nombre de categoría en US-008. El 2026-10-19 se aprobaron la consulta administrativa del catálogo (listado con filtros, búsqueda, estados vacíos y distinción de carga/error/vacío) dentro de US-006, las unidades de caracteres y MB, el formato `BOB 10.0`, quitar la imagen y conservar la anterior ante un fallo de carga (US-007), el mensaje y la recarga ante conflictos (US-007/US-008/US-009) y la ausencia de máximo comercial de precio, limitado solo por el tope técnico de US-011. En Ventas, US-010 oculta las categorías sin productos activos. No se mantienen como decisiones abiertas ni se copian sus valores aquí. Versionado, transacciones y almacenamiento se definen en [arquitectura](architecture.md#7-base-técnica-mínima-aprobada), no agregan inventario ni acciones de venta al catálogo.

### 3.4. Gestión de ventas

Este módulo es el único responsable de preparar y registrar ventas. Las historias aprobadas se definen en [US-010 — Consultar y seleccionar productos para vender](../specs/us-010-consultar-seleccionar-productos-venta.md), [US-011 — Ajustar y revisar la venta en curso](../specs/us-011-ajustar-revisar-venta-en-curso.md), [US-012 — Revisar cambios del catálogo antes de cobrar](../specs/us-012-revisar-cambios-catalogo-antes-cobro.md) y [US-013 — Registrar la venta después del pago](../specs/us-013-registrar-venta-pagada.md). Sus tareas técnicas vigentes (TASK-024, TASK-027, TASK-028, TASK-030 y TASK-031) y las decisiones posteriores de base mínima están aprobadas para registro documental, no para iniciar implementación; no representan funcionalidades implementadas. Las historias de Administración del menú no sustituyen esta especificación.

Se utiliza una **venta en curso** para preparar la selección previa al registro:

- Consultar los productos activos del catálogo por categoría y sus datos para elegir qué vender.
- Seleccionar productos activos para agregarlos a la venta en curso; seleccionarlos no registra una venta realizada.
- Agregar varios productos a una venta en curso.
- Modificar cantidades.
- Eliminar productos de la venta en curso.
- Calcular automáticamente subtotales y total.
- Consultar el detalle de la venta en curso.
- Registrar la venta y el método de pago después de recibir el dinero. El detalle de las ventas ya registradas se consulta en Historial y reportes.

«Venta en curso» es el término para la selección que se está armando. Llamarla coloquialmente «cuenta» o «pedido» no crea una entidad independiente, estados operativos ni un contador adicional. Gestión de ventas utiliza el catálogo, pero no administra productos, precios, imágenes, descripciones ni categorías.

Para elegir se muestran nombre, precio e imagen o marcador neutro, con descripción disponible al consultar el producto. Cada pestaña autenticada mantiene su selección independiente; navegar entre módulos la conserva, pero recargar, cerrar la pestaña o cerrar sesión la descarta, sin recuperación. Se advierte del descarte cuando el navegador lo permite. Esto no cambia la conservación de la sesión de acceso al recargar.

Las cantidades son enteros positivos; seleccionar de nuevo un producto suma una unidad. Se pueden aumentar, disminuir o escribir cantidades; cero, negativos y decimales se rechazan, y quitar un producto exige una acción explícita. El subtotal es precio unitario por cantidad y el total suma los subtotales, sin descuentos, recargos ni impuestos adicionales. Precios, subtotales y total se expresan en BOB con un decimal. El detalle muestra nombre, precio unitario, cantidad y subtotal, con total visible. Sin productos se muestra «Agrega productos para preparar una venta», total BOB 0.0 y revisión y registro deshabilitados.

#### Reglas de operación

- El cliente paga antes de que se preparen o entreguen los productos.
- Los métodos de pago admitidos son efectivo y QR.
- Cada venta utiliza un solo método. El recorrido es preparar selección, revisar total, recibir dinero, elegir el método y registrar manualmente la venta pagada.
- Kofi registra el método utilizado; no procesa pagos ni integra pasarelas de pago en línea.
- Registrar un pago QR no implica integrarse con un proveedor ni verificar automáticamente la transacción.
- No se requiere un sistema de gestión de cocina o KDS, una cola de preparación ni seguimiento operativo tipo restaurante.
- No se incluyen pedidos independientes ni estados operativos. «Venta en curso» describe la selección previa al registro; no implica persistencia o recuperación de esa selección.
- Al pasar a la revisión previa al cobro se comprueban cambios de precio y desactivación. Se muestran precio anterior y nuevo, y el vigente se aplica tras confirmar la revisión; los desactivados deben retirarse antes de continuar. Se muestra el total resultante y se exige confirmación explícita, sin modificaciones silenciosas. No es una funcionalidad de Administración del menú.
- Al confirmar la revisión se fijan selección y total para cobrar, también frente a cambios del catálogo antes de recibir el dinero, sin bloquearlo ni caducar automáticamente la revisión. Cambiar productos o cantidades antes del pago exige nueva revisión; después de recibir el dinero se registra exactamente lo confirmado, sin editar esa operación durante el registro. La salida descarta la revisión igual que la selección, sin recuperación. Detalles en US-012.
- Si el catálogo cambia después de recibir el dinero pero antes de registrar, se respetan precio y productos de la revisión confirmada, incluso si luego se desactivan. Esta precisión fue aprobada expresamente el 2026-10-18; no permite nuevas selecciones de productos inactivos.
- Cada venta registrada conserva el nombre, precio unitario, cantidades e importes del momento de la venta. Editar o desactivar el producto no altera esos datos ni sus ingresos anteriores. El Dashboard agrupa por identidad estable del producto y muestra su nombre actual, conforme a US-004 y US-007.
- El registro guarda la venta completa o no la guarda; dobles clics y reintentos de la misma operación no la duplican. La selección se limpia solo al confirmar éxito, salvo el descarte por salida descrito antes. Tras el éxito se muestra confirmación y queda vacía para la siguiente venta. Ante respuesta perdida se comunica que se comprueba el resultado, sin anunciar éxito ni fracaso prematuros; se puede comprobar o reintentar la misma operación sin crear otra venta.
- Para un registro incierto tras recarga, cierre o fin de sesión, se conserva solo una referencia opaca de la operación enviada y se comprueba con autorización válida de pestaña o tras autenticarse si la sesión terminó, sin recuperar borrador, revisión o credenciales. Mientras siga incierto no se inicia otra operación para sustituirlo; «no existe» no acredita fracaso definitivo si un envío tardío aún puede registrar. La conciliación y conservación se concretan en US-013.

### 3.5. Historial y reportes

- Visualizar el historial de ventas.
- Consultar los detalles de ventas anteriores.
- Filtrar ventas por fecha.
- Consultar ingresos por períodos.
- Identificar los productos más vendidos.
- Mostrar estadísticas básicas.

El objetivo es ayudar a quien opera o posee el negocio a conocer su rendimiento, sin introducir otro perfil de usuario.

Este módulo consulta ventas ya registradas; no prepara ventas en curso, cobra, registra ventas ni administra el catálogo.

Los detalles aprobados se definen en [US-014 — Consultar el historial de ventas por fecha](../specs/us-014-consultar-historial-ventas.md), [US-015 — Consultar el detalle de una venta](../specs/us-015-consultar-detalle-venta.md), [US-016 — Consultar el resumen del período](../specs/us-016-consultar-resumen-periodo.md) y [US-017 — Identificar los productos más vendidos](../specs/us-017-identificar-productos-mas-vendidos.md). Un único filtro por rango de fechas en horario de Bolivia aplica a la lista, el resumen y el ranking; sin tiempo real, anulaciones, devoluciones, exportación ni comparación entre períodos. Estas historias no representan funcionalidades implementadas ni autorizan su interfaz.

## 4. Alcance inicial

El MVP incluye los cinco módulos descritos, incluido inicio de sesión. Debe permitir administrar el menú, preparar una venta en curso, registrarla después del pago y consultar resultados básicos desde una aplicación web.

Se prioriza un sistema funcional y sencillo. Los requisitos detallados y los criterios de aceptación de cada funcionalidad se aprobarán mediante sus especificaciones antes de implementarla.

### Fuera del alcance actual

- Inventario, existencias y control de disponibilidad por stock.
- Roles o permisos diferenciados.
- Pasarelas de pago en línea e integración para procesar pagos QR.
- KDS y gestión de cocina tipo restaurante.
- Facturación fiscal.
- Funcionamiento sin conexión.
- Tienda de comercio electrónico para clientes.
- Aplicaciones móviles nativas.
- Gestión de múltiples sucursales.
- Integraciones contables externas.
- Funcionalidades empresariales complejas.

## 5. Decisiones de producto pendientes

La aprobación de todas las recomendaciones de la base mínima el 2026-10-18 resuelve estado inicial y restricciones del catálogo, comparación de categorías, fijación revisión–pago, ajustes y continuidad de registros inciertos según las US enlazadas. No autoriza implementación. Permanecen antes de la funcionalidad afectada:

- Validación de la identidad de pestaña y contratos de acceso de US-001. Si la validación exige cambiar las reglas de producto, consultar al responsable.
- Contratos de catálogo/imágenes de US-006 a US-009, incluida la función de conteo de caracteres compartida por frontend y backend. Las unidades, la consulta administrativa y el comportamiento ante conflictos y fallos de imagen se aprobaron el 2026-10-19; no volver a elegir los valores ya aprobados.
- Rutas, DTO y códigos de error de US-011 a US-013. Los límites técnicos, la protección y carreras de confirmación, los rechazos definitivos, la conciliación terminal y la conservación/limpieza de referencias opacas se aprobaron el 2026-10-19. No se aprueba guardar comandos completos ni recuperar borradores.
- Pendientes del contrato del Dashboard aprobado en US-003: autorización del stream y agrupación de avisos en ráfaga. Formato de importes, conciliación, condiciones de medición y envoltorio de error común (en las convenciones comunes del contrato HTTP de la arquitectura) se aprobaron el 2026-10-19.
- Rutas y DTO de Historial y reportes y la autorización de su interfaz. Sus preguntas abiertas (atajos, rango máximo, mensaje de rango vacío, redondeo del ticket promedio y comparación alfabética) y los criterios de su contrato se resolvieron el 2026-10-19. Sus historias y atomización se aprobaron el 2026-10-19; los indicadores del dashboard siguen delimitados por US-003, US-004 y US-005.

Los pendientes de ejecución, infraestructura y comandos se consultan en [arquitectura](architecture.md#8-decisiones-y-validaciones-técnicas-pendientes), sin duplicar sus decisiones aquí. Las reglas de negocio adicionales requieren aprobación.

No se consideran incluidas funcionalidades adicionales por el solo hecho de ser habituales en otros sistemas POS.
