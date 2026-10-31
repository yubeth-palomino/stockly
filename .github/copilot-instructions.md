# Stockly · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: doc/PLAN_STOCKLY.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: doc/ESTADO_ACTUAL.md.
- Avance: doc/ESTADO_EJECUCION.md. Se actualiza al final de cada tarea.

## Stack
- Next.js App Router + TypeScript. El proyecto no tiene Tailwind CSS; usa CSS global y módulos CSS. Despliegue en Vercel.
- Postgres de Supabase con el paquete `pg` y la variable `STOCKLY_POSTGRES_URL`.
- Validación con Zod. Pruebas con Vitest.
- Login existente: Supabase Auth con `@supabase/ssr`; archivos principales `src/app/api/auth/login/route.ts`, `src/components/auth/LoginForm.tsx`, `src/lib/supabase/server.ts` y `src/proxy.ts`. No se reescribe. Dos roles Stockly: trabajador y dueno.

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
- Prefijo de imports para lib: @/lib.
- Archivo de protección de rutas: src/proxy.ts. Ruta de login: /login.

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (desde que exista Vitest).
3. Actualizar doc/ESTADO_EJECUCION.md.
4. Después de cada prompt, mostrar los cambios y hacer commit y push, según lo solicitado por la persona usuaria.
