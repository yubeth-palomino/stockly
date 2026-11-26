import { createAdminClient } from '@/lib/supabase/admin';
import { exigirDueno, exigirUsuario } from '@/lib/auth/sesion';
import * as datosComerciales from '@/lib/datos/comercial';
import * as datosEconomia from '@/lib/datos/economia';
import * as datosEvolucion from '@/lib/datos/evolucionVentas';
import * as datosOperaciones from '@/lib/datos/operacionesComerciales';
import * as datosProductos from '@/lib/datos/productos';
import * as datosResumen from '@/lib/datos/resumen';
import * as datosUsuarios from '@/lib/datos/usuarios';
import * as datosVentas from '@/lib/datos/ventas';

export type UsuarioRecuperacion = {
  id: string;
  email: string | null;
};

export type TokenRecuperacion = {
  id: string;
  usuario_id: string;
};

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioRecuperacion | null> {
  const { data, error } = await createAdminClient()
    .from('users')
    .select('id, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function contarSolicitudesRecuperacion(usuarioId: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc('contar_solicitudes_restab', {
    p_usuario_id: usuarioId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function invalidarTokensPendientes(usuarioId: string): Promise<void> {
  const { error } = await createAdminClient().rpc('invalidar_tokens_restab', {
    p_usuario_id: usuarioId,
  });

  if (error) throw error;
}

export async function crearTokenRecuperacion(
  usuarioId: string,
  tokenHash: string,
): Promise<string> {
  const { data, error } = await createAdminClient().rpc('crear_token_restab', {
    p_usuario_id: usuarioId,
    p_token_hash: tokenHash,
  });

  if (error) throw error;
  if (typeof data !== 'string') throw new Error('No se pudo crear el enlace de recuperación.');
  return data;
}

export async function buscarTokenVigente(tokenHash: string): Promise<TokenRecuperacion | null> {
  const { data, error } = await createAdminClient().rpc('buscar_token_restab', {
    p_token_hash: tokenHash,
  });

  if (error) throw error;
  return Array.isArray(data) ? ((data[0] as TokenRecuperacion | undefined) ?? null) : null;
}

export async function marcarTokenComoUsado(tokenId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('marcar_token_restab_usado', {
    p_id: tokenId,
  });

  if (error) throw error;
  return data === true;
}

export async function actualizarContrasenaUsuario(
  usuarioId: string,
  contrasena: string,
): Promise<void> {
  const { error } = await createAdminClient().auth.admin.updateUserById(usuarioId, {
    password: contrasena,
  });

  if (error) throw error;
}

export async function listarInventario(
  filtros: Parameters<typeof datosProductos.listarInventario>[0],
  _rol?: Parameters<typeof datosProductos.listarInventario>[1],
) {
  const usuario = await exigirUsuario();
  return datosProductos.listarInventario(filtros, usuario.rol, usuario.empresaId);
}

export async function exportarInventario(
  filtros: Parameters<typeof datosProductos.exportarInventario>[0],
  _rol?: Parameters<typeof datosProductos.exportarInventario>[1],
) {
  const usuario = await exigirUsuario();
  return datosProductos.exportarInventario(filtros, usuario.rol, usuario.empresaId);
}

export async function buscarProductoEscaneado(
  codigo: string,
  _rol?: Parameters<typeof datosProductos.buscarProductoEscaneado>[1],
) {
  const usuario = await exigirUsuario();
  return datosProductos.buscarProductoEscaneado(codigo, usuario.rol, usuario.empresaId);
}

export async function obtenerProducto(
  id: string,
  _rol?: Parameters<typeof datosProductos.obtenerProducto>[1],
  _usuarioId?: Parameters<typeof datosProductos.obtenerProducto>[2],
  filtros?: Parameters<typeof datosProductos.obtenerProducto>[4],
) {
  const usuario = await exigirUsuario();
  return datosProductos.obtenerProducto(id, usuario.rol, usuario.id, usuario.empresaId, filtros);
}

export async function obtenerFotoPathProducto(id: string) {
  const usuario = await exigirUsuario();
  return datosProductos.obtenerFotoPathProducto(id, usuario.empresaId);
}

export async function listarEventosProducto(
  id: string,
  _rol?: Parameters<typeof datosProductos.listarEventosProducto>[1],
  _usuarioId?: Parameters<typeof datosProductos.listarEventosProducto>[2],
  filtros?: Parameters<typeof datosProductos.listarEventosProducto>[4],
) {
  const usuario = await exigirUsuario();
  return datosProductos.listarEventosProducto(
    id,
    usuario.rol,
    usuario.id,
    usuario.empresaId,
    filtros,
  );
}

export async function registrarEntrada(
  datos: Parameters<typeof datosProductos.registrarEntrada>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosProductos.registrarEntrada>[2],
) {
  const usuario = await exigirUsuario();
  return datosProductos.registrarEntrada(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function actualizarProducto(
  id: string,
  cambios: Parameters<typeof datosProductos.actualizarProducto>[1],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosProductos.actualizarProducto>[3],
) {
  const usuario = await exigirUsuario();
  return datosProductos.actualizarProducto(id, cambios, usuario.id, usuario.rol, usuario.empresaId);
}

export async function desactivarProducto(id: string, _usuarioId?: string) {
  const usuario = await exigirDueno();
  return datosProductos.desactivarProducto(id, usuario.id, usuario.empresaId);
}

export async function contarProductosPorReponer() {
  const usuario = await exigirUsuario();
  return datosResumen.contarProductosPorReponer(usuario.empresaId);
}

export async function obtenerResumen(_rol?: Parameters<typeof datosResumen.obtenerResumen>[0]) {
  const usuario = await exigirUsuario();
  return datosResumen.obtenerResumen(usuario.rol, usuario.empresaId);
}

export async function listarUsuarios() {
  const usuario = await exigirDueno();
  return datosUsuarios.listarUsuarios(usuario.empresaId);
}

export async function crearUsuario(datos: Parameters<typeof datosUsuarios.crearUsuario>[0]) {
  const usuario = await exigirDueno();
  return datosUsuarios.crearUsuario(datos, usuario.empresaId);
}

export async function crearUsuarioVinculado(
  datos: Parameters<typeof datosUsuarios.crearUsuarioVinculado>[0],
) {
  const usuario = await exigirDueno();
  return datosUsuarios.crearUsuarioVinculado(datos, usuario.empresaId);
}

export async function actualizarUsuario(
  id: string,
  cambios: Parameters<typeof datosUsuarios.actualizarUsuario>[1],
  _duenoActualId?: string,
) {
  const usuario = await exigirDueno();
  return datosUsuarios.actualizarUsuario(id, cambios, usuario.id, usuario.empresaId);
}

export { obtenerUsuarioActual } from '@/lib/datos/usuarios';

export async function listarVentas(filtros: Parameters<typeof datosVentas.listarVentas>[0]) {
  const usuario = await exigirUsuario();
  return datosVentas.listarVentas(filtros, usuario.empresaId);
}

export async function exportarVentas(filtros: Parameters<typeof datosVentas.exportarVentas>[0]) {
  const usuario = await exigirUsuario();
  return datosVentas.exportarVentas(filtros, usuario.empresaId);
}

export async function registrarVenta(
  datos: Parameters<typeof datosVentas.registrarVenta>[0],
  _usuarioId?: string,
) {
  const usuario = await exigirUsuario();
  return datosVentas.registrarVenta(datos, usuario.id, usuario.empresaId);
}

export async function registrarVentaConPago(
  datos: Parameters<typeof datosVentas.registrarVentaConPago>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosVentas.registrarVentaConPago>[2],
) {
  const usuario = await exigirUsuario();
  return datosVentas.registrarVentaConPago(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function obtenerEconomia(
  filtros: Parameters<typeof datosEconomia.obtenerEconomia>[0] = {},
) {
  const usuario = await exigirDueno();
  return datosEconomia.obtenerEconomia(filtros, usuario.empresaId);
}

export async function obtenerEvolucionVentas(
  filtros: Parameters<typeof datosEvolucion.obtenerEvolucionVentas>[0],
  _rol: Parameters<typeof datosEvolucion.obtenerEvolucionVentas>[1],
  hoy: string,
) {
  const usuario = await exigirUsuario();
  return datosEvolucion.obtenerEvolucionVentas(filtros, usuario.rol, hoy, usuario.empresaId);
}

export async function obtenerCajaActual(_rol?: Parameters<typeof datosOperaciones.obtenerCajaActual>[0]) {
  const usuario = await exigirDueno();
  return datosOperaciones.obtenerCajaActual(usuario.rol, usuario.empresaId);
}

export async function listarHistorialCajas(
  _rol?: Parameters<typeof datosOperaciones.listarHistorialCajas>[0],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.listarHistorialCajas(usuario.rol, usuario.empresaId);
}

export async function obtenerDetalleCaja(
  id: string,
  _rol?: Parameters<typeof datosOperaciones.obtenerDetalleCaja>[1],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.obtenerDetalleCaja(id, usuario.rol, usuario.empresaId);
}

export async function abrirCaja(
  datos: Parameters<typeof datosOperaciones.abrirCaja>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.abrirCaja>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.abrirCaja(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function registrarMovimientoCaja(
  datos: Parameters<typeof datosOperaciones.registrarMovimientoCaja>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.registrarMovimientoCaja>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.registrarMovimientoCaja(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function cerrarCaja(
  datos: Parameters<typeof datosOperaciones.cerrarCaja>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.cerrarCaja>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.cerrarCaja(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function listarProveedores(
  consulta?: string,
  _rol?: Parameters<typeof datosOperaciones.listarProveedores>[1],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.listarProveedores(consulta, usuario.rol, usuario.empresaId);
}

export async function obtenerProveedor(
  id: string,
  _rol?: Parameters<typeof datosOperaciones.obtenerProveedor>[1],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.obtenerProveedor(id, usuario.rol, usuario.empresaId);
}

export async function guardarProveedor(
  datos: Parameters<typeof datosOperaciones.guardarProveedor>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.guardarProveedor>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.guardarProveedor(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function actualizarProveedor(
  id: string,
  cambios: Parameters<typeof datosOperaciones.actualizarProveedor>[1],
  _rol?: Parameters<typeof datosOperaciones.actualizarProveedor>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.actualizarProveedor(id, cambios, usuario.rol, usuario.empresaId);
}

export async function listarClientes(
  consulta?: string,
  _rol?: Parameters<typeof datosOperaciones.listarClientes>[1],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.listarClientes(consulta, usuario.rol, usuario.empresaId);
}

export async function obtenerDetalleCliente(
  id: string,
  _rol: Parameters<typeof datosOperaciones.obtenerDetalleCliente>[1],
  hoy: string,
) {
  const usuario = await exigirDueno();
  return datosOperaciones.obtenerDetalleCliente(id, usuario.rol, hoy, usuario.empresaId);
}

export async function guardarCliente(
  datos: Parameters<typeof datosOperaciones.guardarCliente>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.guardarCliente>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.guardarCliente(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function actualizarCliente(
  id: string,
  cambios: Parameters<typeof datosOperaciones.actualizarCliente>[1],
  _rol?: Parameters<typeof datosOperaciones.actualizarCliente>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.actualizarCliente(id, cambios, usuario.rol, usuario.empresaId);
}

export async function listarCuentasPorCobrar(
  filtros: Parameters<typeof datosOperaciones.listarCuentasPorCobrar>[0],
  hoy: string,
  _rol?: Parameters<typeof datosOperaciones.listarCuentasPorCobrar>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.listarCuentasPorCobrar(filtros, hoy, usuario.rol, usuario.empresaId);
}

export async function registrarAbono(
  datos: Parameters<typeof datosOperaciones.registrarAbono>[0],
  _usuarioId?: string,
  _rol?: Parameters<typeof datosOperaciones.registrarAbono>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.registrarAbono(datos, usuario.id, usuario.rol, usuario.empresaId);
}

export async function listarAbonos(
  cuentaId: string,
  _rol?: Parameters<typeof datosOperaciones.listarAbonos>[1],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.listarAbonos(cuentaId, usuario.rol, usuario.empresaId);
}

export async function obtenerDashboardComercial(
  filtros: Parameters<typeof datosOperaciones.obtenerDashboardComercial>[0],
  hoy: string,
  _rol?: Parameters<typeof datosOperaciones.obtenerDashboardComercial>[2],
) {
  const usuario = await exigirDueno();
  return datosOperaciones.obtenerDashboardComercial(filtros, hoy, usuario.rol, usuario.empresaId);
}

export async function listarInventarioComercial(
  filtros: Parameters<typeof datosComerciales.listarInventarioComercial>[0],
  _usuario?: Parameters<typeof datosComerciales.listarInventarioComercial>[1],
) {
  const usuario = await exigirUsuario();
  return datosComerciales.listarInventarioComercial(
    { ...filtros, empresaId: usuario.empresaId },
    usuario,
  );
}

export async function crearProductoComercial(
  datos: Parameters<typeof datosComerciales.crearProductoComercial>[0],
  _usuarioId?: string,
) {
  const usuario = await exigirDueno();
  return datosComerciales.crearProductoComercial(
    { ...datos, empresaId: usuario.empresaId },
    usuario.id,
  );
}

export async function ajustarExistenciasComercial(
  datos: Parameters<typeof datosComerciales.ajustarExistenciasComercial>[0],
  _usuarioId?: string,
) {
  const usuario = await exigirDueno();
  return datosComerciales.ajustarExistenciasComercial(
    { ...datos, empresaId: usuario.empresaId },
    usuario.id,
  );
}

export async function registrarVentaComercial(
  datos: Parameters<typeof datosComerciales.registrarVentaComercial>[0],
  _usuarioId?: string,
) {
  const usuario = await exigirUsuario();
  return datosComerciales.registrarVentaComercial(
    { ...datos, empresaId: usuario.empresaId },
    usuario.id,
  );
}

export { cerrarPool } from '@/lib/datos/conexion';

export type {
  CambiosProducto,
  CambiosUsuario,
  DatosEntrada,
  DatosUsuario,
  DatosVenta,
  DetalleProducto,
  FilaEvento,
  FilaProducto,
  FilaUsuario,
  FilaVenta,
  ProductoEconomico,
  ResumenPanel,
  ResumenEconomico,
  ResultadoVenta,
  ResultadoVentaComercial,
} from '@/lib/datos/tipos';
