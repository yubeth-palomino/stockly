# Recuperar contraseña por correo

El proyecto gana una función de recuperación de contraseña:

1. En el login aparece el enlace "¿Olvidaste tu contraseña?".
2. El usuario escribe su correo y recibe un mensaje con un enlace.
3. El enlace abre una página donde escribe la nueva contraseña.
4. Con la contraseña cambiada, vuelve al login.

El correo se envía con Resend a través del conector que el proyecto ya tiene en Vercel. El trabajo se hace con dos prompts en Copilot: el primero conecta el proyecto con Vercel y prueba el envío de un correo; el segundo construye la recuperación de contraseña.

## Paso 1. Copiar el código del conector

En Vercel: proyecto → **Connect** → conector de Resend. En la sección **Token APIs** aparece un bloque parecido a este:

```ts
import { getToken } from '@vercel/connect';

getToken('resend/proyecto-84459365', { subject: { type: "app" } });
```

Copiar el bloque del proyecto propio. El texto entre comillas cambia en cada proyecto, así que el ejemplo de arriba no sirve para otro.

## Paso 2. Prompt 1: conexión con Vercel y prueba de correo

1. En VS Code, abrir Copilot Chat y seleccionar el modo **Agent**.
2. Copiar el prompt 1 y pegarlo en el chat.
3. Reemplazar la línea `PEGA AQUÍ EL CÓDIGO` por el bloque copiado en el paso 1.
4. Enviar y revisar cada cambio antes de aceptarlo.

Durante el trabajo de Copilot:

- Pide permiso para ejecutar comandos en la terminal: se aprueban.
- Si se abre el navegador para entrar a Vercel, se entra con la misma cuenta del proyecto.
- Si la terminal pregunta a qué proyecto conectar, se elige el proyecto **existente**, no uno nuevo.
- Antes de conectar Vercel, Copilot guarda una copia de `.env.local` en `.env.respaldo.local`.

En proyecto grupal, los dos prompts los aplica el integrante a cargo del login.

```text
CÓDIGO DEL CONECTOR DE RESEND (copiado de Vercel → Connect)
PEGA AQUÍ EL CÓDIGO
FIN DEL CÓDIGO DEL CONECTOR

Contexto del proyecto
- Next.js App Router con TypeScript, desplegado en Vercel. Usa Zod.
- La conexión a Supabase ya funciona. Sus variables están en `.env.local`.
- Los correos se enviarán con Resend. La API key la entrega Vercel Connect con `getToken`, usando el identificador del conector que aparece en el código de arriba. En local, `getToken` necesita la variable `VERCEL_OIDC_TOKEN` en `.env.local`.

Objetivo
Conectar el proyecto con Vercel Connect y comprobar el envío de correos con una página de prueba.

Antes de empezar
- Si el bloque del conector todavía dice "PEGA AQUÍ EL CÓDIGO", detente y pídeme el código del conector.

Tareas (los comandos los ejecutas tú en la terminal)
1. Copia `.env.local` en `.env.respaldo.local` antes de cualquier comando de Vercel.
2. Instala `vercel` como dependencia de desarrollo, y `@vercel/connect` y `resend` como dependencias normales, con el gestor de paquetes que ya usa el proyecto.
3. Ejecuta `npx vercel link`. Si pide iniciar sesión, avísame para hacerlo en el navegador. Enlaza al proyecto existente de Vercel de este repositorio; nunca crees uno nuevo. Si no es claro cuál es, pregúntame.
4. Crea `scripts/tokenVercel.mjs` que:
   - ejecute `npx vercel env pull .env.vercel.local --yes`;
   - tome de ese archivo solo la línea `VERCEL_OIDC_TOKEN`;
   - la escriba en `.env.local` reemplazando la existente o agregándola al final, sin tocar ninguna otra línea;
   - borre `.env.vercel.local`;
   - si algo falla, muestre "Aviso: no se pudo renovar la conexión con Vercel. El envío de correos no funcionará en local." y termine sin error para que el proyecto arranque igual;
   - nunca imprima el token.
5. En `package.json`, antepone `node scripts/tokenVercel.mjs &&` al script `dev`, conservando el comando actual. El token vence cada 12 horas y así se renueva en cada `npm run dev`.
6. Ejecuta `node scripts/tokenVercel.mjs` y confirma que `.env.local` conserva las variables de Supabase y ahora tiene `VERCEL_OIDC_TOKEN`.
7. Crea `lib/correo.ts` con:
   - `obtenerClaveResend()`: devuelve `process.env.RESEND_API_KEY` si existe; si no, el resultado de `getToken` con el identificador y las opciones del código del conector.
   - `enviarCorreo({ para, asunto, html })`: crea el cliente con `new Resend(clave)` y envía desde `process.env.RESEND_FROM` o, si no existe, desde `onboarding@resend.dev`. Devuelve `{ ok: true, id }` o `{ ok: false, error }` con un mensaje legible, sin lanzar excepciones.
8. Crea `app/api/correo/prueba/route.ts` con POST que:
   - responda 404 si `process.env.NODE_ENV === 'production'`;
   - valide con Zod `para` (email);
   - envíe con `enviarCorreo` un correo con asunto "Prueba de correo" y un HTML sencillo;
   - responda JSON con 200, 400 o 500 según el caso, incluyendo el mensaje de error cuando falle.
9. Crea `app/prueba-correo/page.tsx`: en producción llama a `notFound()`; en desarrollo muestra un campo de email y un botón "Enviar prueba" que llama a la ruta anterior y muestra "Correo enviado" o el mensaje de error.
10. Si existe `middleware.ts`, agrega `/prueba-correo` y `/api/correo/prueba` a las rutas públicas.
11. Verifica que `.gitignore` incluya `.env*.local` y `.vercel`.

Restricciones
- Respeta la carpeta `src` si el proyecto la usa.
- Nombres de funciones, variables y comentarios en español.
- `lib/correo.ts` solo se importa desde código de servidor.
- No imprimas en consola la clave ni el token.
- En `.env.local` solo se agrega o actualiza la línea `VERCEL_OIDC_TOKEN`; las demás variables no se tocan.
- Nunca ejecutes `vercel env pull` sin nombre de archivo ni hacia `.env.local`: reemplaza el archivo completo y borra las variables de Supabase.
- No instales nada aparte de `vercel` (desarrollo), `@vercel/connect` y `resend`.
- No modifiques la configuración de Supabase ni archivos que no estén en estas tareas.

Al terminar
- Lista los archivos creados y modificados.
- Dime que ejecute `npm run dev` y abra `http://localhost:3000/prueba-correo`.
```

## Paso 3. Probar el correo

1. Ejecutar `npm run dev` y abrir `http://localhost:3000/prueba-correo`.
2. Escribir un correo y pulsar **Enviar prueba**.
3. La página debe mostrar "Correo enviado" y el mensaje debe llegar a la bandeja.

