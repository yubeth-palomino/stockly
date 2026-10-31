import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  actualizarProducto,
  actualizarUsuario,
  cerrarPool,
  crearUsuario,
  desactivarProducto,
  listarInventario,
  listarVentas,
  listarUsuarios,
  obtenerProducto,
  registrarEntrada,
  registrarVenta,
} from '@/lib/dataService';
import { ErrorDeNegocio, type CodigoError } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import type { DatosEntrada } from '@/lib/datos/tipos';

const usuarioLimpieza = ['--env-file=.env.local', 'scripts/limpiar-prueba.mjs', '--prueba'];
let fallas = 0;
let productoId: string | undefined;

function limpiarPruebas(): void {
  const resultado = spawnSync(process.execPath, usuarioLimpieza, { stdio: 'inherit' });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(`El script de limpieza terminó con código ${resultado.status}.`);
  }
}

async function paso(numero: number, descripcion: string, probar: () => Promise<void>) {
  try {
    await probar();
    console.log(`OK ${numero}: ${descripcion}`);
  } catch (error) {
    fallas += 1;
    const detalle = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`FALLA ${numero}: ${descripcion} — ${detalle}`);
  }
}

async function debeFallarCon(codigo: CodigoError, operacion: () => Promise<unknown>) {
  try {
    await operacion();
  } catch (error) {
    if (error instanceof ErrorDeNegocio && error.codigo === codigo) return;
    throw error;
  }
  throw new Error(`Se esperaba ErrorDeNegocio(${codigo}).`);
}

function mananaBogota(): string {
  const hoy = hoyBogota();
  const manana = new Date(`${hoy}T00:00:00.000Z`);
  manana.setUTCDate(manana.getUTCDate() + 1);
  return manana.toISOString().slice(0, 10);
}

function entrada(cambios: Partial<DatosEntrada> = {}): DatosEntrada {
  return {
    referencia: 'PRUEBA-A',
    marca: 'Marca prueba',
    descripcion: 'Producto de prueba',
    talla: 'M',
    cantidad: 10,
    precioVenta: 50_000,
    fechaEntrada: hoyBogota(),
    ...cambios,
  };
}

