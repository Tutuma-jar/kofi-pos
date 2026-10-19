# Kofi — Constitución del proyecto

## 1. Propósito y protección de decisiones

Esta constitución establece principios obligatorios, no plantillas ni configuraciones. El alcance y las reglas de negocio pertenecen a [product.md](product.md).

- Distinguir decisiones aprobadas, propuestas y cuestiones pendientes.
- Conservar las decisiones vigentes; una especificación, herramienta o recomendación externa no puede modificarlas silenciosamente.
- Consultar al responsable del proyecto ante contradicciones o ambigüedades, sin resolverlas por suposición.
- Obtener aprobación explícita antes de cambiar el alcance, la arquitectura aprobada o esta constitución, indicando motivo e impacto.

## 2. Simplicidad y mantenibilidad

- Priorizar facilidad de uso, rapidez operativa y claridad.
- Elegir la solución más sencilla que satisfaga los requisitos aprobados.
- Evitar sobreingeniería, abstracciones anticipadas y funcionalidades hipotéticas.
- Separar responsabilidades y mantener cambios acotados al objetivo de la tarea.
- Favorecer código legible y patrones consistentes; justificar dependencias y abstracciones nuevas.
- Proteger credenciales y datos sensibles: no incorporarlos al repositorio, documentación o registros.

## 3. Arquitectura, convenciones y diseño

- Respetar los límites técnicos y la organización definidos en [architecture.md](architecture.md), fuente única del stack y la estructura completa.
- Agregar carpetas o capas solo ante responsabilidades concretas; evaluar mantenibilidad, seguridad y coste operativo.
- Seguir [conventions.md](conventions.md) sin mezclar estilos arbitrariamente.
- Aplicar [design-system.md](design-system.md), priorizando accesibilidad, consistencia y eficiencia de uso.
- No convertir decisiones técnicas o visuales pendientes en estándares implícitos.

## 4. Desarrollo mediante SDD

1. Comprobar que la necesidad pertenece al alcance del producto.
2. Definir una historia o especificación con objetivo, límites y criterios de aceptación verificables.
3. Resolver las decisiones bloqueantes y obtener aprobación antes de implementar.
4. Dividir el trabajo en tareas proporcionadas, con responsabilidad concreta, dependencias y resultado verificable.
5. Implementar únicamente lo aprobado y verificar su comportamiento.
6. Documentar resultados reales y actualizar el estado cuando corresponda.

Las historias describen necesidades y beneficios, no solo actividades de programación. Las tareas no deben ser excesivamente grandes ni fragmentarse por archivo, función o import. Cada tarea de implementación se vincula a su historia aprobada.

Los criterios deben ser claros, específicos, observables y considerar validaciones, límites y errores cuando correspondan. Cada criterio debe tener una comprobación automática o manual justificada, sin pruebas redundantes.

## 5. Trazabilidad y Definition of Done

Mantener trazabilidad mediante identificadores y enlaces:

**Historia → Tareas → Implementación → Validaciones → Documentación → Estado completado.**

- Diferenciar tarea terminada, historia terminada y cambios integrados.
- No declarar trabajo completado por haber escrito código ni con verificaciones obligatorias pendientes o errores bloqueantes conocidos.
- Comprobar el alcance, los criterios aplicables y la documentación relevante antes de completar una tarea.
- Comprobar las tareas necesarias, todos los criterios obligatorios y la integración antes de completar una historia.
- No considerar cambios integrados hasta incorporarlos a la rama de destino y superar sus verificaciones obligatorias.

Las listas detalladas de DoD y las evidencias requeridas se mantienen en [documentation.md](documentation.md).

## 6. Política de verificación

- Verificar proporcionalmente al riesgo y al comportamiento afectado, sin porcentajes arbitrarios de cobertura.
- Priorizar cálculos, cantidades, validaciones de pedidos, ventas, integridad, persistencia y contratos entre aplicaciones.
- Separar la selección de pruebas, su ejecución rápida y la verificación completa de integración. Los mecanismos de automatización deben tener responsabilidades delimitadas y no duplicar comprobaciones innecesariamente.
- Agrupar cambios coherentes, ejecutar primero comprobaciones específicas y ampliar según el riesgo. No ejecutar suites completas después de cada edición.
- Reutilizar resultados solo mientras sus entradas y dependencias relevantes sigan sin cambios; no sustituir controles obligatorios de integración por resultados locales.
- Permitir como máximo dos intentos automáticos consecutivos para el mismo fallo. Si persiste, detenerse e informar; no ocultar errores ni completar trabajo pendiente.
- No invocar subagentes para comprobaciones mecánicas; utilizar herramientas locales.
- Cuando exista CI configurada, superar sus verificaciones obligatorias aplicables antes de integrar cambios; los éxitos locales no las sustituyen. Su activación y los cambios relevantes de alcance requieren aprobación. Configurar un workflow no acredita su ejecución ni habilita protección de ramas automáticamente.

