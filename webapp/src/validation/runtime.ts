import { z } from 'zod';

const validationMessageSchema = z
  .object({
    id: z.string().optional(),
    message: z
      .string()
      .optional()
      .transform((value) => (typeof value === 'string' && value.trim() ? value.trim() : ''))
      .default(''),
    level: z.enum(['info', 'success', 'warning', 'error']).optional(),
    severity: z.enum(['info', 'warning', 'error']).optional(),
    scope: z.string().optional(),
    hint: z.string().optional(),
    path: z.array(z.union([z.string(), z.number()])).optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

const validationResultSchema = z
  .object({
    ok: z.boolean().optional(),
    status: z.string().optional(),
    messages: z.array(validationMessageSchema).default([]),
    corrected: z.array(z.unknown()).default([]),
    discarded: z.array(z.unknown()).default([]),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();

const runtimeEnvelopeSchema = z
  .object({
    result: validationResultSchema.optional(),
    messages: z.array(validationMessageSchema).optional(),
    corrected: z.array(z.unknown()).optional(),
    discarded: z.array(z.unknown()).optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .transform((payload) => {
    const base = payload.result ?? {};
    const messages = base.messages ?? payload.messages ?? [];
    const corrected = base.corrected ?? payload.corrected ?? [];
    const discarded = base.discarded ?? payload.discarded ?? [];
    const meta = { ...(base.meta ?? {}), ...(payload.meta ?? {}) };
    return {
      ...base,
      messages,
      corrected,
      discarded,
      meta,
    };
  });

export type RuntimeValidationMessage = z.infer<typeof validationMessageSchema>;
export type RuntimeValidationResult = z.infer<typeof runtimeEnvelopeSchema>;

export function parseRuntimeValidationResult(input: unknown): RuntimeValidationResult {
  return runtimeEnvelopeSchema.parse(input);
}
