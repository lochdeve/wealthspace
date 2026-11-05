# @wealthspace/contracts

Paquete reservado para **contratos compartidos** entre `apps/web` y `apps/api`.

## Responsabilidad futura

- Tipos TypeScript alineados con la API (respuestas de listado, enums estables, códigos de error).
- Opcionalmente constantes de rutas o helpers sin lógica de negocio.

## Qué no incluir (por ahora)

- Duplicación de DTOs Nest con class-validator (permanecen en el API).
- Generación automática de SDK completa hasta que OpenAPI esté estable.
- Lógica de cálculo financiero (permanece en backend).

## Cuándo empezar a usarlo

Activar cuando aparezca **duplicación mantenida a mano** de los mismos tipos en web y api (≥2 recursos estables), o cuando el frontend necesite enums/códigos de error compartidos en muchos módulos.

Hasta entonces, el frontend puede tipar respuestas localmente o importar tipos generados desde OpenAPI (**PENDIENTE DE DECISIÓN** herramienta: openapi-typescript vs. hand-written).

## Uso en workspaces

Cuando exista código:

```json
"dependencies": {
  "@wealthspace/contracts": "*"
}
```

Desde apps vía `"@wealthspace/contracts": "workspace:*"` (pnpm workspaces).
