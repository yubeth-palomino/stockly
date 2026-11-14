# Stockly · Prompts para GitHub Copilot

> Plan de referencia: `doc/PLAN_STOCKLY.md`
> Herramienta: GitHub Copilot Chat en modo Agente (VS Code)
> Punto de partida: proyecto desplegado en Vercel, Supabase conectado y login funcionando

---

## Antes de empezar: seguridad

El plan funcional entregado tenía credenciales reales. Antes de ejecutar P00:

1. En Supabase, Settings, API: rotar la `anon key` y la `service_role key` ("Roll").
2. En Supabase, Settings, Database: restablecer la contraseña de la base de datos.
3. Cambiar la contraseña del usuario de login expuesto.
4. Actualizar `.env.local` y las variables de Vercel con los valores nuevos.
5. Confirmar que `.env.local` está en `.gitignore`.

No continuar con P00 hasta terminar estos pasos.

## Cómo ejecutar estos prompts

1. Crear la carpeta `doc/` en la raíz del repositorio (si no existe) y copiar allí `PLAN_STOCKLY.md` y `PROMPTS_STOCKLY.md`.
2. Abrir el proyecto en VS Code y abrir Copilot Chat. En el selector de modo elegir **Agent**. En el selector de modelo elegir el más capaz disponible.
3. Cada prompt se ejecuta en una **conversación nueva** (botón `+` del chat).
4. Copiar el bloque gris completo del prompt, pegarlo en el chat y enviarlo. No hay datos que reemplazar.
5. Cuando Copilot pida permiso para ejecutar un comando en la terminal, leerlo y aceptarlo.
6. Al terminar cada prompt: revisar los cambios y aceptarlos (**Keep**); hacer la verificación indicada; hacer commit con el mensaje sugerido y `git push`. Vercel desplegará; si falla, usar el prompt de despliegue fallido antes de continuar.
7. No saltar prompts. Si algo falla, usar el prompt de corrección del final.

| Fase | Prompts |
|---|---|
| 0 · Preparación | P00 |
| 1 · Base de datos | P01 |
| 2 · Reglas de negocio | P02 |
| 3 · Servidor y roles | P03 |
| 4 · Datos y API | P04, P05 |
| 5 · Interfaz | P06, P07, P08, P09, P10 |
| 7 · Opcional económico | P11 |

---

## P00 · Auditoría del repositorio y archivos de control

**Fase:** 0 · **Modifica código:** no · **Crea:** `doc/ESTADO_ACTUAL.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`, `doc/checkpoints/FASE_0_COMPLETADA.md`

````text
Actúa como ingeniero de software senior trabajando en modo agente sobre este repositorio Next.js.

Contexto: el proyecto "Stockly" (sistema de inventario para una tienda de ropa) ya está desplegado en Vercel, conectado a Supabase y tiene login funcionando. El plan técnico está en doc/PLAN_STOCKLY.md. Este prompt NO implementa funcionalidades: audita el repositorio y crea los archivos de control.

Lee completo doc/PLAN_STOCKLY.md, en especial las secciones 0, 1, 2, 4, 10 y 17.

TAREA 1. Crea doc/ESTADO_ACTUAL.md con estas secciones, llenas con lo que encuentres. No supongas: si algo no existe, escribe "No existe".
1. Versiones (package.json): next, react, typescript, tailwindcss, pg, zod, @supabase/supabase-js, jose, bcryptjs, vitest.
2. Scripts de package.json.
3. Estructura: árbol de app/, lib/, components/, supabase/ y scripts/ hasta 3 niveles. Indica si usa carpeta src/.
4. Alias de importación en tsconfig.json.
5. Autenticación: archivos; mecanismo (JWT propio en cookie, Supabase Auth u otro); nombre de la cookie; función que lee la sesión y qué devuelve; si distingue roles o solo autentica; ruta de la página de login; ruta a la que redirige después del login (archivo y línea); archivo de middleware o proxy y su matcher; cómo se cierra sesión; tabla de usuarios existente y sus columnas, si la hay.
6. Acceso a datos: clientes de Supabase existentes (archivos), uso del paquete pg, archivo de pool si existe.
7. Migraciones: carpeta, archivos existentes y su numeración, tabla de control, script o página que las aplica.
8. Variables de entorno: solo los NOMBRES presentes en .env.local y .env.example (NUNCA copies valores). Indica si existe una cadena de conexión directa a Postgres (algo como DATABASE_URL, POSTGRES_URL o similar) y con qué nombre; es la que usará lib/db/conexion.ts.
9. Estilos: versión de Tailwind, ubicación de globals.css, fuentes, tokens de color existentes, librería de íconos.
10. Pruebas: framework existente.
11. Conflictos con el plan: existencia previa de app/panel, app/api/panel, lib/dataService.ts y components/ui; contenido de app/page.tsx (plantilla de Next.js o propio); tablas existentes llamadas usuarios, productos o ventas y, si existen, sus columnas.
12. Decisiones derivadas:
    - Ruta de la página de login.
    - Archivo de protección de rutas (proxy.ts en Next.js 16, middleware.ts antes) y si ya existe.
    - Mecanismo de migraciones a usar (el existente o scripts/migrar.mjs).
    - Nombre de la variable de conexión a Postgres que usará conexion.ts.
    - Cómo se vinculará la cuenta del login con la fila de la tabla usuarios (el campo auth_ref del plan): qué identificador del login se usará (por ejemplo, el id de usuario de Supabase Auth, o el correo). Propón la opción más simple según el mecanismo encontrado y descríbela para P03.
    - Nombres exactos que tendrán M1 y M2 continuando la numeración existente.
    - Prefijo de imports para lib (por ejemplo @/lib o @/src/lib).
13. Compilación de base: resultado de npm run build (TAREA 4).

TAREA 2. Crea .github/copilot-instructions.md reemplazando las partes [AJUSTAR] con lo hallado:

