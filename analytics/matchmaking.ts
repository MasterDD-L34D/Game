import type { MatchmakingFilter } from '../src/api/matchmaking';
import { flattenFilters } from '../src/api/matchmaking';

export const MATCHMAKING_FILTER_APPLIED = 'matchmaking.filter_applied';
export const MATCHMAKING_FILTER_RESET = 'matchmaking.filter_reset';

export interface AnalyticsAdapter {
  track(eventName: string, payload?: Record<string, unknown>): void;
}

export interface FilterAppliedEvent {
  filters: MatchmakingFilter;
  resultCount?: number;
  source?: string;
  latencyMs?: number;
}

export interface FilterResetEvent {
  source?: string;
}

export interface MatchmakingAnalytics {
  recordFilterApplied(event: FilterAppliedEvent): void;
  recordFilterReset(event?: FilterResetEvent): void;
}

const normalizeFilters = (filters: MatchmakingFilter): Record<string, string | number | boolean> => {
  return flattenFilters(filters);
};

export function createMatchmakingAnalytics(adapter: AnalyticsAdapter): MatchmakingAnalytics {
  const track = (eventName: string, payload: Record<string, unknown> = {}): void => {
    adapter.track(eventName, payload);
  };

  return {
    recordFilterApplied(event: FilterAppliedEvent): void {
      const { filters, ...rest } = event;
      track(MATCHMAKING_FILTER_APPLIED, {
        ...rest,
        filters: normalizeFilters(filters),
      });
    },
    recordFilterReset(event?: FilterResetEvent): void {
      track(MATCHMAKING_FILTER_RESET, event ? { ...event } : {});
    },
  };
}

export default createMatchmakingAnalytics;
