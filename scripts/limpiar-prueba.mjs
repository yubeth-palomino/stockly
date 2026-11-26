import { crearClienteBaseDatos } from './db-client.mjs';

const argumentos = new Set(process.argv.slice(2));
const opcionesValidas = new Set(['--prueba', '--demo']);
const invalidos = [...argumentos].filter((argumento) => !opcionesValidas.has(argumento));

if (invalidos.length > 0 || argumentos.size === 0) {
  console.error('Uso: npm run db:limpiar -- [--prueba] [--demo]');
  process.exitCode = 1;
} else {
  const prefijosProducto = [];
  const prefijosUsuario = [];
  if (argumentos.has('--prueba')) {
    prefijosProducto.push('PRUEBA');
    prefijosUsuario.push('prueba_');
  }
  if (argumentos.has('--demo')) {
    prefijosProducto.push('DEMO');
    prefijosUsuario.push('demo_');
  }

  const cliente = crearClienteBaseDatos();
  try {
    await cliente.connect();
    await cliente.query('BEGIN');

    const condicionesProducto = prefijosProducto
      .map((_, indice) => `left(clave_referencia, char_length($${indice + 1})) = $${indice + 1}`)
      .join(' OR ');

    await cliente.query(
      `DELETE FROM abonos
       WHERE cuenta_id IN (
         SELECT c.id
         FROM cuentas_por_cobrar c
         JOIN ventas v ON v.id = c.venta_id
         JOIN productos p ON p.id = v.producto_id
         WHERE ${condicionesProducto}
       )`,
      prefijosProducto,
    );
    await cliente.query(
      `DELETE FROM cuentas_por_cobrar
       WHERE venta_id IN (
         SELECT v.id
         FROM ventas v
         JOIN productos p ON p.id = v.producto_id
         WHERE ${condicionesProducto}
       )`,
      prefijosProducto,
    );
    await cliente.query(
      `DELETE FROM pagos_venta
       WHERE venta_id IN (
         SELECT v.id
         FROM ventas v
         JOIN productos p ON p.id = v.producto_id
         WHERE ${condicionesProducto}
       )`,
      prefijosProducto,
    );
    const ventas = await cliente.query(
      `DELETE FROM ventas
       WHERE producto_id IN (
         SELECT id FROM productos WHERE ${condicionesProducto}
       )`,
      prefijosProducto,
    );
    const eventos = await cliente.query(
      `DELETE FROM eventos_inventario
       WHERE producto_id IN (
         SELECT id FROM productos WHERE ${condicionesProducto}
       )`,
      prefijosProducto,
    );
    const productos = await cliente.query(
      `DELETE FROM productos WHERE ${condicionesProducto}`,
      prefijosProducto,
    );

    const condicionesUsuario = prefijosUsuario
      .map((_, indice) => `left(lower(btrim(usuario)), length($${indice + 1})) = $${indice + 1}`)
      .join(' OR ');
    await cliente.query(
      `DELETE FROM usuarios_sucursales
       WHERE usuario_id IN (
         SELECT id FROM usuarios WHERE ${condicionesUsuario}
       )`,
      prefijosUsuario,
    );
    await cliente.query(
      `DELETE FROM empresas_usuarios
       WHERE usuario_id IN (
         SELECT id FROM usuarios WHERE ${condicionesUsuario}
       )`,
      prefijosUsuario,
    );
    const usuarios = await cliente.query(
      `DELETE FROM usuarios WHERE ${condicionesUsuario}`,
      prefijosUsuario,
    );

    await cliente.query('COMMIT');
    console.log(`Ventas eliminadas: ${ventas.rowCount ?? 0}`);
    console.log(`Eventos eliminados: ${eventos.rowCount ?? 0}`);
    console.log(`Productos eliminados: ${productos.rowCount ?? 0}`);
    console.log(`Usuarios eliminados: ${usuarios.rowCount ?? 0}`);
  } catch (error) {
    await cliente.query('ROLLBACK').catch((errorRollback) => {
      console.error('No se pudo revertir la limpieza:', errorRollback);
    });
    console.error('No fue posible limpiar los datos seleccionados:', error);
    process.exitCode = 1;
  } finally {
    await cliente.end().catch((error) => {
      console.error('No se pudo cerrar la conexión de base de datos:', error);
      process.exitCode = 1;
    });
  }
}