```markdown
# Stockly · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: doc/PLAN_STOCKLY.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: doc/ESTADO_ACTUAL.md.
- Avance: doc/ESTADO_EJECUCION.md. Se actualiza al final de cada tarea.

## Stack
- Next.js App Router + TypeScript + Tailwind CSS. Despliegue en Vercel.
- Postgres de Supabase con el paquete pg y la variable [AJUSTAR: nombre de la variable de conexión].
- Validación con Zod. Pruebas con Vitest.
- Login existente: [AJUSTAR: mecanismo y archivos]. No se reescribe. Dos roles: trabajador y dueno.

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en lib/reglas/: funciones puras, sin pg, sin variables de entorno y sin leer el reloj (excepto fechas.ts).
- Solo lib/datos/ importa lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde lib/dataService.ts.
- Toda ruta en app/api/panel/ llama await exigirUsuario() como primera instrucción; las de economía y usuarios, await exigirDueno().
- El precio de compra y los campos económicos NUNCA se incluyen en una respuesta a un trabajador (se serializa por rol en lib/datos/).
- Entradas validadas con los esquemas de lib/validacion/esquemas.ts.
- Errores de negocio con ErrorDeNegocio(codigo); respuestas con lib/http/respuestas.ts.
- Montos en pesos enteros. Nunca decimales.
- Fechas 'YYYY-MM-DD' como texto entre capas. Zona horaria America/Bogota; "hoy" solo con hoyBogota().
- La referencia y la talla se normalizan (mayúsculas, sin espacios) antes de buscar o comparar.
- En rutas dinámicas params es una Promise: const { id } = await params.
- SQL siempre con parámetros ($1, $2). Nunca concatenar valores.
- Las ventas no se editan ni se eliminan. Un producto no se elimina; se desactiva solo con cantidad 0.
- No instalar librerías de componentes (shadcn, MUI u otras). Usar components/ui/.
- Prefijo de imports para lib: [AJUSTAR].
- Archivo de protección de rutas: [AJUSTAR]. Ruta de login: [AJUSTAR].

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (desde que exista Vitest).
3. Actualizar doc/ESTADO_EJECUCION.md.
4. No hacer commit: el estudiante revisa y hace el commit.
```

TAREA 3. Crea doc/ESTADO_EJECUCION.md:

```markdown
# Estado de ejecución · Stockly

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | pendiente | | | |
| P01 Base de datos | pendiente | | | |
| P02 Reglas de negocio | pendiente | | | |
| P03 Servidor y roles | pendiente | | | |
| P04 Datos | pendiente | | | |
| P05 API | pendiente | | | |
| P06 Interfaz base y resumen | pendiente | | | |
| P07 Inventario | pendiente | | | |
| P08 Entrada de mercancía | pendiente | | | |
| P09 Ventas | pendiente | | | |
| P10 Usuarios y aceptación | pendiente | | | |
| P11 Módulo económico (opcional) | pendiente | | | |

## Bitácora

Cada prompt agrega una sección con: archivos creados, archivos modificados, comandos ejecutados y su resultado, problemas y cómo se resolvieron, pendientes.
```

TAREA 4. Si no existe node_modules, ejecuta npm install. Luego npm run build y registra el resultado en la sección 13 de ESTADO_ACTUAL.md. Si falla, NO corrijas: describe el error.

TAREA 5. Confírmame que entiendes que las credenciales del plan funcional deben haberse rotado antes de seguir (sección 2 del plan). Si la variable de conexión directa a Postgres no existe en .env.local, explícame cómo obtenerla en Supabase (Connect, Transaction pooler, puerto 6543, reemplazar la contraseña) y agregarla a .env.local y a Vercel. No continuar con P01 sin ella.

RESTRICCIONES: no modifiques código, configuración ni dependencias. Solo crea los archivos de este prompt.

AL TERMINAR:
- Crea doc/checkpoints/FASE_0_COMPLETADA.md con: resultado de la compilación, existencia de la variable de conexión, mecanismo de login, forma de vincular login con la tabla usuarios, decisiones derivadas.
- Marca P00 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y los riesgos para los siguientes prompts.
````

**Verificación del estudiante:** abrir `doc/ESTADO_ACTUAL.md` y confirmar que la sección 5 describe el login real, que la 8 identifica la variable de conexión a Postgres y que la 12 propone cómo vincular el login con la tabla `usuarios`.

**Commit sugerido:** `docs: auditoría del repositorio y archivos de control para Copilot`

---

## P01 · Base de datos del módulo

**Fase:** 1 · **Crea:** dos migraciones, `scripts/verificar-bd.mjs` y, si hace falta, `scripts/migrar.mjs`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 5, 8 y 15), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: crear y aplicar las dos migraciones del módulo mínimo y dejar un script que demuestre que la base de datos protege las reglas.

TAREA 1. Si ESTADO_ACTUAL.md reporta tablas previas llamadas usuarios, productos o ventas que NO correspondan a este plan, detente y avísame antes de crear nada. Si no hay conflicto, crea en supabase/migrations/ dos archivos con los nombres de la sección 12 de ESTADO_ACTUAL.md:
- Migración M1 (tablas) con el SQL exacto de la sección 8.2 del plan.
- Migración M2 (vista y seguridad) con el SQL exacto de la sección 8.3.
No cambies nombres de tablas, columnas ni restricciones: el código posterior depende de ellos (sección 8.4).

