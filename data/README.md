# /data — JSON Database Layer

Esta carpeta funciona como la capa de persistencia del sistema. Cada archivo `.json` representa una coleccion.

## Reglas

- Un archivo por coleccion, en singular y kebab-case.
- Cada archivo debe tener `_meta` y `records`.
- Los IDs usan el prefijo de la coleccion.
- Los esquemas Zod viven en `_schema/`.
- Los backups automaticos viven en `_backups/`.

## Flujo CRUD

```text
Request -> /api/data/[collection] -> esquema Zod -> json-db -> archivo JSON
									  |                     |
									  +-- error tipado      +-- backup previo
```

Para agregar una coleccion, crea `data/nombre.json`, define su esquema en
`data/_schema/nombre.schema.ts` y registralo en `data/_schema/registry.ts`. La API
acepta `GET`, `POST`, `PUT` y `DELETE`; las respuestas tienen `success`, `data` o
`error`, y `timestamp`.

| Codigo | Significado |
| --- | --- |
| `NOT_FOUND` | Coleccion o registro inexistente |
| `VALIDATION_ERROR` | Datos que no cumplen el esquema |
| `DUPLICATE_ID` | ID ya existente |
| `IO_ERROR` | Fallo leyendo o escribiendo el archivo |
| `READ_ONLY` | Escrituras bloqueadas en produccion |

La persistencia en archivos es adecuada para desarrollo local. En Vercel el
sistema se considera de solo lectura; la capa de produccion debe sustituirse
por un adapter persistente como Vercel KV antes de habilitar escrituras.