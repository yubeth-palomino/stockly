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
  obtenerEconomia,
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
    const producto = await obtenerProducto(productoId, 'trabajador', usuarioPrueba.id);
    if (!producto.disponible) throw new Error('El producto inicial no quedó disponible.');
    await actualizarProducto(productoId, { marca: 'Marca actualizada' }, usuarioPrueba.id);
    const actualizado = await obtenerProducto(productoId, 'trabajador', usuarioPrueba.id);
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
    const producto = await obtenerProducto(productoId, 'trabajador', usuarioPrueba.id);
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
    const producto = await obtenerProducto(productoId, 'dueno', dueno.id);
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

  let productoEconomicoId: string | undefined;
  await paso(14, 'registrar costo y calcular inversión/ganancia potencial', async () => {
    const resultado = await registrarEntrada(
      entrada({
        referencia: 'PRUEBA-ECONOMIA',
        marca: 'Marca economía prueba',
        talla: 'L',
        cantidad: 5,
        precioVenta: 20_000,
        precioCompra: 10_000,
      }),
      dueno.id,
      'dueno',
    );
    productoEconomicoId = resultado.productoId;
    const detalle = await obtenerProducto(productoEconomicoId, 'dueno', dueno.id);
    if (
      detalle.precioCompra !== 10_000 ||
      detalle.inversion !== 50_000 ||
      detalle.gananciaPotencial !== 50_000
    ) {
      throw new Error('El producto no conserva el costo o sus cálculos iniciales.');
    }
  });

  await paso(15, 'ocultar costos a trabajador y calcular ganancia realizada', async () => {
    if (!productoEconomicoId) throw new Error('No se creó PRUEBA-ECONOMIA.');
    const detalleTrabajador = await obtenerProducto(
      productoEconomicoId,
      'trabajador',
      usuarioPrueba.id,
    );
    const listadoTrabajador = await listarInventario(
      { referencia: 'PRUEBA-ECONOMIA' },
      'trabajador',
    );
    if (
      Object.hasOwn(detalleTrabajador, 'precioCompra') ||
      Object.hasOwn(detalleTrabajador, 'inversion') ||
      Object.hasOwn(detalleTrabajador, 'gananciaPotencial') ||
      Object.hasOwn(listadoTrabajador[0] ?? {}, 'precioCompra')
    ) {
      throw new Error('La respuesta de trabajador contiene datos económicos.');
    }

    await registrarVenta(
      { referencia: 'PRUEBA-ECONOMIA', talla: 'L', cantidad: 2 },
      usuarioPrueba.id,
    );
    const economia = await obtenerEconomia({ marca: 'Marca economía prueba' });
    if (
      economia.productos.length !== 1 ||
      economia.gananciaRealizadaTotal !== 20_000 ||
      economia.inversionTotal !== 30_000 ||
      economia.gananciaPotencialTotal !== 30_000
    ) {
      throw new Error('Los totales no coinciden después de vender dos unidades.');
    }
  });

  await paso(16, 'actualizar costo en re-stock y recalcular ventas históricas', async () => {
    const reingreso = await registrarEntrada(
      entrada({
        referencia: 'PRUEBA-ECONOMIA',
        marca: 'Marca economía prueba',
        talla: 'L',
        cantidad: 2,
        precioVenta: 20_000,
        precioCompra: 12_000,
      }),
      dueno.id,
      'dueno',
    );
    const economia = await obtenerEconomia({ marca: 'Marca economía prueba' });
    if (
      !reingreso.sumado ||
      reingreso.cantidadResultante !== 5 ||
      economia.inversionTotal !== 60_000 ||
      economia.gananciaPotencialTotal !== 40_000 ||
      economia.gananciaRealizadaTotal !== 16_000
    ) {
      throw new Error('No se conservó el nuevo costo o la ganancia histórica recalculada.');
    }
    await debeFallarCon('PRECIO_VENTA_NO_SUPERA_COMPRA', () =>
      actualizarProducto(
        reingreso.productoId,
        { precioVenta: 12_000 },
        dueno.id,
        'dueno',
      ),
    );
    await debeFallarCon('PRECIO_VENTA_NO_SUPERA_COMPRA', () =>
      registrarEntrada(
        entrada({
          referencia: 'PRUEBA-COSTO-INVALIDO',
          precioCompra: 50_000,
        }),
        dueno.id,
        'dueno',
      ),
    );
  });

  await paso(17, 'marcar productos sin costo sin inflar los totales', async () => {
    await registrarEntrada(
      entrada({
        referencia: 'PRUEBA-SIN-COSTO',
        marca: 'Marca sin costo prueba',
        cantidad: 2,
      }),
      dueno.id,
      'dueno',
    );
    const economia = await obtenerEconomia({ marca: 'Marca sin costo prueba' });
    if (
      economia.productos.length !== 1 ||
      !economia.productos[0]?.sinPrecioCompra ||
      economia.productos[0].inversion !== null ||
      economia.inversionTotal !== 0 ||
      economia.gananciaPotencialTotal !== 0 ||
      economia.gananciaRealizadaTotal !== 0
    ) {
      throw new Error('El producto sin costo no está marcado o alteró los totales.');
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
