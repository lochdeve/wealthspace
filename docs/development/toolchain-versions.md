# Versiones del toolchain

Decisiones **confirmadas** para el monorepo. Las versiones efectivas se fijan en los `package.json` de cada workspace y en **`pnpm-lock.yaml`**.

## Objetivos acordados

| Componente | Versión objetivo | Notas                                               |
| ---------- | ---------------- | --------------------------------------------------- |
| Node.js    | 24 LTS           | `engines.node` en raíz                              |
| pnpm       | 12.x estable     | `packageManager`: `pnpm@12.16.1`                    |
| Next.js    | 16.4.x estable   | Parche más reciente compatible (ver tabla inferior) |
| React      | 19.x             | Alineado con peer de Next.js                        |
| NestJS     | 12.x estable     | `@nestjs/*` en `apps/api`                           |
| TypeScript | ≥ 5.9.x          | Todas las apps y `packages/contracts`               |
| Prisma ORM | 7.x estable      | **No** Prisma 8 RC                                  |
| PostgreSQL | 17.x             | Imagen `postgres:17-alpine`                         |

## Restricciones

- No usar dependencias `canary`, `alpha`, `beta`, `nightly` ni `rc` en producción.
- No bump automático de majors en CI.
- Mantener `pnpm-lock.yaml` versionado.
- Instalar solo con **`pnpm install`** (no npm).

## Configuración pnpm

- `pnpm-workspace.yaml` — workspaces y `allowBuilds` para scripts postinstall (`prisma`, `@prisma/engines`, `esbuild`).
- `.npmrc` — `engine-strict=true`, `auto-install-peers=true`.

Tras clonar, si fallan builds ignorados: `pnpm approve-builds --all -y` (solo si el lockfile aún no incluye permisos).

## Ajustes respecto a versiones nominales

| Petición                           | Decisión efectiva | Motivo                                                         |
| ---------------------------------- | ----------------- | -------------------------------------------------------------- |
| Next.js 16.4.4                     | **16.4.5**        | Último parche estable de la línea 16.4                         |
| Prisma 7.0.2 (referencia genérica) | **7.10.1**        | Última 7.x estable publicada; 7.0.2 ya no resolvía en registry |
| `@nestjs/cli` 12.0.12              | **12.0.11**       | 12.0.12 no existe en npm; latest CLI 12 es 12.0.11             |
| Vitest (stack previo 5.x)          | **3.2.4**         | Estable con Next 16 y `@vitejs/plugin-react` 5.x               |

## Versiones efectivas (snapshot)

Entorno de verificación: Node **v24.14.0**, pnpm **12.16.1**.

| Paquete                 | Workspace          | Versión |
| ----------------------- | ------------------ | ------- |
| next                    | `@wealthspace/web` | 16.4.5  |
| react / react-dom       | `@wealthspace/web` | 19.3.1  |
| eslint-config-next      | `@wealthspace/web` | 16.4.5  |
| typescript              | todos              | 5.9.3   |
| vitest                  | `@wealthspace/web` | 3.2.4   |
| @nestjs/core            | `@wealthspace/api` | 12.3.2  |
| @nestjs/cli             | `@wealthspace/api` | 12.0.11 |
| prisma / @prisma/client | `@wealthspace/api` | 7.10.1  |
| jest                    | `@wealthspace/api` | 30.2.0  |
| concurrently            | raíz               | 9.2.1   |
| prettier                | raíz               | 3.6.2   |

Refrescar: `pnpm list -r --depth=0`

## Datos (MVP)

- PostgreSQL `NUMERIC(19,4)` / Prisma `Decimal` para importes.
- Esquema inicial: `apps/api/prisma/schema.prisma` (validado con Prisma 7.10.1).

## NestJS 12 + Jest

`@nestjs/testing` es ESM; los tests unitarios usan `jest.config.mjs` con `ts-jest` ESM y el script:

`node --experimental-vm-modules ./node_modules/jest/bin/jest.js`

Ver `apps/api/tsconfig.spec.json`.

## Documentación relacionada

- [ADR-001](../decisions/ADR-001-monorepo.md)
- [README raíz](../../README.md)
- [Estrategia de pruebas](./testing-strategy.md)
