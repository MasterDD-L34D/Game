#!/usr/bin/env node
import fs from "fs";
import yaml from "js-yaml";

function loadYaml(path) { return yaml.load(fs.readFileSync(path, "utf8")); }

function main(path = "data/forms.yaml") {
  const spec = loadYaml(path);
  const errors = [];
  const warnings = [];

  const spi = spec?.global?.starting_pi_points ?? 7;
  if (!spec?.global?.starting_pi_points) errors.push("missing global.starting_pi_points");

  const pcat = spec?.packages_catalog || [];
  const pidx = {};
  pcat.forEach((p:any) => { if (p.id) pidx[p.id] = p; });
  if (Object.keys(pidx).length === 0) errors.push("packages_catalog empty or invalid");

  const seen = new Set();
  const ui = [];
  (spec.forms || []).forEach((f:any) => {
    const code = f.code;
    if (!code) { errors.push("form without code"); return; }
    if (seen.has(code)) errors.push(`duplicate form code ${code}`);
    seen.add(code);

    const bias = f.axes_bias || {};
    Object.entries(bias).forEach(([k,v]:[string, any])=>{
      const fv = Number(v);
      if (Number.isNaN(fv)) errors.push(`${code}: axes_bias.${k} not numeric`);
      else if (fv < -0.10 || fv > 0.10) warnings.push(`${code}: axes_bias.${k} out of range [-0.10,0.10]: ${v}`);
    });

    const pil = [...(f.starting_pi||[]), ...(f.starting_pi_extra||[])];
    if (pil.length === 0) { errors.push(`${code}: no starting_pi defined`); return; }
    let cost = 0;
    pil.forEach(pid=>{
      const pkg = pidx[pid];
      if (!pkg) { errors.push(`${code}: unknown package '${pid}'`); return; }
      const c = Number(pkg.cost || 0);
      if (c <= 0) errors.push(`${code}: package '${pid}' has invalid cost ${c}`);
      cost += c;
    });
    if (cost !== spi) errors.push(`${code}: PI cost sum = ${cost} (must equal ${spi})`);

    ui.push({code, innate: f.innate || "", pi_packages: pil, pi_cost_total: cost});
  });

  const out = { file: path, errors, warnings, forms_ui: ui };
  console.log(JSON.stringify(out, null, 2));
  process.exit(errors.length ? 1 : 0);
}

const pathArg = process.argv[2] || "data/forms.yaml";
main(pathArg);
