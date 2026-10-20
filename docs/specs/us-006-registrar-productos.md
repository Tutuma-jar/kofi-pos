# US-006 — Registrar productos

## Descripción

Como operador, quiero registrar productos con sus datos y categoría, para incorporarlos al catálogo.

## Objetivo

Dar de alta los productos del negocio con información válida, sin incorporar inventario ni variantes de producto.

## Alcance

- Módulo: Administración del menú. Esta historia mantiene el catálogo; no consulta productos para vender, prepara ventas en curso, cobra ni registra ventas.
- Incluye: nombre, descripción, precio, exactamente una categoría e imagen opcional cargada desde la computadora, y la consulta administrativa del catálogo con sus filtros, búsqueda y estados de pantalla.
- Excluye: stock, variantes, modificadores, carga por URL, importaciones y eliminación definitiva de productos.
- El alta crea productos activos y aplica los límites de campos e imágenes aprobados en esta historia. La implementación técnica pertenece a la [base mínima](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), todavía sin ejecutar.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El producto registrado puede consultarse con los datos guardados y exactamente una categoría. Nombre, descripción, precio y categoría son obligatorios. |
| CA-02 | Se rechaza el registro si falta un campo obligatorio o el nombre está duplicado. La unicidad abarca todo el catálogo, incluidos productos desactivados, e ignora mayúsculas y espacios al inicio y final. |
| CA-03 | El precio debe ser mayor que cero y admitir como máximo un decimal; se rechaza un precio que incumpla estas condiciones. No hay máximo comercial: el único tope es el límite técnico de [US-011 CA-07](us-011-ajustar-revisar-venta-en-curso.md#criterios-de-aceptación). Se expresa en BOB y se muestra siempre con un decimal, con el formato de importes de [US-003](us-003-consultar-resumen-ventas.md): por ejemplo, `BOB 10.0`. |
| CA-04 | Se permite registrar un producto sin imagen; al consultarlo, se muestra un marcador neutro. |
| CA-05 | Se permite cargar una imagen desde la computadora; al guardar el producto queda asociada a él y se muestra al consultarlo. |
| CA-06 | Al registrar correctamente un producto, su estado inicial es activo y así se muestra al consultarlo. |
| CA-07 | Se rechazan campos o imágenes que incumplan las restricciones aprobadas siguientes, tanto en backend como al tramitar el alta desde la interfaz; un rechazo no produce un alta válida. |
| CA-08 | La consulta administrativa presenta en un único listado, sin paginación, los productos activos y desactivados. Cada producto muestra nombre, descripción, precio, categoría, imagen o marcador neutro y su estado; los desactivados llevan una etiqueta visible y van después de los activos. Dentro de cada estado se ordenan alfabéticamente por nombre. La consulta no ofrece acciones de venta ni de selección para vender. |
| CA-09 | El operador puede filtrar el listado por categoría y por estado (todos, activos o inactivos) y buscar por nombre, ignorando mayúsculas y espacios al inicio y final. |
| CA-10 | Sin productos, se muestra «Aún no hay productos. Agrega el primero para empezar a vender.» con una acción para registrar uno. Sin categorías, el alta de producto no está disponible y se muestra «Crea una categoría antes de agregar productos» con un acceso a la creación de categorías de US-008. Si hay productos pero los filtros o la búsqueda no devuelven resultados, se muestra «Ningún producto coincide con los filtros», distinto del catálogo vacío. |
| CA-11 | La consulta distingue carga, error con opción de reintentar y catálogo vacío; un fallo de consulta no se presenta como ausencia de productos. |

### Restricciones aprobadas

- Nombre: de 1 a 100 caracteres tras quitar espacios extremos; descripción obligatoria: de 1 a 1.000 caracteres tras quitar espacios extremos. No modificar la comparación de nombres de CA-02 ni añadir equivalencia de acentos.
- Imágenes: JPEG, PNG o WebP, máximo 5 MB y 4.096 píxeles por lado. Se rechazan SVG y formatos animados. Validar contenido real, no solo extensión o MIME declarado.
- Unidades: los caracteres se cuentan como caracteres visibles (una «ñ» o una letra con tilde cuentan como uno) tras quitar espacios extremos; frontend y backend aplican la misma regla de conteo, definida en el contrato. 1 MB equivale a 1.048.576 bytes, por lo que el máximo de imagen es 5.242.880 bytes. No se presuponen unidades adicionales ni conversión automática de archivos. La seguridad, almacenamiento y asociación se concretan en arquitectura.

### Verificación prevista de los criterios

- CA-01 a CA-03: integración del registro y consulta con campos incompletos, categoría, nombres duplicados entre activos e inactivos, diferencias de mayúsculas/espacios extremos y precios positivos, cero, negativos o con más de un decimal. Incluir altas simultáneas del mismo nombre para comprobar la unicidad sin presuponer un mecanismo técnico.
- CA-03 a CA-05: revisión manual de la presentación de BOB con un decimal y del registro/consulta con y sin imagen local; apropiada para comprobar el formato y marcador visual.
- CA-06: integración del alta y lectura para comprobar estado activo inicial; contrastar después su consumo en US-010, sin implementar Ventas aquí.
- CA-07: límites inferior/superior y valores inmediatamente fuera de rango para nombre/descripción, incluidos solo espacios; archivos admitidos/rechazados por contenido, animación, tamaño y dimensiones, incluidas ambas fronteras y falsificación de extensión/MIME. Comprobar rechazo en API e interfaz y ausencia de alta válida, con las unidades aprobadas, incluidos caracteres compuestos y archivos de 5.242.880 y 5.242.881 bytes.
- CA-08 y CA-09: integración de la consulta con productos activos e inactivos de varias categorías; comprobar orden, etiqueta de estado, ausencia de acciones de venta, cada filtro y la búsqueda con diferencias de mayúsculas y espacios extremos.
- CA-10 y CA-11: recorrido con catálogo sin categorías, sin productos y con filtros sin resultados, comprobando los mensajes exactos; simular un fallo de consulta y comprobar error con reintento, distinto del estado vacío.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

## Dependencias relevantes

- [Producto: administración del menú](../ai-context/product.md#33-administración-del-menú) y [US-001 — Iniciar sesión](us-001-iniciar-sesion.md).
- [US-008 — Administrar categorías](us-008-administrar-categorias.md): categorías para asignar productos.
- [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): mantenimiento posterior del estado de activación del producto.
- Antes de implementar deben concretarse los contratos de validación/carga/asociación y de consulta sobre las restricciones y unidades ya aprobadas, sin volver a tratar estado inicial, formatos o unidades como decisiones abiertas.

## Aprobación

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó tareas técnicas.

La corrección autorizada por el responsable en esta conversación del 2026-10-18 delimita esta historia a Administración del menú y elimina su dependencia de selección para vender. No cambia las validaciones del producto ni define historias de Gestión de ventas.

Por solicitud explícita posterior del responsable el mismo día, esta historia pasa de US-007 a US-006, sin cambiar sus criterios ni tareas.

Posteriormente, el responsable respondió «si» el 2026-10-18 a aprobar las ocho propuestas de tareas de Administración del menú y autorizar asignarles IDs y registrarlas como pendientes, sin implementar. Esta aprobación incluye TASK-016 y TASK-017 y conserva las condiciones técnicas previas; no autoriza comenzar su implementación.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y su documentación: producto activo al registrar y restricciones de campos e imágenes anteriores. Se añaden CA-06/CA-07 y sus verificaciones a las tareas existentes; no se autoriza código, instalaciones ni cambios de estado.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-016 se amplía con la conexión en `frontend/src/menu/api/` y la verificación integrada; TASK-017 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

El 2026-10-19, tras el análisis de `requirements-analyst`, el responsable decidió «ampliar US-006 con la consulta administrativa» en lugar de crear una historia nueva y respondió «estoy de acuerdo» a las respuestas sugeridas por el principal a las preguntas abiertas del menú. En esta historia se añaden CA-08 a CA-11 (listado, filtros y búsqueda, estados vacíos y distinción de carga/error/vacío), se corrige el ejemplo de CA-03 al formato `BOB 10.0` y se fijan las unidades de caracteres y MB. Sobre el precio máximo, el responsable indicó «Mantén US-011: sin tope comercial, solo el límite técnico que se defina allí», y CA-03 remite a ese límite. No autoriza implementación ni cambios en el tracker.

## Tareas técnicas asociadas

Las siguientes tareas fueron aprobadas para su registro. TASK-016 sustituyó la etiqueta local `MENU-REG-BE`; TASK-017 (`MENU-REG-FE`) se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md); la aprobación no autoriza implementación.

### Condiciones previas y verificación futura

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Estado inicial, longitudes, formatos, unidades, tamaño y dimensiones ya están decididos. Concretar la función de conteo compartida, DTO/rutas y rechazos, referencias a categorías y carga/asociación/consulta de imágenes sobre almacenamiento y seguridad elegidos en arquitectura.
- Disponer de estructuras de aplicaciones expresamente autorizadas sobre la base técnica elegida. Las herramientas aún no están instaladas ni tienen comandos del POS; estas condiciones no crean ni autorizan tareas fundacionales.
- La verificación de ambas tareas se vincula una sola vez al [plan de CA-01 a CA-11](#verificación-prevista-de-los-criterios). El principal concretará casos y comandos conforme a [documentación §7](../ai-context/documentation.md#7-procedimiento-de-testing), incluidos los riesgos de integridad de los contratos; el hook ejecutará las comprobaciones rápidas disponibles. No se ejecutan pruebas en este registro ni se crea una tarea genérica de QA.
- Solo al autorizar diseño o implementación de una página React se aplicará el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices. Esta propuesta no ejecuta esas revisiones.

### TASK-016 — Registrar y consultar productos e integrar su administración

- Historia relacionada: [US-006 — Registrar productos](us-006-registrar-productos.md).
- Responsabilidad: backend y persistencia del catálogo.
- Descripción y objetivo: guardar productos válidos y permitir su consulta administrativa, con una categoría existente e imagen local opcional, para incorporarlos al catálogo sin datos ambiguos.
- Alcance y exclusiones: alta, lectura administrativa, campos obligatorios, unicidad global del nombre ignorando mayúsculas y espacios extremos, precio positivo con máximo un decimal y asociación opcional de imagen. La unicidad incluye inactivos y debe sostenerse ante altas simultáneas y cambios de nombre de US-007. La asignación debe preservar una categoría existente incluso ante eliminación concurrente en US-008. Sin stock, variantes, carga por URL, eliminación definitiva ni operaciones de ventas. Conecta el registro y la consulta administrativa de Frontend en `frontend/src/menu/api/` y verifica el recorrido integrado: el operador ve los datos realmente guardados, el precio con un decimal, la imagen o el marcador y el rechazo de entradas inválidas o duplicadas, sin presentar un registro rechazado como exitoso.
- Resultado esperado: se recupera el producto inicialmente activo con los datos guardados y exactamente una categoría; campos, nombres, precios o imágenes inválidos no producen alta válida. La imagen queda asociada cuando se proporciona y su ausencia es representable para la consulta.
- Criterios de aceptación aplicables: CA-01 y CA-02; CA-03 (validación y formato BOB con un decimal, P); CA-04 (marcador neutro, P); CA-05 (imagen mostrada, P); CA-06; CA-07 (rechazo autoritativo del backend y su comunicación desde la interfaz, C); CA-08 (datos, estado y orden de la consulta, P); CA-09 (filtros y búsqueda, C); CA-10 (mensajes de vacío y acceso a categorías, P); CA-11 (distinción de carga, error y vacío, C). La integridad del guardado y la unicidad no dependen de validaciones del navegador.
- Dependencias: condiciones anteriores; [US-001, TASK-003](us-001-iniciar-sesion.md#task-003--proteger-operaciones) para proteger alta, lectura e imagen; [TASK-020 de US-008](us-008-administrar-categorias.md#task-020--mantener-categorías-proteger-sus-asociaciones-e-integrar-su-administración), únicamente creación/consulta de una categoría inicial y contrato de referencias para comenzar. La integración de asignación frente a eliminación requiere después la protección correspondiente de TASK-020, no completar toda US-008. Compartir el contrato de unicidad con TASK-018 no exige implementar edición para iniciar el alta. Para conectar, [registro de entrega de interfaz de Administración del menú](#interfaz--administración-del-menú-registro-de-entrega).

### Tareas retiradas

- TASK-017 — Completar el registro y la consulta administrativa — Retirada el 2026-10-19; cobertura en TASK-016. La interfaz la implementa Frontend sin tareas.

## Interfaz — Administración del menú: registro de entrega

Redactado por el principal el 2026-10-20 a partir de la entrega de Frontend ya integrada en `develop`, para habilitar la conexión de TASK-016, TASK-018, TASK-020 y TASK-022 en `frontend/src/menu/api/`. No es un estado ni una tarea, no acredita criterios integrados ni DoD y no modifica el tracker.

- **Historias:** US-006, [US-007](us-007-editar-productos.md), [US-008](us-008-administrar-categorias.md) y [US-009](us-009-desactivar-reactivar-productos.md).
- **Rama y commit:** `feat/ui-menu-administracion`, commit `ae51a80b390d1fb9389c34d54b75f5a828f0c427` (`feat(menu): add menu administration with simulated data`, `Refs: US-006, US-007, US-008, US-009`) sobre la base `8c64adc31d850646d859f30a11f05fa55c28b96b`. Integrado en `develop` por el PR #6 de Tutuma-jar/kofi-pos (merge `daec6d7f2f8307b9d5331e32e853b16d6496d793`, 2026-10-19). Después, TASK-020 (`564eabe`, PR #11) solo ajustó el comentario de conteo del contrato provisional y añadió `real-menu-client.ts` sin conectarlo; no cambió componentes ni estilos.
- **Pantallas y estados cubiertos:** `/menu` con catálogo tabular, búsqueda por nombre y filtros por categoría y estado, inactivos etiquetados, acciones de editar y de activar/desactivar por producto, «Actualizar lista» y estados de carga, actualización, error con reintento, catálogo vacío con «Agregar el primer producto», sin categorías con acceso a crearlas y sin resultados de filtros. Alta y edición en diálogo modal con validación de campos, imagen local con marcador neutro, error de imagen nueva, error al guardar, conflicto de versión con recarga de la vigente y confirmación al descartar cambios; administración de categorías también accesible desde el diálogo. `/menu/categories` con creación, renombrado, eliminación con confirmación, rechazo por productos asociados, conflicto y estados de carga/error/vacío. Enlace en la navegación compartida de `AuthenticatedLayout`.
- **Supuestos de contrato:** [`frontend/src/menu/api/contract.provisional.ts`](../../frontend/src/menu/api/contract.provisional.ts), sin contrato aprobado. Tipos `Category` y `Product` con `id` y `version` (numérica en memoria, opaca en la integración), precio en décimas enteras (`priceTenths`), `categoryId` único, `image` como data URL temporal o `null` y `active`. Interfaz `MenuClient` con `list`, `getProduct`, `saveProduct(input, current?)`, `setActive`, `saveCategory(name, current?)`, `deleteCategory` y `setScenario`. Errores `MenuError` con códigos `VALIDATION_ERROR`, `CONFLICT`, `CATEGORY_NOT_EMPTY`, `CONNECTION_ERROR` e `IMAGE_ERROR` y errores por campo. Conteo de longitudes por grafemas tras `trim()`, acordado con TASK-020. `menu-client.ts` exporta todavía `menuClient = createDemoClient()`: es el punto único de sustitución. No hay endpoints, persistencia ni almacenamiento de imágenes definidos en esta entrega.
- **Cierre visual:** incompleto. Frontend aplicó Impeccable con la variante P (Bruma y lino), sin subagentes, y conservó Fraunces pese a la advertencia genérica del detector. No consta revisión Emil Design Engineering ni React Best Practices, y la revisión visual con capturas quedó pendiente porque la herramienta rechazó la captura sin pestaña visible.
- **Comprobaciones ejecutadas:**
  - Por Frontend, según el PR #6: typecheck, lint y build correctos; 72 pruebas, 18 nuevas; formato de los archivos modificados correcto; `format:check` global fallido en 53 archivos preexistentes ajenos; DOM en vistas embebidas de 1280×720 y 1366×768, con navegación abierta y cerrada, sin desbordamiento horizontal y con acciones del modal accesibles.
  - Por el principal el 2026-10-20 sobre `develop` en `27a138873471c404473b3f9eeea1f6071e248d05`, con la base local: `npm run typecheck`, `npm run lint` y `npm run build` del workspace `@kofi/frontend` correctos; `npm run test` del workspace con 13 archivos y 137 pruebas correctas, 45 de ellas en `src/menu`. No se repitió la revisión renderizada: el puerto 5173 estaba ocupado por otro servidor de desarrollo y el acceso ya requiere backend y sesión reales. Las pruebas de componentes no acreditan criterios de aceptación ni DoD.
- **Pendientes y ajustes conocidos:**
  - Cierre visual Emil → React Best Practices y revisión renderizada con capturas, a cargo de Frontend. Sin ellos ninguna de las cuatro historias completa su entrega de interfaz, aunque las tareas puedan conectar.
  - `MenuPage` muestra un panel plegable «Datos simulados · escenarios de demostración» con selector de escenarios y «Simular sesión finalizada». Al conectar la fuente real ese panel no debe presentarse como funcional. Retirarlo o condicionarlo es un ajuste de componente: vuelve a Frontend según la integración común, y la tarea que lo detecte queda `Bloqueado: ajuste de interfaz pendiente en Frontend` solo si impide su verificación integrada.
  - `setScenario` forma parte de `MenuClient`; la fuente real debe aceptarlo sin efecto o el contrato aprobado debe retirarlo junto con el ajuste anterior.
  - Las confirmaciones de descarte y eliminación usan `window.confirm` nativo. Se conserva como decisión de Frontend; cualquier cambio también vuelve a Frontend.
  - Resuelto por la segunda pasada de TASK-020 (2026-10-20): `real-menu-client.ts` cubre creación, consulta, renombrado y eliminación de categorías con su versión; ya no existe el rechazo «Esta acción aún no está disponible».
