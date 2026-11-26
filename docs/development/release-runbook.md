# Runbook de despliegue — Wealthspace (MVP)

**Ámbito:** primer despliegue o **staging** compartido. API y web son **artefactos independientes** (ver [system-architecture.md](../architecture/system-architecture.md)).  
**Última revisión:** 2026-11-19.

**Asunción por defecto:** aún no hay proveedor fijado; este documento es operativo hasta elegir hosting (ver §7).

---

## 1. Checklist de migraciones PostgreSQL

Ejecutar **antes** de arrancar una API nueva contra una BD compartida. Orden fijo (Prisma):

| # | Migración | Notas |
| - | --------- | ----- |
| 1 | `20260328183000_init` | Esquema base + SQL de integridad en migración |
| 2 | `20261115183000_phase6_shared_expenses` | Gastos compartidos |
| 3 | `20261117160000_phase7_settlements_void` | Liquidaciones |
| 4 | `20261201120000_phase8_cross_space_cash_links` | Vínculos cross-space; ver [README](../../apps/api/prisma/migrations/20261201120000_phase8_cross_space_cash_links/README.md) |

**Comando** (desde la raíz del monorepo; `.env` con `DATABASE_URL` del entorno o export explícito):

```bash
pnpm --filter @wealthspace/api exec prisma migrate deploy
```

- `prisma.config.ts` carga `.env` de la raíz o `apps/api/.env`.
- **No** usar `prisma db push` en entornos compartidos.

**Verificación** (con BD accesible desde tu máquina o runner):

```bash
DATABASE_URL="<url-del-entorno>" pnpm --filter @wealthspace/api test:db
```

En CI ya corre en el job `database-integrity` contra una BD desechable (no sustituye comprobar el entorno real una vez).

**BD verde (vacía):** solo `migrate deploy`.  
**BD antigua con migraciones 1–3:** `deploy` aplica solo la 4 si falta.  
**Drift manual:** escalar a coordinación; no parchear SQL en prod sin migración aprobada.

---

## 2. Matriz de variables de entorno

| Variable | Componente | Obligatoria | Descripción |
| -------- | ---------- | ----------- | ----------- |
| `DATABASE_URL` | API | Sí | `postgresql://…` — misma red que el proceso API |
| `JWT_SECRET` | API | Sí | ≥ 32 caracteres; **único por entorno** |
| `WEB_ORIGIN` | API | Sí (prod) | Origen **exacto** del navegador (esquema + host + puerto), p. ej. `https://app.ejemplo.com` — CORS credenciales |
| `API_PORT` o `PORT` | API | No | Default `3001` |
| `NODE_ENV` | API | Prod: `production` | Activa cookie `Secure` (`env.ts`) |
| `JWT_EXPIRES_IN` | API | No | Default `7d` |
| `JWT_COOKIE_NAME` | API | No | Default `wealthspace_session` |
| `NEXT_PUBLIC_API_URL` | Web (build) | Sí | URL **pública** de la API vista por el browser, p. ej. `https://api.ejemplo.com` (sin path `/api/v1`; el cliente lo añade) |

**Coherencia crítica**

- El usuario abre el front en `WEB_ORIGIN` → la API debe listar ese valor en CORS.
- El front llama a `NEXT_PUBLIC_API_URL` → debe ser alcanzable con HTTPS en producción si el front es HTTPS.
- Cookies: mismo sitio o cross-origin con `credentials`; si API y web están en **dominios distintos**, revisar configuración de cookie (`SameSite`) — hoy optimizado para **mismo equipo / reverse proxy / subdominios**; **PENDIENTE DE DECISIÓN** para despliegue cross-site sin proxy.

Variables locales de referencia: [.env.example](../../.env.example).

---

## 3. Secuencia de despliegue (manual / PaaS)

### 3.1 Build (CI o servidor)

```bash
pnpm install --frozen-lockfile
pnpm --filter @wealthspace/api exec prisma generate
pnpm --filter @wealthspace/api build
pnpm --filter @wealthspace/web build
```

`NEXT_PUBLIC_API_URL` debe estar definida **en el build de web** (Next inyecta en cliente).

### 3.2 Migraciones

```bash
# DATABASE_URL del entorno de destino
pnpm --filter @wealthspace/api exec prisma migrate deploy
```

### 3.3 Arranque (orden)

1. PostgreSQL accesible.
2. Migraciones aplicadas.
3. **API:** `pnpm --filter @wealthspace/api start:prod` (o proceso equivalente con `NODE_ENV=production`).
4. **Web:** `pnpm --filter @wealthspace/web exec next start -p <puerto>` (default 3000).

Referencia CI E2E: [.github/workflows/ci.yml](../../.github/workflows/ci.yml) job `e2e` (misma secuencia: migrate → build → start API + web).

### 3.4 Smoke tests

