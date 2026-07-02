<script setup lang="ts">
// TKT-C1-FE — Full Vue 3 port of legacy AngularJS trait-editor controller (1515 LOC).
// Closes TKT-C1 partial handoff. Covers: general info + index/classification + signature
// moves + slot + usage tags + biome tags + conflicts + validation panel + auto-fix +
// save/cancel + preview wire via state service.

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTraitDataService } from '../services/trait-data.service';
import { useTraitState } from '../services/trait-state.service';
import type { Trait, TraitSpeciesAffinity } from '../types/trait';
import type {
  TraitValidationAutoFix,
  TraitValidationAutoFixOperation,
  TraitValidationResult,
} from '../types/trait-validation';
import {
  cloneTrait,
  deepClone,
  mergeTrait,
  synchroniseTraitPresentation,
} from '../utils/trait-helpers';

type PointerSegment = string | number | { append: true };

const route = useRoute();
const router = useRouter();
const dataService = getTraitDataService();
const { setLoading, setStatus, setPreviewTrait } = useTraitState();

const trait = ref<Trait | null>(null);
const formModel = ref<Trait | null>(null);
const validationResult = ref<TraitValidationResult | null>(null);
const validationError = ref<string | null>(null);
const isValidating = ref(false);
const autoFixHistory = ref<Trait[]>([]);
let isApplyingAutoFix = false;

const touched = reactive<Record<string, boolean>>({});

function markTouched(field: string): void {
  touched[field] = true;
}

const errors = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {};
  const m = formModel.value;
  if (!m) return result;
  if (!m.name || m.name.trim() === '') result.name = 'Il nome è obbligatorio.';
  else if (m.name.trim().length < 3) result.name = 'Il nome deve contenere almeno 3 caratteri.';
  if (!m.archetype || m.archetype.trim() === '') result.archetype = "L'archetipo è obbligatorio.";
  if (!m.playstyle || m.playstyle.trim() === '')
    result.playstyle = 'Lo stile di gioco è obbligatorio.';
  if (!m.description || m.description.trim() === '')
    result.description = 'La descrizione è obbligatoria.';
  else if (m.description.trim().length < 10)
    result.description = 'La descrizione deve contenere almeno 10 caratteri.';
  if (!m.entry.label || m.entry.label.trim() === '') result.entryLabel = 'Il label è obbligatorio.';
  if (!m.entry.tier || m.entry.tier.trim() === '') result.entryTier = 'Il tier è obbligatorio.';
  if (!m.entry.slot_profile.core || m.entry.slot_profile.core.trim() === '')
    result.slotCore = 'Lo slot core è obbligatorio.';
  if (!m.entry.slot_profile.complementare || m.entry.slot_profile.complementare.trim() === '')
    result.slotComplementare = 'Lo slot complementare è obbligatorio.';
  return result;
});

const isFormValid = computed(() => Object.keys(errors.value).length === 0);

const isDirty = computed(() => {
  if (!trait.value || !formModel.value) return false;
  return JSON.stringify(trait.value) !== JSON.stringify(formModel.value);
});

const canConfirm = computed(() => isFormValid.value && isDirty.value && !!trait.value);

const canUndoAutoFix = computed(() => autoFixHistory.value.length > 0);

function resetValidationFeedback(options?: { preserveHistory?: boolean }): void {
  validationResult.value = null;
  validationError.value = null;
  isValidating.value = false;
  if (!options?.preserveHistory) autoFixHistory.value = [];
}

