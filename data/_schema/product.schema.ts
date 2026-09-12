import { z } from 'zod';
import { baseRecordSchema } from './base.schema';

export const productRecordSchema = baseRecordSchema.extend({
  sku: z.string().min(2).max(50),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  stock: z.number().int().nonnegative(),
  minimumStock: z.number().int().nonnegative(),
  unitCost: z.number().nonnegative(),
  active: z.boolean(),
});

export type ProductRecord = z.infer<typeof productRecordSchema>;