# Stockly

Sistema de gestión y control de inventario.

## Demo en línea

[Abrir Stockly](https://stocklyphi.vercel.app)

## Autenticación y recuperación de contraseña

El inicio de sesión usa Supabase Auth. Inicia sesión con una cuenta creada en el proyecto Supabase configurado para la aplicación; no hay credenciales de demostración compartidas.

En producción, la URL base de Auth debe ser `https://stocklyphi.vercel.app`. En el Dashboard de Supabase abre **Authentication → URL Configuration** y permite estas URLs de retorno:

- `https://stocklyphi.vercel.app/auth/confirm`
- `http://localhost:3000/auth/confirm` (desarrollo local)

Los enlaces de invitación y recuperación deben volver al dominio público, nunca a `localhost`. El usuario establece una contraseña nueva tras abrir el correo. Las contraseñas se administran en Supabase Auth, no en `public.users`.

La conexión acepta los nombres estándar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, además de los nombres heredados `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY`, `STOCKLY_SUPABASE_URL` y `STOCKLY_SUPABASE_PUBLISHABLE_KEY` usados en el proyecto Vercel existente. Configura esos valores en el proveedor de despliegue; no los incluyas en el repositorio ni los compartas en mensajes.
