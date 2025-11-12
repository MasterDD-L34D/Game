#!/usr/bin/env node
import fs from "fs";
import yaml from "js-yaml";

function loadYaml(path) { return yaml.load(fs.readFileSync(path, "utf8")); }
function collectCatalog(spec) {
  const slots = spec.catalog.slots;
  const bySlot = {};
  Object.keys(slots).forEach(s => bySlot[s] = new Set(Object.keys(slots[s])));
  const synMap = {};
  (spec.catalog.synergies || []).forEach(s => synMap[s.id] = s);
  return { bySlot, synMap };
}
function getCaps(spec) {
  const caps = spec.global_rules?.stacking_caps || {};
  return { resCap: caps.res_cap_per_type ?? 2, drCap: caps.dr_cap_per_type ?? 1 };
}
function getGlobals(spec) {
  const gr = spec.global_rules || {};
  return {
    biomes: new Set(gr.biomes || []),
    affixes: new Set(gr.biome_affixes || []),
    roles: new Set(gr.spawn_roles || []),
    vc_indices: new Set(gr.vc_indices || [])
  };
}
function gatherChosen(dp) {
  const out = new Set();
  ["locomotion","metabolism"].forEach(sl => { if (dp[sl]) out.add(`${sl}.${dp[sl]}`); });
  ["offense","defense","senses"].forEach(sl => (dp[sl]||[]).forEach(p=> out.add(`${sl}.${p}`)));
  return out;
}
function resolvePart(spec, slot, pid) { return spec.catalog.slots[slot]?.[pid] ?? null; }
function accumulateRes(spec, dp) {
  const res={}, vuln={}, dr={};
  const acc = (slot,pid)=>{
    const part = resolvePart(spec, slot, pid); if (!part) return;
    const eff = part.effects || {}; const ro = eff.resistances || {};
    Object.entries(ro.res   || {}).forEach(([t,v])=> res[t]=(res[t]||0)+Number(v));
    Object.entries(ro.vuln  || {}).forEach(([t,v])=> vuln[t]=(vuln[t]||0)+Number(v));
    Object.entries(ro.dr    || {}).forEach(([t,v])=> dr[t]=(dr[t]||0)+Number(v));
  };
  ["locomotion","metabolism"].forEach(s => { if (dp[s]) acc(s, dp[s]); });
  ["offense","defense","senses"].forEach(s => (dp[s]||[]).forEach(p=> acc(s,p)));
  return {res, vuln, dr};
}
function computeActiveSynergies(spec, chosen) {
  const out = [];
  (spec.catalog.synergies || []).forEach(syn=>{
    const reqs = syn.when_all || [];
    if (reqs.every(r => chosen.has(r))) out.push(syn.id);
  });
  return out;
}
function computeKnownCounters(spec, chosen) {
  const out = [];
  (spec.global_rules?.counters_reference || []).forEach(item=>{
    const hit = (item.counters || []).some(c=>{
      for (const k of Array.from(chosen)) if (k.endsWith("."+c) || k.includes(c)) return true;
      return false;
    });
    if (hit) out.push(item.counter);
  });
  return out;
}

function validateBiomesAndAffixes(globals, sp, warnings, errors) {
  const biomes = sp.biomes || [];
  const badBiomes = biomes.filter(b => !globals.biomes.has(b));
  if (badBiomes.length) errors.push(`unknown biomes: ${JSON.stringify(badBiomes)}`);
  const bm = sp.biome_mods || {};
  ["mood","diff_base_mod"].forEach(k => {
    Object.keys(bm[k] || {}).forEach(b => {
      if (!globals.biomes.has(b)) errors.push(`biome_mods.${k}: unknown biome '${b}'`);
    });
  });
  Object.keys(bm.affix_bias || {}).forEach(a => {
    if (!globals.affixes.has(a)) errors.push(`biome_mods.affix_bias: unknown affix '${a}'`);
  });
}
function validateSpawnRoles(globals, sp, warnings, errors) {
  const rw = (sp.spawn_profile && sp.spawn_profile.role_weights) || {};
  const bad = Object.keys(rw).filter(r => !globals.roles.has(r));
  if (bad.length) errors.push(`spawn_profile.role_weights: unknown roles ${JSON.stringify(bad)}`);
  if (Object.values(rw).some(v=> typeof v !== "number" || v < 0)) {
    errors.push("spawn_profile.role_weights: values must be non-negative integers");
  }
}
function validateVcSignature(globals, sp, warnings, errors) {
  const vc = sp.vc_signature;
  if (!vc) { warnings.push("vc_signature missing"); return; }
  const keys = new Set(Object.keys(vc));
  const extra = [...keys].filter(k => !globals.vc_indices.has(k));
  const missing = [...globals.vc_indices].filter(k => !keys.has(k));
  if (extra.length) errors.push(`vc_signature: unknown indices ${JSON.stringify(extra)}`);
  if (missing.length) warnings.push(`vc_signature: missing indices ${JSON.stringify(missing)}`);
  Object.entries(vc).forEach(([k,v])=>{
    const f = Number(v);
    if (Number.isNaN(f)) errors.push(`vc_signature.${k} not numeric: ${v}`);
    else if (f<0 || f>1) warnings.push(`vc_signature.${k} out of range [0,1]: ${v}`);
  });
}
function validateNestProfile(sp, warnings, errors) {
  const np = sp.nest_profile;
  if (!np) { warnings.push("nest_profile missing"); return; }
  const req = ["env","structure","security","resources","privacy"];
  const missing = req.filter(k => !(k in np));
  if (missing.length) { errors.push(`nest_profile: missing keys ${JSON.stringify(missing)}`); return; }
  if (typeof np.env !== "object" || !("temp" in np.env) || !("humidity" in np.env) || !("light" in np.env)) {
    warnings.push("nest_profile.env should include temp/humidity/light");
  }
  if (!Array.isArray(np.structure) || np.structure.some(x=> typeof x !== "string")) {
    warnings.push("nest_profile.structure should be a list of strings");
  }
  if (typeof np.security !== "number") warnings.push("nest_profile.security should be an integer");
  if (!Array.isArray(np.resources) || np.resources.some(x=> typeof x !== "string")) {
    warnings.push("nest_profile.resources should be a list of strings");
  }
  if (typeof np.privacy !== "boolean") warnings.push("nest_profile.privacy should be boolean");
}

