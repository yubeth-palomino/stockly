import { describe, expect, it } from 'vitest';
import {
  esquemaEntradaProducto,
  esquemaFiltrosInventario,
  esquemaFiltrosKardex,
  esquemaFiltrosVentas,
  esquemaUsuario,
} from '@/lib/validacion/esquemas';

describe('esquemas de servidor', () => {
  it('recorta textos de entrada y valida cantidades positivas', () => {
    const resultado = esquemaEntradaProducto.safeParse({
      referencia: ' CAM001 ',
      marca: ' Marca ',
      descripcion: ' Camiseta ',
      talla: ' M ',
      cantidad: 2,
      precioVenta: 50_000,
      fechaEntrada: '2030-06-15',
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.referencia).toBe('CAM001');
      expect(resultado.data.cantidad).toBe(2);
    }

    expect(
      esquemaEntradaProducto.safeParse({
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Camiseta',
        talla: 'M',
        cantidad: 0,
        precioVenta: 50_000,
        fechaEntrada: '2030-06-15',
      }).success,
    ).toBe(false);
  });

  it('convierte el filtro soloDisponibles desde parámetros de URL', () => {
    expect(esquemaFiltrosInventario.parse({ soloDisponibles: 'false' }).soloDisponibles).toBe(
      false,
    );
    expect(esquemaFiltrosInventario.parse({ soloDisponibles: 'true' }).soloDisponibles).toBe(true);
  });

  it('valida el identificador de vínculo con Supabase Auth', () => {
    const datos = {
      nombre: 'Dueña de Stockly',
      usuario: 'duena_stockly',
      rol: 'dueno',
      authRef: '63f16e10-83fc-4baa-8e59-9ef6e970dff0',
    };

    expect(esquemaUsuario.safeParse(datos).success).toBe(true);
    expect(esquemaUsuario.safeParse({ ...datos, authRef: 'correo@example.com' }).success).toBe(
      false,
    );
  });

  it('rechaza rangos de ventas invertidos', () => {
    expect(
      esquemaFiltrosVentas.safeParse({ desde: '2030-06-16', hasta: '2030-06-15' }).success,
    ).toBe(false);
  });

  it('valida filtros de Kardex y rechaza rangos invertidos', () => {
    expect(esquemaFiltrosKardex.parse({
      desde: '2030-06-01',
      hasta: '2030-06-15',
      tipo: 'ENTRADA_REGISTRADA',
    })).toEqual({
      desde: '2030-06-01',
      hasta: '2030-06-15',
      tipo: 'ENTRADA_REGISTRADA',
    });
    expect(esquemaFiltrosKardex.safeParse({
      desde: '2030-06-16',
      hasta: '2030-06-15',
    }).success).toBe(false);
  });
});
