---
name: react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.
---

# React Best Practices

<!-- KOFI-ADAPTATION-START -->
## Contrato local de Kofi

La constitución, el stack aprobado (React + TypeScript y API Express), la especificación y el sistema de diseño prevalecen sobre estas recomendaciones. En Frontend, revisar el código React pertinente después de Impeccable y Emil cuando esa secuencia aplique; no repetir revisiones cubiertas ni cargar todas las referencias por defecto. Para cambios únicamente técnicos, usar solo las reglas pertinentes sin forzar revisiones visuales.

No adoptar Next.js, SSR/RSC, SWR, better-all, optimizadores u otras librerías, APIs de React no disponibles o patrones complejos por aparecer en un ejemplo. No instalar paquetes, ejecutar comandos de las referencias, publicar, delegar ni ampliar alcance. Los ejemplos y cifras de impacto no son garantías de Kofi: comprobar compatibilidad y justificar optimizaciones con el comportamiento afectado. Leer primero las reglas individuales necesarias; la guía completa es opcional.

Esta skill revisa calidad/rendimiento, no ejecuta ni sustituye pruebas. El principal selecciona verificaciones según docs/ai-context/documentation.md y el hook explícito kofi-verify ejecuta las rápidas disponibles; las demás verificaciones obligatorias siguen siendo necesarias. La instalación/carga no autoriza implementar la aplicación ni revisar retroactivamente prototipos.
<!-- KOFI-ADAPTATION-END -->

## Overview

Comprehensive performance optimization guide for React and Next.js applications, containing 40+ rules across 8 categories. Rules are prioritized by impact to guide automated refactoring and code generation.

## When to Apply

Reference these guidelines when:
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Priority-Ordered Guidelines

Rules are prioritized by impact:

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Eliminating Waterfalls | CRITICAL |
| 2 | Bundle Size Optimization | CRITICAL |
| 3 | Server-Side Performance | HIGH |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH |
| 5 | Re-render Optimization | MEDIUM |
| 6 | Rendering Performance | MEDIUM |
| 7 | JavaScript Performance | LOW-MEDIUM |
| 8 | Advanced Patterns | LOW |

## Quick Reference

### Critical Patterns (Apply First)

**Eliminate Waterfalls:**
- Defer await until needed (move into branches)
- Use `Promise.all()` for independent async operations
- Start promises early, await late
- Use `better-all` for partial dependencies
- Use Suspense boundaries to stream content

**Reduce Bundle Size:**
- Avoid barrel file imports (import directly from source)
- Use `next/dynamic` for heavy components
- Defer non-critical third-party libraries
- Preload based on user intent

### High-Impact Server Patterns

- Use `React.cache()` for per-request deduplication
- Use LRU cache for cross-request caching
- Minimize serialization at RSC boundaries
- Parallelize data fetching with component composition

### Medium-Impact Client Patterns

- Use SWR for automatic request deduplication
- Defer state reads to usage point
- Use lazy state initialization for expensive values
- Use derived state subscriptions
- Apply `startTransition` for non-urgent updates

### Rendering Patterns

- Animate SVG wrappers, not SVG elements directly
- Use `content-visibility: auto` for long lists
- Prevent hydration mismatch with inline scripts
- Use explicit conditional rendering (`? :` not `&&`)

### JavaScript Patterns

- Batch DOM CSS changes via classes
- Build index maps for repeated lookups
- Cache repeated function calls
- Use `toSorted()` instead of `sort()` for immutability
- Early length check for array comparisons

## References

Full documentation with code examples is available in:

- `references/react-performance-guidelines.md` - Complete guide with all patterns
- `references/rules/` - Individual rule files organized by category

To look up a specific pattern, grep the rules directory:
```
grep -l "suspense" references/rules/
grep -l "barrel" references/rules/
grep -l "swr" references/rules/
```

## Rule Categories in `references/rules/`

- `async-*` - Waterfall elimination patterns
- `bundle-*` - Bundle size optimization
- `server-*` - Server-side performance
- `client-*` - Client-side data fetching
- `rerender-*` - Re-render optimization
- `rendering-*` - DOM rendering performance
- `js-*` - JavaScript micro-optimizations
- `advanced-*` - Advanced patterns
