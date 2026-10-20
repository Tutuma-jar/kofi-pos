# Implementación independiente de credenciales — TASK-001

Registro técnico de US-001. No sustituye el tracker ni acredita la integración de Acceso.

## Autorización y base

El responsable aprobó implementar Acceso por TASK, verificar primero las alternativas de pestaña y desarrollar después las tareas desbloqueadas, sin push ni integrar ramas automáticamente. La parte independiente de TASK-001 verifica credenciales; la emisión corresponde a TASK-002.

Rama `feat/task-001-auth-credentials`, creada desde `origin/develop` obtenido mediante fetch exitoso: `af11071fe594d95f3e4928a6758082704d8ece6b`. No incorpora código de la rama experimental de TASK-005. El principal coordina Git, documentación y ejecución porque el perfil Backend no dispone de shell efectiva; no se modificaron sus permisos.

## Archivos y contrato interno

Backend implementó en `backend/src/auth/`:

- `account.model.ts`: representación de la cuenta y acceso a `accounts`; preparación explícita del índice único.
- `auth.schemas.ts`: objeto Zod estricto con usuario y contraseña.
- `password.ts`: hash/versionado, verificación asíncrona y capacidad acotada.
- `auth.service.ts`: lectura, verificación y limitación de intentos.
- `password.test.ts`, `auth.schemas.test.ts`, `auth.service.test.ts` y `account.integration.test.ts`.

`createAuthService(db).verifyCredentials(input, trustedIp)` devuelve exclusivamente:

```text
{ status: 'credentials-verified', accountId }
{ status: 'incorrect' }
{ status: 'rate-limited', retryAfterSeconds }
```

El primer resultado NO constituye autorización ni sesión. El consumidor futuro debe validar el DTO HTTP completo, separar credenciales del material de pestaña y emitir la sesión mediante TASK-002. El esquema interno rechaza `tabBinding` y cualquier otra propiedad adicional deliberadamente: no es el DTO público `CreateSessionRequest`.

No hay endpoints nuevos, rutas de aceptación parcial, cambios de `createApp`, sesiones, middleware de autorización ni conexión al frontend. No se crea `shared/http/` sin un uso HTTP concreto. Los contratos públicos aprobados permanecen intactos y todavía no están disponibles.

## Contraseña y provisión externa

Formato canónico exacto:

```text
kofi-scrypt$v1$131072$8$1$<saltHex32>$<digestHex128>
```

- `crypto.scrypt` asíncrono de Node, nunca `scryptSync`.
- N = 131072 (2^17), r = 8, p = 1.
- Sal aleatoria individual de 16 bytes; resultado de 64 bytes.
- Memoria principal aproximada del algoritmo: 128 MiB por derivación; `maxmem` explícito de 256 MiB para permitir sus sobrecostes.
- Comparación mediante `timingSafeEqual`.
- Parser acotado, versión y parámetros fijos: un documento externo no puede solicitar parámetros arbitrarios.
- Usuario inexistente o hash malformado: verificación ficticia con el mismo algoritmo y coste, sin aceptación ni mensaje diferente.
- Una derivación simultánea y hasta cuatro pendientes en la instancia compartida del proceso; saturación devuelve semántica de limitación temporal. Las factorías adicionales se destinan a pruebas aisladas, no a crear una por petición.

La cuenta se provisiona fuera de Kofi con `_id`, `username`, `passwordHash`, `createdAt` y `updatedAt`. El proceso externo autorizado debe producir el formato anterior, compatible con `hashPassword`; no recibe secretos por URL, argumentos de shell o fuentes versionadas. No se añadió comando de alta ni endpoint, ni se generó una cuenta real.

Usuario y contraseña se comparan exactamente, sin trim, plegado de mayúsculas o normalización Unicode. Límites técnicos: usuario de 1 a 128 unidades UTF-16 y contraseña de 1 a 1024; espacios y formas Unicode distintas son significativos. La provisión externa debe respetar estas reglas. No son reglas de registro público.

## Persistencia y protección frente a abuso

La autenticación solo ejecuta `findOne` sobre `accounts`, con collation `simple` explícita, incluso si la colección externa tiene otra collation predeterminada. Los errores MongoDB se propagan como fallos técnicos: no se disfrazan de contraseña incorrecta.

`ensureAccountIndexes(db)` crea el índice `accounts_username_unique`, único y con collation `simple`. Su ejecución es explícita: ni construir el servicio ni verificar credenciales crea índices o escribe cuentas. En esta entrega solo se ejecutará en la base aislada de pruebas, no en una base existente del usuario.

