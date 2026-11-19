# Fase 10 — primer slice (aprobado para planificación)

**Estado:** esbozo operativo (2026-11-19). No cambia reglas de producto; solo CI y documentación de ejecución.

**Gate fase 10 global:** los criterios amplios (rate limiting, backups, despliegue) siguen en [roadmap.md](./roadmap.md). Este slice es el **primer entregable acotado**.

## Objetivo del slice

Correr **Playwright E2E** en el job de CI `quality` (o job hermano `e2e`) contra API + web en el mismo workflow, sin sustituir `database-integrity`.

## Alcance MVP del slice

| Incluido | Excluido (fases posteriores dentro de 10) |
| -------- | ----------------------------------------- |
| Servicio Postgres en CI (reutilizar imagen/versión de `database-integrity` o compartir service) | E2E contra despliegue real |
| `migrate deploy` migraciones 6–8 en BD E2E desechable | Rate limiting, WAF, backups |
| Seed HTTP mínimo existente (`apps/web/e2e/helpers/api.ts`) | Todos los specs a la vez en v1 |
| **Un** spec obligatorio en CI: `shared-expenses-balances-settlements.spec.ts` | `phase8-personal-cash-flow.spec.ts` hasta estabilizar datos cross-space |
| Documentar variables `PLAYWRIGHT_*` / `API_URL` / `WEB_URL` en README o `current-status` | Parallel shards, vídeos en artifact obligatorios |

## Criterios de terminado del slice

1. PR en verde: `quality` (o `e2e`) ejecuta Playwright con al menos el spec fases 6–7.
2. Fallo del spec bloquea merge en `main` (misma política que lint).
3. `current-status.md` y [roadmap-frontend.md](./roadmap-frontend.md) marcan E2E CI ✅ para ese spec.
4. Sin secretos en workflow; credenciales de prueba creadas en seed.

## Orden sugerido

1. **DevOps/Frontend:** workflow + script `pnpm --filter @wealthspace/web test:e2e` con API levantada en background en CI.
2. **Backend:** asegurar que el seed E2E sigue alineado con contratos (sin cambios de negocio).
3. **Coordinación:** ampliar fase 10 con siguientes slices solo tras verde estable.