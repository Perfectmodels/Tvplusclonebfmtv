import { z } from 'zod';
import { ApiError } from './response';

export function parseJson<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('Données invalides.', 400, 'BAD_REQUEST', parsed.error.flatten());
  }
  return parsed.data;
}

export const emailSchema = z.string().trim().email().max(200);
export const slugSchema = z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/);