La limitación predeterminada admite cinco intentos por IP en una ventana fija de 60 segundos. Los rechazos no extienden la ventana; se limpia al comprobar y conserva como máximo 1024 entradas. No hay bloqueo global de la cuenta. Si el mapa está lleno no se expulsan entradas vigentes para permitir eludir límites; nuevas IP reciben una espera finita hasta la primera expiración. La cola scrypt saturada indica reintento a un segundo. La política es local al proceso, no distribuida.

La IP debe proceder del servidor (`req.ip` y configuración de proxy confiable), nunca del cuerpo o de una cabecera aceptada directamente. La futura ruta traducirá el resultado a 429 y su tiempo de reintento. No se introdujo 503, JWT, CAPTCHA, Redis ni roles. El código no registra contraseñas, hashes, tokens o cuerpos de login.

## Verificaciones ejecutadas

Ejecutadas por el principal sobre el código formateado:

- `npm run typecheck --workspace @kofi/backend`: correcto.
- `npm run test --workspace @kofi/backend`: cinco archivos y 30 pruebas correctas, incluidas las nuevas de credenciales.
- `npm run build --workspace @kofi/backend`: correcto.
- `npm run lint`: correcto.
- Prettier específico de `backend/src/auth/*.ts`: correcto.

Las pruebas incluyen scrypt real, sales distintas, formato de provisión generado independientemente, contraseñas erróneas, versiones/parámetros inválidos, Unicode/espacios, cola acotada, esquema estricto, usuario inexistente, errores MongoDB propagados y ventanas de intentos independientes y finitas. Las unitarias del servicio usan un doble de lectura; no prueban por sí solas MongoDB real ni HTTP.

Integración real: `npm run test:integration --workspace @kofi/backend` terminó correctamente, dos archivos y cuatro pruebas. Las dos pruebas nuevas verifican lectura exacta de la cuenta externa sin modificarla, rechazo uniforme y unicidad del índice con distinción de mayúsculas; las otras dos conservan el humo de commit/rollback del bootstrap.

El motor Docker no estaba disponible en la primera comprobación; después estuvo disponible y se detectó que el puerto 27017 pertenecía a `proyecto1-mongo`, ajeno a Kofi. No se conectaron las pruebas a esa instancia ni se detuvo/modificó. Se reutilizó `backend/compose.yaml` con proyecto exclusivo `kofi-access-tests-20261019` y override temporal externo al repositorio para publicar solamente `127.0.0.1:27018`. Misma imagen aprobada `mongo:8.0.34`, replica set `rs0`, sin cambios del Compose versionado. El primer arranque agotó su límite mientras descargaba la imagen; el segundo arrancó y confirmó salud.

El proceso de pruebas recibió exclusivamente esta URI local sin credenciales:

```text
mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true
```

`directConnection=true` mantiene la conexión en el puerto aislado aunque el miembro único se anuncie internamente en 27017. Cada archivo creó y eliminó su propia base con UUID; el test nuevo verifica el nombre exacto antes de limpiar. Al terminar se ejecutó `down --volumes` únicamente para el proyecto temporal propio y se eliminaron su contenedor, volumen y red. No se borraron bases ni recursos ajenos. No se añadió infraestructura persistente de aplicación.

La comprobación global de formato ya ejecutada en la etapa experimental señaló archivos previos con CRLF; los archivos nuevos de esta entrega pasan Prettier. No se alteran masivamente archivos anteriores ni configuración de Git para ocultar ese resultado.

`kofi-start` terminó correctamente tras expresar sin un marcador de plantilla ambiguo la selección de pruebas local. `kofi-verify` comprobó requisitos, alcance y 103 destinos locales, pero terminó con salida 1 y `PENDIENTE aplicación`/verificaciones externas por la limitación conocida del ejecutor. No comprueba sintaxis TypeScript (cero comprobaciones de sintaxis); los comandos TypeScript/Vitest anteriores aportan esa evidencia por separado. No se cambió el control ni se omite el control documental. Esto permite conservar un commit técnico del tramo independiente, no cerrar TASK-001 ni su integración pendiente.

## Dependencias y límites de aceptación

No se acreditan CA-01 ni CA-02 de manera integrada: faltan emisión, formulario real, destino Dashboard y rechazo visible. La implementación definitiva de pestaña permanece sin validación completa en su propia rama; no se cambian los criterios de US-001.

TASK-002 no puede consumir esta base hasta una integración expresamente autorizada en `origin/develop`. TASK-003 requiere TASK-002; la integración final de TASK-005 requiere las anteriores y un mecanismo validado; TASK-006 requiere 002, 003 y 005. No se mezclan esas tareas en esta rama ni se hacen merge, rebase, copias entre ramas o push para desbloquearlas.

Frontend conserva la simulación. Los textos de demostración, selector de escenarios y cualquier mensaje visual adicional corresponden a Frontend y no se han modificado. Ninguna TASK se declara completada por este tramo técnico.