El procedimiento detallado, los niveles y las responsabilidades de herramientas están en [documentation.md](documentation.md#7-procedimiento-de-testing).

## 7. Documentación y seguimiento

- Mantener una fuente por responsabilidad y enlazar en lugar de copiar contenido.
- Registrar especificaciones, criterios y tareas según [documentation.md](documentation.md); no utilizar `AGENTS.md` como bitácora.
- Usar [tracker.md](../progress/tracker.md) como única fuente de estado de historias y tareas aprobadas.
- Actualizar el tracker en hitos verificados, no tras cada edición; no inventar avances ni eliminar pendientes sin autorización.
- Documentar cambios relevantes, decisiones y resultados reales; no producir registros adicionales por modificaciones triviales.
- Mantener el historial significativo en [CHANGELOG.md](../progress/CHANGELOG.md), separado del estado del trabajo.

## 8. Control de versiones

- Seguir las convenciones de ramas y Conventional Commits de [conventions.md](conventions.md).
- Mantener cambios coherentes y evitar mezclar funcionalidades no relacionadas.
- Vincular tareas cuando corresponda y preparar PR con el formato de [documentation.md](documentation.md).
- Excluir secretos y archivos temporales; no realizar commits ni pushes sin autorización explícita.

## 9. Agentes, hooks y skills

- Requerir autorización para usar subagentes, con objetivos, contexto y entregables delimitados. Revisar sus resultados: delegar no sustituye verificar.
- No delegar aprobaciones de producto o arquitectura. Coordinar modificaciones sobre los mismos archivos.
- No invocar todos los subagentes por tarea, encadenar delegaciones innecesarias ni repetir revisiones equivalentes.
- Los seis perfiles y sus responsabilidades se describen en [documentation.md](documentation.md#8-subagentes).
- Aprobar configuración y efectos de hooks antes de habilitarlos; mantenerlos acotados, comprensibles y no recursivos.
- No introducir acciones destructivas, instalaciones, publicaciones o cambios ocultos mediante automatizaciones, ni eludir aprobaciones.
- Permitir skills internas y externas como Impeccable tras revisar alcance, instrucciones, dependencias y compatibilidad, y autorizar su incorporación y uso.
- Las skills deben respetar la constitución, la arquitectura, las especificaciones y el sistema de diseño. Ante un conflicto, consultar antes de continuar.

## 10. Eficiencia de contexto y ejecución

- Utilizar `AGENTS.md` como entrada y consultar solo las secciones relevantes para la tarea.
- Reutilizar decisiones y contexto vigentes; evitar cargas completas del repositorio y lecturas repetitivas sin necesidad.
- Mantener respuestas y reportes concisos; resumir pruebas exitosas y conservar evidencia útil de fallos.
- Usar herramientas locales para comprobaciones mecánicas y análisis de IA solo cuando aporte valor.
- Aprovechar caché y ejecución incremental cuando sean fiables, sin ocultar errores relevantes por ahorrar tiempo.
- No desarrollar sistemas complejos de monitoreo de tokens.

## 11. Etapa actual

La etapa actual es de planificación y actualización documental autorizada. Las rutas y responsabilidades futuras no equivalen a implementaciones disponibles.

Se autoriza como excepción la integración local de Impeccable para OpenCode, sus recursos necesarios y las referencias al AI Context, sin activar hooks. Esta autorización no aprueba una identidad visual ni habilita cambios de producto o arquitectura de la aplicación.

También se autoriza la instalación local de Taste Skill (`design-taste-frontend`) como herramienta complementaria de carga explícita para webs públicas. No sustituye Impeccable ni se aplica al POS o sus dashboards; no autoriza ejecutar scripts, añadir dependencias, activar automatizaciones o generar interfaces como efecto de la instalación. Su contrato está en [design-system.md](design-system.md#6-taste-skill-complementaria-y-de-uso-explícito).

La solicitud del usuario del 2026-10-18 autoriza también instalar localmente la skill principal de Emil Kowalski, `emil-design-eng`, con su licencia MIT, sin modificar sus instrucciones originales ni instalar las demás skills de su catálogo. Complementa las herramientas existentes para diseño y movimiento cuando corresponda al trabajo autorizado; instalarla no ejecuta revisiones, modifica interfaces, añade dependencias ni activa automatizaciones. Su contrato está en [design-system.md](design-system.md#4-integración-de-emil-design-engineering).

También se autoriza el laboratorio visual aislado `design-lab/` para explorar dashboards con Impeccable según su [especificación](../specs/dashboard-design-lab.md), incluidas A–H, la variante I de Casa de café con redistribución expresamente permitida, J como prueba de color y K–L como pantallas clara y nocturna separadas con `#8999A9` sobre I. Sus prototipos HTML, CSS y JavaScript, fuentes y servidor local sin dependencias no son implementación de la aplicación ni aprobación del sistema visual definitivo.

Por elección posterior del usuario el 2026-10-18, P pasa a ser la referencia de colores, fuentes y criterios de jerarquía del sistema de diseño, no una plantilla rígida. Cada módulo puede adaptar disposición, densidad, componentes e imágenes funcionales a su tarea dentro del alcance autorizado. `emil-design-eng` debe revisar cada página al terminar su diseño con Impeccable, conforme al [contrato de diseño](design-system.md#4-integración-de-emil-design-engineering). La elección no autoriza implementar la aplicación, rediseñar los prototipos existentes ni activar hooks o automatizaciones; los cambios de identidad compartida o alcance siguen requiriendo aprobación.

Como excepción experimental confirmada por el usuario el 2026-10-18, la variante Q puede aplicar recursos de landing pages, fotografías de referencia con licencia y animaciones al dashboard, partiendo de P. El motivo es comparar expresividad con utilidad; el impacto aceptado es menor densidad y mayor recorrido vertical. La excepción se limita a Q, conserva P y las anteriores, paleta y funciones de muestra, y exige movimiento reducido. No extiende Taste Skill al resto del POS ni cambia el estándar de diseño. Alcance y verificación en la [especificación del laboratorio](../specs/dashboard-design-lab.md#variante-q-autorizada--la-casa-en-movimiento).

La aprobación explícita del usuario de la Fase B el 2026-10-18 autoriza una excepción acotada: configurar los seis subagentes previstos en OpenCode V2, una única Skill de Testing y los cuatro controles de requisitos, documentación, alcance y testing; probar exclusivamente esta configuración con herramientas existentes y activar localmente el pre-commit documental. Los límites de tarea serán explícitos, sin equiparar inactividad o cada edición a una finalización. Esta excepción no aprueba código funcional, herramientas de pruebas del POS, dependencias nuevas, CI, cambios de historias o estados del tracker, ni commits o pushes. El contrato operativo está en [documentación](documentation.md#9-cuatro-controles-y-skills) y las rutas en arquitectura.

Por decisión posterior explícita del usuario el 2026-10-18 se retira la skill `testing` del proyecto: el principal conserva la selección por criterios/riesgo en el procedimiento documental y el hook ejecuta las comprobaciones rápidas disponibles. También se autoriza integrar localmente `react-best-practices` desde la rama solicitada de Vercel para revisión técnica pertinente de React después de Impeccable y Emil, según su [contrato](design-system.md#7-react-best-practices). No sustituye pruebas ni habilita Next.js, otras dependencias, más agentes, implementación de aplicación o cambios funcionales de historias. Se permite actualizar únicamente las referencias operativas a la skill retirada en las especificaciones existentes, conservando criterios, tareas, aprobaciones y estados.

La autorización explícita «ok autorizo» del responsable el 2026-10-18 permite una única entrega de [arranque técnico mínimo](../specs/technical-bootstrap.md): crear frontend/backend y workspaces, instalar las dependencias aprobadas necesarias, configurar desarrollo/build/tipos/calidad y comprobar el montaje React y arranque Express sin servicios externos. Esta excepción admite código y pruebas de humo exclusivamente técnicos, no implementa TASK-001 a TASK-032 ni inicia o completa historias del tracker. No incluye funcionalidades, prototipos de pestaña, MongoDB real, infraestructura, CI, hooks nuevos, commits ni pushes. La implementación funcional posterior y cualquier ampliación requieren autorización separada.

La aprobación explícita «si» del responsable el 2026-10-18 autoriza posteriormente la CI técnica inicial de GitHub Actions y sus referencias documentales: verificar comandos existentes del bootstrap en PR hacia `develop`, push a `develop` y ejecución manual. Se permite configurar el workflow y probar localmente su selección y comandos; ajustar npm solo dentro del runner efímero no cambia instalaciones del usuario. Esta excepción no incluye nuevas dependencias de aplicación, funcionalidades, servicios externos, datos reales, despliegues, modificación de protecciones/permisos del repositorio GitHub, commits o pushes. La ejecución remota queda pendiente de publicar el workflow mediante una autorización posterior.

Fuera de las excepciones autorizadas, no desarrollar código de aplicación, crear carpetas de frontend o backend, instalar dependencias de aplicación, generar pruebas de aplicación, crear más subagentes, instalar otras skills, configurar automatizaciones o CI, ni realizar commits o pushes en esta etapa.
