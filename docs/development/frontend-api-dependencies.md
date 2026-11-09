# Dependencias frontend ↔ API

El frontend (`apps/web`) consume únicamente la API REST (`apps/api`) bajo el prefijo `/api/v1`.

## Configuración

| Variable              | App | Uso                                                                        |
| --------------------- | --- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | web | Base URL de la API (p. ej. `http://localhost:3001`)                        |
| `WEB_ORIGIN`          | api | Origen permitido en CORS con credenciales (p. ej. `http://localhost:3000`) |

Sesión: cookie HttpOnly `wealthspace_session` (JWT), establecida por `POST /auth/login`. Las peticiones del navegador usan `credentials: 'include'`. En Server Components se reenvía la cookie hacia la API.

## Auth (Fase 3)

| Recurso  | Método | Ruta             | UI / uso                     | Estado backend |
| -------- | ------ | ---------------- | ---------------------------- | -------------- |
| Registro | POST   | `/auth/register` | `/register`                  | Implementado   |
| Login    | POST   | `/auth/login`    | `/login`                     | Implementado   |
| Logout   | POST   | `/auth/logout`   | Botón en layout `(app)`      | Implementado   |
| Perfil   | GET    | `/auth/me`       | Layout `(app)`, `/dashboard` | Implementado   |

### Códigos de error usados en UX

- `EMAIL_ALREADY_REGISTERED` (409) — registro
- `INVALID_CREDENTIALS` (401) — login
- `401` sin sesión — redirección a `/login` en rutas `(app)`

## Fuera de alcance (fases posteriores)

Espacios, cuentas, transacciones y dashboards financieros: sin llamadas desde el frontend hasta que existan endpoints y esta tabla se amplíe.
