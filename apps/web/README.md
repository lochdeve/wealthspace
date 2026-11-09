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

- `test:e2e` arranca Next con `webServer` salvo en CI (`CI=true` desactiva el servidor embebido).
- El workflow actual de GitHub Actions **no** ejecuta E2E; solo calidad unitaria y el job `database-integrity`.

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL base de la API (default documentado en `.env.example` raíz).
- En la API, `WEB_ORIGIN=http://localhost:3000` (CORS con credenciales para la cookie de sesión).

## Auth (Fase 3)

Rutas: `/login`, `/register`, `/dashboard` (protegida). Dependencias con endpoints: [frontend-api-dependencies.md](../../docs/development/frontend-api-dependencies.md).

## Documentación

- [Visión de producto](../../docs/product/product-overview.md)
- [Frontend rules](../../.cursor/rules/frontend.mdc)
