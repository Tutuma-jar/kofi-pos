# US-002 — Cerrar sesión

## Descripción

Como operador, quiero cerrar sesión desde cualquier pantalla para finalizar el acceso al sistema.

## Objetivo

Permitir al operador finalizar manualmente la sesión desde un punto de acceso compartido por las pantallas del sistema.

## Alcance

- Incluye: opción de cerrar sesión en el menú hamburguesa compartido, finalización del acceso y retorno al inicio de sesión.
- Excluye: diseño del resto de la navegación, administración de cuentas y recuperación de contraseña o sesión.
- El requisito de menú compartido no presupone mostrar una acción de cierre cuando no existe sesión.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | El menú hamburguesa compartido incluye la opción de cerrar sesión en todas las pantallas del sistema con sesión iniciada. |
| CA-02 | Al confirmar el servidor el cierre manual, la sesión actual queda invalidada sin esperar los dos minutos de ausencia de señales y se muestra la pantalla de inicio de sesión. Las demás sesiones de la cuenta compartida permanecen activas. |
| CA-03 | Para volver a operar después del cierre, es necesario iniciar sesión nuevamente. |

### Verificación prevista de los criterios

- CA-01: revisión manual del menú en las pantallas del sistema; es apropiada para comprobar presencia y ubicación de la acción compartida.
- CA-02 y CA-03: integración de la finalización de sesión y recorrido de cierre confirmado, invalidación sin esperar el margen de presencia, retorno al inicio e intento de acceso sin autenticarse de nuevo. Comprobar que señales tardías no reactivan la sesión cerrada, que su cierre no afecta sesiones concurrentes ni posteriores y que se permite un nuevo inicio válido.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal seleccionará los comandos y casos concretos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no hay aplicación ni herramientas de pruebas del POS configuradas.

## Dependencias relevantes

- [US-001 — Iniciar sesión](us-001-iniciar-sesion.md): acceso, protección de los módulos y reglas de sesión.
- El menú hamburguesa compartido debe incorporar la acción en las pantallas que se implementen; esta historia no define otras opciones del menú.

## Aprobación

El responsable del proyecto aprobó explícitamente estas dos historias en la conversación del 2026-10-18, respondiendo «si» a «¿Apruebas estas dos historias con este alcance?». Previamente confirmó el cierre desde el menú hamburguesa compartido y el retorno a la pantalla de inicio de sesión.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

En la misma conversación del 2026-10-18, el responsable aprobó el ajuste de ciclo de sesión descrito en [US-001](us-001-iniciar-sesion.md): el cierre manual confirmado libera el acceso sin esperar el margen de dos minutos previsto para pérdida de comunicación. Esa aprobación permitió actualizar las historias y preparar tareas, sin aprobar todavía esas tareas ni su implementación.

Posteriormente, el 2026-10-18, respondió «si» a «¿Apruebas estas tareas para registrarlas, sin iniciar todavía la implementación?». Quedaron aprobadas las siete tareas presentadas por `requirements-analyst`; en esta historia se definen TASK-006 y TASK-007 y en US-001, TASK-001 a TASK-005. La aprobación autoriza su registro documental, no iniciar la implementación; se conservan las condiciones técnicas previas.

La autorización posterior del 2026-10-18 para permitir sesiones simultáneas en US-001 elimina la exclusividad de la cuenta. Se adecúa esta historia y sus tareas para cerrar solo la sesión actual, sin finalizar las demás. No se añade una acción de cierre global ni se autoriza implementación.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` fueron aprobadas para su registro. TASK-006 y TASK-007 sustituyen las etiquetas locales BE-4 y FE-3, respectivamente. Aplican las condiciones técnicas previas de [US-001](us-001-iniciar-sesion.md#condiciones-previas-a-implementar). Su estado se consulta únicamente en el [tracker](../progress/tracker.md).

### TASK-006 — Finalizar manualmente la sesión

- Historia relacionada: [US-002](us-002-cerrar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: invalidar la sesión actual al confirmar el cierre, sin esperar el margen por pérdida de comunicación y sin afectar otras sesiones de la cuenta.
- Alcance y exclusiones: cierre manual de la sesión autorizada; sin recuperación ni administración de cuentas.
- Resultado esperado: tras la confirmación, la autorización anterior no permite operar ni renovarse y puede realizarse un nuevo inicio válido. El cierre no afecta sesiones concurrentes ni posteriores.
- Criterios aplicables: CA-02 y CA-03; cierre manual de US-001 CA-05 y CA-09.
- Dependencias: TASK-002 y TASK-003 de US-001, y contrato de cierre.

### TASK-007 — Integrar cierre en el menú compartido

- Historia relacionada: [US-002](us-002-cerrar-sesion.md).
- Responsabilidad: frontend.
- Descripción y objetivo: ofrecer cierre en todas las pantallas autenticadas, solicitarlo y, tras confirmación, volver al inicio de sesión.
- Alcance y exclusiones: acción compartida de cierre; no incluye diseñar otras opciones del menú ni implementar pantallas de otros módulos.
- Resultado esperado: acción disponible en las pantallas integradas; cierre confirmado seguido de retorno al inicio de sesión; intentar operar después exige autenticarse nuevamente.
- Criterios aplicables: CA-01, CA-02 y CA-03.
- Dependencias: TASK-006, TASK-005 de US-001 y menú compartido disponible. Se amplía la comprobación conforme se incorporen pantallas.
- Integración final: comprobar el recorrido de cierre, rechazo de la autorización anterior y nuevo inicio. Se verifica aquí, sin una tarea genérica adicional de QA.
