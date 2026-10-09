import type { Context } from 'hono';
import type { z } from 'zod';
import { apiError } from './errors';

/** Parses and validates a JSON body; returns a 400 response (never the input) when invalid. */
export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.infer<S> | Response> {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    return apiError(c, 400, 'invalid-request', `Invalid request: ${fields.join(', ') || 'body'}`);
  }
  return parsed.data;
}
