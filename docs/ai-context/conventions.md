# Kofi — Convenciones de desarrollo

## 1. Idioma y nombres

Documentación en español e identificadores de código en inglés. Usar nombres descriptivos, sin abreviaturas ambiguas ni mezclas arbitrarias de estilos. Los ejemplos siguientes son ilustrativos: no representan funcionalidades o herramientas implementadas.

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Carpetas y archivos generales | `kebab-case` | `order-summary/`, `calculate-total.ts` |
| Componentes React y sus archivos | `PascalCase` | `OrderSummary`, `OrderSummary.tsx` |
| Hooks React y sus archivos | `camelCase` con prefijo `use` | `useOrderTotal.ts` |
| Variables y funciones | `camelCase` | `orderTotal`, `calculateSubtotal` |
| Tipos e interfaces TypeScript | `PascalCase`, sin prefijo `I` obligatorio | `Order`, `CreateOrderInput` |
| Constantes fijas compartidas | `UPPER_SNAKE_CASE` | `SUPPORTED_PAYMENT_METHODS` |
| Controladores | módulo + `.controller` | `orders.controller.js` |
| Servicios | módulo + `.service` | `orders.service.js` |
| Archivos de rutas | módulo + `.routes` | `orders.routes.js` |
| Modelos y sus archivos | tipo singular `PascalCase`; archivo `kebab-case` + `.model` | `Order`, `order.model.js` |
| Colecciones MongoDB | plural y minúsculas | `orders`, `products` |
| Markdown | `kebab-case` | `design-system.md` |

