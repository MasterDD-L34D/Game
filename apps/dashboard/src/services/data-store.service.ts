import {
  atlasRegions,
  dashboardMetrics,
  eventLog,
  missions,
  nebulaMilestones,
  traits,
} from '../data/sample-data';
import type {
  AtlasRegion,
  DashboardMetric,
  EventLog,
  Mission,
  NebulaMilestone,
  Trait,
} from '../types';

export class DataStoreService {
  getMissions(): Mission[] {
    return missions.map((mission) => ({ ...mission }));
  }

  getMissionById(missionId: string): Mission | undefined {
    return missions.find((mission) => mission.id === missionId);
  }

  getEventLog(limit?: number): EventLog[] {
    const entries = eventLog.slice().sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
    if (typeof limit === 'number') {
      return entries.slice(0, limit);
    }
    return entries;
  }

  getAtlasRegions(): AtlasRegion[] {
    return atlasRegions.map((region) => ({
      ...region,
      nodes: region.nodes.map((node) => ({ ...node })),
    }));
  }

  getTraits(): Trait[] {
    return traits.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));
  }

  getNebulaMilestones(): NebulaMilestone[] {
    return nebulaMilestones.map((milestone) => ({
      ...milestone,
      dependencies: [...milestone.dependencies],
    }));
  }

  getDashboardMetrics(): DashboardMetric[] {
    return dashboardMetrics.map((metric) => ({ ...metric }));
  }

  getMissionStatusSummary(): Record<string, number> {
    return this.getMissions().reduce<Record<string, number>>((acc, mission) => {
      const count = acc[mission.status] ?? 0;
      acc[mission.status] = count + 1;
      return acc;
    }, {});
  }
}

export const registerDataStoreService = (module: any): void => {
  module.service('DataStoreService', DataStoreService);
};
