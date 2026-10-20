# Gestión de ventas — entrega de interfaz

Historias: [US-010](../../../../docs/specs/us-010-consultar-seleccionar-productos-venta.md), [US-011](../../../../docs/specs/us-011-ajustar-revisar-venta-en-curso.md), [US-012](../../../../docs/specs/us-012-revisar-cambios-catalogo-antes-cobro.md) y [US-013](../../../../docs/specs/us-013-registrar-venta-pagada.md).

Rama: `feat/ui-gestion-ventas`, desde `origin/develop` `62260d092478c8f9c5afe76843da1fb85a38c16a`. Implementación conjunta del frontend, sin TASK, subagentes ni modificación de especificaciones o tracker. El commit de entrega contiene este registro.

## Pantalla y recorrido

Ruta protegida `/sales`, accesible desde el menú hamburguesa compartido. Catálogo a la izquierda, búsqueda y categorías con productos activos; detalle de descripción en diálogo nativo y marcador neutro sin imagen. Panel de pedido a la derecha con cantidades editables, retiro explícito, precios unitarios, subtotales y total en BOB con un decimal.

Recorrido: seleccionar → revisar catálogo → confirmar explícitamente el total para cobrar → recibir dinero y elegir efectivo o QR → **Registrar venta ya pagada**. No hay método preseleccionado, comprobación automática del pago, pasos separados de confirmación del dinero, pedidos persistentes ni estados de cocina. Cambiar la selección invalida la revisión; un rechazo definitivo conserva las líneas y exige nueva revisión con otra identidad.

Estados: carga, catálogo vacío, búsqueda sin coincidencias, error de consulta, pedido vacío/con líneas, cantidades inválidas restauradas, cambios de precio, producto desactivado con retiro obligatorio, carrera al confirmar, revisión sin conexión, registro en proceso, éxito simulado, rechazo definitivo, resultado incierto, consulta/reintento de la misma operación y conciliación terminal simulada. El selector **Escenario simulado** permite reproducirlos sin modificar componentes ni datos reales. Cambiar un escenario no borra una operación incierta.

## Separación e integración futura

- `components/` y `pages/`: presentación, teclado y formularios; sin transporte ni fixtures comerciales propios.
- `state/`: Context/reducer sobre la navegación, selección y revisión solo en memoria de esta pestaña; bloqueo síncrono de acciones repetidas y descarte de respuestas obsoletas al terminar sesión.
- `api/contract.provisional.ts`: tipos de catálogo, líneas, cotización, revisión, pago, resultado y errores. Son supuestos de UI, no un contrato HTTP aprobado.
- `api/sales-client.ts`: composición sustituible; recibe el `AuthClient` existente. El futuro adaptador debe utilizar `auth.request`, con su autorización y cliente HTTP, sin crear otro mecanismo de acceso.
- `api/demo-client.ts` y `fixtures.ts`: servicio y catálogo exclusivamente simulados; ningún `fetch`, MongoDB, API comercial, SSE o evento del Dashboard.
- `api/amounts.ts`: cálculo demostrativo en décimas enteras; BigInt evita operaciones intermedias imprecisas, verifica enteros seguros y el límite provisional de 100 KB en UTF-8. No sustituye validación autoritativa ni la futura copia verificada del backend.
- `api/operation-references.ts`: antes del envío conserva únicamente UUID v4 opacos, bajo `kofi:sales:demo:pending:<uuid>` en localStorage; sin selección, evidencias, importes, métodos o credenciales. Su espacio de nombres no debe mezclarse con futuras operaciones reales. Un fallo de almacenamiento impide enviar. La referencia se elimina cuando el resultado definitivo aparece en pantalla.

Se conservan selección y revisión al cambiar de módulo. Se descartan al recargar/cerrar pestaña o finalizar sesión; `beforeunload` solicita advertencia cuando el navegador lo permite. El cierre manual permite cancelar y diferencia revisión confirmada sin enviar de operación ya enviada. Tras una salida solo queda la referencia; volver requiere autorización válida y no recupera el borrador. Sin resultado definitivo, nunca se habilita otra operación sustitutiva.

