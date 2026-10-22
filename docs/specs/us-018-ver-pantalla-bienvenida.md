# US-018 — Ver la pantalla de Bienvenida

## Descripción

Como operador, quiero ver una pantalla de Bienvenida con el texto «Hello world», para disponer de una página propia del módulo cuyo propósito se definirá más adelante.

## Objetivo

Mostrar una pantalla simple y estática con el texto registrado en [product.md §3.6](../ai-context/product.md#36-bienvenida), sin alterar el resto de módulos.

## Alcance

- Módulo: Bienvenida, fuera del MVP según [product.md §4](../ai-context/product.md#4-alcance-inicial).
- Incluye: una página aparte que muestra el texto literal «Hello world», en la ruta `/welcome`, protegida con el acceso autenticado como el resto del POS.
- Excluye: sustituir al Dashboard como destino tras iniciar sesión, en la ruta comodín o en el enlace principal del layout; entrada en el menú lateral; backend, endpoints, persistencia y datos del catálogo o de ventas; contenido adicional, personalización o textos dinámicos; incorporación al MVP.
- No fija disposición visual: se define en el diseño de la página.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 (P) | Un operador con sesión iniciada que navega a `/welcome` ve el texto exacto «Hello world» como contenido principal. |
| CA-02 (C) | Un visitante sin sesión que navega a `/welcome` es enviado a `/login` con el aviso de autenticación requerida, igual que en las demás rutas protegidas. |
| CA-03 (C) | Tras un inicio de sesión correcto o al navegar a una ruta inexistente, el destino sigue siendo `/dashboard`, y el menú lateral no muestra una entrada de Bienvenida. |
| CA-04 (P) | La pantalla usa el sistema de diseño y el layout autenticado, no muestra datos del negocio ni realiza peticiones al servidor. |

### Verificación prevista de los criterios

- CA-01: prueba de ruta con Vitest y Testing Library que busca el texto exacto.
- CA-02: prueba de ruta análoga a las rutas protegidas de `App.test.tsx`.
- CA-03: las pruebas existentes de redirección de `App.test.tsx` siguen pasando y se comprueba la ausencia de la entrada en la navegación.
- CA-04: revisión visual manual justificada, al no haber reglas de negocio, y comprobación en la prueba de que no se usa ningún cliente de API.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing).

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): sesión y protección de rutas.
- [US-003 — Consultar el resumen de ventas](us-003-consultar-resumen-ventas.md): el Dashboard sigue siendo la pantalla de entrada.

## Aprobación

El 2026-10-20 el responsable aprobó esta historia con las recomendaciones de `requirements-analyst`: «Apruebo US-018 con las recomendaciones del analista: página aparte, protegida, sin menú, ruta /welcome, texto «Hello world», fuera del MVP, solo la historia sin implementar y criterios cubiertos por la entrega de Frontend sin TASK».

La aprobación corresponde a la historia y sus criterios y no autoriza implementación; la [constitución](../ai-context/constitution.md#11-etapa-actual) exige autorización separada para crear la página, su carpeta o su ruta.

## Tareas técnicas asociadas

Ninguna. Como excepción aprobada el 2026-10-20 a la asignación de criterios P y C a una tarea backend de [documentación §2](../ai-context/documentation.md#2-historias-y-atomización), la historia no tiene backend ni nada que integrar: sus criterios se acreditan en el registro de entrega de interfaz de Bienvenida, en esta especificación, cuando se autorice su implementación.