function ensureCollections(model: Trait): Trait {
  model.signatureMoves = Array.isArray(model.signatureMoves) ? [...model.signatureMoves] : [];
  const entry = model.entry;
  entry.label = entry.label ?? model.name;
  entry.slot_profile = { ...entry.slot_profile };
  entry.slot = Array.isArray(entry.slot) ? [...entry.slot] : [];
  entry.usage_tags = Array.isArray(entry.usage_tags) ? [...entry.usage_tags] : [];
  entry.conflitti = Array.isArray(entry.conflitti) ? [...entry.conflitti] : [];
  entry.biome_tags = Array.isArray(entry.biome_tags) ? [...entry.biome_tags] : [];
  entry.completion_flags = { ...entry.completion_flags };
  entry.sinergie = Array.isArray(entry.sinergie) ? [...entry.sinergie] : [];
  entry.sinergie_pi = {
    co_occorrenze: Array.isArray(entry.sinergie_pi?.co_occorrenze)
      ? [...entry.sinergie_pi.co_occorrenze]
      : [],
    combo_totale: Number.isFinite(entry.sinergie_pi?.combo_totale)
      ? entry.sinergie_pi.combo_totale
      : 0,
    forme: Array.isArray(entry.sinergie_pi?.forme) ? [...entry.sinergie_pi.forme] : [],
    tabelle_random: Array.isArray(entry.sinergie_pi?.tabelle_random)
      ? [...entry.sinergie_pi.tabelle_random]
      : [],
  };
  entry.species_affinity = Array.isArray(entry.species_affinity)
    ? entry.species_affinity.map(
        (affinity: TraitSpeciesAffinity): TraitSpeciesAffinity => ({
          species_id: affinity.species_id,
          weight: affinity.weight,
          roles: Array.isArray(affinity.roles) ? [...affinity.roles] : [],
        }),
      )
    : [];
  entry.requisiti_ambientali = Array.isArray(entry.requisiti_ambientali)
    ? entry.requisiti_ambientali.map((req) => ({
        capacita_richieste: Array.isArray(req.capacita_richieste)
          ? [...req.capacita_richieste]
          : [],
        condizioni: req.condizioni ? { ...req.condizioni } : {},
        fonte: req.fonte,
        meta: req.meta ? { ...req.meta } : {},
      }))
    : [];
  return model;
}

function prepareFormModel(source: Trait): Trait {
  const model = ensureCollections(cloneTrait(source));
  return synchroniseTraitPresentation(model);
}

function syncFormModel(): void {
  if (formModel.value) synchroniseTraitPresentation(formModel.value);
}

function propagatePreview(): void {
  if (formModel.value) setPreviewTrait(formModel.value);
}

function onFormChange(): void {
  if (!isApplyingAutoFix) resetValidationFeedback();
  syncFormModel();
  propagatePreview();
}

function onLabelChange(): void {
  if (!formModel.value) return;
  formModel.value.name = formModel.value.entry.label;
  onFormChange();
}

// Array helpers — signature moves
function addSignatureMove(): void {
  formModel.value?.signatureMoves.push('');
  onFormChange();
}
function removeSignatureMove(i: number): void {
  formModel.value?.signatureMoves.splice(i, 1);
  onFormChange();
}

// Array helpers — slot
function addSlot(): void {
  formModel.value?.entry.slot.push('');
  onFormChange();
}
function removeSlot(i: number): void {
  formModel.value?.entry.slot.splice(i, 1);
  onFormChange();
}

// Array helpers — usage tags
function addUsageTag(): void {
  formModel.value?.entry.usage_tags.push('');
  onFormChange();
}
function removeUsageTag(i: number): void {
  formModel.value?.entry.usage_tags.splice(i, 1);
  onFormChange();
}

// Array helpers — conflicts
function addConflict(): void {
  formModel.value?.entry.conflitti.push('');
  onFormChange();
}
function removeConflict(i: number): void {
  formModel.value?.entry.conflitti.splice(i, 1);
  onFormChange();
}

// Array helpers — biome tags
function addBiomeTag(): void {
  formModel.value?.entry.biome_tags?.push('');
  onFormChange();
}
function removeBiomeTag(i: number): void {
  formModel.value?.entry.biome_tags?.splice(i, 1);
  onFormChange();
}

// Validation
async function validateCurrentTrait(): Promise<void> {
  if (!formModel.value) return;
  const baseline = trait.value
    ? mergeTrait(trait.value, formModel.value)
    : cloneTrait(formModel.value);
  const payload = synchroniseTraitPresentation(baseline);
  validationResult.value = null;
  validationError.value = null;
  isValidating.value = true;
  try {
    validationResult.value = await dataService.validateTrait(payload);
  } catch (error: unknown) {
    console.error('Errore validazione tratto:', error);
    const msg = (error as Error)?.message ?? 'Errore imprevisto durante la validazione del tratto.';
    validationError.value = msg;
  } finally {
    isValidating.value = false;
  }
}

