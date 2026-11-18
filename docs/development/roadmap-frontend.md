# Roadmap frontend (`apps/web`)

Entregas del chat de frontend. Las fases, sus dependencias y los criterios globales están en [roadmap.md](./roadmap.md); aquí solo el detalle de la web. Estado verificado el 2026-11-15.

Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente · 🔧 refactorización · ✨ nueva · ⛔ bloqueada (por la API o por una decisión).

---

## Hecho (fases 3–5)

| Área     | Implementado                                                                                                                                                                               | Rama   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Auth     | `/login`, `/register`, layout protegido `(app)`, logout                                                                                                                                    | `main` |
| Espacios | `/spaces`, `/spaces/new`, `/spaces/[id]` (miembros, invitaciones, leave/remove), `/invitations`, selector de espacio activo                                                                | `main` |
| Finanzas | `/accounts`, `/spaces/[id]/accounts` (+ `new`, `[accountId]`), categorías, `/spaces/[id]/transactions` (+ detalle con edición), transferencias, saldo inicial, `/spaces/[id]/expenses/new` | `main` |
| Tests    | Vitest para helpers (`lib/api`, `lib/spaces`, `lib/finance`); Playwright `e2e/auth.spec.ts`, `e2e/home.spec.ts` (fuera de la CI)                                                           | —      |

`/dashboard` redirige a `/spaces`; no hay dashboard financiero.

---

## F-R2 — 🔧 Alineación de la fase 5 (puede empezar ya)

| Entrega   | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Aceptación                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-R2.1 ✅ | Cerrar los cambios en curso (selector de categorías), PR y merge de `feat/web-phase-5-accounts`                                                                                                                                                                                                                                                                                                                                                                | `main` con la fase 5; CI en verde                                                                                                                                      |
| F-R2.2 ✅ | Renombrar el formulario actual de gasto en SHARED a «Gasto individual» (UI, `RecordSharedExpenseForm` → nombre neutro, `createSharedExpense` → `createAttributedExpense` o similar) y quitarlo del acceso principal (P-14). Ruta `/spaces/[id]/expenses/individual/new`, acceso secundario desde «Movimientos» (solo SHARED). Incluye **C-01**: en cuentas SHARED, sustituir «Registrar gasto» por un enlace al gasto individual con la cuenta preseleccionada | Ningún texto, ruta ni identificador llama «compartido» a un gasto sin reparto; el gasto desde una cuenta SHARED se completa contra la API real; tests RTL; CI en verde |
| F-R2.3 ✅ | Errores y copy: traducir por `code` (invitaciones, espacios, `VALIDATION_ERROR` cuando exista) sin mostrar nunca el `message` de la API; corregir el texto de `CANNOT_LEAVE_AS_SOLE_OWNER` (no prometer transferencia ni invitar OWNER)                                                                                                                                                                                                                        | Ningún texto en inglés de la API en la UI                                                                                                                              |
| F-R2.4 ✅ | UX sobre contratos existentes: selector de espacio que navega y se refresca; formateo de importes con `Intl.NumberFormat` desde el string; coma decimal; 409 en edición → recargar; aviso de éxito; sin «Versión»; fecha en las altas; `hasOpeningBalance` correcto; listado con dirección, cuenta y persona; edición de categoría cuando exista B-R1.1 (C-02)                                                                                                 | Flujos verificados a 375 px y 1024 px                                                                                                                                  |
| F-R2.5 ✅ | Transversal: `loading.tsx`, `error.tsx`, `not-found.tsx` en `(app)`; revisar `SyncActiveSpace`; reorganizar las acciones del detalle de cuenta; redirección a `/login` si caduca la sesión; tests RTL de formularios                                                                                                                                                                                                                                           | Sin pantalla de error genérica de Next ante un 5xx                                                                                                                     |
| F-R2.6 ✅ | **C-04:** en SHARED, enlace **Gasto individual** en `SpaceFinanceNav` junto a «Añadir gasto»; etiquetar el compartido de forma clara (p. ej. mantener «Añadir gasto» como compartido o «Gasto compartido»). Opcional: una línea de ayuda en la página del espacio. Actualizar tests de `space-finance-nav`                                                                                                                                                     | Desde cualquier vista de finanzas del espacio SHARED se llega al gasto individual sin pasar solo por movimientos                                                       |

