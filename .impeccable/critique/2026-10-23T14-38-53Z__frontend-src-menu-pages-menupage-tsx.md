---
target: pantalla de administración de menú
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Nat\\kofi-pos\\frontend\\src\\menu\\pages\\MenuPage.tsx"
target_fingerprint: "sha256:83f87793a7e67aa88effc033b0fc1534e84eca76669999ccfa677e848aa2f339"
target_path: "C:\\Users\\Nat\\kofi-pos\\frontend\\src\\menu\\pages\\MenuPage.tsx"
timestamp: 2026-10-23T14-38-53Z
slug: frontend-src-menu-pages-menupage-tsx
---
Método: dos evaluaciones independientes (A: /root/design_review · B: /root/technical_evidence).

# Crítica de Administración de Menú

La base es clara y contenida; las prioridades son proteger la edición, recuperar búsquedas y adaptar el listado. Evaluación del código actual, sin inspección visual: no hay navegadores disponibles en la herramienta. No se modificó la aplicación.

## Salud de diseño: 24/40 provisional

| # | Heurística | /4 | Observación |
|---|---|---:|---|
| 1 | Visibilidad del estado | 3 | Carga y guardado comunicados; faltan recuentos. |
| 2 | Lenguaje familiar | 3 | Tareas claras; efecto de Inactivo poco explicado. |
| 3 | Control y libertad | 2 | Cancelar protegido; conflicto pierde borrador. |
| 4 | Consistencia | 3 | Controles compartidos; reintento genérico. |
| 5 | Prevención de errores | 2 | Validación presente; conflicto descarta cambios. |
| 6 | Reconocimiento | 3 | Acciones explícitas; fotos de referencia ambiguas. |
| 7 | Eficiencia | 1 | Búsqueda y filtros; cambios individuales. |
| 8 | Estética y minimalismo | 3 | Jerarquía contenida; tabla móvil y descripciones densas. |
| 9 | Recuperación de errores | 2 | Errores vinculados; reintentos y conflictos incompletos. |
| 10 | Ayuda contextual | 2 | Reglas de imagen; faltan indicaciones operativas. |
| | Total | 24/40 | Aceptable; mejoras significativas. |

## Especificidad y fortalezas

Fraunces, superficies cálidas y azul pizarra forman una identidad sobria. En modo Operate, la arquitectura convencional de filtros, tabla y diálogo es apropiada. La especialización debe ayudar a mantener precios y disponibilidad con certeza.

- Agregar producto es el CTA principal; categorías es secundario y los filtros están etiquetados.
- Tabla semántica, acciones con nombre del producto, diálogo nativo, foco visible y controles con 44px de altura mínima.
- Cancelar protege cambios y el paso a categorías conserva borrador. Guardado y lectura de imágenes bloquean acciones incompatibles.

## Prioridades

1. **P1 — El conflicto descarta la edición que pide reaplicar.** ProductForm.tsx:95 obtiene versión actual y limpia dirty; MenuPage.tsx:260 borra draft y sustituye producto. La key por versión remonta el formulario. Conservar borrador local y versión remota; ofrecer comparación o recuperación antes de descartar.
2. **P1 si móvil es parte del uso — La tabla se comprime sin reorganizarse.** Menu.module.css:45 mantiene cinco columnas fijas; a 650px baja texto a 13px y botones a 12px. No hay alternativa móvil ni wrapper de desplazamiento. Riesgo por CSS, no overflow observado. Usar lista móvil agrupada o tabla de ancho útil con desplazamiento accesible.
3. **P2 — Filtros sin salida directa.** CatalogFilters.tsx no ofrece limpiar ni recuento; MenuPage.tsx:199 solo anuncia ausencia de coincidencias. Mostrar X de Y productos y Limpiar filtros en el vacío.
4. **P2 — Reintentar no repite la acción fallida.** MenuPage.tsx:178 ejecuta load para errores de abrir o cambiar estado. Separar errores de consulta y operación, con reintentos específicos en su contexto.
5. **P2 — Las referencias parecen imágenes propias.** ProductThumbnail.tsx:21 usa foto configurada o inferida por nombre; alt y title distinguen la referencia, pero no hay etiqueta visible persistente. Señalar Referencia/Sin imagen propia para no falsear el estado del catálogo.

## Carga cognitiva y recorrido emocional

Carga moderada: tres filtros agrupados y dos acciones por fila no constituyen un muro de opciones. Fallan memoria de trabajo en conflictos y revelado progresivo de descripciones extensas. La entrada y edición están protegidas; el valle emocional aparece cuando una excepción elimina el trabajo local. Cambiar disponibilidad también puede retirar la fila del filtro actual; un aviso contextual con Deshacer ayudaría.

## Personas

- Usuario frecuente: los cambios de precio individuales pueden ser lentos con catálogos grandes; no se conoce el volumen real para exigir lote.
- Usuario de teclado/zoom: buena semántica; falta comprobar zoom 200%, tabla estrecha y foco al desaparecer filas.
- Usuario nuevo: puede confundir fotos de referencia con imágenes cargadas y esperar que Reintentar repita su operación.

## Observaciones menores

Descripciones completas generan alturas variables; aviso de éxito persiste; precio admite un decimal sin ejemplo previo; el vacío sin categorías combina instrucciones con un CTA deshabilitado.

## Detector

detect --json frontend/src/menu ejecutado, exit 0. Tres warnings overused-font (categoría slop): Menu.module.css:151, CategoriesPage.module.css:18 y MenuPage.module.css:13, todos por Fraunces. Detección literal correcta, pero su popularidad no demuestra mala usabilidad: no se recomienda sustituir la fuente por esta señal aislada. El detector no valida los flujos de recuperación.

## Preguntas

1. ¿Priorizar recuperación de cambios, listado móvil o claridad de filtros e imágenes?
2. ¿Se administra principalmente desde escritorio, teléfono o ambos?
