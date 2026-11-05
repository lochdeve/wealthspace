# Architecture Decision Records (ADR)

Registro ligero de decisiones arquitectónicas **confirmadas**. No usar ADRs para ideas exploratorias sin acuerdo.

## Cuándo crear un ADR

- Elección de stack o patrón estructural.
- Cambio que afecta a varias apps o equipos.
- Compromiso difícil de revertir (p. ej. estrategia de IDs, auth).

## Cuándo no

- Detalle de implementación local reversible en un PR.
- Funcionalidad de producto no decidida → documentar en `docs/product/` como **PENDIENTE DE DECISIÓN**.

## Formato

Archivo `ADR-NNN-titulo-corto.md` en esta carpeta:

1. **Estado:** Propuesto | Aceptado | Obsoleto | Reemplazado por ADR-XXX
2. **Contexto**
3. **Decisión**
4. **Consecuencias** (positivas y negativas)
5. **Alternativas consideradas** (opcional)

Numeración secuencial. Al obsoletar, enlazar al reemplazo.

## Índice

| ADR                              | Título                       | Estado   |
| -------------------------------- | ---------------------------- | -------- |
| [ADR-001](./ADR-001-monorepo.md) | Monorepo con pnpm Workspaces | Aceptado |
