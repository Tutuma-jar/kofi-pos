---
description: Comprobar requisitos y registrar la base de una tarea explícita, sin delegar ni implementar.
subagent: false
---

Inicia el control explícito de una tarea de Kofi. Conserva agente y modelo actuales. No uses el inicio de sesión o una edición como sustituto de este límite de tarea.

Contexto solicitado: $ARGUMENTS

Consulta .opencode/README.md si no hay contexto vigente. Prepara .opencode/task.local.json desde task.example.json únicamente con alcance aprobado, referencia real de aprobación, selección de pruebas vigente y documentación esperada. No inventes IDs, requisitos ni aprobaciones; no sobrescribas un contexto ajeno. Para funcionalidades relevantes usa especificación aprobada y tareas registradas; para mantenimiento justifica la exención.

Ejecuta mediante la herramienta shell: node .opencode/scripts/kofi-check.mjs start

No interpoles los argumentos del usuario en comandos shell. Si falta información, consulta antes de implementar. El control valida estructura y referencias, no autentica la aprobación. No invoques subagentes automáticamente ni hagas commits.
