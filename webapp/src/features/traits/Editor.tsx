import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';

import {
  fetchTraitEntry,
  fetchTraitList,
  fetchTraitSchema,
  saveTraitEntry,
  TraitEntryResponse,
  TraitListResponse,
  TraitRequestError,
  TraitSummary,
  TraitValidationSuggestion,
  TraitValidationSummary,
  validateTraitDraft,
} from '../../services/traitsService';

import './editor.css';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type SchemaNode = {
  $id?: string;
  $schema?: string;
  $ref?: string;
  $defs?: Record<string, SchemaNode>;
  type?: string | string[];
  title?: string;
  description?: string;
  default?: JsonValue;
  enum?: JsonValue[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode | SchemaNode[];
  additionalProperties?: boolean | SchemaNode;
  format?: string;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
};

interface TraitEditorProps {
  initialTraitId?: string;
}

const STORAGE_TOKEN_KEY = 'trait-editor.token';
const STORAGE_LAST_TRAIT_KEY = 'trait-editor.last-trait';

const AJV_OPTIONS = { allErrors: true, strict: false, allowUnionTypes: true } as const;

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value ?? null;
  } catch (error) {
    console.warn('[trait-editor] impossibile leggere storage', error);
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('[trait-editor] impossibile scrivere storage', error);
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normaliseType(schema: SchemaNode): string | undefined {
  if (!schema.type) {
    return undefined;
  }
  return Array.isArray(schema.type) ? schema.type[0] : schema.type;
}

function resolveSchemaNode(schema: SchemaNode | undefined, root: SchemaNode | null): SchemaNode {
  if (!schema) {
    return {};
  }
  if (schema.$ref && root) {
    const pointer = schema.$ref;
    if (pointer.startsWith('#/$defs/')) {
      const segments = pointer.replace(/^#\/$defs\//, '').split('/');
      let current: SchemaNode | undefined = root.$defs?.[segments[0]];
      for (let index = 1; index < segments.length; index += 1) {
        const key = segments[index];
        if (!current) {
          break;
        }
        current = (current as any)[key];
      }
      if (current) {
        const { $ref, ...rest } = schema;
        return resolveSchemaNode({ ...current, ...rest }, root);
      }
    }
  }
  return schema;
}

function pathToInstancePath(path: (string | number)[]): string {
  if (!path.length) {
    return '';
  }
  return `/${path.map((segment) => String(segment)).join('/')}`;
}

function buildErrorMap(errors: ErrorObject[] | null | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!errors) {
    return map;
  }
  errors.forEach((error) => {
    const key = error.instancePath ?? '';
    const bucket = map.get(key) ?? [];
    bucket.push(error.message || `Errore ${error.keyword}`);
    map.set(key, bucket);
  });
  return map;
}

function buildSuggestionMap(
  suggestions: TraitValidationSuggestion[] | null | undefined,
): Map<string, TraitValidationSuggestion[]> {
  const map = new Map<string, TraitValidationSuggestion[]>();
  if (!suggestions) {
    return map;
  }
  suggestions.forEach((suggestion) => {
    const key = suggestion.path || '';
    const bucket = map.get(key) ?? [];
    bucket.push(suggestion);
    map.set(key, bucket);
  });
  return map;
}

function isSuggestionAutoApplicable(suggestion: TraitValidationSuggestion): boolean {
  const fix = suggestion.fix && typeof suggestion.fix === 'object' ? suggestion.fix : null;
  if (!fix) {
    return false;
  }
  if (typeof (fix as { autoApplicable?: unknown }).autoApplicable === 'boolean') {
    return Boolean((fix as { autoApplicable?: unknown }).autoApplicable);
  }
  if (fix.type === 'remove') {
    return true;
  }
  if (
    (fix.type === 'set' || fix.type === 'append') &&
    Object.prototype.hasOwnProperty.call(fix, 'value')
  ) {
    return true;
  }
  return false;
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parseSuggestionPath(pointer: string | null | undefined): (string | number)[] {
  if (!pointer || pointer === '/') {
    return [];
  }
  return pointer
    .split('/')
    .slice(1)
    .map((part) => {
      const decoded = decodePointerSegment(part);
      if (/^-?\d+$/.test(decoded)) {
        return Number(decoded);
      }
      return decoded;
    });
}

function ensureContainer(
  root: Record<string, JsonValue>,
  path: (string | number)[],
  { createFinalArray = false }: { createFinalArray?: boolean } = {},
): { container: any; key: string | number | null } | null {
  if (path.length === 0) {
    return { container: root, key: null };
  }
  let cursor: any = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) {
        return null;
      }
      if (cursor[segment] === undefined) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
      continue;
    }
    if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor)) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(cursor, segment)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  const finalKey = path[path.length - 1];
  if (typeof finalKey === 'string') {
    if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor)) {
      return null;
    }
    if (createFinalArray && cursor[finalKey] === undefined) {
      cursor[finalKey] = [];
    }
  } else if (typeof finalKey === 'number') {
    if (!Array.isArray(cursor)) {
      return null;
    }
    if (createFinalArray && cursor[finalKey] === undefined) {
      cursor[finalKey] = [];
    }
  }
  return { container: cursor, key: finalKey };
}

