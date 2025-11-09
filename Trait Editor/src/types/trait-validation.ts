export type TraitValidationSeverity = 'error' | 'warning' | 'suggestion';

export interface TraitValidationSummary {
  errors: number;
  warnings: number;
  suggestions: number;
}

export interface TraitValidationAutoFixOperation {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: unknown;
}

export interface TraitValidationAutoFix {
  id: string;
  label: string;
  description?: string;
  operations: TraitValidationAutoFixOperation[];
}

export interface TraitValidationIssue {
  id: string;
  severity: TraitValidationSeverity;
  message: string;
  code?: string;
  path?: string;
  autoFixes: TraitValidationAutoFix[];
}

export interface TraitValidationResult {
  summary: TraitValidationSummary;
  issues: TraitValidationIssue[];
}