- `AGENTS.md`, `CHANGELOG.md`, `SKILL.md` y los puentes `PRODUCT.md` y `DESIGN.md` son excepciones convencionales de Markdown. Conservar nombres y organización de archivos externos de Impeccable para no romper sus referencias.
- Usar `.ts` en backend conforme a la [base técnica aprobada](architecture.md#7-base-técnica-mínima-aprobada); los ejemplos `.js` anteriores son ilustrativos, no una elección de JavaScript.
- En React, usar `.tsx` cuando el archivo contenga JSX y `.ts` cuando no lo contenga.
- Las variables que no representan constantes fijas conservan `camelCase`, aunque se declaren con `const`.
- En nombres compuestos de colecciones, conservar plural y minúsculas, sin añadir convenciones de esquema no necesarias.
- Los segmentos de rutas HTTP usarán sustantivos en plural y `kebab-case`, como `/orders`; esto no aprueba endpoints ni contratos concretos.

## 2. Identificadores y especificaciones

- Historias: `US-001`, `US-002`, etc.
- Tareas técnicas: `TASK-001`, `TASK-002`, etc., con secuencia global, no reiniciada por historia.
- Cada tarea de implementación identifica su historia relacionada; los números de tarea e historia no tienen que coincidir.
- Asignar identificadores únicos al registrar trabajo aprobado. No reutilizarlos ni renumerar trabajo existente; ampliar los dígitos si se supera 999.
- Especificaciones: `us-001-titulo-breve.md`, con el ID en mayúsculas dentro del documento.
- Conservar identificadores y enlaces al cambiar un título. La forma de documentarlos está en [documentation.md](documentation.md).

Excepción puntual autorizada por el responsable el 2026-10-18: tras retirar la historia de consulta y selección para vender, las cuatro historias de Administración del menú se renumeran consecutivamente como US-006 a US-009, incluidos archivos y referencias. La correspondencia anterior/nueva se conserva en el [CHANGELOG](../progress/CHANGELOG.md); el antecedente retirado se distingue por su título e identificador original. Esta autorización no permite otras renumeraciones automáticas.

## 3. Ramas Git

Las ramas de trabajo siguen `<tipo>/<id-opcional>-<descripcion-kebab-case>`:

- `feat/task-001-create-order`
- `fix/task-002-product-validation`
- `docs/update-architecture`
- `test/task-003-order-totals`

Usar `feat`, `fix`, `docs`, `test`, `refactor` o `chore` según el objetivo. Incluir la tarea cuando exista y evitar mezclar trabajo no relacionado.

Se conserva la rama existente `develop`. Esta convención no crea ramas ni decide por sí sola una estrategia de releases, una rama principal o reglas de protección.

Por autorización posterior del responsable («hazlo» al publicar la base y CI), la política de integración de `develop` exige el check `technical-checks` del workflow `CI`, emitido por GitHub Actions, y la rama actualizada antes de integrar, también para administradores. El trabajo nuevo se prepara en ramas como las anteriores y se integra mediante PR; no se exige un revisor humano adicional en esta configuración inicial. Las reglas reales se configuran y verifican en GitHub, sin sobrescribir protecciones previas; esta política no define releases ni crea otra rama principal.

### Ciclo Git de Frontend y Backend

La solicitud del responsable autoriza este flujo para futuros encargos de implementación aprobados, no para iniciar funcionalidades o publicar esta configuración. Cada TASK tiene su rama; Frontend y Backend no tienen ramas permanentes por perfil. El principal entrega TASK/US, rutas autorizadas, dependencias/contrato y selección de verificaciones; una instrucción del usuario de no hacer commit prevalece.

1. **Comprobar aislamiento.** Revisar rama, árbol e índice antes de empezar. Si hay cambios pendientes, otra tarea usa la misma carpeta o el índice contiene trabajo ajeno, detenerse y coordinar sin descartar, stashear o arrastrar cambios. Para paralelismo, cada tarea necesita un clon/worktree asignado por el principal; varias ramas no permiten varios checkouts simultáneos en una carpeta.
2. **Actualizar origin antes de crear.** Ejecutar `git fetch origin` y exigir éxito. Comprobar `git rev-parse --verify origin/develop`; si falta el remoto/ref o falla la autenticación, informar, sin usar `develop` local como alternativa ni cambiar el remoto. Conservar el SHA obtenido como base de la tarea.
3. **Crear desde la ref remota actualizada.** Usar `git switch --no-track --create <tipo>/task-NNN-descripcion origin/develop`. El tipo y TASK deben corresponder al encargo real; no inventar IDs. Comparar `git rev-parse HEAD` con el SHA recién obtenido de `origin/develop`, antes de implementar. `--no-track` evita configurar por error el upstream de una rama de tarea como `origin/develop`. No se hace pull, reset o rebase para preparar esta base.
4. **Reanudar sin sobrescribir.** Si existe la rama de esa TASK, confirmar su identidad, ubicación y cambios con el principal antes de reutilizarla. No recrearla con fuerza ni reiniciar su historial a la ref remota. Actualizar origin no autoriza integrar nuevos commits en una tarea ya iniciada: cualquier merge/rebase requiere coordinación y autorización separadas.
5. **Verificar y revisar.** Ejecutar la selección mínima aplicable y coordinar con el principal los comandos no permitidos o la documentación necesaria fuera del módulo. La advertencia fija `PENDIENTE aplicación` del hook no se ignora: el principal evalúa la evidencia externa. Fallos o verificaciones obligatorias sin evidencia impiden el cierre local. Revisar diff e índice, secretos y archivos temporales; no repetir éxitos válidos.
6. **Commit acotado.** Preparar archivos explícitos de la TASK dentro del módulo, no `git add .`, `git add -A`, globs o `git commit -a/--all`. Si hay cambios ajenos preparados, no incluirlos ni retirarlos unilateralmente: detenerse. El principal coordina la documentación del mismo alcance antes del commit si el pre-commit la requiere. Generar un commit ordinario Conventional Commits con referencias TASK/US, sin --amend, --no-verify ni opciones para anular hooks. Entregar rama, SHA base, SHA del commit y verificaciones/pendientes; no marcar DoD o tracker por cuenta propia.

El permiso de tarea incluye este ciclo local, no push ni integración. Los comandos mutantes requieren confirmación nativa `ask` en OpenCode; no se conceden permisos generales de Git ni se eluden confirmaciones. El principal conserva la coordinación y el responsable autoriza publicación/integración por separado. No hacer commits de tarea en `develop`.

## 4. Commits

Utilizar Conventional Commits: `<tipo>(<scope-opcional>): <resumen>`. Escribir resúmenes claros; para mantener consistencia con los ejemplos, usar inglés en los mensajes de commit.

```text
feat(orders): add order creation
fix(menu): correct product validation
docs: update architecture
test(orders): add order tests
```

Cuando exista una tarea, relacionarla en el cuerpo, por ejemplo `Refs: TASK-001 (US-001)`. No inventar IDs para cambios administrativos o triviales sin historia.

Antes de un commit, revisar el diff y los archivos preparados. Evitar secretos, archivos temporales, artefactos generados y modificaciones ajenas al objetivo. La autorización de un encargo Frontend/Backend puede incluir el commit local según el ciclo anterior; fuera de ese caso se requiere autorización explícita adicional. No hacer pushes ni integrar automáticamente por haber creado un commit.

## 5. Pull Requests

Usar un título claro, un conjunto coherente de cambios y la plantilla de [documentation.md](documentation.md#5-plantilla-de-pull-request). Relacionar historias, tareas y verificaciones reales. No crear por ahora una plantilla de GitHub ni automatizaciones.