function validate(path) {
  const spec = loadYaml(path);
  const { bySlot, synMap } = collectCatalog(spec);
  const caps = spec.global_rules?.stacking_caps || {};
  const resCap = caps.res_cap_per_type ?? 2;
  const drCap  = caps.dr_cap_per_type  ?? 1;
  const globals = getGlobals(spec);

  const report = { file: path, species: [], errors: 0, warnings: 0 };

  (spec.species || []).forEach(sp=>{
    const sid = sp.id, dp = sp.default_parts || {};
    const errors = [], warnings = [];

    const est = sp.estimated_weight ?? 0;
    const bud = sp.weight_budget ?? spec.global_rules.morph_budget.default_weight_budget;
    const over_budget = est > bud;
    if (over_budget) warnings.push(`estimated_weight ${est} exceeds budget ${bud}`);

    ["locomotion","metabolism"].forEach(sl=>{
      const pid = dp[sl];
      if (pid && !bySlot[sl]?.has(pid)) errors.push(`missing part: ${sl}.${pid}`);
    });
    ["offense","defense","senses"].forEach(sl=>{
      (dp[sl]||[]).forEach(pid=>{
        if (!bySlot[sl]?.has(pid)) errors.push(`missing part: ${sl}.${pid}`);
      });
    });

    (sp.synergy_hints||[]).forEach(syn=> {
      if (!synMap[syn]) warnings.push(`synergy hint '${syn}' not in catalog.synergies`);
    });

    // resistances
    const res={}, vuln={}, dr={};
    const acc=(slot,pid)=>{
      const part = spec.catalog.slots[slot]?.[pid]; if (!part) return;
      const eff = part.effects || {}; const ro = eff.resistances || {};
      Object.entries(ro.res   || {}).forEach(([t,v])=> res[t]=(res[t]||0)+Number(v));
      Object.entries(ro.vuln  || {}).forEach(([t,v])=> vuln[t]=(vuln[t]||0)+Number(v));
      Object.entries(ro.dr    || {}).forEach(([t,v])=> dr[t]=(dr[t]||0)+Number(v));
    };
    ["locomotion","metabolism"].forEach(s=> dp[s] && acc(s, dp[s]));
    ["offense","defense","senses"].forEach(s=> (dp[s]||[]).forEach(pid=> acc(s,pid)));

    Object.entries(res).forEach(([t,v])=> { if (v > resCap) warnings.push(`res cap exceeded: ${t}=${v} > ${resCap}`); });
    Object.entries(dr).forEach(([t,v])=>  { if (v > drCap)  warnings.push(`dr cap exceeded: ${t}=${v} > ${drCap}`); });

    validateBiomesAndAffixes(globals, sp, warnings, errors);
    validateSpawnRoles(globals, sp, warnings, errors);
    validateVcSignature(globals, sp, warnings, errors);
    validateNestProfile(sp, warnings, errors);

    const chosen = gatherChosen(dp);
    const activeSyn     = computeActiveSynergies(spec, chosen);
    const knownCounters = computeKnownCounters(spec, chosen);

    report.species.push({
      id: sid,
      display_name: sp.display_name || sid,
      budget: { used: est, max: bud, over_budget },
      parts_ok: errors.filter(e=>e.startsWith("missing part")).length===0,
      active_synergies: activeSyn,
      synergy_hints: sp.synergy_hints || [],
      known_counters: knownCounters,
      res_summary: res,
      vuln_summary: vuln,
      dr_summary: dr,
      warnings, errors
    });
    report.errors   += errors.length;
    report.warnings += warnings.length;
  });

  report.ui_summary = report.species.map(s=> ({
    id: s.id,
    name: s.display_name,
    budget: `${s.budget.used}/${s.budget.max}`,
    over_budget: s.budget.over_budget,
    active_synergies: s.active_synergies,
    known_counters: s.known_counters,
    warnings: s.warnings
  }));

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors === 0 ? 0 : 1);
}

const pathArg = process.argv[2] || "data/species.yaml";
validate(pathArg);
