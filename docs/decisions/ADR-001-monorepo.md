# ADR-001: Monorepo con pnpm Workspaces

**Estado:** Aceptado  
**Fecha:** 2026-11-03 (actualizado: gestor pnpm)

## Contexto

Wealthspace consta de un frontend Next.js y un backend NestJS que compartirán evolución de producto y, más adelante, tipos de contrato API. Se necesita un repositorio único con instalación y scripts coherentes, sin añadir aún orquestadores pesados (Turborepo, Nx).

## Decisión

Adoptar un **monorepo** gestionado con **pnpm Workspaces** (`pnpm-workspace.yaml`, lockfile `pnpm-lock.yaml`, campo `packageManager` en la raíz):

- `apps/web` — aplicación Next.js.
- `apps/api` — aplicación NestJS.
- `packages/contracts` — contratos compartidos ligeros.

Scripts en la raíz: `pnpm dev`, `build`, `test`, `lint`, `typecheck`. Docker Compose en raíz para PostgreSQL de desarrollo.

**No** se utiliza npm ni `package-lock.json` en este repositorio.

## Consecuencias positivas

- Instalaciones deterministas y eficientes en disco (`pnpm`).
- Un solo clon y un flujo de PR para cambios full-stack.
- Punto de entrada claro para CI (`pnpm install --frozen-lockfile`).

## Consecuencias negativas

- Contribuidores deben usar pnpm 12.x y Node 24 LTS (ver `docs/development/toolchain-versions.md`).
- Sin cache de build compartido (Turborepo) las CI pueden ser más lentas al escalar.
- Disciplina requerida para no acoplar imports incorrectos entre apps (solo vía `packages/*` o API HTTP).

## Alternativas consideradas

| Alternativa            | Motivo de descarte (por ahora)                               |
| ---------------------- | ------------------------------------------------------------ |
| Repositorios separados | Más fricción en contratos y PRs coordinados en fase inicial. |
| npm Workspaces         | Sustituido por decisión explícita de estandarizar en pnpm.   |
| Turborepo / Nx         | Complejidad extra no necesaria sin volumen de builds medido. |