async function ejecutar(): Promise<void> {
  limpiarPruebas();
  const dueno = (await listarUsuarios()).find(
    (usuario) => usuario.rol === 'dueno' && usuario.activo,
  );
  if (!dueno) throw new Error('Se requiere al menos un usuario dueño activo para probar el flujo.');

  const nombreUsuarioPrueba = `prueba_flujo_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const usuarioPrueba = await crearUsuario({
    nombre: 'Usuario prueba de flujo',
    usuario: nombreUsuarioPrueba,
    rol: 'trabajador',
    authRef: randomUUID(),
  });
  await debeFallarCon('USUARIO_DUPLICADO', () =>
    crearUsuario({
      nombre: 'Usuario duplicado de flujo',
      usuario: nombreUsuarioPrueba,
      rol: 'trabajador',
      authRef: randomUUID(),
    }),
  );
  await debeFallarCon('ULTIMO_DUENO', () =>
    actualizarUsuario(dueno.id, { rol: 'trabajador' }, dueno.id),
  );

  await paso(1, 'crear PRUEBA-A y dejarlo disponible', async () => {
    const resultado = await registrarEntrada(entrada(), usuarioPrueba.id);
    productoId = resultado.productoId;
    if (resultado.sumado || resultado.cantidadResultante !== 10) {
      throw new Error('La entrada inicial no creó el producto con 10 unidades.');
    }
    const producto = await obtenerProducto(productoId, 'trabajador');
    if (!producto.disponible) throw new Error('El producto inicial no quedó disponible.');
    await actualizarProducto(productoId, { marca: 'Marca actualizada' }, usuarioPrueba.id);
    const actualizado = await obtenerProducto(productoId, 'trabajador');
    if (actualizado.marca !== 'Marca actualizada') {
      throw new Error('No se guardó la actualización del producto.');
    }
  });

  await paso(2, 'normalizar referencia/talla y sumar hasta 15 unidades', async () => {
    const resultado = await registrarEntrada(
      entrada({ referencia: 'prueba-a', talla: 'm', cantidad: 5 }),
      usuarioPrueba.id,
    );
    if (!resultado.sumado || resultado.cantidadResultante !== 15) {
      throw new Error('El re-stock no sumó cinco unidades al producto existente.');
    }
  });

  await paso(3, 'rechazar una entrada de cantidad cero', async () => {
    await debeFallarCon('DATOS_INVALIDOS', () =>
      registrarEntrada(entrada({ cantidad: 0 }), usuarioPrueba.id),
    );
  });

  await paso(4, 'rechazar una fecha de entrada futura', async () => {
    await debeFallarCon('FECHA_FUTURA', () =>
      registrarEntrada(entrada({ fechaEntrada: mananaBogota() }), usuarioPrueba.id),
    );
  });

  await paso(5, 'listar como trabajador sin exponer precioCompra', async () => {
    const productos = await listarInventario({ referencia: 'PRUEBA-A' }, 'trabajador');
    if (productos.length !== 1 || Object.hasOwn(productos[0]!, 'precioCompra')) {
      throw new Error('El trabajador recibió un resultado inesperado o precioCompra.');
    }
  });

  await paso(6, 'rechazar vender más de lo disponible sin cambiar stock', async () => {
    await debeFallarCon('STOCK_INSUFICIENTE', () =>
      registrarVenta({ referencia: 'PRUEBA-A', talla: 'M', cantidad: 20 }, usuarioPrueba.id),
    );
    if (!productoId) throw new Error('No se creó PRUEBA-A.');
    const producto = await obtenerProducto(productoId, 'trabajador');
    if (producto.cantidad !== 15) throw new Error('El stock cambió pese al rechazo de la venta.');
  });

  await paso(7, 'registrar una venta parcial de cinco unidades', async () => {
    const resultado = await registrarVenta(
      { referencia: 'PRUEBA-A', talla: 'M', cantidad: 5 },
      usuarioPrueba.id,
    );
    if (resultado.cantidadResultante !== 10 || resultado.venta.precioVenta !== 50_000) {
      throw new Error('La venta parcial o la copia del precio no coincide.');
    }
  });

  await paso(8, 'vender las diez unidades restantes y agotar el producto', async () => {
    const resultado = await registrarVenta(
      { referencia: 'PRUEBA-A', talla: 'M', cantidad: 10 },
      usuarioPrueba.id,
    );
    if (resultado.cantidadResultante !== 0 || !resultado.agotado) {
      throw new Error('La venta total no agotó el producto.');
    }
  });

  await paso(9, 'rechazar la venta de un producto agotado', async () => {
    await debeFallarCon('STOCK_INSUFICIENTE', () =>
      registrarVenta({ referencia: 'PRUEBA-A', talla: 'M', cantidad: 1 }, usuarioPrueba.id),
    );
  });

  await paso(10, 'excluir PRUEBA-A de soloDisponibles', async () => {
    const productos = await listarInventario(
      { referencia: 'PRUEBA-A', soloDisponibles: true },
      'trabajador',
    );
    if (productos.length !== 0) throw new Error('El producto agotado apareció como disponible.');
  });

  await paso(11, 'rechazar la venta de una referencia inexistente', async () => {
    await debeFallarCon('PRODUCTO_NO_ENCONTRADO', () =>
      registrarVenta(
        { referencia: 'PRUEBA-INEXISTENTE', talla: 'M', cantidad: 1 },
        usuarioPrueba.id,
      ),
    );
  });

  await paso(12, 'desactivar el producto agotado como dueño', async () => {
    if (!productoId) throw new Error('No se creó PRUEBA-A.');
    await desactivarProducto(productoId, dueno.id);
    const producto = await obtenerProducto(productoId, 'dueno');
    if (producto.activo) throw new Error('El producto siguió activo.');
  });

  await paso(13, 'listar las dos ventas y sus precios históricos', async () => {
    const ventas = await listarVentas({ referencia: 'PRUEBA-A' });
    if (
      ventas.length !== 2 ||
      ventas.some((venta) => venta.precioVenta !== 50_000) ||
      ventas.some((venta) => venta.nombreUsuario === null)
    ) {
      throw new Error('El historial no contiene las dos ventas, sus precios y su usuario.');
    }
  });
}

async function main(): Promise<void> {
  try {
    await ejecutar();
  } catch (error) {
    fallas += 1;
    console.error('FALLA de preparación del flujo:', error);
  } finally {
    try {
      limpiarPruebas();
    } catch (error) {
      fallas += 1;
      console.error('FALLA durante la limpieza final:', error);
    }

    try {
      await cerrarPool();
    } catch (error) {
      fallas += 1;
      console.error('FALLA al cerrar el pool:', error);
    }
  }

  console.log(`Total de fallas: ${fallas}`);
  if (fallas > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error('Error inesperado en probar:flujo:', error);
  process.exitCode = 1;
});
