# US-006 — Registrar productos

## Descripción

Como operador, quiero registrar productos con sus datos y categoría, para incorporarlos al catálogo.

## Objetivo

Dar de alta los productos del negocio con información válida, sin incorporar inventario ni variantes de producto.

## Alcance

- Módulo: Administración del menú. Esta historia mantiene el catálogo; no consulta productos para vender, prepara ventas en curso, cobra ni registra ventas.
- Incluye: nombre, descripción, precio, exactamente una categoría e imagen opcional cargada desde la computadora.
- Excluye: stock, variantes, modificadores, carga por URL, importaciones y eliminación definitiva de productos.
- El alta crea productos activos y aplica los límites de campos e imágenes aprobados en esta historia. La implementación técnica pertenece a la [base mínima](../ai-context/architecture.md#7-base-técnica-mínima-aprobada), todavía sin ejecutar.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El producto registrado puede consultarse con los datos guardados y exactamente una categoría. Nombre, descripción, precio y categoría son obligatorios. |
| CA-02 | Se rechaza el registro si falta un campo obligatorio o el nombre está duplicado. La unicidad abarca todo el catálogo, incluidos productos desactivados, e ignora mayúsculas y espacios al inicio y final. |
| CA-03 | El precio debe ser mayor que cero y admitir como máximo un decimal; se rechaza un precio que incumpla estas condiciones. Se expresa en BOB y se muestra siempre con un decimal, por ejemplo, 10,0 BOB. |
| CA-04 | Se permite registrar un producto sin imagen; al consultarlo, se muestra un marcador neutro. |
| CA-05 | Se permite cargar una imagen desde la computadora; al guardar el producto queda asociada a él y se muestra al consultarlo. |
| CA-06 | Al registrar correctamente un producto, su estado inicial es activo y así se muestra al consultarlo. |
| CA-07 | Se rechazan campos o imágenes que incumplan las restricciones aprobadas siguientes, tanto en backend como al tramitar el alta desde la interfaz; un rechazo no produce un alta válida. |

### Restricciones aprobadas

- Nombre: de 1 a 100 caracteres tras quitar espacios extremos; descripción obligatoria: de 1 a 1.000 caracteres tras quitar espacios extremos. No modificar la comparación de nombres de CA-02 ni añadir equivalencia de acentos.
- Imágenes: JPEG, PNG o WebP, máximo 5 MB y 4.096 píxeles por lado. Se rechazan SVG y formatos animados. Validar contenido real, no solo extensión o MIME declarado.
- Antes de implementar debe precisarse cómo contar caracteres y bytes de MB para aplicar idénticos límites en contratos y pruebas. No se presuponen unidades adicionales ni conversión automática de archivos. La seguridad, almacenamiento y asociación se concretan en arquitectura.

### Verificación prevista de los criterios

- CA-01 a CA-03: integración del registro y consulta con campos incompletos, categoría, nombres duplicados entre activos e inactivos, diferencias de mayúsculas/espacios extremos y precios positivos, cero, negativos o con más de un decimal. Incluir altas simultáneas del mismo nombre para comprobar la unicidad sin presuponer un mecanismo técnico.
- CA-03 a CA-05: revisión manual de la presentación de BOB con un decimal y del registro/consulta con y sin imagen local; apropiada para comprobar el formato y marcador visual.
- CA-06: integración del alta y lectura para comprobar estado activo inicial; contrastar después su consumo en US-010, sin implementar Ventas aquí.
- CA-07: límites inferior/superior y valores inmediatamente fuera de rango para nombre/descripción, incluidos solo espacios; archivos admitidos/rechazados por contenido, animación, tamaño y dimensiones, incluidas ambas fronteras y falsificación de extensión/MIME. Comprobar rechazo en API e interfaz y ausencia de alta válida; concretar unidades antes de automatizar.

Estas verificaciones están previstas, no ejecutadas. Antes de implementar, el agente principal concretará los casos y comandos según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no existen aplicación ni comandos de pruebas del POS.

## Dependencias relevantes

- [Producto: administración del menú](../ai-context/product.md#33-administración-del-menú) y [US-001 — Iniciar sesión](us-001-iniciar-sesion.md).
- [US-008 — Administrar categorías](us-008-administrar-categorias.md): categorías para asignar productos.
- [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): mantenimiento posterior del estado de activación del producto.
- Antes de implementar deben concretarse unidades y contratos de validación/carga/asociación sobre las restricciones ya aprobadas, sin volver a tratar estado inicial o formatos como decisiones abiertas.

## Aprobación

El responsable del proyecto respondió «si a todo» a las decisiones consultadas y después «si» a aprobar las cinco historias consolidadas y autorizar su documentación, las referencias afectadas de producto y Dashboard y su registro como pendientes en el tracker, en la conversación del 2026-10-18.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó tareas técnicas.

La corrección autorizada por el responsable en esta conversación del 2026-10-18 delimita esta historia a Administración del menú y elimina su dependencia de selección para vender. No cambia las validaciones del producto ni define historias de Gestión de ventas.

Por solicitud explícita posterior del responsable el mismo día, esta historia pasa de US-007 a US-006, sin cambiar sus criterios ni tareas.

Posteriormente, el responsable respondió «si» el 2026-10-18 a aprobar las ocho propuestas de tareas de Administración del menú y autorizar asignarles IDs y registrarlas como pendientes, sin implementar. Esta aprobación incluye TASK-016 y TASK-017 y conserva las condiciones técnicas previas; no autoriza comenzar su implementación.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y su documentación: producto activo al registrar y restricciones de campos e imágenes anteriores. Se añaden CA-06/CA-07 y sus verificaciones a las tareas existentes; no se autoriza código, instalaciones ni cambios de estado.

## Tareas técnicas asociadas

Las siguientes tareas fueron aprobadas para su registro. TASK-016 sustituye la etiqueta local `MENU-REG-BE` y TASK-017 sustituye `MENU-REG-FE`. Su estado se consulta únicamente en el [tracker](../progress/tracker.md); la aprobación no autoriza implementación.

### Condiciones previas y verificación futura

- Estado inicial, longitudes, formatos, tamaño y dimensiones ya están decididos. Concretar unidades, DTO/rutas y rechazos, referencias a categorías y carga/asociación/consulta de imágenes sobre almacenamiento y seguridad elegidos en arquitectura.
- Disponer de estructuras de aplicaciones expresamente autorizadas sobre la base técnica elegida. Las herramientas aún no están instaladas ni tienen comandos del POS; estas condiciones no crean ni autorizan tareas fundacionales.
- La verificación de ambas tareas se vincula una sola vez al [plan de CA-01 a CA-07](#verificación-prevista-de-los-criterios). El principal concretará casos y comandos conforme a [documentación §7](../ai-context/documentation.md#7-procedimiento-de-testing), incluidos los riesgos de integridad de los contratos; el hook ejecutará las comprobaciones rápidas disponibles. No se ejecutan pruebas en este registro ni se crea una tarea genérica de QA.
- Solo al autorizar diseño o implementación de una página React se aplicará el [sistema de diseño](../ai-context/design-system.md): Impeccable → Emil → React Best Practices. Esta propuesta no ejecuta esas revisiones.

### TASK-016 — Registrar y consultar productos con datos válidos

- Historia relacionada: [US-006 — Registrar productos](us-006-registrar-productos.md).
- Responsabilidad: backend y persistencia del catálogo.
- Descripción y objetivo: guardar productos válidos y permitir su consulta administrativa, con una categoría existente e imagen local opcional, para incorporarlos al catálogo sin datos ambiguos.
- Alcance y exclusiones: alta, lectura administrativa, campos obligatorios, unicidad global del nombre ignorando mayúsculas y espacios extremos, precio positivo con máximo un decimal y asociación opcional de imagen. La unicidad incluye inactivos y debe sostenerse ante altas simultáneas y cambios de nombre de US-007. La asignación debe preservar una categoría existente incluso ante eliminación concurrente en US-008. Sin stock, variantes, carga por URL, eliminación definitiva ni operaciones de ventas.
- Resultado esperado: se recupera el producto inicialmente activo con los datos guardados y exactamente una categoría; campos, nombres, precios o imágenes inválidos no producen alta válida. La imagen queda asociada cuando se proporciona y su ausencia es representable para la consulta.
- Criterios de aceptación aplicables: CA-01 y CA-02, cobertura backend; CA-03, validación y valor en BOB, no presentación visual; CA-04, admisión sin imagen; CA-05, asociación y recuperación; CA-06, estado activo inicial; CA-07, rechazo autoritativo de restricciones. Marcador, formato y visualización se completan en TASK-017.
- Dependencias: condiciones anteriores; [US-001, TASK-003](us-001-iniciar-sesion.md#task-003--proteger-operaciones) para proteger alta, lectura e imagen; [TASK-020 de US-008](us-008-administrar-categorias.md#task-020--mantener-categorías-y-proteger-sus-asociaciones), únicamente creación/consulta de una categoría inicial y contrato de referencias para comenzar. La integración de asignación frente a eliminación requiere después la protección correspondiente de TASK-020, no completar toda US-008. Compartir el contrato de unicidad con TASK-018 no exige implementar edición para iniciar el alta.

### TASK-017 — Completar el registro y la consulta administrativa

- Historia relacionada: [US-006 — Registrar productos](us-006-registrar-productos.md).
- Responsabilidad: frontend React con TypeScript.
- Descripción y objetivo: permitir introducir los datos aprobados, elegir exactamente una categoría y cargar opcionalmente una imagen de la computadora, mostrando el producto persistido para comprobar el alta.
- Alcance y exclusiones: interacción de registro y consulta administrativa, validaciones de entrada acordadas y comunicación de rechazos del backend; mostrar BOB siempre con un decimal e imagen o marcador neutro. La creación de categorías corresponde a TASK-020/TASK-021; esta tarea consume las categorías disponibles. No fija disposición visual ni incorpora selección para vender o ventas.
- Resultado esperado: el operador registra y consulta los datos realmente guardados; ve el precio con un decimal, la imagen asociada o el marcador neutro y el rechazo de entradas inválidas o duplicadas, sin presentar un registro rechazado como exitoso.
- Criterios de aceptación aplicables: CA-01 a CA-07, cobertura frontend de interacción, validación de entrada y comunicación de rechazos, presentación y estado inicial; la integridad del guardado y unicidad dependen de TASK-016, no de validaciones del navegador.
- Dependencias: contratos y decisiones anteriores; TASK-016 y categorías disponibles desde TASK-020 para integrar el recorrido; estructura frontend y [US-001, TASK-005](us-001-iniciar-sesion.md#task-005--mantener-la-pestaña-autorizada-y-proteger-pantallas) para acceso protegido. No requiere completar US-007, US-009 ni Gestión de ventas.
