# Visión de producto — Wealthspace

Wealthspace gestiona **finanzas personales** y **gastos compartidos** en espacios aislados. Un usuario puede pertenecer a varios espacios y consultar un **dashboard global** (on-read, por moneda).

Compartir un espacio **no** implica cuenta bancaria conjunta. Un espacio compartido puede usarse **sin cuentas** registradas.

## Tipos de espacio

- **PERSONAL** — Automático al registrarse; solo transacciones individuales.
- **SHARED** — Grupo; gastos individuales y compartidos; liquidaciones entre miembros.

## Capacidades MVP

- Zona horaria IANA por usuario; operaciones en UTC; informes por mes local del usuario.
- Categorías, presupuestos, transacciones (saldo inicial con signo; gastos en SHARED con o sin cuenta), gastos compartidos con reparto ISO 4217.
- Resumen global: `totalExpense`, `attributedExpense`, `advancedAmount`.
- Historial versionado; concurrencia optimista; retención de historial (sin borrado destructivo de usuarios con datos).

No es banco, pasarela de pagos ni contabilidad avanzada.

## Documentación relacionada

- [Alcance funcional](./functional-scope.md)
- [Modelo de dominio](./domain-model.md)
