# Gastos compartidos, deudas y liquidaciones

Especificación funcional para espacios **SHARED**. Decisiones referenciadas por ID en [decisions.md](./decisions.md). Contrato API previsto: [api-design.md](../architecture/api-design.md#gastos-compartidos-deudas-y-liquidaciones-previsto).

**Estado de implementación (2026-11-18):** fases **6 y 7** implementadas en API y web (gastos compartidos, `GET /balances`, liquidaciones, anulaciones). Contratos en [frontend-api-dependencies.md](../development/frontend-api-dependencies.md). E2E local en `apps/web/e2e/shared-expenses-balances-settlements.spec.ts`.

---

## 1. Tres conceptos separados (A-06)

| Concepto          | Qué registra                                                                          | Quién lo crea                          | ¿Se almacena?                               |
| ----------------- | ------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Gasto**         | Qué se compró, importe, moneda, fecha, quién pagó, participantes y método de reparto. | Un miembro, manualmente.               | Sí (`SharedExpense` + `ExpenseParticipant`) |
| **Participación** | Parte del gasto que corresponde a cada participante.                                  | La aplicación, al calcular el reparto. | Sí (`ExpenseParticipant.allocatedAmount`)   |
| **Deuda**         | Lo que una persona debe a otra como consecuencia de los gastos y liquidaciones.       | La aplicación, automáticamente (A-07). | No: se calcula al leer (P-08)               |
| **Liquidación**   | Un pago real, hecho fuera de Wealthspace, que reduce una deuda.                       | Un miembro, manualmente (A-08).        | Sí (`Settlement`)                           |

Reglas transversales:

- **No hay confirmaciones** (A-04). Ningún gasto, participación o deuda tiene estado «pendiente de confirmar». Un gasto existe y produce efectos desde que se guarda.
- **Registrar un gasto no mueve dinero de nadie más** (A-10). Solo el pago real tiene reflejo en cuentas, y únicamente si se registra (ver [accounts-model.md](./accounts-model.md)).
- **Wealthspace no verifica ni ejecuta pagos** (A-09). Una liquidación es una anotación de buena fe.

## 2. Flujo de registro de un gasto

1. Un miembro ACTIVE abre «Añadir gasto» en el espacio.
2. Indica concepto, importe, fecha, categoría opcional y moneda (por defecto, la `displayCurrency` del espacio).
3. Indica **quién pagó**: un miembro (por defecto, él mismo) o una cuenta compartida del espacio.
4. Selecciona los **participantes** (por defecto, todos los miembros ACTIVE).
5. Elige el **método de reparto** (por defecto, a partes iguales; A-01).
6. Ve la previsualización de las participaciones calculadas por el servidor (P-16).
7. Guarda. Las participaciones quedan fijadas y las deudas aparecen al momento en los saldos del espacio.
8. Los demás miembros ven el gasto en el listado y, en el detalle, **su parte** y **a quién se la deben**.

### Gasto individual en SHARED (no confundir)

Si el gasto **no se reparte** (p. ej. lo pagas tú y es solo tuyo, o lo imputas a un solo miembro), no uses este flujo: es el **Gasto individual** (`EXPENSE` con `attributedToUserId`, P-14/C-04). No genera deudas entre miembros. En la UI debe ser fácil de encontrar junto al alta de gasto compartido.

## 3. Métodos de reparto

| Método (UI)                | `splitMode`    | Qué introduce el usuario                           | Validación                                                             |
| -------------------------- | -------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| A partes iguales (defecto) | `EQUAL`        | Solo los participantes                             | ≥1 participante distinto del pagador; con cuenta compartida, ≥1 (P-15) |
| Por porcentajes            | `PERCENTAGE`   | Un porcentaje por participante (hasta 2 decimales) | Suma **exactamente** 100,00 % (A-02); cada uno > 0                     |
| Importes personalizados    | `FIXED_AMOUNT` | Un importe por participante                        | Suma **exactamente** el total (A-03); cada uno > 0                     |

- Los participantes con parte 0 no se incluyen (la BD exige `allocated_amount > 0`).
- Si el cálculo deja a algún participante con 0 (p. ej. 0,02 € entre 3, o un 1 % de 1,00 €), el gasto se **rechaza** (`SPLIT_SHARE_ZERO`); el usuario debe ajustar el importe, los participantes o el reparto.
- En porcentajes, la UI propone por defecto un reparto equitativo (p. ej. 33,33 / 33,33 / 33,34) que el usuario puede modificar antes de guardar.
- En importes personalizados, la UI muestra en todo momento el importe que falta o sobra para llegar al total; la API rechaza cualquier diferencia.

## 4. Reglas de reparto

Regla aprobada (B-04), aplicada **solo en el servidor**:

1. Los importes se expresan en las **unidades menores** de la moneda según ISO 4217 (EUR: 2 decimales; JPY: 0). Un total con más decimales de los que admite la moneda se rechaza.
2. Se calcula la parte teórica exacta de cada participante:
   - `EQUAL`: total / n.
   - `PERCENTAGE`: total × porcentaje / 100.
3. Se trunca cada parte a la unidad menor.
4. El resto (total − suma truncada) se reparte de unidad menor en unidad menor a los participantes con **mayor resto decimal**; en caso de empate, por `userId` ascendente.
5. Invariante: `Σ allocatedAmount = totalAmount`, garantizado también por un trigger diferido en BD.

Ejemplos:

| Gasto                                    | Resultado                                                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 120,00 € EQUAL entre 3                   | 40,00 / 40,00 / 40,00                                                                                                                                    |
| 100,00 € EQUAL entre 3                   | 33,33 × 3 = 99,99; resto 0,01 → un participante recibe 33,34 (empate de restos: decide el `userId` menor)                                                |
| 50,00 € PERCENTAGE 50 / 30 / 20          | 25,00 / 15,00 / 10,00                                                                                                                                    |
| 10,00 € PERCENTAGE 33,33 / 33,33 / 33,34 | Partes teóricas 3,333 / 3,333 / 3,334 → truncadas 3,33 / 3,33 / 3,33 (99 céntimos); el céntimo restante va al mayor resto (33,34 %) → 3,33 / 3,33 / 3,34 |
| 90,00 € PERCENTAGE 50 / 30 / 10          | Rechazado: suma 90 %                                                                                                                                     |
| 80,00 € FIXED_AMOUNT 50 / 20 / 5         | Rechazado: suma 75,00 ≠ 80,00                                                                                                                            |

## 5. Quién pagó y qué deuda genera

| Origen de pago                                             | Deuda que genera                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Un miembro** (efectivo, tarjeta propia, cuenta personal) | Cada participante distinto del pagador debe su participación al pagador. La participación del propio pagador es su consumo y no genera deuda. |
| **Cuenta compartida del espacio**                          | Ninguna entre miembros (P-04). Las participaciones indican quién consumió (informativo).                                                      |

Orígenes de pago aprobados (P-03): «pagado por un miembro» (`MEMBER`) y «cuenta compartida» (`SPACE_ACCOUNT`). El esquema actual aún tiene `CASH` y `EXTERNAL_PERSONAL`; la migración de la fase 6 los unifica. El pago desde una cuenta personal **registrada**, con su movimiento en el espacio personal, es una ampliación posterior (P-02) analizada en [accounts-model.md](./accounts-model.md).

El pagador **no tiene por qué ser participante**. Ejemplo: Ana compra un regalo de 60 € para Carlos y María → participantes Carlos y María (30 / 30) → cada uno debe 30 € a Ana.

## 6. Cálculo de deudas (P-08)

Las deudas no se almacenan: se calculan al leer, para cada espacio y **por moneda** (sin conversión), a partir de:

- gastos **no anulados** pagados por un miembro: `deuda(participante → pagador) += allocatedAmount`, para cada participante ≠ pagador;
- liquidaciones **no anuladas**: `deuda(from → to) −= amount`.

El resultado se presenta **neto por par** de miembros: si Carlos debe 40 € a Ana y Ana debe 10 € a Carlos por otro gasto, se muestra «Carlos debe 30 € a Ana». Sin simplificación multilateral en MVP (que María pague a Ana lo que debe a Carlos queda fuera; se podrá añadir como «sugerencia de liquidación» en una fase posterior).

También se muestra el **saldo neto por miembro** (lo que le deben menos lo que debe) en cada moneda.

Las deudas cambian automáticamente cuando se edita o anula un gasto o una liquidación.

## 7. Liquidaciones (A-08)

- Se registran a mano con: deudor (`from`), acreedor (`to`), importe, moneda, fecha (`occurredAt`) y nota opcional.
- Pueden ser **parciales** o **completas**; reducen la deuda del par por el importe registrado.
- No se vinculan a un gasto concreto: actúan sobre el saldo neto del par y la moneda.
- Liquidar más de lo pendiente: **permitido** (P-11); la API no rechaza por sobrepago; puede devolver aviso `SETTLEMENT_EXCEEDS_PENDING_DEBT`; el saldo neto puede cambiar de sentido.
- Fecha `occurredAt` declarada del pago; liquidaciones con **ex-miembros** permitidas (P-19).
- Permisos: P-10 (registrar/anular).
- No crean movimientos en cuentas en MVP (P-07).

## 8. Ejemplo de referencia (criterio de aceptación de las fases 6 y 7)

Espacio «Piso» con Ana, Carlos y María. Ana registra «Compra semanal», 120 €, pagada por Ana, a partes iguales entre los tres.

| Resultado                 | Valor                                |
| ------------------------- | ------------------------------------ |
| Participaciones           | Ana 40 €, Carlos 40 €, María 40 €    |
| Deudas                    | Carlos → Ana 40 €; María → Ana 40 €  |
| Saldo neto                | Ana +80 €; Carlos −40 €; María −40 € |
| Cuentas de Carlos y María | Sin cambios                          |

Carlos registra una liquidación de 15 € a Ana:

| Resultado  | Valor                                |
| ---------- | ------------------------------------ |
| Deudas     | Carlos → Ana 25 €; María → Ana 40 €  |
| Saldo neto | Ana +65 €; Carlos −25 €; María −40 € |

Si después se anula esa liquidación, la deuda de Carlos vuelve a 40 €. Si se edita el gasto a 90 €, las participaciones pasan a 30 € y, con la liquidación de 15 € vigente, Carlos debe 15 € y María 30 €.

La cuenta personal de Ana tampoco cambia salvo que registre el pago (hoy, como gasto propio en su espacio personal; en el futuro, con el vínculo de P-02).

## 9. Edición, anulación e historial (A-05)

- **Editar** un gasto: importe, fecha, concepto, categoría, pagador, participantes y método de reparto. El servidor recalcula las participaciones. Concurrencia optimista con `expectedVersion` (**409** si hay conflicto) y revisión inmutable con instantánea completa, participantes incluidos.
- **Anular**: anulación lógica (P-13). El gasto deja de contar en deudas y totales, pero sigue visible como «Anulado» con autor, fecha y motivo. Si se pagó con una cuenta compartida, el movimiento vinculado se anula en la misma operación y **el saldo de la cuenta se restaura**.
- **No hay borrado físico** de gastos ni liquidaciones.
- Permisos: P-09 (gastos) y P-10 (liquidaciones). La API devuelve **403** con un código estable si no se cumplen.
- Historial: cualquier miembro del espacio puede consultar las revisiones de un gasto o una liquidación.

## 10. Membresía

- Participantes y pagador deben ser miembros del espacio en `occurredAt` (intervalo `[joinedAt, leftAt)`); quien registra debe estar ACTIVE en el momento del registro.
- Un miembro que sale (LEFT/REMOVED) **conserva** sus participaciones, deudas y liquidaciones históricas.
- Liquidaciones con ex-miembros: P-19; aviso informativo al leave/remove si el saldo neto ≠ 0.

## 11. Fuera de alcance

Recordatorios o reclamaciones de deuda, cobros, verificación bancaria, conversión de moneda, simplificación multilateral de deudas (MVP), gastos recurrentes, adjuntos o tickets, y notificaciones por email.
