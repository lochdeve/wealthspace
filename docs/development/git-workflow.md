# Flujo de Git

## Ramas

- `main` — línea estable; protegida.
- `feature/<ticket-o-descripcion>` — trabajo nuevo.
- `fix/<descripcion>` — correcciones.
- `chore/<descripcion>` — tooling, deps, CI.

Rebases vs. merge **PENDIENTE DE DECISIÓN** en equipo; por defecto merge PR en GitHub.

## Conventional Commits

Formato acordado para el proyecto (mensajes en **inglés** en commits):

```
<type>(<scope>): <short description>
```

Tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`.

Ejemplo: `feat(api): add space membership guard`

## Pull Requests

- Descripción clara: qué, por qué, cómo probar.
- Enlace a issue/tarea si existe.
- Tamaño razonable; dividir si supera ~400 líneas útiles.

## Revisión

- Al menos una aprobación antes de merge (**PENDIENTE DE DECISIÓN** regla en GitHub).
- Revisor verifica: seguridad espacio, tests, migraciones, docs.

## Criterios mínimos antes de integrar

- [ ] `pnpm run lint` sin errores.
- [ ] `pnpm run typecheck` sin errores.
- [ ] `pnpm run test` verde (alcance acordado en PR).
- [ ] Sin secretos ni `.env` commiteados.
- [ ] Cambios de dominio reflejados en docs si aplica.
- [ ] ADR si cambia arquitectura.

## Documentación relacionada

- [Estándares de codificación](./coding-standards.md)
- [ADR](../decisions/README.md)
