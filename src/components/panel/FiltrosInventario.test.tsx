// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inventario',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock('@/components/panel/EscanerCamara', () => ({
  EscanerCamara: ({ alLeer }: { alLeer: (codigo: string) => void }) => (
    <button type="button" onClick={() => alLeer('CAM001')}>
      Escanear prueba
    </button>
  ),
}));

import { FiltrosInventario } from './FiltrosInventario';

describe('FiltrosInventario con escaneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('abre el detalle cuando encuentra una coincidencia escaneada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          datos: [{
            id: '00000000-0000-4000-8000-000000000001',
            referencia: 'CAM001',
            talla: 'M',
            marca: 'Marca',
            descripcion: 'Descripción',
          }],
        }),
      }),
    );
    render(<FiltrosInventario filtros={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear prueba' }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        '/panel/inventario/00000000-0000-4000-8000-000000000001',
      );
    });
  });

  it('informa cuando el valor escaneado no existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, datos: [] }),
      }),
    );
    render(<FiltrosInventario filtros={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear prueba' }));

    expect(await screen.findByText('Producto no encontrado.')).not.toBeNull();
  });
});
