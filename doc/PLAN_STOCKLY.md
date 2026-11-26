# Stockly · Plan técnico de implementación

> Sistema de Gestión y Control de Inventario · versión técnica 1.0, derivada del plan funcional de Yubeth Lucía Palomino Gómez
> Asignatura: Lógica y Programación (SIST0200) · Universidad Sergio Arboleda, Santa Marta · Docente: Jhonatan Castro Polo
> Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase Postgres + Zod · Despliegue en Vercel
> Ejecución: GitHub Copilot en modo Agente, con los prompts de `doc/PROMPTS_STOCKLY.md`

---

## Índice

0. [Cómo se usa este documento](#0-cómo-se-usa-este-documento)
1. [Punto de partida](#1-punto-de-partida)
2. [Advertencia de seguridad previa](#2-advertencia-de-seguridad-previa)
3. [Alcance](#3-alcance)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Estados del producto](#5-estados-del-producto)
6. [Reglas de negocio](#6-reglas-de-negocio)
7. [Casos de uso](#7-casos-de-uso)
8. [Modelo de datos](#8-modelo-de-datos)
9. [Cálculos económicos](#9-cálculos-económicos)
10. [Arquitectura del código](#10-arquitectura-del-código)
11. [Contratos de API](#11-contratos-de-api)
12. [Pantallas](#12-pantallas)
13. [Identidad visual](#13-identidad-visual)
14. [Dinero, fechas y zona horaria](#14-dinero-fechas-y-zona-horaria)
15. [Seguridad e integridad](#15-seguridad-e-integridad)
16. [Pruebas](#16-pruebas)
17. [Plan de ejecución](#17-plan-de-ejecución)
18. [Funcionalidades opcionales: módulo económico](#18-funcionalidades-opcionales-módulo-económico)
19. [Glosario](#19-glosario)

---

## 0. Cómo se usa este documento

Este plan es el documento rector del proyecto. Copilot lo lee antes de cada tarea y los prompts remiten a sus secciones por número. Si un prompt y este plan no coinciden, prevalece el plan.

| Archivo en el repositorio | Función |
|---|---|
| `doc/PLAN_STOCKLY.md` | Este documento |
| `doc/PROMPTS_STOCKLY.md` | Prompts en orden de ejecución |
| `doc/ESTADO_ACTUAL.md` | Radiografía del repositorio antes de empezar (lo crea P00) |
| `doc/ESTADO_EJECUCION.md` | Avance prompt por prompt |
| `doc/checkpoints/FASE_N_COMPLETADA.md` | Evidencia del cierre de cada fase |
| `.github/copilot-instructions.md` | Reglas permanentes que Copilot aplica en todas las conversaciones |

---

## 1. Punto de partida

### 1.1 Lo que ya existe y no se reconstruye

- Proyecto Next.js con TypeScript desplegado en Vercel.
- Proyecto Supabase conectado al despliegue.
- Login funcionando.
- Variables de entorno en `.env.local` (local) y en el proyecto de Vercel (producción).

### 1.2 Lo que se verifica en P00 antes de escribir código

| Aspecto | Por qué importa |
|---|---|
| Mecanismo del login (JWT propio en cookie, Supabase Auth u otro) | El adaptador `lib/auth/sesion.ts` debe envolverlo sin reescribirlo |
| Si el login ya distingue roles o solo autentica | Define cuánto agrega P03 para los roles trabajador y dueño |
| Ruta a la que redirige el login | Se cambia a `/panel` |
| Archivo de middleware existente | En Next.js 16 se llama `proxy.ts`; en versiones anteriores, `middleware.ts` |
| Variable de conexión directa a Postgres | El registro de ventas usa transacciones con `pg`; si no existe, se obtiene en P00 |
| Mecanismo de migraciones existente | Las tablas nuevas se aplican con ese mecanismo; si no existe, se crea `npm run db:migrar` |
| Versión de Tailwind | Define dónde se declaran los colores (sección 13) |
| Rutas `/panel` o `/api/panel` | No deben existir antes; si existen, se reporta el conflicto |
| Tablas previas llamadas `usuarios`, `productos` o `ventas` | Si existen, se reporta su estructura antes de crear las nuevas |

### 1.3 Regla sobre el login

El login existente no se reescribe. Solo se agrega:

1. Un adaptador `lib/auth/sesion.ts` que expone `obtenerUsuario()`, `exigirUsuario()` y `exigirDueno()` usando el mecanismo que ya existe.
2. Protección de las rutas `/panel/*` y `/api/panel/*`.
3. La redirección posterior al login hacia `/panel`.
4. El vínculo entre la cuenta del login y el rol (trabajador o dueño) de la tabla `usuarios`, resuelto en P03 según lo que P00 encuentre.

---

## 2. Advertencia de seguridad previa

El plan funcional entregado incluía credenciales reales (contraseña del usuario, contraseña de Postgres, `SERVICE_ROLE_KEY`, `JWT_SECRET` y un token de Vercel). Antes de ejecutar estos prompts:

1. **Rotar las llaves de Supabase:** panel de Supabase, Settings, API, "Roll" de la `anon key` y la `service_role key`.
2. **Cambiar la contraseña de la base de datos:** Settings, Database, "Reset database password".
3. **Cambiar la contraseña del usuario de login** expuesto.
4. **Confirmar que `.env.local` está en `.gitignore`** y que ningún archivo del repositorio ni de la entrega contiene valores de variables de entorno.
5. **No volver a pegar un archivo `.env` en un documento.** Cuando haga falta mostrar la configuración, se escriben solo los NOMBRES de las variables.

El `SERVICE_ROLE_KEY` salta toda la seguridad de la base de datos: mientras no se rote, cualquiera que haya visto el documento puede leer y modificar los datos. Este paso es obligatorio y previo a todo lo demás.

---

## 3. Alcance

### 3.1 Módulo mínimo

| ID | Funcionalidad (plan funcional) | Requerimientos | Casos de uso | Prompts |
|---|---|---|---|---|
| F1 | Acceso por rol (trabajador y dueño) | RF-01, RF-02 | CU-01 | P03, P07 |
| F2 | Registrar entrada de mercancía | RF-03 | CU-03 | P04, P05, P08 |
| F3 | Consultar y controlar el inventario | RF-04 | CU-02 | P04, P05, P08 |
| F4 | Registrar ventas | RF-05 | CU-04 | P04, P05, P09 |
| F5 | Actualizar inventario y disponibilidad tras la venta | RF-06, RF-07 | CU-05 | P02, P04, P09 |
| F6 | Administrar usuarios (dueño) | RF-09 | CU-07 | P05, P10 |

### 3.2 Módulo opcional (económico)

| ID | Funcionalidad | Requerimientos | Casos de uso | Prompts |
|---|---|---|---|---|
| F7 | Precio de compra e información económica para el dueño | RF-08 | CU-06 | P11 |

F7 solo se construye con la fase 6 cerrada. El precio de compra se captura y se muestra únicamente en el módulo económico; el módulo mínimo no lo usa.

### 3.3 Fuera de alcance

Se mantiene la lista del plan funcional: pagos a clientes o proveedores, facturación electrónica, pedidos automáticos, envíos, tienda virtual, varias sucursales, descuentos y promociones, cálculo de impuestos, y reportes avanzados o gráficos.

### 3.4 Ajustes respecto al plan funcional

| Plan funcional | Plan técnico | Motivo |
|---|---|---|
| Node.js, sin framework de interfaz definido | Next.js desplegado en Vercel | Es el proyecto del semestre y ya está desplegado |
| Usuarios con `usuario` y `contraseña` propios en la tabla | El login existente autentica; la tabla `usuarios` guarda el rol y se vincula a la cuenta del login | No se reescribe la autenticación (sección 1.3). Las contraseñas no se guardan en texto plano (RNF-01) |
| Precio de compra como campo del producto desde el inicio | El precio de compra pertenece al módulo económico opcional (F7) | El plan funcional lo marca como opcional y restringido al dueño; en el módulo mínimo el producto se registra sin él |
| Venta guarda `referencia` y `talla` | La venta guarda `producto_id` y, además, una copia de referencia, talla y precio de venta del momento | La referencia y la talla identifican el producto para registrar; la copia conserva el historial aunque el producto cambie (regla 28) |
| "La combinación referencia + talla es única" | UNIQUE case-insensitive sobre referencia normalizada + talla normalizada | Evita que "CAM001"/"cam001" o "m"/"M" creen registros separados (reglas 8 y 14) |
| Montos decimales | Montos en pesos enteros (`INTEGER`) | El peso colombiano no usa centavos; los decimales causan errores de redondeo en los cálculos económicos (sección 14) |

### 3.5 Decisiones de alcance de esta versión técnica

| Decisión | Motivo |
|---|---|
| El re-stock de una referencia y talla existente SUMA a la cantidad, nunca reemplaza | Regla 14 |
| Las ventas no se editan ni se eliminan | Son el historial que sostiene la ganancia realizada (reglas 28, 37 y 38) |
| Un producto no se elimina; se puede desactivar solo si su cantidad es 0 | Un producto con ventas debe seguir en el historial |
| La disponibilidad es un dato calculado a partir de la cantidad, no un campo que se edite a mano | Reglas 16 y 17; evita que disponibilidad y cantidad se contradigan |
| El dueño no puede quitarse a sí mismo el rol de dueño ni desactivar su propia cuenta | Evita dejar el sistema sin ningún dueño |
| La fecha de entrada se puede elegir (no posterior a hoy); la fecha de venta la pone el sistema | Reglas 13 y 29 |

---

## 4. Roles y permisos

| Recurso / Acción | Trabajador | Dueño |
|---|:-:|:-:|
| Iniciar sesión | Sí | Sí |
| Consultar inventario (sin precio de compra) | Sí | Sí |
| Registrar entrada de mercancía | Sí | Sí |
| Registrar ventas | Sí | Sí |
| Ver y registrar precio de compra (F7) | No | Sí |
| Ver información económica: inversión, ganancias (F7) | No | Sí |
| Administrar usuarios | No | Sí |

Reglas de acceso (plan funcional, reglas 4 a 7):

- El trabajador nunca ve el precio de compra ni ningún cálculo económico. Las respuestas de API dirigidas al trabajador no incluyen esos campos (sección 11).
- Toda operación exclusiva del dueño se verifica en el servidor con `exigirDueno()`, aunque la interfaz ya oculte la opción.
- Si un usuario intenta una operación fuera de su rol, el sistema responde con el error `SIN_PERMISO`.

---

## 5. Estados del producto

El producto no tiene una máquina de estados; su disponibilidad se deriva de la cantidad.

| Condición | `disponible` (calculado) | Etiqueta en pantalla |
|---|:-:|---|
| `cantidad > 0` | verdadero | Disponible |
| `cantidad = 0` | falso | Agotado |
| `activo = false` | — | Inactivo (badge gris, no entra en inventario ni en cálculos) |

`disponible` no se guarda como columna editable: la vista y las consultas lo calculan con `cantidad > 0` (reglas 16 y 17). Un producto inactivo no aparece en el inventario operativo ni en los cálculos económicos, pero se conserva para el historial de ventas.

---

## 6. Reglas de negocio

| ID | Regla | Origen | Dónde se aplica |
|---|---|---|---|
| RN-01 | Hay dos roles: `trabajador` y `dueno` | Regla 1 | BD CHECK; `lib/reglas/roles.ts` |
| RN-02 | El nombre de usuario es único | Regla 2 | Según lo resuelto en P03 para el vínculo con el login |
| RN-03 | La contraseña tiene al menos 6 caracteres y no se guarda en texto plano | Regla 3, RNF-01 | Mecanismo del login; nunca se almacena en la tabla `usuarios` |
| RN-04 | El trabajador no accede a precio de compra ni a cálculos económicos | Reglas 4, 5, 19 | `exigirDueno()`; serialización por rol (sección 11) |
| RN-05 | El dueño puede todo lo del trabajador, más economía y administración de usuarios | Regla 6 | `exigirDueno()` |
| RN-06 | Una operación fuera del rol se rechaza con `SIN_PERMISO` | Regla 7 | `exigirDueno()` y verificación en cada ruta |
| RN-07 | La combinación referencia + talla es única e identifica al producto | Reglas 8, 14 | `lib/reglas/producto.ts` `clave()`; BD índice único sobre valores normalizados |
| RN-08 | La cantidad al registrar es un entero mayor que 0 | Reglas 9, 40, 41 | Dominio; Zod; BD CHECK |
| RN-09 | El precio de venta es un entero mayor que 0 | Reglas 11, 42 | Dominio; Zod; BD CHECK |
| RN-10 | (Módulo económico) El precio de compra es un entero mayor que 0 | Reglas 10, 42 | Sección 18 |
| RN-11 | (Módulo económico) El precio de venta es mayor que el precio de compra | Reglas 12, 34, 43, 44 | Sección 18 |
| RN-12 | La fecha de entrada no es posterior a hoy (zona `America/Bogota`) | Regla 13 | `lib/reglas/fechas.ts`; Zod |
| RN-13 | Registrar una referencia y talla existente SUMA la cantidad al producto; no crea otro registro | Regla 14 | Servicio `registrarEntrada`; dominio |
| RN-14 | Un producto con cantidad mayor que 0 está disponible; con cantidad 0 está agotado | Reglas 15, 16, 17 | Columna calculada / vista |
| RN-15 | El inventario se filtra por referencia, marca o talla, solos o combinados | Regla 18 | `listarInventario` |
| RN-16 | Para vender, referencia, talla y cantidad son obligatorias; la cantidad es un entero mayor que 0 | Reglas 21, 22 | Dominio; Zod |
| RN-17 | La venta verifica que el producto exista por referencia y talla | Regla 23 | Servicio `registrarVenta` |
| RN-18 | La cantidad vendida no puede superar la disponible; si la supera, se rechaza y el inventario no cambia | Reglas 24, 25, 46 | Dominio `validarVenta`; transacción con bloqueo |
| RN-19 | Vender toda la cantidad disponible deja la cantidad en 0 y el producto agotado | Reglas 26, 45 | Servicio; columna calculada |
| RN-20 | Tras una venta parcial, cantidad nueva = cantidad anterior menos cantidad vendida | Regla 27 | Servicio |
| RN-21 | Cada venta guarda el precio de venta vigente en ese momento | Regla 28 | Servicio: copia `precio_venta` del producto |
| RN-22 | La fecha de venta la asigna el sistema | Regla 29 | Servicio: `hoyBogota()` |
| RN-23 | (Económico) Inversión de un producto = precio de compra por cantidad disponible | Reglas 30, 31, 32 | Sección 18 |
| RN-24 | (Económico) Ganancia por unidad = precio de venta menos precio de compra, siempre mayor que 0 | Reglas 33, 34 | Sección 18 |
| RN-25 | (Económico) Ganancia potencial = ganancia por unidad por cantidad disponible; 0 si la cantidad es 0 | Reglas 35, 36, 39 | Sección 18 |
| RN-26 | (Económico) Ganancia realizada = suma de (precio de venta de la venta menos precio de compra) por cantidad vendida | Reglas 37, 38 | Sección 18 |
| RN-27 | Si no hay ventas, la ganancia realizada total es 0; si no hay coincidencias de búsqueda, se informa sin modificar datos | Reglas 48, 49 | Consultas |
| RN-28 | Las ventas son inmutables; un producto no se elimina y solo se desactiva con cantidad 0 | Agregada | Servicio; BD `ON DELETE RESTRICT` |

### 6.1 Casos límite (reglas 40 a 49 del plan funcional)

| Caso | Resultado |
|---|---|
| Registrar cantidad 0 o negativa | Rechazado (`DATOS_INVALIDOS`) |
| Precio de venta 0 (o, en económico, precio de compra 0) | Rechazado (`DATOS_INVALIDOS`) |
| (Económico) Precio de venta igual o menor al de compra | Rechazado (`PRECIO_VENTA_NO_SUPERA_COMPRA`) |
| Vender exactamente toda la cantidad disponible | Venta válida; cantidad 0; producto agotado |
| Vender una unidad con cantidad disponible 0 | Rechazado (`STOCK_INSUFICIENTE`) |
| Registrar referencia y talla existentes | Suma la cantidad al producto existente (RN-13) |
| Búsqueda sin coincidencias | Lista vacía con mensaje; sin cambios |
| Sin ventas registradas | Ganancia realizada total 0 |

---

## 7. Casos de uso

| ID | Actor | Entrada | Precondición | Efecto | Errores posibles |
|---|---|---|---|---|---|
| CU-01 Iniciar sesión | Trabajador o dueño | credenciales del login | — | Sesión con rol; redirige a `/panel` | manejados por el login |
| CU-02 Consultar inventario | Trabajador o dueño | filtros: referencia, marca, talla, disponibilidad | — | Lista de productos; sin precio de compra para el trabajador | `DATOS_INVALIDOS` |
| CU-03 Registrar entrada | Trabajador o dueño | referencia, marca, descripción, talla, cantidad, precio de venta, fecha de entrada | cantidad y precio válidos; fecha no futura | Producto creado o cantidad sumada si ya existía (RN-13); evento `ENTRADA_REGISTRADA` | `DATOS_INVALIDOS`, `FECHA_FUTURA` |
| CU-04 Registrar venta | Trabajador o dueño | referencia, talla, cantidad | producto existe; cantidad disponible suficiente | Venta creada; cantidad descontada; disponibilidad recalculada; evento `VENTA_REGISTRADA` | `PRODUCTO_NO_ENCONTRADO`, `STOCK_INSUFICIENTE`, `DATOS_INVALIDOS` |
| CU-05 Actualizar inventario | Sistema | la venta registrada | dentro de CU-04 | Cantidad y disponibilidad actualizadas en la misma transacción | — |
| CU-06 Consultar economía (F7) | Dueño | filtros opcionales | módulo económico activo | Inversión total, ganancia potencial y realizada, y por producto | `SIN_PERMISO` |
| CU-07 Administrar usuarios | Dueño | datos de usuario y rol | es dueño | Usuario creado, con rol cambiado o desactivado | `SIN_PERMISO`, `DATOS_INVALIDOS`, `USUARIO_DUPLICADO`, `ULTIMO_DUENO` |
| CU-08 Editar producto | Trabajador o dueño | marca, descripción, precio de venta | producto existe | Datos actualizados; evento `PRODUCTO_ACTUALIZADO` | `DATOS_INVALIDOS`, `PRODUCTO_NO_ENCONTRADO` |
| CU-09 Desactivar producto | Dueño | producto | cantidad 0 | Producto inactivo | `SIN_PERMISO`, `PRODUCTO_CON_EXISTENCIAS` |

### 7.1 Secuencia de CU-04 (registro de venta)

Todo ocurre dentro de `conTransaccion`:

1. `validarVenta` sobre los datos de entrada (cantidad entera mayor que 0).
2. `SELECT ... FROM productos WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true FOR UPDATE` (si no existe: `PRODUCTO_NO_ENCONTRADO`). El bloqueo evita que dos ventas simultáneas descuenten sobre la misma cantidad.
3. Si `cantidad_vendida > cantidad`: `STOCK_INSUFICIENTE`; la transacción se revierte y el inventario no cambia (RN-18).
4. Insertar la venta con copia de referencia, talla y `precio_venta` del producto, y `fecha_venta = hoyBogota()`.
5. `UPDATE productos SET cantidad = cantidad - $1`. La disponibilidad se recalcula sola (columna generada o vista).
6. Insertar el evento `VENTA_REGISTRADA`.
7. Confirmar y devolver la venta y la cantidad resultante.

```ts
export async function registrarVenta(d: DatosVenta, usuarioId: string): Promise<ResultadoVenta> {
  validarVenta(d);
  return conTransaccion(async (tx) => {
    const producto = await bloquearProductoPorClave(tx, d.referencia, d.talla);
    if (d.cantidad > producto.cantidad) {
      throw new ErrorDeNegocio('STOCK_INSUFICIENTE', undefined, { disponible: producto.cantidad });
    }
    const venta = await insertarVenta(tx, {
      productoId: producto.id, referencia: producto.referencia, talla: producto.talla,
      cantidad: d.cantidad, precioVenta: producto.precioVenta, fecha: hoyBogota(),
    });
    const nuevaCantidad = producto.cantidad - d.cantidad;
    await actualizarCantidad(tx, producto.id, nuevaCantidad);
    await registrarEvento(tx, { tipo: 'VENTA_REGISTRADA', productoId: producto.id, usuarioId,
      detalle: { ventaId: venta.id, cantidad: d.cantidad, cantidadResultante: nuevaCantidad } });
    return { venta, cantidadResultante: nuevaCantidad, agotado: nuevaCantidad === 0 };
  });
}
```

---

## 8. Modelo de datos

### 8.1 Relaciones

```text
usuarios 1 ──── N ventas   (quién registró la venta)
productos 1 ─── N ventas
productos 1 ─── N eventos_inventario

v_productos = productos + disponible (cantidad > 0)
```

Las migraciones se guardan en `supabase/migrations/` y continúan la numeración existente (P00 la identifica). En este documento se nombran M1 y M2; el módulo económico agrega M3 (sección 18).

### 8.2 M1 · Tablas

```sql
-- M1: tablas del módulo mínimo de Stockly

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_ref    TEXT          UNIQUE,                 -- vínculo con la cuenta del login (se define en P03)
  nombre      VARCHAR(120)  NOT NULL,
  usuario     VARCHAR(60)   NOT NULL,
  rol         VARCHAR(12)   NOT NULL CHECK (rol IN ('trabajador', 'dueno')),  -- RN-01
  activo      BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_usuario ON usuarios (lower(btrim(usuario)));  -- RN-02

CREATE TABLE IF NOT EXISTS productos (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia       VARCHAR(60)   NOT NULL,
  clave_referencia VARCHAR(60)   GENERATED ALWAYS AS (upper(btrim(referencia))) STORED,
  marca            VARCHAR(80)   NOT NULL,
  descripcion      VARCHAR(200)  NOT NULL,
  talla            VARCHAR(20)   NOT NULL,
  clave_talla      VARCHAR(20)   GENERATED ALWAYS AS (upper(btrim(talla))) STORED,
  cantidad         INTEGER       NOT NULL,
  precio_venta     INTEGER       NOT NULL,
  precio_compra    INTEGER,                          -- se usa solo en el módulo económico (F7)
  fecha_entrada    DATE          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_cantidad_valida    CHECK (cantidad >= 0),              -- RN-08 (entrada > 0; venta puede dejar 0)
  CONSTRAINT productos_precio_venta_valido CHECK (precio_venta > 0),          -- RN-09
  CONSTRAINT productos_precio_compra_valido CHECK (precio_compra IS NULL OR precio_compra > 0),
  CONSTRAINT productos_referencia_minima  CHECK (char_length(btrim(referencia)) >= 1),
  CONSTRAINT productos_talla_minima       CHECK (char_length(btrim(talla)) >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_ref_talla
  ON productos (clave_referencia, clave_talla);       -- RN-07
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos (lower(marca));
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo, cantidad);

CREATE TABLE IF NOT EXISTS ventas (
  id              BIGSERIAL     PRIMARY KEY,
  producto_id     UUID          NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,  -- RN-28
  usuario_id      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  referencia      VARCHAR(60)   NOT NULL,            -- copia al momento de la venta
  talla           VARCHAR(20)   NOT NULL,
  cantidad        INTEGER       NOT NULL,
  precio_venta    INTEGER       NOT NULL,            -- RN-21: precio vigente en la venta
  fecha_venta     DATE          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ventas_cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT ventas_precio_positivo   CHECK (precio_venta > 0)
);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas (producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha    ON ventas (fecha_venta DESC);

CREATE TABLE IF NOT EXISTS eventos_inventario (
  id           BIGSERIAL     PRIMARY KEY,
  producto_id  UUID          REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id   UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo         VARCHAR(30)   NOT NULL,
  detalle      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eventos_producto ON eventos_inventario (producto_id, created_at DESC);

CREATE OR REPLACE FUNCTION stockly_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION stockly_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION stockly_actualizar_updated_at();
```

### 8.3 M2 · Vista del inventario y seguridad

```sql
-- M2: vista del inventario y cierre de acceso público

CREATE OR REPLACE VIEW v_productos
WITH (security_invoker = true) AS
SELECT
  p.*,
  (p.cantidad > 0) AS disponible                     -- RN-14
FROM productos p;

ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_inventario  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON usuarios, productos, ventas, eventos_inventario FROM anon, authenticated;
REVOKE ALL ON v_productos FROM anon, authenticated;
```

En el esquema inicial, las tablas quedan sin políticas y el acceso ocurre en el servidor mediante la conexión directa a Postgres. La migración multiempresa añade políticas de lectura vinculadas a la empresa de la sesión, sin abrir escrituras directas a la clave pública. Esto sostiene RN-04: el precio de compra solo se sirve cuando el servidor confirma que el usuario es dueño.

### 8.3 Registro público y aislamiento por negocio

El registro público crea una identidad en Supabase Auth y, en una sola transacción Postgres, un negocio vacío, su sucursal principal, el perfil de dueño y las membresías correspondientes. Los datos legados se asignan al negocio inicial; cada consulta y escritura posterior se limita al `empresa_id` resuelto desde el perfil autenticado en el servidor, nunca desde un valor enviado por el navegador. Las restricciones compuestas protegen las relaciones y claves idempotentes entre negocios. La administración de sucursales múltiples no forma parte del alcance de esta versión.

### 8.4 Traducción de errores de la base de datos

| Código Postgres | Restricción | Código de negocio |
|---|---|---|
| `23505` | `ux_productos_ref_talla` | `PRODUCTO_DUPLICADO` (no debería ocurrir: el re-stock suma; ver RN-13) |
| `23505` | `ux_usuarios_usuario` | `USUARIO_DUPLICADO` |
| `23503` | llaves foráneas (`ON DELETE RESTRICT`) | `PRODUCTO_CON_VENTAS` |
| `23514` | cualquier CHECK | `DATOS_INVALIDOS` |
| Otro | | `ERROR_INTERNO` (se registra en consola, no se muestra al usuario) |

---

## 9. Cálculos económicos

Las fórmulas se definen aquí para referencia; su implementación es el módulo opcional (sección 18). Todas operan con pesos enteros.

| Cálculo | Fórmula | Regla |
|---|---|---|
| Ganancia por unidad | `precio_venta - precio_compra` | RN-24 |
| Inversión de un producto | `precio_compra × cantidad` (solo productos activos) | RN-23 |
| Inversión total | suma de la inversión de los productos activos | RN-23 |
| Ganancia potencial de un producto | `(precio_venta - precio_compra) × cantidad` | RN-25 |
| Ganancia potencial total | suma de la ganancia potencial de los productos activos | RN-25 |
| Ganancia realizada de una venta | `(venta.precio_venta - producto.precio_compra) × venta.cantidad` | RN-26 |
| Ganancia realizada total | suma de la ganancia realizada de todas las ventas | RN-26, RN-27 |

La ganancia realizada usa el precio de venta guardado en la venta (RN-21) y el precio de compra actual del producto. Un producto con cantidad 0 aporta 0 a la inversión y a la ganancia potencial (RN-25), pero sus ventas siguen contando en la ganancia realizada.

---

## 10. Arquitectura del código

### 10.1 Capas

```text
Pantallas (app/panel/*) ────┐
                            ├──► Rutas API (app/api/panel/*) ──► lib/dataService.ts ──► lib/datos/* ──► Postgres
Componentes (components/*) ─┘          │                                 │
                                       └──── lib/validacion (Zod)        └──── lib/reglas/* (funciones puras)
```

- `lib/reglas/`: reglas como funciones puras. No importan `pg`, no leen variables de entorno y no leen el reloj (excepto `fechas.ts`). Se prueban con Vitest.
- `lib/datos/`: consultas SQL y casos de uso con transacciones. Solo este directorio importa `lib/db/conexion.ts`.
- `lib/dataService.ts`: fachada única. Las rutas y páginas importan datos solo desde aquí.
- Rutas API: validan con Zod, verifican sesión y rol, llaman a `dataService` y responden con `lib/http/respuestas.ts`. Serializan según el rol (sección 11).
- Las páginas (componentes de servidor) pueden leer con `dataService`. Las acciones que modifican datos se hacen desde componentes cliente que llaman a `/api/panel/*` y luego ejecutan `router.refresh()`.

### 10.2 Árbol de archivos nuevos

```text
.github/copilot-instructions.md
doc/ESTADO_ACTUAL.md
doc/ESTADO_EJECUCION.md
doc/checkpoints/FASE_N_COMPLETADA.md

supabase/migrations/NNNN_stockly_tablas.sql
supabase/migrations/NNNN_stockly_vista_seguridad.sql

scripts/migrar.mjs                 (solo si no existe mecanismo de migraciones)
scripts/verificar-bd.mjs
scripts/vincular-dueno.mjs         (asigna el primer dueño; ver P03)
scripts/probar-flujo.ts
scripts/limpiar-prueba.mjs
scripts/cargar-demo.ts

lib/config/stockly.ts
lib/reglas/errores.ts
lib/reglas/fechas.ts
lib/reglas/roles.ts
lib/reglas/producto.ts
lib/reglas/venta.ts
lib/reglas/economia.ts             (se completa en el módulo opcional)
lib/validacion/esquemas.ts
lib/db/conexion.ts
lib/auth/sesion.ts
lib/http/respuestas.ts
lib/formato.ts
lib/datos/tipos.ts
lib/datos/eventos.ts
lib/datos/usuarios.ts
lib/datos/productos.ts
lib/datos/ventas.ts
lib/datos/economia.ts              (se completa en el módulo opcional)
lib/dataService.ts

tests/reglas/ayudas.ts
tests/reglas/producto.test.ts
tests/reglas/venta.test.ts
tests/reglas/fechas.test.ts
tests/reglas/economia.test.ts      (módulo opcional)
vitest.config.ts

app/page.tsx                                  (solo si hoy es la plantilla de Next.js)
app/panel/layout.tsx
app/panel/page.tsx                            (resumen)
app/panel/inventario/page.tsx
app/panel/inventario/nuevo/page.tsx
app/panel/inventario/[id]/page.tsx
app/panel/ventas/page.tsx
app/panel/ventas/nueva/page.tsx
app/panel/usuarios/page.tsx                   (solo dueño)
app/panel/economia/page.tsx                   (módulo opcional, solo dueño)

app/api/panel/sesion/route.ts
app/api/panel/resumen/route.ts
app/api/panel/productos/route.ts
app/api/panel/productos/[id]/route.ts
app/api/panel/productos/[id]/desactivar/route.ts
app/api/panel/ventas/route.ts
app/api/panel/usuarios/route.ts
app/api/panel/usuarios/[id]/route.ts
app/api/panel/economia/route.ts               (módulo opcional)

components/ui/Boton.tsx
components/ui/Campo.tsx
components/ui/Selector.tsx
components/ui/Tarjeta.tsx
components/ui/Insignia.tsx
components/ui/Aviso.tsx
components/ui/Modal.tsx
components/ui/EstadoVacio.tsx
components/panel/NavegacionPanel.tsx
components/panel/InsigniaDisponibilidad.tsx
components/panel/InsigniaRol.tsx
components/panel/TablaInventario.tsx
components/panel/FiltrosInventario.tsx
components/panel/FormularioProducto.tsx
components/panel/FormularioVenta.tsx
components/panel/BuscadorProducto.tsx
components/panel/TablaVentas.tsx
components/panel/TablaUsuarios.tsx
components/panel/FormularioUsuario.tsx
components/panel/TarjetasEconomia.tsx         (módulo opcional)
```

### 10.3 Responsabilidades y prohibiciones

| Regla de código | Motivo |
|---|---|
| Identificadores, comentarios y mensajes en español | Coherencia con el dominio y con el plan funcional |
| Las reglas solo viven en `lib/reglas/` | Una sola fuente de verdad, probada con Vitest |
| Solo `lib/datos/` importa `lib/db/conexion.ts` | Las rutas no escriben SQL |
| Las rutas solo importan datos desde `lib/dataService.ts` | Fachada única de acceso a datos |
| Toda ruta `/api/panel/*` llama `exigirUsuario()`; las de economía y usuarios, `exigirDueno()`, como primera instrucción | RN-04, RN-06 |
| El precio de compra y los campos económicos nunca se incluyen en una respuesta a un trabajador | RN-04; serialización por rol (sección 11) |
| Montos como `number` entero en pesos; nunca decimales | Sección 14 |
| Fechas como texto `YYYY-MM-DD` entre capas | Evita errores de zona horaria (sección 14) |
| La referencia y la talla se normalizan antes de buscar o comparar | RN-07 |
| `params` de rutas dinámicas se obtiene con `await params` | Next.js 15 y 16 entregan `params` como Promise |
| No modificar archivos del login salvo la redirección indicada en P03 | Sección 1.3 |

### 10.4 Configuración

```ts
// lib/config/stockly.ts
export const ROLES = ['trabajador', 'dueno'] as const;
export const CONTRASENA_MINIMA = 6;        // RN-03 (si el login la gestiona, es referencia)
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 300;         // filas máximas por consulta de inventario o ventas
export const MODULO_ECONOMICO_ACTIVO = false;  // se pone en true en el módulo opcional (P11)
```

### 10.5 Firmas de las reglas puras

```ts
// lib/reglas/errores.ts
export type CodigoError =
  | 'DATOS_INVALIDOS' | 'NO_AUTORIZADO' | 'SIN_PERMISO'
  | 'PRODUCTO_NO_ENCONTRADO' | 'PRODUCTO_DUPLICADO' | 'PRODUCTO_CON_VENTAS' | 'PRODUCTO_CON_EXISTENCIAS'
  | 'FECHA_FUTURA' | 'STOCK_INSUFICIENTE'
  | 'USUARIO_DUPLICADO' | 'USUARIO_NO_ENCONTRADO' | 'ULTIMO_DUENO'
  | 'PRECIO_VENTA_NO_SUPERA_COMPRA' | 'ERROR_INTERNO';
export const MENSAJES: Record<CodigoError, string>;     // sección 11.2
export const ESTADO_HTTP: Record<CodigoError, number>;  // sección 11.2
export class ErrorDeNegocio extends Error {
  constructor(public codigo: CodigoError, mensaje?: string, public detalles?: unknown);
}

// lib/reglas/fechas.ts
export function hoyBogota(reloj?: Date): string;                    // 'YYYY-MM-DD'
export function esFechaValida(fecha: string): boolean;             // formato y fecha real
export function esFechaFutura(fecha: string, hoy: string): boolean;

// lib/reglas/roles.ts
export type Rol = 'trabajador' | 'dueno';
export function esDueno(rol: Rol): boolean;
export function puedeVerEconomia(rol: Rol): boolean;               // solo dueño

// lib/reglas/producto.ts
export function normalizarReferencia(referencia: string): string;  // trim + mayúsculas
export function normalizarTalla(talla: string): string;            // trim + mayúsculas
export function clave(referencia: string, talla: string): string;  // 'CAM001|M'
export function calcularDisponible(cantidad: number): boolean;     // cantidad > 0
export function validarEntrada(d: {
  referencia: string; marca: string; descripcion: string; talla: string;
  cantidad: number; precioVenta: number; fechaEntrada: string; hoy: string;
}): void;
// Orden: campos no vacíos → cantidad entera > 0 → precioVenta entero > 0 → fecha válida y no futura

// lib/reglas/venta.ts
export function validarVenta(d: { referencia: string; talla: string; cantidad: number }): void;
// referencia y talla no vacías; cantidad entera > 0
export function cantidadTrasVenta(disponible: number, vendida: number): number;  // lanza STOCK_INSUFICIENTE si vendida > disponible

// lib/reglas/economia.ts  (módulo opcional)
export function gananciaPorUnidad(precioVenta: number, precioCompra: number): number;
export function validarPrecioCompra(precioCompra: number, precioVenta: number): void; // >0 y venta > compra
export function inversionProducto(precioCompra: number, cantidad: number): number;
export function gananciaPotencialProducto(precioVenta: number, precioCompra: number, cantidad: number): number;
export function gananciaRealizadaVenta(precioVentaDeLaVenta: number, precioCompra: number, cantidad: number): number;
```

### 10.6 Firmas de `dataService`

```ts
// Sesión y usuarios
obtenerUsuarioActual(): Promise<{ id: string; nombre: string; rol: Rol } | null>
listarUsuarios(): Promise<FilaUsuario[]>                           // solo dueño
crearUsuario(d: DatosUsuario): Promise<{ id: string }>            // solo dueño
actualizarUsuario(id: string, cambios: CambiosUsuario, duenoActualId: string): Promise<void> // ULTIMO_DUENO

// Inventario
registrarEntrada(d: DatosEntrada, usuarioId: string): Promise<{ productoId: string; sumado: boolean; cantidadResultante: number }>
listarInventario(f: { referencia?: string; marca?: string; talla?: string; soloDisponibles?: boolean }, rol: Rol): Promise<FilaProducto[]>
obtenerProducto(id: string, rol: Rol): Promise<DetalleProducto>
actualizarProducto(id: string, cambios: CambiosProducto, usuarioId: string): Promise<void>
desactivarProducto(id: string, usuarioId: string): Promise<void>  // solo dueño; PRODUCTO_CON_EXISTENCIAS

// Ventas
registrarVenta(d: DatosVenta, usuarioId: string): Promise<ResultadoVenta>
listarVentas(f: { referencia?: string; desde?: string; hasta?: string }): Promise<FilaVenta[]>

// Resumen
obtenerResumen(rol: Rol): Promise<ResumenPanel>

// Economía (módulo opcional, solo dueño)
obtenerEconomia(f?: { marca?: string }): Promise<ResumenEconomico>
```

Las funciones que reciben `rol` deciden si incluyen el precio de compra y los campos económicos en su resultado (RN-04).

### 10.7 Conexión y transacciones

```ts
// lib/db/conexion.ts
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(1082, (v) => v);                 // DATE → 'YYYY-MM-DD'
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (ids y COUNT) → number

const globalParaPool = globalThis as unknown as { poolStockly?: Pool };

export const pool = globalParaPool.poolStockly ?? new Pool({
  connectionString: process.env.DATABASE_URL,        // el nombre real lo confirma P00
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== 'production') globalParaPool.poolStockly = pool;

export async function consultar<T>(sql: string, valores: unknown[] = []): Promise<T[]> { /* pool.query */ }

export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> {
  // BEGIN → trabajo(tx) → COMMIT; en error: ROLLBACK y relanzar; siempre release()
}
```

La cadena de conexión es la del pooler en modo transacción de Supabase (puerto 6543). Como los montos son enteros, no hace falta un parser para `NUMERIC` en el módulo mínimo.

---

## 11. Contratos de API

### 11.1 Formato de respuesta

```json
{ "ok": true, "datos": { } }
```

```json
{ "ok": false, "error": { "codigo": "STOCK_INSUFICIENTE", "mensaje": "No hay suficientes unidades disponibles.", "detalles": { "disponible": 3 } } }
```

Todas las respuestas llevan `Cache-Control: no-store`.

### 11.2 Códigos de error

| Código | HTTP | Mensaje para el usuario |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Revise los datos ingresados. |
| `NO_AUTORIZADO` | 401 | Debe iniciar sesión. |
| `SIN_PERMISO` | 403 | No tiene permisos para realizar esta operación. |
| `PRODUCTO_NO_ENCONTRADO` | 404 | No existe un producto con esa referencia y talla. |
| `PRODUCTO_DUPLICADO` | 409 | Ya existe un producto con esa referencia y talla. |
| `PRODUCTO_CON_VENTAS` | 409 | El producto tiene ventas registradas y no se puede eliminar. |
| `PRODUCTO_CON_EXISTENCIAS` | 409 | El producto tiene unidades disponibles y no se puede desactivar. |
| `FECHA_FUTURA` | 422 | La fecha de entrada no puede ser posterior a hoy. |
| `STOCK_INSUFICIENTE` | 409 | No hay suficientes unidades disponibles. |
| `USUARIO_DUPLICADO` | 409 | Ya existe un usuario con ese nombre de usuario. |
| `USUARIO_NO_ENCONTRADO` | 404 | El usuario no existe. |
| `ULTIMO_DUENO` | 409 | No puede quitar el rol de dueño ni desactivar la única cuenta de dueño. |
| `PRECIO_VENTA_NO_SUPERA_COMPRA` | 422 | El precio de venta debe ser mayor que el precio de compra. |
| `ERROR_INTERNO` | 500 | Ocurrió un error inesperado. Intente de nuevo. |

Los mensajes con `{...}` se completan con los valores de `detalles`.

### 11.3 Endpoints (todos requieren sesión)

| Método y ruta | Rol | Cuerpo o parámetros | Respuesta `datos` |
|---|---|---|---|
| `GET /api/panel/sesion` | ambos | | `{ nombre, rol }` |
| `GET /api/panel/resumen` | ambos | | `ResumenPanel` (económico solo si es dueño) |
| `GET /api/panel/productos?referencia=&marca=&talla=&soloDisponibles=` | ambos | | `FilaProducto[]` (sin `precioCompra` para trabajador) |
| `POST /api/panel/productos` | ambos | JSON `{ referencia, marca, descripcion, talla, cantidad, precioVenta, fechaEntrada }` o multipart con `datos` JSON y `foto` JPEG opcional (máx. 3 MB) | `{ productoId, sumado, cantidadResultante }` (201) |
| `GET /api/panel/productos/[id]` | ambos | | `DetalleProducto` (sin economía para trabajador) |
| `GET /api/panel/productos/[id]/foto` | ambos | | Redirección a URL firmada temporal de una foto privada |
| `PATCH /api/panel/productos/[id]` | ambos | `{ marca?, descripcion?, precioVenta? }` | `{ actualizado: true }` |
| `POST /api/panel/productos/[id]/desactivar` | dueño | | `{ desactivado: true }` |
| `GET /api/panel/ventas?referencia=&desde=&hasta=` | ambos | | `FilaVenta[]` |
| `POST /api/panel/ventas` | ambos | `{ referencia, talla, cantidad }` | `ResultadoVenta` (201) |
| `GET /api/panel/usuarios` | dueño | | `FilaUsuario[]` |
| `POST /api/panel/usuarios` | dueño | `{ nombre, usuario, rol, ... }` | `{ id }` (201) |
| `PATCH /api/panel/usuarios/[id]` | dueño | `{ nombre?, rol?, activo? }` | `{ actualizado: true }` |
| `GET /api/panel/economia?marca=` | dueño | | `ResumenEconomico` (módulo opcional) |

El módulo económico (`precioCompra` en POST/PATCH de productos y las rutas de economía) se agrega en P11.

La foto del producto es opcional: se captura desde la cámara trasera, se reduce y convierte a JPEG en el navegador, y se almacena en el bucket privado `stockly-productos`. La base guarda solo `foto_path`; ese path nunca se serializa al cliente. La ruta de lectura comprueba la sesión y la pertenencia del producto al negocio antes de emitir una URL firmada con vigencia de 60 segundos. El acceso al bucket se realiza solo desde el servidor con la clave administrativa.

### 11.4 Serialización por rol

`FilaProducto` y `DetalleProducto` incluyen `precioCompra` y campos económicos **solo** cuando el rol es `dueno`. La decisión se toma en `lib/datos/productos.ts` según el `rol` recibido, no en el componente: así, aunque un trabajador llame la API directamente, nunca recibe el precio de compra (RN-04).

### 11.5 Esquemas Zod (`lib/validacion/esquemas.ts`)

| Esquema | Reglas |
|---|---|
| `esquemaEntradaProducto` | referencia (1 a 60, recortada), marca (2 a 80), descripcion (2 a 200), talla (1 a 20), cantidad entero ≥ 1, precioVenta entero ≥ 1, fechaEntrada fecha válida |
| `esquemaCambiosProducto` | marca, descripcion, precioVenta opcionales; al menos uno |
| `esquemaVenta` | referencia, talla, cantidad entero ≥ 1 |
| `esquemaFiltrosInventario` | referencia, marca, talla opcionales; soloDisponibles booleano opcional |
| `esquemaUsuario` | nombre (2 a 120), usuario (3 a 60), rol enum; campos de credencial según P03 |
| `esquemaCambiosUsuario` | nombre, rol, activo opcionales; al menos uno |
| `esquemaFiltrosVentas` | referencia opcional; desde, hasta fechas opcionales |

La comparación entre precio de venta y precio de compra se hace en `lib/reglas/economia.ts` (módulo opcional), porque el módulo mínimo no captura precio de compra.

---

## 12. Pantallas

| Ruta | Rol | Contenido |
|---|---|---|
| Layout `/panel` | ambos | Verifica la sesión con `obtenerUsuario()`; sin sesión redirige al login. Barra con el nombre "Stockly", navegación (Resumen, Inventario, Ventas; Usuarios y Economía solo para el dueño), nombre del usuario, `InsigniaRol` y botón de cerrar sesión del login existente. Menú desplegable en móvil. |
| `/panel` · Resumen | ambos | Indicadores: productos activos, unidades totales disponibles, productos agotados, ventas de hoy. Para el dueño, si el módulo económico está activo, agrega inversión total y ganancia realizada total. Tabla de productos agotados con enlace. Accesos rápidos a "Registrar entrada" y "Registrar venta". |
| `/panel/inventario` · Inventario | ambos | `FiltrosInventario` (referencia, marca, talla y casilla "Solo disponibles") reflejados en la URL. `TablaInventario`: referencia, marca, descripción, talla, cantidad, precio de venta, disponibilidad (`InsigniaDisponibilidad`). Para el dueño, columna de precio de compra (vacía si no se ha registrado). Botón "Registrar entrada". `EstadoVacio` cuando la búsqueda no tiene coincidencias (RN-27). |
| `/panel/inventario/nuevo` · Registrar entrada | ambos | `FormularioProducto`: referencia, marca, descripción, talla, cantidad, precio de venta, fecha de entrada (por defecto hoy, máximo hoy) y fotografía opcional. Aviso en vivo: si la referencia y la talla ya existen, "Esta referencia y talla ya existen: la cantidad se sumará al producto actual (N unidades)". Al guardar, muestra si creó o sumó y navega al inventario. |
| `/panel/inventario/[id]` · Detalle | ambos | Datos del producto, fotografía si existe, disponibilidad e historial de eventos. Para el dueño: precio de compra y, si el módulo económico está activo, inversión y ganancia potencial del producto. Acciones: "Editar" (marca, descripción, precio de venta; el dueño también el precio de compra en el módulo opcional) y, para el dueño, "Desactivar" (solo con cantidad 0). Lista de ventas del producto. |
| `/panel/ventas` · Ventas | ambos | `FiltrosVentas` (referencia, rango de fechas). `TablaVentas`: fecha, referencia, talla, cantidad, precio de venta, total de la línea, quién registró. Botón "Registrar venta". |
| `/panel/ventas/nueva` · Registrar venta | ambos | `BuscadorProducto` por referencia y talla que muestra la cantidad disponible; campo de cantidad con validación en vivo contra la disponible; resumen (referencia, talla, precio de venta, total) y confirmación. Tras vender, `Aviso` con el resultado y la cantidad restante; si quedó agotado, lo indica. |
| `/panel/usuarios` · Usuarios | dueño | `TablaUsuarios`: nombre, usuario, rol (`InsigniaRol`), estado. Acciones: crear, cambiar rol, activar o desactivar. El dueño no puede quitarse el rol ni desactivarse si es el único dueño (`ULTIMO_DUENO`). |
| `/panel/economia` · Economía | dueño | Módulo opcional (sección 18). Tarjetas de inversión total, ganancia potencial total y ganancia realizada total; tabla por producto con precio de compra, ganancia por unidad, inversión y ganancia potencial. |

Si `app/page.tsx` es la plantilla de Next.js, se reemplaza por una redirección a `/panel`. Si tiene contenido propio, se agrega un enlace a `/panel`.

### 12.1 Textos fijos

Aviso de re-stock en el formulario de entrada:

> Esta referencia y talla ya existen en el inventario. La cantidad que registre se sumará a las {n} unidades actuales.

Confirmación de venta:

> Va a registrar la venta de {cantidad} unidad(es) de {referencia} talla {talla}. Quedarán {restante} unidades.

---

## 13. Identidad visual

| Token | Valor | Uso |
|---|---|---|
| `--color-primario` | `#2A4D8F` | Botones principales, barra superior |
| `--color-primario-suave` | `#E7EDF7` | Fondos de selección, hover |
| `--color-disponible` | `#2F7D4F` | Producto disponible |
| `--color-agotado` | `#B83232` | Producto agotado, errores |
| `--color-inactivo` | `#5B6770` | Producto o usuario inactivo |
| `--color-dueno` | `#8A5A1C` | Insignia de rol dueño |
| `--color-fondo` | `#F5F6F8` | Fondo de página |
| `--color-superficie` | `#FFFFFF` | Tarjetas, tablas, modales |
| `--color-texto` | `#1F2933` | Texto principal |
| `--color-texto-suave` | `#52606D` | Texto secundario |
| `--color-borde` | `#D9DEE4` | Bordes y divisores |

Los tokens se agregan a `app/globals.css` sin borrar estilos existentes del login. Con Tailwind 4 se declaran en `@theme`; con Tailwind 3, en `tailwind.config`.

| Insignia | Fondo / texto |
|---|---|
| Disponible | verde claro / `--color-disponible` |
| Agotado | rojo claro / `--color-agotado` |
| Inactivo | gris claro / `--color-inactivo` |
| Rol trabajador | azul claro / `--color-primario` |
| Rol dueño | ámbar claro / `--color-dueno` |

Criterios: tipografía del proyecto (si no hay, Inter con `next/font`); cantidades y precios con fuente de ancho fijo (`tabular-nums`); precios con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`; fechas con `Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })` sobre fechas `YYYY-MM-DD`; bordes redondeados de 8 px; sin emojis; tablas convertidas en tarjetas apiladas en pantallas menores a 640 px. La disponibilidad nunca se comunica solo con color: la insignia siempre lleva texto.

---

## 14. Dinero, fechas y zona horaria

| Regla | Implementación |
|---|---|
| Montos | Pesos enteros (`INTEGER` en la base, `number` entero en el código). El peso colombiano no usa centavos; los enteros evitan errores de redondeo en los cálculos económicos |
| Presentación de montos | `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → "$ 50.000" |
| "Hoy" | Solo con `hoyBogota()` (usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })`) |
| Fechas entre capas | Texto `YYYY-MM-DD` |
| Lectura desde BD | Parsers de `pg` devuelven texto (sección 10.7) |
| Fecha de entrada | El formulario limita `max` a `hoyBogota()`; el dominio rechaza fechas futuras (RN-12) |
| Fecha de venta | La asigna el sistema con `hoyBogota()` (RN-22) |

Vercel ejecuta el servidor en UTC; Colombia está en UTC-5 sin horario de verano. Si "hoy" se calcula en UTC, entre las 19:00 y la medianoche una venta quedaría con la fecha del día siguiente y una fecha de entrada de hoy podría rechazarse como futura.

---

## 15. Seguridad e integridad

| Medida | Detalle |
|---|---|
| Rotación de credenciales expuestas | Obligatoria y previa (sección 2) |
| Acceso solo con sesión | Middleware o proxy existente y `exigirUsuario()` en cada ruta de `/api/panel` |
| Separación por rol en el servidor | `exigirDueno()` en economía y usuarios; el precio de compra se serializa solo para el dueño (RN-04, sección 11.4) |
| Aislamiento por negocio | `empresa_id` deriva de la sesión del servidor; consultas, claves idempotentes, relaciones y políticas RLS se acotan al negocio |
| Base de datos cerrada al público | RLS con lectura limitada por empresa y permisos directos de escritura revocados a `anon` y `authenticated` |
| Contraseñas | Las gestiona el login; nunca se guardan en la tabla `usuarios` ni se devuelven en una respuesta |
| Validación en tres puntos | Formulario (Zod y reglas puras), API (Zod y reglas puras) y base de datos (CHECK, UNIQUE, llaves foráneas) |
| Integridad del inventario | La venta descuenta con el producto bloqueado (`FOR UPDATE`) dentro de una transacción; `cantidad >= 0` en la base impide cantidades negativas (RNF-03) |
| Ventas inmutables | No existe ruta para editarlas ni eliminarlas |
| SQL parametrizado | Ningún valor se concatena en una consulta |
| Errores internos | Se registran con `console.error` en el servidor; el usuario recibe `ERROR_INTERNO` sin detalles técnicos |

---

## 16. Pruebas

### 16.1 Pruebas unitarias de reglas (Vitest)

Fecha de referencia: `hoy = '2030-06-15'`.

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-01 | `normalizarReferencia` | `' cam001 '` | `'CAM001'` |
| T-02 | `normalizarTalla` | `' m '` | `'M'` |
| T-03 | `clave` | `('cam001', 'm')` | `'CAM001|M'` |
| T-04 | `calcularDisponible` | 0 / 1 | `false` / `true` |
| T-05 | `validarEntrada` | cantidad 0 | `DATOS_INVALIDOS` |
| T-06 | `validarEntrada` | cantidad -3 | `DATOS_INVALIDOS` |
| T-07 | `validarEntrada` | cantidad 2,5 | `DATOS_INVALIDOS` |
| T-08 | `validarEntrada` | precioVenta 0 | `DATOS_INVALIDOS` |
| T-09 | `validarEntrada` | referencia vacía | `DATOS_INVALIDOS` |
| T-10 | `validarEntrada` | fecha `2030-06-16` | `FECHA_FUTURA` |
| T-11 | `validarEntrada` | fecha `2030-06-15`, datos válidos | sin error |
| T-12 | `validarVenta` | cantidad 0 | `DATOS_INVALIDOS` |
| T-13 | `validarVenta` | cantidad -1 | `DATOS_INVALIDOS` |
| T-14 | `validarVenta` | referencia vacía | `DATOS_INVALIDOS` |
| T-15 | `validarVenta` | datos válidos | sin error |
| T-16 | `cantidadTrasVenta` | disponible 10, vendida 3 | 7 |
| T-17 | `cantidadTrasVenta` | disponible 5, vendida 5 | 0 |
| T-18 | `cantidadTrasVenta` | disponible 2, vendida 3 | `STOCK_INSUFICIENTE` |
| T-19 | `cantidadTrasVenta` | disponible 0, vendida 1 | `STOCK_INSUFICIENTE` |
| T-20 | `esDueno` | `'dueno'` / `'trabajador'` | `true` / `false` |
| T-21 | `puedeVerEconomia` | `'trabajador'` | `false` |
| T-22 | `esFechaFutura` | `'2030-06-16'`, hoy `'2030-06-15'` | `true` |
| T-23 | `esFechaFutura` | `'2030-06-15'`, hoy `'2030-06-15'` | `false` |

Pruebas del módulo económico (se agregan en P11):

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-24 | `validarPrecioCompra` | compra 0 | `DATOS_INVALIDOS` |
| T-25 | `validarPrecioCompra` | compra 50.000, venta 50.000 | `PRECIO_VENTA_NO_SUPERA_COMPRA` |
| T-26 | `validarPrecioCompra` | compra 50.000, venta 40.000 | `PRECIO_VENTA_NO_SUPERA_COMPRA` |
| T-27 | `validarPrecioCompra` | compra 40.000, venta 50.000 | sin error |
| T-28 | `gananciaPorUnidad` | venta 50.000, compra 30.000 | 20.000 |
| T-29 | `inversionProducto` | compra 30.000, cantidad 10 | 300.000 |
| T-30 | `gananciaPotencialProducto` | venta 50.000, compra 30.000, cantidad 10 | 200.000 |
| T-31 | `gananciaPotencialProducto` | cantidad 0 | 0 |
| T-32 | `gananciaRealizadaVenta` | venta 50.000, compra 30.000, cantidad 4 | 80.000 |

Comando: `npm test`. En el módulo mínimo deben pasar T-01 a T-23 (23 pruebas).

### 16.2 Prueba de flujo contra la base de datos

`scripts/probar-flujo.ts` (`npm run probar:flujo`) usa `dataService` con referencias `PRUEBA-%` y un usuario de prueba. Imprime `OK` o `FALLA` por paso y limpia al final.

| Paso | Operación | Esperado |
|---|---|---|
| 1 | Registrar entrada `PRUEBA-A` talla M, cantidad 10, precio de venta 50.000 | Producto creado; disponible |
| 2 | Registrar entrada `prueba-a` talla m, cantidad 5 | Suma; cantidad resultante 15 (RN-13) |
| 3 | Registrar entrada con cantidad 0 | `DATOS_INVALIDOS` |
| 4 | Registrar entrada con fecha de mañana | `FECHA_FUTURA` |
| 5 | Listar inventario filtrando por referencia `PRUEBA-A` como trabajador | Un producto; sin `precioCompra` en el objeto |
| 6 | Vender `PRUEBA-A` talla M, cantidad 20 | `STOCK_INSUFICIENTE`; cantidad sigue 15 |
| 7 | Vender `PRUEBA-A` talla M, cantidad 5 | Venta registrada; cantidad resultante 10 |
| 8 | Vender `PRUEBA-A` talla M, cantidad 10 | Venta registrada; cantidad 0; agotado |
| 9 | Vender `PRUEBA-A` talla M, cantidad 1 | `STOCK_INSUFICIENTE` |
| 10 | Listar inventario con soloDisponibles=true | No incluye `PRUEBA-A` |
| 11 | Vender referencia inexistente | `PRODUCTO_NO_ENCONTRADO` |
| 12 | Desactivar `PRUEBA-A` (cantidad 0) | Desactivado |
| 13 | Listar ventas por referencia `PRUEBA-A` | Dos ventas; precios copiados |

### 16.3 Aceptación (criterio de terminado)

Se ejecuta en el despliegue de Vercel y se documenta en `doc/ACEPTACION.md`. Requiere una cuenta de dueño y una de trabajador (ver P03).

| ID | Acción | Resultado esperado |
|---|---|---|
| A-01 | Entrar como trabajador | Llega a `/panel`; no ve Usuarios ni Economía |
| A-02 | Registrar `CAM001` marca Nike, talla M, 10 unidades, precio 60.000 | Producto creado, disponible |
| A-03 | Registrar `cam001` talla m, 5 unidades | Suma: 15 unidades, un solo registro |
| A-04 | Registrar con cantidad 0 | Rechazo con mensaje |
| A-05 | Registrar con fecha de mañana | Rechazo con mensaje |
| A-06 | Buscar inventario por marca "Nike" | Muestra `CAM001` |
| A-07 | Como trabajador, revisar que no aparece el precio de compra en ninguna pantalla | No aparece |
| A-08 | Vender `CAM001` talla M, 20 unidades | Rechazo por stock insuficiente; sigue en 15 |
| A-09 | Vender `CAM001` talla M, 15 unidades | Venta registrada; queda en 0 y agotado |
| A-10 | Vender `CAM001` talla M, 1 unidad | Rechazo por stock |
| A-11 | Filtrar inventario por "Solo disponibles" | `CAM001` no aparece |
| A-12 | Cerrar sesión y entrar como dueño | Ve Usuarios y Economía |
| A-13 | Como dueño, crear un usuario trabajador | Aparece en Usuarios |
| A-14 | Intentar quitarse el rol de dueño siendo el único dueño | Rechazo `ULTIMO_DUENO` |
| A-15 | Desactivar `CAM001` (cantidad 0) | Queda inactivo |
| A-16 | Consultar ventas y ver la fecha y el precio guardado | Las dos ventas con su precio |
| A-17 | Cerrar el navegador, volver a entrar | Los datos persisten |
| A-18 | Abrir `/panel` en ventana privada | Redirección al login |
| A-19 | Como trabajador, abrir directamente `/api/panel/economia` | 403 `SIN_PERMISO` |

Las filas A-20 a A-23 (módulo económico) se agregan en P11.

---

## 17. Plan de ejecución

| Fase | Prompt | Resultado | Cierre |
|---|---|---|---|
| 0 · Preparación | P00 | Rotación de credenciales confirmada; `ESTADO_ACTUAL.md`, `copilot-instructions.md`, `ESTADO_EJECUCION.md`; compilación de base verificada | `FASE_0_COMPLETADA.md` |
| 1 · Base de datos | P01 | M1 y M2 aplicadas; `npm run db:verificar` sin fallas | `FASE_1_COMPLETADA.md` |
| 2 · Reglas | P02 | `lib/config`, `lib/reglas`, 23 pruebas en verde | `FASE_2_COMPLETADA.md` |
| 3 · Servidor y roles | P03 | Conexión, sesión con rol, vínculo del primer dueño, respuestas, esquemas, formato; `/api/panel/sesion` protegido | `FASE_3_COMPLETADA.md` |
| 4 · Datos y API | P04, P05 | `lib/datos/*`, `dataService`, rutas; `npm run probar:flujo` sin fallas | `FASE_4_COMPLETADA.md` |
| 5 · Interfaz | P06, P07, P08, P09, P10 | Componentes base, navegación, resumen, inventario, ventas, usuarios | `FASE_5_COMPLETADA.md` |
| 6 · Aceptación | (incluida en P10) | `ACEPTACION.md` con A-01 a A-19; README actualizado | `FASE_6_COMPLETADA.md` |
| 7 · Opcional económico | P11 | Precio de compra e información económica para el dueño | `FASE_7_COMPLETADA.md` |

Condiciones entre fases:

- No se inicia una fase si la anterior no tiene su archivo de cierre.
- `npm run build` debe terminar sin errores al final de cada prompt.
- `npm test` debe pasar al final de cada prompt desde P02.
- Cada prompt termina con un commit del estudiante y un `git push`; Vercel despliega en cada push y un fallo de despliegue se corrige antes del siguiente prompt.

---

## 18. Funcionalidades opcionales: módulo económico

Se desarrolla solo con la fase 6 cerrada (P11). Activa el precio de compra y los cálculos de la sección 9, restringidos al dueño.

| Elemento | Definición |
|---|---|
| Activación | `MODULO_ECONOMICO_ACTIVO = true` en `lib/config/stockly.ts` |
| Migración M3 | Ninguna columna nueva: `precio_compra` ya existe en `productos` (nullable). M3 solo agrega un índice si hace falta para los cálculos |
| Reglas puras | Completar `lib/reglas/economia.ts` con las firmas de la sección 10.5 y las fórmulas de la sección 9; pruebas T-24 a T-32 |
| Captura | El precio de compra se agrega al `FormularioProducto` y a la edición, visible y editable solo para el dueño; `esquemaEntradaProducto` y `esquemaCambiosProducto` lo aceptan solo en las rutas cuando el rol es dueño, aplicando `validarPrecioCompra` (RN-11) |
| Datos | `lib/datos/economia.ts`: `obtenerEconomia` calcula inversión total, ganancia potencial total (productos activos) y ganancia realizada total (todas las ventas, uniendo cada venta con el precio de compra actual de su producto), más el desglose por producto |
| API | `GET /api/panel/economia` con `exigirDueno()`; `precioCompra` aceptado en POST y PATCH de productos solo para el dueño |
| Pantallas | `/panel/economia` con `TarjetasEconomia`; columna de precio de compra y economía en inventario y detalle, solo para el dueño; inversión total y ganancia realizada en el resumen del dueño |
| Aceptación | A-20: el dueño registra el precio de compra de un producto; A-21: intentar precio de venta menor o igual al de compra se rechaza; A-22: la página de economía muestra inversión y ganancias coherentes con los datos; A-23: un producto agotado aporta 0 a la ganancia potencial pero sus ventas cuentan en la realizada |

---

## 19. Glosario

| Término | Definición |
|---|---|
| Producto | Prenda identificada por la combinación única de referencia y talla |
| Referencia | Código que identifica la prenda (por ejemplo, CAM001) |
| Disponibilidad | Dato calculado: verdadero si la cantidad es mayor que 0 |
| Re-stock | Registro de más unidades de una referencia y talla existentes; suma a la cantidad |
| Venta | Salida de unidades de un producto; guarda el precio de venta del momento |
| Inversión | Precio de compra por cantidad disponible (módulo económico) |
| Ganancia potencial | Ganancia que se obtendría al vender todas las unidades disponibles (módulo económico) |
| Ganancia realizada | Ganancia de las ventas ya efectuadas (módulo económico) |
| Rol | Tipo de usuario: trabajador o dueño |
| Regla pura | Función de `lib/reglas/` que solo depende de sus parámetros |
| Transacción | Conjunto de escrituras que se confirma completo o se revierte completo |
| Copilot en modo Agente | Modo de GitHub Copilot Chat que lee el repositorio, edita varios archivos y ejecuta comandos de terminal con aprobación |
