// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilaProducto } from '@/lib/datos/tipos';
import { SelectorEtiquetas } from './SelectorEtiquetas';

const producto: FilaProducto = {
  id: '00000000-0000-4000-8000-000000000001',
  referencia: 'CAM001',
  marca: 'Marca',
  descripcion: 'Camisa de prueba',
  talla: 'M',
  cantidad: 3,
  precioVenta: 50_000,
  fechaEntrada: '2026-11-21',
  activo: true,
  disponible: true,
  codigoBarras: '2000000000015',
};

describe('SelectorEtiquetas', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('prepara QR y detalles de producto y abre el diálogo de impresión', () => {
    const imprimir = vi.fn();
    Object.defineProperty(window, 'print', { configurable: true, value: imprimir });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    render(
      <SelectorEtiquetas productos={[producto]} productoInicial={producto.id} />,
    );

    expect(screen.getByText('Camisa de prueba')).not.toBeNull();
    expect(screen.getByText('Marca · CAM001 · Talla M')).not.toBeNull();
    expect(document.querySelector('[data-print-area="etiquetas"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Código QR de CAM001"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas' }));

    expect(imprimir).toHaveBeenCalledOnce();
  });

  it('permite generar etiquetas QR aunque el producto no tenga código de barras', () => {
    const productoSinCodigo = { ...producto, codigoBarras: null };
    render(<SelectorEtiquetas productos={[productoSinCodigo]} productoInicial={producto.id} />);

    expect(screen.getByRole('button', { name: 'Imprimir etiquetas' }).getAttribute('disabled')).toBeNull();
    expect(document.querySelector('[aria-label="Código QR de CAM001"]')).not.toBeNull();
  });
});
