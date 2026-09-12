import type { ZodType } from 'zod';
import { exampleRecordSchema } from './example.schema';

export const schemaRegistry: Record<string, ZodType> = {
  example: exampleRecordSchema,
};

export function getSchema(collection: string): ZodType | null {
  return schemaRegistry[collection] ?? null;
}