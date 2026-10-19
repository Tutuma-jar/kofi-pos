# Kofi — Arquitectura y organización

## 1. Decisiones aprobadas

| Área | Decisión |
| --- | --- |
| Repositorio | Monorepo con frontend y backend separados |
| Frontend | React con TypeScript |
| Backend | Node.js con Express y TypeScript |
| Persistencia | MongoDB |

El contexto funcional y sus límites se consultan en [product.md](product.md). La [base técnica mínima](#7-base-técnica-mínima-aprobada) concreta las herramientas y mecanismos aprobados posteriormente. Su aprobación documental no significa que estén instalados ni autoriza implementar, contratar servicios o desplegar.

## 2. Estructura actual

```text
kofi-pos/
├── AGENTS.md
├── README.md                           # Comandos del arranque técnico autorizado
├── package.json                        # npm workspaces; dependencias raíz de herramientas
├── package-lock.json                   # Único lockfile; versiones exactas
├── .node-version                       # Node 24.19.0
├── .npmrc                              # Versiones exactas, engines y lifecycle deshabilitado
├── eslint.config.mjs                   # Calidad solo del código técnico autorizado
├── .prettierrc.json
├── .prettierignore
├── .github/
│   ├── workflows/ci.yml                 # CI técnica; check estable technical-checks
│   └── scripts/                        # Selección determinista y tests Node de CI
├── frontend/                           # Bootstrap React; sin módulos funcionales
│   ├── package.json
│   ├── index.html
│   ├── tsconfig.json
│   ├── vite.config.ts                  # Vite y humo Vitest/jsdom
│   └── src/                           # App técnica, montaje y prueba de humo
├── backend/                            # Bootstrap Express; sin rutas de negocio o MongoDB
│   ├── package.json
│   ├── .env.example
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   └── src/                           # Aplicación, listener y prueba de humo
├── PRODUCT.md                          # Puente al producto del AI Context
├── DESIGN.md                           # Puente al sistema de diseño del AI Context
├── .gitignore
├── .githooks/pre-commit                 # Solo documentación del índice
├── design-lab/                         # Exploraciones visuales, no aplicación
│   ├── index.html                      # Galería: día K, noche L y anteriores
│   ├── dashboard-a/                    # Cálida, lateral y espaciosa
│   ├── dashboard-b/                    # Minimalista, navegación superior
│   ├── dashboard-c/                    # Compacta, lateral burdeos
│   ├── dashboard-d/                    # Bosque y avena, lateral ocultable
│   ├── dashboard-e/                    # Terracota y leche, lateral ocultable
│   ├── dashboard-f/                    # Espresso y miel, lateral ocultable
│   ├── dashboard-g/                    # Bruma y avena, misma composición de D
│   ├── dashboard-h/                    # Pizarra y café, misma composición de D
│   ├── dashboard-i/                    # Casa de café; jerarquía y densidad nuevas
│   ├── dashboard-j/                    # Casa de café en bruma; colores sobre I
│   ├── dashboard-k/                    # Bruma de día; paleta clara sobre I
│   ├── dashboard-l/                    # Bruma de noche; paleta oscura sobre I
│   ├── shared/                         # Fuente, estilos y datos ficticios comunes
│   └── serve.mjs                       # Servidor local sin dependencias
├── .opencode/
│   ├── opencode.jsonc                   # Permisos nativos V2; sin modelo fijo
│   ├── README.md                        # Operación y limitaciones de controles
│   ├── agents/                         # Los seis perfiles autorizados
│   ├── commands/kofi-start.md           # Inicio explícito, requisitos y base local
│   ├── commands/kofi-verify.md          # Cierre explícito, alcance y testing
│   ├── scripts/kofi-check.mjs           # Cuatro controles sin IA ni dependencias
│   ├── scripts/kofi-check.test.mjs      # Pruebas aisladas con Node integrado
│   ├── task.example.json               # Plantilla; contexto real ignorado por Git
│   ├── commands/impeccable.md           # Comando local, sin modelo ni agente fijo
│   └── skills/
│       ├── react-best-practices/        # Revisión React; referencias bajo demanda
│       │   ├── SKILL.md                 # Original con bloque local de límites
│       │   ├── references/              # Guía y reglas Markdown originales
│       │   ├── LICENSE-SOURCE.md        # README upstream que declara MIT
│       │   ├── NOTICE-KOFI.md
│       │   └── UPSTREAM.json            # Revisión y fingerprint original
│       ├── impeccable/
│       │   ├── SKILL.md                 # Skill externa con adaptación local
│       │   ├── LICENSE
│       │   ├── NOTICE.md
│       │   ├── reference/               # Referencias bajo demanda
│       │   └── scripts/                 # Lanzadores y recursos de Impeccable
│       ├── design-taste-frontend/        # Taste Skill v2, carga explícita
│       │   ├── SKILL.md                 # Adaptación local; no dashboards
│       │   ├── LICENSE
│       │   ├── NOTICE-KOFI.md
│       │   ├── UPSTREAM.json            # Revisión y hashes originales
│       │   ├── references/
│       │   ├── library/
│       │   ├── assets/
│       │   ├── evals/
│       │   ├── README.md
│       │   └── scripts/                 # Herramientas sin paquetes externos
│       └── emil-design-eng/             # Principal de Emil Kowalski
│           ├── SKILL.md                 # Original sin modificar
│           ├── LICENSE                  # MIT, original
│           ├── NOTICE-KOFI.md            # Alcance local de instalación
│           └── UPSTREAM.json            # Revisión y hashes originales
├── CLAUDE.md                           # Importa AGENTS.md; equivalencias Claude Code
├── .claude/
│   ├── settings.json                   # Permisos compartidos; sin hooks ni allow
│   ├── agents/                         # Seis puentes a .opencode/agents/
│   └── skills/                         # Puentes a .opencode/skills/ y controles
└── docs/
    ├── ai-context/
    │   ├── product.md
    │   ├── constitution.md
    │   ├── architecture.md
    │   ├── conventions.md
    │   ├── design-system.md
    │   └── documentation.md
    ├── specs/
    │   └── dashboard-design-lab.md      # Alcance y criterios de exploración
    └── progress/
        ├── tracker.md
        └── CHANGELOG.md
```

## 3. Ubicaciones futuras aprobadas para planificación

Frontend y backend ya existen únicamente como arranque técnico según la sección 9. Las siguientes rutas siguen previstas, no existentes ni configuradas; se crearán cuando se autorice el trabajo correspondiente:

```text
kofi-pos/
└── docs/
    ├── specs/
    │   └── us-NNN-titulo-breve.md       # Futuras historias; no historia creada
    └── progress/
        └── completed/                  # Opcional; registros extensos necesarios
```

Este árbol complementa el actual: no reemplaza ni elimina sus documentos. Crear aplicaciones técnicas se autorizó expresamente en la sección 9 y la CI inicial después, en la sección 10; ninguna de esas autorizaciones implementa módulos funcionales por disponer de sus carpetas raíz.

Los [cuatro controles](documentation.md#9-cuatro-controles-y-skills) mantienen testing en el cierre explícito de tarea, no en pre-commit. `.githooks/pre-commit` se usa exclusivamente para documentación; no hay un quinto control. Se mantienen las revisiones de archivos, secretos y temporales de [conventions.md](conventions.md).

### Integración de agentes y controles de desarrollo

- Autorización: aprobación explícita de Fase B del 2026-10-18; excepción acotada de la constitución. Seis perfiles en `.opencode/agents/` y cuatro controles. Por decisión posterior se retiró la skill `testing`: el principal selecciona verificaciones según documentación y el hook ejecuta las rápidas disponibles. Sin aplicación, dependencias nuevas, plugins, hooks por edición, QA, cambios funcionales de historias, estados de tracker o CI.
- Objetivo: formato nativo V2, Desktop y servidor detectados en `2.0.29`. El `opencode` del PATH apunta a `1.19.0`; no se cambia la instalación ni se garantiza que lea esta configuración V2. Para verificar se usa el CLI V2 de Desktop, no el del PATH.
- Los perfiles no fijan modelo ni proveedor. Permisos denegados por defecto en hijos, excepciones por rol, sin delegación encadenada. El principal mantiene aprobaciones y DoD. Database requiere aprobación para modelos y coordina archivos con Backend; tracker permanece bajo el principal.
- Por autorización posterior, Frontend/Backend incorporan el [ciclo Git de tarea](conventions.md#ciclo-git-de-frontend-y-backend): fetch exacto de origin, creación desde origin/develop recién actualizado y commit local del alcance autorizado. Mutaciones acotadas con confirmación nativa; sin push, integración, cambios destructivos o worktrees creados autónomamente. Los demás perfiles conservan sus límites. El principal asigna aislamiento y coordina verificaciones/documentación, sin habilitar implementación por el mero registro de una historia.
- Requisitos al inicio y alcance/testing al cierre usan comandos explícitos y el script Node compartido. No se identifica fin de tarea con inactividad, fin de respuesta o eventos de herramientas. No se necesita plugin ni otro proceso de IA. Los slash commands son prompts; el comando Node es el mecanismo determinista.
- Documentación usa pre-commit ligero y solo el índice Git; activación local autorizada por `core.hooksPath=.githooks`, independiente por clon. No ejecuta pruebas ni escribe documentación.
- `.opencode/task.local.json` y `.opencode/.cache/kofi-check/` contienen alcance/selección y fingerprints locales ignorados, no estados oficiales ni evidencia permanente. Solo se inspeccionan contenidos Git pendientes y entradas declaradas; se contempla el repositorio sin commits. La base no se reinicia automáticamente. Detalles operativos y limitaciones en [README](../../.opencode/README.md).
- El script solo registra comprobaciones conocidas de configuración/documentación y pruebas de estos controles con el runner integrado de Node. El arranque técnico de la sección 9 instala un subconjunto de las herramientas elegidas y dispone de scripts externos al control rápido; este sigue sin ejecutar pruebas de aplicación. Las pruebas funcionales futuras requieren selección y ejecución autorizadas antes de completar DoD.

### Compatibilidad con Claude Code

- Autorización: solicitud del responsable del 2026-10-19, limitada a compatibilidad de herramientas. OpenCode sigue siendo la configuración de referencia y no se modifica; no añade funcionalidades, dependencias, plugins, hooks, cambios de Git ni estados del tracker.
- `CLAUDE.md` importa `AGENTS.md` (si existe `CLAUDE.md`, Claude Code no lee `AGENTS.md` por sí mismo) y solo traduce herramientas.
- Puentes sin copia: `.claude/agents/<perfil>.md` y `.claude/skills/<skill>/SKILL.md` remiten a sus originales de `.opencode/`, donde permanecen instrucciones, recursos y licencias. No se usan symlinks ni junctions: `core.symlinks` está desactivado en Windows y Git no versiona junctions. Al cambiar el nombre o la descripción de un original, actualizar su puente.
- Perfiles: `model: inherit`, `permissionMode: default` y herramientas explícitas (lectura y búsqueda; Edit/Write en los que escriben; Skill solo en Frontend). Ninguno recibe shell, `Agent`, MCP ni web, así que no delegan; el principal ejecuta `git status`, `git diff` y `kofi-check`.
- `/kofi-start`, `/kofi-verify` e `/impeccable` son skills puente. Las de control solo se invocan explícitamente, ejecutan el mismo comando Node y no preaprueban comandos. Taste Skill no puede ser invocada por el modelo.
- `.claude/settings.json`: `ask` para cualquier `Agent` y para editar la constitución; `deny` para leer `.env*` y `.git/`, también en el principal. Shell y directorios externos conservan el comportamiento nativo de Claude Code: pide aprobación salvo en comandos de solo lectura.
- Limitaciones sin equivalente nativo: Claude Code no tiene límites de ruta de escritura ni listas de skills por subagente (quedan en el prompt). Las ediciones del subagente piden aprobación solo si la sesión principal está en modo Manual/default, porque en acceptEdits, auto o bypass el subagente hereda ese modo. Tampoco existe «denegar todo excepto», por lo que los agentes integrados piden aprobación pero no quedan prohibidos. Un hook `PreToolUse` por subagente podría imponer rutas, pero requiere aprobación separada.

## 4. Responsabilidades y límites

| Ubicación | Responsabilidad |
| --- | --- |
| `AGENTS.md` | Navegación y aplicación selectiva del contexto |
| `PRODUCT.md`, `DESIGN.md` | Puentes sin contenido normativo duplicado; remiten al AI Context |
| `.opencode/skills/impeccable/` | Skill externa local; fuente única, también para el puente de Claude Code; sin subagentes nuevos |
| `CLAUDE.md`, `.claude/` | Compatibilidad con Claude Code mediante puentes a `AGENTS.md` y `.opencode/`; sin reglas propias |
| `.opencode/commands/impeccable.md` | Invocación en la sesión actual; sin modelo fijo ni delegación automática |
| `design-lab/` | Prototipos visuales independientes con datos ficticios, conservando cada serie; no comparte lógica con la futura aplicación |
| `frontend/` | Presentación, interacción y consumo de la API; sin acceso directo a MongoDB |
| `backend/` | API, validaciones, reglas de negocio y acceso a persistencia |
| `docs/ai-context/` | Contexto estable y estándares; no estados de tareas |
| `docs/specs/` | Necesidades aprobadas, alcance, criterios y tareas técnicas |
| `docs/progress/tracker.md` | Estado oficial de historias y tareas |
| `docs/progress/CHANGELOG.md` | Historial cronológico de cambios relevantes |
| `docs/progress/completed/` | Evidencias extensas cuando no baste la especificación; no un segundo tracker |

La comunicación prevista es **frontend → API backend → MongoDB**. MongoDB es la base de datos, no una tercera aplicación del monorepo. Los modelos y el acceso a datos pertenecen al backend; no se crea una carpeta independiente de base de datos por defecto.

### Integración local de Impeccable

- Fuente: [Impeccable](https://github.com/pbakaus/impeccable), distribución oficial para OpenCode, Apache-2.0, skill `4.6.0` y motor `0.1.15`.
- Instalación ejecutada: `npx --yes impeccable@4.6.0 install --providers=opencode --scope=project --no-hooks --yes`. No se seleccionó el proveedor de instalación `claude`: ese nombre corresponde a Claude Code, no al modelo dentro de OpenCode.
- La skill, referencias, licencias y lanzadores se mantienen en el repositorio. El motor Windows x64 se instala localmente en `scripts/bin/windows-x64/impeccable.exe` y se excluye de Git por ser un artefacto generado. `scripts/VERSION` identifica la versión que el lanzador necesita.
- En otra máquina puede ser necesario descargar el motor para su plataforma; el lanzador original admite una caché de usuario como alternativa. Esto no instala skills ni configuración global. No prometer funcionamiento sin red si falta el ejecutable.
- Las adaptaciones locales están señaladas en `SKILL.md` y en el comando: prioridad del AI Context y ausencia de delegación automática. No se agrega configuración de modelo o proveedor.
- Antes de actualizar, revisar los cambios, autorizar la actualización, mantener `--no-hooks` y reaplicar o reconciliar estas adaptaciones antes de usar la nueva versión. El instalador puede reemplazar archivos locales y descargar una distribución de skills más reciente que el paquete CLI seleccionado; comprobar las versiones resultantes, no asumir que fijar el paquete fija todos los recursos.
- El contrato funcional y las limitaciones de los puentes se mantienen en [design-system.md](design-system.md#3-integración-de-impeccable).

### Integración local de Taste Skill

- Fuente: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), skill principal `design-taste-frontend`, v2, licencia MIT. Revisión fijada: `f624f37a8c650b9cc550253104925efe4c8de246`.
- Instalación manual compatible con OpenCode V2: copia de los 29 archivos de `skills/taste-skill/` y de la licencia raíz en `.opencode/skills/design-taste-frontend/`. No se ejecutaron `npx skills`, instaladores, scripts de diseño ni el resto del bundle.
- La documentación web todavía describe una distribución anterior. Se tomó como fuente efectiva el repositorio fijado, cuya skill actual excluye expresamente dashboards y pantallas de aplicación.
- Los 30 archivos originales se verificaron contra sus hashes Git antes de adaptar `SKILL.md`. `UPSTREAM.json` conserva procedencia y hashes; `NOTICE-KOFI.md` identifica las modificaciones locales y el mantenimiento.
- Adaptación local: prioridad del AI Context, sesión/agente/modelo actuales, ausencia de delegación y ejecución automática, respeto del alcance y del historial local. `metadata.opencode/autoinvoke: false` permite cargarla explícitamente sin anunciarla para uso automático.
- Recursos: bibliotecas JSON, referencias y scripts Node sin dependencias externas. El inspector necesita Node 22+ y Chrome, Edge o Chromium existente; la búsqueda de imágenes usa red cuando se invoca. Node `v24.19.0` está disponible y se comprobó sintaxis de los ocho archivos JavaScript; no se ejecutó un flujo de diseño ni una inspección con esta skill durante la instalación.
- Verificación de instalación: carga explícita mediante la herramienta nativa de OpenCode confirmada; los 30 hashes originales coinciden también después de retirar la adaptación en memoria para comprobar `SKILL.md`. Bibliotecas JSON y rutas de apoyo válidas. Sin cambios en dashboards, producto, tracker, puentes raíz o configuración global; no se instalaron paquetes ni se activaron hooks o CI. No se prueban generación, búsquedas de imágenes ni inspector porque exceden la instalación solicitada.
- Contrato de uso: [design-system.md](design-system.md#6-taste-skill-complementaria-y-de-uso-explícito). Las actualizaciones requieren autorización y revisión del nuevo upstream, conservando o reconciliando la adaptación local; no sobrescribirla con un instalador sin revisión.

### Integración local de Emil Design Engineering

- Fuente: <https://emilkowal.ski/skill> y repositorio canónico <https://github.com/emilkowalski/skills>, al que redirige el anterior `emilkowalski/skill`.
- Autorización de instalación local del usuario el 2026-10-18. Solo la principal `emil-design-eng`, no el catálogo de skills especializadas.
- Revisión fijada: `2d228630ba1446365f614a108cb8252f1feda202`; licencia MIT. El árbol de esa revisión contiene un único archivo en `skills/emil-design-eng/`, sin scripts, referencias privadas ni dependencias adicionales que copiar.
- Instalación por copia de los originales `SKILL.md` y `LICENSE`, sin ejecutar `npx skills`, instalar paquetes o tocar configuración global. `NOTICE-KOFI.md` y `UPSTREAM.json` son los únicos archivos locales de soporte; no se adapta el cuerpo ni el frontmatter de la skill.
- Los ejemplos de código y enlaces externos de la skill no se ejecutan ni se descargan como dependencias. Su revisión posterior a Impeccable se rige por el [contrato funcional](design-system.md#4-integración-de-emil-design-engineering), sin hooks ni dependencias adicionales.
- Verificación de instalación: hashes Git y tamaños de los dos archivos originales correctos, frontmatter válido y carga nativa mediante `skill` con ID `emil-design-eng` confirmada. Directorio con cuatro archivos: los dos originales y los dos soportes locales; sin ejecutables ni dependencias. Enlace local del aviso comprobado. No se ejecutaron revisiones visuales, scripts externos ni pruebas de aplicación porque no se modificó la interfaz o su comportamiento; tracker sin cambios.
- Mantenimiento: revisar y autorizar actualizaciones, fijar revisión y verificar los hashes Git del manifiesto antes de sustituir archivos. No dar por instalada una actualización por consultar el contenido de `main`.

### Integración local de React Best Practices

- Fuente solicitada: rama `react-best-practices` de [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/react-best-practices/skills/react-best-practices), revisión fijada `6e356b41264f0815d03740b5ae32ca5e1dddcfef`; guía 0.1.0. No se instala otra rama o skill del catálogo.
- Copia local de 48 archivos originales Markdown, verificados con sus blobs Git: `SKILL.md`, 46 referencias y README raíz como `LICENSE-SOURCE.md`. Este último declara MIT; la revisión no incluye un archivo LICENSE independiente, limitación conservada explícitamente sin inventar un original. Sin ejecutables, instaladores, paquetes o configuración global.
- `NOTICE-KOFI.md` y `UPSTREAM.json` identifican procedencia, licencia declarada y fingerprint. Único cambio al upstream: bloque marcado en `SKILL.md` con prioridad del contexto, alcance React sin Next.js y ausencia de instalaciones/delegación/pruebas como efecto de la carga. Las referencias permanecen originales y se consultan selectivamente, no se cargan todas por tarea.
- Frontend puede cargar la skill nativamente, sin modelos fijos. Secuencia pertinente: Impeccable → Emil → React Best Practices cuando hay código React; no se fuerza en HTML o tareas sin diseño. Selección de pruebas por el principal y ejecución rápida con el hook, sin skill `testing`. El contrato está en [diseño](design-system.md#7-react-best-practices); las revisiones no verifican por sí mismas requisitos o integridad del POS.
- Mantenimiento: autorizar actualización, fijar revisión, comprobar blobs/fingerprint, revisar licencia y reconciliar el bloque local. No ejecutar ejemplos como `npx svgo` ni instalar SWR, better-all u otras librerías porque aparezcan en la documentación.

## 5. Organización de módulos

- Agrupar por responsabilidad funcional y mantener reconocible la relación con las especificaciones del producto.
- Ubicar interfaces y lógica de presentación en frontend; reglas de negocio y persistencia en backend.
- Reparto de trabajo: Frontend diseña e implementa la interfaz de forma autónoma, sin tareas, contra datos simulados y con supuestos en `frontend/src/<módulo>/api/contract.provisional.ts`. Las tareas de backend definen el contrato, implementan endpoints y reglas, sustituyen la capa de acceso simulada del módulo por la API real (Backend solo edita `frontend/src/<módulo>/api/`) y verifican la integración. Los ajustes de UI que exija el contrato vuelven a Frontend. La lógica de cliente que depende del transporte o de la sesión vive en `frontend/src/<módulo>/api/` (presencia, identidad de pestaña, suscripción SSE con relectura, referencia opaca y la copia verificada de la regla de importes de TASK-027, que se recalcula con autoridad en el backend) y Frontend entrega su versión simulada. El cliente HTTP común con la autorización de pestaña y el manejo del 401 vive en `frontend/src/auth/api/` y lo importan los demás módulos.
- No convertir cada módulo en un servicio independiente ni exigir una carpeta por capa.
- Introducir controladores, servicios, rutas y modelos según la necesidad real; sus nombres siguen [conventions.md](conventions.md).
- Extraer elementos compartidos cuando exista reutilización concreta, no para anticipar funcionalidades.
- Mantener una especificación por historia con sus tareas inicialmente en el mismo documento. No crear un archivo por tarea por defecto.

Los nombres y el árbol interno de los módulos se decidirán con sus especificaciones antes de implementarlos. La separación técnica no agrega módulos de producto.

En el laboratorio, G y H reutilizan directamente `dashboard-d/styles.css` para la composición y agregan hojas propias que solo varían colores. No se altera D ni se convierte el laboratorio en una biblioteca de componentes de la aplicación.

I reutiliza la fuente, los datos y el comportamiento del menú, pero tiene su propia composición autorizada: resumen horizontal, ventas recientes prioritarias, productos y pagos agrupados y gráfico secundario compacto. No modifica las hojas de A–H.

## 6. Nuevas carpetas y decisiones arquitectónicas

Antes de introducir una carpeta, dependencia estructural o capa:

1. Identificar su responsabilidad y la necesidad aprobada que atiende.
2. Comprobar si una ubicación existente ya cumple esa función.
3. Evaluar la alternativa más sencilla, mantenibilidad, seguridad, coste operativo y compatibilidad con el stack.
4. Para cambios arquitectónicos significativos, presentar contexto, alternativas, decisión propuesta e impacto y obtener aprobación explícita.
5. Registrar la decisión aprobada aquí, actualizando el árbol si corresponde y enlazando su especificación. Documentar el cambio relevante en el CHANGELOG sin copiar la justificación completa.

Los ajustes triviales que no cambien decisiones aprobadas no necesitan un registro arquitectónico independiente. No crear una jerarquía de documentos de decisiones anticipadamente.

## 7. Base técnica mínima aprobada

### Aprobación y alcance

El 2026-10-18, después de revisar las US-001 a US-013 con `architect` y recibir las recomendaciones concretas del principal, el responsable respondió «si las apruebo todas,. sigue tus recomendaciones» a la solicitud de documentarlas sin implementar ni instalar nada. Se aprueban las decisiones siguientes; la identidad de pestaña y los detalles aún no concretados permanecen pendientes. No se crean tareas fundacionales, aplicaciones, dependencias instaladas, infraestructura, CI ni cambios de estado del tracker. Historial y reportes sigue sin historias aprobadas.

Ese hito fue exclusivamente documental. Posteriormente se autorizó ejecutar solo el [arranque técnico](#9-arranque-técnico-autorizado), sin iniciar las tareas funcionales; esa excepción no resuelve los pendientes de los módulos ni autoriza infraestructura o CI.

### Herramientas y organización

| Área | Decisión aprobada y justificación |
| --- | --- |
| Monorepo | npm workspaces, un lockfile raíz y scripts por aplicación; sin orquestador adicional. |
| Lenguaje y ejecución | TypeScript en ambas aplicaciones; backend con `tsx` en desarrollo y `tsc` para compilar. Versiones del arranque fijadas y verificadas en la sección 9. |
| Frontend | Vite, React Router, `fetch` y Context/reducer. Selección temporal en memoria por pestaña, por encima de la navegación; sin persistencia de borradores. |
| Estilos | CSS Modules y variables CSS, conservando el sistema visual P. Sin framework visual o biblioteca de componentes inicial. |
| Persistencia y validación | Driver oficial `mongodb`, sin ODM inicial; Zod para validar las entradas del backend. Los tipos TypeScript no sustituyen validación en ejecución. |
| Pruebas | Vitest, Testing Library, Supertest y Playwright; integración futura con MongoDB real aislado y transacciones. El arranque instala y comprueba solo humo React/Express; la [preparación del backend](#11-preparación-del-backend-autorizada) añade MongoDB local con replica set y una prueba técnica de transacciones. Playwright y las pruebas funcionales del POS siguen pendientes. |
| Calidad | ESLint y Prettier; no sustituyen comprobaciones funcionales. |

En `frontend/src/` y `backend/src/` existe únicamente el arranque técnico. En `frontend/src/` se autorizan los módulos `auth`, `dashboard`, `menu` y `sales` y la carpeta `shared/` para tokens, componentes base y estructura común, contra datos simulados y contratos provisionales, por la [excepción de la constitución](constitution.md#11-etapa-actual) del 2026-10-19, que también autoriza React Router y dependencias de interfaz justificadas; en el backend siguen previstos y no se crean anticipadamente. Persistencia y modelos futuros permanecen dentro del backend. Solo se extraen compartidos ante reutilización real; no se introduce un paquete compartido, repositorio genérico o carpeta obligatoria por capa. No se incorporan Next.js, Redux, microservicios, Redis, colas ni WebSockets inicialmente.

### API, dinero y tiempo

- HTTP/JSON bajo `/api`, frontend y API bajo el mismo origen HTTPS. Las [convenciones comunes](#convenciones-comunes-del-contrato-http) fijan envoltorio, estados y nombres; rutas y DTO concretos los define cada TASK.
- Backend autoritativo para validación, importes, autorización y persistencia. Contratos con identidades estables, versión de catálogo y errores distinguibles de validación, conflicto, autorización y resultado incierto.
- Precios, subtotales y totales como enteros de décimas de BOB; interfaz siempre con un decimal. Cantidades enteras positivas. Comprobar el rango entero exacto elegido en valores, multiplicaciones y sumas, además del tamaño de solicitud/documento; los límites aprobados el 2026-10-19 son enteros seguros de JavaScript y cuerpo de solicitud de 100 KB como máximo, sin máximos comerciales. Ver [US-011](../specs/us-011-ajustar-revisar-venta-en-curso.md).
- Fecha/hora de registro del servidor en UTC; límites diarios/mensuales y agrupación por hora en `America/La_Paz`, nunca según el reloj o zona del navegador.

### Convenciones comunes del contrato HTTP

Aprobadas el 2026-10-19 por el responsable («Apruebo las 9 recomendaciones de architect»), a partir de la propuesta de `architect`. Aplican a todos los módulos; cada TASK define solo rutas, métodos, DTO, los códigos que devuelve cada endpoint y los códigos nuevos que añada al catálogo. Generalizan el [contrato aprobado del Dashboard](../specs/us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización) sin modificarlo y cierran su pendiente de envoltorio común.

- **Rutas.** `/api/<recurso>` en plural y `kebab-case`; las acciones que no son CRUD se modelan como recursos sustantivos. Sin versionado: cliente único, mismo origen y despliegue conjunto; un cambio de contrato cambia ambos lados en el mismo PR. `/api` nunca devuelve HTML: el fallback de la SPA lo excluye y una ruta o método inexistente responde 404 `NOT_FOUND`.
- **JSON.** `camelCase`; identidad propia `id`, referencias `<entidad>Id`; nunca `_id` ni campos internos. Ids de MongoDB como hexadecimal de 24 caracteres en minúsculas, opacos para el cliente; `operationId` UUID v4 canónico en minúsculas, validado como versión 4. Entradas estrictas (campo desconocido → 400); el cliente ignora campos de respuesta desconocidos. En respuestas la ausencia es `null`; en PATCH, omitido = sin cambios y `null` = quitar.
- **Valores.** Importes enteros seguros con sufijo `Tenths`, sin campo de moneda; cantidades `quantity`; contadores `…Count`. Instantes `…At` en ISO 8601 UTC con milisegundos y `Z` (`toISOString()`), presentados con `timeZone: 'America/La_Paz'` explícito. Fechas civiles `…Date` como `AAAA-MM-DD` en `America/La_Paz`. Enums en minúsculas y `kebab-case` (pago `cash` | `qr`); un valor desconocido es error, nunca un valor por defecto.
- **Éxito.** Sin envoltorio. Colecciones como `{ "items": [...] }`. 200 en lecturas y PATCH (recurso actualizado con su `version`), 201 al crear, 204 sin cuerpo. Un 2xx significa siempre que la operación se cumplió.
- **Error.** `{ "error": { "code", "message", "details"? } }`. `code` en `UPPER_SNAKE_CASE`, estable y único criterio del cliente; `message` es diagnóstico, la interfaz no lo muestra y no contiene secretos ni trazas (un 500 lleva mensaje genérico). `VALIDATION_ERROR` usa `details.fields: [{ field, code }]` con `REQUIRED`, `INVALID_FORMAT`, `TOO_SHORT`, `TOO_LONG`, `OUT_OF_RANGE`, `NOT_ALLOWED` o `DUPLICATE`; otras formas de `details` (por ejemplo `changes` de `CATALOG_CHANGED`) las define la TASK de su código.
- **Estados.** 400 `VALIDATION_ERROR` (incluidos JSON mal formado, campo desconocido y rango entero) y `REVIEW_EVIDENCE_INVALID`; 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 401 `UNAUTHORIZED` (sesión inválida, expirada, revocada o de otra pestaña) e `INVALID_CREDENTIALS` (inicio de sesión, excluido por el cliente común de la reacción de sesión terminada); 404 `NOT_FOUND`; 409 `VERSION_CONFLICT`, `DUPLICATE_NAME`, `CATEGORY_NOT_EMPTY`, `CATALOG_CHANGED`, `OPERATION_CONFLICT` y `OPERATION_CLOSED`; 500 `INTERNAL_ERROR`. No se usa 403 (sin roles).
- **Registro de ventas.** Rechazo definitivo solo con respuesta recibida con envoltorio y `code` en {`VALIDATION_ERROR`, `PAYLOAD_TOO_LARGE`, `REVIEW_EVIDENCE_INVALID`, `OPERATION_CONFLICT`, `OPERATION_CLOSED`}, que corresponde a [US-013 CA-09](../specs/us-013-registrar-venta-pagada.md). Red, timeout, 5xx, 401, respuesta sin envoltorio o código desconocido no son definitivos. El backend solo responde un código definitivo si la identidad no podrá registrarse después: con `operationId` legible la cierra atómicamente; sin él (413, JSON mal formado) el rechazo es determinista. La misma identidad y contenido devuelve el mismo estado y cuerpo. La conciliación por referencia es un POST con resultado discriminado (registrada o no registrada), nunca 404.
- **Cabeceras y límites.** JSON con máximo de 100 KB en todo `/api`; imágenes con transporte y límite propios de su TASK a partir de US-006. `Cache-Control: no-store` y ETag automático de Express desactivado. Idempotencia por `operationId` en el cuerpo, sin cabecera adicional. Concurrencia optimista con un `version` entero en el recurso: en el cuerpo de PATCH y `?version=` en DELETE; falta → 400, obsoleta → 409 `VERSION_CONFLICT`.
- **Autorización.** Toda ruta `/api` salvo las declaradas públicas (inicio de sesión); sin credenciales en URL, también en SSE. Los módulos no gestionan credenciales ni cabeceras: usan el cliente común de `frontend/src/auth/api/`. El mecanismo de pestaña sigue pendiente de validación; si se eligen cookies, la protección CSRF forma parte de esa decisión. Eventos SSE en `kebab-case` con `data` JSON.
- **Paginación.** Solo donde una historia la exija (hoy US-014): cursor por clave opaco que incluye el instante de corte y la última clave; respuesta `{ items, pageSize, cutoffAt, nextCursor, currentDate }`. Lista, resumen y ranking de un mismo refresco comparten el corte; se prefiere una lectura conjunta, que concretan TASK-033, TASK-035 y TASK-036.
- **Código.** Backend: `backend/src/shared/http/` (catálogo único de códigos, `ApiError`, middleware que traduce errores de `express.json`, Zod y no controlados, y 404 de `/api`), creado por la primera TASK que lo use. Frontend: tipos y análisis del envoltorio en `frontend/src/auth/api/` junto al cliente común, copia mantenida por Backend sin paquete compartido; el conjunto de rechazos definitivos en `frontend/src/sales/api/`. Los `contract.provisional.ts` de cada módulo usan este envoltorio.

### Acceso y presencia

- Soporte inicial: Chrome y Edge de escritorio, versiones estables vigentes al validar; registrar versiones efectivamente probadas. HTTPS, sesiones opacas revocables en servidor y contraseñas con hash resistente y salado. Cuenta provisionada fuera de la interfaz.
- Presencia cada 30 segundos, independiente de teclado/ratón. Cada sesión termina a los 120 segundos desde su última señal válida; comprobarlo en autorización y renovación, sin revivir sesiones por señales tardías. Un TTL de limpieza no sustituye la expiración lógica.
- Cerrar manualmente invalida solo la sesión actual. Recargar debe conservarla; duplicar, cerrar y restaurar no deben recuperar autorización. No confiar únicamente en cookies, `sessionStorage` o eventos de salida.
- **Bloqueante antes de integrar acceso:** validar técnicamente la vinculación a pestaña en los navegadores acordados. No se aprueba un mecanismo definitivo ni se afirma su viabilidad comprobada. La validación acotada está prevista, no ejecutada, y necesita una ejecución expresamente autorizada sin ampliar este encargo documental. Si aparecen incompatibilidades, presentar alternativas antes de cambiar [US-001](../specs/us-001-iniciar-sesion.md).
- Concretar todavía contrato de credenciales, provisión externa, protección/almacenamiento de autorización, hash y parámetros, identidad de pestaña y transporte de presencia. No incluir secretos en documentación ni registros.

### Catálogo e imágenes

- Identidades estables e índices únicos sobre claves de comparación aprobadas en [US-006](../specs/us-006-registrar-productos.md) y [US-008](../specs/us-008-administrar-categorias.md).
- Actualizaciones condicionales por identidad y versión, incrementándola al guardar. Edición y activación comparten la versión del producto; las categorías tienen su propio control. Rechazar el guardado obsoleto, sin sobrescribir ni bloquear globalmente productos/categorías distintos o ventas independientes.
- Asignación/reasignación de producto y eliminación de categoría protegidas por transacciones y contador de asociaciones por categoría, incluidos inactivos. Actualizar producto y contadores en la misma transacción; eliminar solo con contador cero y versión válida. Asignar y eliminar deben competir por escritura en esa categoría: consultar primero su existencia o vacío no basta para impedir carreras. No mantener bloqueos durante la edición humana.
- Esto requiere replica set o clúster compatible con transacciones, también en integración local; MongoDB standalone no basta. Un replica set de un nodo no implica alta disponibilidad. El contador es técnico y no equivale a inventario.
- Imágenes en volumen persistente gestionado por backend, identificadores generados y lectura protegida. Validar contenido real, formato, tamaño y dimensiones; no usar nombres originales como rutas ni servir contenido ejecutable. Los límites funcionales pertenecen a US-006. Concretar carga/asociación, reemplazo y limpieza de huérfanos sin perder imágenes vigentes ante fallos.

### Revisión y registro de ventas

- Selección exclusivamente en memoria; navegar entre módulos la conserva, recargar/cerrar la pestaña/cerrar sesión la descarta, conforme a [US-010](../specs/us-010-consultar-seleccionar-productos-venta.md).
- Evidencia de revisión protegida por backend, vinculada a identidad de operación y contenido revisado; el navegador no puede alterar productos, cantidades o importes aceptados. No es un borrador recuperable. Aprobado el 2026-10-19: confirmación en backend con relectura del catálogo y evidencia firmada con HMAC, sin almacenamiento ni caducidad, según US-012. Faltan rutas y DTO.
- La fijación desde la confirmación para cobrar, los ajustes y la ausencia de caducidad automática se definen en [US-012](../specs/us-012-revisar-cambios-catalogo-antes-cobro.md). Registrar no vuelve a imponer precio o activación actuales a esa revisión confirmada.
- Una venta completa en un documento, con identidad de operación única, método, fecha/hora, identidades de producto y snapshots de nombre, precio, cantidades e importes. El catálogo no reescribe los snapshots. Dashboard agrupa por identidad y resuelve nombre actual.
- Crear la identidad de operación antes del primer envío final y reutilizarla en dobles clics/reintentos. Misma identidad y contenido devuelve el mismo resultado; contenido distinto bajo esa identidad se rechaza como conflicto. La atomicidad documental y unicidad protegen venta e ingresos; no basta deshabilitar un botón.
- Confirmación de escritura duradera; timeout o respuesta perdida no equivalen a fracaso. Conservar solo una referencia opaca de la operación enviada para comprobarla tras salida, con autorización de pestaña válida o nueva autenticación si la sesión terminó, sin restaurar selección ni credenciales. Recargar no exige autenticarse si conserva una sesión válida de US-001. La conciliación debe impedir que un envío tardío contradiga un fracaso declarado definitivo; consultar «no existe» no basta. Aprobado el 2026-10-19 en [US-013](../specs/us-013-registrar-venta-pagada.md): referencia UUID v4 en `localStorage` borrada al ver un resultado definitivo y conciliación terminal que cierra atómicamente una identidad inexistente.

### Dashboard y actualización compartida

- Una lectura común obtiene los tres bloques del período desde ventas registradas. Sin contadores materializados iniciales ni escrituras de ventas desde Dashboard.
- SSE comunica invalidación para releer resultados; no incrementos acumulativos. Emitir tras confirmar persistencia y evitar ingresos duplicados por reintentos o avisos repetidos. Un único proceso Express inicial; no se presume coordinación entre réplicas.
- Autorizar apertura/reconexión y terminar streams al revocar o expirar la sesión. El stream abierto no renueva presencia por sí solo. Definir transporte compatible con la autorización por pestaña: `EventSource` nativo no admite cabeceras arbitrarias; no poner credenciales en URL.
- Relectura al reconectar y al cambiar día/mes en Bolivia; conciliación periódica para cubrir avisos perdidos. Faltan frecuencia y condiciones de prueba. Latencia, dimensiones y distinción carga/error/vacío se especifican una sola vez en [US-003](../specs/us-003-consultar-resumen-ventas.md).

### Despliegue y recuperación previstos

- Un proceso Express y frontend bajo el mismo dominio. MongoDB Atlas con una configuración compatible con transacciones para evitar administrar MongoDB inicialmente. Imágenes en volumen persistente del servidor; sin almacenamiento externo adicional inicialmente.
- Respaldar base de datos e imágenes y comprobar una restauración real, con coherencia de sus referencias, antes del uso operativo. Concretar costes, región, capacidad, frecuencia/retención y procedimiento de recuperación.
- La selección arquitectónica de Atlas no autoriza contratación, creación de cuentas/recursos, acceso a datos reales, despliegues ni configuración de infraestructura. Estas ejecuciones requieren aprobación aparte.

### Secuencia y verificaciones futuras

1. Autorizar y ejecutar el bootstrap técnico sin exigir resolver identidad de pestaña o ventas para un esqueleto sin funcionalidades. La autorización y evidencia se recogen en la sección 9.
2. Resolver y validar identidad de pestaña antes de la integración de acceso afectada. Un prototipo requiere autorización aparte y no está incluido en el bootstrap. TASK-001 puede comenzar al resolver su contrato de credenciales, sin exigir toda la solución de pestaña.
3. Acceso/cierre; categorías básicas antes de alta de productos; edición/activación y eliminación protegida cuando existan las asociaciones. No exigir historias completas para iniciar sus consumidores contra contratos aprobados.
4. Selección/cálculos, revisión y registro/conciliación; Dashboard puede construirse contra contratos aprobados y verificarse después con ventas reales aisladas y dos sesiones.
5. Priorizar navegador real para pestañas/suspensión, tiempo controlado para presencia, MongoDB aislado para unicidad/versiones/asignación-eliminación, unitarias de dinero e integración con envíos simultáneos, tardíos y respuestas perdidas. Comprobar snapshots, límites de fecha y métricas entre sesiones. No son pruebas ejecutadas; el principal concreta comandos con el procedimiento documental.

La aprobación de herramientas no configura comandos de aplicación, hooks o CI. La secuencia visual Impeccable → Emil → React Best Practices se aplica cuando se autoricen interfaces React; no se ejecuta en este registro documental.

## 8. Decisiones y validaciones técnicas pendientes

| Antes de | Pendiente real |
| --- | --- |
| Trabajo funcional posterior al bootstrap | La implementación de las 22 TASK está autorizada desde el 2026-10-19 según la [constitución](constitution.md#11-etapa-actual). Siguen pendientes las condiciones específicas de cada tramo de esta tabla, que se aprueban antes de implementarlo. |
| Acceso integrado | Validación de identidad de pestaña y contratos/seguridad descritos en la sección 7; no relajar US-001 silenciosamente. |
| Catálogo e imágenes | DTO/rutas/errores, versión y transacciones concretos, flujo seguro de archivos y unidades exactas de los límites de entrada. Las reglas de estado inicial, campos y formatos ya están decididas en las US. |
| Revisión y registro | Rutas, DTO y códigos de error. Protección y carreras de confirmación, límites técnicos y conciliación terminal y referencias opacas quedaron aprobados el 2026-10-19 en US-011 a US-013. No está pendiente volver a decidir la fijación del total o permitir cambios después del pago. |
| Dashboard | Contrato de lectura/SSE aprobado en [US-003](../specs/us-003-consultar-resumen-ventas.md#contrato-de-lectura-y-actualización). Pendientes: autorización del stream, frecuencia de conciliación y latidos, agrupación de avisos y entorno/condiciones reproducibles para el objetivo de latencia aprobado. |
| Uso operativo | Contratación/configuración de infraestructura, durabilidad, copias y restauración comprobada; no asumir capacidades por elegir un proveedor. |
| Integración/CI | Primera ejecución remota del workflow inicial de la sección 10 y protección de ramas mediante autorización posterior. Ampliar las pruebas conforme exista comportamiento funcional, sin interpretar el humo técnico como criterios de las US. |

Los pendientes funcionales de Historial y reportes permanecen en [producto](product.md#5-decisiones-de-producto-pendientes); no se agregan módulos o tareas por esta aprobación.

## 9. Arranque técnico autorizado

El responsable respondió «ok autorizo» el 2026-10-18 al alcance de bootstrap propuesto con `architect`, tras aclarar que no implementa TASK-001 a TASK-032. La [especificación fundacional](../specs/technical-bootstrap.md) delimita criterios, exclusiones y evidencia. Es una única entrega técnica sin nuevos IDs ni cambios del tracker, amparada por la excepción de la constitución; no habilita funcionalidades, prototipos de pestaña, MongoDB real, infraestructura, CI o commits.

- npm workspaces `@kofi/frontend` y `@kofi/backend`, manifests privados y lockfile raíz. Node 24.19.0/npm 11.17.0, sin modificar instalaciones globales. Dependencias directas exactas y `.npmrc` con engines y lifecycle de terceros deshabilitado.
- TypeScript 6.0.3: el analizador `typescript-eslint` 8.71.2 declara `>=4.8.4 <6.1.0`, por lo que no se adopta TypeScript 7. Versiones concretas de todas las dependencias en manifests/lockfile; se comprobaron engines/peers antes de instalar.
- React 19.3.1 y Vite 8.3.4 con montaje técnico mínimo; Express 5.3.0 con listener en loopback y sin endpoints de negocio. HTTP únicamente local; no despliegue ni garantía de configuración operativa.
- Compilación, tipos, ESLint y Prettier; Vitest con Testing Library/DOM y jsdom para montaje React, y Supertest para humo Express. Los adaptadores, DOM simulado y tipos son soporte de herramientas ya aprobadas. No hay pruebas de requisitos del POS.
- Router, driver MongoDB, Zod y Playwright no se instalan todavía: no se utilizan en este alcance. No se descargan navegadores ni se crea una jerarquía de módulos/capas vacías.
- Desarrollo en dos terminales, sin orquestador adicional. Configuración de puerto de Express validada; ejemplo de entorno sin secretos y archivos locales/builds ignorados. Comandos y puertos en el [README](../../README.md), evidencia una sola vez en la especificación.
- El control rápido existente sigue limitado a sintaxis/JSON/enlaces y advierte por cualquier ruta de aplicación. Los scripts técnicos se ejecutan por separado; no se altera el hook para ocultar su limitación ni se interpreta como pruebas pendientes de las US implementadas, pues no se implementó ninguna.

## 10. CI técnica inicial autorizada

- El responsable respondió «si» el 2026-10-18 a configurar GitHub Actions para la base actual y ajustar documentación, sin commits o push. `.github/workflows/ci.yml` define un único check estable `technical-checks` del workflow `CI`, con PR hacia `develop`, push a `develop` y ejecución manual; sin despliegue, MongoDB, secretos o nuevas pruebas funcionales.
- Runner hospedado `ubuntu-24.04`, acciones checkout/setup-node v7 fijadas por SHA, token limitado a `contents: read`, checkout sin credenciales persistentes, timeout y cancelación de ejecuciones anteriores del mismo evento/PR o rama. Solo se cachea la descarga npm según `package-lock.json`, no `node_modules` ni éxitos locales de tests.
- Node desde `.node-version` y npm exacto desde `packageManager`. Si hace falta, npm se ajusta únicamente en el runner efímero; no se cambia Node/npm global del usuario. `npm ci` ignora lifecycle de terceros. Se ejecutan los comandos existentes de tipos, lint, formato, pruebas disponibles y build para cambios técnicos; las pruebas actuales son exclusivamente humo React/Express.
- `.github/scripts/ci-scope.mjs` selecciona determinísticamente los pasos, sin IA o paquetes. Compara la base del evento con el checkout actual, incluye ambos destinos de renombrados y, ante una base/diff no fiable o primer push, verifica la base completa. La ejecución manual también fuerza comprobaciones completas. Lo desconocido se considera técnico.
- El workflow no tiene filtros de rutas ni jobs omitidos: la comprobación requerida se publica también para documentación. Cambios solo en docs/Markdown externo a aplicación no instalan dependencias ni ejecutan builds; README raíz conserva solo el formato que el comando existente comprueba. Cualquier archivo dentro de frontend/backend, incluso Markdown/fixtures, se considera entrada técnica para no omitir dependencias de pruebas o build por su extensión. Se prueban siempre las reglas del selector con Node del runner; Node de aplicación se prepara únicamente cuando hay comandos npm aplicables. Cambios de `.github/` verifican la base completa.
- La configuración inicial fue local; por autorización posterior «hazlo» se publicó la base y se verificó la primera ejecución completa en GitHub. La evidencia se mantiene en el [CHANGELOG](../progress/CHANGELOG.md#2026-10-19), sin extrapolar su éxito a requisitos funcionales. `develop` es la rama predeterminada que GitHub asignó al primer push del repositorio vacío, por lo que la ejecución manual está disponible allí. La protección se configura por separado, después de comprobar CI, conforme a convenciones; crear un YAML no impide por sí solo hacer push.
- Comandos de uso y comprobaciones en el [README](../../README.md); resultados reales y limitaciones en el CHANGELOG. La CI es independiente de los cuatro controles locales, no amplía su ejecutor ni actualiza estados del tracker.

## 11. Preparación del backend autorizada

El responsable autorizó el 2026-10-19 una única entrega de preparación, sin desarrollar ninguna TASK ni tocar frontend, conforme a la [constitución](constitution.md#11-etapa-actual). Deja el backend listo para que la primera TASK autorizada empiece sin instalar ni configurar infraestructura local.

- Dependencias exactas en `@kofi/backend`: driver oficial `mongodb` 7.7.0 y `zod` 4.6.7, ya elegidos en la sección 7.
- `backend/compose.yaml`: imagen `mongo:8.0.34` como replica set `rs0` de un nodo, publicado solo en `127.0.0.1:27017`, con volumen persistente y healthcheck que lo inicia la primera vez. Resuelve la provisión local de transacciones; no es configuración operativa ni alta disponibilidad, y no sustituye la decisión sobre Atlas.
- `backend/src/shared/config/env.ts` valida `PORT` y `MONGODB_URI` con Zod. `backend/src/shared/database/connect-database.ts` conecta y rechaza un MongoDB que no sea replica set. `server.ts` conecta antes de escuchar y cierra la conexión al terminar; `createApp()` no recibe todavía la base, para no anticipar cómo la consumirán las TASK.
- Pruebas: `npm test` añade las de configuración y sigue sin necesitar MongoDB. `npm run test:integration --workspace @kofi/backend` ejecuta `*.integration.test.ts` contra el replica set local, en una base temporal por ejecución que se elimina al terminar; hoy solo comprueba que una transacción se confirma y que otra se revierte entera.
- Sigue fuera: `backend/src/shared/http/` (lo crea la primera TASK que lo use), rutas, modelos, colecciones e índices de negocio, MongoDB en la CI, la validación de identidad de pestaña y los pendientes de la sección 8.
