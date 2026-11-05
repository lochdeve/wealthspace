# Estándares de codificación

Aplican a todo el monorepo salvo donde una app documente una excepción explícita.

## TypeScript

- Modo **strict** habilitado; evitar `any` (usar `unknown` y narrowing).
- Preferir `const`; mutaciones localizadas y justificadas.
- Tipos explícitos en APIs públicas (módulos exportados, handlers, props de componentes compartidos).
- Usar `async/await`; errores propagados o mapeados, nunca tragados.

## Naming

- **Archivos:** kebab-case (`space-membership.service.ts`).
- **Clases/Interfaces/Types:** PascalCase.
- **Funciones/variables:** camelCase.
- **Constantes de configuración:** UPPER_SNAKE_CASE.
- Sufijos NestJS: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Tests: `*.spec.ts` (backend), `*.test.tsx` (frontend).

## Estructura de carpetas

- `apps/web/src/` — App Router, componentes, lib, hooks.
- `apps/api/src/` — módulos Nest por dominio.
- Lógica de dominio en servicios; controladores/rutas delgados.
- No mezclar código de web y api en carpetas compartidas sin pasar por `packages/*`.

## Separación de responsabilidades

- **Backend:** reglas de negocio, autorización, persistencia, cálculos financieros.
- **Frontend:** presentación, validación UX, orquestación de llamadas API.
- **Contracts (futuro):** tipos compartidos sin lógica.

## Manejo de errores

- Backend: excepciones HTTP Nest con códigos estables (`code` en payload).
- Frontend: estados de error y vacío explícitos; no asumir éxito silencioso.

## Comentarios y documentación

- Código autodocumentado primero.
- Comentarios para invariantes de negocio no obvios y trampas de redondeo monetario.
- Documentar decisiones grandes en `docs/decisions/` (ADR).

## Dependencias

- Añadir dependencias en el `package.json` de la app que las usa.
- Raíz: solo herramientas transversales (Prettier, concurrently, etc.).
- Revisar licencias y peso; no añadir librerías por una función trivial.

## Calidad

- ESLint + Prettier; CI debe fallar en lint/typecheck.
- PRs pequeños y revisables.

## Documentación relacionada

- [Estrategia de pruebas](./testing-strategy.md)
- [Git workflow](./git-workflow.md)
