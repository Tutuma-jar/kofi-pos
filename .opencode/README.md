# Controles de desarrollo de Kofi

Configuración nativa **OpenCode V2**, comprobada con Desktop/servidor **2.0.29**. El `opencode` del PATH detectado es **1.19.0**: no usarlo para validar estos archivos V2. No se cambian PATH, instalaciones ni configuración global. Los perfiles heredan el modelo; Claude necesita un proveedor conectado. Los controles no tienen plugins ni dependencias externas. La aplicación dispone solo del [arranque técnico autorizado](../docs/specs/technical-bootstrap.md); la [CI técnica inicial](../.github/workflows/ci.yml) es independiente y se ejecutará en GitHub después de publicarse, no por cargar OpenCode.

## Uso cotidiano

1. Solicita al principal un perfil cuando haga falta: «Usa `architect` para evaluar…», `requirements-analyst`, `frontend`, `backend`, `database` o `documenter`. La delegación pide autorización; los hijos no delegan. Crear los perfiles no habilita desarrollo funcional; solo lo hacen las excepciones de la constitución, como la que permite a `frontend` diseñar e implementar páginas contra datos simulados. Un encargo Frontend/Backend de implementación autorizado incluye su rama y commit local conforme al ciclo Git; no incluye push o integración.
2. `/kofi-start <objetivo>` prepara, con información aprobada, `.opencode/task.local.json` a partir de `task.example.json` y ejecuta requisitos. `taskKey` es una clave local descriptiva, no un ID del tracker. `feature` exige especificación; un fix relevante usa `requiresSpec: true`. Los demás casos justifican la exención. `approval` referencia la aprobación real; el script no puede autenticarla.
3. Antes de dar por terminada la tarea, `/kofi-verify` ejecuta alcance y testing. No equivale a completar DoD ni actualiza tracker. No hay activación por inactividad, respuesta o edición.
4. Con autorización de commit, incluida la del encargo Frontend/Backend cuando aplique, el pre-commit comprueba **solo documentación preparada**. No ejecuta pruebas ni escribe archivos. Si no puede inferir relevancia, advierte en lugar de bloquear a ciegas.

Alternativa sin un turno de modelo, desde la raíz:

```text
node .opencode/scripts/kofi-check.mjs start
node .opencode/scripts/kofi-check.mjs verify
node .opencode/scripts/kofi-check.mjs docs
```

Todos aceptan `--context ruta-relativa.json`. Los comandos slash son plantillas de prompt, no eventos ni ejecutores garantizados: el comando Node es la ejecución determinista. No insertan argumentos en bloques shell.

## Contexto y resultados

