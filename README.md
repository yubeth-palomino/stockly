# Stockly

Sistema de gestión y control de inventario.

## Demo en línea

[Abrir Stockly](https://stocklyphi.vercel.app)

## Autenticación y recuperación de contraseña

El inicio de sesión usa Supabase Auth. Inicia sesión con una cuenta creada en el proyecto Supabase configurado para la aplicación; no hay credenciales de demostración compartidas.

Para habilitar la recuperación por correo, en el Dashboard de Supabase abre **Authentication → URL Configuration** y agrega la URL de retorno a **Redirect URLs**:

- Desarrollo local: `http://localhost:3000/auth/confirm`
- Producción: `https://<dominio-de-la-aplicacion>/auth/confirm`

Configura también el **Site URL** con el dominio principal de la aplicación. El usuario solicita el enlace desde «Olvidé mi contraseña» y establece una contraseña nueva tras abrir el correo. Las contraseñas se administran en Supabase Auth, no en `public.users`.