function resolveValueAtPath(root: any, path: (string | number)[]): any {
  let cursor = root;
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
    } else {
      if (typeof cursor !== 'object' || cursor === null) {
        return undefined;
      }
      cursor = (cursor as any)[segment];
    }
  }
  return cursor;
}

function applySuggestionFix(
  payload: Record<string, JsonValue>,
  suggestion: TraitValidationSuggestion,
): Record<string, JsonValue> | null {
  const fix = suggestion.fix && typeof suggestion.fix === 'object' ? suggestion.fix : null;
  if (!fix) {
    return null;
  }
  const type = fix.type || 'set';
  const path = parseSuggestionPath(suggestion.path);
  const draft = deepClone(payload);

  if (type === 'set') {
    if (path.length === 0) {
      if (!Object.prototype.hasOwnProperty.call(fix, 'value')) {
        return null;
      }
      const replacement = fix.value;
      if (typeof replacement !== 'object' || replacement === null || Array.isArray(replacement)) {
        return null;
      }
      return deepClone(replacement as Record<string, JsonValue>);
    }
    const containerResult = ensureContainer(draft, path);
    if (!containerResult || containerResult.key === null) {
      return null;
    }
    const { container, key } = containerResult;
    if (!Object.prototype.hasOwnProperty.call(fix, 'value')) {
      return null;
    }
    const clonedValue = deepClone(fix.value as JsonValue);
    if (typeof key === 'number') {
      if (!Array.isArray(container)) {
        return null;
      }
      container[key] = clonedValue as JsonValue;
    } else {
      if (typeof container !== 'object' || container === null) {
        return null;
      }
      container[key] = clonedValue as JsonValue;
    }
    return draft;
  }

  if (type === 'remove') {
    if (path.length === 0) {
      return null;
    }
    const containerResult = ensureContainer(draft, path);
    if (!containerResult || containerResult.key === null) {
      return null;
    }
    const { container, key } = containerResult;
    if (typeof key === 'number') {
      if (!Array.isArray(container)) {
        return null;
      }
      container.splice(key, 1);
    } else if (typeof container === 'object' && container !== null) {
      delete container[key];
    } else {
      return null;
    }
    return draft;
  }

  if (type === 'append') {
    if (!Object.prototype.hasOwnProperty.call(fix, 'value')) {
      return null;
    }
    const containerResult = ensureContainer(draft, path, { createFinalArray: true });
    if (!containerResult) {
      return null;
    }
    const { container, key } = containerResult;
    const target = key === null ? container : resolveValueAtPath(container, [key]);
    if (!Array.isArray(target)) {
      return null;
    }
    target.push(deepClone(fix.value as JsonValue));
    return draft;
  }

  return null;
}

interface FieldProps {
  schema: SchemaNode;
  rootSchema: SchemaNode | null;
  path: (string | number)[];
  value: JsonValue;
  required?: boolean;
  label: string;
  onChange: (next: JsonValue) => void;
  onRemove?: () => void;
  errorMap: Map<string, string[]>;
  suggestionMap: Map<string, TraitValidationSuggestion[]>;
  onApplySuggestion?: (suggestion: TraitValidationSuggestion) => void;
}

