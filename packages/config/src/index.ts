import { z } from 'zod';

export const port = z.coerce.number().int().min(1).max(65535);
export const nodeEnv = z.enum(['development', 'production', 'test']).default('development');

/** Report variable names and validation messages without exposing their values. */
export const parseEnv = <T extends z.ZodTypeAny>(
  serviceName: string,
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> => {
  const result = schema.safeParse(source);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid ${serviceName} configuration: ${fields.join('; ')}`);
  }

  return result.data as z.infer<T>;
};
