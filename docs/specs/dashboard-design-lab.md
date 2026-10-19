# Exploración visual del dashboard de Kofi

## Solicitud y aprobación

El 2026-10-18 el usuario autorizó construir tres variantes de dashboard utilizando Impeccable, con la paleta `#CBB697`, `#501C1E`, `#572522`, `#EBDEBE` y la tipografía Google Fonts Fraunces de carácter suave. Esta es una exploración de diseño, no una historia de implementación del producto.

**Decisión posterior:** tras las exploraciones A–Q, el usuario eligió P como referencia de colores, fuentes y jerarquía del sistema de diseño, con disposición, densidad e imágenes funcionales adaptables a cada módulo. Las reglas vigentes y el flujo Impeccable → Emil se mantienen en [design-system.md](../ai-context/design-system.md); las menciones de selección pendiente que siguen documentan el contexto histórico de cada ronda. Esta decisión no modifica los prototipos ni autoriza código de aplicación.

**Límites funcionales vigentes:** las menciones de pedidos y acciones de venta en las exploraciones y evidencias siguientes son históricas o de demostración, no requisitos del MVP. El [Dashboard del producto](../ai-context/product.md#32-dashboard) consulta ventas registradas, sin contador de pedidos ni preparación o registro de ventas. [Administración del menú](../ai-context/product.md#33-administración-del-menú) solo mantiene el catálogo; [Gestión de ventas](../ai-context/product.md#34-gestión-de-ventas) concentra la selección y el registro, con historias y atomización todavía por definir. Esta aclaración autorizada el 2026-10-18 no modifica los prototipos ni sus evidencias históricas.

## Objetivo y límites

Comparar composición, densidad, distribución del color y tratamiento tipográfico antes de aprobar el sistema de diseño. Se conservan el [producto](../ai-context/product.md), las reglas de [diseño](../ai-context/design-system.md) y los puentes existentes.

- HTML, CSS y JavaScript independientes de la futura aplicación, sin React, backend, autenticación real o dependencias de paquetes.
- Mismos datos sintéticos entre variantes, en bolivianos; ningún dato representa ventas reales.
- Fuentes servidas localmente con su licencia; variaciones de peso y tamaño dentro de Fraunces, con suavidad 100.
- Para A–C, tonos claros y líneas derivados de la primera paleta; para D–F, las paletas de exploración descritas al final. Ninguna constituye una identidad de marca definitiva.
- Filtros, búsqueda y controles de demostración solo locales. No registrar ventas, integrar pagos, crear roles, inventario o KDS.
- No hooks, Live Mode, generación de imágenes, nuevos subagentes, commits ni cambios a los requisitos del MVP.

## Direcciones de los prototipos

Las tres son alternativas solicitadas, no una dirección elegida. El modo de Impeccable es Operate: una persona debe comprender la actividad del negocio antes de notar el estilo. La paleta y la tipografía están fijadas por el usuario, por lo que no se realizan sorteos de mundos visuales ni se sustituyen sus restricciones.

### A — Cálida

**Tesis:** un resumen amplio y tranquilo para leer el negocio entre atenciones. **Lenguaje:** crema, superficies marfil derivadas y burdeos en acciones. **Recorrido:** ingresos y volumen, evolución del día, productos y ventas recientes. **Primera vista:** navegación lateral clara, título amplio, resumen continuo y gráfico dominante con productos a su derecha. **Firma:** barras con detalles legibles, espacios generosos y curvas suaves. **Límite:** evitar que la amplitud desplace información importante fuera de una laptop.

### B — Minimalista

**Tesis:** reducir el contenedor para que los números y las relaciones hagan el trabajo. **Lenguaje:** superficie clara, líneas finas, tipografía contenida y burdeos puntual. **Recorrido:** navegación superior, resumen, evolución y distribución de cobros, luego detalle. **Primera vista:** sin barra lateral; gráfico horizontal extenso y contenido alineado en una retícula abierta. **Firma:** línea de ingresos y divisiones discretas en lugar de una pantalla de tarjetas. **Límite:** conservar acciones identificables, sin confundir simplicidad con falta de jerarquía.

### C — Compacta

**Tesis:** permitir comprobar actividad y ventas con menos desplazamiento. **Lenguaje:** lateral burdeos, contenido crema y separaciones precisas. **Recorrido:** cifras principales, tabla de actividad, gráfico y productos en una columna auxiliar. **Primera vista:** cabecera corta, resumen de alta densidad y ventas recientes como área principal. **Firma:** tabla amplia y análisis lateral, no una copia encogida de A. **Límite:** mantener tamaño de texto, foco y zonas de interacción cómodas.

## Criterios verificables

- Existe una galería con acceso independiente a A, B y C, y navegación entre variantes desde cada dashboard.
- Las variantes presentan los mismos importes, pedidos, ventas, productos y métodos de pago para el mismo período.
- La composición cambia realmente entre variantes, manteniendo los colores y la tipografía solicitados.
- Fraunces se carga localmente con suavidad 100; los encabezados y las etiquetas tienen jerarquía y contraste verificables.
- El cambio de período actualiza cifras y gráficos; la búsqueda filtra ventas y presenta un estado vacío recuperable.
- Las acciones sin implementación informan que son una demostración, sin simular operaciones exitosas reales.
- La navegación es utilizable con teclado, los controles tienen etiquetas y las páginas se adaptan a laptop y pantalla estrecha sin desbordamiento de página.
- Se revisan las tres composiciones en una ronda visual agrupada y se registran los resultados reales. Impeccable realiza un único escaneo mecánico de los archivos pertinentes, sin habilitar hooks.

## Cómo abrir y comparar

Desde la raíz: `node design-lab/serve.mjs`. Abrir `http://localhost:4173` y utilizar los enlaces de la galería. No requiere instalación de paquetes. También pueden abrirse los HTML directamente; el servidor facilita la carga y verificación uniforme de recursos locales.

La preferencia se comunica al responsable del proyecto; no se persiste una selección automáticamente. Después de elegir y refinar una variante se propondrá la actualización del documento oficial de diseño, sin reemplazar `DESIGN.md`.

## Recursos y procedencia

Fraunces procede de [Google Fonts](https://fonts.google.com/specimen/Fraunces), solicitada con los ejes `opsz=9..144`, `SOFT=100` y `wght=400..700`. El subconjunto latino WOFF2 se sirve desde `design-lab/shared/fonts/fraunces-soft-latin.woff2`; su licencia SIL OFL 1.1 se conserva en `OFL.txt` junto al archivo. No se añaden llamadas a Google Fonts durante la navegación.

## Registro de ejecución y verificaciones

- Implementadas la galería y las tres páginas independientes, con recursos y datos comunes, sin paquetes de aplicación.
- `node --check` sobre el JavaScript del dashboard y el servidor: sin errores de sintaxis.
- Revisión visual agrupada de A, B y C a 1440 px y 390 px, con una ronda final de confirmación tras ajustar textos y gráficos. Se confirmó la carga de Fraunces local y la ausencia de desbordamiento horizontal de página y tabla en esos tamaños.
- Comprobaciones de navegador sobre cada variante a ambos anchos: importes iniciales, seis ventas de muestra, búsqueda QR, estado vacío y recuperación, orden ascendente y descendente, totales semanales, cambio de serie y aviso de acción no implementada sin modificar importes.
- El resumen diario muestra `Bs 1.284,50` y 42 ventas/pedidos; el semanal, `Bs 7.857,00` y 269. Son datos sintéticos compartidos, no resultados reales ni requisitos nuevos del MVP.
- Contraste de una muestra de encabezados, métricas, acción principal, navegación activa y leyenda: mínimo observado 7,36:1. Etiquetas de los gráficos a 12 px efectivos en ambos tamaños. Esto no sustituye una auditoría completa de accesibilidad.
- Comprobación de teclado sobre C: Tab alcanza el selector de pedidos con foco visible y Enter cambia la serie. Galería a 390 px: tres alternativas disponibles y sin desbordamiento horizontal.
- Consola del navegador en la revisión: sin errores capturados.
- Escaneo único `impeccable detect --json design-lab`: reportó avisos de fuente frecuente, paleta crema, textos pequeños y separaciones. Se ajustaron los tamaños pequeños y se revisaron las separaciones visualmente. Fraunces y la paleta se mantienen por elección explícita del usuario; no se han desactivado reglas ni declarado un escaneo final sin avisos.
- Después de la revisión se ajustaron únicamente horas e importes de los ejemplos para mantener coherencia con sus productos y los intervalos del gráfico, sin cambiar estructura o estilos.

No se invocaron subagentes, instalaron dependencias, activaron hooks ni modificaron el producto, el tracker o los puentes. La selección visual y la aprobación del sistema de diseño siguen pendientes del usuario. No se realizaron commits.

## Segunda exploración autorizada — D, E y F

El usuario solicitó otras tres pruebas con Impeccable, delegando la elección de colores asociados a una cafetería pequeña y pidiendo contrastes, profundidad y composiciones diferentes. Conservó Fraunces y estableció como regla desde ahora el menú lateral izquierdo ocultable mediante hamburguesa. Las decisiones obligatorias se mantienen en el documento oficial de diseño; las paletas siguientes son solo candidatas.

### D — Bosque y avena

Paleta exploratoria: bosque `#254A3B`, verde profundo `#1C3A30`, avena `#ECE4D3`, caramelo `#D7B68A` y papel `#FCFAF5`. Inspira una cafetería de barrio con plantas y materiales naturales. El bloque de ingresos y volumen acompaña al gráfico en la primera fila; productos y ventas se distribuyen debajo, con un resumen de pagos horizontal. Profundidad mediante lateral oscuro, fondo avena y superficies claras, no sombras decorativas.

### E — Terracota y leche

Paleta exploratoria: terracota `#7D352B`, espresso `#402A23`, cobre `#D69A73`, leche `#EFE1D1` y papel `#FFF9F2`. Inspira una cafetería pequeña de cerámica y café tostado. Lateral claro, cabecera oscura, resumen directo y ventas recientes como zona principal; productos y pagos a la derecha y evolución del período abajo. Contraste entre barra oscura, contenido claro y panel terracota.

### F — Espresso y miel

Paleta exploratoria: café `#211B17`, lateral `#181512`, superficie `#302823`, miel `#E3B878` y texto crema `#F3E6D1`. Explora una interfaz oscura cálida sin perder legibilidad. El resumen se divide entre indicadores y pagos; un gráfico horizontal ocupa el centro y productos y ventas se agrupan debajo. La jerarquía se apoya en superficies oscuras diferenciadas y acciones miel, sin brillos ni gradientes.

### Criterios adicionales

- Conservar A–C como referencias históricas; destacar D–F en la galería sin sobrescribir la primera serie.
- Las nuevas páginas muestran los mismos datos y funciones de demostración que A–C, sin nuevas funcionalidades del POS.
- Cada una ofrece menú lateral izquierdo ocultable y recuperable con hamburguesa, con `aria-controls` y `aria-expanded` coherentes.
- En escritorio, ocultar el menú libera espacio para el contenido y recalcula el gráfico. En móvil, inicia cerrado; al abrirlo muestra fondo de cierre, limita el foco al menú y permite cerrar con Escape, restaurando el foco.
- El estado del menú es local a la página y no se guarda una preferencia ni una elección de diseño automáticamente.
- Las paletas y posiciones de los bloques deben distinguirse a simple vista; Fraunces se reutiliza desde el mismo recurso local.

## Tercera exploración autorizada — G y H

El usuario prefirió la disposición de D y solicitó dos dashboards más que combinen `#8999A9`, manteniendo esa composición. No se sustituye D, no se implementan nuevas funcionalidades ni se aprueba todavía una paleta final.

- **G — Bruma y avena:** `#8999A9` como lateral azul grisáceo, azul profundo `#334756` en ingresos y acciones, papel `#FAF8F3` y avena `#E7DDCD` en los productos. Contraste entre lateral claro, resumen oscuro y superficies cálidas.
- **H — Pizarra y café:** `#8999A9` en el resumen de ingresos y la selección, espresso `#332C28` en el lateral, café `#584033` en acciones y gráfico y crema `#F1EADF` en el fondo. Contraste entre lateral oscuro, resumen azul grisáceo y productos en latte.
- Ambas reutilizan la hoja de composición de D y cambian solo tokens y tratamientos de color. Se conservan Fraunces, tamaños, espacios, orden de bloques, datos ficticios y el menú izquierdo ocultable.
- La galería destaca G y H y permite abrir D como referencia; A–F permanecen disponibles como exploraciones anteriores.
- Verificar igualdad de posiciones de los bloques respecto a D al mismo ancho, carga local de la fuente, controles de demostración, contraste y estados del menú en escritorio y móvil. No duplicar las pruebas mecánicas sin cambios relevantes ni convertir avisos estéticos sobre Fraunces en permisos para sustituirla.

## Cuarta exploración autorizada — I, Casa de café

Tras la crítica de D, el usuario eligió Casa de café y priorizó jerarquía y densidad. Autorizó una nueva variante y permitió cambiar la distribución si ayuda a esos objetivos. I es una propuesta para comparar, no una sustitución de las anteriores ni un sistema definitivo.

### Contrato de diseño

- **Modo:** Operate. La expresión de marca acompaña la lectura y las acciones diarias, sin competir con ellas.
- **Prioridad:** leer ingresos, revisar actividad reciente y localizar la acción de venta sin atravesar encabezados promocionales.
- **Composición:** una cabecera funcional; resumen horizontal con ingresos dominantes y ventas/pedidos secundarios; tabla como zona principal con productos y pagos al lado; gráfico compacto debajo, como consulta secundaria. En móvil el orden de lectura sigue siendo resumen, ventas, productos, pagos y gráfico.
- **Ritmo:** proximidad entre datos relacionados, separación entre grupos y altura ajustada al contenido. No estirar productos hasta la altura de la tabla ni encerrar todos los bloques en tarjetas idénticas.
- **Identidad:** espresso `#4B3429`, crema `#F2E8D9`, papel `#FBF8F2`, avena `#EDE0CE` y `#8999A9` como acento secundario. Sin texturas decorativas, imágenes ni familias tipográficas adicionales.
- **Tipografía:** Fraunces suave local, con tamaños y ajuste óptico diferenciados para marca, títulos, importes, controles y metadatos. Mantener importes alineados y legibles, sin reducir todo para ganar espacio.
- **Alcance:** mismos datos sintéticos y controles de demostración; conservar ambas métricas de ventas y pedidos sin resolver ni modificar sus reglas de negocio. Se preservan el menú izquierdo ocultable, el producto y A–H.

### Criterios específicos

- Una sola cabecera de pantalla, sin el título de bienvenida ni frases repetidas de D.
- Ingresos claramente prioritarios y los dos recuentos secundarios sin indicadores nuevos.
- A 1440 × 900, ventas recientes y métodos de pago accesibles en la primera pantalla, sin depender de un gráfico dominante ni grandes vacíos.
- Productos y pagos con tamaño propio y tratamientos distintos de la tabla y del gráfico.
- Gráfico de barras de ingresos/pedidos con menor altura, conservando etiquetas a tamaño legible y sus valores accesibles.
- A 390 px, sin desbordamiento horizontal de página o tabla; teclado, foco, búsqueda, período y menú funcionan como en las variantes anteriores.
- Galería con acceso a I y conservación de A–H. La dirección Casa de café no implica aprobar automáticamente sus valores de color como tokens globales.

### Verificación de I — 2026-10-18

Comprobaciones sobre `dashboard-i/`, la galería y el cambio acotado de `shared/dashboard.js`, aplicando el procedimiento documental de testing con herramientas existentes; sin Skill de Testing, hooks o CI disponibles.

- Sintaxis de `shared/dashboard.js`: `node --check` sin errores. Validación de 100 referencias locales de recursos en 22 archivos HTML/CSS del laboratorio: ninguna ruta inexistente.
- Renderizado inspeccionado en conjunto a 1440 px y 390 px: Fraunces local cargada, una sola cabecera, sin desbordamiento de página ni tabla. Ingresos, ventas recientes, productos y pagos se leen en el orden previsto. A 1440 px, la tabla termina aproximadamente en y=838 y pagos en y=728: ambos dentro de 900 px.
- 21 comprobaciones de escritorio superadas; de 25 comprobaciones móviles, la inicial detectó únicamente pérdida de foco al pasar del menú modal al escritorio. El botón de cierre desaparecía por CSS antes del evento del breakpoint. Se corrigió la devolución de foco al hamburguesa al abandonar el modo modal; la repetición específica de ambas transiciones pasó. Se reutilizan las otras 24 comprobaciones móviles, no afectadas por ese cambio.
- Cubiertos: búsqueda, vacío y recuperación, orden ascendente/descendente, períodos diario/semanal (`Bs 1.284,50`/42 y `Bs 7.857,00`/269), cambio de serie, 11 valores accesibles del gráfico diario, acción de venta solo demostrativa, ocultación y expansión con reflujo, overlay, Escape, backdrop, botón de cierre y ciclo de foco en ambos sentidos.
- Muestra de contraste de textos y controles: mínimo 5,15:1 tras oscurecer el texto secundario. No equivale a una auditoría completa de accesibilidad. Consola del navegador sin errores en la revisión agrupada.
- Regresión acotada A–H: ingresos diarios/semanales y cambio de serie correctos; los gráficos anteriores conservan su altura interna de 248, frente a 190 en I. Galería comprobada a 1440 y 390 px: acceso a A–I, tres grupos históricos y sin desbordamiento. Se aisló la vista previa de I del cálculo de altura de la galería para evitar un vacío causado por el tamaño no escalado del iframe.
- Dos pases del detector sobre I: el primero señaló contraste 4,49:1 en textos secundarios y se corrigió. El segundo ya no lo reporta; mantiene avisos de Fraunces/crema (elecciones aprobadas) y de padding en las métricas secundarias. Estas separan contenido con 26 px junto al borde vertical en escritorio y 16 px sobre el borde horizontal en móvil; no se elimina esa agrupación por el aviso heurístico. El detector termina con código 1 por dichos avisos: no se declara un escaneo limpio.

No se ejecutaron pruebas de aplicación, backend o persistencia porque no forman parte del prototipo. No se añadieron dependencias, automatizaciones, agentes, commits ni pushes. A–H no se rediseñaron; solo comparten la corrección de foco y el renderizador compatible del gráfico. Producto, tracker y puentes raíz permanecen sin cambios por esta variante. La selección definitiva queda pendiente del usuario.

## Quinta exploración autorizada — J, Casa de café en bruma

El usuario solicitó mantener la propuesta I y crear otra aparte con `#8999A9` y colores complementarios a criterio de diseño. Se conservan I y las anteriores; no se autoriza otra redistribución ni nuevas funcionalidades.

- **Modo:** Operate. Misma jerarquía, densidad, Fraunces, contenido y menú izquierdo ocultable de I.
- **Paleta candidata:** `#8999A9` en resumen y selección, texto azul profundo `#1B2933` sobre él, espresso `#352E2A` en navegación, café `#4B3429` en acciones, crema `#F8F5EF` como superficie y bruma clara `#E4E9EB` en productos. Contraste sereno frío/cálido, sin texturas ni decoración nuevas.
- **Implementación:** reutilizar directamente `dashboard-i/styles.css` y añadir una hoja con cambios exclusivamente de color; conservar I intacta. La galería destaca J y enlaza I para comparar.
- **Verificación seleccionada:** igualdad geométrica de los bloques de I/J a 1440 y 390 px, carga local de fuente, desbordamiento, muestra de contraste y controles de demostración. Comprobar acceso a A–J y ajuste de galería en ambos anchos; sintaxis del JavaScript por el enlace de comparación añadido. Reutilizar las pruebas mecánicas de I sobre lógica no modificada, sin repetir una suite de aplicación inexistente.

### Verificación de J — 2026-10-18

- 19 comprobaciones en cada ancho (1440 y 390 px), todas superadas: geometría de siete bloques idéntica a I (tolerancia de 1 px), Fraunces local, página/tabla sin desbordamiento, `#8999A9` exacto en el resumen, ingresos diarios/semanales, búsqueda/vacío/recuperación, ordenamiento, series, navegación y menú. En escritorio se comprobó ocultación/reapertura; en móvil, overlay y Escape con devolución de foco. La lógica no cambió: se reutiliza la evidencia más amplia del menú de I.
- Inspección visual agrupada de escritorio y móvil: la composición y densidad se conservan, con texto oscuro sobre el resumen azul grisáceo y superficies cálidas alrededor. Muestra de contraste de textos y controles: mínimo 5,10:1; no constituye auditoría completa. Consola sin errores.
- Galería en ambos anchos sin desbordamiento, J destacada y acceso a A–J. Validación de las 36 referencias locales de los tres archivos revisados (galería y HTML/CSS de J): ninguna inexistente. `node --check design-lab/shared/dashboard.js` sin errores.
- Un escaneo del detector sobre J sin avisos de contraste; conserva los de Fraunces, crema y padding de métricas secundarias ya analizados para I. Termina con código 1 por esos avisos; no se declara un resultado limpio ni se cambia la composición aprobada para silenciarlos.

I y las demás hojas de variantes permanecen intactas. Sin cambios de producto, tracker o puentes raíz, ni dependencias, subagentes, hooks, CI, commits o pushes. La paleta sigue siendo una propuesta para comparación.

## Sexta exploración autorizada — K y L, Bruma de día y de noche

El usuario solicitó armonizar mejor `#8999A9` con dos pantallas separadas: una clara y otra oscura, como propuesta de modo noche. Se conserva la composición de Casa de café, Fraunces, navegación ocultable, contenido y controles, sin sustituir las anteriores ni implementar alternancia de tema.

- **Modo:** Operate. Misma geometría de I, heredando su hoja de estilos y añadiendo solo color.
- **K — Bruma de día:** azul grisáceo `#8999A9` en selección/acento, blanco suave `#F7F9FA` en contenido, azul pálido `#CDD8E3` en resumen y `#E2E8EE` en lateral, azul profundo `#314A60` en acciones y avena suave `#F0EDE7` en productos. Tonos azules emparentados con una nota cálida discreta, evitando el contraste marrón/azul de J.
- **L — Bruma de noche:** pizarra `#1B242E` en contenido, lateral `#141C25`, resumen azul profundo `#263747`, productos `#26313D`, `#8999A9` en acciones/selección/gráfico, textos azulados suaves y latte `#CBBCA7` como acento secundario. Sin negro/blanco puros, filtros ni inversión automática. Declarar `color-scheme: dark` y ajustar los estados de controles, foco, búsqueda, tabla y avisos de demostración.
- **Criterios:** dos rutas independientes con navegación mutua y acceso desde galería; A–J conservadas; misma distribución y densidad; `#8999A9` exacto en ambas. A 1440 y 390 px comprobar fuente, igualdad geométrica con I, desbordamiento, contraste de texto/placeholders y estados activos/hover/foco, legibilidad de gráfico, menú, búsqueda/vacío, período y series. La versión oscura debe cubrir toda la pantalla y controles nativos, sin zonas claras heredadas por accidente.
- **Testing proporcional:** usar herramientas existentes y un pase agrupado de escritorio/móvil por ambas paletas; comprobar sintaxis por los enlaces nuevos. Reutilizar la evidencia funcional de I para lógica sin cambios; no repetir pruebas de aplicación ni interpretar avisos estéticos como permiso de redistribución.

## Variante P autorizada — Bruma y lino, información primero

El usuario solicita una variante independiente de Bruma y lino que conserve colores y cambie disposición y jerarquía para priorizar información y utilidad. M permanece intacta. La solicitud no autoriza funcionalidad de aplicación, métricas nuevas ni instalación de recursos.

- **Modo:** Operate. Mantener la paleta vigente de M (`#3E5879`, `#8999A9`, lino y blanco cálido), Fraunces + Source Sans 3 locales y el menú izquierdo ocultable.
- **Tesis espacial:** consultar estado y evolución juntos; revisar las ventas en una zona amplia; dejar productos y métodos de pago como información de apoyo. Sustituir el hero horizontal de M por un resumen lateral compacto junto al gráfico de líneas. Debajo, tabla a la izquierda y productos/pagos a la derecha, con alturas ajustadas a su contenido.
- **Lectura y controles:** una cabecera con período y acción de venta; mantener ingresos, ventas y pedidos sin resolver aquí sus definiciones de negocio. Reutilizar datos sintéticos, búsqueda/vacío, ordenamiento, series, pico calculado y avisos de demostración existentes.
- **Adaptación:** escritorio con dos niveles de lectura; en pantallas intermedias se apilan tabla y paneles de apoyo; móvil en orden DOM resumen, gráfico, ventas, productos y pagos, sin reordenaciones visuales que contradigan teclado o lectura asistida.
- **Límites de herramientas:** Taste Skill excluye dashboards. No aplicar su flujo promocional, bibliotecas, requisitos de fotografías o animaciones al POS. La exploración utiliza criterios de interfaz operativa y los recursos de Impeccable permitidos, sin delegación automática.
- **Criterios:** ruta P y enlace de comparación con M; A–O conservadas; colores heredados, sin nuevos valores de paleta; líneas y pico coherentes en día/semana e ingresos/pedidos; navegación, foco y controles existentes funcionales; sin desbordamiento de página ni tabla en 1366, 1024, 768, 390 y 320 px. Galería con acceso a todas las variantes.
- **Verificación seleccionada:** un pase visual agrupado de escritorio/móvil, comprobaciones DOM de jerarquía y adaptación, contraste muestreado, controles de demostración y regresión acotada M por el JavaScript compartido. Comprobar sintaxis y referencias locales. No ejecutar pruebas de backend o persistencia inexistentes.

### Evidencias de P — 2026-10-18

- Inspección DOM a 1366, 1024, 768, 390 y 320 px: sin desbordamiento de página; tabla sin desplazamiento horizontal tras ajustar sus columnas a 320 px. Importes diarios/semanales y etiquetas de pago caben en sus contenedores.
- Día/semana × ingresos/pedidos en esos cinco anchos: gráfico de líneas sin barras, 11/7 puntos accesibles y picos de 12:00 (Bs 186,50 / 6 pedidos) y sábado (Bs 1.456,00 / 48 pedidos). Totales sintéticos conservados: Bs 1.284,50 y Bs 7.857,00.
- Búsqueda por producto, vacío y recuperación con foco, orden ascendente/descendente, aviso de nueva venta, apertura/cierre del menú y retorno de foco comprobados a 1366, 390 y 320 px; en móvil también Escape y aislamiento modal.
- Revisión visual agrupada mediante capturas de Chrome a 1366 y 390 px. La tabla de escritorio coloca producto e identificador en una misma línea y pasa de dos a tres filas completas visibles a 1366 × 768. **Intercambio deliberado frente a M:** P muestra la evolución antes de las ventas; M permite ver cinco filas en esa altura. Las seis ventas siguen accesibles mediante desplazamiento de página, sin contenedor de scroll vertical adicional.
- Nueve muestras de contraste de texto entre 5,09:1 y 12,03:1, incluidas selección, resumen, tabla, pico, leyenda y acción principal; no equivale a auditoría integral de accesibilidad. Recursos locales y todos los enlaces A–P de la galería respondieron correctamente; galería sin desbordamiento a 1366 y 390 px.
- `node --check design-lab/shared/dashboard.js` correcto. Regresión acotada de M a 1366 px: conserva comparación M/N/O, líneas, seis ventas y pico/total semanal correctos. El único cambio de lógica compartida es la comparación P/M condicionada a P.

No se incorporan comparaciones con períodos anteriores ni ticket promedio: son propuestas posteriores, pendientes de definición y aprobación. No se ejecutaron verificaciones de backend o persistencia, ni se añadieron dependencias, hooks, commits o pushes. El tracker permanece sin historias registradas; esta exploración no implica implementación de producto ni selección visual definitiva.

## Variante Q autorizada — La casa en movimiento

El usuario pide una variante a partir de P que aplique reglas de landing pages, fotografías y animaciones al POS, y confirma expresamente la excepción al contrato de diseño. Se limita a un prototipo comparativo: no se aplica al POS real, no rediseña P ni aprueba un nuevo estándar.

- **Idea:** el café que produce las cifras comparte la pantalla con esas cifras. Mantener el vocabulario operativo y convertir el resumen en una apertura editorial con fotografía protagonista; después, evolución, registro de ventas/pagos y favoritos con referencias fotográficas. No inventar promociones, testimonios, equipo, local, comparaciones financieras ni productos nuevos.
- **Herencia:** paleta de P/M (`#3E5879`, `#8999A9`, lino y blanco cálido), Fraunces + Source Sans 3, gráfico de líneas, datos sintéticos, controles de período/serie, pico calculado, búsqueda/vacío, ordenamiento, menú ocultable y avisos de demostración.
- **Lenguaje de landing adaptado:** mayor escala y espacios entre secciones, campos de color planos, fotografía sin marcos decorativos, superficies sin tarjetas repetidas ni sombras. La navegación y los controles de aplicación conservan sus convenciones; no sustituirlos por navegación comercial. Enlaces de salto permiten ir directamente a actividad y ventas.
- **Fotografías:** referencias genéricas de café y panadería con licencia verificable, alojadas en `dashboard-q/assets/` y acreditadas en la pantalla y en su registro local. No representan el local ni el menú real de Kofi. Hero con dimensiones reservadas y prioridad de carga; imágenes secundarias diferidas. Ampliar el servidor del laboratorio exclusivamente para servir JPEG, sin nuevas dependencias.
- **Movimiento:** apertura fotográfica y secuencia breve de cifras, trazado inicial de la curva y entradas al aparecer secciones. Sin bucles, parallax continuo ni cuenta ascendente que falsee cifras. Transiciones de controles cortas. Contenido visible por defecto y sin bloqueo si falla el JavaScript de presentación; respetar `prefers-reduced-motion` y ofrecer control local para desactivar animaciones. Sin persistencia ni librerías.
- **Límites:** no se ejecutan el sorteo, instaladores, delegación ni el flujo promocional completo de Taste Skill. Se aplican deliberadamente recursos de landing a Q por la excepción aprobada, no sus métricas automáticas como requisitos universales de un POS.
- **Compromiso:** Q sacrifica densidad y consulta inmediata por expresividad visual. La tabla queda más abajo que en P; el prototipo debe permitir comparar ese coste, no ocultarlo.
- **Criterios y verificación proporcional:** ruta Q y comparación con P; A–P conservadas; revisión visual agrupada a 1366 y 390 px, comprobación DOM de 320, 390, 768, 1024 y 1366 px sin desbordamiento de página ni tabla; imágenes cargadas, créditos y recursos locales; gráfico y datos en las cuatro combinaciones de período/serie; búsqueda, vacío, orden, foco y menú; movimiento normal/desactivado/reducido y contenido sin JavaScript de presentación; sintaxis del JS propio/compartido y servidor; regresión acotada P. Máximo un pase de corrección y confirmación visual; sin pruebas de aplicación o backend inexistentes.

### Evidencias de Q — 2026-10-18

- Inspección DOM a 320, 390, 768, 1024 y 1366 px: página y tabla sin desbordamiento horizontal; importes caben en el resumen; títulos en una o dos líneas; cinco imágenes locales cargadas y cinco fichas de crédito enlazadas. La principal carga con prioridad alta y las cuatro referencias de productos con carga diferida.
- Día/semana × ingresos/pedidos en los cinco anchos: líneas con 11/7 puntos, sin barras; picos y totales sintéticos iguales a P. Las fotografías se reponen correctamente al cambiar el período, sin duplicar el cálculo ni los datos.
- A 1366, 390 y 320 px: búsqueda por producto, estado vacío y recuperación con foco, orden ascendente/descendente, aviso de venta de demostración, menú ocultable y retorno de foco. En móvil: aislamiento modal, ciclo de Tab y cierre con Escape. Saltos a ventas y apertura/foco de créditos comprobados.
- Revisión visual agrupada de escritorio a 1366 px y móvil a 390 px mediante Chrome headless con iframes de ancho exacto. Q coloca fotografía y resumen antes de actividad y ventas; la mayor distancia hasta la tabla es el compromiso visual aprobado, no una mejora de densidad frente a P.
- Chrome con preferencia de movimiento normal emulada: cinco animaciones iniciales finitas (650–1100 ms), trazado activo de la curva al aparecer y desactivación completa mediante el control de Q. Cambio en vivo a movimiento reducido: cero animaciones, trazo limpio, resumen visible y desplazamiento instantáneo; el control indica la preferencia del sistema. Confirmado tras proteger la limpieza de una animación cancelada frente a su sustituta.
- Bloqueo exclusivo de `presentation.js`: resumen, imagen principal, seis ventas y cuatro productos permanecen disponibles, sin desbordamiento ni control de animación inerte. No se afirma funcionamiento interactivo con todo JavaScript desactivado.
- Doce muestras de contraste entre 4,81:1 y 11,24:1, incluidas cifras, pagos, selección, referencias y control de movimiento reducido. Es un muestreo, no certificación de accesibilidad. Fuentes, CSS, JavaScript y cinco JPEG responden correctamente con sus tipos MIME.
- Galería sin desbordamiento a 1366 y 390 px, con Q destacada y las 17 rutas A–Q accesibles. Regresión acotada de P: conserva comparación P/M, seis ventas, total semanal Bs 7.857,00 y pico del sábado de 48 pedidos; no carga el JavaScript de presentación de Q.
- `node --check` correcto para el JavaScript propio, el compartido y `serve.mjs`. El servidor local existente se reinició para servir JPEG. Sin dependencias, hooks, delegación, cambios en las skills, commits ni pushes. No se ejecutaron pruebas de aplicación o backend inexistentes.

Las fuentes y licencias fotográficas se mantienen en [el registro local de Q](../../design-lab/dashboard-q/assets/CREDITS.md) y en sus créditos de pantalla. No se cambió el texto de Impeccable ni Taste Skill; la excepción está en la constitución y el contrato de diseño y sigue limitada a Q. El tracker no registra historias de producto por esta exploración.
