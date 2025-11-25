// hook_bindings.ts — esempio d'integrazione (TypeScript)
import personalityModule from './personality_module.v1.json';
import compat from './compat_map.json';

type StatOp = 'add_flat' | 'add_pct' | 'mult_pct' | 'set_min' | 'set_max';

interface Effect { stat: string; op: StatOp; value: number; duration?: string; }
interface Hook { id: string; eligibility?: any; trigger?: any; effects: Effect[]; limit_per_encounter?: number; timing?: string; status?: string; }

function resolveStat(stat: string): string {
  const aliases = compat.stats || {};
  if (aliases[stat]) return stat; // canonical
  // reverse index alias -> canonical
  for (const [canon, data] of Object.entries(aliases)) {
    if ((data as any).aliases?.includes(stat)) return canon;
  }
  return stat; // fallback
}

export function eligible(h: Hook, profile: any): boolean {
  const e = (h as any).eligibility;
  if (!e) return true;
  if (e.types && !e.types.includes(profile.type_id)) return false;
  if (e.instinct && e.instinct !== profile.instinct_variant) return false;
  return true;
}

export function bindHooks(profile: any) {
  const hooks: Hook[] = (personalityModule as any).mechanics_registry.hooks;
  const active = hooks.filter(h => (h.status ?? 'stub') !== 'disabled' && eligible(h, profile));
  // resolve stat names to canonical
  for (const h of active) {
    for (const eff of h.effects) {
      (eff as any).stat = resolveStat(eff.stat);
    }
  }
  return active;
}
