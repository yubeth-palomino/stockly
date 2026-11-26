// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapturaFotoProducto } from './CapturaFotoProducto';

const getUserMedia = vi.fn();
const detenerPista = vi.fn();

describe('CapturaFotoProducto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: detenerPista }],
    } as unknown as MediaStream);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: (callback: BlobCallback) =>
        callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })),
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      value: 480,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:foto-producto'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('toma una fotografía JPEG y detiene la cámara', async () => {
    const onFotoChange = vi.fn();
    render(<CapturaFotoProducto onFotoChange={onFotoChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
    const video = await screen.findByLabelText('Vista previa en vivo de la cámara');
    fireEvent.canPlay(video);
    fireEvent.click(await screen.findByRole('button', { name: 'Tomar fotografía' }));

    await waitFor(() => {
      expect(onFotoChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'image/jpeg', name: 'foto-producto.jpg' }),
      );
    });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    expect(detenerPista).toHaveBeenCalledOnce();
    expect(screen.getByAltText('Vista previa de la fotografía del producto')).toBeTruthy();
  });
});
