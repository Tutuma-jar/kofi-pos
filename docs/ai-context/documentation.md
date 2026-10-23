# Kofi — Estándares de documentación y verificación

> Política retirada el 2026-10-22: este documento es una referencia histórica opcional. Sus restricciones, aprobaciones, secuencias obligatorias y límites de etapa ya no rigen el trabajo de los agentes. El contexto y las instrucciones se proporcionan manualmente en cada encargo.


## 1. Fuentes, responsables y actualizaciones

La distribución de carpetas pertenece a [architecture.md](architecture.md); los identificadores y nombres a [conventions.md](conventions.md). Este documento define cómo especificar, verificar y registrar trabajo sin duplicar información.

| Documento | Cuándo actualizar | Responsable |
| --- | --- | --- |
| Producto y constitución | Cuando se apruebe cambiar alcance o reglas | Agente principal, con aprobación del responsable del proyecto |
| Arquitectura y convenciones | Al aprobar decisiones técnicas o convenciones nuevas | Agente principal; apoyo del Arquitecto cuando se autorice |
| Sistema de diseño | Al aprobar reglas visuales | Agente principal; apoyo del perfil Frontend cuando se autorice |
| Especificación e historias | Antes de implementar y ante cambios aprobados | Agente principal; Analista propone y el responsable del proyecto aprueba |
| Registro de implementación y validaciones | Al cerrar una tarea o un conjunto coherente de trabajo | Agente que ejecutó el trabajo; revisión del principal |
| Tracker | Al iniciar, bloquear o completar trabajo aprobado, o verificar una historia | Agente principal, sin delegar solo para marcar checkboxes |
| CHANGELOG | Al realizar cambios relevantes, agrupados por hito | Agente principal o Documentador, con revisión del principal |
| Pull Request | Al preparar o cambiar la propuesta de integración | Autor de los cambios |

Actualizar documentos afectados, no todos los documentos en cada cambio. No registrar estados de progreso fuera del tracker. Aprobaciones y evidencias técnicas no son una segunda fuente de estado.

## 2. Historias y atomización

Toda funcionalidad relevante parte de una historia o especificación aprobada y justificada por el producto. Para trabajo de implementación, vincular las tareas con una historia aprobada. No inventar historias de usuario para simples ajustes administrativos de documentación.

El Analista de Requisitos propone la división cuando se autorice su intervención; el agente principal revisa su coherencia y el responsable del proyecto aprueba el alcance. Cada tarea tendrá responsabilidad concreta, objetivo, alcance, dependencias relevantes y resultado verificable. Evitar tareas enormes y fragmentación por archivo, función o import.