// Auto-fix application — port of legacy pointer-based mutation engine
function parsePointer(path: string): PointerSegment[] | null {
  if (!path || typeof path !== 'string' || !path.startsWith('/')) return null;
  const segments = path
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  return segments.map((s) => {
    if (s === '-') return { append: true } as const;
    if (/^[0-9]+$/.test(s)) return Number(s);
    return s;
  });
}

function resolveArrayIndex(
  segment: PointerSegment,
  length: number,
  allowAppend: boolean,
): number | null {
  if (typeof segment === 'number') {
    if (segment < 0) return null;
    if (segment > length && !(allowAppend && segment === length)) return null;
    return segment;
  }
  if (typeof segment === 'object' && 'append' in segment) {
    return allowAppend ? length : null;
  }
  if (typeof segment === 'string') {
    if (!/^[0-9]+$/.test(segment)) return null;
    const parsed = Number(segment);
    if (parsed > length && !(allowAppend && parsed === length)) return null;
    return parsed;
  }
  return null;
}

function resolveObjectKey(segment: PointerSegment): string | null {
  if (typeof segment === 'object') return null;
  if (typeof segment === 'number') return String(segment);
  return segment;
}

function createContainerForSegment(segment: PointerSegment | undefined): unknown {
  if (segment === undefined) return {};
  if (typeof segment === 'number') return [];
  if (typeof segment === 'object' && 'append' in segment) return [];
  return {};
}

function applyOperationAtLeaf(
  target: unknown,
  segment: PointerSegment,
  operation: TraitValidationAutoFixOperation,
): void {
  if (Array.isArray(target)) {
    const allowAppend = operation.op === 'add';
    const index = resolveArrayIndex(segment, target.length, allowAppend);
    if (index === null) return;
    if (operation.op === 'remove') {
      if (index >= 0 && index < target.length) target.splice(index, 1);
      return;
    }
    const value = operation.value === undefined ? undefined : deepClone(operation.value);
    const insertIndex = allowAppend ? Math.min(index, target.length) : index;
    if (operation.op === 'add') {
      target.splice(insertIndex, 0, value);
      return;
    }
    if (insertIndex >= 0 && insertIndex < target.length) target[insertIndex] = value;
    return;
  }
  if (!target || typeof target !== 'object') return;
  const key = resolveObjectKey(segment);
  if (key === null) return;
  const record = target as Record<string, unknown>;
  if (operation.op === 'remove') {
    delete record[key];
    return;
  }
  record[key] = operation.value === undefined ? undefined : deepClone(operation.value);
}

function resolveChildTarget(
  target: unknown,
  segment: PointerSegment,
  nextSegment: PointerSegment | undefined,
  operation: TraitValidationAutoFixOperation,
): unknown {
  if (Array.isArray(target)) {
    const index = resolveArrayIndex(segment, target.length, operation.op === 'add');
    if (index === null) return undefined;
    if (index === target.length) {
      if (operation.op !== 'add') return undefined;
      const container = createContainerForSegment(nextSegment);
      target.push(container);
      return container;
    }
    if (target[index] === undefined && operation.op === 'add') {
      target[index] = createContainerForSegment(nextSegment);
    }
    return target[index];
  }
  if (!target || typeof target !== 'object') return undefined;
  const key = resolveObjectKey(segment);
  if (key === null) return undefined;
  const record = target as Record<string, unknown>;
  if (!(key in record) || record[key] === undefined) {
    if (operation.op === 'add' && nextSegment !== undefined) {
      record[key] = createContainerForSegment(nextSegment);
    } else if (nextSegment !== undefined) {
      record[key] =
        typeof nextSegment === 'number' || (nextSegment && typeof nextSegment === 'object')
          ? []
          : {};
    }
  }
  return record[key];
}