Mientras el remitente sea el de prueba de Resend (`onboarding@resend.dev`), el correo solo llega a la dirección dueña de la cuenta de Resend con la que se creó el conector. La prueba se hace con esa dirección.

No se avanza al prompt 2 hasta que este paso funcione.

## Paso 4. Prompt 2: recuperación de contraseña

Se pega en Copilot Chat, modo **Agent**, en el mismo chat o en uno nuevo. Este prompt no tiene nada que reemplazar.

```text
Contexto del proyecto
- Next.js App Router con TypeScript, desplegado en Vercel. Usa Zod y bcryptjs con 12 rondas.
- La conexión a Supabase y la tabla de usuarios ya funcionan. Todo acceso a datos del servidor pasa por `dataService.ts`.
- Ya existe `lib/correo.ts` con `enviarCorreo({ para, asunto, html })`, que devuelve `{ ok: true, id }` o `{ ok: false, error }`. Se usa tal como está.

Objetivo
Recuperación de contraseña por correo: el usuario escribe su email, recibe un enlace de un solo uso y en esa página define la nueva contraseña.

Antes de escribir código
- Revisa `dataService.ts` y el esquema para identificar la tabla de usuarios y sus columnas de id, email y contraseña. Usa esos nombres reales.
- Revisa la estructura de `app` (carpeta `src`, grupos de rutas, `middleware.ts`) y los estilos del login para seguir el mismo patrón.

Tareas
1. Crea `supabase/restablecimientos_contrasena.sql` con la tabla `restablecimientos_contrasena`: `id` uuid con default `gen_random_uuid()`, `usuario_id` del mismo tipo que el id de usuarios con llave foránea y `on delete cascade`, `token_hash` text único, `expira_en` timestamptz, `usado_en` timestamptz nulo y `creado_en` timestamptz con default `now()`, más un índice por `usuario_id`.
2. En `dataService.ts` agrega funciones para: buscar usuario por email, contar las solicitudes de un usuario en los últimos 15 minutos, invalidar sus tokens pendientes, crear un token, buscar un token vigente por hash, marcar un token como usado y actualizar la contraseña. Las comparaciones de tiempo se hacen en la base de datos (`expira_en > now()`).
3. Crea `lib/tokenRecuperacion.ts` con `generarToken()` (`crypto.randomBytes(32).toString('hex')`) y `calcularHashToken(token)` (SHA-256 en hexadecimal).
4. Crea `lib/urlBase.ts` con `obtenerUrlBase()`: usa `process.env.APP_URL` si tiene valor; si no, en producción (`VERCEL_ENV === 'production'`) usa `https://` + `VERCEL_PROJECT_PRODUCTION_URL`; si no, `https://` + `VERCEL_URL` si tiene valor; si no, `http://localhost:3000`. Nunca toma la URL de los encabezados de la petición.
5. Crea en `lib/plantillasCorreo.ts` la función `plantillaRecuperacion(enlace)`: HTML sencillo con estilos en línea, un botón con el enlace, el aviso de que vence en 30 minutos y la indicación de ignorar el mensaje si no se solicitó.
6. Crea `app/api/auth/recuperar/route.ts` con POST:
   - valida `email` con Zod;
   - responde siempre 200 con "Si el correo está registrado, recibirás un enlace para restablecer la contraseña.", exista o no el usuario y aunque falle el envío;
   - si el usuario existe y tiene menos de 3 solicitudes en los últimos 15 minutos: invalida sus tokens pendientes, genera uno nuevo, guarda solo su hash con vencimiento de 30 minutos y envía el correo con asunto "Restablecer contraseña" y el enlace `${obtenerUrlBase()}/restablecer-contrasena?token=<token>`.