| Paso | Comando / acción | Esperado |
| ---- | ---------------- | -------- |
| Liveness | `GET <API>/api/v1/health` | 200 |
| Readiness | `GET <API>/api/v1/health/ready` | 200 (BD OK) |
| Web | Abrir `WEB_ORIGIN` | 200/redirect login |
| Auth | Registro o login en UI | Cookie de sesión |
| OpenAPI | `GET <API>/api/v1/docs` | Swagger |

---

## 4. Rollback (limitado)

- **API/Web:** desplegar artefacto/commit anterior.
- **BD:** Prisma **no** hace rollback automático de migraciones; planificar migraciones hacia adelante. Backup antes de `deploy` en prod.

---

## 5. CI vs entorno compartido

| Aspecto | CI (`main`) | Staging / prod |
| ------- | ----------- | -------------- |
| Migraciones | `e2e` + `test:db` en BD desechable | `migrate deploy` en BD persistente |
| E2E | Playwright contra API+web locales en job | Opcional pipeline post-deploy |
| Secretos | Valores de prueba en workflow | Secrets manager / vars del proveedor |

---

## 6. Gap analysis fase 10 (inventario)

| Hecho en repo | Falta (decisión o trabajo) |
| ------------ | -------------------------- |
| E2E en CI (F-10.1–10.2) | E2E post-deploy en staging |
| `migrate deploy` documentado | Automatizar en pipeline de release (job dedicado) |
| `test:db` en CI | Ejecutar contra BD staging tras deploy (opcional) |
| docker-compose solo Postgres | Imagen/runner API+web; **PENDIENTE** ([infrastructure/docker/README.md](../../infrastructure/docker/README.md)) |
| Health / ready endpoints | Monitorización externa (uptime, alertas) |
| — | Backups Postgres programados + prueba de restore |
| — | Rate limiting ([security.md](../architecture/security.md)) |
| — | TLS y dominios (proveedor) |
| — | Política de privacidad / logging estructurado |
| — | `COOKIE_SECURE` + HTTPS + posible proxy mismo-dominio |

---

## 7. Hosting — decisión actual (sin dominio propio)

| Pieza | Proveedor |
| ----- | --------- |
| Web (`apps/web`) | **Vercel** (`*.vercel.app`) |
| API (`apps/api`) | **Railway** (`*.up.railway.app` o similar) |
| PostgreSQL | **Railway** (plugin Postgres en el mismo proyecto) |
| Dominio propio | No (URLs del proveedor) |

Guía paso a paso: **§8**. Pendiente código: cookie cross-origin (`vercel.app` ↔ `railway.app`) — ver §8.8.

---

## 8. Guía paso a paso — Vercel (web) + Railway (API + Postgres)

### 8.0 Qué significa «pegar secrets / variables»

**No es git, no es un archivo en el repo.**

- En **Railway** y **Vercel**, cada servicio tiene una pantalla **Variables** (a veces llamada *Environment variables* o *Secrets*).
- Ahí creas filas: **nombre** = `JWT_SECRET`, **valor** = una contraseña larga que tú generas.
- La plataforma **inyecta** esos pares en `process.env` cuando arranca tu app.
- Railway/Vercel **encriptan** esos valores en su panel; tú **nunca** los commiteas (`.env` sigue en `.gitignore`).

Ejemplo visual (concepto):

```text
Nombre          Valor (solo en el panel del proveedor)
──────────────  ─────────────────────────────────────
DATABASE_URL    postgresql://user:pass@host:5432/db
JWT_SECRET      a8f3... (mínimo 32 caracteres)
WEB_ORIGIN      https://wealthspace-abc123.vercel.app
NODE_ENV        production
```

---

### 8.1 Railway — crear proyecto y base de datos

