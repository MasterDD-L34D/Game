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
  const [dirty, setDirty] = useState(false);

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
    setStatusMessage(null);
    setSaveState('idle');
    setValidationErrors([]);
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

  const handleTraitSelection = useCallback((traitId: string) => {
    setSelectedTraitId(traitId);
  }, []);

  const handleFieldChange = useCallback(
    (path: (string | number)[], nextValue: JsonValue) => {
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
            cursor[segment] = cursor[segment] && typeof cursor[segment] === 'object' ? { ...cursor[segment] } : {};
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
    },
    [],
  );

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
  }, [traitPayload]);

  const isValid = validationErrors.length === 0;
  const rootErrors = errorMap.get('') ?? [];

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
            <button type="button" className="primary" onClick={handleSave} disabled={!dirty || !draftPayload}>
              {saveState === 'saving' ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </header>

        {statusMessage && (
          <div
            className={`trait-editor__status trait-editor__status--${
              saveState === 'error' ? 'error' : saveState === 'success' ? 'success' : 'info'
            }`}
          >
            {statusMessage}
          </div>
        )}

        {schemaError && <div className="trait-editor__status trait-editor__status--error">{schemaError}</div>}

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
              />
              <aside className="trait-editor__preview">
                <header>
                  <h2>Preview JSON</h2>
                  <span className={isValid ? 'valid' : 'invalid'}>
                    {isValid ? 'Schema valido' : 'Errori di validazione'}
                  </span>
                </header>
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

const FormRenderer: React.FC<Omit<FieldProps, 'label' | 'required' | 'onRemove'>> = ({
  schema,
  rootSchema,
  path,
  value,
  onChange,
  errorMap,
}) => {
  const resolved = resolveSchemaNode(schema, rootSchema);
  const type = normaliseType(resolved) || 'object';

  if (type === 'object') {
    return (
      <div className="trait-editor__form">
        {resolved.properties
          ? Object.entries(resolved.properties).map(([key, propertySchema]) => {
              const propertyPath = [...path, key];
              const propertyLabel = propertySchema.title || key;
              const propertyValue = (value && typeof value === 'object' && !Array.isArray(value)
                ? (value as Record<string, JsonValue>)[key]
                : undefined) as JsonValue;
              const required = Array.isArray(resolved.required) ? resolved.required.includes(key) : false;
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
                    const base = (value && typeof value === 'object' && !Array.isArray(value)
                      ? { ...(value as Record<string, JsonValue>) }
                      : {}) as Record<string, JsonValue>;
                    if (typeof next === 'undefined' || next === null || next === '') {
                      delete base[key];
                    } else {
                      base[key] = next;
                    }
                    onChange(base as JsonValue);
                  }}
                  errorMap={errorMap}
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
}) => {
  const resolved = resolveSchemaNode(schema, rootSchema);
  const type = normaliseType(resolved) || 'string';
  const instancePath = pathToInstancePath(path);
  const fieldErrors = errorMap.get(instancePath) ?? [];
  const description = resolved.description || '';

  if (type === 'object') {
    const currentValue = (value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, JsonValue>)
      : {}) as Record<string, JsonValue>;
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
                  />
                );
              })
            : null}
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
            <p className="trait-editor__message trait-editor__message--muted">Nessuna voce presente.</p>
          )}
          {fieldErrors.length ? <ErrorList errors={fieldErrors} /> : null}
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
      {onRemove ? (
        <button type="button" className="trait-editor__remove" onClick={onRemove}>
          Rimuovi
        </button>
      ) : null}
    </label>
  );
};

const ErrorList: React.FC<{ errors: string[] }> = ({ errors }) => (
  <ul className="trait-editor__errors">
    {errors.map((error, index) => (
      <li key={`${error}-${index}`}>{error}</li>
    ))}
  </ul>
);

export default TraitEditor;
