# Stockly

Stockly es una aplicación web para gestionar el inventario y las ventas de una tienda de ropa. Usa Next.js App Router, TypeScript, Supabase Auth y PostgreSQL.

## Demo

[Abrir Stockly](https://stocklyphi.vercel.app)

## Roles y funcionalidades

- **Trabajador:** consulta y filtra el inventario, registra entradas y ventas, y consulta el historial.
- **Dueño:** tiene las funciones del trabajador y, además, administra las cuentas Stockly y accede al módulo económico.
- Las ventas conservan el precio del momento y descuentan existencias dentro de una transacción.
- Reingresar la misma referencia y talla suma unidades al producto existente.
- Los productos agotados no se eliminan; el dueño puede desactivarlos.
- El precio de compra y los cálculos económicos solo se muestran a dueños.

La autenticación existente usa Supabase Auth; Stockly no almacena contraseñas. El formulario de inicio de sesión permite entrar y recuperar la contraseña, pero no registra cuentas nuevas. Para habilitar una cuenta de trabajador:

1. En Supabase, crea o invita a la persona desde **Authentication → Users** y completa el proceso de contraseña en Supabase Auth.
2. Copia el UUID de esa cuenta.
3. Como dueño de Stockly, abre **Usuarios** y registra el nombre, el identificador Stockly, el rol y el UUID. La cuenta debe existir en Supabase Auth antes de vincularla.
4. La persona inicia sesión en Stockly con el correo y la contraseña de Supabase Auth.

El UUID no es una contraseña ni sustituye la autenticación. Nunca guardes contraseñas en la tabla `usuarios`.

## Requisitos

- Node.js compatible con Next.js 16 y npm.
- Un proyecto Supabase con Auth y PostgreSQL.
- Variables de entorno configuradas localmente y en el entorno de despliegue. Los nombres usados por la aplicación son:
  - Supabase Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Se conservan alias de compatibilidad `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY`, `STOCKLY_SUPABASE_URL`, `STOCKLY_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_ANON_KEY` y `STOCKLY_SUPABASE_ANON_KEY`.
  - PostgreSQL: `STOCKLY_POSTGRES_URL` (aplicación) y `STOCKLY_POSTGRES_URL_NON_POOLING` (comandos locales cuando está disponible).
  - Administración segura de Auth: `STOCKLY_SUPABASE_SERVICE_ROLE_KEY`.
  - Correo y enlaces de Auth, si se usan: `RESEND_API_KEY`, `RESEND_FROM` y `APP_URL`.

Configura los valores directamente en `.env.local` y en la plataforma de despliegue. No pegues ni compartas esos valores en documentación, chats o capturas. `.env.local` está excluido de Git.

## Ejecución local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea `.env.local` a partir de los nombres de `.env.example` y completa los valores de forma local. No guardes un archivo con valores reales en el control de versiones.
3. Aplica las migraciones y comprueba la conexión:

   ```bash
   npm run db:migrar
   npm run db:verificar
   ```

4. Crea primero la cuenta del dueño en Supabase Auth. Copia su UUID desde **Authentication → Users** y vincúlala:

   ```bash
   npm run db:vincular-dueno -- "<UUID de Supabase Auth>" "<Nombre del dueño>"
   ```

5. Opcionalmente carga datos de demostración y ejecuta la aplicación:

   ```bash
   npm run db:demo
   npm run dev
   ```

Abre `http://localhost:3000/login`. El login no incluye registro público de cuentas; el dueño vincula cuentas existentes desde **Usuarios**.

## Comandos

| Comando | Propósito |
|---|---|
| `npm run dev` | Inicia Next.js en desarrollo. |
| `npm run build` | Compila la aplicación para producción. |
| `npm start` | Ejecuta el build de producción local. |
| `npm run lint` | Analiza el código con ESLint. |
| `npm run type-check` | Comprueba los tipos de TypeScript. |
| `npm test` | Ejecuta las pruebas Vitest. |
| `npm run test:watch` | Ejecuta Vitest en modo observación. |
| `npm run db:migrar` | Aplica las migraciones pendientes. |
| `npm run db:verificar` | Comprueba el esquema y restricciones de PostgreSQL con inserciones revertidas. |
| `npm run db:vincular-dueno -- "<UUID>" "<Nombre>"` | Vincula la cuenta inicial como dueño. |
| `npm run db:demo` | Carga productos y ventas de demostración. |
| `npm run db:limpiar -- --prueba` | Elimina únicamente datos con prefijos `PRUEBA` y `prueba_`. |
| `npm run db:limpiar -- --demo` | Elimina únicamente datos con prefijos `DEMO` y `demo_`. |
| `npm run probar:flujo` | Ejecuta el flujo de integración de entradas, ventas y roles; limpia sus datos temporales al terminar. |

## Estructura principal

```text
src/
  app/                 Páginas App Router y API
  components/          Componentes de interfaz, panel y autenticación
  lib/
    auth/              Adaptador de sesión y roles
    datos/             Consultas y transacciones PostgreSQL
    reglas/            Reglas puras del negocio
    validacion/        Esquemas Zod de entradas y filtros
    db/                Pool PostgreSQL
supabase/migrations/   Migraciones SQL
scripts/               Migración, verificación y datos de prueba
tests/                 Pruebas de reglas y servidor
doc/                   Plan, ejecución, aceptación y checkpoints
```

## Reglas del plan funcional

| Regla | Aplicación en el código |
|---|---|
| RN-01 · Solo existen los roles trabajador y dueño | `src/lib/reglas/roles.ts` y restricción `usuarios_rol_check`. |
| RN-02 · El identificador de usuario Stockly es único | Índice `ux_usuarios_usuario`. |
| RN-03 · Las contraseñas pertenecen a Supabase Auth | Login existente; Stockly solo guarda `auth_ref`. |
| RN-04 · El trabajador no ve precio de compra ni economía | `exigirDueno()` y serialización por rol en `src/lib/datos/productos.ts`. |
| RN-05 · El dueño tiene permisos adicionales | `src/lib/auth/sesion.ts` y protección de rutas de usuarios/economía. |
| RN-06 · Una operación no autorizada se rechaza | Rutas API con `exigirUsuario()` o `exigirDueno()`. |
| RN-07 · Referencia y talla identifican de forma única el producto | `clave()` y el índice `ux_productos_ref_talla`. |
| RN-08 · Cantidad de entrada es un entero positivo | Esquema Zod, `validarEntrada()` y CHECK de PostgreSQL. |
| RN-09 · Precio de venta es un entero positivo | Esquemas Zod y CHECK de PostgreSQL. |
| RN-10 · Precio de compra es entero positivo (economía) | `validarPrecioCompra()` y esquema de producto. |
| RN-11 · Precio de venta supera el de compra (economía) | `validarPrecioCompra()` al registrar o editar. |
| RN-12 · No se permiten fechas de entrada futuras | `hoyBogota()`, `validarEntrada()` y formulario. |
| RN-13 · Reingresar un producto suma su cantidad | `registrarEntrada()` con transacción y bloqueo. |
| RN-14 · Disponible equivale a cantidad mayor que cero | Vista `v_productos`. |
| RN-15 · Inventario admite filtros combinables | `listarInventario()` y filtros de URL. |
| RN-16 · Venta requiere referencia, talla y cantidad positiva | Esquema Zod y `validarVenta()`. |
| RN-17 · La referencia y talla de venta deben existir | `registrarVenta()`. |
| RN-18 · No se vende más de lo disponible | `FOR UPDATE`, transacción y `cantidadTrasVenta()`. |
| RN-19 · Vender todo el stock deja el producto agotado | Actualización transaccional y disponibilidad calculada. |
| RN-20 · Venta parcial descuenta exactamente las unidades vendidas | `registrarVenta()`. |
| RN-21 · Cada venta conserva el precio vigente | Copia `precio_venta` en la fila de venta. |
| RN-22 · El sistema asigna la fecha de venta en Bogotá | `hoyBogota()` dentro de `registrarVenta()`. |
| RN-23 · Inversión usa costo por unidades activas | `inversionProducto()` y módulo económico. |
| RN-24 · Ganancia unitaria es precio de venta menos costo | `gananciaPorUnidad()`. |
| RN-25 · Ganancia potencial usa existencias activas | `gananciaPotencialProducto()`; agotados aportan cero. |
| RN-26 · Ganancia realizada usa ventas históricas y costo actual | `gananciaRealizadaVenta()` y consulta económica. |
| RN-27 · Listas vacías no alteran datos; sin ventas la ganancia es cero | Consultas y estados vacíos de la interfaz. |
| RN-28 · Las ventas son inmutables y solo se desactiva stock agotado | No hay edición/eliminación de ventas; `desactivarProducto()`. |

## Seguridad y documentos

- No guardes credenciales ni valores de variables de entorno en archivos versionados. Rota inmediatamente cualquier valor que haya sido expuesto.
- No habilites acceso directo desde el navegador a las tablas Stockly: el servidor controla la sesión, el rol y el acceso PostgreSQL.
- Revisa el [plan técnico](doc/PLAN_STOCKLY.md), el [estado de ejecución](doc/ESTADO_EJECUCION.md) y la [matriz de aceptación](doc/ACEPTACION.md) antes de publicar cambios.
- Las pruebas de aceptación A-01 a A-19 deben ejecutarse manualmente en la URL de Vercel con cuentas de trabajador y dueño.
