import type { Rol } from '@/lib/reglas/roles';

export type DatosEntrada = {
  referencia: string;
  marca: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  precioCompra?: number;
  fechaEntrada: string;
};

export type DatosVenta = {
  referencia: string;
  talla: string;
  cantidad: number;
};

export type DatosUsuario = {
  nombre: string;
  usuario: string;
  rol: Rol;
  authRef: string;
};

export type CambiosUsuario = {
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
};

export type CambiosProducto = {
  marca?: string;
  descripcion?: string;
  precioVenta?: number;
  precioCompra?: number;
};

export type FilaProducto = {
  id: string;
  referencia: string;
  marca: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  fechaEntrada: string;
  activo: boolean;
  disponible: boolean;
  precioCompra?: number | null;
};

export type FilaEvento = {
  id: number;
  tipo: string;
  detalle: Record<string, unknown>;
  createdAt: string;
};

export type FilaVenta = {
  id: number;
  productoId: string;
  usuarioId: string | null;
  nombreUsuario: string | null;
  referencia: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  fechaVenta: string;
};

export type DetalleProducto = FilaProducto & {
  eventos: FilaEvento[];
  ventas: FilaVenta[];
  inversion?: number | null;
  gananciaPotencial?: number | null;
};

export type FilaUsuario = {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
};

export type ResultadoVenta = {
  venta: FilaVenta;
  cantidadResultante: number;
  agotado: boolean;
};

export type ResumenPanel = {
  productosActivos: number;
  unidadesDisponibles: number;
  productosAgotados: number;
  ventasHoy: number;
  listaAgotados: FilaProducto[];
  inversionTotal: number | null;
  gananciaPotencialTotal: number | null;
  gananciaRealizadaTotal: number | null;
};

export type ProductoEconomico = {
  id: string;
  referencia: string;
  marca: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  precioCompra: number | null;
  gananciaPorUnidad: number | null;
  inversion: number | null;
  gananciaPotencial: number | null;
  sinPrecioCompra: boolean;
};

export type ResumenEconomico = {
  inversionTotal: number;
  gananciaPotencialTotal: number;
  gananciaRealizadaTotal: number | null;
  productos: ProductoEconomico[];
};
