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
- Specs que mutan datos (`e2e/shared-expenses-balances-settlements.spec.ts`, `e2e/phase8-personal-cash-flow.spec.ts`) crean usuarios vía `POST /auth/register` y un espacio SHARED por HTTP (`e2e/helpers/api.ts`); requieren migraciones fase 7 y 8 en la API.
- El workflow actual de GitHub Actions **no** ejecuta E2E; solo calidad unitaria y el job `database-integrity`.

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL base de la API (default documentado en `.env.example` raíz).
- En la API, `WEB_ORIGIN=http://localhost:3000` (CORS con credenciales para la cookie de sesión).

## Rutas

- Auth: `/login`, `/register`.
- Área `(app)` protegida: `/spaces`, `/spaces/new`, `/spaces/[id]`, `/invitations`, `/accounts` y, por espacio, `accounts`, `categories`, `transactions` y `expenses/new` (gasto individual; ver P-14). `/dashboard` redirige a `/spaces`.

Endpoints consumidos: [frontend-api-dependencies.md](../../docs/development/frontend-api-dependencies.md). Roadmap: [roadmap-frontend.md](../../docs/development/roadmap-frontend.md).

## Documentación

- [Visión de producto](../../docs/product/product-overview.md)
- [Frontend rules](../../.cursor/rules/frontend.mdc)
