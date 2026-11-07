# Fase 6 completada · Usuarios y revisión

- Administración de cuentas Stockly disponible solo para el dueño.
- La cuenta de autenticación se crea primero en Supabase Auth y se vincula mediante su UUID; el login existente no se modificó ni se agregó registro público.
- La interfaz bloquea el cambio de rol o estado del único dueño activo; el servidor conserva la validación transaccional `ULTIMO_DUENO`.
- El archivo `doc/ACEPTACION.md` contiene A-01 a A-19 y mantiene vacías las columnas de ejecución para que se registren los resultados reales de Vercel.
- Verificación técnica, pruebas y revisión de privacidad documentadas en `doc/ESTADO_EJECUCION.md`.
- Antes de afirmar el cierre funcional en producción, ejecutar manualmente la aceptación en Vercel con ambos roles.
