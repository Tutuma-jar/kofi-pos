# Agentes de Kofi — contexto manual

Desde el 2026-10-22, el usuario proporciona el contexto de cada encargo en la conversación. Los perfiles describen especialidades y heredan las herramientas y permisos del cliente. La configuración del proyecto no añade reglas de permisos.

Los controles `/kofi-start`, `/kofi-verify` y Git pre-commit se retiraron. El antiguo punto de entrada `scripts/kofi-check.mjs` solo informa de su retirada para que las referencias históricas no ejecuten controles.

Las skills siguen disponibles sin las adaptaciones restrictivas de Kofi. Las referencias de `docs/` son opcionales. La CI del archivo local solo admite ejecución manual.
