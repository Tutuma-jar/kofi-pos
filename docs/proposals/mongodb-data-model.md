# Propuesta de modelo de datos MongoDB

**Estado:** propuesta, **no aprobada**. No autoriza implementar ni sustituye las especificaciones de `docs/specs/`.
**Origen:** perfil `database`, en solo lectura, a petición del responsable (2026-10-19). Las citas de US-013 L40, US-017 L26/L42 y architecture L303-305 se comprobaron; el resto no se ha verificado línea por línea.
**Alcance:** colecciones, campos, referencias, índices, transacciones, riesgos de integridad, pruebas recomendadas y decisiones pendientes de todos los módulos (US-001 a US-017).

La base es la arquitectura vigente: driver oficial `mongodb` 7.7.0 sin ODM, Zod y replica set `rs0` (architecture.md L263 y L380-384). Estado actual del backend: `connect-database.ts` rechaza un MongoDB standalone y `env.ts` solo valida `PORT` y `MONGODB_URI`. No existen modelos, colecciones ni índices de negocio.

Para crear colecciones, validadores e índices hace falta una decisión (ver §7). Debería ser un "ensure" idempotente al arrancar, antes de escuchar. En MongoDB no se pueden crear índices dentro de transacciones sobre colecciones existentes.

## 1. Colecciones

| Colección | Propósito | TASK / US |
| --- | --- | --- |
| `accounts` | Cuenta compartida provisionada fuera de Kofi y hash de contraseña | TASK-001 (US-001) |
| `sessions` | Sesiones opacas revocables: presencia, expiración lógica a 120 s y cierre manual | TASK-002, 003, 005, 006 (US-001, US-002) |
| `categories` | Categorías con nombre único, versión y contador técnico de productos | TASK-020 (US-008); la consumen TASK-016, 018, 022 y 024 |
| `products` | Catálogo; nunca se elimina | TASK-016, 018, 022 y 024 (US-006 a US-010) |
| `sales` | Venta completa en un documento con snapshots; inmutable | TASK-030 (US-013); la leen TASK-008, 012, 014 y 033-036 |
| `operations` | Registro (ledger) de identidades de operación: registrada o cerrada | TASK-030 y TASK-031 (US-013 CA-03, CA-08 y CA-09) |

Lo que no se persiste:

- Selección y venta en curso: solo en memoria (US-010 CA-04/05, L25-26).
- Evidencia de revisión: va firmada con HMAC y no se guarda ni caduca (US-012 L38).
- Contadores materializados del Dashboard: no los hay (architecture L319).
- Pedidos: no existen.
- Imágenes: el archivo vive en el volumen del backend (architecture L306); en MongoDB solo hay metadatos embebidos en el producto.
- Un posible `images` depende de una decisión pendiente (§7).

**Por qué hace falta `operations` y no basta `sales` más una colección de "cerradas".** Las transacciones de MongoDB usan aislamiento de snapshot, que permite *write skew*. Si "registrar" lee las cerradas e inserta la venta mientras "cerrar" lee las ventas e inserta la cerrada, escriben documentos distintos y ambas confirman. El resultado sería una identidad registrada y cerrada a la vez, lo que viola US-013 L40 y CA-08. Ambas operaciones deben escribir el mismo documento clave, y eso lo resuelve `operations`.

Sobre el nombre: las convenciones piden plural y minúsculas (conventions.md L19 y L26). Si se prefiere un nombre compuesto, la L26 no fija el separador; eso queda pendiente.

## 2. Campos por colección

Tipos BSON. "Oblig." indica si el campo es obligatorio. En JSON, `_id` se expone como `id`: hex de 24 caracteres en minúsculas (architecture L281). Los importes `…Tenths` y las cantidades son enteros seguros de 1 a 9007199254740991 (US-011 CA-07, L29).

### `accounts`

| Campo | Tipo | Oblig. | Origen |
| --- | --- | --- | --- |
| `_id` | ObjectId | sí | — |
| `username` | string | sí | US-001 L5 y L13 |
| `passwordHash` | string (formato PHC) | sí | "hash resistente y salado" (architecture L294); algoritmo y parámetros pendientes (L298) |
| `createdAt`, `updatedAt` | date | sí | — |

### `sessions`

