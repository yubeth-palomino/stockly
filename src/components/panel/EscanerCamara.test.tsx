// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  decodeFromStream: vi.fn(),
  formatos: [] as string[],
  getUserMedia: vi.fn(),
  stop: vi.fn(),
  detenerPista: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BarcodeFormat: {
    QR_CODE: 'QR_CODE',
    CODE_128: 'CODE_128',
    EAN_13: 'EAN_13',
    EAN_8: 'EAN_8',
    UPC_A: 'UPC_A',
    UPC_E: 'UPC_E',
  },
  BrowserMultiFormatReader: class {
    possibleFormats: unknown[] = [];

    decodeFromStream(
      stream: MediaStream,
      video: HTMLVideoElement,
      alDecodificar: (resultado: { getText: () => string } | undefined) => void,
    ) {
      mocks.formatos = this.possibleFormats.map(String);
      return mocks.decodeFromStream(stream, video, alDecodificar);
    }
  },
}));

import { EscanerCamara } from './EscanerCamara';

describe('EscanerCamara', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: mocks.getUserMedia },
    });
    mocks.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mocks.detenerPista }],
    } as unknown as MediaStream);
  });

  afterEach(() => cleanup());

  it('abre la cámara trasera y lee QR y códigos de barras compatibles', async () => {
    const alLeer = vi.fn();
    const codigo = 'CAM001';
    mocks.decodeFromStream.mockImplementation(
      (
        flujo: MediaStream,
        video: HTMLVideoElement,
        alDecodificar: (resultado: { getText: () => string } | undefined) => void,
      ) => {
        expect(flujo).toBeDefined();
        expect(video).toBeInstanceOf(HTMLVideoElement);
        alDecodificar({ getText: () => codigo });
        return Promise.resolve({ stop: mocks.stop });
      },
    );

    render(<EscanerCamara alLeer={alLeer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear con cámara' }));

    await waitFor(() => expect(alLeer).toHaveBeenCalledWith(codigo));
    expect(mocks.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    expect(mocks.formatos).toEqual([
      'QR_CODE',
      'CODE_128',
      'EAN_13',
      'EAN_8',
      'UPC_A',
      'UPC_E',
    ]);
    expect(mocks.stop).toHaveBeenCalledOnce();
    expect(mocks.detenerPista).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Escanear con cámara' })).not.toBeNull();
  });

  it('informa si el navegador no ofrece acceso a la cámara', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    render(<EscanerCamara alLeer={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear con cámara' }));

    const estado = await screen.findByRole('status');
    expect(estado.textContent).toContain('Este navegador no permite acceso a la cámara.');
    expect(mocks.decodeFromStream).not.toHaveBeenCalled();
  });

  it('muestra el permiso requerido cuando el usuario rechaza la cámara', async () => {
    mocks.getUserMedia.mockRejectedValue(new DOMException('Permiso denegado', 'NotAllowedError'));
    render(<EscanerCamara alLeer={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear con cámara' }));

    expect((await screen.findByRole('status')).textContent).toContain(
      'Permite el acceso a la cámara para escanear.',
    );
  });

  it('detiene las pistas al cerrar la cámara manualmente', async () => {
    mocks.decodeFromStream.mockResolvedValue({ stop: mocks.stop });
    render(<EscanerCamara alLeer={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escanear con cámara' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar cámara' }));

    expect(mocks.stop).toHaveBeenCalledOnce();
    expect(mocks.detenerPista).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Escanear con cámara' })).not.toBeNull();
  });
});
