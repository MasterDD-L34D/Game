import fs from "fs";
import yaml from "js-yaml";

type Dict<T = any> = { [k: string]: T };

function loadYaml(path: string): any {
  return yaml.load(fs.readFileSync(path, "utf8")) as any;
}

function collectCatalog(spec: any) {
  const slots = spec.catalog.slots;
  const bySlot: Dict<Set<string>> = {};
  Object.keys(slots).forEach((s) => (bySlot[s] = new Set(Object.keys(slots[s]))));
  const synMap: Dict = {};
  (spec.catalog.synergies || []).forEach((s: any) => (synMap[s.id] = s));
  return { bySlot, synMap };
}

function getCaps(spec: any) {
  const caps = spec.global_rules?.stacking_caps || {};
  return {
    resCap: caps.res_cap_per_type ?? 2,
    drCap: caps.dr_cap_per_type ?? 1,
  };
}

function gatherChosen(dp: any): Set<string> {
  const out = new Set<string>();
  ["locomotion", "metabolism"].forEach((sl) => {
    if (dp[sl]) out.add(`${sl}.${dp[sl]}`);
  });
  ["offense", "defense", "senses"].forEach((sl) =>
    (dp[sl] || []).forEach((p: string) => out.add(`${sl}.${p}`))
  );
  return out;
}

function resolvePart(spec: any, slot: string, pid: string) {
  return spec.catalog.slots[slot]?.[pid] ?? null;
}

function accumulateRes(spec: any, dp: any) {
  const res: Dict<number> = {};
  const vuln: Dict<number> = {};
  const dr: Dict<number> = {};

  const acc = (slot: string, pid: string) => {
    const part = resolvePart(spec, slot, pid);
    if (!part) return;
    const eff = part.effects || {};
    const ro = eff.resistances || {};
    Object.entries(ro.res || {}).forEach(([t, v]: any) => {
      res[t] = (res[t] || 0) + Number(v);
    });
    Object.entries(ro.vuln || {}).forEach(([t, v]: any) => {
      vuln[t] = (vuln[t] || 0) + Number(v);
    });
    Object.entries(ro.dr || {}).forEach(([t, v]: any) => {
      dr[t] = (dr[t] || 0) + Number(v);
    });
  };

  ["locomotion", "metabolism"].forEach((s) => {
    if (dp[s]) acc(s, dp[s]);
  });
  ["offense", "defense", "senses"].forEach((s) =>
    (dp[s] || []).forEach((p: string) => acc(s, p))
  );

  return { res, vuln, dr };
}

function computeActiveSynergies(spec: any, chosen: Set<string>): string[] {
  const out: string[] = [];
  (spec.catalog.synergies || []).forEach((syn: any) => {
    const reqs: string[] = syn.when_all || [];
    if (reqs.every((r) => chosen.has(r))) out.push(syn.id);
  });
  return out;
}

function computeKnownCounters(spec: any, chosen: Set<string>): string[] {
  const out: string[] = [];
  (spec.global_rules?.counters_reference || []).forEach((item: any) => {
    const hit = (item.counters || []).some((c: string) => {
      for (const k of Array.from(chosen)) {
        if (k.endsWith("." + c) || k.includes(c)) return true;
      }
      return false;
    });
    if (hit) out.push(item.counter);
  });
  return out;
}

function validate(path: string) {
  const spec = loadYaml(path);
  const { bySlot, synMap } = collectCatalog(spec);
  const { resCap, drCap } = getCaps(spec);

  const report: any = { file: path, species: [], errors: 0, warnings: 0 };

  (spec.species || []).forEach((sp: any) => {
    const sid = sp.id;
    const dp = sp.default_parts || {};
    const errors: string[] = [];
    const warnings: string[] = [];

    const est = sp.estimated_weight ?? 0;
    const bud = sp.weight_budget ?? spec.global_rules.morph_budget.default_weight_budget;
    const over_budget = est > bud;
    if (over_budget) warnings.push(`estimated_weight ${est} exceeds budget ${bud}`);

    ["locomotion", "metabolism"].forEach((sl) => {
      const pid = dp[sl];
      if (pid && !bySlot[sl]?.has(pid)) errors.push(`missing part: ${sl}.${pid}`);
    });
    ["offense", "defense", "senses"].forEach((sl) => {
      (dp[sl] || []).forEach((pid: string) => {
        if (!bySlot[sl]?.has(pid)) errors.push(`missing part: ${sl}.${pid}`);
      });
    });

    (sp.synergy_hints || []).forEach((syn: string) => {
      if (!synMap[syn]) warnings.push(`synergy hint '${syn}' not in catalog.synergies`);
    });

    const { res, vuln, dr } = accumulateRes(spec, dp);
    Object.entries(res).forEach(([t, v]: any) => {
      if ((v as number) > resCap) warnings.push(`res cap exceeded: ${t}=${v} > ${resCap}`);
    });
    Object.entries(dr).forEach(([t, v]: any) => {
      if ((v as number) > drCap) warnings.push(`dr cap exceeded: ${t}=${v} > ${drCap}`);
    });

    const chosen = gatherChosen(dp);
    const activeSyn = computeActiveSynergies(spec, chosen);
    const knownCounters = computeKnownCounters(spec, chosen);

    report.species.push({
      id: sid,
      display_name: sp.display_name || sid,
      budget: { used: est, max: bud, over_budget },
      parts_ok: errors.filter((e) => e.startsWith("missing part")).length === 0,
      active_synergies: activeSyn,
      synergy_hints: sp.synergy_hints || [],
      known_counters: knownCounters,
      res_summary: res,
      vuln_summary: vuln,
      dr_summary: dr,
      warnings,
      errors,
    });
    report.errors += errors.length;
    report.warnings += warnings.length;
  });

  report.ui_summary = report.species.map((s: any) => ({
    id: s.id,
    name: s.display_name,
    budget: `${s.budget.used}/${s.budget.max}`,
    over_budget: s.budget.over_budget,
    active_synergies: s.active_synergies,
    known_counters: s.known_counters,
    warnings: s.warnings,
  }));

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors === 0 ? 0 : 1);
}

const pathArg = process.argv[2] || "../../data/species.yaml";
validate(pathArg);