1. Entra en [railway.com](https://railway.com) → **New Project**.
2. **Add service** → **Database** → **PostgreSQL** (Railway crea un contenedor de Postgres).
3. Abre el servicio **Postgres** → pestaña **Variables** (o **Connect**):
   - Verás algo como `DATABASE_URL` (cadena `postgresql://…`). Esa URL es la **BD en la nube**.
4. (Opcional para migrar desde tu Mac) **Settings** del Postgres → activar **Public networking** / TCP proxy si Railway lo pide, para poder hacer `migrate deploy` desde local. Si no, usa el **Railway CLI** o un one-off shell en el panel.

---

### 8.2 Railway — servicio API (backend)

1. En el **mismo proyecto** → **Add service** → **GitHub Repo** → elige el repo `wealthspace`.
2. **Settings** del servicio API (ajusta según la UI actual de Railway):
   - **Root directory:** vacío o `/` (raíz del monorepo).
   - **Build command** (ejemplo):

     ```bash
     pnpm install --frozen-lockfile && pnpm --filter @wealthspace/api exec prisma generate && pnpm --filter @wealthspace/api build
     ```

   - **Start command** (ejemplo):

     ```bash
     pnpm --filter @wealthspace/api start:prod
     ```

3. **Networking** → **Generate domain** para la API (te dan `https://algo-production-xxxx.up.railway.app`). Esa URL es tu **`NEXT_PUBLIC_API_URL`** en Vercel.

---

### 8.3 Railway — variables del servicio API («secrets»)

En el servicio **API** (no en Postgres), pestaña **Variables** → **Add variable** o **Raw editor**:

| Variable | Qué pegar | Notas |
| -------- | --------- | ----- |
| `DATABASE_URL` | Referencia al Postgres | En Railway suele poder ser **Reference**: elegir variable `DATABASE_URL` del servicio Postgres (recomendado). Si no, copia la cadena completa del servicio Postgres. |
| `JWT_SECRET` | Texto aleatorio **≥ 32 caracteres** | Genera en 1Password, `openssl rand -base64 32`, etc. **Nueva** por entorno. |
| `NODE_ENV` | `production` | Activa cookie `Secure`. |
| `WEB_ORIGIN` | URL **exacta** de tu web en Vercel | Ej. `https://wealthspace.vercel.app` — sin barra final. Es el origen que la API acepta en CORS. |
| `PORT` | (opcional) | Railway suele inyectar `PORT`; la API lo lee. |

**No hace falta** `NEXT_PUBLIC_*` en Railway (eso va en Vercel).

Guarda → Railway **redeploy** el servicio con las nuevas variables.

---

### 8.4 Migraciones en la BD de Railway (desde tu PC)

Con el repo en local y Node/pnpm instalados:

1. Copia temporalmente la `DATABASE_URL` de Railway Postgres (solo en tu `.env` local, **no** commitear).
2. Desde la **raíz** del monorepo:

   ```bash
   pnpm --filter @wealthspace/api exec prisma migrate deploy
   ```

3. Comprueba la API desplegada:

   ```bash
   curl -sS "https://TU-URL-RAILWAY.up.railway.app/api/v1/health/ready"
   ```

   Debe responder OK si la BD está bien y la API arrancó.

---

### 8.5 Vercel — proyecto web

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importa el mismo repo.
2. **Framework:** Next.js.
3. **Root directory:** `apps/web` (importante en monorepo).
4. Build por defecto de Vercel suele valer; si falla, build: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @wealthspace/web build` (ajustar según el asistente de Vercel).

---

### 8.6 Vercel — variables («secrets» de la web)

**Settings** → **Environment Variables** → añade para **Production** (y Preview si quieres probar previews):

| Variable | Valor |
| -------- | ----- |
| `NEXT_PUBLIC_API_URL` | `https://TU-URL-RAILWAY.up.railway.app` |

Sin `/api/v1` al final. El cliente del front añade las rutas.

**Redeploy** la web (Deployments → ⋮ → Redeploy) para que el build coja la variable.

---

### 8.7 Orden y comprobación final

1. Postgres en Railway ✅  
2. Variables API en Railway ✅  
3. `migrate deploy` ✅  
4. API en línea (`/api/v1/health/ready`) ✅  
5. Variable en Vercel + deploy web ✅  
6. Abrir la URL de Vercel → **Registrarse** / **Iniciar sesión**

---

### 8.8 Aviso — login entre `vercel.app` y `railway.app`

La sesión es cookie **HttpOnly** (`wealthspace_session`). Next.js (RSC) solo lee cookies del **dominio del front** (Vercel). Si el navegador llama **directo** a Railway, la cookie queda en `*.railway.app`, el login devuelve 200 pero `/dashboard` vuelve a `/login`.

**Solución recomendada (§8.9):** proxy `/api/v1` en Vercel hacia Railway y `NEXT_PUBLIC_API_URL` = URL del **mismo** proyecto Vercel.

Alternativa futura: dominio propio + subdominios + `SameSite=None` (más trabajo).

### 8.9 Vercel — proxy same-origin (obligatorio para sesión)

Las peticiones a `/api/v1/*` las atiende `apps/web/src/app/api/v1/[...path]/route.ts` (lee `API_PROXY_TARGET` en **runtime**, no hace falta en build).

**Variables en Vercel (Production):**

| Variable | Valor |
| -------- | ----- |
| `API_PROXY_TARGET` | `https://TU-URL-RAILWAY.up.railway.app` (privada, sin `/api/v1`) |
| `NEXT_PUBLIC_API_URL` | `https://TU-PROYECTO.vercel.app` (**misma** URL que abre el usuario) |

**Railway (API):** `WEB_ORIGIN` sigue siendo la URL de Vercel.

Tras deploy: login → cookie en dominio Vercel → panel carga. **Redeploy web** tras cambiar `NEXT_PUBLIC_API_URL` (build).

---

## Documentación relacionada

- [current-status.md](./current-status.md) — tareas Release
- [phase-10-slice-e2e-ci.md](./phase-10-slice-e2e-ci.md)
- [roadmap.md](./roadmap.md) § Fase 10
- [apps/api/README.md](../../apps/api/README.md)