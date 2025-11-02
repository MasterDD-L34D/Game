import type { ErrorObject } from 'ajv';

import { resolveApiUrl } from './apiEndpoints';

export interface TraitSummary {
  id: string;
  label: string;
  category: string;
  path: string;
  updatedAt?: string;
  isDraft?: boolean;
}

export interface TraitListResponse {
  traits: TraitSummary[];
  meta?: Record<string, unknown>;
}

export interface TraitEntryResponse {
  trait: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface TraitSchemaResponse {
  schema: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface TraitRequestOptions {
  token?: string;
  signal?: AbortSignal;
}

export interface TraitSaveOptions extends TraitRequestOptions {
  payload: Record<string, unknown>;
}

export interface TraitValidationSuggestion {
  path: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  fix?: {
    type?: 'set' | 'append' | 'remove';
    value?: unknown;
    note?: string;
    autoApplicable?: boolean;
  } | null;
}

export interface TraitCorrectionMessage {
  path: string;
  message: string;
  action: string;
  severity?: 'info' | 'warning' | 'error';
  value?: unknown;
  note?: string;
  autoApplicable?: boolean;
}

export interface TraitValidationSummary {
  schemaErrors?: number;
  style?: {
    total?: number;
    bySeverity?: Record<string, number>;
    corrections?: {
      total?: number;
      actionable?: number;
    };
  };
  [key: string]: unknown;
}

export interface TraitValidationResponse {
  valid: boolean;
  errors?: ErrorObject[];
  suggestions?: TraitValidationSuggestion[];
  summary?: TraitValidationSummary;
  corrections?: TraitCorrectionMessage[];
}

export interface TraitValidationRequest extends TraitRequestOptions {
  traitId?: string;
  payload: Record<string, unknown>;
}

export interface TraitRequestError extends Error {
  status?: number;
  detail?: unknown;
}

interface InternalRequestOptions extends TraitRequestOptions {
  method?: string;
  body?: unknown;
}

function buildHeaders(options: TraitRequestOptions, hasBody: boolean): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }
  const token = options.token?.trim();
  if (token) {
    headers.set('X-Trait-Editor-Token', token);
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function requestJson<T>(path: string, options: InternalRequestOptions = {}): Promise<T> {
  const targetUrl = resolveApiUrl(path);
  const hasBody = options.body !== undefined;
  const response = await fetch(targetUrl, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options, hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: options.method === 'GET' ? 'no-store' : 'no-cache',
  });

  const rawText = await response.text();
  const data = rawText ? safeParseJson(rawText) : null;

  if (!response.ok) {
    const error = new Error(
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : null) || `Errore API traits (${response.status})`,
    ) as TraitRequestError;
    error.status = response.status;
    error.detail = data;
    throw error;
  }

  return (data ?? undefined) as T;
}

function safeParseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn('[traits-service] risposta JSON non valida', error);
    return null;
  }
}

export async function fetchTraitSchema(
  options: TraitRequestOptions = {},
): Promise<TraitSchemaResponse> {
  return requestJson<TraitSchemaResponse>('/api/traits/schema', options);
}

export async function fetchTraitList(
  options: TraitRequestOptions & { includeDrafts?: boolean } = {},
): Promise<TraitListResponse> {
  const params = new URLSearchParams();
  if (options.includeDrafts) {
    params.set('includeDrafts', 'true');
  }
  const query = params.toString();
  const path = query ? `/api/traits?${query}` : '/api/traits';
  return requestJson<TraitListResponse>(path, options);
}

export async function fetchTraitEntry(
  id: string,
  options: TraitRequestOptions = {},
): Promise<TraitEntryResponse> {
  const safeId = encodeURIComponent(id);
  return requestJson<TraitEntryResponse>(`/api/traits/${safeId}`, options);
}

export async function saveTraitEntry(
  id: string,
  { payload, ...options }: TraitSaveOptions,
): Promise<TraitEntryResponse> {
  const safeId = encodeURIComponent(id);
  return requestJson<TraitEntryResponse>(`/api/traits/${safeId}`, {
    ...options,
    method: 'PUT',
    body: payload,
  });
}

export async function validateTraitDraft({
  traitId,
  payload,
  ...options
}: TraitValidationRequest): Promise<TraitValidationResponse> {
  return requestJson<TraitValidationResponse>('/api/traits/validate', {
    ...options,
    method: 'POST',
    body: { traitId, payload },
  });
}

export const __internals__ = {
  buildHeaders,
  requestJson,
  safeParseJson,
};
