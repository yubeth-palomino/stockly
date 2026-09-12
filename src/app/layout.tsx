import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stockly | Control de inventario',
  description: 'Visibilidad clara para cada producto, movimiento y alerta de tu inventario.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}