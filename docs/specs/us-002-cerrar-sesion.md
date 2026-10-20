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

| ID    | Comportamiento observable                                                                                                                                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | El menú hamburguesa compartido incluye la opción de cerrar sesión en todas las pantallas del sistema con sesión iniciada.                                                                                                                    |
| CA-02 | Al confirmar el servidor el cierre manual, la sesión actual queda invalidada sin esperar los dos minutos de ausencia de señales y se muestra la pantalla de inicio de sesión. Las demás sesiones de la cuenta compartida permanecen activas. |
| CA-03 | Para volver a operar después del cierre, es necesario iniciar sesión nuevamente.                                                                                                                                                             |

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

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-006 asume la conexión del cierre y su verificación integrada y TASK-007 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Implementación conjunta de Acceso autorizada

El responsable autorizó el 2026-10-19 resolver US-001/US-002 como un módulo integrado en la rama actual, incluidas las dependencias internas y ajustes mínimos de componentes, sin nuevas ramas ni push. El cierre ya tiene endpoint real, revocación persistente individual, cliente y menú conectados. La [evidencia conjunta](../progress/access-module-integration.md) contiene comprobaciones HTTP/MongoDB y recorridos Chrome/Edge, manejo de fallos/incertidumbre y pendientes reales. No se cambia la DoD ni se considera completa la garantía nativa de pestaña de US-001.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` fueron aprobadas para su registro. TASK-006 sustituyó la etiqueta local BE-4. Aplican las condiciones técnicas previas, incluida la integración común, de [US-001](us-001-iniciar-sesion.md#condiciones-previas-a-implementar). Su estado se consulta únicamente en el [tracker](../progress/tracker.md).

### TASK-006 — Finalizar manualmente la sesión e integrar el cierre

- Historia relacionada: [US-002](us-002-cerrar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: invalidar la sesión actual al confirmar el cierre, sin esperar el margen por pérdida de comunicación y sin afectar otras sesiones de la cuenta, y conectar la acción del menú compartido que implementa Frontend.
- Alcance y exclusiones: contrato y endpoint de cierre; conexión en `frontend/src/auth/api/`; liberación de la autorización de la pestaña en coordinación con TASK-005. La verificación integrada comprueba la opción en cada pantalla integrada, el retorno al inicio de sesión, las señales tardías y que las demás sesiones siguen intactas. Sin recuperación ni administración de cuentas; no diseña el menú.
- Resultado esperado: tras la confirmación, la autorización anterior no permite operar ni renovarse y se vuelve al inicio de sesión; puede realizarse un nuevo inicio válido. El cierre no afecta sesiones concurrentes ni posteriores.
- Criterios aplicables: CA-01 (P, revisión manual), CA-02 y CA-03; cierre manual de US-001 CA-05 y CA-09.
- Dependencias: TASK-002, TASK-003 y TASK-005 de US-001, contrato de cierre y registro de entrega del menú compartido. CA-01 se amplía con cada pantalla integrada.

### Tareas retiradas

- TASK-007 — Integrar cierre en el menú compartido — Retirada el 2026-10-19; cobertura en TASK-006. El menú lo implementa Frontend sin tareas.

## Interfaz — Acceso: referencia de entrega

La entrega de interfaz simulada de US-001 y US-002, incluidos menú compartido, cierre pendiente/confirmado/fallido/incierto, supuestos de contrato, rama/commit, revisiones y verificaciones, se registra una sola vez en [US-001 — Registro de entrega de Acceso](us-001-iniciar-sesion.md#interfaz--acceso-registro-de-entrega). No acredita la invalidación real ni la DoD de US-002: CA-01 a CA-03 se verifican integrados en TASK-006 y su cobertura se amplía al incorporar pantallas.
