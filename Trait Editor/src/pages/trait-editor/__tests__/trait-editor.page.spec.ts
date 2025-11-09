import { describe, expect, it, vi } from 'vitest';

import { TraitEditorController } from '../trait-editor.page';
import { getSampleTraits } from '../../../data/traits.sample';
import type { Trait } from '../../../types/trait';
import type { TraitValidationResult } from '../../../types/trait-validation';
import type { TraitDataService } from '../../../services/trait-data.service';
import type { TraitStateService } from '../../../services/trait-state.service';

interface ControllerDeps {
  dataService: {
    validateTrait: ReturnType<typeof vi.fn>;
    saveTrait: ReturnType<typeof vi.fn>;
    getTraitById: ReturnType<typeof vi.fn>;
    getLastError: ReturnType<typeof vi.fn>;
  };
  stateService: {
    subscribe: ReturnType<typeof vi.fn>;
    setPreviewTrait: ReturnType<typeof vi.fn>;
    setLoading: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
  };
  scope: {
    $on: ReturnType<typeof vi.fn>;
    $applyAsync: ReturnType<typeof vi.fn>;
  };
  location: {
    path: ReturnType<typeof vi.fn>;
  };
  timeout: ReturnType<typeof vi.fn>;
}

const createController = (trait: Trait, validationResult: TraitValidationResult): { controller: TraitEditorController; deps: ControllerDeps } => {
  const scope = {
    $on: vi.fn().mockReturnValue(() => {}),
    $applyAsync: vi.fn(),
  };

  const dataService = {
    validateTrait: vi.fn().mockResolvedValue(validationResult),
    saveTrait: vi.fn(),
    getTraitById: vi.fn(),
    getLastError: vi.fn().mockReturnValue(null),
  };

  const stateService = {
    subscribe: vi.fn(),
    setPreviewTrait: vi.fn(),
    setLoading: vi.fn(),
    setStatus: vi.fn(),
  };

  const location = { path: vi.fn() };
  const timeout = vi.fn();

  const controller = new TraitEditorController(
    { id: trait.id },
    scope,
    location,
    timeout,
    dataService as unknown as TraitDataService,
    stateService as unknown as TraitStateService,
  );

  const prepared = (controller as unknown as { prepareFormModel: (value: Trait) => Trait }).prepareFormModel(
    trait,
  ) as Trait;
  controller.trait = JSON.parse(JSON.stringify(trait)) as Trait;
  controller.formModel = prepared as Trait & { signatureMoves: string[] };

  return {
    controller,
    deps: {
      dataService,
      stateService,
      scope,
      location,
      timeout,
    },
  };
};

describe('TraitEditorController validation workflow', () => {
  const [sampleTrait] = getSampleTraits();
  const emptyResult: TraitValidationResult = { summary: { errors: 0, warnings: 0, suggestions: 0 }, issues: [] };

  it('applies auto fixes, updates the model and triggers validation', async () => {
    const { controller, deps } = createController(sampleTrait, emptyResult);

    const fix = {
      id: 'align',
      label: 'Allinea nome',
      operations: [
        { op: 'replace', path: '/name', value: 'Spectre Prime' },
        { op: 'replace', path: '/entry/label', value: 'Spectre Prime' },
      ],
    };

    controller.applyValidationFix(fix);
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.formModel?.name).toBe('Spectre Prime');
    expect(controller.formModel?.entry.label).toBe('Spectre Prime');
    expect(deps.dataService.validateTrait).toHaveBeenCalledTimes(1);
    expect(controller.validationResult).toEqual(emptyResult);
    expect((controller as unknown as { canUndoAutoFix: () => boolean }).canUndoAutoFix()).toBe(true);
  });

  it('restores the previous snapshot when undoing an auto fix', async () => {
    const { controller, deps } = createController(sampleTrait, emptyResult);

    const fix = {
      id: 'align',
      label: 'Allinea nome',
      operations: [
        { op: 'replace', path: '/name', value: 'Spectre Prime' },
        { op: 'replace', path: '/entry/label', value: 'Spectre Prime' },
      ],
    };

    controller.applyValidationFix(fix);
    await Promise.resolve();
    await Promise.resolve();

    controller.undoLastAutoFix();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.formModel?.name).toBe(sampleTrait.name);
    expect(controller.formModel?.entry.label).toBe(sampleTrait.entry.label);
    expect(deps.dataService.validateTrait).toHaveBeenCalledTimes(2);
  });
});