| Campo | Tipo | Oblig. | Origen y comentario |
| --- | --- | --- | --- |
| `_id` | ObjectId | sí | Interno |
| `accountId` | ObjectId → `accounts` | sí | Referencia `<entidad>Id` |
| `tokenHash` | string (SHA-256 del token opaco) | sí | Sesión opaca (US-001 L43). Nunca se guarda el token en claro |
| `tabBinding` | pendiente | — | El mecanismo de identidad de pestaña no está aprobado (architecture L297). No modelarlo hasta resolverlo |
| `createdAt` | date | sí | — |
| `lastPresenceAt` | date | sí | US-001 CA-08 (L30) |
| `expiresAt` | date | sí | `lastPresenceAt + 120 s`; en el cierre manual, el instante del cierre |
| `revokedAt` | date \| null | sí | Cierre manual (US-002 CA-02, L22) |
| `endReason` | `manual` \| `unload` \| null | no | Aviso de salida de mejor esfuerzo (US-001 L35). Opcional, solo diagnóstico |

### `categories`

| Campo | Tipo | Oblig. | Origen |
| --- | --- | --- | --- |
| `_id` | ObjectId | sí | Identidad estable (US-008 CA-03, L24) |
| `name` | string, recortado, 1-80 caracteres visibles | sí | US-008 CA-06 (L27) |
| `nameKey` | string | sí | Clave de comparación: recorte más minúsculas, sin plegar acentos (US-008 L16 y CA-02, L23) |
| `productCount` | int ≥ 0 | sí | Contador técnico que incluye inactivos (architecture L304-305; US-008 CA-04, L25) |
| `version` | int ≥ 1 | sí | Control optimista propio (architecture L303; US-008 CA-05, L26) |
| `createdAt`, `updatedAt` | date | sí | — |

`productCount` **no** incrementa `version`. Si lo hiciera, asignar un producto haría fallar un renombrado concurrente, y la regla aprobada es "las categorías tienen su propio control" (architecture L303).

### `products`

| Campo | Tipo | Oblig. | Origen |
| --- | --- | --- | --- |
| `_id` | ObjectId | sí | Identidad estable (US-007 CA-01, L22) |
| `name` | string, 1-100 caracteres | sí | US-006 L36 |
| `nameKey` | string | sí | US-006 CA-02 (L23): unicidad global que incluye inactivos |
| `description` | string, 1-1000 caracteres | sí | US-006 L36 |
| `priceTenths` | int/long/double entero ≥ 1 | sí | US-006 CA-03 (L24); architecture L273 |
| `categoryId` | ObjectId → `categories` | sí | Exactamente una categoría (US-006 CA-01, L22) |
| `image` | subdocumento \| null | sí | `{ fileId: string generado, mediaType: 'image/jpeg' \| 'image/png' \| 'image/webp', byteSize ≤ 5242880, width ≤ 4096, height ≤ 4096 }` (US-006 L37-38; US-007 CA-01, L22). `null` representa el marcador neutro |
| `active` | bool | sí | `true` al crear (US-006 CA-06, L27); US-009 |
| `version` | int ≥ 1 | sí | Compartida entre edición y activación (US-007 L31; US-009 CA-05, L25) |
| `createdAt`, `updatedAt` | date | sí | — |

- **Referencia y no embebido para la categoría.** El renombrado de la categoría debe verse en todos sus productos sin reescribirlos (US-008 CA-03).
- **Imagen embebida.** Es una relación 1:1 que siempre se lee junto con el producto.
- **El nombre de categoría no se duplica en el producto.**

### `sales` (núcleo)

| Campo | Tipo | Oblig. | Origen |
| --- | --- | --- | --- |
| `_id` | ObjectId | sí | Referencia de la venta para el detalle (US-015, TASK-034, L63) y desempate de la paginación (US-014 L87) |
| `operationId` | string, UUID v4 en minúsculas | sí | US-013 L39-40; architecture L281 |
| `paymentMethod` | `cash` \| `qr` | sí | US-013 CA-01 (L23); architecture L282 |
| `registeredAt` | date (UTC, milisegundos) | sí | Instante del servidor al guardar (US-013 CA-02, L24; P7, L79) |
| `lines` | array, ≥ 1 elemento | sí | Venta completa en un documento (architecture L313) |
| `lines[].productId` | ObjectId → `products` | sí | Identidad estable para agrupar (US-004 CA-02; US-017 CA-02) |
| `lines[].productName` | string | sí | Snapshot del nombre de la revisión confirmada (US-012 CA-05, L26; US-015 CA-02, L23) |
| `lines[].unitPriceTenths` | entero | sí | Snapshot del precio (US-013 CA-02) |
| `lines[].quantity` | entero ≥ 1 | sí | US-011 CA-01 |
| `lines[].subtotalTenths` | entero | sí | Es `unitPriceTenths × quantity` (US-011 CA-03) y lo recalcula el backend |
| `totalTenths` | entero | sí | Suma de subtotales. Fuente de los ingresos (US-003 CA-03; US-016 CA-03) |

