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

| ID    | Comportamiento observable                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | Con usuario y contraseña válidos, se inicia sesión y se muestra directamente el Dashboard, aunque existan otras sesiones activas de la cuenta compartida.                                                                                                                                                                                                                                                                                                                                     |
| CA-02 | Con credenciales incorrectas, se rechaza el acceso y se informa del error.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| CA-03 | Sin una sesión válida, no se permite acceder a los módulos del sistema.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CA-04 | La cuenta compartida permite varias sesiones simultáneas en distintos navegadores o computadoras; iniciar otra no rechaza ni desplaza las existentes. Cada sesión solo se utiliza desde su propia pestaña autenticada: otras pestañas, incluidas las duplicadas, no reutilizan esa autorización.                                                                                                                                                                                              |
| CA-05 | La sesión no expira por inactividad del operador. Cerrar manualmente la sesión o cerrar la pestaña autorizada, incluso si quedan otras abiertas, exige otro inicio de sesión. La liberación en el servidor ante cierres no detectados se rige por CA-08.                                                                                                                                                                                                                                      |
| CA-06 | Una sesión permite acceder a todos los módulos del sistema, sin roles diferenciados.                                                                                                                                                                                                                                                                                                                                                                                                          |
| CA-07 | Recargar la pestaña autorizada conserva la sesión y no se trata como un cierre.                                                                                                                                                                                                                                                                                                                                                                                                               |
| CA-08 | Mientras la pestaña autorizada siga enviando señales válidas de presencia, no se termina esa sesión por falta de uso del teclado o ratón. Si el servidor deja de recibir sus señales, finaliza esa sesión a los 120 segundos desde su última señal válida recibida, sin afectar las demás ni bloquear nuevos inicios. Si la suspensión del equipo o la pérdida de conexión impide recibir señales durante esos 120 segundos, se exige iniciar sesión nuevamente para operar desde esa sesión. |
| CA-09 | Después de finalizar o liberar la sesión, es necesario iniciar sesión nuevamente para operar; la autorización anterior no se recupera automáticamente.                                                                                                                                                                                                                                                                                                                                        |

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

El 2026-10-19 el responsable aprobó la redistribución propuesta por `requirements-analyst` con las recomendaciones del principal «Apruebo la propuesta del analista con tus recomendaciones de la tabla (1 a 8)»: Frontend no recibe tareas y las tareas técnicas de backend asumen contrato, conexión de la interfaz y verificación integrada. En esta historia TASK-001 y TASK-003 se amplían, TASK-002 se precisa, TASK-005 se reescribe como tarea backend sobre la capa de acceso del cliente conservando su ID y TASK-004 se retira. Criterios y alcance no cambian; las tareas retiradas conservan su ID sin reutilizarlo.

## Implementación conjunta de Acceso autorizada

El 2026-10-19 el responsable sustituyó la estrategia por TASK por una entrega funcional conjunta de US-001/US-002 sobre la rama actual, sin nuevas ramas ni bloqueos por dependencias internas. Autorizó expresamente recuperar trabajo propio, conectar la API real, ajustes mínimos de componentes/proxy y MongoDB local en 27017; sin rediseño, push ni cambios remotos. Esta excepción no cambia los criterios ni los límites generales de otras entregas. Permite continuar pese a límites de navegador, documentándolos sin afirmar garantías no demostradas.

La [implementación conjunta y evidencia](../progress/access-module-integration.md) registra el contrato ejecutado, archivos, MongoDB, verificación de UI/API, Chrome/Edge, criterios cubiertos y límites de duplicación/restauración. Complementa y sustituye como descripción actual las limitaciones de la entrega simulada histórica que sigue más abajo. Las heurísticas implementadas no acreditan por sí solas CA-04/CA-05 completos; el estado oficial se mantiene en el tracker.

## Implementación independiente de credenciales de TASK-001

