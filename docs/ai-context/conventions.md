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

## 4. Commits

Utilizar Conventional Commits: `<tipo>(<scope-opcional>): <resumen>`. Escribir resúmenes claros; para mantener consistencia con los ejemplos, usar inglés en los mensajes de commit.

```text
feat(orders): add order creation
fix(menu): correct product validation
docs: update architecture
test(orders): add order tests
```

Cuando exista una tarea, relacionarla en el cuerpo, por ejemplo `Refs: TASK-001 (US-001)`. No inventar IDs para cambios administrativos o triviales sin historia.

Antes de solicitar autorización para un commit, revisar el diff y los archivos preparados. Evitar secretos, archivos temporales, artefactos generados y modificaciones ajenas al objetivo. No hacer commits ni pushes automáticamente.

## 5. Pull Requests

Usar un título claro, un conjunto coherente de cambios y la plantilla de [documentation.md](documentation.md#5-plantilla-de-pull-request). Relacionar historias, tareas y verificaciones reales. No crear por ahora una plantilla de GitHub ni automatizaciones.
