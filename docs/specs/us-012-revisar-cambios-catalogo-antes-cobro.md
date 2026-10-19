# US-012 — Revisar cambios del catálogo antes de cobrar

## Descripción

Como operador, quiero conocer los cambios de precio o desactivación que afecten mi selección, para revisar la venta antes de cobrar.

## Objetivo

Evitar cobrar un total modificado sin conocimiento del operador y resolver los cambios concurrentes del catálogo antes del cobro.

## Alcance

- Módulo: Gestión de ventas.
- Incluye: comprobación al pasar a revisión previa al cobro, aviso, resolución de cambios y confirmación explícita del total.
- Excluye: edición o bloqueo global del catálogo, procesamiento de pagos, estados de pedidos y seguimiento de preparación.
- La revisión es parte del recorrido de la venta en curso; no crea una entidad de pedido ni promete persistencia o recuperación de la selección.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Al pasar a la revisión previa al cobro se comprueban cambios de precio y desactivación de los productos seleccionados. |
| CA-02 | Si cambió un precio, se muestran el anterior y el nuevo. El precio vigente se aplica solo después de que el operador confirme la revisión; no se permite conservar el anterior por elección en esa revisión. |
| CA-03 | Si se desactivó un producto seleccionado, se avisa y se exige retirarlo antes de continuar al cobro. |
| CA-04 | Se muestra el total resultante y se exige confirmación explícita de la revisión antes del cobro. Ningún cambio de precio o desactivación modifica silenciosamente el total. Una selección vacía no permite pasar a la revisión ni al registro conforme a US-011 CA-05. |
| CA-05 | Si el catálogo cambia después de recibir el dinero y antes del registro, se respetan el nombre, el precio y los productos de la revisión confirmada, incluso si luego se renombran o desactivan. No se exige rehacer el cobro por esa edición concurrente. El registro de esa operación corresponde a US-013. |
| CA-06 | Al confirmar la revisión quedan fijados la selección y el total para cobrar. Los cambios posteriores del catálogo, también entre esa confirmación y recibir el dinero, no modifican esa operación ni bloquean el catálogo. No hay caducidad automática de la revisión durante ese recorrido. |
| CA-07 | Cambiar productos o cantidades antes del pago invalida la revisión y exige revisarla y confirmarla nuevamente. Después de recibir el dinero se registra exactamente lo confirmado, sin editar esa operación durante el registro. Recargar, cerrar la pestaña o cerrar sesión descarta la revisión, sin recuperación, conforme a US-010. Un rechazo definitivo del registro también invalida la revisión y exige revisarla y confirmarla nuevamente, conforme a US-013 CA-09. |
| CA-08 | Si hay una revisión confirmada cuyo registro no se ha enviado, el cierre manual de sesión de [US-002](us-002-cerrar-sesion.md) muestra antes de cerrar un aviso específico de que se descartará una revisión confirmada sin registrar, cuyo dinero puede haberse recibido ya. El aviso permite cancelar el cierre: al cancelar, la sesión, la selección y la revisión confirmada se conservan; al aceptar, se cierra sesión conforme a US-002 y se descarta la revisión. Sin revisión confirmada pendiente de envío, se aplica el aviso general de descarte de US-010 CA-05. |

### Condiciones previas a implementar