- `scope`: rutas/globs relativos autorizados (`*` no cruza `/`, `**` sí). `related`: objetos `{ "path": "ruta", "reason": "justificación aprobada" }`; no concede autorización por sí solo. Los permisos nativos usan otro comodín: `*` sí cruza `/`.
- `checks`: IDs explícitos `syntax`, `json`, `links`, `self-test`. `inputs`: archivos adicionales que afectan los resultados. `manual`: comprobaciones necesarias fuera del control rápido; se anuncian como pendientes, nunca como superadas.
- `documentation.required`: archivos cuya actualización debe estar preparada cuando se prepare trabajo de esa tarea. `documentation.reason` explica la selección o exención. El contexto local no prueba la aprobación ni sustituye documentación versionada.
- El principal selecciona verificaciones según el [procedimiento](../docs/ai-context/documentation.md#7-procedimiento-de-testing); el hook ejecuta las rápidas disponibles. No hay skill `testing`. Los [comandos técnicos](../README.md) de tipos/lint/formato/build y humo se ejecutan por separado. El script aún emite `PENDIENTE aplicación` y salida 2 ante cualquier ruta `frontend/` o `backend/`: es una limitación conocida, no detección de pruebas concretas. Registrar ese resultado y la evidencia externa correspondiente; no afirmar éxito integral del hook ni pruebas del POS. Ampliar el control requiere otro alcance autorizado.
- El inicio guarda una base de los archivos Git pendientes, incluidos los no seguidos; permite distinguir modificaciones posteriores sin depender de HEAD. Repetir `start` con la misma clave **no reemplaza** la base. El trabajo previo que forme parte de la tarea necesita revisión explícita; no se atribuye automáticamente a ella.
- Caché local en `.opencode/.cache/kofi-check/`: fingerprints de contenidos, entradas, selección, configuración, ejecución y dependencias conocidas. Un cambio invalida el resultado; solo se reutilizan éxitos. No es evidencia permanente ni otro tracker. Para un nuevo encargo usa otra clave, no borres la base para ocultar desviaciones.
- Salidas: `0` controles automáticos superados (puede haber advertencias), `1` fallo de comprobación, `2` preparación o verificaciones pendientes. Las advertencias requieren revisión humana. El script no corrige código; el principal respeta el límite de dos intentos automáticos de corrección del procedimiento.

`links` comprueba destinos locales de enlaces Markdown de los archivos afectados, no anchors, contenido semántico ni URLs remotas. `syntax` usa `node --check`, `json` parsea JSON estricto y `self-test` usa únicamente el runner incluido en Node para probar estos controles. No son pruebas del POS.

Frontend gestiona directamente Impeccable → Emil → `react-best-practices` al terminar una página con código React autorizado. En HTML sin React el tercer paso no aplica; un cambio técnico no fuerza revisiones visuales. Consultar el [contrato](../docs/ai-context/design-system.md#7-react-best-practices). Ninguna de esas revisiones sustituye el hook o las pruebas adicionales necesarias.

## Git y permisos

Activación local autorizada: `git config --local core.hooksPath .githooks`. Cada clon debe activarlo explícitamente. En Unix el archivo requiere permiso ejecutable (`chmod +x .githooks/pre-commit`); al versionarlo, conservar el modo `100755`. Para volver al comportamiento anterior (no había hooksPath), `git config --local --unset core.hooksPath`. Git puede omitir pre-commit mediante `--no-verify`; no es una barrera de seguridad o aprobación para commits.

El pre-commit valida documentación declarada y nuevos cierres de tracker con registros/evidencias disponibles en el índice: dentro de la especificación o en registros de `docs/progress/completed/` enlazados desde ella. Una historia cerrada no puede mantener tareas pendientes. La evidencia ya versionada no necesita una edición artificial; lo nuevo debe estar preparado. Fuera de un contexto aplicable solo puede advertir cambios técnicos potencialmente relevantes. No puede decidir por sí solo si una funcionalidad está completa o una evidencia es cierta. Los índices alternativos se respetan.

Los seis perfiles deniegan herramientas por defecto; habilitan lectura/búsqueda, ediciones acotadas e inspección Git exacta según rol. Frontend/Backend permiten el fetch exacto `git fetch origin` y piden confirmación nativa `ask` para crear/reutilizar ramas de TASK (Backend) o de módulo `*/ui-*` (Frontend), preparar rutas de su módulo (Backend también `frontend/src/*/api/`) y un commit ordinario. Los demás perfiles siguen sin mutaciones Git. Además, `frontend` puede ejecutar el lanzador de Impeccable, los scripts del workspace frontend (`dev`, `build`, `typecheck`, `test`), `lint` y `format`; `npm install … --workspace @kofi/frontend --save-exact` pide confirmación en cada uso. La shell no es un sandbox: no hay permisos generales para Git, Node, gestores de paquetes, intérpretes o MongoDB. Se prohíben bypass de hooks, amend, push e integración implícitos; las instrucciones y revisión de alcance siguen siendo necesarias además del permiso de comando. Las herramientas desconocidas/MCP quedan denegadas en hijos. El principal revisa resultados y coordina archivos compartidos. Un cambio de perfil o cliente no elude las reglas de Kofi.

El [ciclo Git](../docs/ai-context/conventions.md#ciclo-git-de-frontend-y-backend) exige comprobar carpeta/índice, fetch correcto de origin y crear mediante `git switch --no-track --create <rama> origin/develop`, verificando el SHA base recién obtenido. No usar un develop local desactualizado ni resetear una rama existente. Una rama por tarea o módulo no aísla dos agentes en la misma carpeta: el principal asigna clones/worktrees cuando haga falta. Instalar esta política no crea ramas, commits o funcionalidades por sí mismo.
