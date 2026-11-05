# Arquitectura del sistema

## Resumen

Wealthspace es un **monorepo pnpm** con dos aplicaciones desplegables de forma independiente:

| Aplicación | Ruta       | Rol                                          |
| ---------- | ---------- | -------------------------------------------- |
| Frontend   | `apps/web` | UI Next.js (App Router), consume API REST    |
| Backend    | `apps/api` | API NestJS, reglas de negocio y persistencia |

Paquete compartido previsto: `packages/contracts` (tipos/contratos ligeros; ver su README).

## Monorepo

- **Orquestación:** pnpm Workspaces (`apps/web`, `apps/api`, `packages/contracts`). Ver `pnpm-workspace.yaml`.
- **Sin** Turborepo/Nx en la fase inicial (ver [ADR-001](../decisions/ADR-001-monorepo.md)).
- Herramientas comunes (Prettier, TypeScript base, scripts raíz) centralizadas cuando aporta valor; dependencias de runtime permanecen en cada app.

## Comunicación

- **REST** sobre HTTPS (JSON).
- Contratos documentados con **OpenAPI** (generación/servicio en backend cuando se implemente el módulo correspondiente).
- El frontend **no** accede a PostgreSQL.

## Backend: monolito modular

El backend crece como **monolito modular** en NestJS:

- Módulos por capacidad (health, auth, spaces, accounts, transactions, shared-expenses, etc.) — nombres orientativos.
- Límite claro: dominio y autorización en servicios de aplicación/dominio; controladores delgados.
- **Prisma** como capa de acceso a datos; migraciones versionadas en el repositorio.

No se introducen microservicios hasta que exista necesidad demostrada (escala, equipos, despliegue independiente de subdominios).

## Frontend

- Next.js con renderizado híbrido según necesidad de cada pantalla.
- Capa de cliente API (fetch/SDK ligero) centralizada; sin lógica de permisos confiable solo en cliente.
- Estado de UI local/remoto según pantalla; sin duplicar reglas de reparto o saldos en el navegador como autoridad.

## Base de datos

- **PostgreSQL** exclusivo del backend.
- Aislamiento lógico por `spaceId` en todas las entidades financieras; defensa en profundidad en queries y tests.

## Despliegue

- Frontend y backend pueden desplegarse en hosts distintos (CDN/static+SSR vs. contenedor/API).
- Variables de entorno por entorno; secretos fuera del repositorio.

## Estrategia de crecimiento

1. Consolidar MVP en monolito con módulos estrictos y tests de aislamiento.
2. Extraer `packages/contracts` cuando haya duplicación real de tipos DTO.
3. Evaluar colas, cache o lecturas réplica solo con métricas (**PENDIENTE DE DECISIÓN**).
4. Revisar ADRs antes de cambios estructurales.

## Documentación relacionada

- [Diseño de API](./api-design.md)
- [Base de datos](./database-design.md)
- [Seguridad](./security.md)