function applyOperationSegments(
  target: unknown,
  segments: PointerSegment[],
  operation: TraitValidationAutoFixOperation,
): void {
  if (!segments.length) return;
  const [head, ...tail] = segments;
  if (tail.length === 0) {
    applyOperationAtLeaf(target, head, operation);
    return;
  }
  const next = resolveChildTarget(target, head, tail[0], operation);
  if (next === undefined) return;
  applyOperationSegments(next, tail, operation);
}

function applyAutoFixOperations(model: Trait, fix: TraitValidationAutoFix): Trait {
  const result = ensureCollections(cloneTrait(model));
  fix.operations.forEach((op) => {
    const segments = parsePointer(op.path);
    if (!segments || segments.length === 0) return;
    applyOperationSegments(result, segments, op);
  });
  return ensureCollections(result);
}

function applyValidationFix(fix: TraitValidationAutoFix): void {
  if (!formModel.value) return;
  const snapshot = ensureCollections(cloneTrait(formModel.value));
  autoFixHistory.value.push(snapshot);
  isApplyingAutoFix = true;
  try {
    const workingCopy = ensureCollections(cloneTrait(formModel.value));
    const updated = applyAutoFixOperations(workingCopy, fix);
    formModel.value = updated;
    syncFormModel();
    propagatePreview();
  } finally {
    isApplyingAutoFix = false;
  }
  resetValidationFeedback({ preserveHistory: true });
  void validateCurrentTrait();
}

function undoLastAutoFix(): void {
  if (!formModel.value || autoFixHistory.value.length === 0) return;
  const previous = autoFixHistory.value.pop();
  if (!previous) return;
  isApplyingAutoFix = true;
  try {
    formModel.value = ensureCollections(cloneTrait(previous));
    syncFormModel();
    propagatePreview();
  } finally {
    isApplyingAutoFix = false;
  }
  resetValidationFeedback({ preserveHistory: true });
  void validateCurrentTrait();
}

// Save/cancel
async function confirm(): Promise<void> {
  if (!formModel.value || !trait.value || !isFormValid.value) {
    // Trigger all touched flags for visible errors
    [
      'name',
      'archetype',
      'playstyle',
      'description',
      'entryLabel',
      'entryTier',
      'slotCore',
      'slotComplementare',
    ].forEach((f) => (touched[f] = true));
    return;
  }
  const payload = mergeTrait(trait.value, formModel.value);
  synchroniseTraitPresentation(payload);
  setStatus(null);
  setLoading(true);
  try {
    const savedTrait = await dataService.saveTrait(payload);
    trait.value = savedTrait;
    formModel.value = prepareFormModel(savedTrait);
    setPreviewTrait(formModel.value);
    resetValidationFeedback();
    setStatus('Modifiche salvate con successo.', 'success');
    setTimeout(() => setStatus(null), 3000);
    router.push(`/traits/${savedTrait.id}`);
  } catch (error: unknown) {
    console.error('Errore salvataggio tratto:', error);
    const msg = (error as Error)?.message ?? 'Errore imprevisto durante il salvataggio.';
    setStatus(msg, 'error');
  } finally {
    setLoading(false);
  }
}

function cancel(): void {
  if (!trait.value) {
    router.push('/traits');
    return;
  }
  formModel.value = prepareFormModel(trait.value);
  setPreviewTrait(formModel.value);
  setStatus(null);
  resetValidationFeedback();
  router.push(`/traits/${trait.value.id}`);
}

// Load trait
async function loadTrait(id: string): Promise<void> {
  setStatus(null);
  resetValidationFeedback();
  setLoading(true);
  try {
    const found = await dataService.getTraitById(id);
    if (!found) {
      setStatus(`Tratto "${id}" non trovato.`, 'error');
      trait.value = null;
      formModel.value = null;
      setPreviewTrait(null);
      return;
    }
    trait.value = found;
    formModel.value = prepareFormModel(found);
    setPreviewTrait(formModel.value);
    resetValidationFeedback();
    const lastError = dataService.getLastError();
    if (lastError) {
      setStatus('Modifica locale: la sorgente remota non è stata raggiunta.', 'info');
    }
  } catch (error) {
    console.error('Impossibile caricare il tratto per la modifica:', error);
    setStatus('Non è stato possibile preparare il tratto per la modifica.', 'error');
    trait.value = null;
    formModel.value = null;
  } finally {
    setLoading(false);
  }
}