Las reglas del intervalo revisión–pago y ajustes posteriores ya están aprobadas en CA-06/CA-07. Concretar el contrato y la evidencia de revisión protegida por backend, vinculada a operación y contenido, conforme a la [base técnica](../ai-context/architecture.md#7-base-técnica-mínima-aprobada). Debe impedir alteraciones y definir la carrera entre comprobar catálogo y confirmar la revisión: la fijación ocurre al confirmar, no por una lectura previa arbitrariamente antigua. No hay verificación automática del pago ni persistencia recuperable del borrador; los detalles del protocolo siguen pendientes y no se presumen resueltos por el versionado del catálogo.

Protocolo aprobado el 2026-10-19 (ver Aprobación):

- Confirmar la revisión es una operación del backend. Recibe la identidad de operación y las líneas con los precios y nombres que vio el operador, y relee el catálogo en ese momento. Si algún precio, nombre o activación difiere, no confirma: devuelve las diferencias y el operador revisa de nuevo (CA-02 y CA-03). Así la fijación ocurre al confirmar y no depende de una lectura previa.
- Si coincide, el backend emite una evidencia firmada con HMAC y un secreto del servidor configurado por entorno, que contiene la identidad de operación, las líneas (identidad, nombre, precio y cantidad), el total y el instante de confirmación. No se guarda en base de datos ni caduca, conforme a CA-06.
- El registro de US-013 verifica la firma y exige que su contenido coincida exactamente con la evidencia; cualquier alteración es un rechazo definitivo (US-013 CA-09). La evidencia no es un borrador recuperable y solo vive en memoria de la pestaña.

### Verificación prevista de los criterios

- CA-01 a CA-04: integración con dos sesiones, una preparando la venta y otra editando precios o desactivando productos; comprobar avisos, ambos precios, retiro exigido, confirmación del total y ausencia de cambios silenciosos. Incluir precio y desactivación cambiando conjuntamente y selección que queda vacía.
- CA-05: recorrido con revisión confirmada y recepción manual del dinero, seguido de renombrado, edición de precio o desactivación concurrente antes del registro; comprobar que se conservan nombre, precio y productos revisados en esa operación sin afectar nuevas selecciones.
- CA-06: dos sesiones con revisión confirmada y cambio de precio/desactivación antes de recibir el dinero; comprobar conservación de selección/total y continuidad del catálogo para otras operaciones. Simular paso de tiempo sin salida y verificar que no caduca automáticamente.
- CA-07: cambiar cantidades/productos antes del pago exige nueva revisión; después del pago no se edita la operación. En navegador real, recarga/cierre/salida descarta revisión sin recuperarla; US-013 comprueba por separado el resultado de un envío incierto y la invalidación por rechazo definitivo (US-013 CA-09).
- CA-08: en navegador real, cierre manual de sesión con revisión confirmada sin enviar, comprobando el aviso específico, que cancelar conserva sesión, selección y revisión confirmada y que aceptar cierra sesión y la descarta; repetir sin revisión confirmada y después de un envío para comprobar que no aparece. No aplica a la expiración por inactividad, que US-001 CA-05 excluye.
- Concretar carreras durante comprobación y confirmación junto con el contrato; incluir intentos de alterar contenido o reutilizar la evidencia para una operación distinta. No se considera cubierto por la concurrencia de edición del catálogo.

Estas verificaciones están previstas, no ejecutadas. Hoy no hay aplicación ni comandos de pruebas del POS; antes de implementar, el principal concretará casos y comandos según el [procedimiento de testing](../ai-context/documentation.md#7-procedimiento-de-testing).

## Dependencias relevantes

- [US-007 — Editar productos](us-007-editar-productos.md) y [US-009 — Desactivar y reactivar productos](us-009-desactivar-reactivar-productos.md): cambios concurrentes del catálogo, sin trasladarles el flujo de ventas.
- [US-010 — Consultar y seleccionar productos para vender](us-010-consultar-seleccionar-productos-venta.md) y [US-011 — Ajustar y revisar la venta en curso](us-011-ajustar-revisar-venta-en-curso.md): selección, cantidades y total.
- [US-013 — Registrar la venta después del pago](us-013-registrar-venta-pagada.md): conservación de lo revisado tras recibir el dinero y registro íntegro.
- [US-002 — Cerrar sesión](us-002-cerrar-sesion.md): cierre manual sobre el que se muestra el aviso de CA-08, que solo añade la posibilidad de cancelarlo; el cierre aceptado no cambia.

## Aprobación

El responsable respondió «si apruebo todo» en la conversación del 2026-10-18 a las cuatro historias propuestas con `requirements-analyst` y las siete recomendaciones del principal. Incluye expresamente la recomendación destacada del punto 4: respetar precio y productos de la revisión confirmada si el catálogo cambia después de cobrar, incluso ante desactivación. Esta precisión sustituye la formulación general pendiente de concretar de producto para ese caso; no permite seleccionar nuevos productos inactivos. La aprobación autoriza el registro documental, no implementar código ni aprobar tareas técnicas todavía no presentadas.

Posteriormente, el 2026-10-18, el responsable respondió «si» a «¿Apruebas estas nueve tareas para asignarles IDs y registrarlas como pendientes, sin iniciar implementación?». Queda aprobado su registro documental como TASK-024 a TASK-032 en US-010 a US-013. La aprobación no resuelve las decisiones pendientes de revisión/cobro, ajustes posteriores o comprobación de registros inciertos tras salida ni autoriza implementar.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y autorizó documentarlas sin implementación. Esta aprobación posterior resuelve la fijación desde confirmar para cobrar, la nueva revisión al ajustar antes del pago, el registro sin edición después del pago y la ausencia de caducidad automática, sin recuperación tras salida. Se añaden CA-06/CA-07 y verificaciones a TASK-028/TASK-029; los contratos técnicos y carreras no concretados siguen pendientes.

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-028 se amplía con la conexión en `frontend/src/sales/api/` y la verificación integrada de la resolución y la confirmación; TASK-029 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

El 2026-10-19 el responsable respondió «sigue tus sugerencias» a las preguntas planteadas por `requirements-analyst` sobre Gestión de ventas. En esta historia:

- Nombre conservado (pregunta P8, opción a): la operación conserva el nombre vigente en la revisión confirmada, igual que el precio. Lo incorpora CA-05.
- Rechazo definitivo (pregunta P9, opción a): invalida la revisión y exige revisar de nuevo. CA-07 remite a US-013 CA-09.
- Aviso al cerrar sesión (pregunta P10, opción a): aviso específico antes del cierre manual con una revisión confirmada sin enviar, en el nuevo CA-08. El 2026-10-19 el responsable confirmó además que el aviso permite cancelar el cierre («Sí: el aviso de US-012 CA-08 permite cancelar el cierre de sesión»). La expiración no aplica, porque US-001 CA-05 establece que la sesión no expira por inactividad.
- Precisión de CA-04: la selección vacía no permite pasar a la revisión.

TASK-028 cubre los cambios. El protocolo de evidencia y las carreras de confirmación siguen pendientes. No autoriza implementación ni cambios en el tracker.

El 2026-10-19 el responsable respondió «para todo esto usa tus sugerencias» a las preguntas pendientes de Gestión de ventas e Historial, y se adoptaron las sugerencias del principal. Se aprueban el protocolo de evidencia y la carrera de confirmación descritos en las condiciones previas: confirmación en backend con relectura del catálogo y evidencia firmada con HMAC, sin almacenamiento ni caducidad. TASK-028 lo cubre sin cambiar su alcance. No autoriza implementación ni cambios en el tracker.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` están aprobadas para registro documental. TASK-028 sustituyó la etiqueta local P12-A; TASK-029 (P12-B) se retiró el 2026-10-19. Su estado se consulta únicamente en el [tracker](../progress/tracker.md). Este registro no autoriza implementar.

### Condiciones previas compartidas

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Aplicar CA-06/CA-07: las reglas de fijación, ajustes y continuidad hasta el registro ya están aprobadas; no se mantienen como decisiones abiertas ni se introduce caducidad.
- Concretar contrato entre comprobación, resolución, confirmación y registro, y protección de la evidencia backend. Faltan DTO/rutas y mecanismo de protección/confirmación concurrente; la concurrencia de edición del catálogo no sustituye este contrato.
- Las tareas pueden construirse contra contratos aprobados. El recorrido completo de conservación tras el cobro requiere US-013; no obliga a implementar primero su interfaz para construir la comprobación de catálogo.
- Aplican las condiciones de cierre visual de [US-010](us-010-consultar-seleccionar-productos-venta.md#condiciones-previas-compartidas). Las verificaciones siguientes son futuras, no ejecutadas; no hay pruebas del POS configuradas.

### TASK-028 — Comprobar y proteger la revisión e integrar su resolución y confirmación

- Historia relacionada: [US-012](us-012-revisar-cambios-catalogo-antes-cobro.md).
- Responsabilidad: backend.
- Descripción y objetivo: contrastar la selección con el catálogo y sustentar una revisión confirmada utilizable en el registro.
- Alcance y exclusiones: detectar cambios de precio y desactivación, proporcionar información para resolverlos y proteger lo revisado según el contrato aprobado. Sin bloqueo global del catálogo, procesamiento de pagos ni persistencia de borradores. Conecta la revisión de Frontend en `frontend/src/sales/api/` y verifica con dos sesiones que ningún cambio se aplica silenciosamente ni se continúa al cobro con productos desactivados pendientes o selección vacía.
- Resultado esperado: diferencias comprobables y base fiable para respetar precios y productos revisados ante cambios posteriores al cobro.
- Criterios aplicables: CA-01, CA-02 y CA-03 (P), CA-04 (P), CA-05, CA-06, CA-07 (invalidación y descarte, C) y CA-08 (aviso de cierre, C); protección de fijación y contenido y rechazo de registros no correspondientes a la revisión confirmada.
- Verificación prevista: integración con dos sesiones, cambios conjuntos de precio/desactivación y carreras definidas por el contrato aprobado. Comprobar retiro exigido, aplicación del precio vigente tras confirmar y conservación de lo revisado tras cambios posteriores al cobro, integrada con US-013.
- Dependencias: US-007/US-009 (TASK-018 y TASK-022), TASK-024 de US-010, TASK-027 de US-011 y resolución de las condiciones previas; registro de entrega de la revisión. La verificación completa de CA-05 requiere TASK-030 de US-013, y la de CA-08 requiere TASK-006 de US-002.

### Tareas retiradas

- TASK-029 — Guiar la resolución y confirmación explícita de la revisión — Retirada el 2026-10-19; cobertura en TASK-028. La interfaz la implementa Frontend sin tareas.
