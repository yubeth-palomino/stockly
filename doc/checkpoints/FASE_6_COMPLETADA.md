# Fase 6 completada · Usuarios y revisión

- Administración de cuentas Stockly disponible solo para el dueño.
- La cuenta de autenticación se crea primero en Supabase Auth y se vincula mediante su UUID; el login existente no se modificó ni se agregó registro público.
- La interfaz bloquea el cambio de rol o estado del único dueño activo; el servidor conserva la validación transaccional `ULTIMO_DUENO`.
- El archivo `doc/ACEPTACION.md` contiene A-01 a A-19 y mantiene vacías las columnas de ejecución para que se registren los resultados reales de Vercel.
- Verificación técnica, pruebas y revisión de privacidad documentadas en `doc/ESTADO_EJECUCION.md`.
- Antes de afirmar el cierre funcional en producción, ejecutar manualmente la aceptación en Vercel con ambos roles.
- Revalidación técnica 2026-11-25: build, lint y 212 pruebas Vitest correctos. `npm run probar:flujo` y `npm run db:limpiar -- --prueba` quedaron bloqueados porque el entorno local no contiene `STOCKLY_POSTGRES_URL` ni `STOCKLY_POSTGRES_URL_NON_POOLING`; no se modificaron bases ni datos.