### Pendientes de backend, no garantías de esta demostración

Catálogo real de Menú, rutas/DTO/códigos aprobados, cálculos y validación autoritativos, relectura concurrente del catálogo, evidencia HMAC, snapshots y fecha del guardado, persistencia atómica e idempotencia duradera, conciliación entre procesos/pestañas frente a envíos tardíos y actualización comercial real del Dashboard.

El simulador mantiene evidencias, resultados y cierres **solo en memoria**; no persiste ventas ficticias. Tras reiniciar/recargar no puede acreditar un registro anterior: informa incertidumbre y permite demostrar la conciliación de una identidad en la nueva instancia. No equivale a recuperación comercial real ni garantiza idempotencia entre instancias. Las pruebas del simulador no acreditan la integración ni la DoD de las historias.

## Diseño y revisión

Solo **Impeccable**, por instrucción expresa del encargo; revisión realizada en la sesión principal, sin Emil, React Best Practices ni delegación. Modo Operate, composición fijada por el usuario: catálogo principal y panel lateral, total/acción fuera de las zonas con scroll. Se reutilizan Fraunces, Source Sans 3, tokens P, Button y AuthenticatedLayout. No se cambian tokens globales, dependencias ni estilos de otros módulos. Sin animaciones de entrada o adornos que retrasen el uso.

Revisión final acotada: **ship** para las dimensiones inspeccionadas; tipografía, fondo, superficies y controles concuerdan con P; catálogo y pedido se desplazan de forma independiente; total y acción permanecen visibles. Detector de Impeccable ejecutado una vez sobre los archivos afectados: `[]`. Los puentes PRODUCT.md/DESIGN.md y el sistema existente se conservan. Capturas locales ignoradas por Git en `.impeccable/review/sales/`: `1280-720.png`, `1366-768.png`, variantes `-nav` y `390-844.png` (comprobación adicional de adaptación). Sin nuevos recursos raster publicados.

## Verificación ejecutada — 2026-10-20

- `npm run typecheck --workspace @kofi/frontend`: correcto.
- `npm run build --workspace @kofi/frontend`: correcto, incluye TypeScript y Vite.
- `npm run test --workspace @kofi/frontend -- src/sales src/App.test.tsx`: **57 pruebas correctas**, 4 archivos; cantidades, límites, importes, catálogo, revisión/carreras, efectivo/QR, duplicación, rechazo, pérdida de respuesta, almacenamiento, navegación, descarte y recuperación. No se ejecutó la suite completa del POS.
- ESLint de `sales/` y los tres archivos de integración: correcto. Formato aplicado solo a archivos del encargo.
- `node frontend/src/sales/sales-flow.browser.mjs`: correcto con Chromium y Playwright ya disponible, sin instalaciones. Auth sustituido por fixture en el navegador, HTTP `/api/` interceptado: sin credenciales, backend ni MongoDB. Comprueba navegación, cantidades, Enter/Escape/Tab y retorno del foco, envío repetido, resultado perdido, consulta, recarga sin borrador y conciliación. Sin errores JavaScript de página.
- Medidas CSS 1280×720 y 1366×768 con menú abierto/cerrado y selección de seis productos: documento sin desbordamiento horizontal ni scroll general, footer del pedido dentro del viewport (borde inferior 699 y 747 px respectivamente), catálogo y detalle con `overflow: auto`. Comprobación adicional 390×844 sin desbordamiento horizontal, navegación modal y Escape funcionales; en móvil se permite scroll de página.

Las comprobaciones finales pasaron después de corregir un import sin uso, la configuración mutable del escenario, una espera asíncrona en la prueba de limpieza de referencia y el patrón de interceptación del script de navegador. El reinicio de OpenCode interrumpió una ejecución final; se completaron luego tipos, build y navegador reutilizando el servidor que seguía activo. No se atribuye CI remota, integración a develop ni verificación con servicios reales a estos resultados.