7. Crea `app/api/auth/restablecer/route.ts` con POST:
   - valida con Zod `token` (64 caracteres hexadecimales), `contrasena` (mínimo 8 caracteres) y `confirmacion` (igual a `contrasena`);
   - busca un registro vigente con el hash del token; si no existe, responde 400 con "El enlace no es válido o ya venció.";
   - si existe: cifra la contraseña con bcryptjs (12 rondas), la actualiza, marca el token como usado e invalida los demás tokens del usuario;
   - responde 200 sin iniciar sesión.
8. Crea `app/recuperar-contrasena/page.tsx` con el formulario de email; deshabilita el botón mientras procesa y muestra el mensaje de la respuesta.
9. Crea `app/restablecer-contrasena/page.tsx`: lee `token` desde `searchParams` en el componente de servidor y lo pasa como prop a un formulario cliente con nueva contraseña y confirmación. No uses `useSearchParams`. Sin token, muestra el mensaje de enlace inválido y un enlace a `/recuperar-contrasena`. Con éxito, redirige al login con un mensaje de confirmación.
10. En la página de login, agrega el enlace "¿Olvidaste tu contraseña?" hacia `/recuperar-contrasena`.

Restricciones
- Respeta la carpeta `src` si el proyecto la usa.
- Nombres de funciones, variables y comentarios en español.
- Todo acceso a la base de datos pasa por `dataService.ts`.
- No cambies `lib/correo.ts`, `scripts/tokenVercel.mjs`, `.env.local` ni la configuración de Supabase.
- No imprimas en consola el token, el enlace ni las contraseñas.
- Las dos páginas y las dos rutas de API son públicas: no las envuelvas con `withAuth` y, si existe `middleware.ts`, agrégalas a las rutas permitidas.
- No instales dependencias nuevas; `crypto` es nativo de Node.
- Reutiliza los estilos y componentes del login.

Al terminar
- Lista los archivos creados y modificados.
- Recuérdame ejecutar `supabase/restablecimientos_contrasena.sql` en el editor SQL de Supabase.
```

## Paso 5. Crear la tabla en Supabase

Copilot deja el archivo `supabase/restablecimientos_contrasena.sql`. En Supabase: **SQL Editor** → pegar el contenido del archivo → **Run**.

## Paso 6. Probar la recuperación

1. Ejecutar `npm run dev` y abrir `http://localhost:3000`.
2. En el login, entrar a "¿Olvidaste tu contraseña?" y escribir el correo de un usuario registrado. Con el remitente de prueba de Resend, debe ser la dirección dueña de la cuenta de Resend.
3. Abrir el enlace que llega al correo, escribir la nueva contraseña e iniciar sesión con ella.

Al hacer push, Vercel despliega y la recuperación funciona en la versión publicada sin configuración adicional. La página `/prueba-correo` no existe en la versión publicada: solo funciona en local.

Casos que deben fallar:

| Caso | Resultado esperado |
|---|---|
| Abrir el mismo enlace por segunda vez | "El enlace no es válido o ya venció." |
| Abrir un enlace vencido (se simula cambiando `expira_en` a una hora pasada en Supabase) | "El enlace no es válido o ya venció." |
| Pedir la recuperación con un correo no registrado | El mismo mensaje de siempre y ningún correo enviado |
| Pedir cuatro veces seguidas con el mismo correo | Llegan tres correos y solo el último enlace funciona |

## Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| Copilot pide el código del conector | Reemplazar `PEGA AQUÍ EL CÓDIGO` por el bloque del paso 1 |
| Al arrancar aparece "Aviso: no se pudo renovar la conexión con Vercel" | Pedirle a Copilot: "Vuelve a conectar el proyecto con Vercel" |
| Supabase dejó de conectar | Copiar el contenido de `.env.respaldo.local` en `.env.local` |
| Copilot creó un proyecto nuevo en Vercel | Pedirle que borre la carpeta `.vercel` y enlace el proyecto existente; eliminar el proyecto sobrante en el panel de Vercel |
| La prueba dice que solo se permiten correos a la dirección propia | Usar el correo dueño de la cuenta de Resend |
| La prueba dice "Correo enviado" pero no llega | Revisar spam |
| `/prueba-correo` o `/recuperar-contrasena` manda al login | Pedirle a Copilot que agregue esa ruta a las rutas públicas |
| El enlace del correo pide iniciar sesión en Vercel | Se probó en un despliegue de Preview. Probar en local o en la versión de producción |
