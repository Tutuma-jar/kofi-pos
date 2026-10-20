# Historial y reportes — entrega frontend

Interfaz de US-014 a US-017 en `/history`, protegida por el acceso existente.
Autorizada por la solicitud explícita del responsable del 2026-10-20, desde la sesión principal, sin subagentes. No implementa TASK de backend.

## Alcance y uso

- Hoy por defecto según el servicio; atajos Hoy, Últimos 7 días, Este mes y Mes anterior.
- Inicio/fin inclusivos en `America/La_Paz`; sin futuro y hasta 366 días.
- Ventas más recientes primero, 50 por página, siguiente/anterior y actualización manual.
- Detalle de solo lectura con nombres, cantidades, precios e importes históricos.
- Resumen de todo el rango: ventas, ingresos, efectivo/QR y ticket promedio.
- Hasta 10 productos por unidades, ingresos secundarios, nombres actuales e inactivos incluidos.
- Carga, vacío, error de consulta/detalle/reportes y reintento diferenciados. Un refresco fallido conserva datos anteriores como **no actualizados**. Un borrador de fechas inválido o sin consultar oculta los resultados.

No hay búsqueda, número visible de venta, filtro por método, gráficos, exportación, impresión, comparación, escrituras ni tiempo real: están excluidos por las historias.

El aviso **Datos de demostración** permanece visible también en producción. Abre ese aviso para probar carga lenta, ausencia de ventas y errores de consulta, reportes, detalle o venta no encontrada. Para un rango sin resultados, consulta por ejemplo 01/01/2020 a 01/01/2020. Vuelve a «Ventas de ejemplo» para recuperar la fuente. No son ventas comerciales.

## Archivos y sustitución de API

- `api/contract.provisional.ts`: única definición de peticiones/resultados/errores y puerto `HistoryClient`.
- `api/demo-client.ts`: transporte **en memoria** mediante el cliente HTTP compartido de Acceso. No usa `fetch`, MongoDB ni almacenamiento del navegador. `kofi-demo.invalid` es simbólico y nunca se envía a la red; no propone un endpoint real.
- `api/fixtures.ts`: listado, detalle y reportes coherentes, con medianoche de Bolivia, empates de hora, producto renombrado y desactivado. Importes enteros en décimas de BOB.
- `api/dates.ts`: presentación BOB/fechas y validación de ayuda al operador; no sustituye validación autoritativa.
- `state/useHistory.ts`: lecturas cancelables e invalidación de respuestas tardías, incluso si el transporte ignora abortos.
- `components/`: filtros, tabla, resumen/ranking y diálogo histórico, sin agregaciones ni ordenaciones comerciales.
- `pages/HistoryPage.tsx` y CSS Module: composición, estados y adaptación.

**Supuestos pendientes de aprobación de backend:** nombres de DTO/códigos, lectura conjunta de lista/resumen/ranking y representación de errores parciales de reportes. Se respetan las decisiones aprobadas: fechas `AAAA-MM-DD`, fecha actual del servicio, UTC para instantes, dinero `…Tenths`, página de 50 y cursor opaco por última clave con corte común. Los cursores anteriores viven en `api/`, no en la UI. El servicio simulado devuelve agregaciones y orden; no son reglas autoritativas del navegador.

TASK-033 a TASK-036 deben aprobar/conectar el transporte real (sin fallback a fixtures), conservar autorización/401 mediante el cliente HTTP existente, sustituir la instancia de demostración de la página y verificar criterios integrados. Los componentes aceptan `HistoryClient` sin rediseño. Quedan pendientes coherencia con Dashboard/ventas reales, concurrencia y persistencia; los fixtures de otros módulos son independientes y no se modifican.

## Diseño y cierre de revisión

Impeccable, modo Operate: estructura fijada por el encargo, no nueva identidad. Navegación compartida; encabezado, rango común y dos áreas funcionales: historial compacto y reporte separado. P conservada mediante tokens compartidos, Fraunces y Source Sans 3 locales. Sin cambios a `DESIGN.md`, tokens ni estilos de Acceso, Dashboard, Menú o Ventas.

Revisión final realizada aquí, **sin revisor delegado**, por prohibición explícita del encargo. Resultado Impeccable: `ship` al alcance de capturas y comportamientos inspeccionados; detector `detect --json` sobre página, CSS y componentes: `[]`. No certifica accesibilidad integral ni contratos reales.

| Revisión Emil: antes                      | Después                                     | Motivo                                    |
| ----------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| Filas de 63 px                            | 45 px; acción con mínimo 44 px              | Densidad sin perder área de interacción   |
| Anuncio de carga duplicado                | Un estado principal y anuncio de página     | Menos ruido para lectores de pantalla     |
| Posible movimiento por operación repetida | Sin animaciones en filtros, tabla o diálogo | Respuesta inmediata y movimiento reducido |

React Best Practices posterior: cliente inicializado perezosamente, lectura conjunta sin cascada de consultas, imports directos, validación/rango derivados sin efectos de sincronización, limpieza de abortos y respuestas obsoletas; detalle dependiente de referencia primitiva. Sin Next.js, dependencias adicionales, memoización especulativa ni refactorización ajena.

## Evidencia local — 2026-10-20

Revisión: cambios de esta entrega desde `origin/develop` `0aa2ee2871d3b62a10a94fb944c9003b2b2fee9d`, en `feat/ui-historial-reportes`.

- `npm run typecheck --workspace @kofi/frontend`: correcto.
- `npm run build --workspace @kofi/frontend`: correcto.
- `npm run test --workspace @kofi/frontend -- src/history src/App.test.tsx`: **44 pruebas, 3 archivos, correctas**. Fechas/atajos/límites, BOB, corte/cursor, coherencia de fixtures, estados/reintentos, snapshots, paginación, validación, cancelación/respuestas antiguas y regresión de rutas compartidas.
- `node frontend/src/history/history-flow.browser.mjs`: correcto, Chromium con zona `Asia/Tokyo` y movimiento reducido. 1280×720 y 1366×768 con menú abierto/cerrado, filtros accesibles, sin desbordamiento horizontal de página; scroll interno, teclado/foco visible, diálogo/Escape/restauración, paginación/refresco, errores/vacíos, consultas sucesivas, navegación y ruta protegida. Adaptación adicional 390×844. **Cero llamadas a `/api` y cero errores JavaScript** en el recorrido autenticado simulado.
- Capturas locales no versionadas: `.impeccable/review/history/`, tamaños en los nombres; inspeccionadas las dos dimensiones, navegación, detalle, error, vacío y ancho estrecho. Navegación/modal capturados en viewport para no alterar media queries/top-layer con `fullPage` de Chromium.
- Prettier aplicado solo a archivos afectados. Sin dependencias nuevas.
- Control local `kofi-check verify`: requisitos, alcance y 177 enlaces correctos; devuelve pendiente de aplicación/verificaciones externas por su limitación conocida, sin ejecutar pruebas del POS. El principal contrastó las verificaciones esenciales externas anteriores, todas correctas, y el diff completo desde la base; no se modifica ni se elude el control.

Los primeros intentos del recorrido detectaron supuestos incorrectos de sus selectores/esperas: texto del ranking con posición, foco tras ratón, label con opciones y espera de carga sin tabla. Se corrigió el script; el recorrido final pasó completo. La captura full-page de la barra lateral alteraba temporalmente su media query: se capturó el viewport real sin cambiar el layout.

No acredita DoD, aceptación integrada, pruebas remotas ni integración en `develop`. Tracker conservado.
