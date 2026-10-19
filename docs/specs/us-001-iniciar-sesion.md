# US-001 — Iniciar sesión

## Descripción

Como operador, quiero acceder con usuario y contraseña para utilizar todo el sistema.

## Objetivo

Permitir el acceso del operador al POS mediante una sesión, sin roles ni permisos diferenciados.

## Alcance

- Incluye: acceso con usuario y contraseña, una cuenta compartida, entrada directa al Dashboard, acceso a todos los módulos y varias sesiones simultáneas en distintos navegadores o computadoras. Cada sesión sigue vinculada a su propia pestaña autenticada.
- La cuenta se crea fuera de Kofi. Esta historia no define herramientas ni procedimientos para provisionarla.
- Excluye: registro y administración de cuentas dentro del sistema, recuperación de contraseña o sesión y roles diferenciados.
- La sesión se mantiene mediante señales periódicas de presencia de la pestaña autorizada, independientes de la actividad del operador. El margen aprobado sin señales es de dos minutos.
- La [base técnica aprobada](../ai-context/architecture.md#7-base-técnica-mínima-aprobada) selecciona sesiones opacas revocables en servidor, hash resistente y salado, HTTPS y presencia cada 30 segundos. Identidad de pestaña, protección de credenciales y autorización y contratos concretos siguen por resolver antes de implementar, sin alterar las reglas aprobadas.

## Criterios de aceptación

| ID | Comportamiento observable |
| --- | --- |
| CA-01 | Con usuario y contraseña válidos, se inicia sesión y se muestra directamente el Dashboard, aunque existan otras sesiones activas de la cuenta compartida. |
| CA-02 | Con credenciales incorrectas, se rechaza el acceso y se informa del error. |
| CA-03 | Sin una sesión válida, no se permite acceder a los módulos del sistema. |
| CA-04 | La cuenta compartida permite varias sesiones simultáneas en distintos navegadores o computadoras; iniciar otra no rechaza ni desplaza las existentes. Cada sesión solo se utiliza desde su propia pestaña autenticada: otras pestañas, incluidas las duplicadas, no reutilizan esa autorización. |
| CA-05 | La sesión no expira por inactividad del operador. Cerrar manualmente la sesión o cerrar la pestaña autorizada, incluso si quedan otras abiertas, exige otro inicio de sesión. La liberación en el servidor ante cierres no detectados se rige por CA-08. |
| CA-06 | Una sesión permite acceder a todos los módulos del sistema, sin roles diferenciados. |
| CA-07 | Recargar la pestaña autorizada conserva la sesión y no se trata como un cierre. |
| CA-08 | Mientras la pestaña autorizada siga enviando señales válidas de presencia, no se termina esa sesión por falta de uso del teclado o ratón. Si el servidor deja de recibir sus señales, finaliza esa sesión a los 120 segundos desde su última señal válida recibida, sin afectar las demás ni bloquear nuevos inicios. Si la suspensión del equipo o la pérdida de conexión impide recibir señales durante esos 120 segundos, se exige iniciar sesión nuevamente para operar desde esa sesión. |
| CA-09 | Después de finalizar o liberar la sesión, es necesario iniciar sesión nuevamente para operar; la autorización anterior no se recupera automáticamente. |

### Límites del cierre y presencia

El navegador no garantiza notificar el cierre de una pestaña o ventana. El aviso de salida es de mejor esfuerzo: si se recibe y procesa, se puede finalizar esa sesión antes; si no se recibe, aplica el margen de CA-08. No se promete invalidación inmediata en el servidor por cerrar una pestaña. Un nuevo acceso requiere autenticación, pero la existencia de otra sesión no lo bloquea.

El cierre manual confirmado por el servidor sí invalida la sesión actual sin esperar ese margen, conforme a US-002, sin finalizar las demás sesiones. La implementación debe distinguir recarga de cierre y contemplar duplicación y restauración del navegador, sin confiar únicamente en cookies, almacenamiento de pestaña o eventos de salida como garantía de vinculación de cada sesión a su pestaña.

### Decisiones técnicas aprobadas y bloqueo de pestaña

- Soporte inicial: Chrome y Edge de escritorio en sus versiones estables vigentes al validar. Registrar las versiones probadas; no afirmar compatibilidad con otros navegadores.
- Emitir presencia cada 30 segundos, también sin actividad del operador. Autorizar operaciones y renovación solo mientras no se alcance el límite de CA-08; TTL o limpieza diferida no pueden prolongar el acceso.
- Sesiones opacas, independientes y revocables en servidor; hash resistente y salado y provisión externa de la cuenta, conforme a arquitectura. La técnica de pestaña debe servir también para operaciones, imágenes y actualización del Dashboard.
- Antes de integrar acceso, validar recarga, duplicación, cierre y restauración en ambos navegadores. Esa validación está prevista, no ejecutada: requiere autorización de ejecución acotada. No hay un mecanismo de identidad de pestaña aprobado ni garantía técnica comprobada. Si no es viable cumplir los criterios, consultar alternativas antes de modificarlos.

### Verificación prevista de los criterios

- CA-01 y CA-02: comprobación del contrato de acceso y del recorrido de entrada, incluyendo destino y mensaje de rechazo.
- CA-03 y CA-06: integración de la protección de los módulos y comprobación de navegación y operaciones con y sin autorización de la pestaña válida.
- CA-04: integración con accesos simultáneos desde distintos navegadores o computadoras; comprobar admisión y continuidad de las sesiones. Verificar que una pestaña nueva o duplicada no reutilice la autorización de otra.
- CA-05 y CA-07: recorrido en navegador real de recarga, cierre de pestaña autorizada, cierre de ventana, restauración y cierre manual. El navegador real es necesario porque el ciclo de sus pestañas no puede acreditarse solo con pruebas del servidor.
- CA-08: integración del límite temporal con tiempo controlado, antes y al cumplirse 120 segundos desde la última señal válida de cada sesión; comprobar renovación sin actividad del operador, pérdida de señales e independencia entre sesiones. Complementar con navegador real para suspensión y desconexión.
- CA-09: comprobar que una autorización finalizada no permite operar ni se reactiva por señales tardías; verificar nuevo inicio. La finalización de una sesión no debe afectar las demás, concurrentes o posteriores.
- Ejecutar los recorridos de navegador en Chrome y Edge estables, incluidas restauración y duplicación, y comprobar presencia cada 30 segundos con tiempo controlado. No declarar resuelto el bloqueo de pestaña con pruebas de servidor o revisión documental.

Estas comprobaciones están previstas, no ejecutadas. Antes de implementar, el agente principal seleccionará los comandos y casos concretos disponibles según el procedimiento documental de testing; el hook ejecutará las comprobaciones rápidas aplicables. Hoy no hay aplicación ni herramientas de pruebas del POS configuradas.

## Dependencias relevantes

- [Producto: Inicio de sesión](../ai-context/product.md#31-inicio-de-sesión).
- El Dashboard es el destino aprobado; esta historia no define sus indicadores ni implementa su contenido.
- El cierre manual se especifica en [US-002 — Cerrar sesión](us-002-cerrar-sesion.md).

## Aprobación

El responsable del proyecto aprobó explícitamente estas dos historias en la conversación del 2026-10-18, respondiendo «si» a «¿Apruebas estas dos historias con este alcance?». Previamente confirmó usuario y contraseña, cuenta compartida creada fuera del sistema, exclusión de recuperación, fin de sesión al cerrar la ventana, ausencia de expiración por inactividad, acceso a todos los módulos, destino Dashboard y rechazo del nuevo acceso simultáneo.

La aprobación inicial correspondió a la historia y sus criterios; no autorizó implementación ni aprobó por sí sola las tareas técnicas.

En la misma conversación del 2026-10-18, el responsable aprobó el ajuste posterior respondiendo «si» a cerrar la pestaña autorizada aunque queden otras abiertas, conservar la sesión al recargar y liberar la sesión tras dos minutos desde la última señal de presencia. Aceptó el posible rechazo de nuevos accesos durante la espera y la necesidad de autenticarse nuevamente por suspensión o pérdida de comunicación. La exclusividad se precisó por pestaña, no solo por navegador. Esa aprobación permitió actualizar las historias y terminar la propuesta de tareas, sin aprobar todavía las tareas ni su implementación.

Posteriormente, el 2026-10-18, respondió «si» a «¿Apruebas estas tareas para registrarlas, sin iniciar todavía la implementación?». Quedaron aprobadas las siete tareas presentadas por `requirements-analyst`; en esta historia se definen TASK-001 a TASK-005 y en US-002, TASK-006 y TASK-007. La aprobación autoriza su registro documental, no iniciar la implementación; se conservan las condiciones técnicas previas siguientes.

Posteriormente, en la revisión del dashboard del 2026-10-18, el responsable respondió «autorizo» a cambiar US-001 para permitir varias sesiones simultáneas de la cuenta compartida, al advertirse la contradicción con la actualización entre computadoras y sesiones. Esta decisión sustituye el límite de una sola sesión por cuenta y el rechazo de accesos por sesión ocupada. Conserva las reglas de ciclo de vida y vinculación a la pestaña por cada sesión. Se adecuan las tareas existentes a esta decisión, sin cambiar sus identificadores ni autorizar implementación. Las aprobaciones anteriores se conservan como antecedentes, no como regla vigente de exclusividad de la cuenta.

El 2026-10-18, el responsable aprobó todas las recomendaciones de la base técnica mínima y autorizó documentarlas sin implementación ni instalaciones. Se concretan navegadores, sesiones y frecuencia de presencia; se conservan los 120 segundos y los criterios existentes. La validación y el mecanismo definitivo de identidad de pestaña permanecen pendientes.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` fueron aprobadas para su registro. Sus identificadores oficiales sustituyen las etiquetas locales BE-1, BE-2, BE-3, FE-1 y FE-2, respectivamente. Su estado se consulta únicamente en el [tracker](../progress/tracker.md).

### Condiciones previas a implementar

- Concretar contrato de credenciales, acceso, identidad de pestaña, presencia, rechazos, protección y cierre dentro de la base técnica elegida. Quedan pendientes endpoints, protección/almacenamiento de autorización, hash y parámetros y procedimiento externo de provisión; no almacenar secretos en documentación.
- Disponer de las estructuras de backend y frontend y del destino Dashboard para la integración correspondiente. Estas dependencias no autorizan tareas fundacionales ni implementar otros módulos.
- Concretar la distinción entre recarga, duplicación, cierre y restauración del navegador, y comprobar que la comunicación elegida cumple las reglas aprobadas. No se garantiza que los eventos de cierre se ejecuten.
- Las comprobaciones futuras se asocian a los criterios en la sección de verificación anterior; cada tarea incluye las que le correspondan, sin una tarea genérica adicional de QA.

### TASK-001 — Validar credenciales

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: comprobar usuario y contraseña de la cuenta compartida creada externamente y comunicar aceptación o rechazo.
- Alcance y exclusiones: validación de credenciales; sin provisión interna, administración de cuentas ni recuperación.
- Resultado esperado: credenciales válidas superan la validación; las incorrectas no conceden acceso. La admisión de sesión corresponde a TASK-002.
- Criterios aplicables: CA-01 y CA-02, cobertura backend.
- Dependencias: contrato técnico, estructura backend y representación de la cuenta externa.

### TASK-002 — Gestionar sesiones simultáneas y presencia

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: admitir sesiones simultáneas de la cuenta compartida, mantener la autorización de cada pestaña y gestionar su finalización mediante presencia.
- Alcance y exclusiones: independencia de las sesiones, continuidad al recargar y finalización individual a los 120 segundos desde su última señal válida. No mide actividad del operador, desplaza sesiones ni recupera accesos.
- Resultado esperado: un nuevo inicio no bloquea ni afecta sesiones existentes; cada sesión conserva su propia autorización y presencia. Señales tardías no reactivan una sesión finalizada, ni su finalización afecta otras sesiones.
- Criterios aplicables: CA-01, CA-04, CA-05 y CA-07 a CA-09, cobertura backend; el cierre manual se completa en TASK-006 de US-002.
- Dependencias: TASK-001 y contrato de identidad de pestaña, presencia y ciclo de sesión.

### TASK-003 — Proteger operaciones

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: exigir sesión válida y autorización de pestaña para operar, sin roles diferenciados.
- Alcance y exclusiones: protección de las operaciones disponibles; no implementa el contenido de los demás módulos.
- Resultado esperado: solicitudes sin autorización válida, de otra pestaña o de una sesión finalizada no operan; la pestaña autorizada accede sin restricciones por perfil.
- Criterios aplicables: CA-03, CA-04, CA-06 y CA-09.
- Dependencias: TASK-002 y operaciones disponibles para integrar. La cobertura se amplía al incorporar módulos, sin afirmar que los inexistentes estén verificados.

### TASK-004 — Completar el inicio de sesión

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: frontend.
- Descripción y objetivo: presentar usuario y contraseña, tramitar el acceso, comunicar rechazo y dirigir al Dashboard cuando se acepta.
- Alcance y exclusiones: recorrido de entrada; no incluye contenido del Dashboard, registro ni recuperación.
- Resultado esperado: acceso válido hasta Dashboard incluso con otras sesiones activas; las credenciales incorrectas muestran rechazo sin conceder acceso ni afectar las sesiones existentes.
- Criterios aplicables: CA-01, CA-02 y CA-04.
- Dependencias: contrato, TASK-001, TASK-002, estructura frontend y destino Dashboard disponible.

### TASK-005 — Mantener la pestaña autorizada y proteger pantallas

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: frontend.
- Descripción y objetivo: conservar la autorización al recargar, mantener señales de presencia independientes de teclado o ratón y proteger navegación.
- Alcance y exclusiones: otras pestañas, incluidas las duplicadas, no reutilizan la autorización de una sesión; se admiten otras sesiones autenticadas de forma independiente. Integración del cierre de pestaña como mejor esfuerzo, sin confundirlo con recarga. No diseña toda la navegación ni implementa otros módulos.
- Resultado esperado: recargar conserva acceso; otras sesiones no desplazan la original; el ciclo de presencia respeta el plazo aprobado para cada sesión. Una autorización finalizada no se adopta o recupera automáticamente y se exige nuevo inicio para operar.
- Criterios aplicables: CA-03 a CA-09, cobertura frontend; el cierre manual se completa en TASK-007 de US-002.
- Dependencias: TASK-002, TASK-003, TASK-004 y estructura de pantallas. La cobertura se amplía conforme existan pantallas para integrar.
