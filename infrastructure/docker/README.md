# Docker — desarrollo local

## PostgreSQL

El archivo `docker-compose.yml` en la **raíz del repositorio** levanta PostgreSQL 17 para desarrollo.

```bash
# Desde la raíz
docker compose up -d
docker compose ps
```

Variables por defecto (sobreescribibles con `.env` en la raíz):

| Variable            | Default         |
| ------------------- | --------------- |
| `POSTGRES_USER`     | wealthspace     |
| `POSTGRES_PASSWORD` | wealthspace_dev |
| `POSTGRES_DB`       | wealthspace     |
| `POSTGRES_PORT`     | 5432            |

Copia `.env.example` a `.env` y ajusta contraseñas locales.

## Health check

El servicio `postgres` expone healthcheck vía `pg_isready`. Espera estado `healthy` antes de conectar Prisma (cuando se configure).

## Persistencia

Volumen Docker `wealthspace_pg_data`. Para resetear datos locales:

```bash
docker compose down -v
```

**Atención:** `-v` borra el volumen de datos de desarrollo.

## Próximos pasos (no implementados)

- Contenedores para `apps/api` y `apps/web` en despliegue local opcional (**PENDIENTE DE DECISIÓN**).
- Servicio de migraciones en CI.