## F-6 — ✨ Gastos compartidos (API B-6 lista)

| Entrega  | Contenido                                                                                                                                                                         | Aceptación                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| F-6.1 ✅ | «Añadir gasto» en SHARED: concepto, importe, fecha, categoría; pagador (por defecto, yo); participantes (por defecto, todos); método (por defecto, a partes iguales)              | El flujo habitual (pagado por mí, a partes iguales, todos) se completa sin tocar más que importe y concepto |
| F-6.2 ✅ | Porcentajes e importes personalizados: inputs por participante, contador de «falta / sobra», porcentaje equitativo propuesto, previsualización con `POST /preview` (con debounce) | Sin cálculo de reparto propio; los importes mostrados son los de la API; errores 400 traducidos por `code`  |
| F-6.3 ✅ | Listado de gastos del espacio y detalle: participaciones, «tu parte», «debes X a Ana» o «te deben…», estado «Anulado»                                                             | Ningún texto ni estado de «pendiente de confirmar»                                                          |
| F-6.4 ✅ | Editar (409 → recargar y avisar), anular con motivo y confirmación local, historial de revisiones                                                                                 | Las acciones sin permiso se ocultan, pero se gestiona el 403 de la API                                      |

## F-7 — ✨ Saldos y liquidaciones (tras B-7.2+ en API)

| Entrega | Contenido                                                                                                      | Aceptación                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| F-7.1 ✅ | Vista «Saldos»: quién debe a quién (neto) y saldo por miembro, por moneda; destacar lo que me afecta           | Ejemplo de referencia: «Carlos debe 25 € a Ana» tras liquidar 15 € |
| F-7.2 ✅ | «Registrar pago» desde una deuda (importe sugerido = pendiente, editable; aviso si supera la deuda según P-11) | Liquidación parcial y completa                                     |
| F-7.3 ✅ | Listado de liquidaciones y anulación                                                                           | Anular restaura la deuda en la vista                               |

Copy: «Registrar pago» o «Liquidar», nunca «Confirmar». Mensaje fijo: «Wealthspace no realiza ni verifica pagos».

## F-8 — ✨ Cuentas personales vinculadas y aportaciones ⛔ (B-8)

Opción «pagado desde mi cuenta…» (solo mis cuentas personales), aportaciones a la cuenta común, movimientos personal ↔ compartida. Se detallará al aprobar [accounts-model.md](../product/accounts-model.md).

## F-9 — ✨ Presupuestos, informes, dashboard y perfil ⛔ (B-9)

Edición de perfil y zona horaria, presupuestos, informes mensuales, dashboard global (sustituye la redirección de `/dashboard`).

## F-4.1 — ✨ Transferencia de ownership (paralela) ✅ (B-4.1)

UI en el detalle del espacio para el OWNER; actualizar los mensajes de `CANNOT_LEAVE_AS_SOLE_OWNER`.

## Transversal

- E2E Playwright para el flujo principal de las fases 6–7 (incorporar a la CI en la fase 10).
- Estados de carga, vacío y error en todas las vistas nuevas; accesibilidad de formularios con varios inputs por participante.

---

## Reglas para el chat de frontend

- Consume solo contratos **implementados** del catálogo [frontend-api-dependencies.md](./frontend-api-dependencies.md); el contrato orientativo de [api-design.md](../architecture/api-design.md) sirve para maquetar, no para inventar campos.
- No calcules repartos, deudas ni saldos como fuente de verdad. La validación de formato y de sumas es solo feedback de UX.
- Si falta un endpoint o un campo, pídelo al backend a través de coordinación; no lo simules.
- Copy en español, coherente con el glosario de [domain-model.md §4](../product/domain-model.md#4-glosario-ui--dominio).
