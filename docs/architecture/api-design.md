# Diseño de API REST

Prefijo `/api/v1`. JSON. Sesión por cookie HttpOnly. OpenAPI en `GET /api/v1/docs` (Swagger UI) y `GET /api/v1/docs-json`.

**Fuente de verdad de contratos:** el backend. Los endpoints **implementados** están catalogados con sus códigos de error en [frontend-api-dependencies.md](../development/frontend-api-dependencies.md) y en OpenAPI. Este documento fija las **convenciones** y el contrato **previsto** de las fases siguientes. Cuando el backend implemente un endpoint previsto, actualiza el catálogo y marca aquí cualquier desviación.

Reglas de dominio: [docs/product/](../product/). Integridad: [database-design.md](./database-design.md).

---

## Convenciones

| Tema               | Regla                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Rutas              | Recursos de espacio bajo `/spaces/:spaceId/...`. Siempre se comprueba la membresía ACTIVE del usuario en `spaceId`.                       |
| Anti-IDOR          | Recurso de otro espacio o sin membresía → **404** (`SPACE_NOT_FOUND`, `<RECURSO>_NOT_FOUND`), nunca 403 que revele su existencia.         |
| Permisos           | Miembro del espacio sin el rol o la relación necesarios → **403** con `code` estable (`INSUFFICIENT_ROLE`, `ATTRIBUTION_NOT_ALLOWED`, …). |
| Errores            | Cuerpo `{ statusCode, code, message }`. `code` en UPPER_SNAKE_CASE y estable; la web traduce por `code`, nunca por `message`.             |
| Importes           | Strings decimales (`"120.00"`), nunca `number`. Respuestas con 4 decimales salvo que se indique lo contrario.                             |
| Fechas             | ISO 8601 UTC (`occurredAt`).                                                                                                              |
| Moneda             | ISO 4217 en mayúsculas; sin conversión.                                                                                                   |
| Concurrencia       | Ediciones y anulaciones con `expectedVersion`; conflicto → **409** `VERSION_CONFLICT`.                                                    |
| Acciones de estado | `POST .../:id/<acción>` (`archive`, `void`, `revoke`, `leave`, …), sin body o con body mínimo; **204** o recurso actualizado.             |

## Concurrencia optimista

En una transacción de BD: leer el estado → insertar `FinancialRevision` (instantánea previa, `revisionNumber` secuencial) → `UPDATE ... WHERE version = expectedVersion` → si afecta a 0 filas, **409** y rollback → COMMIT. Sin `SELECT FOR UPDATE`. El cliente recarga y reintenta.

## SPACE_ACCOUNT

Una sola transacción de BD: INSERT del movimiento → INSERT del gasto compartido → INSERT de los participantes. Los constraint triggers `INITIALLY DEFERRED` validan al COMMIT; no se usa `SET CONSTRAINTS` global.

---

## Gastos compartidos, deudas y liquidaciones (previsto)

**Estado: no implementado.** Contrato orientativo derivado de [shared-expenses.md](../product/shared-expenses.md). Los puntos marcados con (P-xx) dependen de decisiones pendientes en [decisions.md](../product/decisions.md); el backend no los cierra por su cuenta.

### Endpoints

| Recurso                | Método | Ruta                                             | Notas                                                                   |
| ---------------------- | ------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Previsualizar reparto  | POST   | `/spaces/:spaceId/shared-expenses/preview`       | Mismo body que el alta; no persiste (P-16)                              |
| Crear gasto compartido | POST   | `/spaces/:spaceId/shared-expenses`               | **201** con el detalle                                                  |
| Listar gastos          | GET    | `/spaces/:spaceId/shared-expenses`               | Filtros: `from`, `to`, `participantUserId`, `includeVoided`; paginación |
| Detalle                | GET    | `/spaces/:spaceId/shared-expenses/:id`           | Incluye participantes, deudas generadas y `version`                     |
| Editar                 | PATCH  | `/spaces/:spaceId/shared-expenses/:id`           | `expectedVersion` + campos; recalcula el reparto                        |
| Anular                 | POST   | `/spaces/:spaceId/shared-expenses/:id/void`      | `expectedVersion`, `reason?` (P-13)                                     |
| Historial              | GET    | `/spaces/:spaceId/shared-expenses/:id/revisions` | Revisiones inmutables                                                   |
| Saldos del espacio     | GET    | `/spaces/:spaceId/balances`                      | Deudas netas por par y saldo por miembro, por moneda (P-08)             |
| Registrar liquidación  | POST   | `/spaces/:spaceId/settlements`                   | **201**                                                                 |
| Listar liquidaciones   | GET    | `/spaces/:spaceId/settlements`                   | Filtros: `userId`, `includeVoided`                                      |
| Anular liquidación     | POST   | `/spaces/:spaceId/settlements/:id/void`          | `expectedVersion`, `reason?` (P-10, P-13)                               |

Todas exigen espacio SHARED; si el espacio es PERSONAL → **400** `SHARED_SPACE_REQUIRED`.

### Body de alta (orientativo)

