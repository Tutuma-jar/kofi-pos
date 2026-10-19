# Kofi — Sistema de diseño

## 1. Objetivo

Guiar interfaces claras y consistentes para el contexto definido en [product.md](product.md). La variante **P · Bruma y lino, información primero** es la referencia de **colores, fuentes y criterios de jerarquía**, no una plantilla de página. Cada módulo debe resolver su composición según su funcionalidad. Esta elección no selecciona una biblioteca ni autoriza implementar la aplicación.

## 2. Principios obligatorios

- Priorizar claridad, legibilidad y rapidez en las operaciones frecuentes.
- Diseñar principalmente para computadoras y laptops, sin asumir una aplicación móvil nativa.
- Mantener un lenguaje compartido de tipografía, colores y patrones de interacción, sin exigir la misma composición, espaciado o densidad en todos los módulos.
- Considerar accesibilidad desde el diseño: contraste, navegación por teclado, foco visible y etiquetas comprensibles.
- Comunicar con claridad los estados de carga, vacío, éxito y error cuando correspondan.
- Evitar adornos o interacciones que dificulten la operación del negocio. Las imágenes de productos y otros contenidos visuales funcionales son apropiados cuando ayudan a reconocer, elegir o comprender información.
- Mantener comprensibles las acciones y sus resultados, sin introducir flujos de producto no aprobados.
- Utilizar Fraunces de carácter suave en títulos y Source Sans 3 en interfaz, controles y cifras, siguiendo la variante P.
- A partir de la segunda exploración, utilizar navegación principal lateral izquierda y un botón hamburguesa que permita ocultarla y volver a mostrarla. La navegación superior no sustituye este menú.
- El menú oculto no debe retener el foco ni permitir interacción con sus controles. En pantallas estrechas debe poder cerrarse sin perder el acceso al botón para volver a abrirlo, con estados accesibles y soporte de teclado.
- Tomar P como referencia de lenguaje visual y jerarquía: destacar la tarea y la información principal, y dar menor peso a lo secundario. La densidad, disposición, imágenes y componentes se eligen según cada módulo, sin copiar los bloques del dashboard.
- Mantener el carácter cálido, sereno y profesional de Bruma y lino. Priorizar información útil, reducir texto redundante y diferenciar bloques por función; no confundir calidez con decoración ni densidad con texto pequeño.