onMounted(() => {
  const id = route.params.id as string;
  void loadTrait(id);
});

onUnmounted(() => {
  setPreviewTrait(null);
  setLoading(false);
  setStatus(null);
});

watch(
  () => route.params.id,
  (newId) => {
    if (typeof newId === 'string') void loadTrait(newId);
  },
);
</script>

<template>
  <section class="trait-editor" data-testid="trait-editor">
    <header class="trait-editor__header">
      <h2 class="trait-editor__title">Editor del tratto</h2>
      <p class="trait-editor__subtitle">
        Aggiorna le proprietà del tratto. Preview live + validazione integrata.
      </p>
      <nav class="trait-editor__nav">
        <router-link v-if="trait" :to="`/traits/${trait.id}`" class="trait-editor__back-link">
          ← Torna al dettaglio
        </router-link>
        <router-link v-else to="/traits" class="trait-editor__back-link">
          ← Torna all'elenco
        </router-link>
      </nav>
    </header>

    <div v-if="!formModel" class="trait-editor__empty" data-testid="trait-editor-missing">
      Caricamento tratto in corso o tratto non trovato.
    </div>

    <div v-else class="trait-editor__layout">
      <form class="trait-form" novalidate data-testid="trait-form" @submit.prevent="confirm">
        <fieldset class="trait-form__section">
          <legend>Informazioni generali</legend>
          <div class="form-field" :class="{ 'form-field--invalid': touched.name && errors.name }">
            <label for="trait-name">Nome</label>
            <input
              id="trait-name"
              v-model="formModel.name"
              type="text"
              required
              minlength="3"
              data-testid="field-name"
              @input="onFormChange"
              @blur="markTouched('name')"
            />
            <p v-if="touched.name && errors.name" class="form-field__error">{{ errors.name }}</p>
          </div>

          <div
            class="form-field"
            :class="{ 'form-field--invalid': touched.archetype && errors.archetype }"
          >
            <label for="trait-archetype">Archetipo</label>
            <input
              id="trait-archetype"
              v-model="formModel.archetype"
              type="text"
              required
              data-testid="field-archetype"
              @input="onFormChange"
              @blur="markTouched('archetype')"
            />
            <p v-if="touched.archetype && errors.archetype" class="form-field__error">
              {{ errors.archetype }}
            </p>
          </div>

          <div
            class="form-field"
            :class="{ 'form-field--invalid': touched.playstyle && errors.playstyle }"
          >
            <label for="trait-playstyle">Stile di gioco</label>
            <textarea
              id="trait-playstyle"
              v-model="formModel.playstyle"
              rows="3"
              required
              data-testid="field-playstyle"
              @input="onFormChange"
              @blur="markTouched('playstyle')"
            ></textarea>
            <p v-if="touched.playstyle && errors.playstyle" class="form-field__error">
              {{ errors.playstyle }}
            </p>
          </div>

          <div
            class="form-field"
            :class="{ 'form-field--invalid': touched.description && errors.description }"
          >
            <label for="trait-description">Descrizione</label>
            <textarea
              id="trait-description"
              v-model="formModel.description"
              rows="4"
              required
              minlength="10"
              data-testid="field-description"
              @input="onFormChange"
              @blur="markTouched('description')"
            ></textarea>
            <p v-if="touched.description && errors.description" class="form-field__error">
              {{ errors.description }}
            </p>
          </div>
        </fieldset>

        <fieldset class="trait-form__section">
          <legend>Indice e classificazione</legend>

          <div
            class="form-field"
            :class="{ 'form-field--invalid': touched.entryLabel && errors.entryLabel }"
          >
            <label for="trait-label">Label indice</label>
            <input
              id="trait-label"
              v-model="formModel.entry.label"
              type="text"
              required
              data-testid="field-label"
              @input="onLabelChange"
              @blur="markTouched('entryLabel')"
            />
            <p v-if="touched.entryLabel && errors.entryLabel" class="form-field__error">
              {{ errors.entryLabel }}
            </p>
          </div>

          <div
            class="form-field"
            :class="{ 'form-field--invalid': touched.entryTier && errors.entryTier }"
          >
            <label for="trait-tier">Tier</label>
            <input
              id="trait-tier"
              v-model="formModel.entry.tier"
              type="text"
              required
              data-testid="field-tier"
              @input="onFormChange"
              @blur="markTouched('entryTier')"
            />
            <p v-if="touched.entryTier && errors.entryTier" class="form-field__error">
              {{ errors.entryTier }}
            </p>
          </div>

          <div class="form-field-group">
            <div
              class="form-field"
              :class="{ 'form-field--invalid': touched.slotCore && errors.slotCore }"
            >
              <label for="slot-core">Slot core</label>
              <input
                id="slot-core"
                v-model="formModel.entry.slot_profile.core"
                type="text"
                required
                @input="onFormChange"
                @blur="markTouched('slotCore')"
              />
              <p v-if="touched.slotCore && errors.slotCore" class="form-field__error">
                {{ errors.slotCore }}
              </p>
            </div>
            <div
              class="form-field"
              :class="{
                'form-field--invalid': touched.slotComplementare && errors.slotComplementare,
              }"
            >
              <label for="slot-complementare">Slot complementare</label>
              <input
                id="slot-complementare"
                v-model="formModel.entry.slot_profile.complementare"
                type="text"
                required
                @input="onFormChange"
                @blur="markTouched('slotComplementare')"
              />
              <p
                v-if="touched.slotComplementare && errors.slotComplementare"
                class="form-field__error"
              >
                {{ errors.slotComplementare }}
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset class="trait-form__section">
          <legend>Slot e tag</legend>

          <div class="dynamic-list">
            <h4>Slot</h4>
            <div
              v-for="(_slot, i) in formModel.entry.slot"
              :key="`slot-${i}`"
              class="dynamic-list__item"
            >
              <input
                :id="`slot-${i}`"
                v-model="formModel.entry.slot[i]"
                type="text"
                required
                @input="onFormChange"
              />
              <button
                type="button"
                class="button button--icon"
                :aria-label="`Rimuovi slot ${i + 1}`"
                @click="removeSlot(i)"
              >
                ✕
              </button>
            </div>
            <button type="button" class="button button--ghost" @click="addSlot">
              Aggiungi slot
            </button>
          </div>

          <div class="dynamic-list">
            <h4>Usage tags</h4>
            <div
              v-for="(_tag, i) in formModel.entry.usage_tags"
              :key="`usage-${i}`"
              class="dynamic-list__item"
            >
              <input v-model="formModel.entry.usage_tags[i]" type="text" @input="onFormChange" />
              <button
                type="button"
                class="button button--icon"
                :aria-label="`Rimuovi usage tag ${i + 1}`"
                @click="removeUsageTag(i)"
              >
                ✕
              </button>
            </div>
            <button type="button" class="button button--ghost" @click="addUsageTag">
              Aggiungi tag
            </button>
          </div>

          <div class="dynamic-list">
            <h4>Conflitti</h4>
            <div
              v-for="(_conflict, i) in formModel.entry.conflitti"
              :key="`conflict-${i}`"
              class="dynamic-list__item"
            >
              <input v-model="formModel.entry.conflitti[i]" type="text" @input="onFormChange" />
              <button
                type="button"
                class="button button--icon"
                :aria-label="`Rimuovi conflitto ${i + 1}`"
                @click="removeConflict(i)"
              >
                ✕
              </button>
            </div>
            <button type="button" class="button button--ghost" @click="addConflict">
              Aggiungi conflitto
            </button>
          </div>

          <div class="dynamic-list">
            <h4>Biome tags</h4>
            <div
              v-for="(_biome, i) in formModel.entry.biome_tags ?? []"
              :key="`biome-${i}`"
              class="dynamic-list__item"
            >
              <input v-model="formModel.entry.biome_tags![i]" type="text" @input="onFormChange" />
              <button
                type="button"
                class="button button--icon"
                :aria-label="`Rimuovi biome tag ${i + 1}`"
                @click="removeBiomeTag(i)"
              >
                ✕
              </button>
            </div>
            <button type="button" class="button button--ghost" @click="addBiomeTag">
              Aggiungi biome tag
            </button>
          </div>
        </fieldset>

        <fieldset class="trait-form__section">
          <legend>Mosse caratteristiche</legend>
          <div class="dynamic-list">
            <div
              v-for="(_move, i) in formModel.signatureMoves"
              :key="`move-${i}`"
              class="dynamic-list__item"
            >
              <input
                v-model="formModel.signatureMoves[i]"
                type="text"
                required
                data-testid="field-signature-move"
                @input="onFormChange"
              />
              <button
                type="button"
                class="button button--icon"
                :aria-label="`Rimuovi mossa ${i + 1}`"
                @click="removeSignatureMove(i)"
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              class="button button--ghost"
              data-testid="add-signature-move"
              @click="addSignatureMove"
            >
              Aggiungi mossa
            </button>
          </div>
        </fieldset>

        <div class="trait-form__actions">
          <button
            type="submit"
            class="button button--primary"
            data-testid="save-button"
            :disabled="!canConfirm"
          >
            Conferma modifiche
          </button>
          <button
            type="button"
            class="button button--ghost"
            data-testid="cancel-button"
            @click="cancel"
          >
            Annulla
          </button>
          <button
            type="button"
            class="button button--ghost"
            data-testid="validate-button"
            :disabled="isValidating"
            @click="validateCurrentTrait"
          >
            {{ isValidating ? 'Validazione...' : 'Valida tratto' }}
          </button>
          <button
            v-if="canUndoAutoFix"
            type="button"
            class="button button--ghost"
            data-testid="undo-autofix-button"
            @click="undoLastAutoFix"
          >
            Annulla ultima correzione
          </button>
        </div>
      </form>

      <aside class="trait-editor__sidebar">
        <section
          v-if="validationError"
          class="validation-panel validation-panel--error"
          data-testid="validation-error"
        >
          <h3>Errore di validazione</h3>
          <p>{{ validationError }}</p>
        </section>

        <section
          v-else-if="validationResult"
          class="validation-panel"
          data-testid="validation-panel"
        >
          <h3>Validazione</h3>
          <p class="validation-panel__summary">
            <span class="badge badge--error">{{ validationResult.summary.errors }} errori</span>
            <span class="badge badge--warning">{{ validationResult.summary.warnings }} avvisi</span>
            <span class="badge badge--info"
              >{{ validationResult.summary.suggestions }} suggerimenti</span
            >
          </p>
          <ul class="validation-panel__issues">
            <li
              v-for="issue in validationResult.issues"
              :key="issue.id"
              :class="['validation-issue', `validation-issue--${issue.severity}`]"
            >
              <strong>{{ issue.message }}</strong>
              <p v-if="issue.path" class="validation-issue__path">{{ issue.path }}</p>
              <div v-if="issue.autoFixes.length > 0" class="validation-issue__fixes">
                <button
                  v-for="fix in issue.autoFixes"
                  :key="fix.id"
                  type="button"
                  class="button button--ghost button--small"
                  data-testid="autofix-button"
                  @click="applyValidationFix(fix)"
                >
                  {{ fix.label }}
                </button>
              </div>
            </li>
            <li v-if="validationResult.issues.length === 0" class="validation-panel__empty">
              Nessuna anomalia rilevata.
            </li>
          </ul>
        </section>

        <section class="trait-preview" data-testid="trait-preview">
          <h3>Anteprima</h3>
          <p class="trait-preview__name">{{ formModel.name }}</p>
          <p class="trait-preview__archetype">{{ formModel.archetype }}</p>
          <p class="trait-preview__description">{{ formModel.description }}</p>
          <ul v-if="formModel.signatureMoves.length > 0" class="trait-preview__moves">
            <li v-for="(m, i) in formModel.signatureMoves" :key="`pv-${i}`">{{ m }}</li>
          </ul>
        </section>
      </aside>
    </div>
  </section>
</template>