TAREA 2. Aplica las migraciones:
- Si ESTADO_ACTUAL.md indica un mecanismo existente, úsalo y explícalo en la bitácora.
- Si no:
  a) Instala pg y @types/pg si faltan.
  b) Crea scripts/migrar.mjs que lea la variable de conexión indicada en ESTADO_ACTUAL.md; se conecte con ssl { rejectUnauthorized: false }; cree _migrations (id serial primary key, archivo text unique not null, aplicada_en timestamptz default now()) si no existe; recorra supabase/migrations/*.sql en orden alfabético; aplique en una transacción cada archivo no registrado y lo registre; imprima "aplicada" u "omitida"; termine con código 1 si algo falla.
  c) Si hay migraciones anteriores del login ya aplicadas por otro medio, regístralas en _migrations sin ejecutarlas y explícalo.
  d) Agrega "db:migrar": "node --env-file=.env.local scripts/migrar.mjs" y ejecútalo. (Usa el nombre real de la variable de conexión si no es DATABASE_URL; en ese caso, mapéala a DATABASE_URL dentro de conexion.ts en P03 o documenta el nombre usado.)

TAREA 3. Crea scripts/verificar-bd.mjs y "db:verificar". Debe imprimir:
1. Existencia (sí/no) de usuarios, productos, ventas, eventos_inventario y de la vista v_productos.
2. Número de filas de cada tabla.
3. Restricciones de productos y ventas (pg_constraint) e índices únicos (pg_indexes), confirmando ux_productos_ref_talla y ux_usuarios_usuario.
4. Si RLS está activo en las cuatro tablas (pg_class.relrowsecurity).
5. Pruebas de integridad en UNA transacción que SIEMPRE termina en ROLLBACK, con SAVEPOINT antes de cada caso que debe fallar:
   a) Insertar producto 'CAM001' marca X, descripción Y, talla 'M', cantidad 10, precio_venta 50000, fecha_entrada de hoy: funciona; comprobar que clave_referencia = 'CAM001', clave_talla = 'M' y que v_productos.disponible es true.
   b) Insertar 'cam001' talla 'm' (mismos valores): debe fallar con 23505 en ux_productos_ref_talla (prueba de RN-07: misma clave normalizada).
   c) Insertar producto con cantidad -1: debe fallar con 23514.
   d) Insertar producto con precio_venta 0: debe fallar con 23514.
   e) Insertar usuario rol 'gerente': debe fallar con 23514 (solo trabajador o dueno).
   f) Poner la cantidad del producto del caso a en 0 y comprobar que v_productos.disponible es false.
   Imprime "OK" o "FALLA" por caso.
6. Total de fallas; termina con código 1 si hubo alguna.

Ejecuta npm run db:verificar y copia la salida en la bitácora.

RESTRICCIONES: no modifiques archivos del login ni de app/. No crees tablas distintas a las del plan.

AL TERMINAR:
- npm run build sin errores.
- Crea doc/checkpoints/FASE_1_COMPLETADA.md con la salida de npm run db:verificar.
- Marca P01 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** en Supabase, Table Editor, deben aparecer `usuarios`, `productos`, `ventas` y `eventos_inventario`. La salida de `npm run db:verificar` no debe tener líneas con FALLA.

**Commit sugerido:** `feat(bd): tablas, vista de inventario y restricciones de Stockly`

---

## P02 · Reglas de negocio y pruebas unitarias

**Fase:** 2 · **Crea:** `lib/config/stockly.ts`, `lib/reglas/*` (sin economía completa), `tests/reglas/*`, `vitest.config.ts`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 5, 6, 10.3, 10.4, 10.5, 11.2, 14 y 16.1), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: implementar las reglas del módulo mínimo como funciones puras y probarlas con Vitest.

TAREA 1. Instala vitest (desarrollo). Agrega "test": "vitest run" y "test:ver": "vitest". Crea vitest.config.ts con environment 'node', include ['tests/**/*.test.ts'] y el alias '@' de tsconfig.json.

TAREA 2. Crea lib/config/stockly.ts con el contenido exacto de la sección 10.4.

TAREA 3. Crea lib/reglas/ con las firmas exactas de la sección 10.5:
- errores.ts: CodigoError; MENSAJES y ESTADO_HTTP con la tabla 11.2; clase ErrorDeNegocio (name 'ErrorDeNegocio'; si no recibe mensaje usa MENSAJES[codigo] reemplazando {clave} con detalles).
- fechas.ts: hoyBogota con Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year:'numeric', month:'2-digit', day:'2-digit' }); esFechaValida; esFechaFutura (compara textos YYYY-MM-DD).
- roles.ts: Rol; esDueno; puedeVerEconomia (solo dueño).
- producto.ts: normalizarReferencia y normalizarTalla (trim + mayúsculas); clave(ref, talla) = `${normRef}|${normTalla}`; calcularDisponible(cantidad) = cantidad > 0; validarEntrada en el orden de la sección 10.5 (campos no vacíos → cantidad entera > 0 → precioVenta entero > 0 → fecha válida y no futura; usa DATOS_INVALIDOS salvo la fecha futura, que usa FECHA_FUTURA).
- venta.ts: validarVenta (referencia y talla no vacías, cantidad entera > 0 → DATOS_INVALIDOS); cantidadTrasVenta(disponible, vendida): si vendida > disponible lanza STOCK_INSUFICIENTE con detalles { disponible }; si no, devuelve disponible - vendida.
- economia.ts: crea el archivo con las firmas de la sección 10.5 pero deja las funciones listas para el módulo opcional; en el módulo mínimo no se usan. Impleméntalas igual (son fórmulas puras) pero no las conectes a nada todavía.

Ningún archivo de lib/reglas/ importa pg, next ni process.env, ni llama new Date() (excepto el parámetro por defecto de hoyBogota).

TAREA 4. Crea tests/reglas/ayudas.ts con esperarCodigo(fn, codigo).

TAREA 5. Crea las pruebas en tests/reglas/ (producto, venta, fechas) cubriendo T-01 a T-23 de la sección 16.1. Cada caso con su ID en el nombre. Crea también tests/reglas/economia.test.ts con T-24 a T-32 (las fórmulas ya están implementadas, así que pueden pasar desde ahora).

TAREA 6. Ejecuta npm test hasta que pasen todas (23 del módulo mínimo más 9 de economía). Si una falla, corrige la regla, no la prueba, salvo que la prueba contradiga el plan; explícalo en la bitácora.

RESTRICCIONES: no toques app/, el login ni la base de datos.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_2_COMPLETADA.md con la salida resumida de npm test.
- Marca P02 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** ejecutar `npm test`. Abrir `lib/reglas/venta.ts` y ver cómo `cantidadTrasVenta` aplica las reglas 24 a 27 del plan funcional.

**Commit sugerido:** `feat(reglas): reglas de inventario y ventas puras con pruebas`

---

## P03 · Servidor, sesión con rol y primer dueño

**Fase:** 3 · **Crea:** conexión, sesión con rol, respuestas, esquemas, formato, `/api/panel/sesion` y `scripts/vincular-dueno.mjs` · **Modifica:** protección de rutas y redirección del login

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 1.3, 4, 8.4, 10.1, 10.3, 10.7, 11.1, 11.2, 11.5, 13 y 15), doc/ESTADO_ACTUAL.md (secciones 5 y 12, sobre todo la forma de vincular el login con la tabla usuarios) y doc/ESTADO_EJECUCION.md.

OBJETIVO: dejar lista la infraestructura del servidor y el sistema de roles sobre el login existente.

TAREA 1. lib/db/conexion.ts como la sección 10.7. Si la variable de conexión no se llama DATABASE_URL, usa el nombre real que indica ESTADO_ACTUAL.md. Si ya hay un pool de pg, reutilízalo agregando los parsers.