- **Snapshots embebidos.** El catálogo no los reescribe (architecture L313; US-007 CA-05, L26).
- **Fuente de los snapshots.** Nombre y precio salen de la evidencia confirmada, no de una relectura del catálogo al registrar (architecture L312; US-012 L39).
- **Nombre actual por referencia.** El Dashboard y US-017 resuelven el nombre actual con `$lookup` por `productId` (US-004 CA-02; US-017 CA-02).
- **Unidades por venta en el historial.** Para US-014 CA-05 (L27) se calculan en la proyección con `$sum: '$lines.quantity'`. Las líneas son inmutables, así que guardarlas como campo (`unitsCount`) también sería seguro; queda como opción si se prefiere.
- **Sin `version`.** No hay edición, anulación ni corrección (US-013 L16; US-015 CA-05).
- **Una línea por producto.** Zod debe rechazar `productId` repetidos en `lines`, porque la selección suma unidades al mismo producto (US-010 CA-03, L24). Esto evita líneas duplicadas que distorsionen el detalle.

### `operations`

| Campo | Tipo | Oblig. | Origen |
| --- | --- | --- | --- |
| `_id` | string = `operationId` | sí | Clave interna, no se expone. Usarla como `_id` ahorra un índice único secundario |
| `status` | `registered` \| `closed` | sí | US-013 L40 |
| `saleId` | ObjectId \| null | sí | `registered` apunta a la venta |
| `requestHash` | string \| null | sí | SHA-256 del contenido canónico (evidencia tal como se recibió más `paymentMethod`). Permite devolver el mismo resultado ante el mismo contenido o detectar el conflicto ante uno distinto (architecture L286 y L314). `null` en las identidades cerradas por conciliación sin contenido |
| `closedReason` | `reconciled` \| `rejected` \| null | sí | Conciliación terminal (US-013 L40) o rechazo definitivo con `operationId` legible (architecture L286; US-013 L38) |
| `rejectionCode` | string \| null | sí | Para repetir el mismo código ante el mismo contenido rechazado (architecture L286) |
| `createdAt` | date | sí | — |

Retención indefinida (US-013 L40).

## 3. Índices

Además de `_id` en cada colección:

| Colección | Definición | Consulta que lo justifica | Por qué no basta otro |
| --- | --- | --- | --- |
| `accounts` | `{ username: 1 }`, unique | Login con `findOne({ username })` (TASK-001, US-001 L96) | Es protección de integridad: impide dos cuentas con el mismo usuario, lo que haría ambiguo el login. Con una sola cuenta no es una necesidad de rendimiento |
| `sessions` | `{ tokenHash: 1 }`, unique | Cada petición autorizada y cada señal de presencia: `findOne` o `updateOne({ tokenHash, revokedAt: null, expiresAt: { $gt: now } })` (TASK-003, US-001 L117; TASK-002) | Es la única clave de búsqueda; sin el índice cada petición recorre toda la colección |
| `sessions` | `{ expiresAt: 1 }`, TTL `expireAfterSeconds: R` | **Ninguna consulta de lectura.** Solo es limpieza de una colección que crece con cada login | Lo permite architecture L295, que aclara que el TTL no sustituye la expiración lógica. Es opcional; la retención R queda pendiente (§7) |
| `categories` | `{ nameKey: 1 }`, unique | Alta y renombrado con nombre duplicado → E11000 → `DUPLICATE_NAME` (US-008 CA-02 y su verificación de altas y renombrados simultáneos, L34) | Comprobar antes de escribir no resiste la concurrencia; solo el índice único la garantiza |
| `products` | `{ nameKey: 1 }`, unique | Igual para productos (US-006 CA-02 y L42; TASK-016 L93: "debe sostenerse ante altas simultáneas y cambios de nombre") | Ídem |
| `sales` | `{ operationId: 1 }`, unique | Mandato explícito "índice único en la venta" (US-013 L40). Es defensa en profundidad frente a una venta duplicada aunque falle la lógica del registro | `operations._id` ya decide la exclusión mutua, pero la spec exige la unicidad en la venta y su coste es mínimo |
| `sales` | `{ registeredAt: -1, _id: -1 }` | (a) Historial con paginación por clave: `{ registeredAt: { $gte: inicioUtc, $lt: finExclUtc, $lte: cutoffAt }, $or: [{ registeredAt: { $lt: lastAt } }, { registeredAt: lastAt, _id: { $lt: lastId } }] }` ordenado `{ registeredAt: -1, _id: -1 }` con `limit 51` (US-014 CA-06, L28; L87-89). (b) El `$match` por rango de la lectura del Dashboard `today`/`month` (TASK-008, 012, 014). (c) El `$match` de resumen y ranking del rango (TASK-035, 036) | El orden con desempate por identidad exige un índice compuesto. Uno solo sobre `registeredAt` obligaría a ordenar en memoria para el desempate. Este índice cubre a la vez los rangos del Dashboard y del Historial, así que no hacen falta más índices sobre `sales` |