Las tareas técnicas no se asignan a Frontend. Frontend diseña e implementa la interfaz de forma autónoma por módulo o página, con las historias y el [producto](product.md) como contexto y contra datos simulados, según la [constitución](constitution.md#11-etapa-actual). Cada tarea de backend que sirva a una interfaz incluye definir el contrato a partir de los supuestos de Frontend, implementar endpoint y reglas, conectar la UI sustituyendo la capa de acceso simulada y la verificación integrada de los criterios. Ningún criterio de aceptación queda sin tarea responsable: los criterios de presentación (P) o de comportamiento de cliente construido por Frontend (C) se asignan a la tarea backend que integra la interfaz. La lógica de cliente que Backend sustituirá (presencia, identidad de pestaña, suscripciones, referencias opacas, copias verificadas de reglas de importes) vive en `frontend/src/<módulo>/api/`.

### Plantilla de historia o especificación

```markdown
# US-NNN — Título

## Descripción
Como operador, quiero [funcionalidad], para [beneficio].

## Objetivo
[Necesidad que resuelve.]

## Alcance
- Incluye: [...]
- Excluye: [...]

## Criterios de aceptación
- [Comportamiento observable y comprobable.]

## Dependencias relevantes
[Enlaces a historias o decisiones, o «Ninguna identificada».]

## Aprobación
[Referencia a la aprobación explícita y fecha; no asumirla.]

## Tareas técnicas asociadas
[Definiciones de las tareas con la plantilla siguiente; sin estados ni checkboxes.]
```

Los criterios deben ser específicos, no «debe funcionar correctamente». Incluir flujo principal, validaciones, límites importantes y errores cuando correspondan. Given/When/Then es opcional. Cada criterio debe asociarse a una prueba o comprobación manual justificada.

### Plantilla de tarea técnica

Se incluye en la especificación de su historia por defecto:

```markdown
### TASK-NNN — Título
- Historia relacionada: US-NNN [enlace a su especificación]
- Descripción: [...]
- Objetivo: [...]
- Alcance y exclusiones: [...]
- Resultado esperado: [...]
- Criterios de aceptación aplicables: [referencias a criterios de la historia y, si hacen falta, criterios técnicos adicionales]
- Dependencias: [tareas o decisiones necesarias]
```

La aprobación de una historia debe cubrir sus tareas necesarias. Si cambia el alcance, pedir aprobación antes de actualizarlo e implementarlo. No agregar comportamiento nuevo mediante criterios técnicos.

## 3. Definition of Done y trazabilidad

### Tarea completada

- Se implementó lo solicitado y se respetaron alcance y decisiones aprobadas.
- Se cumplieron los criterios aplicables y las verificaciones obligatorias necesarias, incluidas las que excedan el alcance rápido del control de Testing.
- No existen errores bloqueantes conocidos.
- Se registraron cambios relevantes, verificaciones y limitaciones reales.
- Se puede relacionar el resultado con la historia, la tarea y los archivos afectados.

### Historia completada

- Todas sus tareas necesarias cumplen la DoD de tarea.
- Todos sus criterios de aceptación obligatorios están satisfechos.
- Se verificó la integración correspondiente y el riesgo de regresión relevante.
- Las evidencias son accesibles desde la especificación y se actualizó el tracker.

### Cambios integrados

Completar una tarea o historia no equivale a integrar cambios. La integración requiere incorporación a la rama de destino y aprobación de las verificaciones obligatorias aplicables, incluidas las de CI cuando esté implementada y exigida.

La falta de herramientas o una comprobación no ejecutada no equivalen a éxito. Si una verificación obligatoria está pendiente, no marcar el trabajo completado. Una comprobación manual debe justificar por qué es apropiada y registrar resultado; no reemplaza controles obligatorios automáticamente.

El éxito del Hook de Testing no acredita por sí solo la DoD: debe existir evidencia suficiente de todos los criterios y verificaciones obligatorias de la tarea. Los controles de integración de CI son un requisito distinto y no sustituyen las comprobaciones necesarias para completar tareas e historias.

### Evidencia mínima

Vincular historia y tarea con archivos o commits cuando existan y registrar:

- Criterios cubiertos y comprobación utilizada: comando o pasos manuales.
- Mecanismo de ejecución: herramienta local, hook o CI, sin atribuir una ejecución al agente que seleccionó el plan o a una revisión de buenas prácticas.
- Resultado real y revisión o conjunto de cambios comprobado.
- Verificaciones pendientes, fallidas o no aplicables, con motivo y efecto sobre la DoD.
- Referencia a evidencia anterior si se reutiliza un resultado todavía válido, sin presentarlo como una nueva ejecución.

Registrar estos datos una vez en la especificación o registro de ejecución y enlazarlos; no crear matrices separadas ni copiar logs o resultados al tracker. Para CI, enlazar la ejecución correspondiente cuando exista.

### Historia: entrega de interfaz

Una historia con interfaz se completa cuando cada página afectada tiene su registro de entrega de interfaz con el cierre visual mínimo y los criterios P y C quedaron acreditados en la verificación integrada de sus tareas responsables. El registro lo redacta el principal a partir de la entrega de Frontend, en la especificación principal de la página (Acceso en US-001, Dashboard en US-003, Administración del menú en US-006 y Gestión de ventas en US-010), y las demás historias enlazan a él. No es un estado ni una tarea:

```markdown
## Interfaz — <módulo/página>: registro de entrega
- Historias: US-NNN [enlaces]
- Rama y commit: [...]
- Pantallas y estados cubiertos: [...]
- Supuestos de contrato: `frontend/src/<módulo>/api/contract.provisional.ts` [resumen o «contrato aprobado»]
- Cierre visual: Impeccable → Emil → React Best Practices [resultado]
- Comprobaciones ejecutadas: [...]
- Pendientes y ajustes conocidos: [...]
```

Las pruebas de componentes de Frontend se registran en la entrega, pero no acreditan criterios de aceptación ni DoD.

## 4. Registro de tareas completadas

Añadir una sección breve a la especificación. Usar un archivo en `docs/progress/completed/` solo cuando el detalle lo justifique, con nombre `task-NNN-titulo-breve.md`, y enlazarlo desde la especificación. No duplicar el registro ni añadir estados de tarea allí.

```markdown
## TASK-NNN — Título: registro de ejecución
- Historia relacionada: US-NNN [enlace]
- Resumen de implementación: [...]
- Cambios realizados: [...]
- Archivos afectados: [...]
- Verificaciones ejecutadas y resultados: [criterio, comando o pasos, mecanismo, resultado y revisión comprobada; enlace a evidencia reutilizada si corresponde]
- Verificaciones pendientes o no aplicables: [motivo y efecto sobre la DoD]
- Problemas pendientes: [limitaciones reales o «Ninguno conocido»]
- Commits relacionados: [referencias, o «Sin commits»]
```

Las limitaciones no bloqueantes pueden documentarse; un fallo bloqueante o criterio obligatorio sin verificar impide completar la tarea. No presentar verificaciones previstas como ejecutadas.

## 5. Plantilla de Pull Request

```markdown
## Resumen
[Propósito del cambio.]

## Cambios realizados
- [...]

## Pruebas ejecutadas
- [Comprobación y resultado; indicar las no ejecutadas y su motivo.]

## Historias y tareas relacionadas
[Identificadores y enlaces, cuando existan.]

## Observaciones
[Riesgos, decisiones pendientes o «Ninguna».]
```

Usar esta plantilla al preparar PR; no crear por ahora archivos de configuración de GitHub. Preparar una PR no autoriza commits, pushes ni publicación.

## 6. CHANGELOG y tracker

### CHANGELOG

Registrar cambios relevantes en orden cronológico inverso. Agrupar trabajo aún no publicado bajo `Sin publicar`, con fecha del hito. Usar solo las categorías necesarias: `Nuevas funcionalidades`, `Correcciones` y `Cambios importantes`.

```markdown
## Sin publicar
### AAAA-MM-DD
#### Cambios importantes
- [Cambio relevante y referencia, si existe.]
```

No copiar el tracker, listar cada edición o afirmar releases que no existan. Los cambios documentales sustanciales pueden registrarse en `Cambios importantes`.

### Tracker

Registrar únicamente historias y tareas aprobadas, con enlaces a sus definiciones. Formato orientativo, no trabajo real:

```markdown
## Historias y tareas
- [ ] US-NNN — Título — Pendiente — [Especificación](../specs/us-NNN-titulo-breve.md)
  - [ ] TASK-NNN — Título — Pendiente
```

- Una casilla sin marcar significa trabajo no completado. Añadir `Pendiente`, `En progreso` o `Bloqueado: motivo` según corresponda; para historias, `En desarrollo` distingue el trabajo iniciado.
- Mantener la casilla sin marcar mientras esté en progreso o bloqueada.
- Usar `[x]` y `Completado` solo cuando se cumpla la DoD correspondiente.
- Cada historia muestra ID, título, enlace a especificación y todas sus tareas con ID y estado; enlazar una tarea separada si excepcionalmente no está definida en esa especificación.
- Actualizar después de comprobar hitos coherentes, no tras cada edición. No eliminar tareas pendientes sin autorización ni inventar avances. Una tarea retirada con autorización del responsable conserva su ID, que no se reutiliza: sale de la lista de su historia y se anota en «Antecedentes retirados del trabajo vigente» con fecha, autorización y tarea que asume su cobertura; en la especificación, su definición se sustituye por una línea «TASK-NNN — Retirada el AAAA-MM-DD; cobertura en TASK-MMM». Reasignar la responsabilidad de una tarea sin cambiar su objetivo ni sus criterios conserva el ID. Una tarea backend que llega a la conexión sin interfaz usa `Bloqueado: falta la entrega de interfaz de <módulo>`, y ante un ajuste devuelto, `Bloqueado: ajuste de interfaz pendiente en Frontend`.
- Registrar una verificación en su fuente y enlazarla si hace falta; no copiar sus resultados al tracker.
- No crear un estado paralelo en especificaciones, registros de ejecución o informes permanentes.

## 7. Procedimiento de testing

### 7.1. Responsabilidades y disponibilidad

| Mecanismo | Responsabilidad | Disponibilidad |
| --- | --- | --- |
| Agente principal | Seleccionar pruebas por criterios/riesgo, revisar el plan y analizar fallos con apoyo de los responsables cuando haga falta | Procedimiento de esta sección; sin skill `testing`. Comandos de humo técnico en el README; aún no hay pruebas funcionales del POS |
| Cuatro controles | Comprobaciones mecánicas delimitadas por la sección 9 | Script local compartido, comandos explícitos y pre-commit documental |
| GitHub Actions | Verificaciones técnicas necesarias antes de integrar cambios; ampliar por comportamiento y riesgo | Workflow publicado y primera ejecución completa correcta, enlazada en CHANGELOG. No cubre criterios funcionales de las US |

Las rutas y decisiones están en [architecture.md](architecture.md#integración-de-agentes-y-controles-de-desarrollo); el uso está en [README](../../.opencode/README.md). Por decisión posterior del usuario se retiró la skill `testing`: la selección corresponde al principal y la ejecución rápida al hook. La ausencia de una prueba necesaria se informa como pendiente, nunca como éxito.

Este documento es la fuente del procedimiento de selección, evidencias y DoD. Los especialistas aportan riesgos/casos de su parte; el principal mantiene una selección única. No es una suite ni una obligación tras cada edición, y no se recrearán skills de pruebas como efecto de esta reorganización.

### 7.2. Selección por comportamiento y riesgo

El principal aplica este procedimiento al planificar verificaciones, revisar una selección invalidada o analizar un fallo que necesite criterio; no lo repite por cada edición:

1. Identificar los criterios y archivos afectados, contratos, consumidores, configuración, modelos y dependencias. Revisar el diff acotado y distinguir cambios de la tarea de trabajo previo.
2. Asociar cada criterio con una comprobación automática o manual justificada y registrarla una sola vez en la especificación o registro de ejecución. Una prueba puede cubrir varios criterios; no crear otro tracker o matriz redundante.
3. Elegir la comprobación específica más pequeña que aporte evidencia suficiente; ampliar si faltan criterios, integración o regresiones relevantes. Usar comandos existentes y aprobados, sin inventar herramientas ni instalar paquetes.
4. Mantener la selección y entradas relevantes en el contexto local de tarea, indicando comprobaciones obligatorias fuera del control rápido. Reutilizarla mientras sigan válidos criterios, dependencias y riesgo.

| Verificación | Cuándo crear o ejecutar |
| --- | --- |
| Unitarias | Cálculos, cantidades, validaciones, límites y lógica de negocio nueva/corregida. Añadir regresión para bugs reproducibles cuando sea razonable, no un test por función automáticamente. |
| Integración | Endpoints, contratos, persistencia, modelos/consultas o comunicación entre capas. Probar las relacionadas y sus errores/integridad en un entorno aislado, nunca datos reales. |
| E2E | Flujos completos críticos afectados o criterios no cubiertos por niveles inferiores, como registrar y consultar una venta. Fuera del hook rápido; no continuamente. |
| Tipos/lint | Menor alcance técnicamente fiable; TypeScript puede necesitar el proyecto entero. No sustituirlo por archivos aislados ni asumir herramientas aún no configuradas. |
| Manuales | Inspección o comportamiento sin automatización apropiada: justificar pasos, resultado y limitaciones. No sustituir controles críticos obligatorios sin aprobación. |
| Documentación/configuración | Coherencia, enlaces/rutas, sintaxis, descubrimiento nativo y permisos; sin pruebas del POS por defecto. |

Priorizar subtotales, totales, cantidades, pedidos, ventas, contratos e integridad/persistencia. Las revisiones Impeccable, Emil y React Best Practices no constituyen evidencia de esos comportamientos. Hoy el hook solo dispone de `syntax`, `json`, `links` y `self-test` de configuración. El [arranque técnico](../specs/technical-bootstrap.md) añade comandos externos de tipos/lint/formato/build y humo React/Express, no unitarias de negocio, integración MongoDB o E2E del POS. El hook no los ejecuta ni reconoce automáticamente: su advertencia de aplicación se documenta junto con la evidencia externa, sin modificarlo para eludir controles. Si falta una comprobación necesaria para el alcance real, informar el bloqueo sin considerar el criterio satisfecho.

### 7.3. Niveles de verificación

**Nivel 1 — Durante una tarea.** El principal planifica con la sección 7.2 y revisa la selección si cambia el alcance o el riesgo. Ejecutar comprobaciones específicas cuando aporten evidencia o ayuden a resolver un fallo, no tras cada edición. Corregir únicamente los problemas relacionados con la tarea; informar fallos ajenos sin ampliar el alcance silenciosamente.

**Nivel 2 — Al finalizar una tarea.** `/kofi-verify` o el comando Node explícito aplica el contrato rápido de la sección 9. Reutilizar resultados válidos y ejecutar las comprobaciones pendientes. El principal comprueba también las verificaciones necesarias que excedan ese alcance, registra evidencia y aplica la DoD antes de marcar la tarea.

**Nivel 3 — Al completar una historia.** Comprobar todos los criterios obligatorios y la integración; añadir pruebas por riesgo de regresión solo si la evidencia existente no basta. Registrar resultados y actualizar el tracker solo al cumplir la DoD de historia.

**Nivel 4 — Antes de integrar.** La CI inicial verifica instalación reproducible, tipos, lint, formato, pruebas técnicas disponibles y builds cuando corresponda al cambio. El conjunto debe ampliarse con unitarias de negocio, integración necesaria y E2E críticos al implementar comportamiento; el humo no sustituye criterios de las US. Publica resultados y los controles obligatorios deben superarse para integrar. Crear o validar localmente el workflow no acredita una ejecución remota: enlazar el resultado real y la revisión cubierta; la primera ejecución publicada ya consta en el CHANGELOG.

La política de eventos, selección por cambios y seguridad de la CI pertenece a [arquitectura](architecture.md#10-ci-técnica-inicial-autorizada); el workflow no usa filtros de rutas que dejen checks requeridos pendientes en PR documentales. Conserva un check estable y omite solo los pasos no aplicables. La protección de ramas se configura por separado con autorización, después de conocer el resultado remoto. No se ejecuta despliegue ni se alteran hooks o estados del tracker como efecto de CI.

La revisión previa al commit de archivos preparados, secretos y temporales permanece en [conventions.md](conventions.md); no constituye un quinto hook ni dispara otra ronda automática de pruebas. No equiparar el cierre de una tarea con Git pre-commit: este último comprueba únicamente documentación.

### 7.4. Eficiencia y validez de resultados

- Agrupar cambios antes de validar; no ejecutar pruebas tras cada edición ni toda la suite repetidamente.
- Reutilizar un resultado exitoso solo si no cambiaron código, entradas, contratos, configuración o dependencias relevantes. Registrar qué revisión o conjunto de cambios cubre.
- La CI es una comprobación de integración independiente: un éxito local no reemplaza controles remotos obligatorios.
- Evitar trabajos duplicados; utilizar caché y ejecución incremental cuando sea seguro. Ampliar validaciones cuando el riesgo lo justifique.
- En CI, limitar por aplicaciones afectadas solo si los contratos y dependencias compartidas quedan cubiertos; cambios exclusivamente documentales no requieren E2E por defecto.
- Preferir herramientas locales para resultados mecánicos. Reservar IA para selección, diagnóstico o decisiones que requieran análisis.
- Resumir éxitos; mostrar errores y evidencia relevante sin volcar logs extensos innecesarios.

### 7.5. Correcciones automáticas y reporte

Permitir como máximo dos intentos automáticos consecutivos para corregir el mismo fallo. Tras cada corrección, repetir primero la comprobación fallida, no toda la suite. No reiniciar el contador repitiendo el comando o delegando a otro agente.

Si el fallo persiste, detener el ciclo e informar fallo, intentos, resultados y bloqueos. Un enfoque posterior requiere autorización; no ocultar errores ni completar tareas con verificaciones obligatorias pendientes.

Distinguir fallo del cambio, previo/ajeno y problema de entorno, sin atribuirlo automáticamente al trabajo propio. Registrar comprobaciones ejecutadas y resultados, criterios cubiertos, revisión comprobada, comprobaciones omitidas con motivo y problemas pendientes. Si falta una herramienta, informarlo; no instalarla sin autorización ni inventar evidencia.

## 8. Subagentes

Los seis perfiles nativos están en `.opencode/agents/`, sin modelo fijo y con permisos acotados. Su disponibilidad no autoriza implementar aplicación; solo lo hacen las excepciones de la [constitución](constitution.md#11-etapa-actual), como la del frontend contra datos simulados:

| Perfil | Responsabilidad |
| --- | --- |
| Arquitecto | Proponer decisiones técnicas, mantener coherencia estructural y participar en cambios importantes |
| Analista de Requisitos | Proponer historias, criterios, atomización y dependencias dentro del alcance aprobado |
| Frontend | Diseñar e implementar interfaces y componentes de forma autónoma, sin tareas asignadas, aplicando el sistema de diseño; entrega los supuestos de contrato |
| Backend | Desarrollar endpoints, reglas de negocio, validaciones y comunicación con MongoDB; definir contratos, conectar la UI y verificar la integración |
| Base de Datos | Diseñar modelos, colecciones, relaciones, esquemas e índices; revisar cambios de datos |
| Documentador | Registrar trabajo realizado, actualizar historial relevante y mantener documentación técnica sin inventar pruebas |

El agente principal seleccionará solo los perfiles necesarios y autorizados, aportará contexto acotado y revisará los resultados. Las aprobaciones siguen correspondiendo al responsable del proyecto. No invocar a todos, encadenar delegaciones innecesarias o crear un perfil QA inicial; testing se apoya en el procedimiento y herramientas, no en un agente para ejecuciones mecánicas.

## 9. Cuatro controles y skills

Contrato de los cuatro controles autorizados, implementados por un script compartido sin IA, dependencias nuevas ni plugin:

| Control y activación | Propósito y límites |
| --- | --- |
| Requisitos: `/kofi-start` | Comprobar referencias de especificación/aprobación, criterios y tareas antes de funcionalidades relevantes. Exenciones justificadas para mantenimiento. El principal autentica aprobación y semántica; no invoca al Analista automáticamente. |
| Documentación: Git pre-commit | Revisar exclusivamente el índice, exigir documentación declarada y registros/evidencia ante nuevos cierres de tracker. Advertir relevancia incierta sin bloquear cambios triviales. No escribe, ejecuta pruebas ni decide DoD. |
| Alcance: `/kofi-verify` | Comparar cambios posteriores al inicio con rutas autorizadas y relacionadas justificadas. Advertir modificaciones ajenas, no bloquear a ciegas. Ampliaciones importantes necesitan aprobación. |
| Testing: `/kofi-verify` | Ejecutar selección rápida explícita, reutilizar éxitos vigentes y mostrar fallos/pendientes. Sin otra selección de IA, QA, builds completos, suites E2E ni instalaciones. |

El control de Testing usa únicamente checks registrados y disponibles. Actualmente comprueba configuración/documentación y sus propios controles con Node integrado; no ejecuta los comandos de formato, lint, build o humo del arranque técnico, ni existen pruebas funcionales del POS. Los comandos técnicos externos se mantienen en el README y su evidencia en la especificación fundacional; integrarlos en el control requiere autorización aparte. Si falta plan o cambió el riesgo, el principal lo revisa mediante la sección 7.2; el script no selecciona con IA ni invoca skills.

No ejecuta suites de aplicación completas, E2E, builds, subagentes, procesos recursivos ni correcciones. Si una comprobación necesaria no cabe en su alcance rápido, informa que debe ejecutarse por otro mecanismo, no la considera superada. Los resultados nuevos y reutilizados se registran según la sección 3; el contexto y caché locales no son evidencia permanente ni otro tracker.

No existe un evento nativo documentado que equivalga al cierre de una tarea de Kofi: se usan los límites explícitos anteriores. Los comandos slash son prompts en la sesión actual; el comando Node es la ejecución determinista alternativa. No hay pruebas por inactividad, respuesta, edición o llamada de herramienta. Reglas, salidas, contexto local, fingerprints y activación Git por clon están en [README](../../.opencode/README.md). Las limitaciones semánticas requieren revisión del principal, no más automatizaciones.

Las skills internas o externas se revisan antes de instalarlas: alcance, compatibilidad, dependencias y efectos. Se conservan Impeccable, Taste Skill y `emil-design-eng`, y se incorpora `react-best-practices` con su contrato de [diseño](design-system.md#7-react-best-practices). La skill `testing` fue retirada; sus responsabilidades de selección siguen en el principal y la ejecución rápida en el hook. Otras skills, agentes, dependencias y CI requieren autorización independiente.
