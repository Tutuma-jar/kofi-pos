---
description: Ejecutar una vez los controles de alcance y testing al cerrar una tarea explícita; reutilizar resultados válidos.
subagent: false
---

Verifica el cierre explícito de la tarea indicada, conservando sesión, agente y modelo. Solicitud: $ARGUMENTS

Reutiliza la selección de verificaciones vigente. No existe una skill testing: el principal determina las comprobaciones según docs/ai-context/documentation.md, sección 7, cuando falta selección o cambia el alcance/dependencias/riesgo. El script ejecuta la selección rápida explícita; no selecciona con IA ni certifica por sí solo criterios o DoD. Comprueba que .opencode/task.local.json corresponde al trabajo solicitado; no lo reemplaces ni amplíes alcance silenciosamente.

Ejecuta mediante la herramienta shell: node .opencode/scripts/kofi-check.mjs verify

No interpoles argumentos del usuario en shell, no ejecutes al entrar en inactividad ni por cada edición y no delegues verificaciones mecánicas. Informa advertencias de alcance al principal; ampliaciones importantes requieren aprobación. Un fallo de comprobación no autoriza cambios ajenos. Como máximo dos intentos consecutivos de corrección del mismo fallo, contando intentos anteriores aunque se cambie de agente o comando; después detente y consulta.

Resume resultados nuevos, reutilizados, fallidos y pendientes. El éxito del control rápido no acredita la DoD. El principal revisa criterios y verificaciones adicionales, registra evidencia en su fuente y solo entonces decide actualizar el tracker. Este comando no marca estados, escribe documentación ni realiza commits.
