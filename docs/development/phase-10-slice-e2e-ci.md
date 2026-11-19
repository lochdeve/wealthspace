# Fase 10 — primer slice (aprobado para planificación)

**Estado:** slice 1 implementado en `.github/workflows/ci.yml` (job `e2e`, 2026-11-19). No cambia reglas de producto; solo CI y documentación de ejecución.

**Gate fase 10 global:** los criterios amplios (rate limiting, backups, despliegue) siguen en [roadmap.md](./roadmap.md). Este slice es el **primer entregable acotado**.

## Objetivo del slice

Correr **Playwright E2E** en el job de CI `quality` (o job hermano `e2e`) contra API + web en el mismo workflow, sin sustituir `database-integrity`. Job `e2e` usa **`ubuntu-24.04`** hasta subir `@playwright/test` ≥ 1.61 (soporte `ubuntu-latest` 26.04).

## Alcance MVP del slice

| Incluido                                                                                        | Excluido (fases posteriores dentro de 10)                               |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Servicio Postgres en CI (reutilizar imagen/versión de `database-integrity` o compartir service) | E2E contra despliegue real                                              |
| `migrate deploy` migraciones 6–8 en BD E2E desechable                                           | Rate limiting, WAF, backups                                             |
| Seed HTTP mínimo existente (`apps/web/e2e/helpers/api.ts`)                                      | Todos los specs a la vez en v1                                          |
| **Un** spec obligatorio en CI: `shared-expenses-balances-settlements.spec.ts`                   | `phase8-personal-cash-flow.spec.ts` hasta estabilizar datos cross-space |
| Documentar variables `PLAYWRIGHT_*` / `API_URL` / `WEB_URL` en README o `current-status`        | Parallel shards, vídeos en artifact obligatorios                        |

## Criterios de terminado del slice

1. PR en verde: `quality` (o `e2e`) ejecuta Playwright con al menos el spec fases 6–7.
2. Fallo del spec bloquea merge en `main` (misma política que lint).
3. `current-status.md` y [roadmap-frontend.md](./roadmap-frontend.md) marcan E2E CI ✅ para ese spec.
4. Sin secretos en workflow; credenciales de prueba creadas en seed.

## Orden sugerido

1. **DevOps/Frontend:** workflow + script `pnpm --filter @wealthspace/web test:e2e` con API levantada en background en CI.
2. **Backend:** asegurar que el seed E2E sigue alineado con contratos (sin cambios de negocio).
3. **Coordinación:** ampliar fase 10 con siguientes slices solo tras verde estable.

---

## Slice 2 — confianza en regresiones (E2E ampliado)

**Estado:** planificado en repo (workflow ejecuta **todos** los specs bajo `apps/web/e2e/`).

### Objetivo

Que un PR no pueda romper flujos **6–7**, **8 (cuentas personales vinculadas)** ni humo **auth/home** sin que falle el job `e2e`.

### Alcance CI

| Spec | Flujo |
| ---- | ----- |
| `shared-expenses-balances-settlements.spec.ts` | Gasto compartido, saldos, liquidación parcial, anular |
| `phase8-personal-cash-flow.spec.ts` | P-02 / P-07: gasto con cuenta personal, liquidación anotada |
| `auth.spec.ts` | Redirección a login, enlace desde home |
| `home.spec.ts` | Portada |

### Regla operativa

- En **`CI=true`**, si falla `assertE2EApiReady`, seed HTTP o probe fase 8 → **falla el job** (`abortE2ESeedUnlessLocalDev` en `e2e/helpers/api.ts`). En local sin API, los specs con seed se **saltan** con aviso (desarrollo cómodo).
- Cada spec nuevo de regresión: añadir bajo `e2e/` y mantener seed autocontenido (como `seedTwoMemberSharedSpace`).
- **Fuera de slice 2 (hasta decisión):** E2E fase 9 (dashboard/presupuestos), shards paralelos, vídeos obligatorios en artifact.

### Mantener al día

1. Al cerrar una feature con UI crítica, valorar spec E2E o ampliar uno existente en el mismo PR o el siguiente.
2. Tras cambios en `e2e/helpers/api.ts` o login por defecto (`/dashboard`), ejecutar `pnpm --filter @wealthspace/web test:e2e` con API + BD locales (Chromium: `pnpm exec playwright install chromium` en `apps/web`).
3. Coordinación documenta aquí cualquier spec **excluido** de CI y el motivo.
