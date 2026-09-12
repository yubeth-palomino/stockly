import type { ZodType } from 'zod';
import { exampleRecordSchema } from './example.schema';
import { productRecordSchema } from './product.schema';

export const schemaRegistry: Record<string, ZodType> = {
  example: exampleRecordSchema,
  products: productRecordSchema,
};

export function getSchema(collection: string): ZodType | null {
  return schemaRegistry[collection] ?? null;
}