const TraitEditor: React.FC<TraitEditorProps> = ({ initialTraitId }) => {
  const [authToken, setAuthToken] = useState(() => readStorage(STORAGE_TOKEN_KEY) ?? '');
  const [schema, setSchema] = useState<SchemaNode | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [traitList, setTraitList] = useState<TraitSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(() => {
    if (initialTraitId) {
      return initialTraitId;
    }
    return readStorage(STORAGE_LAST_TRAIT_KEY);
  });
  const [traitPayload, setTraitPayload] = useState<Record<string, JsonValue> | null>(null);
  const [draftPayload, setDraftPayload] = useState<Record<string, JsonValue> | null>(null);
  const [loadingTrait, setLoadingTrait] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<ErrorObject[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<TraitValidationSuggestion[]>([]);
  const [styleSummary, setStyleSummary] = useState<TraitValidationSummary | null>(null);
  const [diagnosticsPending, setDiagnosticsPending] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastAppliedSuggestion, setLastAppliedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (initialTraitId) {
      setSelectedTraitId(initialTraitId);
    }
  }, [initialTraitId]);

  useEffect(() => {
    writeStorage(STORAGE_TOKEN_KEY, authToken ? authToken : null);
  }, [authToken]);

  useEffect(() => {
    if (selectedTraitId) {
      writeStorage(STORAGE_LAST_TRAIT_KEY, selectedTraitId);
    }
  }, [selectedTraitId]);

  const validator = useMemo<ValidateFunction | null>(() => {
    if (!schema) {
      return null;
    }
    const ajv = new Ajv(AJV_OPTIONS);
    try {
      return ajv.compile(schema as any);
    } catch (error) {
      console.error('[trait-editor] errore compilazione schema', error);
      setSchemaError('Impossibile compilare lo schema trait.');
      return null;
    }
  }, [schema]);

  const errorMap = useMemo(() => buildErrorMap(validationErrors), [validationErrors]);
  const suggestionMap = useMemo(() => buildSuggestionMap(styleSuggestions), [styleSuggestions]);
  const suggestionSummary = useMemo(() => {
    const counts: { error: number; warning: number; info: number; actionable: number } = {
      error: 0,
      warning: 0,
      info: 0,
      actionable: 0,
    };
    styleSuggestions.forEach((suggestion) => {
      const severity = suggestion.severity || 'warning';
      if (severity === 'error' || severity === 'warning' || severity === 'info') {
        counts[severity] += 1;
      }
      if (isSuggestionAutoApplicable(suggestion)) {
        counts.actionable += 1;
      }
    });
    const severitySummary = styleSummary?.style?.bySeverity;
    if (severitySummary && typeof severitySummary === 'object') {
      counts.error = Number(severitySummary.error ?? counts.error);
      counts.warning = Number(severitySummary.warning ?? counts.warning);
      counts.info = Number(severitySummary.info ?? counts.info);
    }
    const correctionsSummary = styleSummary?.style?.corrections;
    if (correctionsSummary && typeof correctionsSummary === 'object') {
      const actionable = correctionsSummary.actionable;
      if (typeof actionable === 'number') {
        counts.actionable = actionable;
      }
    }
    return counts;
  }, [styleSummary, styleSuggestions]);
  const totalSuggestions =
    typeof styleSummary?.style?.total === 'number'
      ? styleSummary.style.total
      : Number(styleSummary?.style?.total ?? styleSuggestions.length) || styleSuggestions.length;

  const filteredTraitList = useMemo(() => {
    if (!filterQuery.trim()) {
      return traitList;
    }
    const lowered = filterQuery.trim().toLowerCase();
    return traitList.filter((entry) => {
      const label = (entry.label || '').toLowerCase();
      return (
        entry.id.toLowerCase().includes(lowered) ||
        label.includes(lowered) ||
        (entry.category || '').toLowerCase().includes(lowered)
      );
    });
  }, [traitList, filterQuery]);

  const handleLoadSchema = useCallback(async () => {
    try {
      const response = await fetchTraitSchema({ token: authToken || undefined });
      setSchema((response.schema || null) as SchemaNode | null);
      setSchemaError(null);
    } catch (error) {
      const message =
        (error as TraitRequestError)?.detail &&
        typeof (error as TraitRequestError).detail === 'object' &&
        (error as TraitRequestError).detail !== null &&
        'error' in (error as TraitRequestError).detail
          ? String((error as TraitRequestError).detail?.error)
          : (error as Error)?.message || 'Errore caricamento schema.';
      setSchema(null);
      setSchemaError(message);
    }
  }, [authToken]);

  const loadTraitList = useCallback(
    async (opts: { token?: string | null; drafts?: boolean } = {}) => {
      try {
        const response: TraitListResponse = await fetchTraitList({
          token: opts.token || authToken || undefined,
          includeDrafts: opts.drafts ?? includeDrafts,
        });
        setTraitList(response.traits || []);
        setListError(null);
        if (!selectedTraitId && response.traits && response.traits.length) {
          setSelectedTraitId(response.traits[0].id);
        }
      } catch (error) {
        const message =
          (error as TraitRequestError)?.detail &&
          typeof (error as TraitRequestError).detail === 'object' &&
          (error as TraitRequestError).detail !== null &&
          'error' in (error as TraitRequestError).detail
            ? String((error as TraitRequestError).detail?.error)
            : (error as Error)?.message || 'Errore caricamento elenco trait.';
        setTraitList([]);
        setListError(message);
      }
    },
    [authToken, includeDrafts, selectedTraitId],
  );

  useEffect(() => {
    handleLoadSchema();
  }, [handleLoadSchema]);

  useEffect(() => {
    loadTraitList();
  }, [loadTraitList]);

  useEffect(() => {
    if (statusMessage) {
      setLastAppliedSuggestion(null);
    }
  }, [statusMessage]);

  useEffect(() => {
    setStatusMessage(null);
    setSaveState('idle');
    setValidationErrors([]);
    setLastAppliedSuggestion(null);
    if (!selectedTraitId) {
      setTraitPayload(null);
      setDraftPayload(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoadingTrait(true);
    fetchTraitEntry(selectedTraitId, { token: authToken || undefined, signal: controller.signal })
      .then((response: TraitEntryResponse) => {
        if (cancelled) {
          return;
        }
        const payload = (response.trait || null) as Record<string, JsonValue> | null;
        setTraitPayload(payload);
        setDraftPayload(payload ? deepClone(payload) : null);
        setDirty(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message =
          (error as TraitRequestError)?.detail &&
          typeof (error as TraitRequestError).detail === 'object' &&
          (error as TraitRequestError).detail !== null &&
          'error' in (error as TraitRequestError).detail
            ? String((error as TraitRequestError).detail?.error)
            : (error as TraitRequestError)?.status === 401
              ? 'Accesso negato: token richiesto per modificare i trait.'
              : (error as Error)?.message || 'Errore caricamento trait.';
        setTraitPayload(null);
        setDraftPayload(null);
        setStatusMessage(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTrait(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedTraitId, authToken]);

  useEffect(() => {
    if (!validator || !draftPayload) {
      setValidationErrors([]);
      return;
    }
    const valid = validator(draftPayload);
    if (valid) {
      setValidationErrors([]);
    } else {
      setValidationErrors(validator.errors ?? []);
    }
  }, [validator, draftPayload]);

  useEffect(() => {
    if (!draftPayload) {
      setStyleSuggestions([]);
      setStyleSummary(null);
      setDiagnosticsError(null);
      setDiagnosticsPending(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setDiagnosticsPending(true);
    const timer = setTimeout(() => {
      validateTraitDraft({
        traitId: selectedTraitId || undefined,
        payload: JSON.parse(JSON.stringify(draftPayload)),
        token: authToken || undefined,
        signal: controller.signal,
      })
        .then((response) => {
          if (cancelled) {
            return;
          }
          const remoteErrors = Array.isArray(response.errors)
            ? (response.errors as ErrorObject[])
            : [];
          setValidationErrors(remoteErrors);
          setStyleSuggestions(Array.isArray(response.suggestions) ? response.suggestions : []);
          setStyleSummary(response.summary ?? null);
          setDiagnosticsError(null);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          if ((error as Error)?.name === 'AbortError') {
            return;
          }
          let message: string | null = null;
          const detail = (error as TraitRequestError)?.detail;
          if (detail && typeof detail === 'object' && detail !== null && 'error' in detail) {
            message = String((detail as { error?: unknown }).error);
          }
          if (!message && (error as TraitRequestError)?.status === 401) {
            message = 'Token richiesto per la validazione in tempo reale.';
          }
          if (!message && error instanceof Error) {
            message = error.message;
          }
          setDiagnosticsError(message || 'Errore validazione stile.');
        })
        .finally(() => {
          if (!cancelled) {
            setDiagnosticsPending(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [draftPayload, selectedTraitId, authToken]);

  const handleTraitSelection = useCallback((traitId: string) => {
    setSelectedTraitId(traitId);
  }, []);

  const handleFieldChange = useCallback((path: (string | number)[], nextValue: JsonValue) => {
    setDraftPayload((current) => {
      const base = current ? deepClone(current) : {};
      if (!path.length) {
        return (nextValue as Record<string, JsonValue>) ?? {};
      }
      let cursor: any = base;
      for (let index = 0; index < path.length - 1; index += 1) {
        const segment = path[index];
        if (typeof segment === 'number') {
          cursor[segment] = Array.isArray(cursor[segment]) ? [...cursor[segment]] : [];
        } else {
          cursor[segment] =
            cursor[segment] && typeof cursor[segment] === 'object' ? { ...cursor[segment] } : {};
        }
        cursor = cursor[segment];
      }
      const last = path[path.length - 1];
      if (typeof nextValue === 'undefined' || nextValue === null) {
        if (Array.isArray(cursor) && typeof last === 'number') {
          cursor.splice(last, 1);
        } else if (cursor && typeof cursor === 'object') {
          delete cursor[last as keyof typeof cursor];
        }
      } else {
        (cursor as any)[last] = nextValue;
      }
      return base;
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedTraitId || !draftPayload) {
      return;
    }
    if (!validator) {
      setStatusMessage('Validator non disponibile: impossibile verificare i dati.');
      setSaveState('error');
      return;
    }
    const payload = { ...draftPayload, id: selectedTraitId };
    const valid = validator(payload);
    if (!valid) {
      setValidationErrors(validator.errors ?? []);
      setStatusMessage('Salvataggio bloccato: correggi gli errori di validazione.');
      setSaveState('error');
      return;
    }
    setSaveState('saving');
    setStatusMessage(null);
    try {
      const response = await saveTraitEntry(selectedTraitId, {
        payload: payload as Record<string, JsonValue>,
        token: authToken || undefined,
      });
      const nextPayload = (response.trait || payload) as Record<string, JsonValue>;
      setTraitPayload(nextPayload);
      setDraftPayload(deepClone(nextPayload));
      setDirty(false);
      setValidationErrors([]);
      setSaveState('success');
      setStatusMessage('Trait salvato con successo.');
      loadTraitList({ token: authToken || undefined, drafts: includeDrafts }).catch(() => {
        /* ignorato: l'elenco verrà aggiornato al prossimo refresh */
      });
    } catch (error) {
      const message =
        (error as TraitRequestError)?.detail &&
        typeof (error as TraitRequestError).detail === 'object' &&
        (error as TraitRequestError).detail !== null &&
        'error' in (error as TraitRequestError).detail
          ? String((error as TraitRequestError).detail?.error)
          : (error as TraitRequestError)?.status === 401
            ? 'Salvataggio non autorizzato: verifica il token.'
            : (error as Error)?.message || 'Errore salvataggio trait.';
      setSaveState('error');
      setStatusMessage(message);
    }
  }, [selectedTraitId, draftPayload, validator, authToken, loadTraitList, includeDrafts]);

  const handleReset = useCallback(() => {
    if (!traitPayload) {
      return;
    }
    setDraftPayload(deepClone(traitPayload));
    setDirty(false);
    setValidationErrors([]);
    setStatusMessage(null);
    setSaveState('idle');
    setLastAppliedSuggestion(null);
  }, [traitPayload]);

  const isValid = validationErrors.length === 0;
  const rootErrors = errorMap.get('') ?? [];

  const handleApplySuggestion = useCallback(
    (suggestion: TraitValidationSuggestion) => {
      if (!draftPayload) {
        return;
      }
      const fix = suggestion.fix && typeof suggestion.fix === 'object' ? suggestion.fix : null;
      if (!fix) {
        return;
      }
      const nextPayload = applySuggestionFix(draftPayload, suggestion);
      if (!nextPayload) {
        setStatusMessage('Impossibile applicare automaticamente il suggerimento.');
        setSaveState('idle');
        return;
      }
      setDraftPayload(nextPayload);
      setDirty(true);
      setLastAppliedSuggestion(`Suggerimento applicato: ${suggestion.message}`);
      setStatusMessage(null);
      setSaveState('idle');
    },
    [draftPayload],
  );

  return (
    <div className="trait-editor">
      <aside className="trait-editor__sidebar">
        <section className="trait-editor__token">
          <h2>Credenziali</h2>
          <label className="trait-editor__field">
            <span>Token API</span>
            <input
              type="password"
              value={authToken}
              placeholder="Inserisci il token di modifica"
              onChange={(event) => setAuthToken(event.target.value)}
            />
          </label>
          <label className="trait-editor__toggle">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(event) => {
                setIncludeDrafts(event.target.checked);
                loadTraitList({ drafts: event.target.checked, token: authToken || undefined });
              }}
            />
            <span>Includi bozze</span>
          </label>
        </section>

        <section className="trait-editor__list">
          <div className="trait-editor__list-header">
            <h2>Catalogo trait</h2>
            <input
              type="search"
              value={filterQuery}
              placeholder="Filtra per ID, label o categoria"
              onChange={(event) => setFilterQuery(event.target.value)}
              aria-label="Filtra trait"
            />
          </div>
          {listError ? (
            <p className="trait-editor__message trait-editor__message--error">{listError}</p>
          ) : filteredTraitList.length ? (
            <ul>
              {filteredTraitList.map((entry) => {
                const active = entry.id === selectedTraitId;
                return (
                  <li key={`${entry.category}-${entry.id}`}>
                    <button
                      type="button"
                      className={active ? 'active' : ''}
                      onClick={() => handleTraitSelection(entry.id)}
                    >
                      <span className="trait-editor__entry-label">{entry.label || entry.id}</span>
                      <span className="trait-editor__entry-meta">
                        <code>{entry.id}</code>
                        <span>{entry.category}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="trait-editor__message">Nessun tratto disponibile.</p>
          )}
        </section>
      </aside>

      <main className="trait-editor__main">
        <header className="trait-editor__header">
          <div>
            <h1>Trait Editor</h1>
            {selectedTraitId ? (
              <p>
                ID selezionato: <code>{selectedTraitId}</code>
              </p>
            ) : (
              <p>Seleziona un tratto per iniziare la modifica.</p>
            )}
          </div>
          <div className="trait-editor__actions">
            <button type="button" onClick={handleReset} disabled={!dirty || !traitPayload}>
              Ripristina
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={!dirty || !draftPayload}
            >
              {saveState === 'saving' ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </header>

        {(statusMessage || lastAppliedSuggestion) && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`trait-editor__status trait-editor__status--${
              saveState === 'error' ? 'error' : saveState === 'success' ? 'success' : 'info'
            }`}
          >
            <span>{statusMessage || lastAppliedSuggestion}</span>
          </div>
        )}

        {schemaError && (
          <div className="trait-editor__status trait-editor__status--error">{schemaError}</div>
        )}

        {rootErrors.length > 0 && (
          <div className="trait-editor__status trait-editor__status--error">
            <strong>Schema</strong>
            <ul>
              {rootErrors.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="trait-editor__content" aria-live="polite">
          {loadingTrait ? (
            <p className="trait-editor__message">Caricamento trait in corso…</p>
          ) : draftPayload && schema ? (
            <div className="trait-editor__layout">
              <FormRenderer
                schema={schema}
                rootSchema={schema}
                value={draftPayload}
                path={[]}
                onChange={(next) => handleFieldChange([], next as JsonValue)}
                errorMap={errorMap}
                suggestionMap={suggestionMap}
                onApplySuggestion={handleApplySuggestion}
              />
              <aside className="trait-editor__preview">
                <header>
                  <h2>Preview JSON</h2>
                  <span className={isValid ? 'valid' : 'invalid'}>
                    {isValid ? 'Schema valido' : 'Errori di validazione'}
                  </span>
                </header>
                <div className="trait-editor__style-panel">
                  <div className="trait-editor__style-header">
                    <h3>Guida stile</h3>
                    <span
                      className={`trait-editor__style-badge ${
                        diagnosticsPending
                          ? 'trait-editor__style-badge--pending'
                          : totalSuggestions > 0
                            ? 'trait-editor__style-badge--issues'
                            : 'trait-editor__style-badge--ok'
                      }`}
                    >
                      {diagnosticsPending
                        ? 'Verifica…'
                        : totalSuggestions > 0
                          ? `${totalSuggestions} suggerimenti`
                          : 'In linea'}
                    </span>
                  </div>
                  {diagnosticsError ? (
                    <p className="trait-editor__message trait-editor__message--error">
                      {diagnosticsError}
                    </p>
                  ) : (
                    <>
                      <ul className="trait-editor__style-counters">
                        <li className="trait-editor__style-counter trait-editor__style-counter--error">
                          Errori: {suggestionSummary.error}
                        </li>
                        <li className="trait-editor__style-counter trait-editor__style-counter--warning">
                          Warning: {suggestionSummary.warning}
                        </li>
                        <li className="trait-editor__style-counter trait-editor__style-counter--info">
                          Info: {suggestionSummary.info}
                        </li>
                        <li className="trait-editor__style-counter trait-editor__style-counter--actionable">
                          Applicabili: {suggestionSummary.actionable}
                        </li>
                      </ul>
                      {suggestionSummary.actionable > 0 ? (
                        <p className="trait-editor__message trait-editor__message--muted">
                          {`${suggestionSummary.actionable} suggerimenti possono essere applicati automaticamente.`}
                        </p>
                      ) : null}
                      {styleSuggestions.length ? (
                        <>
                          <SuggestionList
                            suggestions={styleSuggestions.slice(0, 6)}
                            onApplySuggestion={handleApplySuggestion}
                          />
                          {styleSuggestions.length > 6 ? (
                            <p className="trait-editor__message trait-editor__message--muted">
                              {`Altri ${styleSuggestions.length - 6} suggerimenti sono visibili nei campi.`}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="trait-editor__message trait-editor__message--muted">
                          Nessun suggerimento dalla guida stile.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <pre>{JSON.stringify(draftPayload, null, 2)}</pre>
              </aside>
            </div>
          ) : selectedTraitId ? (
            <p className="trait-editor__message trait-editor__message--muted">
              Nessun payload disponibile: verifica i permessi o l'esistenza del file.
            </p>
          ) : (
            <p className="trait-editor__message trait-editor__message--muted">
              Seleziona un tratto dal catalogo per iniziare la modifica.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

const FormRenderer: React.FC<
  Omit<FieldProps, 'label' | 'required' | 'onRemove'> & {
    onApplySuggestion?: (suggestion: TraitValidationSuggestion) => void;
  }
> = ({ schema, rootSchema, path, value, onChange, errorMap, suggestionMap, onApplySuggestion }) => {
  const resolved = resolveSchemaNode(schema, rootSchema);
  const type = normaliseType(resolved) || 'object';

  if (type === 'object') {
    return (
      <div className="trait-editor__form">
        {resolved.properties
          ? Object.entries(resolved.properties).map(([key, propertySchema]) => {
              const propertyPath = [...path, key];
              const propertyLabel = propertySchema.title || key;
              const propertyValue = (
                value && typeof value === 'object' && !Array.isArray(value)
                  ? (value as Record<string, JsonValue>)[key]
                  : undefined
              ) as JsonValue;
              const required = Array.isArray(resolved.required)
                ? resolved.required.includes(key)
                : false;
              return (
                <Field
                  key={key}
                  schema={propertySchema}
                  rootSchema={rootSchema}
                  path={propertyPath}
                  value={propertyValue}
                  label={propertyLabel}
                  required={required}
                  onChange={(next) => {
                    const base = (
                      value && typeof value === 'object' && !Array.isArray(value)
                        ? { ...(value as Record<string, JsonValue>) }
                        : {}
                    ) as Record<string, JsonValue>;
                    if (typeof next === 'undefined' || next === null || next === '') {
                      delete base[key];
                    } else {
                      base[key] = next;
                    }
                    onChange(base as JsonValue);
                  }}
                  errorMap={errorMap}
                  suggestionMap={suggestionMap}
                  onApplySuggestion={onApplySuggestion}
                />
              );
            })
          : null}
      </div>
    );
  }

  return (
    <Field
      schema={resolved}
      rootSchema={rootSchema}
      path={path}
      value={value}
      label={resolved.title || path[path.length - 1]?.toString() || 'Campo'}
      onChange={onChange}
      errorMap={errorMap}
      suggestionMap={suggestionMap}
      onApplySuggestion={onApplySuggestion}
    />
  );
};

const Field: React.FC<FieldProps> = ({
  schema,
  rootSchema,
  path,
  value,
  required,
  label,
  onChange,
  onRemove,
  errorMap,
  suggestionMap,
  onApplySuggestion,
}) => {
  const resolved = resolveSchemaNode(schema, rootSchema);
  const type = normaliseType(resolved) || 'string';
  const instancePath = pathToInstancePath(path);
  const fieldErrors = errorMap.get(instancePath) ?? [];
  const fieldSuggestions = suggestionMap.get(instancePath) ?? [];
  const description = resolved.description || '';

  if (type === 'object') {
    const currentValue = (
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, JsonValue>)
        : {}
    ) as Record<string, JsonValue>;
    return (
      <fieldset className="trait-editor__fieldset">
        <legend>
          {label}
          {required ? <span aria-hidden="true">*</span> : null}
        </legend>
        {description ? <p className="trait-editor__description">{description}</p> : null}
        <div className="trait-editor__fieldset-grid">
          {resolved.properties
            ? Object.entries(resolved.properties).map(([key, propertySchema]) => {
                const propertyPath = [...path, key];
                const requiredProperty = Array.isArray(resolved.required)
                  ? resolved.required.includes(key)
                  : false;
                return (
                  <Field
                    key={key}
                    schema={propertySchema}
                    rootSchema={rootSchema}
                    path={propertyPath}
                    value={currentValue[key]}
                    label={propertySchema.title || key}
                    required={requiredProperty}
                    onChange={(next) => {
                      const base = { ...currentValue };
                      if (typeof next === 'undefined' || next === null || next === '') {
                        delete base[key];
                      } else {
                        base[key] = next;
                      }
                      onChange(base);
                    }}
                    errorMap={errorMap}
                    suggestionMap={suggestionMap}
                    onApplySuggestion={onApplySuggestion}
                  />
                );
              })
            : null}
          {fieldSuggestions.length ? (
            <SuggestionList
              suggestions={fieldSuggestions}
              variant="inline"
              onApplySuggestion={onApplySuggestion}
            />
          ) : null}
        </div>
      </fieldset>
    );
  }

  if (type === 'array') {
    const itemsSchema = Array.isArray(resolved.items)
      ? resolved.items[0]
      : (resolved.items as SchemaNode | undefined);
    const resolvedItemsSchema = resolveSchemaNode(itemsSchema, rootSchema);
    const itemsType = normaliseType(resolvedItemsSchema) || 'string';
    const listValue = Array.isArray(value) ? (value as JsonValue[]) : [];

    if (itemsType === 'object') {
      return (
        <div className="trait-editor__field trait-editor__field--array">
          <div className="trait-editor__field-header">
            <label>
              {label}
              {required ? <span aria-hidden="true">*</span> : null}
            </label>
            <button
              type="button"
              onClick={() => {
                const newItem: Record<string, JsonValue> = {};
                onChange([...(listValue as JsonValue[]), newItem]);
              }}
            >
              + Aggiungi voce
            </button>
          </div>
          {description ? <p className="trait-editor__description">{description}</p> : null}
          {listValue.length ? (
            <ol className="trait-editor__array">
              {listValue.map((item, index) => (
                <li key={`${instancePath}-${index}`}>
                  <Field
                    schema={resolvedItemsSchema}
                    rootSchema={rootSchema}
                    path={[...path, index]}
                    value={item}
                    label={`${label} #${index + 1}`}
                    onChange={(next) => {
                      const copy = [...listValue];
                      copy[index] = next as JsonValue;
                      onChange(copy);
                    }}
                    onRemove={() => {
                      const copy = listValue.filter((_, itemIndex) => itemIndex !== index);
                      onChange(copy);
                    }}
                    errorMap={errorMap}
                    suggestionMap={suggestionMap}
                    onApplySuggestion={onApplySuggestion}
                  />
                  <button
                    type="button"
                    className="trait-editor__remove"
                    onClick={() => {
                      const copy = listValue.filter((_, itemIndex) => itemIndex !== index);
                      onChange(copy);
                    }}
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="trait-editor__message trait-editor__message--muted">
              Nessuna voce presente.
            </p>
          )}
          {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
          {fieldSuggestions.length ? (
            <SuggestionList
              suggestions={fieldSuggestions}
              variant="inline"
              onApplySuggestion={onApplySuggestion}
            />
          ) : null}
        </div>
      );
    }

    const stringList = listValue.map((entry) => String(entry ?? '')).join('\n');
    return (
      <label className="trait-editor__field trait-editor__field--textarea">
        <span>
          {label}
          {required ? <span aria-hidden="true">*</span> : null}
        </span>
        {description ? <p className="trait-editor__description">{description}</p> : null}
        <textarea
          value={stringList}
          onChange={(event) => {
            const lines = event.target.value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);
            onChange(lines);
          }}
          placeholder="Inserisci un elemento per riga"
          rows={Math.max(3, Math.min(12, listValue.length + 1))}
        />
        {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
        {fieldSuggestions.length ? (
          <SuggestionList
            suggestions={fieldSuggestions}
            variant="inline"
            onApplySuggestion={onApplySuggestion}
          />
        ) : null}
      </label>
    );
  }

  if (type === 'boolean') {
    return (
      <label className="trait-editor__field trait-editor__field--checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
        {description ? <p className="trait-editor__description">{description}</p> : null}
        {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
        {fieldSuggestions.length ? (
          <SuggestionList
            suggestions={fieldSuggestions}
            variant="inline"
            onApplySuggestion={onApplySuggestion}
          />
        ) : null}
      </label>
    );
  }

  if (type === 'integer' || type === 'number') {
    const numberValue = typeof value === 'number' ? value : '';
    return (
      <label className="trait-editor__field">
        <span>
          {label}
          {required ? <span aria-hidden="true">*</span> : null}
        </span>
        {description ? <p className="trait-editor__description">{description}</p> : null}
        <input
          type="number"
          value={numberValue}
          onChange={(event) => {
            const parsed = event.target.value;
            if (parsed === '') {
              onChange(undefined as unknown as JsonValue);
              return;
            }
            onChange(Number(parsed));
          }}
        />
        {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
        {fieldSuggestions.length ? (
          <SuggestionList
            suggestions={fieldSuggestions}
            variant="inline"
            onApplySuggestion={onApplySuggestion}
          />
        ) : null}
      </label>
    );
  }

  if (resolved.enum && resolved.enum.length) {
    return (
      <label className="trait-editor__field">
        <span>
          {label}
          {required ? <span aria-hidden="true">*</span> : null}
        </span>
        {description ? <p className="trait-editor__description">{description}</p> : null}
        <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
          <option value="">—</option>
          {resolved.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
        {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
        {fieldSuggestions.length ? (
          <SuggestionList
            suggestions={fieldSuggestions}
            variant="inline"
            onApplySuggestion={onApplySuggestion}
          />
        ) : null}
      </label>
    );
  }

  return (
    <label className="trait-editor__field">
      <span>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </span>
      {description ? <p className="trait-editor__description">{description}</p> : null}
      <input
        type="text"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
      {fieldSuggestions.length ? (
        <SuggestionList
          suggestions={fieldSuggestions}
          variant="inline"
          onApplySuggestion={onApplySuggestion}
        />
      ) : null}
      {onRemove ? (
        <button type="button" className="trait-editor__remove" onClick={onRemove}>
          Rimuovi
        </button>
      ) : null}
    </label>
  );
};

const SuggestionList: React.FC<{
  suggestions: TraitValidationSuggestion[];
  variant?: 'inline' | 'panel';
  onApplySuggestion?: (suggestion: TraitValidationSuggestion) => void;
}> = ({ suggestions, variant = 'panel', onApplySuggestion }) => {
  if (!suggestions.length) {
    return null;
  }
  return (
    <ul className={`trait-editor__suggestions trait-editor__suggestions--${variant}`}>
      {suggestions.map((suggestion, index) => {
        const severity = suggestion.severity || 'warning';
        const fix = suggestion.fix && typeof suggestion.fix === 'object' ? suggestion.fix : null;
        const fixValue =
          fix && Object.prototype.hasOwnProperty.call(fix, 'value') && fix.value !== undefined
            ? formatSuggestionValue(fix.value)
            : null;
        const fixNote = fix && typeof fix.note === 'string' ? fix.note : null;
        const actionLabel = fix && typeof fix.type === 'string' ? fix.type : null;
        const actionText =
          actionLabel === 'remove'
            ? 'Rimuovi il valore'
            : actionLabel === 'append'
              ? 'Aggiungi valore'
              : actionLabel === 'set'
                ? 'Imposta il valore'
                : null;
        const canApplyFix = Boolean(onApplySuggestion && isSuggestionAutoApplicable(suggestion));
        return (
          <li
            key={`${suggestion.path || 'root'}-${suggestion.message}-${index}`}
            className={`trait-editor__suggestion trait-editor__suggestion--${severity}`}
          >
            <span className="trait-editor__suggestion-text">{suggestion.message}</span>
            {fixValue ? (
              <span className="trait-editor__suggestion-fix">
                {(actionLabel === 'remove'
                  ? 'Rimuovi'
                  : actionLabel === 'append'
                    ? 'Aggiungi'
                    : 'Imposta') + ' '}
                <code>{fixValue}</code>
              </span>
            ) : actionText ? (
              <span className="trait-editor__suggestion-fix">{actionText}</span>
            ) : null}
            {fixNote ? <span className="trait-editor__suggestion-note">{fixNote}</span> : null}
            {canApplyFix ? (
              <button
                type="button"
                className="trait-editor__suggestion-action"
                onClick={() => onApplySuggestion?.(suggestion)}
                aria-label={`Applica suggerimento: ${suggestion.message}`}
                title={`Applica suggerimento: ${suggestion.message}`}
              >
                Applica
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

function formatSuggestionValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

const ErrorList: React.FC<{ errors: string[] }> = ({ errors }) => (
  <ul className="trait-editor__errors">
    {errors.map((error, index) => (
      <li key={`${error}-${index}`}>{error}</li>
    ))}
  </ul>
);

export default TraitEditor;