TAREA 2. lib/auth/sesion.ts, usando el mecanismo del login y la forma de vínculo descrita en ESTADO_ACTUAL.md:
- obtenerUsuario(): Promise<{ id: string; nombre: string; rol: Rol } | null>. Lee la sesión del login, obtiene su identificador, busca en la tabla usuarios la fila con ese auth_ref y devuelve id, nombre y rol. Si hay sesión del login pero no hay fila en usuarios, devuelve null y registra un aviso (el usuario existe en el login pero no está dado de alta en Stockly).
- exigirUsuario(): igual, pero lanza ErrorDeNegocio('NO_AUTORIZADO') si no hay usuario.
- exigirDueno(): llama exigirUsuario y, si el rol no es 'dueno', lanza ErrorDeNegocio('SIN_PERMISO').
- Solo importa funciones del login y consultar de conexion.ts; no modifica archivos del login.

TAREA 3. Protección de rutas en el archivo indicado (proxy.ts o middleware.ts): agrega /panel/:path* y /api/panel/:path* al matcher, conservando lo existente. Sin sesión: las páginas redirigen al login; las rutas /api/panel responden 401 con el formato de la sección 11.1. Si no es posible en ese archivo, deja la protección en el layout de /panel (P06) y en exigirUsuario(), y anótalo.

TAREA 4. Cambia SOLO el destino de la redirección posterior al login a /panel.

TAREA 5. lib/http/respuestas.ts: responderOk(datos, estado=200); responderError (ErrorDeNegocio → ESTADO_HTTP[codigo]; ZodError → 400 DATOS_INVALIDOS con detalles flatten; pg 23505/23503/23514 → traducir con la tabla 8.4 por error.constraint; otro → console.error y 500 ERROR_INTERNO); conManejoDeErrores(handler); leerCuerpo(request, esquema). Todas con Cache-Control: no-store.

TAREA 6. lib/validacion/esquemas.ts con los esquemas de la sección 11.5 (los campos de credencial del usuario según el vínculo definido en ESTADO_ACTUAL.md), con tipos z.infer. No importa nada del servidor.

TAREA 7. lib/formato.ts: formatearPesos (Intl es-CO, COP, sin decimales), formatearFecha (Intl es-CO, dateStyle medium, timeZone UTC), formatearCantidad (entero con separador de miles).

TAREA 8. app/api/panel/sesion/route.ts: GET con conManejoDeErrores; primera instrucción await exigirUsuario(); responde { nombre, rol }. export const dynamic = 'force-dynamic'.

TAREA 9. scripts/vincular-dueno.mjs con "db:vincular-dueno": recibe el identificador de vínculo (auth_ref) y un nombre, e inserta o actualiza en usuarios una fila con rol 'dueno' y ese auth_ref (idempotente). Explícame en el resumen cómo averiguar mi auth_ref según el mecanismo del login (por ejemplo, el id de mi usuario en Supabase Auth o mi correo) y el comando exacto para darme de alta como el primer dueño. Esto es necesario porque, sin una fila en usuarios, obtenerUsuario devuelve null.

VERIFICACIÓN: npm run build y npm test. Da de alta tu cuenta como dueño con db:vincular-dueno. Inicia npm run dev; sin sesión, GET /api/panel/sesion debe dar 401. Pídeme que inicie sesión y abra http://localhost:3000/api/panel/sesion; espera mi confirmación de que responde 200 con mi nombre y rol 'dueno'. Comprueba que el login sigue funcionando y redirige a /panel (puede mostrar 404 hasta P06).

AL TERMINAR:
- Crea doc/checkpoints/FASE_3_COMPLETADA.md con los resultados y el diff resumido de los archivos del login o de protección que tocaste.
- Marca P03 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen, incluido cómo dar de alta más usuarios antes de que exista la pantalla de Usuarios (P10).
````

**Verificación del estudiante:** darse de alta como dueño con el script, iniciar sesión y abrir `/api/panel/sesion`: debe mostrar el nombre y `rol: dueno`. En ventana privada, 401.

**Commit sugerido:** `feat(servidor): conexión, sesión con rol y alta del primer dueño`

---

## P04 · Datos: usuarios, inventario y ventas

**Fase:** 4 (primera parte) · **Crea:** `lib/datos/*`, `lib/dataService.ts`, `scripts/limpiar-prueba.mjs`, `scripts/probar-flujo.ts`, `scripts/cargar-demo.ts`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 5, 6, 7, 8.4, 10.5, 10.6, 11.4, 14 y 16.2), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Revisa lib/reglas/, lib/db/conexion.ts y lib/validacion/esquemas.ts.

OBJETIVO: implementar el acceso a datos y los casos de uso del módulo mínimo, con transacciones, y comprobar el flujo contra la base real.

TAREA 1. lib/datos/tipos.ts con los tipos de la sección 10.6 (DatosEntrada, DatosVenta, DatosUsuario, CambiosUsuario, CambiosProducto, FilaProducto, DetalleProducto, FilaVenta, FilaUsuario, ResultadoVenta, ResumenPanel). FilaProducto y DetalleProducto tienen precioCompra opcional, que solo se llena para el dueño.

TAREA 2. lib/datos/eventos.ts: registrarEvento(tx, { tipo, productoId?, usuarioId?, detalle }).

TAREA 3. lib/datos/usuarios.ts:
- obtenerUsuarioActual(): reexporta la info de lib/auth/sesion (para uso del dataService).
- listarUsuarios(): orden por nombre.
- crearUsuario(d): inserta nombre, usuario, rol y auth_ref según el vínculo definido; usuario duplicado → USUARIO_DUPLICADO (ux_usuarios_usuario).
- actualizarUsuario(id, cambios, duenoActualId): si se cambia rol a trabajador o se desactiva, y esa fila es el único dueño activo, lanza ULTIMO_DUENO (cuenta los dueños activos antes de aplicar). Un dueño no puede desactivarse ni quitarse el rol a sí mismo si es el único dueño.

