export type FilterToken = string | number | boolean | null | undefined | { [key: string]: unknown };

export interface FilterSet {
  flags?: FilterToken[] | null;
  roles?: FilterToken[] | null;
  tags?: FilterToken[] | null;
}

export type HazardLevel = 'low' | 'medium' | 'high';

export interface GenerationConstraints {
  requiredRoles?: string[];
  preferredTags?: string[];
  hazard?: HazardLevel;
  climate?: string | null;
  minSize?: number;
}

export interface TagEntry {
  id: string;
  label: string;
}

export interface ActivityLogTag {
  id: string | null;
  label: string;
}

export type TagLike =
  | TagEntry
  | ActivityLogTag
  | string
  | {
      id?: string | null;
      value?: string | null;
      label?: string | null;
      name?: string | null;
      title?: string | null;
      text?: string | null;
    }
  | null
  | undefined;

export interface ActivityLogEntryInput {
  id?: string | null;
  message?: string | null;
  tone?: string | null;
  timestamp?: string | number | Date | null;
  tags?: TagLike[] | null;
  action?: string | null;
  pinned?: boolean | null;
  metadata?: unknown;
}

export interface SerialisedActivityLogEntry {
  id: string | null;
  message: string;
  tone: string;
  timestamp: string;
  tags: ActivityLogTag[];
  action: string | null;
  pinned: boolean;
  metadata: unknown;
}
