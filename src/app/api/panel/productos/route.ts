import { exigirUsuario } from '@/lib/auth/sesion';
import { listarInventario, registrarEntrada } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_FOTOS_PRODUCTO } from '@/lib/storage/fotosProducto';
import { esquemaEntradaProducto, esquemaFiltrosInventario } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';
const TAMANO_MAXIMO_FOTO = 3 * 1024 * 1024;

async function obtenerProductos(request: Request) {
  const usuario = await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosInventario.parse(parametros);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.codigoBarras !== undefined ? { codigoBarras: parsed.codigoBarras } : {}),
    ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
    ...(parsed.talla !== undefined ? { talla: parsed.talla } : {}),
    ...(parsed.soloDisponibles !== undefined ? { soloDisponibles: parsed.soloDisponibles } : {}),
  };
  return responderOk(await listarInventario(filtros, usuario.rol));
}

async function crearProducto(request: Request) {
  const usuario = await exigirUsuario();
  const esquema =
    usuario.rol === 'dueno'
      ? esquemaEntradaProducto
      : esquemaEntradaProducto.omit({ precioCompra: true });
  const esFormulario = request.headers
    .get('content-type')
    ?.toLowerCase()
    .startsWith('multipart/form-data');

  let foto: File | undefined;
  let cuerpo: unknown;
  if (esFormulario) {
    let formulario: FormData;
    try {
      formulario = await request.formData();
    } catch {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'No se pudo leer el formulario de entrada.');
    }
    const datos = formulario.get('datos');
    if (typeof datos !== 'string') {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Faltan los datos del producto.');
    }
    try {
      cuerpo = JSON.parse(datos);
    } catch {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Los datos del producto no son válidos.');
    }
    const archivo = formulario.get('foto');
    if (archivo !== null) {
      if (!(archivo instanceof File)) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La fotografía no es válida.');
      }
      if (
        archivo.type !== 'image/jpeg' ||
        archivo.size === 0 ||
        archivo.size > TAMANO_MAXIMO_FOTO
      ) {
        throw new ErrorDeNegocio(
          'DATOS_INVALIDOS',
          'La fotografía debe ser JPEG y no superar 3 MB.',
        );
      }
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El archivo no contiene una foto JPEG válida.');
      }
      foto = archivo;
    }
  } else {
    cuerpo = await leerCuerpo(request, esquema);
  }

  const datos = esquema.parse(cuerpo);
  let rutaFoto: string | undefined;
  const clienteAdmin = foto ? createAdminClient() : null;
  if (foto && clienteAdmin) {
    rutaFoto = `productos/${usuario.empresaId}/${crypto.randomUUID()}.jpg`;
    const { error } = await clienteAdmin.storage
      .from(BUCKET_FOTOS_PRODUCTO)
      .upload(rutaFoto, foto, {
        cacheControl: '60',
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (error) throw error;
  }

  let resultado: Awaited<ReturnType<typeof registrarEntrada>>;
  try {
    resultado = await registrarEntrada(
      { ...datos, ...(rutaFoto ? { fotoPath: rutaFoto } : {}) },
      usuario.id,
      usuario.rol,
    );
  } catch (error) {
    if (rutaFoto && clienteAdmin) {
      try {
        const { error: errorLimpieza } = await clienteAdmin.storage
          .from(BUCKET_FOTOS_PRODUCTO)
          .remove([rutaFoto]);
        if (errorLimpieza) {
          console.error('No se pudo limpiar la foto tras fallar el registro.', errorLimpieza);
        }
      } catch (errorLimpieza) {
        console.error('No se pudo limpiar la foto tras fallar el registro.', errorLimpieza);
      }
    }
    throw error;
  }

  if (resultado.fotoPathAnterior && clienteAdmin) {
    try {
      const { error } = await clienteAdmin.storage
        .from(BUCKET_FOTOS_PRODUCTO)
        .remove([resultado.fotoPathAnterior]);
      if (error) console.error('No se pudo limpiar la fotografía anterior del producto.', error);
    } catch (error) {
      console.error('No se pudo limpiar la fotografía anterior del producto.', error);
    }
  }

  return responderOk(
    {
      productoId: resultado.productoId,
      sumado: resultado.sumado,
      cantidadResultante: resultado.cantidadResultante,
    },
    201,
  );
}

export const GET = conManejoDeErrores(obtenerProductos);
export const POST = conManejoDeErrores(crearProducto);