TAREA 4. lib/datos/productos.ts:
- registrarEntrada(d, usuarioId): validarEntrada con hoyBogota(); en transacción, busca por clave_referencia y clave_talla (producto activo). Si existe: UPDATE cantidad = cantidad + d.cantidad, devuelve sumado true y la cantidad resultante; si no: inserta (sin precio_compra en el módulo mínimo) y devuelve sumado false. Evento ENTRADA_REGISTRADA. (RN-13)
- listarInventario(filtros, rol): desde v_productos, activos; filtros por clave_referencia LIKE, lower(marca) LIKE, clave_talla; soloDisponibles → cantidad > 0; orden por referencia; LIMITE_LISTADO. Incluye precioCompra SOLO si rol es dueno (RN-04). Si no hay coincidencias, lista vacía (RN-27).
- obtenerProducto(id, rol): producto con sus eventos y ventas; precioCompra y economía solo si es dueno.
- actualizarProducto(id, cambios, usuarioId): marca, descripcion, precioVenta; evento PRODUCTO_ACTUALIZADO. (El precio de compra se maneja en el módulo económico.)
- desactivarProducto(id, usuarioId): solo dueño (lo exige la ruta); si cantidad > 0, PRODUCTO_CON_EXISTENCIAS; si no, activo = false.

TAREA 5. lib/datos/ventas.ts:
- registrarVenta(d, usuarioId): secuencia exacta de la sección 7.1 (validarVenta; bloquear producto por clave con FOR UPDATE; STOCK_INSUFICIENTE si excede; insertar venta con copia de referencia, talla y precio_venta y fecha hoyBogota(); descontar cantidad; evento VENTA_REGISTRADA). Devuelve ResultadoVenta { venta, cantidadResultante, agotado }.
- listarVentas(filtros): por referencia (clave LIKE) y rango de fechas; orden por fecha descendente; LIMITE_LISTADO; incluye el nombre del usuario que registró.

TAREA 6. lib/datos/economia.ts: crea el archivo con obtenerEconomia como función que, en el módulo mínimo, lanza un error claro o devuelve null (se implementa en P11). Déjalo preparado pero no conectado.

TAREA 7. lib/datos/productos.ts y ventas.ts aportan a obtenerResumen(rol) en un archivo lib/datos/resumen.ts o dentro de productos.ts: productos activos, unidades disponibles totales, productos agotados (activos con cantidad 0), ventas de hoy (conteo). Para el dueño, deja los campos económicos en null en el módulo mínimo (se llenan en P11).

TAREA 8. lib/dataService.ts como fachada: reexporta las funciones públicas y los tipos. Verifica que ningún archivo fuera de lib/datos importe lib/db/conexion.ts.

TAREA 9. scripts/limpiar-prueba.mjs con "db:limpiar": borra (en orden ventas, eventos, productos) los productos con clave_referencia que empiece por 'PRUEBA' o 'DEMO', y los usuarios con usuario que empiece por 'prueba_' o 'demo_'. Imprime el conteo por tabla. Opciones --prueba y --demo.

TAREA 10. Instala tsx (desarrollo). Crea scripts/probar-flujo.ts con los 13 pasos de la sección 16.2 usando solo dataService (para el rol, pasa 'trabajador' o 'dueno' según el paso). Imprime OK/FALLA por paso; limpia antes y en finally; cierra el pool; código 1 si hay fallas. "probar:flujo": "tsx --env-file=.env.local scripts/probar-flujo.ts" (o la variante con --import tsx). Ejecuta y corrige hasta 0 fallas.

