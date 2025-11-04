/**
 * @typedef {string | number | boolean | null | undefined | Record<string, unknown>} FilterToken
 */

/**
 * @typedef {Object} FilterSet
 * @property {(FilterToken[] | null | undefined)} [flags]
 * @property {(FilterToken[] | null | undefined)} [roles]
 * @property {(FilterToken[] | null | undefined)} [tags]
 */

/**
 * @typedef {'low' | 'medium' | 'high'} HazardLevel
 */

/**
 * @typedef {Object} GenerationConstraints
 * @property {string[]} [requiredRoles]
 * @property {string[]} [preferredTags]
 * @property {HazardLevel} [hazard]
 * @property {string | null} [climate]
 * @property {number} [minSize]
 */

/**
 * @typedef {Object} TagEntry
 * @property {string} id
 * @property {string} label
 */

/**
 * @typedef {Object} ActivityLogTag
 * @property {string | null} id
 * @property {string} label
 */

/**
 * @typedef {TagEntry | ActivityLogTag | string | {
 *   id?: string | null,
 *   value?: string | null,
 *   label?: string | null,
 *   name?: string | null,
 *   title?: string | null,
 *   text?: string | null,
 * } | null | undefined} TagLike
 */

/**
 * @typedef {Object} ActivityLogEntryInput
 * @property {string | null} [id]
 * @property {string | null} [message]
 * @property {string | null} [tone]
 * @property {string | number | Date | null} [timestamp]
 * @property {TagLike[] | null} [tags]
 * @property {string | null} [action]
 * @property {boolean | null} [pinned]
 * @property {unknown} [metadata]
 */

/**
 * @typedef {Object} SerialisedActivityLogEntry
 * @property {string | null} id
 * @property {string} message
 * @property {string} tone
 * @property {string} timestamp
 * @property {ActivityLogTag[]} tags
 * @property {string | null} action
 * @property {boolean} pinned
 * @property {unknown} metadata
 */

/**
 * @callback RandomIdGenerator
 * @param {string} [prefix]
 * @returns {string}
 */

export type {
  ActivityLogEntryInput,
  ActivityLogTag,
  FilterSet,
  FilterToken,
  GenerationConstraints,
  HazardLevel,
  RandomIdGenerator,
  SerialisedActivityLogEntry,
  TagEntry,
  TagLike,
};