Índices que **no** se proponen, con su razón:

- `products.categoryId`: la eliminación protegida usa el contador, no un `count` por categoría (architecture L304).
- `products.active` o `{ active, nameKey }`:
  - El listado administrativo carga todo el catálogo sin paginar (US-006 CA-08).
  - La búsqueda por subcadena no aprovecharía un índice.
  - El orden "alfabético" no coincide con el orden binario de `nameKey` (`ñ` y las letras con tilde quedan después de la z).
  - El catálogo de venta (US-010) también lee todos los activos.
  - Conviene revisarlo solo si el catálogo crece mucho.
- `sales.lines.productId` y `sales.paymentMethod`: ninguna consulta filtra por ellos. Se agrupa después del `$match` por fecha.

## 4. Operaciones con transacción o escritura condicional

Todas las transacciones se hacen con `session.withTransaction`, `readConcern: 'snapshot'` y `writeConcern: { w: 'majority' }`. El callback debe ser **reejecutable**: el driver reintenta `TransientTransactionError`. No se escriben ni borran archivos de imagen dentro del callback.

1. **Login (TASK-001 y 002).** Un `insertOne` en `sessions`, sin transacción. No toca las otras sesiones (US-001 CA-04).
2. **Presencia y autorización (TASK-002 y 003).** `updateOne({ tokenHash, revokedAt: null, expiresAt: { $gt: now } }, { $set: { lastPresenceAt: now, expiresAt: now + 120s } })`.
   - Si `matchedCount = 0`, responde 401. Así una señal tardía no revive la sesión (US-001 CA-09, L31; architecture L295).
   - El reloj debe ser **uno solo**: un reloj de la aplicación inyectado y controlable en pruebas (US-001 L52). No mezclar con `$$NOW`.
3. **Cierre manual (TASK-006).** `updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: now, expiresAt: now } })` (US-002 CA-02).
4. **Crear producto (TASK-016).** En una transacción:
   - `categories.updateOne({ _id: categoryId }, { $inc: { productCount: 1 } })`. Si `matchedCount = 0`, la categoría no existe y se aborta.
   - `products.insertOne`. E11000 → `DUPLICATE_NAME`.
   - Al escribir en el documento de la categoría, compite con su eliminación (architecture L304).
5. **Editar producto (TASK-018).** `products.updateOne({ _id, version }, { $set: …, $inc: { version: 1 } })`.
   - `matchedCount = 0` → se relee: no existe → 404; existe → `VERSION_CONFLICT`.
   - Si cambia la categoría, en la misma transacción: `$inc: -1` en la anterior y `$inc: +1` en la nueva, esta última con verificación de existencia.
   - Sin cambio de categoría basta una sola escritura condicional.
6. **Activar o desactivar (TASK-022).** La misma escritura condicional sobre `version`, sin transacción y sin tocar el contador. Una edición y una desactivación sobre la misma versión no pueden ganar ambas (US-007 L31).
7. **Renombrar categoría (TASK-020).** `updateOne({ _id, version }, { $set: { name, nameKey }, $inc: { version: 1 } })`. E11000 → `DUPLICATE_NAME`.
8. **Eliminar categoría (TASK-020).** `deleteOne({ _id, version, productCount: 0 })`.
   - Si una transacción de asignación tiene pendiente su `$inc` sobre ese documento, el borrado choca con ella (conflicto de escritura o espera hasta que confirme). Después ve `productCount ≥ 1` y no borra.
   - `deletedCount = 0` → se relee y se clasifica: 404, `VERSION_CONFLICT` o `CATEGORY_NOT_EMPTY`.