Por aprobación explícita del responsable se implementó la [verificación interna de credenciales](../progress/access-credentials-implementation.md) en `feat/task-001-auth-credentials`, desde `origin/develop` actualizado `af11071fe594d95f3e4928a6758082704d8ece6b`. Incluye scrypt asíncrono versionado, Zod estricto, lectura de cuenta externa e intentos acotados. No emite autorización ni expone un endpoint parcial: la sesión y la integración quedan pendientes de TASK-002 y de la validación de pestaña. No acredita CA-01/02 integrados ni DoD; ver resultados y límites en el registro enlazado y estado oficial en el tracker.

## Tareas técnicas asociadas

Las siguientes tareas de `requirements-analyst` fueron aprobadas para su registro. Sus identificadores oficiales sustituyeron las etiquetas locales BE-1, BE-2, BE-3, FE-1 y FE-2; desde el 2026-10-19 todas son de backend. Su estado se consulta únicamente en el [tracker](../progress/tracker.md).

### Condiciones previas a implementar

- **Integración común.** Cada tarea de esta historia define el contrato a partir de los supuestos de `frontend/src/<módulo>/api/contract.provisional.ts` y lo presenta para aprobación (si ya existe contrato aprobado, lo aplica), implementa endpoint y reglas, sustituye la capa de acceso simulada en `frontend/src/<módulo>/api/` sin tocar componentes ni estilos y ejecuta la verificación integrada de sus criterios, incluidos los marcados P (presentación) y C (comportamiento de cliente construido por Frontend). Para conectar se necesita el registro de entrega de interfaz de la página. Los ajustes de interfaz que exija el contrato vuelven a Frontend y la tarea queda `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Concretar contrato de credenciales, acceso, identidad de pestaña, presencia, rechazos, protección y cierre dentro de la base técnica elegida. Quedan pendientes endpoints, protección/almacenamiento de autorización, hash y parámetros y procedimiento externo de provisión; no almacenar secretos en documentación.
- Disponer de las estructuras de backend y frontend y del destino Dashboard para la integración correspondiente. Estas dependencias no autorizan tareas fundacionales ni implementar otros módulos.
- Concretar la distinción entre recarga, duplicación, cierre y restauración del navegador, y comprobar que la comunicación elegida cumple las reglas aprobadas. No se garantiza que los eventos de cierre se ejecuten.
- Las comprobaciones futuras se asocian a los criterios en la sección de verificación anterior; cada tarea incluye las que le correspondan, sin una tarea genérica adicional de QA.

### TASK-001 — Validar credenciales e integrar el inicio de sesión

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: comprobar usuario y contraseña de la cuenta compartida creada externamente, comunicar aceptación o rechazo y conectar el formulario de acceso de Frontend: las credenciales válidas llevan al Dashboard y las incorrectas se rechazan con mensaje.
- Alcance y exclusiones: contrato de acceso y rechazo, validación de credenciales, conexión en `frontend/src/auth/api/` y recorrido integrado de entrada. La emisión de la sesión corresponde a TASK-002. Sin provisión interna, administración de cuentas ni recuperación; no diseña la pantalla.
- Resultado esperado: entrada integrada hasta el Dashboard, también con otras sesiones activas; las credenciales incorrectas muestran rechazo sin conceder acceso ni afectar las sesiones existentes.
- Criterios aplicables: CA-01 (entrada y destino, P) y CA-02 (mensaje, P).
- Dependencias: contrato técnico, estructura backend, representación de la cuenta externa, TASK-002 para la integración (no para construir) y registro de entrega de interfaz de Acceso.

### TASK-002 — Gestionar sesiones simultáneas y presencia

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: admitir sesiones simultáneas de la cuenta compartida, mantener la autorización de cada pestaña y gestionar su finalización mediante presencia.
- Alcance y exclusiones: independencia de las sesiones, continuidad al recargar y finalización individual a los 120 segundos desde su última señal válida. No mide actividad del operador, desplaza sesiones ni recupera accesos. La emisión desde el navegador y la vinculación del cliente corresponden a TASK-005; esta tarea no conecta una interfaz propia.
- Resultado esperado: un nuevo inicio no bloquea ni afecta sesiones existentes; cada sesión conserva su propia autorización y presencia. Señales tardías no reactivan una sesión finalizada, ni su finalización afecta otras sesiones.
- Criterios aplicables: CA-01 (con otras sesiones activas), CA-04, CA-05 y CA-07 a CA-09, cobertura de servidor; el cierre manual se completa en TASK-006 de US-002.
- Dependencias: TASK-001 y contrato de identidad de pestaña, presencia y ciclo de sesión.

### TASK-003 — Proteger operaciones

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend.
- Descripción y objetivo: exigir sesión válida y autorización de pestaña para operar, sin roles diferenciados.
- Alcance y exclusiones: protección de las operaciones disponibles; no implementa el contenido de los demás módulos. Incluye el error 401 común y su propagación en la capa `api/` de cada módulo integrado, mediante el cliente HTTP común de `frontend/src/auth/api/` que importan los demás módulos; la reacción en pantalla se verifica en TASK-005.
- Resultado esperado: solicitudes sin autorización válida, de otra pestaña o de una sesión finalizada no operan; la pestaña autorizada accede sin restricciones por perfil.
- Criterios aplicables: CA-03 (operaciones), CA-04 (operaciones desde otra pestaña), CA-06 y CA-09.
- Dependencias: TASK-002 y operaciones disponibles para integrar. La cobertura se amplía al incorporar módulos, sin afirmar que los inexistentes estén verificados.

### TASK-005 — Mantener la pestaña autorizada y proteger pantallas

- Historia relacionada: [US-001](us-001-iniciar-sesion.md).
- Responsabilidad: backend, sobre la capa de acceso del cliente.
- Descripción y objetivo: implementar en `frontend/src/auth/api/` la vinculación de la autorización a la pestaña, la presencia cada 30 segundos independiente de teclado y ratón y el aviso de salida de mejor esfuerzo, sustituyendo la sesión simulada que consumen las pantallas protegidas de Frontend. Recargar conserva la sesión; duplicar, cerrar o restaurar no recuperan la autorización; sin sesión válida no se accede a las pantallas.
- Alcance y exclusiones: incluye la validación técnica previa del mecanismo en Chrome y Edge, que requiere autorización de ejecución acotada, la distinción entre recarga, duplicación, cierre y restauración, y recorridos en navegador real. Otras pestañas, incluidas las duplicadas, no reutilizan la autorización de una sesión; se admiten otras sesiones autenticadas de forma independiente. Excluye el diseño de navegación y guardas (Frontend) y el servidor de sesiones (TASK-002).
- Resultado esperado: recargar conserva acceso; otras sesiones no desplazan la original; el ciclo de presencia respeta el plazo aprobado para cada sesión. Una autorización finalizada no se adopta ni se recupera automáticamente y se exige nuevo inicio para operar. Comportamiento comprobado en los dos navegadores con sus versiones registradas.
- Criterios aplicables: CA-03 (pantallas, P), CA-04 (pestañas), CA-05, CA-06 (navegación), CA-07, CA-08 (emisión, suspensión y desconexión) y CA-09 (no adopción); el cierre manual se completa en TASK-006 de US-002.
- Dependencias: TASK-001, TASK-002, TASK-003, mecanismo de pestaña validado y registro de entrega de interfaz de Acceso y de la estructura de pantallas protegidas. La cobertura se amplía conforme existan pantallas para integrar.

### Tareas retiradas

- TASK-004 — Completar el inicio de sesión — Retirada el 2026-10-19; cobertura en TASK-001 y TASK-002. La pantalla la implementa Frontend sin tareas.

## Interfaz — Login con portada editorial (2026-10-20)

Solicitud del responsable: «@impeccable haz que el login sea como una landingpage». Eligió **portada con formulario siempre visible** y **fotografía con licencia**, manteniendo el lenguaje de P y el acceso existente. Rama `feat/ui-auth-landing-login`, base `origin/develop` recién obtenida `9d2dbed2b814a3ccb96054fa5c02d993a8cee47c`.

### Dirección de la página

- **Tesis:** una bienvenida de cafetería con acabado editorial, sin convertir el acceso en un recorrido promocional ni añadir pasos.
- **Lenguaje:** lino, superficies claras y azul de P; Fraunces protagonista y Source Sans 3 para el formulario. Fotografía local CC0 de cafetería, sin presentarla como el establecimiento de Kofi.
- **Recorrido:** reconocer la marca, leer la bienvenida y entrar con la cuenta existente. No incluye registro, recuperación de contraseña, testimonios, precios ni cifras comerciales inventadas.
- **Primera pantalla:** cabecera ligera; titular y fotografía a la izquierda; formulario de usuario/contraseña a la derecha. En estrecho, titular → formulario → fotografía. El acceso no espera a la imagen.
- **Forma:** composición y fotografía elegidas por el usuario, sin sorteo de identidad ni modificación del sistema compartido. Modo Operate con expresión de landing; el gesto editorial es el titular junto al encuadre fotográfico, no una animación repetitiva.
- **Cierre:** Impeccable → Emil → React Best Practices, regresiones de acceso y capturas agrupadas. Sin cambios de API, sesión, backend, dependencias o tracker; publicación posterior requiere autorización.

### Entrega y verificaciones locales

- **Commit de entrega:** `feat(auth): redesign login as an editorial landing`, que incluye este registro, en la rama indicada. Sin push, PR, integración ni publicación en Render de este login.
- `LoginPage.tsx` conserva el cliente real predeterminado, envío, límites, autocompletado, control de doble envío, limpieza de contraseña y avisos existentes. Estilos propios en `LoginPage.module.css`; no modifica `Access.module.css`, componentes compartidos ni otras pantallas. Foto local de 276.703 bytes, sin peticiones de imagen externas; procedencia y licencia en [créditos](../../frontend/src/auth/assets/CREDITS.md).
- **Impeccable:** dirección aprobada y dos rondas agrupadas como máximo, con una corrección de estructura y confirmación. El lanzador `context` pudo leer los puentes, pero no extrae automáticamente los tokens enlazados; P se contrastó directamente. `surface-brief read` no produjo un brief (salida 1); se conserva la dirección en esta especificación, sin regenerar los puentes. Detector ejecutado una vez sobre TSX/CSS: salida 1, único aviso `overused-font` por Fraunces, descartado por ser la familia obligatoria de P, no sustituida.
- **Emil:** revisión de componentes, movimiento, frecuencia, rendimiento y accesibilidad en sesión principal. Corrección: el formulario precede a foto/crédito también en el documento; no se reordena solo mediante CSS. Se mantiene feedback de hover/pulsación del botón compartido y no se añaden animaciones al acceso recurrente. Foco visible, campos de 48 px y alternativa de texto de la imagen.
- **React Best Practices:** imports directos, sin librerías nuevas, operaciones de acceso conservadas en el evento de envío y efecto con dependencia primitiva `session.status`; sin estado o efectos para el tamaño de pantalla. No se aplican reglas de Next.js ni optimizaciones especulativas. Imagen con dimensiones explícitas, recorte CSS y decodificación asíncrona; no bloquea el formulario.
- **Pruebas:** `npm run test --workspace @kofi/frontend -- src/auth/pages/LoginPage.test.tsx src/App.test.tsx src/auth/api`: **60 correctas** en seis archivos. Incluye tres regresiones de portada/acceso directo, fotografía/crédito/orden del documento y comprobación inicial, además de las pruebas existentes de errores, envío, rutas y transporte/autorización. `npm run build --workspace @kofi/frontend` (tipos y build) y `npm run lint --workspace @kofi/frontend`: correctos. No se ejecutan pruebas backend/MongoDB: no cambia ese código ni su contrato.
- **Navegador:** Chrome headless existente, cliente explícito de fixtures solo en arnés local no versionado. Escritorio 1280×720 y 1366×768 sin scroll general en el estado inicial; 768×1024, 390×844 y 320×740 sin desbordamiento horizontal. En 390 y 320 el botón permanece visible antes de la foto. Con avisos/errores se permite crecimiento vertical; a 1280×720 el error de credenciales ocupa 744 px de documento sin cortar controles. Envío, error de credenciales, conexión y sesión expirada renderizados; aviso estrecho también con movimiento reducido.
- **Teclado y contraste:** secuencia desde el título: usuario → contraseña → entrar → crédito, todos con foco visible. Texto principal/superficie 12,03:1, secundario/lino 5,36:1, botón 7,05:1, error 7,36:1 y borde de campo/superficie 3,78:1. No equivale a auditoría completa de accesibilidad.
- **Evidencia local:** `frontend/.impeccable/review/login-*.png` y `login-report.json`, no versionados. La primera toma seleccionaba por error el árbol oculto de la app para geometría/estado; se corrigió el arnés retirando ese nodo y se obtuvieron las medidas y estados válidos en la confirmación. No se usan sus ceros ni el fallo de conexión oculto como evidencia del diseño.
- **Límites:** sin recorrido nuevo autenticado contra API/Render, Edge ni lector de pantalla. La regresión automatizada cubre el acceso existente; este rediseño no valida garantías nativas de pestaña ni acredita CA/DoD de US-001. Tracker intacto.
- **Controles finales:** formato de los cuatro archivos de texto frontend modificados y `git diff --check` correctos. `kofi-check verify --context .opencode/login-landing.local.json`: requisitos/alcance correctos y 119 enlaces comprobados; salida 1 por el aviso fijo `PENDIENTE aplicación`. No se declara éxito integral del hook: las verificaciones externas seleccionadas y ejecutadas se detallan arriba. La base local del control incluía tres archivos propios creados antes de `start`; el diff final completo se revisa para no omitirlos ni confundirlos con trabajo ajeno.

## Interfaz — Acceso: registro de entrega

- **Autorización:** el responsable aprobó el inventario y encargó expresamente el diseño e implementación simulados de US-001 y US-002 el 2026-10-19, con React Router, base compartida P, comprobaciones y commit local sin push, conforme a constitución §11. No se autoriza integración de acceso real.
- **Historias:** US-001 y [US-002](us-002-cerrar-sesion.md).
- **Rama y commit:** `feat/ui-auth-acceso`; commit de entrega `feat(auth): add simulated access module`, que contiene este registro. Base `origin/develop` recién obtenida: `f785250eaacbaecb47c9ff6de9ff6c005ffbd908`. El primer fetch falló por conexión reiniciada y el segundo terminó correctamente; el HEAD inicial se comprobó igual a esa base. Sin push ni integración.
- **Pantallas y estados:** `/login` vacío, enviando, credenciales incorrectas, conexión fallida y avisos de sesión finalizada/expirada/cerrada; comprobación inicial sin mostrar contenido protegido; `/dashboard` redirige a login sin sesión simulada y es únicamente un destino provisional tras autenticarse, sin indicadores ni contenido de US-003 a US-005. Cierre pendiente, confirmado, fallido e incierto, sin anunciar invalidación antes de la confirmación simulada. No se añadió confirmación previa del operador.
- **Base compartida:** tokens CSS y CSS Modules con lenguaje P; Fraunces y Source Sans 3 locales y sus licencias SIL OFL; `Button` reutilizado y estructura autenticada presentacional sin imports de Acceso. Menú lateral izquierdo con hamburguesa y cerrar sesión, controles desmontados al ocultarlo y modalidad estrecha con fondo inerte, foco y retorno. La presentación de sesión/cierre pertenece a `auth/`, no a `shared/`.
- **Dependencias:** React Router `8.5.0`, instalado con versión exacta en `@kofi/frontend`; compatible con Node 24 y React 19.3.1 de la base. Manifest y lockfile actualizados. Sin otras dependencias directas añadidas. Auditoría de la instalación: 0 vulnerabilidades conocidas en esa consulta, no garantía de seguridad de la aplicación. Script `lint` del workspace con ESLint ya existente.

### Supuestos y límites del contrato provisional

Fuente única de tipos: [`frontend/src/auth/api/contract.provisional.ts`](../../frontend/src/auth/api/contract.provisional.ts). Son supuestos para la integración, no endpoints, DTO ni contratos aprobados:

- Entrada de usuario/contraseña y resultados aceptado, incorrecto, conexión fallida o respuesta superada. Los escenarios deciden el resultado; no hay credenciales reales ni contraseña especial de acceso. El formulario advierte no introducir secretos reales.
- Estado de sesión comprobando, anónimo con motivo, autenticado, cerrando o cierre no confirmado. Una respuesta de acceso tardía no repone autorización retirada; los errores de cierre no simulan un éxito.
- Capa sustituible en `auth/api/`, cliente HTTP común con transporte inyectado y propagación de 401. Sin solicitudes de autenticación reales, almacenamiento/token o mecanismo de protección definidos.
- Presencia cada 30 segundos y finalización a los 120 segundos desde la última señal simulada recibida, con reloj controlado en pruebas. No mide teclado/ratón, no contacta servidor ni decide autorización real; una señal tardía no revive la sesión.
- Recarga, pestaña nueva, duplicación y restauración son fixtures. **La recarga real pierde la sesión de esta implementación en memoria**: la conservación exigida por CA-07 queda pendiente de TASK-005. Las instancias simuladas son independientes; no constituyen una identidad de pestaña validada.
- Cierre fallido o incierto suspende la interacción local y permite reintentar el escenario, sin acreditar revocación ni resolver el resultado remoto. No hay persistencia, backend ni servicios externos.

### Cierre de diseño y evidencia local

Frontend aplicó **Impeccable → Emil Design Engineering → React Best Practices** tanto al login como al destino provisional y su estructura. Impeccable se usó como skill/guía de diseño, sin ejecutar su motor. Emil contrastó las capturas finales; se resolvieron estilos duplicados con `Button`, dependencia de Acceso desde `shared/` y riesgo de enfocar fondos inertes. React Best Practices revisó suscripciones, estado y limpieza de efectos sin aplicar reglas de Next.js. Las revisiones no sustituyen pruebas ni certifican accesibilidad completa.

Comprobaciones ejecutadas por el principal sobre la entrega final; después solo se amplió un comentario explicativo de contrato, sin cambios ejecutables:

| Comprobación                                   | Resultado y alcance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck --workspace @kofi/frontend` | Correcto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run lint --workspace @kofi/frontend`      | Correcto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run test --workspace @kofi/frontend`      | 3 archivos, 28 pruebas correctas: rutas/estados/cierre/foco, simulación de sesiones y presencia, y transporte HTTP/401 sin red.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run build --workspace @kofi/frontend`     | Correcto; incluye las dos fuentes locales.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Formato y revisión de alcance                  | Prettier correcto en `frontend/src`, manifest y lockfile tras formatear este último. Revisión local mediante Node/Git: 33 archivos del alcance y 80 destinos locales existentes, requisitos originales y tracker intactos, cuatro copias de fuentes/licencias idénticas por SHA-256 y Router exacto en manifest/lockfile. `git diff --cached --check` señala únicamente un espacio final heredado en `shared/fonts/source-sans-3-OFL.txt:21`; se conserva la licencia original sin alterarla, observación documental no bloqueante. |
| Control documental                             | `node .opencode/scripts/kofi-check.mjs docs`: índice correcto. No se atribuye a un hook Git: `core.hooksPath` no está configurado en este checkout y no se modificó su activación.                                                                                                                                                                                                                                                                                                                                                  |
| Revisión renderizada y teclado                 | Navegador integrado OpenCode/Electron 44.4.5, Chromium 152.0.7977.130: login y destino a 912 px CSS, fuentes cargadas; modal en iframe temporal de 598 px CSS. Foco inicial, ciclo Shift+Tab/Tab, Escape, retorno a hamburguesa, fondo inerte y limpieza del bloqueo de scroll comprobados. Cierre simulado en el iframe vuelve al login sin alterar la instancia del contenedor. Iframe eliminado al terminar. No equivale a validación de identidad de pestaña.                                                                   |

**Correspondencia prevista:** entrada/destino y rechazo, CA-01/02; guarda visual, CA-03; escenarios independientes y ciclo de pestaña, CA-04/05/07; estructura sin roles, CA-06 únicamente respecto de la página disponible; presencia y nuevo acceso, CA-08/09. La cobertura del menú y cierre de US-002 se incluye en esta misma evidencia. Los tests de componentes y fixtures **no acreditan CA integrados ni DoD** de las historias.

**Controles y pendientes:** `kofi-start` y `kofi-verify` se intentaron mediante el comando Node y quedaron pendientes con «Especificación sin referencia de aprobación fechada»; salida nativa 2, comprobada explícitamente para `verify`. El validador rechaza la palabra «pendientes» dentro de una aprobación histórica; además exige CA en bullets y TASK, incompatibles con las tablas y Frontend sin tareas vigentes. No se alteraron controles, criterios o aprobaciones para superarlo, ni se inventó una TASK. La aprobación fue contrastada por el principal y el alcance se revisó mediante Git contra la base limpia. No se declara éxito de estos controles. La ejecución de requisitos/alcance/testing del control queda pendiente de una adaptación autorizada; no debe confundirse con los cuatro comandos del workspace, que sí se ejecutaron correctamente.

Pendientes funcionales: aprobación del contrato real, seguridad/autorización, mecanismo de identidad de pestaña y validación en Chrome y Edge estables, recarga real, transporte/presencia y revocación en servidor, protección de operaciones y verificación integrada de TASK-001/002/003/005 y TASK-006 de US-002. La CI remota no se ejecutó para esta rama sin publicar. Tracker y tareas no se completan por esta entrega de interfaz.

### Actualización de los controles tras incorporar develop

Por solicitud del responsable se ejecutó `git pull --no-rebase origin develop` en `feat/ui-auth-acceso` el 2026-10-19, incorporando `280add41f72a36de0504c441c9e0e664bab22dd3`. El único conflicto, en CHANGELOG, se resolvió conservando las entradas de ambos lados. No se modificaron los controles recibidos ni el código de Acceso.

El ajuste publicado en develop resuelve el bloqueo del apartado anterior. El contexto local de comprobación usa `taskId: null`, `scope` limitado a `frontend/` y documentos/lockfile/control como rutas relacionadas justificadas, según el README actualizado. Los pendientes de integración real siguen fuera del alcance de esta interfaz simulada; las comprobaciones manuales de interfaz ya ejecutadas no se vuelven a declarar pendientes.

- `node .opencode/scripts/kofi-check.mjs start --context .opencode/.cache/kofi-check/pull-develop-auth.context.json`: correcto, salida 0, reconoce Frontend sin TASK y conserva como base los 23 archivos del merge ya pendientes al comenzar esta comprobación. No atribuye retroactivamente su implementación al control.
- `node .opencode/scripts/kofi-check.mjs verify --context .opencode/.cache/kofi-check/pull-develop-auth.context.json`: correcto, salida 0; alcance sin desviaciones, dos comprobaciones de sintaxis y 425 destinos de enlaces válidos en el pase con la evidencia actualizada. El contexto predeterminado se actualizó al mismo encargo y también pasó. JSON seleccionado sin archivos JSON afectados (0 comprobaciones). Verifica los cambios presentes del merge y su evidencia, no equivale a una nueva ejecución de pruebas de aplicación ni a acreditar CA integrados.
- Regresiones específicas: `node --test --test-name-pattern="contexto obligatorio|mantenimiento justificado|Frontend sin tareas|no presume|base preservada|rutas relacionadas" .opencode/scripts/kofi-check.test.mjs`: seis pruebas correctas.
- Se reutilizan typecheck, lint, 28 pruebas, build y revisión renderizada/teclado del registro anterior: el merge no cambia fuentes, manifest, lockfile ni configuración de la aplicación. No se ejecutó la suite completa de controles ni CI remota. Se mantienen los pendientes funcionales de acceso real.
