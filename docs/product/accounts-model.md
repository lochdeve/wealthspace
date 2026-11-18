# Modelo de cuentas — análisis y recomendación

**Estado: DECISIONES APROBADAS (2026-11-18).** P-01…P-07 y P-17 en [decisions.md §2e](./decisions.md#2e-decisiones-aprobadas--fase-8-cuentas-vinculadas-2026-11-18). **No implementar** código hasta revisión del plan técnico B-8/F-8 en coordinación.

---

## 1. Modelo implementado hoy

Verificado en `apps/api/prisma/schema.prisma`, `custom-integrity.sql` y `apps/api/src/`:

- `Account` pertenece a **un espacio** (`spaceId`). No tiene propietario de tipo usuario.
- El espacio PERSONAL es 1:1 con su usuario (`User.personalSpaceId`) y solo tiene un miembro. Por tanto, una cuenta de un espacio PERSONAL **ya es, en la práctica, una cuenta del usuario**, privada por construcción.
- Una cuenta de un espacio SHARED es visible y operable por todos los miembros ACTIVE.
- Las FK compuestas `(space_id, account_id)` impiden que un movimiento de un espacio use una cuenta de otro. Consecuencias:
  - `TRANSFER` solo entre cuentas del **mismo espacio**.
  - Un gasto de un espacio SHARED no puede usar una cuenta personal.
- `INCOME` no admite `attributedToUserId` (CHECK): no se puede registrar quién aportó dinero a una cuenta compartida.
- `SharedExpense.paymentSource`: `SPACE_ACCOUNT` (crea un `EXPENSE` en la cuenta compartida), `CASH` y `EXTERNAL_PERSONAL` (pagador miembro, sin movimiento en ninguna cuenta). No implementado en API.
- `EXPENSE` en SHARED sin cuenta: se registra, pero no mueve ningún saldo.

## 2. Escenarios

### E1. Un miembro paga un gasto compartido desde su cuenta personal

Ana paga 120 € con la tarjeta de su cuenta «Nómina» (espacio PERSONAL) por la compra del piso.

| Aspecto    | Hoy                                                                                                                                                                      | Recomendado (P-02)                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro   | Gasto compartido «pagado por Ana» sin movimiento. Para que su saldo cuadre, Ana registra a mano otro gasto de 120 € en su espacio personal (doble trabajo, sin vínculo). | Solo **Ana (pagadora)** puede vincular «desde mi cuenta Nómina». En una transacción: gasto en SHARED y salida de **120 €** (total pagado). Carlos y María no bajan su PERSONAL al guardar; deben 40 € en el SHARED hasta liquidar (P-02). |
| Privacidad | —                                                                                                                                                                        | El espacio SHARED solo ve «Pagado por Ana». Nunca recibe `accountId`, nombre ni saldo de la cuenta. Solo Ana ve el vínculo, desde su espacio personal.                                             |
| Permisos   | —                                                                                                                                                                        | Solo el titular del espacio PERSONAL puede vincular una cuenta suya. Si el gasto lo registra otro miembro, no se ofrece vínculo; Ana puede añadirlo después desde su lado.                         |
| Edición    | —                                                                                                                                                                        | Editar el importe o anular el gasto actualiza o anula el movimiento vinculado en la misma transacción. El movimiento vinculado no se edita por separado.                                           |
| Informes   | Riesgo de doble conteo: 120 € en el espacio personal + 120 € de total en el compartido.                                                                                  | El movimiento vinculado es **flujo de caja** (120 €); el consumo de Ana es su participación (40 €). Los 80 € restantes son un adelanto que se recupera con liquidaciones. Presupuestos: P-17.      |

### E2. Un miembro paga un gasto compartido en efectivo

Carlos paga 30 € en efectivo en el bar.

- Gasto «pagado por Carlos» sin vínculo a cuenta. Deudas idénticas a E1.
- Si Carlos lleva su efectivo como una cuenta personal («Cartera»), es exactamente E1.
- Conclusión: efectivo y «cuenta externa no registrada» no se distinguen funcionalmente → **P-03, aprobada**: se unifican en «pagado por un miembro».

### E3. El gasto se paga desde una cuenta compartida del espacio

El piso tiene la cuenta común «Bote» (espacio SHARED). Se pagan 90 € de luz con ella, a repartir entre los tres.

| Aspecto                | Comportamiento                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registro               | `SharedExpense` `SPACE_ACCOUNT` + `EXPENSE` en «Bote» (−90 €). Ya soportado por el esquema y los triggers.                                                                                                                                             |
| Deudas                 | **Ninguna** entre miembros (P-04, aprobada): nadie ha adelantado dinero personal. Las participaciones (30 / 30 / 30) son consumo informativo.                                                                                                          |
| Saldos                 | Baja el saldo de «Bote». Las cuentas personales no cambian.                                                                                                                                                                                            |
| Alternativa descartada | Tratar el bote como un «miembro» con cuentas de capital por persona (aportado − consumido) y derivar deudas de ahí. Es más preciso, pero introduce contabilidad de fondos, saldos negativos por miembro y explicaciones difíciles. No compensa en MVP. |

### E4. Un miembro devuelve su parte a otro

Carlos hace un Bizum de 15 € a Ana.

- Se registra una **liquidación** Carlos → Ana de 15 € en el espacio SHARED. La deuda pasa de 40 € a 25 €.
- Cuentas: en MVP, ninguna (P-07). Opcionalmente, Carlos y Ana registran cada uno el movimiento en su espacio personal.
- Ampliación futura (P-07): quien registra la liquidación puede vincular un movimiento en **su propia** cuenta personal (Carlos: salida; Ana, si la registra ella: entrada). Nadie puede escribir en el espacio personal de otro.
- Presupuestos: la liquidación no es consumo; no debe contar como gasto en el presupuesto de Carlos (su consumo de 40 € ya se reconoció con su participación).

### E5. Varios miembros aportan dinero a una cuenta compartida

Ana, Carlos y María ingresan 200 € cada uno en «Bote».

- Hoy: tres `INCOME` en «Bote», pero **no se puede registrar quién aportó** (el CHECK lo impide). Brecha funcional.
- Recomendado (P-05): «aportación» = entrada en la cuenta compartida con **aportante identificado** y, opcionalmente, una salida vinculada en la cuenta personal del aportante (mecanismo de E6).
- Historial y saldo: el saldo de «Bote» es on-read, como el de cualquier cuenta. El espacio muestra el total aportado por miembro (informativo).
- Las aportaciones desiguales **no generan deudas** en MVP; el grupo las ve y decide.

### E6. Mover dinero entre una cuenta personal y una compartida

María pasa 100 € de su «Nómina» a «Bote», o se le devuelven 50 € desde «Bote».

- Hoy: imposible como transferencia (las cuentas están en espacios distintos). Solo dos registros manuales sin vínculo.
- Recomendado (P-06): una operación que crea **dos movimientos vinculados**, una salida en el espacio origen y una entrada en el destino, en la misma transacción de BD. Cada espacio ve solo su lado. El espacio SHARED ve «Aportación de María: 100 €», sin datos de su cuenta.
- La operación solo la puede iniciar el titular de la cuenta personal implicada. Una retirada desde la cuenta compartida hacia la personal de otro miembro solo crea el lado compartido; el receptor puede vincular su entrada después.

## 3. Respuesta a las preguntas planteadas

| Pregunta                                                                                        | Recomendación                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ¿Las cuentas personales deberían pertenecer a usuarios y no a espacios?                         | Ya pertenecen al usuario a través de su espacio PERSONAL. **No migrar** `Account.spaceId` a `ownerUserId`: perderíamos las FK compuestas, el aislamiento por espacio y la autorización uniforme (membresía del espacio) a cambio de nada. (P-01) |
| ¿Las cuentas compartidas deberían pertenecer a espacios?                                        | Sí; ya es así.                                                                                                                                                                                                                                   |
| ¿Cómo usa un espacio una cuenta personal sin ver su saldo e historial?                          | No la usa directamente: el **pagador** vincula su cuenta y la API crea el movimiento en el espacio personal. El espacio compartido solo ve el hecho «pagado por Ana». (P-02)                                                                     |
| ¿Cómo se registran los movimientos de una cuenta personal que financia un gasto compartido?     | Movimiento de salida en el espacio PERSONAL, vinculado al gasto, gestionado por el ciclo de vida del gasto (editar o anular lo propaga).                                                                                                         |
| ¿Cómo funcionan las cuentas comunes, sus aportaciones, saldos e historial?                      | Cuenta del espacio SHARED; saldo on-read; aportaciones con aportante identificado (P-05); gastos pagados con ella sin deudas (P-04).                                                                                                             |
| ¿Cómo se representan las liquidaciones y transferencias entre cuentas personales y compartidas? | Liquidación: entidad propia del espacio SHARED, sin movimientos en MVP (P-07). Personal ↔ compartida: dos movimientos vinculados, no `TRANSFER` (P-06).                                                                                         |

## 4. Consecuencias de la recomendación

| Área         | Consecuencia                                                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permisos     | Nueva regla: vincular una cuenta personal exige ser el titular de ese espacio PERSONAL (verificación en servidor). Las cuentas compartidas siguen la membresía ACTIVE.                                         |
| Privacidad   | Las respuestas del espacio SHARED nunca incluyen identificadores ni datos de cuentas personales. Requiere tests de no filtración, además de los de IDOR.                                                       |
| Movimientos  | Aparece un **vínculo entre espacios** (movimiento personal ↔ gasto, aportación o liquidación). Las FK compuestas siguen intactas: cada movimiento vive en su espacio; el vínculo es una referencia adicional. |
| Saldos       | Sin cambios de algoritmo: siguen siendo on-read por cuenta. El saldo personal refleja el pago solo si se vinculó.                                                                                              |
| Informes     | Distinguir **consumo** (participaciones, gastos individuales) de **flujo de caja** (pagos adelantados, aportaciones, liquidaciones). Las métricas del dashboard global se redefinen (P-17).                    |
| Presupuestos | Por defecto cuentan el consumo. Los movimientos vinculados de flujo de caja se excluyen (P-17).                                                                                                                |
| Auditoría    | El movimiento vinculado no se edita por separado; sus cambios se registran como revisiones del gasto origen. Una anulación se propaga a ambos lados.                                                           |
| Esquema      | Cambios previstos (requieren aprobación y migración): referencia de vínculo en `financial_transactions`, aportante en entradas de cuentas compartidas, origen de pago unificado (P-03).                        |

## 5. Orden recomendado

1. **Fase 6–7** (gastos, deudas, liquidaciones) **sin** vínculos a cuentas personales: pagador miembro sin movimiento y `SPACE_ACCOUNT`. Así se entrega el valor principal sin bloquearse por este análisis.
2. **Fase 8**: vínculos personales (P-02, P-06, P-07) y aportaciones (P-05), después de aprobar este documento.
3. **Fase 9**: presupuestos e informes con P-17 resuelto.

P-03 y P-04, las únicas necesarias para la fase 6, están **aprobadas** (2026-11-15). El resto de este documento sigue en análisis.
