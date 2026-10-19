---
name: kofi-verify
description: "Ejecutar una vez los controles de alcance y testing al cerrar una tarea explícita; reutilizar resultados válidos."
argument-hint: "[tarea o solicitud]"
disable-model-invocation: true
---

Puente de Claude Code para el control explícito `/kofi-verify`. La fuente única es `.opencode/commands/kofi-verify.md`; no dupliques ni sustituyas su lógica.

1. Lee `.opencode/commands/kofi-verify.md` y sigue su cuerpo en esta misma sesión, con el agente y el modelo actuales. Ignora su frontmatter de OpenCode.
2. Donde el original se refiere a los argumentos del comando, usa la solicitud de abajo. No la interpoles en ningún comando.
3. «Herramienta shell» significa Bash o PowerShell. Ejecuta exactamente `node .opencode/scripts/kofi-check.mjs verify` (o con `--context ruta-relativa.json` si corresponde) y espera la aprobación de permisos. No invoques subagentes.
4. Informa la salida real: 0, 1 o 2. El éxito del script no acredita la DoD ni autoriza actualizar el tracker.

Solicitud: $ARGUMENTS
