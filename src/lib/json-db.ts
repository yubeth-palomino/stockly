import { mkdir, readFile, rename, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { getSchema } from '@data/_schema/registry';
import type { BaseRecord, CollectionFile, CreateInput, QueryOptions, QueryResult, UpdateInput } from './types';
import { deepClone, generateId, now, safeJsonParse } from './utils';

export type JsonDBErrorCode = 'NOT_FOUND' | 'DUPLICATE_ID' | 'VALIDATION_ERROR' | 'IO_ERROR';

export class JsonDBError extends Error {
  constructor(public readonly code: JsonDBErrorCode, message: string) {
    super(message);
    this.name = 'JsonDBError';
  }
}

export class ReadOnlyError extends Error {
  constructor() {
    super('Las escrituras estan deshabilitadas en produccion.');
    this.name = 'ReadOnlyError';
  }
}

const locks = new Map<string, Promise<void>>();
const dataDirectory = path.resolve(process.env.DATA_DIR ?? './data');

function resolveCollectionPath(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) throw new JsonDBError('IO_ERROR', 'Nombre de coleccion invalido.');
  return path.join(dataDirectory, `${name}.json`);
}

async function readCollection<T extends BaseRecord>(name: string): Promise<CollectionFile<T>> {
  try {
    const raw = await readFile(resolveCollectionPath(name), 'utf8');
    const parsed = safeJsonParse<CollectionFile<T>>(raw);
    if (!parsed || !Array.isArray(parsed.records)) throw new Error('JSON invalido');
    return parsed;
  } catch (error) {
    if (error instanceof JsonDBError) throw error;
    throw new JsonDBError('IO_ERROR', `No se pudo leer la coleccion ${name}.`);
  }
}

async function withLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(name) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => { release = resolve; });
  locks.set(name, current);
  await previous;
  try { return await operation(); } finally { release(); if (locks.get(name) === current) locks.delete(name); }
}

async function writeCollection<T extends BaseRecord>(name: string, data: CollectionFile<T>): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new ReadOnlyError();
  await withLock(name, async () => {
    await mkdir(dataDirectory, { recursive: true });
    const filePath = resolveCollectionPath(name);
    try {
      await access(filePath);
      const backupDirectory = path.join(dataDirectory, '_backups');
      await mkdir(backupDirectory, { recursive: true });
      await copyFile(filePath, path.join(backupDirectory, `${name}_${Date.now()}.json`));
    } catch { /* La primera escritura no tiene un estado previo que respaldar. */ }
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
    await rename(temporaryPath, filePath);
  });
}

function validateRecord<T extends BaseRecord>(collection: string, record: T): T {
  const schema = getSchema(collection);
  if (!schema) return record;
  const result = schema.safeParse(record);
  if (!result.success) throw new JsonDBError('VALIDATION_ERROR', result.error.message);
  return result.data as T;
}

export async function getAll<T extends BaseRecord>(name: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
  const collection = await readCollection<T>(name);
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? 50);
  const records = [...collection.records];
  if (options.sortBy) records.sort((a, b) => String(a[options.sortBy as keyof T] ?? '').localeCompare(String(b[options.sortBy as keyof T] ?? '')) * (options.sortOrder === 'desc' ? -1 : 1));
  return { data: records.slice(offset, offset + limit).map(deepClone), total: records.length, limit, offset };
}

export async function getById<T extends BaseRecord>(name: string, id: string): Promise<T | null> {
  const collection = await readCollection<T>(name);
  const record = collection.records.find((item) => item.id === id);
  return record ? deepClone(record) : null;
}

export async function create<T extends BaseRecord>(name: string, input: CreateInput<T>): Promise<T> {
  const collection = await readCollection<T>(name);
  const prefix = name.replace(/-/g, '_').slice(0, 3);
  const timestamp = now();
  const record = validateRecord(name, { ...input, id: generateId(prefix), createdAt: timestamp, updatedAt: timestamp } as T);
  if (collection.records.some((item) => item.id === record.id)) throw new JsonDBError('DUPLICATE_ID', record.id);
  collection.records.push(record);
  collection._meta.lastModified = timestamp;
  await writeCollection(name, collection);
  return deepClone(record);
}

export async function update<T extends BaseRecord>(name: string, id: string, partial: UpdateInput<T>): Promise<T> {
  const collection = await readCollection<T>(name);
  const index = collection.records.findIndex((item) => item.id === id);
  if (index < 0) throw new JsonDBError('NOT_FOUND', `Registro ${id} no encontrado.`);
  const current = collection.records[index] as T;
  const updated = validateRecord(name, { ...current, ...partial, id, updatedAt: now() });
  collection.records[index] = updated;
  collection._meta.lastModified = updated.updatedAt;
  await writeCollection(name, collection);
  return deepClone(updated);
}

export async function remove(name: string, id: string): Promise<void> {
  const collection = await readCollection(name);
  const next = collection.records.filter((item) => item.id !== id);
  if (next.length === collection.records.length) throw new JsonDBError('NOT_FOUND', `Registro ${id} no encontrado.`);
  collection.records = next;
  collection._meta.lastModified = now();
  await writeCollection(name, collection);
}

export async function query<T extends BaseRecord>(name: string, filter: (record: T) => boolean): Promise<T[]> {
  const collection = await readCollection<T>(name);
  return collection.records.filter(filter).map(deepClone);
}

export async function count(name: string): Promise<number> {
  return (await readCollection(name)).records.length;
}