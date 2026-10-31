import { spawnSync } from 'node:child_process';
import {
  cerrarPool,
  listarInventario,
  listarUsuarios,
  registrarEntrada,
  registrarVenta,
} from '@/lib/dataService';
import { hoyBogota } from '@/lib/reglas/fechas';

const productosDemo = [
  {
    referencia: 'DEMO-001',
    marca: 'Andina',
    descripcion: 'Camiseta básica',
    talla: 'S',
    cantidad: 12,
    precioVenta: 45_000,
  },
  {
    referencia: 'DEMO-002',
    marca: 'Andina',
    descripcion: 'Camiseta básica',
    talla: 'M',
    cantidad: 8,
    precioVenta: 45_000,
  },
  {
    referencia: 'DEMO-003',
    marca: 'Urbana',
    descripcion: 'Jean recto',
    talla: '30',
    cantidad: 6,
    precioVenta: 110_000,
  },
  {
    referencia: 'DEMO-004',
    marca: 'Urbana',
    descripcion: 'Jean recto',
    talla: '32',
    cantidad: 5,
    precioVenta: 110_000,
  },
  {
    referencia: 'DEMO-005',
    marca: 'Deportiva',
    descripcion: 'Chaqueta liviana',
    talla: 'L',
    cantidad: 3,
    precioVenta: 135_000,
  },
  {
    referencia: 'DEMO-006',
    marca: 'Deportiva',
    descripcion: 'Sudadera',
    talla: 'M',
    cantidad: 10,
    precioVenta: 95_000,
  },
  {
    referencia: 'DEMO-007',
    marca: 'Clásica',
    descripcion: 'Camisa formal',
    talla: 'L',
    cantidad: 4,
    precioVenta: 88_000,
  },
  {
    referencia: 'DEMO-008',
    marca: 'Clásica',
    descripcion: 'Pantalón formal',
    talla: '34',
    cantidad: 2,
    precioVenta: 125_000,
  },
];

function limpiarDemo(): void {
  const resultado = spawnSync(process.execPath, ['scripts/limpiar-prueba.mjs', '--demo'], {
    stdio: 'inherit',
  });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(`La limpieza DEMO terminó con código ${resultado.status}.`);
  }
}

async function cargar(): Promise<void> {
  limpiarDemo();
  const dueno = (await listarUsuarios()).find(
    (usuario) => usuario.rol === 'dueno' && usuario.activo,
  );
  if (!dueno) throw new Error('Se requiere un usuario dueño activo para cargar los datos demo.');

  for (const producto of productosDemo) {
    await registrarEntrada({ ...producto, fechaEntrada: hoyBogota() }, dueno.id);
  }

  await registrarVenta({ referencia: 'DEMO-005', talla: 'L', cantidad: 3 }, dueno.id);
  await registrarVenta({ referencia: 'DEMO-008', talla: '34', cantidad: 2 }, dueno.id);

  const inventario = await listarInventario({ referencia: 'DEMO-' }, 'dueno');
  console.table(
    inventario.map(({ referencia, talla, cantidad, disponible }) => ({
      referencia,
      talla,
      cantidad,
      disponible: disponible ? 'Sí' : 'No',
    })),
  );
}

async function main(): Promise<void> {
  try {
    await cargar();
  } catch (error) {
    console.error('No fue posible cargar los datos demo:', error);
    try {
      limpiarDemo();
    } catch (errorLimpieza) {
      console.error('No se pudo limpiar la carga demo incompleta:', errorLimpieza);
    }
    process.exitCode = 1;
  } finally {
    try {
      await cerrarPool();
    } catch (error) {
      console.error('No se pudo cerrar el pool:', error);
      process.exitCode = 1;
    }
  }
}

void main().catch((error: unknown) => {
  console.error('Error inesperado en db:demo:', error);
  process.exitCode = 1;
});