```json
{
  "description": "Compra semanal",
  "totalAmount": "120.00",
  "currency": "EUR",
  "occurredAt": "2026-11-14T18:00:00Z",
  "categoryId": "…",
  "payment": { "source": "MEMBER", "paidByUserId": "…ana…" },
  "split": { "mode": "EQUAL", "participantUserIds": ["…ana…", "…carlos…", "…maria…"] }
}
```

- `payment`: `{ "source": "MEMBER", "paidByUserId" }` o `{ "source": "SPACE_ACCOUNT", "accountId" }`. Los valores definitivos dependen de P-03.
- `split`:
  - `{ "mode": "EQUAL", "participantUserIds": [...] }`
  - `{ "mode": "PERCENTAGE", "shares": [{ "userId", "percent": "33.33" }] }`
  - `{ "mode": "FIXED_AMOUNT", "shares": [{ "userId", "amount": "50.00" }] }`
- `currency`: opcional si el espacio tiene `displayCurrency`. Con `SPACE_ACCOUNT` es la moneda de la cuenta.

### Respuesta de detalle (orientativa)

```json
{
  "id": "…",
  "description": "Compra semanal",
  "totalAmount": "120.00",
  "currency": "EUR",
  "occurredAt": "…",
  "splitMode": "EQUAL",
  "payment": { "source": "MEMBER", "paidByUserId": "…ana…" },
  "participants": [
    { "userId": "…ana…", "displayName": "Ana", "allocatedAmount": "40.00", "sharePercent": null },
    {
      "userId": "…carlos…",
      "displayName": "Carlos",
      "allocatedAmount": "40.00",
      "sharePercent": null
    },
    {
      "userId": "…maria…",
      "displayName": "María",
      "allocatedAmount": "40.00",
      "sharePercent": null
    }
  ],
  "generatedDebts": [
    { "fromUserId": "…carlos…", "toUserId": "…ana…", "amount": "40.00" },
    { "fromUserId": "…maria…", "toUserId": "…ana…", "amount": "40.00" }
  ],
  "recordedByUserId": "…ana…",
  "voidedAt": null,
  "version": 1
}
```

Una respuesta del espacio SHARED **nunca** incluye identificadores ni datos de cuentas personales.

### Saldos (orientativo)

```json
{
  "currencies": [
    {
      "currency": "EUR",
      "debts": [
        { "fromUserId": "…carlos…", "toUserId": "…ana…", "amount": "25.00" },
        { "fromUserId": "…maria…", "toUserId": "…ana…", "amount": "40.00" }
      ],
      "members": [
        { "userId": "…ana…", "net": "65.00" },
        { "userId": "…carlos…", "net": "-25.00" },
        { "userId": "…maria…", "net": "-40.00" }
      ]
    }
  ]
}
```

### Códigos de error propuestos

El backend los fija al implementar y actualiza el catálogo.

| Código                          | HTTP | Caso                                         |
| ------------------------------- | ---- | -------------------------------------------- |
| `SHARED_SPACE_REQUIRED`         | 400  | Operación en un espacio PERSONAL             |
| `SPLIT_PERCENT_SUM_INVALID`     | 400  | Los porcentajes no suman 100                 |
| `SPLIT_AMOUNT_SUM_INVALID`      | 400  | Los importes no suman el total               |
| `AMOUNT_PRECISION_INVALID`      | 400  | Más decimales de los que admite la moneda    |
| `INSUFFICIENT_PARTICIPANTS`     | 400  | No se cumple el mínimo (P-15)                |
| `DUPLICATE_PARTICIPANT`         | 400  | Usuario repetido                             |
| `PARTICIPANT_NOT_MEMBER`        | 400  | Participante sin membresía en `occurredAt`   |
| `PAYER_NOT_ALLOWED`             | 403  | El rol no permite indicar ese pagador (P-09) |
| `SHARED_EXPENSE_NOT_FOUND`      | 404  | Anti-IDOR                                    |
| `SHARED_EXPENSE_EDIT_FORBIDDEN` | 403  | Sin permiso para editar o anular (P-09)      |
| `ALREADY_VOIDED`                | 409  | Anular algo ya anulado o editar algo anulado |
| `SETTLEMENT_SAME_USER`          | 400  | `from = to`                                  |
| `SETTLEMENT_USER_NOT_MEMBER`    | 400  | Usuario sin membresía válida (B-07, P-19)    |
| `SETTLEMENT_FORBIDDEN`          | 403  | Sin permiso para registrar o anular (P-10)   |
| `VERSION_CONFLICT`              | 409  | `expectedVersion` desactualizada             |

## Liquidaciones — validación temporal

`POST .../settlements` con `occurredAt`: la pertenencia de `from` y `to` se valida en ese instante con `[joinedAt, leftAt)`, no en el momento del registro. Auditoría con `recordedByUserId` y `createdAt`. Caso de ex-miembros: P-19.

## Presupuestos e informes

Consumo en la moneda del presupuesto; sin conversión. Contrato pendiente de P-17.

## Documentación relacionada

- [Seguridad](./security.md)
- [Catálogo de endpoints implementados](../development/frontend-api-dependencies.md)
