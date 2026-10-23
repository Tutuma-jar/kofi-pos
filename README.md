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

La integración continua está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml): mediante ejecución manual permite comprobar tipos, lint, formato, pruebas (Vitest y Supertest) y build. Instalación, desarrollo local y pasos de despliegue: [guía técnica](docs/development.md).

## Estado del desarrollo

El [tracker](docs/progress/tracker.md) conserva el registro existente de historias y tareas como referencia. Resumen por módulo:

| Módulo                  | Historias       | Estado                                                                                                                                                                                         |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                  | US-001, US-002  | Interfaz, API y MongoDB integrados: login, sesiones revocables, presencia y cierre de sesión. Pendiente la protección completa de pestañas (TASK-005, bloqueada)                               |
| Dashboard               | US-003 a US-005 | Interfaz conectada al backend; las métricas reales dependen del registro de ventas, aún no implementado                                                                                        |
| Administración del menú | US-006 a US-009 | Interfaz, API y MongoDB integrados: registrar, editar, activar/desactivar productos y crear, renombrar y eliminar categorías con control de concurrencia. Pendiente el cierre formal de la DoD |
| Gestión de ventas       | US-010 a US-013 | Interfaz completa con datos simulados; backend pendiente                                                                                                                                       |
| Historial y reportes    | US-014 a US-017 | Especificado; sin implementar                                                                                                                                                                  |

Aproximadamente **9 de 17 historias** tienen implementación integrada y 4 más tienen interfaz simulada. La documentación SDD (constitución, producto, especificaciones por historia, tracker y changelog) está en [`docs/`](docs).

## Desarrollo asistido por IA

El usuario proporciona manualmente el contexto necesario en cada conversación. Las políticas anteriores, los controles locales y las restricciones por perfil se retiraron el 2026-10-22. La documentación existente se conserva como referencia opcional. Consulta [AGENTS.md](AGENTS.md) y la [configuración local](.opencode/README.md).
