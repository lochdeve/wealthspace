# @wealthspace/web

Frontend de Wealthspace (Next.js App Router).

## Scripts

| Comando          | Descripción                                |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Servidor de desarrollo (puerto `3000`)     |
| `pnpm build`     | Build de producción                        |
| `pnpm test`      | Vitest + React Testing Library             |
| `pnpm test:e2e`  | Playwright Chromium (ver requisitos abajo) |
| `pnpm lint`      | ESLint (Next.js)                           |
| `pnpm typecheck` | `tsc --noEmit`                             |

Desde la raíz: `pnpm --filter @wealthspace/web dev`.

### E2E (Playwright)

- Proyecto configurado: **Chromium** (`playwright.config.ts`).
- En local, instalar el navegador una vez (desde `apps/web` o con `--filter`):

  ```bash
  pnpm exec playwright install chromium
  ```

- **Requisitos:** API Nest en `NEXT_PUBLIC_API_URL` (p. ej. `http://localhost:3001`) con PostgreSQL; web en `3000`. `test:e2e` arranca solo Next (`webServer`) salvo en CI (`CI=true` desactiva el servidor embebido) — la API debe estar ya levantada.
- Specs que mutan datos (`e2e/shared-expenses-balances-settlements.spec.ts`, `e2e/phase8-personal-cash-flow.spec.ts`) crean usuarios vía `POST /auth/register` y un espacio SHARED por HTTP (`e2e/helpers/api.ts`); requieren migraciones fase 7 y 8 en la API y un proceso `apps/api` en el **mismo `main`** (si la API es antigua, `phase8-personal-cash-flow.spec.ts` falla al arrancar con un mensaje sobre `personalAccountId`).
- **CI** (job `e2e` en `.github/workflows/ci.yml`): Postgres 17, `prisma migrate deploy`, API `start:prod` en `3001`, Next `start` en `3000`, spec obligatorio `shared-expenses-balances-settlements.spec.ts`. Variables en el job: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_URL`, `WEB_ORIGIN` (sin secretos en repo; JWT de prueba solo en CI).

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL base de la API (default documentado en `.env.example` raíz).
- En la API, `WEB_ORIGIN=http://localhost:3000` (CORS con credenciales para la cookie de sesión).

## Rutas

- Auth: `/login`, `/register`.
- Área `(app)` protegida: `/dashboard`, `/settings`, `/spaces`, `/invitations`, `/accounts` y, por espacio, finanzas, `budgets`, `reports/consumption` (F-9). Rutas de gastos compartidos según fases 6–8.

Endpoints consumidos: [frontend-api-dependencies.md](../../docs/development/frontend-api-dependencies.md). Roadmap: [roadmap-frontend.md](../../docs/development/roadmap-frontend.md).

## Documentación

- [Visión de producto](../../docs/product/product-overview.md)
- [Frontend rules](../../.cursor/rules/frontend.mdc)
