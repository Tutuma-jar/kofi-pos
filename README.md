# Kofi

Kofi es un **punto de venta (POS) web para una cafetería**. Permite iniciar sesión con una cuenta compartida del local, consultar un dashboard de ventas, administrar el menú (productos, categorías y su activación) y, como objetivo final, registrar ventas y consultar su historial.

- **Aplicación desplegada:** <https://kofi-pos.onrender.com>
- **Usuario de demostración:** `admin` · **Contraseña:** `admin`

> El plan gratuito de Render se suspende tras 15 minutos sin tráfico: la primera carga puede tardar alrededor de un minuto.

## Equipo

- Pablo Ramírez ([@Tutuma-jar](https://github.com/Tutuma-jar))
- Natalia Arteaga

## Arquitectura y despliegue

| Parte         | Tecnología                                          | Despliegue                                                                                        |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Frontend      | React 19 + TypeScript + Vite                        | Compilado y servido por Express en el mismo origen                                                |
| Backend       | Express 5 + TypeScript (API en `/api`)              | Render Web Service, plan free, despliegue automático desde `develop` ([render.yaml](render.yaml)) |
| Base de datos | MongoDB (replica set, necesario para transacciones) | MongoDB Atlas M0; la URI se configura solo en el panel de Render                                  |

La integración continua está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml): en cada PR y push a `develop` ejecuta tipos, lint, formato, pruebas (Vitest y Supertest) y build. Instalación, desarrollo local y pasos de despliegue: [guía técnica](docs/development.md).

## Estado del desarrollo

El estado oficial de cada historia y tarea está en el [tracker](docs/progress/tracker.md); una tarea solo se marca completada al comprobar su Definición de Hecho. Resumen por módulo:

| Módulo                  | Historias       | Estado                                                                                                                                                                                         |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                  | US-001, US-002  | Interfaz, API y MongoDB integrados: login, sesiones revocables, presencia y cierre de sesión. Pendiente la protección completa de pestañas (TASK-005, bloqueada)                               |
| Dashboard               | US-003 a US-005 | Interfaz conectada al backend; las métricas reales dependen del registro de ventas, aún no implementado                                                                                        |
| Administración del menú | US-006 a US-009 | Interfaz, API y MongoDB integrados: registrar, editar, activar/desactivar productos y crear, renombrar y eliminar categorías con control de concurrencia. Pendiente el cierre formal de la DoD |
| Gestión de ventas       | US-010 a US-013 | Interfaz completa con datos simulados; backend pendiente                                                                                                                                       |
| Historial y reportes    | US-014 a US-017 | Especificado; sin implementar                                                                                                                                                                  |

Aproximadamente **9 de 17 historias** tienen implementación integrada y 4 más tienen interfaz simulada. La documentación SDD (constitución, producto, especificaciones por historia, tracker y changelog) está en [`docs/`](docs).

## Desarrollo asistido por IA

El proyecto se desarrolla con **OpenCode** y **Claude Code** sobre un contexto común ([AGENTS.md](AGENTS.md) y [`docs/ai-context/`](docs/ai-context)). Detalle de controles y permisos: [`.opencode/README.md`](.opencode/README.md).

### Hooks

| Hook                         | Ubicación                                              | Qué hace                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` de Git          | [`.githooks/pre-commit`](.githooks/pre-commit)         | Ejecuta `kofi-check docs`: valida que la documentación requerida por la tarea esté preparada y que no se cierren tareas del tracker sin evidencia. Se activa con `git config --local core.hooksPath .githooks` |
| Control de requisitos        | `/kofi-start`                                          | Comprueba que la tarea tenga especificación y aprobación y registra su base antes de implementar                                                                                                               |
| Control de alcance y testing | `/kofi-verify`                                         | Al cerrar una tarea, verifica que los cambios estén dentro del alcance autorizado y ejecuta las comprobaciones seleccionadas                                                                                   |
| Integración continua         | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Check `technical-checks` obligatorio para integrar en `develop`                                                                                                                                                |

Los tres controles locales usan el mismo script determinista, [`kofi-check.mjs`](.opencode/scripts/kofi-check.mjs), con su propia batería de pruebas.

### Subagentes

Definidos en [`.opencode/agents/`](.opencode/agents) y expuestos a Claude Code en [`.claude/agents/`](.claude/agents). Solo actúan con autorización explícita, tienen herramientas restringidas por rol y no delegan en otros agentes.

| Subagente              | Responsabilidad                                                            |
| ---------------------- | -------------------------------------------------------------------------- |
| `requirements-analyst` | Redacta especificaciones SDD, criterios verificables y tareas; no programa |
| `architect`            | Propone decisiones estructurales justificadas; no implementa               |
| `database`             | Diseña modelos, colecciones e índices de MongoDB                           |
| `backend`              | Implementa la API Express, validaciones y reglas de negocio                |
| `frontend`             | Diseña e implementa la interfaz React con las skills de diseño             |
| `documenter`           | Registra cambios y verificaciones reales sin inventar resultados           |

### Skills y comandos

| Skill / comando               | Uso en Kofi                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `impeccable`                  | Planificación y revisión del diseño de cada página (jerarquía, accesibilidad, estados) |
| `emil-design-eng`             | Revisión posterior de pulido visual, componentes y animaciones                         |
| `react-best-practices`        | Revisión de rendimiento y patrones del código React                                    |
| `design-taste-frontend`       | Dirección de arte; carga solo bajo pedido explícito                                    |
| `/kofi-start`, `/kofi-verify` | Controles de requisitos y de alcance/testing descritos en [Hooks](#hooks)              |
| `/impeccable`                 | Comando para lanzar una revisión de diseño con el contexto aprobado                    |

Los criterios de uso de las skills de diseño están en el [sistema de diseño](docs/ai-context/design-system.md).
