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

## 7. Hosting — decisiones pendientes

Registrar aquí cuando el equipo elija:

- [ ] Proveedor Postgres gestionado (RDS, Neon, Supabase, …)
- [ ] API (Railway, Fly.io, VPS, k8s, …)
- [ ] Web (Vercel, mismo VPS, …)
- [ ] DNS + TLS
- [ ] Almacén de secretos
- [ ] Estrategia de backups (RPO/RTO)

Hasta entonces: despliegue manual siguiendo §3 en una VM o dos servicios PaaS con las variables de §2.

---

## Documentación relacionada

- [current-status.md](./current-status.md) — tareas Release
- [phase-10-slice-e2e-ci.md](./phase-10-slice-e2e-ci.md)
- [roadmap.md](./roadmap.md) § Fase 10
- [apps/api/README.md](../../apps/api/README.md)