9. **Registrar venta (TASK-030).** Antes de la transacción: validar con Zod, verificar el HMAC de la evidencia, exigir que las líneas coincidan con ella, recalcular subtotales y total con comprobación de enteros seguros y calcular `requestHash`. Después, en una transacción:
   - `operations.insertOne({ _id: operationId, status: 'registered', saleId, requestHash, … })`.
   - `sales.insertOne({ _id: saleId, operationId, registeredAt: now, … })`.
   - Si `operations` da E11000, se lee el documento existente:
     - `registered` con el mismo hash → se devuelve el mismo 201 y el mismo cuerpo, reconstruido desde la venta (US-013 CA-03 y CA-05).
     - `registered` con otro hash → `OPERATION_CONFLICT`.
     - `closed` → `OPERATION_CLOSED`, o el `rejectionCode` guardado si el hash coincide (architecture L286).
   - Un doble envío simultáneo produce un conflicto de escritura; el reintento entra en esta rama.
   - El aviso SSE se emite **solo después** de confirmar (TASK-010; US-003 L119).
10. **Rechazo definitivo con `operationId` legible.** `operations.insertOne({ status: 'closed', closedReason: 'rejected', rejectionCode, requestHash })`.
    - Si da E11000, se aplica la misma clasificación que en el punto 9.
    - Es un único documento y no necesita transacción.
    - Con un 413 o un JSON mal formado no hay identidad que cerrar (architecture L286).
11. **Conciliación terminal (TASK-031).** Se lee `operations` con `readConcern: 'majority'`:
    - `registered` → se devuelve la venta.
    - `closed` → "no registrada".
    - No existe → `insertOne({ status: 'closed', closedReason: 'reconciled' })` con `w: 'majority'`.
      - Si da E11000, otro proceso escribió entre la lectura y el insert: se relee y se responde según el estado.
      - Solo después se responde "no registrada" (US-013 L40).
    - El registro y la conciliación compiten por la misma clave, así que es imposible que ambos ganen.
12. **Lecturas agregadas.**
    - **Dashboard.** `$match` por rango, que usa el índice. Después un `$facet` con tres ramas:
      - Resumen: conteo, suma de `totalTenths` y conteo por método.
      - Productos: `$unwind lines`, `$group` por `productId` con `$sum` de cantidades, `$sum` de subtotales y `$max` de `registeredAt`, y orden `{ lastSoldAt: -1, _id: 1 }` (US-004 CA-03).
      - Horas: `$hour` con `timezone: 'America/La_Paz'`, rellenando con ceros en la aplicación hasta 24 entradas.
      - Por último, `$lookup` a `products` por `_id` para el nombre actual.
    - **Historial (lista, resumen y ranking).** El mismo `$match` con `cutoffAt`.

## 5. Riesgos de integridad y mitigación

- **Ventas duplicadas.** Se cubren con la clave única de `operations._id`, el índice único de `sales.operationId`, la transacción y el hash de contenido. Sin la exclusión común en `operations`, existe el *write skew* descrito en §1.
- **Resultado de commit desconocido** (`UnknownTransactionCommitResult` o timeout). Se responde 500 sin código definitivo y el cliente concilia. La conciliación con lectura `majority` evita informar "registrada" de una escritura que luego se revierte por un failover.
- **Referencias huérfanas.**
  - Productos: no hay eliminación definitiva (US-009 CA-04, L24), así que `lines[].productId` siempre se resuelve, también para inactivos (US-017 CA-05).
  - El `$lookup` debe tratar un producto ausente como fallo interno (500), no como fila sin nombre.
  - Categorías: el contador y las escrituras en la misma transacción evitan productos con una categoría eliminada.
  - **Deriva del contador** por un error de código: hace falta una prueba de invariante (§6) y, si se autoriza, un chequeo de solo lectura.
