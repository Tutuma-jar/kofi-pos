# Kofi — Guía para agentes

## Contexto mínimo

Consultar la [constitución](docs/ai-context/constitution.md) y el alcance pertinente del [producto](docs/ai-context/product.md). Para implementar, localizar la especificación aprobada de la tarea y su entrada en el [tracker](docs/progress/tracker.md).

Reutilizar contexto vigente de la sesión; no releer documentos sin cambios ni cargar todo el repositorio. Este archivo es un mapa de consulta, no una copia de las reglas ni una bitácora.

## Consultas según la tarea

| Necesidad | Fuente |
| --- | --- |
| Límites técnicos, carpetas y decisiones | [Arquitectura](docs/ai-context/architecture.md) |
| Nombres, identificadores, ramas y commits | [Convenciones](docs/ai-context/conventions.md) |
| Interfaces y reglas visuales | [Sistema de diseño](docs/ai-context/design-system.md) |
| Historias, tareas, DoD, plantillas y testing | [Estándares de documentación](docs/ai-context/documentation.md) |
| Requisitos concretos | `docs/specs/`, cuando existan especificaciones; acceder desde el tracker |
| Estado oficial | [Tracker](docs/progress/tracker.md); no duplicar sus estados |
| Cambios relevantes | [CHANGELOG](docs/progress/CHANGELOG.md) |
| Comparación visual del dashboard | [Galería](design-lab/index.html) y [especificación del laboratorio](docs/specs/dashboard-design-lab.md); P guía colores, fuentes y jerarquía, no impone disposición o densidad a otros módulos |

## Diseño con Impeccable

La skill local `impeccable` y `/impeccable` están disponibles para planificación o revisiones visuales justificadas, también al trabajar con Claude dentro de OpenCode. Consultar el [contrato de integración](docs/ai-context/design-system.md#3-integración-de-impeccable) antes de utilizarlos. No ejecutar revisiones por cada edición ni cargar todas las referencias. La skill no autoriza cambios adicionales ni sustituye las verificaciones.

El cierre visual de cada página diseñada con Impeccable se rige por la [revisión posterior con Emil Design Engineering](docs/ai-context/design-system.md#4-integración-de-emil-design-engineering). Si existe código React afectado, Frontend continúa con [React Best Practices](docs/ai-context/design-system.md#7-react-best-practices), sin trasladar reglas de Next.js al stack aprobado.

## Subagentes y controles

Los seis perfiles nativos de OpenCode V2 y los cuatro controles están descritos en [.opencode/README.md](.opencode/README.md). El principal delega únicamente lo necesario y autorizado, con contexto y entregables acotados; los hijos no delegan. Crear los perfiles no autoriza implementar la aplicación en la etapa actual.

Frontend y Backend siguen el [ciclo Git por tarea](docs/ai-context/conventions.md#ciclo-git-de-frontend-y-backend): rama nueva desde `origin/develop` recién obtenido por fetch y commit local dentro del encargo autorizado, sin push o integración implícitos. El principal comprueba aislamiento de carpetas y coordina evidencia/DoD; no se trasladan esos permisos a los demás perfiles.

## Verificación

El agente principal selecciona verificaciones según el [procedimiento de testing](docs/ai-context/documentation.md#7-procedimiento-de-testing), revisa el plan si cambian alcance/dependencias/riesgo y analiza fallos que requieran criterio. La skill `testing` se retiró por decisión del usuario: el hook ejecuta las comprobaciones rápidas seleccionadas, no decide cuáles satisfacen los criterios. Reutilizar resultados válidos y no ejecutar pruebas por cada edición.

Los [cuatro controles](docs/ai-context/documentation.md#9-cuatro-controles-y-skills) separan requisitos (`/kofi-start`), documentación (Git pre-commit), alcance y testing (`/kofi-verify`). El cierre es explícito, no por edición o inactividad. La [CI inicial](.github/workflows/ci.yml) verifica la base técnica en GitHub tras publicarse; no asumir ejecución remota, protección de ramas, pruebas del POS o éxito por crear el archivo. El principal comprueba la DoD antes de actualizar tracker. Consultar el README para comandos, contexto local y límites de caché.

## Cómo actuar

- Distinguir decisiones aprobadas de propuestas; consultar al responsable ante ambigüedades o contradicciones.
- Respetar el alcance autorizado y la etapa definida en la constitución.
- Registrar resultados reales; actualizar el tracker solo después de comprobar la DoD.
- No instalar herramientas, activar automatizaciones ni hacer commits o pushes sin autorización.
