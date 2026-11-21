// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  decodeFromVideoDevice: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BarcodeFormat: { EAN_13: 'EAN_13' },
  BrowserMultiFormatReader: class {
    possibleFormats: unknown[] = [];

    decodeFromVideoDevice(
      deviceId: string | undefined,
      video: HTMLVideoElement,
      alDecodificar: (resultado: { getText: () => string } | undefined) => void,
    ) {
      return mocks.decodeFromVideoDevice(deviceId, video, alDecodificar);
    }
  },
}));

import { EscanerCamara } from './EscanerCamara';

describe('EscanerCamara', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
  });

  afterEach(() => cleanup());

  it('monta el video, entrega el código detectado y detiene el lector', async () => {
    const alLeer = vi.fn();
    const codigo = '2000000000015';
    mocks.decodeFromVideoDevice.mockImplementation(
      (
        dispositivo: string | undefined,
        video: HTMLVideoElement,
        alDecodificar: (resultado: { getText: () => string } | undefined) => void,
      ) => {
        expect(dispositivo).toBeUndefined();
        expect(video).toBeInstanceOf(HTMLVideoElement);
        alDecodificar({ getText: () => codigo });
        return Promise.resolve({ stop: mocks.stop });
      },
    );

    render(<EscanerCamara alLeer={alLeer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear con cámara' }));

    await waitFor(() => expect(alLeer).toHaveBeenCalledWith(codigo));
    expect(mocks.stop).toHaveBeenCalledOnce();
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
    expect(mocks.decodeFromVideoDevice).not.toHaveBeenCalled();
  });
});