- **Snapshots.** Las ventas no se actualizan nunca. Si se autoriza, se puede añadir un usuario de base de datos sin permisos `update`/`remove` sobre `sales` (operativo, pendiente).
- **Zona horaria y límites de fecha.**
  - Los rangos se calculan como medio abierto `[00:00 La Paz del inicio, 00:00 La Paz del día siguiente al fin)`, convertidos a UTC en Node con `Intl` y la zona `America/La_Paz`. No se fija un "−4" en el código, aunque hoy Bolivia no tenga horario de verano.
  - `$hour` en MongoDB usa su propia base de datos de zonas: probar que Node y MongoDB coinciden.
  - `periodEndsAt` y "mes" se calculan con la misma función que comparten TASK-008 y TASK-033.
  - `registeredAt` debe ser un BSON Date, nunca un string.
- **Corte del historial y commits tardíos.** `registeredAt` se asigna antes del commit (lo reconoce US-014 L89). Una venta confirmada después de la primera consulta, pero con `registeredAt ≤ cutoffAt`:
  - puede aparecer en una página posterior sin estar en el resumen ni en el ranking leídos con el mismo corte;
  - o puede quedar en una página ya recorrida.
  - La paginación por clave evita repeticiones, pero no esta incoherencia. Queda como decisión pendiente (§7).
- **Dinero y rango numérico.**
  - El driver guarda como int32 los enteros que caben y como double los mayores. `$sum` pasa de int a long a double, y los long que exceden 53 bits llegan a JS como `Long`.
  - El backend debe verificar `Number.isSafeInteger` en cada suma agregada y responder 500 si no lo es (US-003 L134). Como los valores son positivos, la suma crece de forma monótona y el desborde siempre se detecta.
  - Ticket promedio (US-016 CA-05, L27): `q = floor(t / n)`, `r = t − q·n`; si `2r ≥ n`, entonces `q + 1`. Así nunca se calcula `2t`, que podría salir del rango seguro.
- **Sesiones concurrentes.** Cada sesión es un documento independiente y se cierra solo la propia. Las condiciones del filtro impiden revivir una sesión. El TTL puede borrar documentos, pero un documento ausente equivale a 401, lo que es coherente.
- **Comparación de nombres.** `toLowerCase()` de JS y la colación ICU difieren en casos raros. Además, una "é" compuesta (NFC) y otra descompuesta (NFD) generarían claves distintas para el mismo carácter visible (§7).
- **Imágenes.** Un fallo entre escribir el archivo y actualizar el producto deja archivos huérfanos. El archivo anterior solo se borra después del commit (US-007 CA-06, L27). Hace falta un barrido que compare el volumen con `products.image.fileId`; con un recorrido completo basta, sin índice.

## 6. Validaciones y pruebas de integración recomendadas

Todas con el replica set local aislado y `test:integration`:

1. **Unicidad concurrente.** N altas o renombrados paralelos con el mismo nombre de producto y de categoría, con mayúsculas y espacios distintos → exactamente una gana. Los acentos distintos se aceptan (US-008 L34).
2. **Asignación contra eliminación.** Crear un producto o reasignarlo mientras se elimina la categoría, en paralelo y repetido → nunca queda un producto con `categoryId` inexistente. Invariante: `productCount == count(products where categoryId)`, incluidos inactivos.
3. **Versiones.** Edición contra edición, edición contra activación y activación contra activación sobre la misma versión → solo una aplica. Las operaciones sobre productos distintos no se bloquean (US-007 CA-03/04; US-009 CA-05).
4. **Venta idempotente.**
   - Doble envío simultáneo del mismo `operationId` y contenido → una venta y una entrada en `operations`; misma respuesta.
   - Mismo id con otro contenido → `OPERATION_CONFLICT`.
   - Repetición tras reiniciar el backend.
   - Fallo inyectado entre los dos inserts → ni venta ni entrada en `operations`.