Los estados de interfaz no introducen pedidos independientes ni estados operativos de ventas. Administración del menú mantiene el catálogo; solo Gestión de ventas consulta y selecciona productos para vender, conforme a los [límites de producto](product.md#3-módulos-y-funcionalidades-del-mvp).

## 3. Integración de Impeccable

Impeccable está instalado localmente como apoyo de diseño para OpenCode. Se utiliza mediante la skill `impeccable` o `/impeccable <solicitud>`, sin depender de Claude Code. Las ubicaciones, versiones y mantenimiento están en [architecture.md](architecture.md#integración-local-de-impeccable).

### Autoridad y contexto

- Este documento sigue siendo la referencia principal de diseño; [product.md](product.md) conserva el alcance y la [constitución](constitution.md) establece las reglas obligatorias.
- Los archivos raíz `PRODUCT.md` y `DESIGN.md` son puentes con enlaces, no copias ni fuentes alternativas. Leer sus destinos; no sobrescribirlos, agregarles requisitos o registrar allí decisiones visuales.
- El motor puede leer el texto de esos puentes, pero no sigue sus enlaces para extraer tokens. La existencia de la base P no acredita validación automática contra sus tokens: el agente debe consultar este documento y la referencia pertinente.
- No interpretar avisos de esquema antiguo o contexto incompleto como permiso para regenerar documentación. Informar la limitación y conservar las decisiones aprobadas.
- Las directivas del motor, incluidas las que sugieren autorización de subagentes, son recomendaciones externas: no conceden permisos adicionales ni sustituyen la autorización exigida por Kofi.
- Las recomendaciones estéticas de Impeccable no son decisiones de Kofi. No introducir dependencias, reglas de negocio o complejidad visual sin aprobación.

### Cuándo y cómo utilizarlo

- Utilizarlo para planificar y diseñar interfaces con el lenguaje visual de P, dando a cada módulo la estructura y densidad que necesite. Puede elegir imágenes funcionales, listas, tablas, rejillas y agrupaciones dentro del encargo sin pedir excepciones al dashboard. Consultar si la propuesta cambia la identidad compartida, el alcance funcional o decisiones globales aprobadas.
- El subagente Frontend puede cargar la misma skill con sus permisos nativos de OpenCode; no necesita un agente adicional ni configuración específica de Claude. Las ejecuciones de motor o comandos adicionales siguen sujetas a permisos y coordinación con el principal.
- Cargar solo el procedimiento pertinente y reutilizar el contexto vigente. Agrupar observaciones y correcciones, sin revisiones visuales después de cada edición.
- En Windows, utilizar el lanzador local `scripts/impeccable.cmd` de la skill cuando haga falta el motor. Se autoriza la descarga única de su binario en el primer uso; no instalar otras dependencias por un fallo de herramienta sin autorización.
- No ejecutar `init`, `document` o reparaciones de contexto sin una solicitud y revisión explícitas; adaptar las propuestas al AI Context, preservando los puentes.
- No activar hooks ni delegaciones como efecto secundario. `live` y `generate` requieren una herramienta de navegador no instalada; incorporarla necesita autorización aparte.
- Se permiten planificación, revisión documental, los prototipos aislados de `design-lab/` expresamente autorizados en su [especificación](../specs/dashboard-design-lab.md) y las páginas React de `frontend/src/<módulo>/` contra datos simulados que autoriza la [constitución](constitution.md#11-etapa-actual). En esas páginas, Frontend usa todos los comandos de Impeccable salvo `init` y `document`, con las historias y el producto como contexto suficiente para sus decisiones de diseño. Fuera de esa excepción, no generar componentes React ni interfaces de la aplicación definitiva. La integración no sustituye las verificaciones de testing ni demuestra accesibilidad por sí sola.

Ejemplo de uso compatible con esta etapa:

```text
/impeccable shape la pantalla de ventas: solo planificación, respetando la base P y sin código de aplicación
```

Cuando existan interfaces y se autorice su revisión, se podrán utilizar solicitudes acotadas como `/impeccable critique la pantalla de ventas` o `/impeccable audit el formulario de productos`.

Al terminar el diseño de una página con Impeccable, aplicar obligatoriamente la revisión de la sección siguiente antes de dar ese diseño por finalizado.

## 4. Integración de Emil Design Engineering

La skill `emil-design-eng` se utiliza **después de terminar el diseño de cada página con Impeccable**, como revisión final de pulido, componentes y movimiento. Sus instrucciones originales y licencia MIT permanecen intactas; la procedencia está en [arquitectura](architecture.md#integración-local-de-emil-design-engineering).

### Secuencia obligatoria por página

1. **Diseñar con Impeccable:** resolver estructura, jerarquía, adaptación y estados pertinentes según la función del módulo, usando los colores, fuentes y criterios de prioridad de P, no su composición literal.
2. **Revisar con `emil-design-eng`:** cargarla mediante `@emil-design-eng` o la herramienta nativa, con una solicitud concreta sobre la página terminada. Revisar componentes, respuesta de controles, transiciones, duración y propósito del movimiento, frecuencia de uso, rendimiento y accesibilidad. También puede concluir que una interacción no debe animarse.
3. **Resolver los hallazgos:** presentar la tabla comparativa indicada por la skill y aplicar las correcciones pertinentes dentro del alcance autorizado. Evaluar utilidad y coherencia, no parecido literal con P. Consultar antes de cambiar las familias tipográficas, la paleta base, la navegación principal, el alcance funcional o las dependencias; ajustar disposición, tamaños, densidad e imágenes funcionales no constituye por sí solo una desviación del sistema.
4. **Revisar React cuando corresponda:** después de resolver el pulido con Emil, Frontend aplica `react-best-practices` al código React afectado, según la sección 7. No aplica a prototipos solo HTML ni autoriza introducir React donde no existe.
5. **Verificar y cerrar:** el principal selecciona las comprobaciones según el [procedimiento de testing](documentation.md#7-procedimiento-de-testing), coordina el hook explícito y las verificaciones adicionales, registra resultados reales y señala pendientes. No existe skill `testing`. Las revisiones de Emil o React Best Practices no sustituyen pruebas ni certifican accesibilidad por sí solas. Si no puede ejecutarse una revisión obligatoria aplicable, informar y dejar pendiente el cierre correspondiente.

Esta secuencia se aplica al completar un diseño o rediseño de página, no a cada edición ni como revisión repetida de cambios ya cubiertos. Frontend carga las skills pertinentes en su propia sesión delegada, sin encadenar otros agentes, hooks o automatizaciones de diseño adicionales. El principal coordina después el cierre explícito de verificación. La adopción documental de P no ejecuta revisiones retroactivas de los prototipos.

Ejemplo de solicitud al terminar una página autorizada:

```text
@emil-design-eng revisa la página de ventas diseñada con Impeccable.
Conserva los colores, fuentes y criterios de jerarquía de P, adaptados
a la función de esta página. No exijas su misma disposición o densidad.
Identifica mejoras de componentes, feedback, movimiento,
accesibilidad y rendimiento dentro del alcance aprobado.
```

### Autoridad y límites

- Complementa Impeccable; no reemplaza sus tareas de diseño ni aprueba una nueva identidad visual.
- Se conserva su frontmatter original: OpenCode puede anunciarla para tareas pertinentes, sin que ello ejecute código. El paso de revisión es una regla de trabajo del proyecto, no un hook instalado.
- La instalación o su carga de verificación no es una revisión de UI ni una invocación de asesoría sin pregunta; no debe sustituir el informe de instalación por el saludo de su sección «Initial Response».
- Sus ejemplos de React, Motion/Framer Motion, Sonner o Base UI son referencias, no dependencias autorizadas. No instalar librerías ni generar aplicación por haber cargado esta skill.
- Respetar las decisiones aprobadas de la página, movimiento reducido y rapidez operativa. No añadir animaciones solo para cumplir una receta ni aplicar a otras páginas las excepciones editoriales de Q.
- Las afirmaciones externas sobre aceleración o rendimiento requieren verificación proporcional en el entorno real; no equivalen a garantías. Se mantienen los límites de testing, permisos de herramientas y prohibición de commits o pushes sin autorización.

## 5. Base visual aprobada — variante P

El usuario elige P como referencia del sistema de diseño el 2026-10-18. La referencia es el [dashboard P](../../design-lab/dashboard-p/index.html), cuya [composición propia](../../design-lab/dashboard-p/styles.css) hereda la [paleta de M](../../design-lab/dashboard-m/styles.css). Se adopta su lenguaje visual, no la obligación de reproducir sus bloques, medidas o distribución. Esta elección sustituye las preferencias exploratorias anteriores, sin borrar las variantes ni convertir el prototipo en código de aplicación.

### Qué se comparte y qué se adapta

| Criterio compartido | Libertad de cada módulo |
| --- | --- |
| Paleta base y significado de sus roles | Proporción de color y distribución de superficies según la tarea |
| Fraunces y Source Sans 3, con sus roles | Tamaños, pesos y escala de énfasis adecuados al contenido |
| Información principal antes que secundaria; acciones claras | Qué información domina y cómo se agrupa o recorre |
| Legibilidad, accesibilidad y respuesta consistente de controles | Disposición, densidad, número de columnas, espacio y componentes |
| Imágenes pertinentes, comprensibles y con uso autorizado | Fotografías, miniaturas, proporciones y recortes cuando aporten utilidad |

Por ejemplo, el **catálogo puede presentarse con imágenes de productos, categorías y una rejilla más visual**, tanto para mantenerlo en Administración del menú como para elegir productos en Gestión de ventas, sin mezclar sus acciones; el **historial puede ser más denso y centrado en tablas y filtros**; el dashboard resume actividad. Son expresiones del mismo sistema, no excepciones que requieran aprobar cada diferencia de disposición. Estas decisiones de presentación no añaden funcionalidades de producto por sí mismas ni definen las historias pendientes de ventas.

### Paleta y superficies

| Rol | Base aprobada |
| --- | --- |
| Acción principal, resumen destacado y serie de datos | `#3E5879` |
| Selección | `#8999A9`, con texto `#1A2936` |
| Fondo de página, lino | `#F6F3ED` |
| Paneles y superficies claras | `#FCFBF8` |
| Navegación lateral | `#E9E6DE` |
| Texto principal | `#263641` |
| Texto secundario | `#5B6570` |
| Bordes y separadores | `#DEDDD6` |
| Hover de acción principal | `#334A67` |
| Pulsación de acción principal | `#293D57` |

Mantener los roles de color de P: el azul oscuro concentra acciones y énfasis informativo; el azul grisáceo identifica selección; las superficies cálidas separan niveles. No tratar un color decorativo como estado de éxito o error sin definir y comprobar ese uso. Verificar contraste en cada combinación y estado, no solo por pertenecer a esta paleta.

### Tipografía, forma y densidad

- Fraunces suave para títulos y marca; Source Sans 3 para texto de interfaz, controles, tablas y cifras. Conservar los archivos locales y sus licencias.
- La escala expresa importancia, no un tamaño fijo: en un resumen pueden dominar las cifras; en el menú, la imagen, el nombre y el precio del producto. Usar números tabulares cuando deban compararse y mantener identificadores y metadatos en un nivel secundario.
- Usar agrupación, tono y espacio para organizar la información. Las esquinas de 10 px en paneles y 6 px en controles de P son ejemplos de su acabado, no dimensiones obligatorias para todo componente.
- Elegir densidad y separaciones según la tarea: más aire para explorar productos o completar un formulario; mayor compactación para consultar registros. Las separaciones de aproximadamente 18–24 px de P son orientativas, no una escala universal. Ajustar sin perjudicar legibilidad, áreas de interacción o navegación por teclado.

### Composición e interacción

- La distribución de resumen, gráfico, ventas y apoyo de P es una solución para ese dashboard, no una estructura común a todos los módulos. Diseñar cada página a partir de su tarea principal y su contenido.
- Mantener navegación lateral izquierda ocultable, foco visible, etiquetas accesibles y comportamiento modal en anchos estrechos. La adaptación no debe contradecir el orden de lectura o teclado.
- Conservar controles reconocibles, estados seleccionados claros, búsqueda con recuperación del vacío y tablas legibles sin desbordamiento de página.
- El gráfico de P sigue siendo de líneas. En otros contextos, elegir la representación adecuada a los datos y la tarea, manteniendo unidades, período y alternativas accesibles; las anotaciones deben ser coherentes con los datos seleccionados.
- Las imágenes de productos del menú son contenido funcional permitido: no equivalen a adoptar un hero promocional o las reglas de landing pages de Q. No heredar por defecto sus entradas editoriales ni su menor densidad. Las animaciones se justifican por tarea y frecuencia de uso y se revisan con Emil según la sección 4.

### Decisiones pendientes y referencias históricas

La base P ya está elegida. La [base técnica aprobada](architecture.md#7-base-técnica-mínima-aprobada) selecciona CSS Modules y variables CSS, sin framework visual ni biblioteca de componentes inicial; no están implementados. Siguen pendientes la escala tipográfica completa, el catálogo de componentes y estados y los tokens semánticos exhaustivos y su implementación. Las métricas y los datos sintéticos de P no aprueban definiciones de negocio: estas permanecen en [producto](product.md) y sus especificaciones. Las dimensiones de comprobación del Dashboard se definen en [US-003](../specs/us-003-consultar-resumen-ventas.md), sin imponerlas a otros módulos.

A–O conservan el historial de exploración: D fue referencia para G–H, I introdujo Casa de café y J–O probaron color y tipografía. Q sigue siendo un experimento editorial aislado. Ninguna de esas variantes sustituye P como referencia de lenguaje visual ni aprueba un modo oscuro global. Requieren aprobación los cambios de identidad o de alcance; las adaptaciones de composición, densidad e imágenes funcionales dentro del encargo no requieren una excepción adicional.

## 6. Taste Skill: complementaria y de uso explícito

Taste Skill está instalada localmente con el identificador `design-taste-frontend`. La procedencia y verificaciones se registran en [architecture.md](architecture.md#integración-local-de-taste-skill).

- La versión original actual está orientada a webs públicas, landing pages y portfolios, y excluye dashboards y pantallas de aplicación. No utilizar sus reglas promocionales o bibliotecas para rediseñar el POS ni el laboratorio de dashboards.
- Mantener Impeccable y las decisiones aprobadas de Kofi. Las reglas de Taste Skill sobre paletas, tipografía, fotografías, movimiento y composición son recomendaciones externas, no nuevos estándares.
- Carga explícita mediante la herramienta de skills de OpenCode con ID `design-taste-frontend`; la invocación automática está desactivada. No hay comandos personalizados, plugins, hooks ni delegaciones asociados.
- La instalación y la carga no ejecutan scripts ni autorizan trabajo adicional. Antes de usar `draw`, `assets`, `lint` o `inspect`, comprobar que corresponden al alcance solicitado, sus accesos a red y sus rutas de escritura.
- Si se autoriza `draw`, fijar `TASTE_SKILL_HISTORY` a `.taste-skill/history.json` del proyecto solo en ese proceso para evitar su historial global predeterminado. Los archivos de trabajo solo se crean al autorizar una tarea que los necesite.
- No sustituir los puentes raíz ni regenerar AI Context. Mantener sesión, agente y modelo actuales, y respetar los límites de verificación, instalación y control de versiones de la constitución.

**Excepción autorizada, solo Q (2026-10-18):** el usuario confirmó aplicar recursos de landing pages, fotografías y animaciones a una variante experimental derivada de P. Permite explorar fotografía protagonista, escala editorial y movimiento acotado, manteniendo paleta, datos, controles, navegación y alternativa de movimiento reducido. No obliga a ejecutar el flujo completo de Taste Skill, introducir fotografía en otras variantes ni convertir esta composición en el estándar operativo. La [especificación de Q](../specs/dashboard-design-lab.md#variante-q-autorizada--la-casa-en-movimiento) registra el alcance y sus compromisos de densidad.

## 7. React Best Practices

`react-best-practices` complementa Impeccable y Emil con revisión técnica del código React. Procedencia, revisión fijada y licencia declarada en [arquitectura](architecture.md#integración-local-de-react-best-practices).

- Frontend la carga directamente después de Impeccable y Emil cuando una página diseñada incluye React afectado; no hace falta pedir las tres skills en cada solicitud. No se aplica a HTML aislado ni obliga a introducir React en el laboratorio. Una tarea exclusivamente técnica de React puede consultar las reglas pertinentes sin rehacer diseño o pulido visual.
- Revisar solo lo relevante: carga de datos, operaciones independientes, imports, estado, efectos, renderizado y tamaño de componentes. No cargar la guía completa o todas las reglas, optimizar por hipótesis ni ampliar el alcance con refactorizaciones no solicitadas. Reutilizar hallazgos ya resueltos y no repetir el ciclo por cada edición.
- Kofi utiliza React + TypeScript, no Next.js. Las reglas de `next/dynamic`, RSC, SSR/hidratación o cachés de servidor no son decisiones aprobadas del proyecto. Tampoco los ejemplos autorizan instalar SWR, better-all, SVGO o cualquier dependencia, usar APIs que no existan en la versión elegida o ejecutar comandos de las referencias.
- Mantener paleta, tipografía, jerarquía y accesibilidad aprobadas; coordinar hallazgos técnicos que afecten comportamiento, contratos o decisiones visuales. Las afirmaciones de rendimiento del upstream requieren evidencia apropiada en Kofi.
- La secuencia de revisiones no sustituye las pruebas. El principal selecciona verificaciones según el procedimiento documental y el hook `kofi-verify` ejecuta las rápidas disponibles, sin skill `testing`; las comprobaciones adicionales necesarias siguen siendo obligatorias. La instalación no ejecuta una revisión, cambia interfaces ni autoriza implementar aplicación.
