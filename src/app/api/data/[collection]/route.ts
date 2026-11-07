import { NextResponse } from 'next/server';
import { getSchema } from '@data/_schema/registry';
import { count, create, getAll, getById, remove, update, JsonDBError, ReadOnlyError } from '@/lib/json-db';
import type { QueryOptions } from '@/lib/types';
import { requireAdmin } from '@/lib/supabase/admin-authorization';

type RouteContext = { params: Promise<{ collection: string }> };

function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data, timestamp: new Date().toISOString() },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function failure(error: unknown): NextResponse {
  if (error instanceof JsonDBError) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error.message, code: error.code, timestamp: new Date().toISOString() },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (error instanceof ReadOnlyError) {
    return NextResponse.json(
      { success: false, error: error.message, code: 'READ_ONLY', timestamp: new Date().toISOString() },
      { status: 405, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    { success: false, error: 'Error interno del servidor.', code: 'IO_ERROR', timestamp: new Date().toISOString() },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

async function authorize(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        success: false,
        error: 'El almacenamiento JSON legado no está disponible en producción.',
        code: 'LEGACY_STORAGE_DISABLED',
        timestamp: new Date().toISOString(),
      },
      { status: 410, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const access = await requireAdmin();
  if (!('response' in access)) return null;
  access.response.headers.set('Cache-Control', 'no-store');
  return access.response;
}

async function collectionFrom(context: RouteContext): Promise<string> {
  const { collection } = await context.params;
  if (collection === 'users' || collection === 'sessions') {
    throw new JsonDBError('NOT_FOUND', `Coleccion ${collection} no registrada.`);
  }
  if (!getSchema(collection)) throw new JsonDBError('NOT_FOUND', `Coleccion ${collection} no registrada.`);
  return collection;
}

export async function GET(request: Request, context: RouteContext) {
  const denied = await authorize();
  if (denied) return denied;

  try {
    const collection = await collectionFrom(context);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const record = await getById(collection, id);
      if (!record) throw new JsonDBError('NOT_FOUND', `Registro ${id} no encontrado.`);
      return success(record);
    }
    const sortBy = url.searchParams.get('sortBy');
    const options: QueryOptions = {
      limit: Number(url.searchParams.get('limit') ?? 50),
      offset: Number(url.searchParams.get('offset') ?? 0),
      sortOrder: url.searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc',
      ...(sortBy ? { sortBy } : {}),
    };
    return success(await getAll(collection, options));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: RouteContext) {
  const denied = await authorize();
  if (denied) return denied;

  try {
    const collection = await collectionFrom(context);
    const body = (await request.json()) as Record<string, unknown>;
    return success(await create(collection, body as never), 201);
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await authorize();
  if (denied) return denied;

  try {
    const collection = await collectionFrom(context);
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new JsonDBError('VALIDATION_ERROR', 'El campo id es obligatorio.');
    const partial = { ...body };
    delete partial.id;
    return success(await update(collection, id, partial as never));
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = await authorize();
  if (denied) return denied;

  try {
    const collection = await collectionFrom(context);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new JsonDBError('VALIDATION_ERROR', 'El parametro id es obligatorio.');
    await remove(collection, id);
    return success({ id });
  } catch (error) { return failure(error); }
}

export async function HEAD(_request: Request, context: RouteContext) {
  const denied = await authorize();
  if (denied) return denied;

  try {
    const collection = await collectionFrom(context);
    return success({ collection, total: await count(collection) });
  } catch (error) {
    return failure(error);
  }
}