TAREA 11. scripts/cargar-demo.ts con "db:demo": crea ~8 productos DEMO-xxx de varias marcas y tallas, con cantidades (algunas que llevarán a agotado tras una venta) y registra algunas ventas, de modo que queden productos disponibles y al menos uno agotado. Limpia los DEMO antes de cargar. Imprime una tabla con referencia, talla, cantidad y disponibilidad. Ejecútalo.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P04 en ESTADO_EJECUCION.md y agrega la salida de probar:flujo y db:demo en la bitácora. La fase 4 sigue abierta hasta P05.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm run probar:flujo` (13 OK, 0 fallas) y `npm run db:demo`; revisar en Supabase la tabla `productos` con los DEMO.

**Commit sugerido:** `feat(datos): usuarios, inventario y ventas con transacciones y prueba de flujo`

---

## P05 · API

**Fase:** 4 (cierre) · **Crea:** rutas de `app/api/panel/`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 4, 11.1 a 11.5), doc/ESTADO_EJECUCION.md, lib/dataService.ts, lib/http/respuestas.ts, lib/validacion/esquemas.ts y lib/auth/sesion.ts.

OBJETIVO: exponer las operaciones del módulo mínimo con control por rol.

TAREA 1. Crea las rutas de la tabla 11.3 que NO son del módulo económico (deja /api/panel/economia para P11). Reglas de cada handler:
- Primera instrucción: await exigirUsuario(); en /api/panel/usuarios (todas) y en /productos/[id]/desactivar, await exigirDueno().
- conManejoDeErrores; cuerpos con leerCuerpo y los esquemas de 11.5; filtros validados.
- El rol del usuario se obtiene de exigirUsuario y se pasa a las funciones de datos que serializan por rol (listarInventario, obtenerProducto, obtenerResumen), para que el trabajador nunca reciba precioCompra (RN-04, sección 11.4).
- [id] con await params; productos usa uuid, usuarios uuid.
- export const dynamic = 'force-dynamic'.
- POST de productos y ventas responden 201. registrarVenta y registrarEntrada reciben el usuarioId del usuario en sesión.

TAREA 2. Verificación sin sesión: con npm run dev, GET /api/panel/resumen, GET /api/panel/productos y POST /api/panel/ventas deben dar 401.

TAREA 3. Verificación de roles: pídeme que inicie sesión como dueño y abra /api/panel/productos (debe incluir precioCompra, aunque vacío) y /api/panel/usuarios (200). Luego, con una cuenta trabajador (créala con db:vincular-dueno adaptado o con el script de usuarios si ya existe; si no puedes, pídemelo), /api/panel/productos NO debe incluir precioCompra y /api/panel/usuarios debe dar 403. Documenta los resultados.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_4_COMPLETADA.md con probar:flujo (P04) y las verificaciones de roles.
- Marca P05 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** con sesión de dueño, abrir `/api/panel/productos` y confirmar que trae `precioCompra`; con sesión de trabajador, confirmar que no lo trae y que `/api/panel/usuarios` responde 403.

**Commit sugerido:** `feat(api): rutas protegidas con control por rol`

---

## P06 · Interfaz base, navegación y resumen

**Fase:** 5 · **Crea:** `components/ui/*`, layout de `/panel`, resumen · **Modifica:** `app/globals.css` y, según el caso, `app/page.tsx`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 4, 5, 12 y 13), doc/ESTADO_ACTUAL.md (secciones 5, 9 y 11), doc/ESTADO_EJECUCION.md, lib/dataService.ts y lib/formato.ts.

OBJETIVO: construir los componentes reutilizables, la navegación con control por rol y el resumen.

TAREA 1. Agrega los tokens de color de la sección 13 sin borrar nada existente: con Tailwind 4 en @theme de app/globals.css; con Tailwind 3 en tailwind.config.

TAREA 2. components/ui/: Boton (primario, secundario, peligro, fantasma; prop cargando), Campo, Selector, Tarjeta, Insignia (tono neutro, primario, disponible, agotado, inactivo, dueno), Aviso (info, exito, advertencia, error), Modal (fondo oscuro, cierre con Escape y botón, foco al abrir, role dialog), EstadoVacio. Foco visible y contraste suficiente.

TAREA 3. components/panel/:
- NavegacionPanel: barra con "Stockly", enlaces Resumen (/panel), Inventario, Ventas y, solo si el rol es dueno, Usuarios y Economía (esta última solo si MODULO_ECONOMICO_ACTIVO); nombre del usuario, InsigniaRol y botón de cerrar sesión del login. Menú desplegable en móvil. Recibe el rol desde el layout.
- InsigniaDisponibilidad (Disponible/Agotado/Inactivo con los tonos de la sección 13).
- InsigniaRol (trabajador/dueño).

TAREA 4. app/panel/layout.tsx (servidor): obtenerUsuario(); sin usuario, redirect al login (si hay sesión del login pero no fila en usuarios, muestra un Aviso "Tu cuenta no está dada de alta en Stockly. Pide a un dueño que te registre" con botón de cerrar sesión). Renderiza NavegacionPanel con el rol y el contenido (ancho máximo 1200 px, fondo --color-fondo).

TAREA 5. app/page.tsx: si es la plantilla de Next.js, redirección a /panel; si tiene contenido propio, agrega un enlace a /panel sin borrarlo.

TAREA 6. app/panel/page.tsx (servidor) con obtenerResumen(rol): indicadores productos activos, unidades disponibles totales, productos agotados y ventas de hoy; para el dueño, si MODULO_ECONOMICO_ACTIVO, agrega inversión total y ganancia realizada total (en el módulo mínimo vienen null, así que no se muestran). Tabla de productos agotados con enlace al detalle; accesos rápidos a "Registrar entrada" y "Registrar venta". EstadoVacio donde corresponda. Tablas en tarjetas apiladas bajo 640 px.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Comprueba: el login lleva al resumen; como dueño se ven Usuarios y Economía (si está activa); los indicadores reflejan los datos DEMO; la navegación funciona en móvil. Si entras con una cuenta sin fila en usuarios, aparece el aviso de alta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P06 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** iniciar sesión como dueño y revisar el resumen con los datos DEMO; comprobar que la navegación muestra Usuarios. Revisar en móvil.

**Commit sugerido:** `feat(interfaz): componentes base, navegación por rol y resumen`

---

## P07 · Inventario: consulta y detalle

**Fase:** 5 · **Crea:** listado de inventario, filtros y detalle del producto

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 4, 5, 6, 11.3, 11.4, 12 y 13), doc/ESTADO_EJECUCION.md, lib/datos/tipos.ts y los componentes de components/ui/ y components/panel/.

OBJETIVO: consultar y controlar el inventario con filtros y ver el detalle de cada producto, respetando el rol.

TAREA 1. components/panel/FiltrosInventario.tsx (cliente): campos referencia, marca, talla y casilla "Solo disponibles", reflejados en la URL (espera de 300 ms en los campos de texto); botón "Limpiar filtros".

TAREA 2. components/panel/TablaInventario.tsx: columnas referencia, marca, descripción, talla, cantidad (tabular-nums), precio de venta (formatearPesos), disponibilidad (InsigniaDisponibilidad), enlace "Ver". Si el rol es dueño, columna "Precio compra" (formatearPesos o "—" si es null). Tarjetas apiladas bajo 640 px.

TAREA 3. app/panel/inventario/page.tsx (servidor): obtiene el rol con obtenerUsuario(); lee filtros de searchParams (en Next.js 15 y 16 es una Promise); valida con esquemaFiltrosInventario; listarInventario(filtros, rol); muestra la tabla; botón "Registrar entrada"; EstadoVacio "No se encontraron productos con esos filtros" (RN-27); Aviso si se alcanza LIMITE_LISTADO.

TAREA 4. app/panel/inventario/[id]/page.tsx (servidor): obtenerProducto(id, rol) (notFound si no existe). Datos del producto, InsigniaDisponibilidad, historial de eventos y lista de ventas del producto (fecha, cantidad, precio, total de línea). Para el dueño: precio de compra (y, cuando el módulo económico esté activo, inversión y ganancia potencial del producto). Acciones (componente cliente): "Editar" (marca, descripción, precio de venta; PATCH /api/panel/productos/[id]) y, solo dueño, "Desactivar" (visible solo si cantidad 0; POST .../desactivar; confirmación). Tras cada acción, router.refresh().

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Como dueño: filtrar por marca, ver un producto, editar su precio de venta, abrir un producto agotado y desactivarlo. Como trabajador (si tienes la cuenta): confirmar que no aparece la columna ni el dato de precio de compra y que no aparece el botón Desactivar. Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P07 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** filtrar el inventario por marca y por "Solo disponibles"; abrir un producto y editar su precio de venta.

**Commit sugerido:** `feat(interfaz): consulta de inventario y detalle de producto`

---

## P08 · Entrada de mercancía

**Fase:** 5 · **Crea:** formulario de registro de entrada

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 6 con RN-13, 7 con CU-03, 11.3, 12 y 14), doc/ESTADO_EJECUCION.md, lib/reglas/producto.ts y los componentes existentes.

OBJETIVO: registrar la entrada de mercancía, sumando la cantidad cuando la referencia y talla ya existen.

TAREA 1. components/panel/FormularioProducto.tsx (cliente): campos referencia, marca, descripción, talla, cantidad, precio de venta y fecha de entrada (por defecto hoyBogota(), atributo max = hoyBogota()). Validación en el navegador con esquemaEntradaProducto antes de enviar; errores junto a cada campo.
- Aviso de re-stock en vivo: cuando referencia y talla tengan valor, consulta el inventario (GET /api/panel/productos?referencia=...&talla=...) y, si existe un producto con esa clave normalizada, muestra el Aviso de la sección 12.1 con las unidades actuales; indica que la cantidad se sumará.
- POST /api/panel/productos. En la respuesta, usa `sumado` y `cantidadResultante` para el mensaje de éxito ("Producto creado" o "Se sumaron N unidades; ahora hay M"). Navega al inventario o al detalle.

TAREA 2. app/panel/inventario/nuevo/page.tsx: encabezado "Registrar entrada de mercancía" y el formulario. Disponible para ambos roles.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Comprueba: registrar PRUEBA-UI talla M, 10 unidades (creado); registrar de nuevo "prueba-ui" talla "m", 5 unidades (el aviso de re-stock aparece antes de enviar y el resultado dice que ahora hay 15, un solo registro); intentar cantidad 0 (error en el campo); intentar fecha de mañana (error). Al final ejecuta npm run db:limpiar -- --prueba.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P08 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** registrar una entrada; volver a registrar la misma referencia y talla y confirmar que la cantidad se suma en un solo registro.

**Commit sugerido:** `feat(interfaz): registro de entrada con re-stock acumulado`

---

## P09 · Ventas

**Fase:** 5 · **Crea:** registro de venta, buscador de producto y listado de ventas

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 6, 7.1 con CU-04, 11.3, 12 y 14), doc/ESTADO_EJECUCION.md, lib/reglas/venta.ts y los componentes existentes.

OBJETIVO: registrar ventas que descuentan el inventario y consultar el historial de ventas.

TAREA 1. components/panel/BuscadorProducto.tsx (cliente): campos referencia y talla; al completarlos consulta GET /api/panel/productos?referencia=...&talla=... y muestra el producto encontrado con su cantidad disponible, o "No existe un producto con esa referencia y talla".

TAREA 2. components/panel/FormularioVenta.tsx (cliente): usa el BuscadorProducto; campo cantidad con validación en vivo contra la disponible (no permite enviar si cantidad > disponible o cantidad < 1); resumen (referencia, talla, precio de venta, total = precio por cantidad). Botón "Registrar venta" abre un Modal con el texto de confirmación de la sección 12.1. Confirmar: POST /api/panel/ventas. Respuesta: Aviso con la cantidad restante; si agotado es true, lo indica. Si el servidor responde STOCK_INSUFICIENTE (otra venta se adelantó), muestra el mensaje y refresca la disponibilidad.

TAREA 3. app/panel/ventas/nueva/page.tsx: encabezado y el formulario. Disponible para ambos roles.

TAREA 4. components/panel/FiltrosVentas.tsx y TablaVentas.tsx; app/panel/ventas/page.tsx (servidor): listarVentas(filtros) con filtros de referencia y rango de fechas (searchParams como Promise); columnas fecha, referencia, talla, cantidad, precio de venta, total de línea, quién registró; orden por fecha descendente; EstadoVacio "No hay ventas registradas" (RN-27); botón "Registrar venta".

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con un producto de prueba de 15 unidades: vender 20 (rechazo por stock, sin cambios); vender 15 (queda agotado); intentar vender 1 (rechazo); ver las ventas en el listado con su precio y total; comprobar que el inventario muestra el producto agotado. Al final ejecuta npm run db:limpiar -- --prueba.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P09 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** registrar una venta y comprobar que el inventario descuenta la cantidad; intentar vender más de lo disponible y ver el rechazo.

**Commit sugerido:** `feat(interfaz): registro de ventas y consulta del historial`

---

## P10 · Usuarios, aceptación y cierre del módulo mínimo

**Fase:** 5 y 6 · **Crea:** gestión de usuarios (dueño), `doc/ACEPTACION.md` · **Modifica:** `README.md`

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 4, 7 con CU-07, 10.3, 11.3, 12, 15, 16 y 17), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: completar la administración de usuarios para el dueño y cerrar el módulo mínimo con la aceptación.

TAREA 1. components/panel/TablaUsuarios.tsx, FormularioUsuario.tsx y app/panel/usuarios/page.tsx (servidor, solo dueño: usa exigirDueno en la ruta de datos o redirige si el rol no es dueno):
- Tabla: nombre, usuario, rol (InsigniaRol), estado (Activo/Inactivo).
- Acciones: crear usuario (nombre, usuario, rol y los campos de credencial o vínculo según el mecanismo del login descrito en ESTADO_ACTUAL.md; POST /api/panel/usuarios), cambiar rol y activar/desactivar (PATCH /api/panel/usuarios/[id]).
- El dueño no puede quitarse el rol ni desactivarse si es el único dueño: el servidor responde ULTIMO_DUENO y la interfaz muestra el mensaje; además, deshabilita esas acciones sobre la propia fila cuando es el único dueño.
Explica en el resumen cómo se crean usuarios según el login: si el login permite crear cuentas desde aquí, intégralo; si no, el flujo es que la persona primero se registra en el login y el dueño la da de alta en Stockly vinculando su auth_ref (documenta el procedimiento en el README).

TAREA 2. Revisa el código contra las secciones 4, 11.4 y 15. Reporta y corrige en la bitácora: respuestas a trabajador que incluyan precioCompra; rutas sin exigirUsuario/exigirDueno como primera instrucción; montos con decimales; uso de new Date() para "hoy" fuera de fechas.ts; SQL concatenado; textos en inglés; disponibilidad comunicada solo con color.

TAREA 3. Ejecuta npm test y npm run probar:flujo; corrige fallas en el código. Prepara la aceptación: db:limpiar --prueba; conserva los DEMO. Asegúrate de que exista una cuenta trabajador y una dueño para las pruebas (indícame cómo crearlas si hace falta mi intervención en el login).

TAREA 4. Crea doc/ACEPTACION.md con la tabla A-01 a A-19 de la sección 16.3 (columnas: ID, acción, resultado esperado, resultado obtenido, evidencia, observación; las tres últimas vacías) y una nota de que A-20 a A-23 se agregan con el módulo económico (P11).

TAREA 5. Actualiza README.md: descripción; roles; funcionalidades; requisitos; cómo correr en local (npm install, .env.local con los NOMBRES de las variables, db:migrar, db:vincular-dueno para el primer dueño, db:demo, dev); scripts y su propósito; estructura de carpetas; tabla de las reglas del plan funcional con la función o restricción que las aplica; nota de seguridad recordando que las credenciales nunca van en archivos versionados; enlace a doc/PLAN_STOCKLY.md.

TAREA 6. Verifica que .env.local esté en .gitignore y que ningún archivo versionado tenga valores de variables de entorno.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_5_COMPLETADA.md (interfaz) y doc/checkpoints/FASE_6_COMPLETADA.md (revisión de seguridad y pruebas).
- Marca P10 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y recuérdame que A-01 a A-19 se ejecutan en el despliegue de Vercel.
````

**Verificación del estudiante:** como dueño, crear un usuario y cambiar su rol; comprobar que no puedes quitarte el rol de dueño siendo el único. Hacer push y ejecutar A-01 a A-19 en la URL de Vercel, llenando `doc/ACEPTACION.md`.

**Commit sugerido:** `feat(interfaz): administración de usuarios y aceptación del módulo mínimo`

---

## P11 · Módulo económico (opcional)

**Fase:** 7 · **Requisito:** `doc/checkpoints/FASE_6_COMPLETADA.md` existe y `doc/ACEPTACION.md` está diligenciado

````text
Antes de escribir código lee completos: doc/PLAN_STOCKLY.md (secciones 3.2, 4, 9, 10.5, 16.1 (T-24 a T-32) y 18), doc/ESTADO_EJECUCION.md y doc/checkpoints/FASE_6_COMPLETADA.md. Si FASE_6_COMPLETADA.md no existe, detente y avísame.

OBJETIVO: activar el precio de compra y la información económica, visibles solo para el dueño.

TAREA 1. En lib/config/stockly.ts pon MODULO_ECONOMICO_ACTIVO = true. Verifica que lib/reglas/economia.ts tiene las fórmulas de la sección 9 y que las pruebas T-24 a T-32 pasan (se crearon en P02).

TAREA 2. Captura del precio de compra (solo dueño):
- En esquemas: acepta precioCompra (entero ≥ 1) en el registro y la edición de productos.
- En las rutas POST y PATCH de productos: solo si el rol es dueño se lee y guarda precioCompra; si viene de un trabajador, se ignora. Antes de guardar, aplica validarPrecioCompra(precioCompra, precioVenta) (RN-11; PRECIO_VENTA_NO_SUPERA_COMPRA).
- En registrarEntrada y actualizarProducto (lib/datos/productos.ts): acepta y guarda precio_compra cuando lo envía el dueño. En un re-stock, si llega un nuevo precio de compra, actualízalo; si no, conserva el existente.

TAREA 3. lib/datos/economia.ts: implementa obtenerEconomia({ marca? }) con las fórmulas de la sección 9: inversión total y ganancia potencial total sobre productos activos; ganancia realizada total uniendo cada venta con el precio de compra actual de su producto (si un producto no tiene precio de compra registrado, su aporte a inversión, potencial y realizada es 0 y se marca "sin precio de compra"); desglose por producto. Reexporta en dataService.

TAREA 4. app/api/panel/economia/route.ts: GET con exigirDueno(); obtenerEconomia(filtros).

TAREA 5. Interfaz:
- components/panel/TarjetasEconomia.tsx y app/panel/economia/page.tsx (servidor, exigirDueno vía layout o redirección si no es dueño): tarjetas de inversión total, ganancia potencial total y ganancia realizada total; tabla por producto con precio de compra, ganancia por unidad, inversión y ganancia potencial; marca los productos sin precio de compra.
- FormularioProducto y la edición: campo precio de compra visible solo para el dueño, con la validación de RN-11 en vivo.
- Detalle del producto y resumen del dueño: muestran inversión y ganancia potencial del producto, e inversión total y ganancia realizada total en el resumen.
- Inventario: la columna de precio de compra del dueño ya existe (P07); ahora puede tener valores.

TAREA 6. Agrega a doc/ACEPTACION.md las filas A-20 a A-23 de la sección 18.

VERIFICACIÓN: pídeme que inicie sesión como dueño si lo necesitas. Comprueba: registrar el precio de compra de un producto DEMO; intentar un precio de venta menor o igual al de compra (rechazo); abrir /panel/economia y verificar que inversión total, ganancia potencial y ganancia realizada son coherentes con los datos (calcula a mano un caso); confirmar que un producto agotado aporta 0 a la potencial pero sus ventas cuentan en la realizada; como trabajador, confirmar que /panel/economia no es accesible y que /api/panel/economia da 403.

AL TERMINAR:
- npm run build y npm test sin errores (incluidas T-24 a T-32).
- Crea doc/checkpoints/FASE_7_COMPLETADA.md.
- Marca P11 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** como dueño, registrar precios de compra y revisar la página de Economía; comprobar que el trabajador no accede. Verificar a mano uno de los totales.

**Commit sugerido:** `feat(opcional): precio de compra e información económica para el dueño`

---

## Prompts auxiliares

### Corrección de un error

Reemplazar `[NN]` por el número del prompt y pegar el error completo donde se indica.

````text
Durante la ejecución del prompt P[NN] apareció este error:

[PEGAR AQUÍ EL ERROR COMPLETO]

Lee doc/PLAN_STOCKLY.md, doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Encuentra la causa y corrígela sin salir del alcance de P[NN]. No modifiques pruebas ni scripts de prueba para que pasen; corrige el código que prueban. Ejecuta npm run build y npm test. Registra en la bitácora la causa, la corrección y los archivos modificados. Muéstrame un resumen.
````

### Reanudación de un prompt interrumpido

````text
La ejecución anterior del prompt P[NN] se interrumpió. Lee doc/ESTADO_EJECUCION.md, doc/PLAN_STOCKLY.md y doc/PROMPTS_STOCKLY.md (sección P[NN]). Revisa qué archivos de P[NN] ya existen y cuáles faltan, y continúa desde la primera tarea incompleta sin rehacer lo terminado. Al final ejecuta npm run build y npm test, y actualiza la bitácora.
````

### Despliegue fallido en Vercel

````text
El despliegue en Vercel falló con este registro:

[PEGAR AQUÍ EL REGISTRO DEL BUILD DE VERCEL]

Lee doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Identifica la causa (error de compilación, variable de entorno faltante en Vercel, diferencia entre local y producción). Si es de código, corrígelo y verifica con npm run build. Si es una variable de entorno, dime exactamente qué NOMBRE de variable falta y en qué entornos de Vercel agregarla, sin pedir ni mostrar valores. Registra la causa y la solución en la bitácora.
````
