# Experimento de identidad de pestaña — TASK-005

Evidencia técnica de US-001, no estado paralelo del tracker ni aprobación de un mecanismo definitivo.

## Alcance y referencia

Autorización: solicitud explícita del responsable de implementar Acceso por TASK, empezando por una prueba acotada de pestañas, sin push ni integración automática. Rama `feat/task-005-tab-authorization`, base `af11071fe594d95f3e4928a6758082704d8ece6b`, obtenida con fetch correcto. No se usa el `develop` local atrasado como base.

El subagente Backend creó `frontend/src/auth/api/tab-identity.experiment.mjs`; el principal revisó y ejecutó el runner. No se importa en la aplicación ni utiliza cuentas, tokens, sesiones o bases de datos reales. Usa Node 24, HTTP loopback, CDP y un perfil temporal exclusivo por proceso. No instala Playwright, no modifica perfiles del usuario y cierra únicamente sus propios navegadores. La política CSP con script inline pertenece exclusivamente a esta página experimental, no a la aplicación.

## Procedimiento reproducible

Desde la raíz, con los ejecutables instalados:

```powershell
node --check frontend/src/auth/api/tab-identity.experiment.mjs
node frontend/src/auth/api/tab-identity.experiment.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe"
node frontend/src/auth/api/tab-identity.experiment.mjs "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

El runner genera un JSON con versión efectiva, observaciones, casos no observados y limpieza. Los identificadores son marcadores sintéticos, no secretos.

## Resultados observados

Ejecución del 2026-10-20 entre 00:28:35Z y 00:28:42Z (2026-10-19 en Bolivia), Windows, `headless=new`:

| Navegador real instalado | Resultado                                                               |
| ------------------------ | ----------------------------------------------------------------------- |
| Chrome 155.0.8059.80     | 10 comprobaciones correctas; salida 0; perfil temporal propio eliminado |
| Edge 155.0.4283.62       | 10 comprobaciones correctas; salida 0; perfil temporal propio eliminado |

Comprobaciones en ambos navegadores:

1. Una página inicial no contiene el marcador almacenado.
2. La recarga normal pierde la memoria JavaScript, conserva `sessionStorage` y declara navegación `reload`.
3. Recargar ignorando caché tiene el mismo comportamiento observado.
4. Un contexto independiente creado con CDP no hereda el almacenamiento ni tiene `opener`.
5. Una página abierta con `window.open` copia inicialmente `sessionStorage` de la original, pero no su memoria JavaScript.
6. Modificar después la copia de almacenamiento no modifica la original.
7. Un Web Lock exclusivo impide que otro contexto del mismo origen adquiera el mismo lock mientras está retenido.
8. Tras liberarlo, otro contexto puede adquirirlo: la posesión no demuestra continuidad de identidad.
9. BroadcastChannel comunica un marcador público entre contextos independientes del mismo origen.
10. Dos estados sintéticos diferentes coexisten en el mismo perfil. Esto no demuestra dos sesiones autenticadas.

La comprobación de sintaxis Node también terminó con salida 0.

Verificaciones adicionales del principal sobre el runner y documentación: typecheck y build frontend correctos; 71 tests frontend correctos en ocho archivos; lint raíz correcto; Prettier específico de los cuatro archivos de esta entrega correcto. `npm run format:check` global terminó con salida 1 y señaló 81 archivos anteriores no modificados por esta entrega. Se comprobó en `package.json` que el blob de `origin/develop` cumple Prettier, la copia local usa CRLF y ambos contenidos son idénticos al ignorar CR. No se reformateó masivamente el repositorio ni se cambió la configuración de Git/formato.

`kofi-start` terminó correctamente. `kofi-verify` comprobó alcance, sintaxis de un archivo y 103 destinos locales, pero terminó con salida 1 y `PENDIENTE aplicación`/comprobaciones externas: su limitación conocida no reconoce los comandos ejecutados por el principal. La evidencia anterior cubre las verificaciones de esta entrega experimental, no los casos de identidad pendientes ni la DoD funcional. No se modificaron los controles ni se omiten hooks para generar el commit técnico.

## Casos no acreditados

- Duplicación mediante la acción nativa del navegador: ni `window.open` ni `Target.createTarget` la representan.
- Duplicación o transferencia durante congelación/descarte de la original.
- Cierre y reapertura, restauración de ventana o reinicio/restauración del navegador antes de 120 segundos.
- Entrada y retorno BFCache con continuidad exclusiva de autorización.
- Sesiones autenticadas independientes, presencia cada 30 segundos y expiración de servidor a los 120 segundos.
- Compatibilidad de un mecanismo final con imágenes y SSE.

El runner utiliza navegadores reales, pero la automatización headless de estas primitivas no acredita los recorridos nativos anteriores. No se sustituyen por mocks ni se les atribuye éxito.

## Conclusión y seguimiento

No se selecciona un mecanismo definitivo. Memoria sola rompe la recarga; `sessionStorage` solo admite herencia; locks y canales coordinan contextos, pero no prueban identidad. No se implementa ni conecta el candidato Bearer + `X-Tab-Authorization` como autorización productiva.

TASK-005 no satisface todavía CA-04, CA-05, CA-07 y CA-09 de forma integrada y no se declara completada. Para continuar se necesita evaluar un protocolo candidato completo y aportar evidencia de los escenarios pendientes en Chrome y Edge, en especial restauración antes de 120 segundos y carreras de recarga/duplicación. Si no puede satisfacer todos los criterios, se debe presentar el límite al responsable sin cambiarlos unilateralmente.

El trabajo independiente de credenciales de TASK-001 puede avanzar en su propia rama. TASK-002 y las tareas consumidoras no pueden incorporar ese código hasta que exista la integración autorizada de sus dependencias en `origin/develop`.