5. **Conciliación contra envío tardío.** Conciliar antes del envío y luego enviar → `OPERATION_CLOSED`. Las dos operaciones en paralelo → un solo estado final coherente (US-013 CA-08).
6. **Rechazo definitivo con id legible.** El mismo contenido después del rechazo devuelve el mismo código; el envío válido posterior con ese id → `OPERATION_CLOSED`.
7. **Snapshots.** Registrar, luego renombrar, cambiar el precio y desactivar → el detalle conserva lo original. El Dashboard y el ranking agrupan por identidad con el nombre actual.
8. **Límites horarios.** Ventas a las 23:59:59.999 y a las 00:00 de La Paz, primer y último día del mes, febrero bisiesto, "mes anterior" en enero. Comparar Node y `$hour` de MongoDB, con una zona del proceso distinta (`TZ`) para demostrar independencia.
9. **Paginación.** Más de 100 ventas, incluidas varias con el mismo milisegundo → sin omisiones ni repeticiones. Una venta registrada durante el recorrido no aparece hasta refrescar.
10. **Coherencia entre bloques.** En el Dashboard, `cash + qr = salesCount`, la suma de productos coincide con los ingresos y la suma de horas con el conteo. En el Historial, la suma por método coincide con los ingresos.
11. **Rango numérico.** Sumas en `MAX_SAFE_INTEGER` y por encima → 500, nunca un valor truncado. Unitarias del redondeo del ticket (3/2 → 2).
12. **Sesiones con tiempo controlado.** Una señal a los 119.999 s renueva; a los 120 s ya no. Una señal tardía no revive la sesión. El cierre de una sesión no afecta a las demás.
13. **Validadores `$jsonSchema`.** Rechazan documentos con tipos o enums inválidos aunque se salte Zod (defensa en profundidad).

## 7. Decisiones pendientes para el responsable

1. **Contradicción en el desempate de US-017.** CA-04 compara nombres "sin distinguir mayúsculas ni tildes" (L26) y la L42 afirma que el desempate es total porque los nombres son únicos. Pero la unicidad de US-006 **conserva** los acentos: "Café" y "Cafe" pueden coexistir y empatar en la comparación sin tildes. Se propone `productId` ascendente como último desempate, pero requiere aprobación.
2. **Normalización Unicode de `nameKey`.** ¿Se aplica NFC antes de comparar? No es plegar acentos, pero evita que el mismo carácter visible genere dos claves. También hay que decidir entre clave derivada con JS (recomendada) y colación ICU de fuerza 2 en el índice.
3. **Orden "alfabético"** del listado administrativo (US-006 CA-08) y de categorías (sin orden definido en US-008). ¿Con colación `es`? No afecta a los índices propuestos.
4. **Incoherencia del corte del historial** (§5): aceptarla y documentarla; o leer páginas y agregados en un snapshot con `atClusterTime`, que está limitado por la ventana de historial de MongoDB (unos 5 min por defecto); o aplicar un margen de commit al corte. Esta última opción afecta a la verificación de CA-07 de US-014.
5. **Nombre de la colección `operations`** y si se acepta `_id = operationId` (string) como clave interna no expuesta.
6. **Código ante contenido distinto con una identidad cerrada por rechazo:** `OPERATION_CLOSED` u `OPERATION_CONFLICT`. Hay que fijar la precedencia.
7. **Códigos de clasificación ante escrituras condicionales fallidas.** Precedencia entre 404, `VERSION_CONFLICT` y `CATEGORY_NOT_EMPTY` al eliminar. Código ante una categoría inexistente al crear o reasignar un producto: ¿404 o `VALIDATION_ERROR` con `NOT_ALLOWED`?
8. **Sesiones.** Mecanismo de pestaña y su campo (bloqueante, architecture L297); algoritmo y parámetros del hash; retención R del TTL, o si no hay TTL; si `username` distingue mayúsculas.
9. **Flujo de imágenes.**
   - ¿Carga en dos pasos? En ese caso haría falta una colección `images` para los archivos aún no asignados.
   - ¿Carga en la misma petición multipart? Sin colección adicional.
   - También queda por decidir el barrido de huérfanos.
10. **Gestión del esquema.** Dónde viven los "ensure" de colecciones, validadores e índices (al arrancar el servidor o un script), y qué nivel tienen los validadores (`validationLevel: strict`, `validationAction: error` recomendados).
11. **Operativo.** Usuarios de base de datos con privilegios mínimos (sin update/delete sobre `sales`) en el entorno local y en Atlas.
12. **Fuera del ámbito de la base de datos, pero necesario para TASK-028 y TASK-030:** el secreto HMAC de la evidencia aún no está en `env.ts`.

## Fuentes consultadas

- `docs/ai-context/architecture.md`
- `docs/ai-context/conventions.md`
- `docs/specs/us-001-iniciar-sesion.md` a `docs/specs/us-017-identificar-productos-mas-vendidos.md`
- `docs/specs/antecedente-consultar-seleccionar-productos.md`
- `docs/progress/tracker.md`
- `backend/src/shared/database/connect-database.ts`
- `backend/src/shared/config/env.ts`

No se ejecutaron validaciones, comandos ni pruebas.
