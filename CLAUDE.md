@AGENTS.md

# Claude Code en Kofi

AGENTS.md es la entrada única; este archivo solo traduce las herramientas. Detalle y limitaciones en [arquitectura](docs/ai-context/architecture.md#compatibilidad-con-claude-code).

| OpenCode | Claude Code |
| --- | --- |
| `.opencode/agents/<perfil>.md` | `.claude/agents/<perfil>.md`, puente que remite al original. Delegación solo con aprobación explícita; los hijos no delegan ni usan shell |
| `.opencode/skills/<skill>/` | `.claude/skills/<skill>/SKILL.md`, puente que remite al original y a sus recursos |
| `/kofi-start`, `/kofi-verify`, `/impeccable` | Mismos nombres como skills; los controles solo se invocan explícitamente |
| Herramienta shell | Bash o PowerShell; `node .opencode/scripts/kofi-check.mjs …` sigue siendo el mecanismo determinista |

No hay hooks de Claude: el pre-commit documental de Git es el único hook. Fin de respuesta, inactividad o una edición no cierran una tarea, y el éxito de un script no acredita la DoD.
