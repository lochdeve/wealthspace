# Visión de producto — Wealthspace

Wealthspace es una aplicación web de **finanzas personales** y **gastos compartidos**. Organiza los datos en **espacios** aislados: cada usuario tiene un espacio personal privado y puede participar en espacios compartidos (piso, pareja, viaje, etc.).

Compartir un espacio **no** implica tener una cuenta bancaria conjunta. Un espacio compartido puede usarse sin ninguna cuenta registrada: basta con apuntar quién paga cada gasto y cómo se reparte.

## Problema que resuelve

- Saber cuánto dinero tengo y en qué lo gasto (espacio personal).
- Repartir gastos con otras personas sin hojas de cálculo: quién pagó, cuánto le corresponde a cada uno y quién debe a quién (espacio compartido).
- Registrar las devoluciones entre personas y ver la deuda pendiente.

## Tipos de espacio

- **PERSONAL** — se crea automáticamente al registrarse. Solo su titular accede. Cuentas, ingresos, gastos, transferencias y presupuestos.
- **SHARED** — grupo con miembros e invitaciones. Gastos compartidos con reparto, deudas entre miembros, liquidaciones y, opcionalmente, cuentas comunes.

## Principios de producto

1. **Flujo habitual sencillo:** añadir un gasto pagado por mí y repartido a partes iguales debe costar segundos.
2. **Sin confirmaciones:** un gasto registrado produce sus efectos de inmediato; los errores se corrigen editando o anulando, con historial visible.
3. **Gasto, deuda y liquidación son cosas distintas** y la interfaz las presenta por separado.
4. **El dinero solo se mueve cuando hay un movimiento real registrado.**
5. **Privacidad del espacio personal:** nada de un espacio personal es visible desde un espacio compartido.

## Capacidades del MVP

| Capacidad                                                         | Estado (2026-11-15)                                                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Registro, sesión y espacio personal                               | Implementado                                                               |
| Espacios compartidos, invitaciones y membresía                    | Implementado (transferencia de ownership pendiente)                        |
| Cuentas, categorías, ingresos, gastos y transferencias            | Implementado (web pendiente de merge)                                      |
| Gastos compartidos con reparto igual, % o importes                | Especificado ([shared-expenses.md](./shared-expenses.md)); no implementado |
| Deudas y liquidaciones                                            | Especificado; no implementado                                              |
| Cuentas personales vinculadas a gastos compartidos y aportaciones | En análisis ([accounts-model.md](./accounts-model.md))                     |
| Presupuestos, informes y dashboard global                         | No implementado; criterios pendientes (P-17)                               |

Roadmap real: [roadmap.md](../development/roadmap.md).

## Qué no es

No es un banco, ni una pasarela de pagos, ni una herramienta de cobro o reclamación de deudas, ni un software de contabilidad avanzada. No verifica transferencias ni ejecuta pagos.

## Documentación relacionada

- [Registro de decisiones](./decisions.md)
- [Alcance funcional](./functional-scope.md)
- [Modelo de dominio](./domain-model.md)
