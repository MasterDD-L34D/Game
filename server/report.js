function formatTags(tags) {
  if (!tags || !tags.length) return '-';
  return tags
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ');
}

function formatList(items) {
  if (!items || !items.length) return '-';
  return items.join(', ');
}

function formatChecklist(actions) {
  if (!actions) return '-';
  const rows = actions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rows.length) return '-';
  return rows
    .map((line) => {
      if (line.startsWith('- [ ]') || line.startsWith('- [x]')) return line;
      if (line.startsWith('-')) return `- [ ] ${line.slice(1).trim()}`;
      return `- [ ] ${line}`;
    })
    .join('\n');
}

function formatFeedbackEntries(feedback) {
  if (!Array.isArray(feedback) || !feedback.length) return '-';
  return feedback
    .map((entry) => {
      if (!entry || !entry.message) return null;
      const message = String(entry.message).trim();
      if (!message) return null;
      const contact = entry.contact ? ` (${String(entry.contact).trim()})` : '';
      let created = '';
      if (entry.created_at) {
        const date = new Date(entry.created_at);
        created = Number.isNaN(date.getTime()) ? ` · ${entry.created_at}` : ` · ${date.toISOString()}`;
      }
      return `- ${message}${contact}${created}`;
    })
    .filter(Boolean)
    .join('\n') || '-';
}

function latestFeedback(feedback) {
  if (!Array.isArray(feedback) || !feedback.length) return '-';
  const entries = feedback.filter((entry) => entry && entry.message).map((entry) => ({
    message: String(entry.message).trim(),
    contact: entry.contact ? String(entry.contact).trim() : '',
    created_at: entry.created_at || '',
  })).filter((entry) => entry.message);
  if (!entries.length) return '-';
  const last = entries[entries.length - 1];
  const contact = last.contact ? ` (${last.contact})` : '';
  let created = '';
  if (last.created_at) {
    const date = new Date(last.created_at);
    created = Number.isNaN(date.getTime()) ? ` · ${last.created_at}` : ` · ${date.toISOString()}`;
  }
  return `${last.message}${contact}${created}`;
}

function reminderBlock(idea) {
  const fields = [
    ['IDEA', idea.title],
    ['SOMMARIO', idea.summary],
    ['CATEGORIA', idea.category],
    ['TAGS', formatTags(idea.tags)],
    ['BIOMI', formatList(idea.biomes)],
    ['ECOSISTEMI', formatList(idea.ecosystems)],
    ['SPECIE', formatList(idea.species)],
    ['TRATTI', formatList(idea.traits)],
    ['FUNZIONI_GIOCO', formatList(idea.game_functions)],
    ['PRIORITÀ', idea.priority],
    ['AZIONI_NEXT', idea.actions_next],
    ['LINK_DRIVE', idea.link_drive],
    ['GITHUB', idea.github],
    ['NOTE', idea.note],
    ['FEEDBACK_RECENTE', latestFeedback(idea.feedback)],
  ];
  return fields
    .map(([label, value]) => `${label}: ${value || '-'}`)
    .join('\n');
}

function repoTouchpoints(idea) {
  const paths = [];
  if (idea.github) {
    paths.push(`- Existing reference: ${idea.github}`);
  }
  if (idea.biomes && idea.biomes.length) {
    paths.push(`- Biomi da aggiornare: ${idea.biomes.join(', ')} (data/biomes.yaml, docs/evo-tactics-pack/)`);
  }
  if (idea.ecosystems && idea.ecosystems.length) {
    paths.push(`- Ecosistemi/metanodi: ${idea.ecosystems.join(', ')} (docs/evo-tactics-pack/)`);
  }
  if (idea.species && idea.species.length) {
    paths.push(`- Specie coinvolte: ${idea.species.join(', ')} (data/species.yaml, docs/catalog/)`);
  }
  if (idea.traits && idea.traits.length) {
    paths.push(`- Tratti/Morph: ${idea.traits.join(', ')} (data/traits/, docs/catalog/species_trait_matrix.json)`);
  }
  if (idea.game_functions && idea.game_functions.length) {
    paths.push(`- Funzioni di gioco: ${idea.game_functions.join(', ')} (docs/telemetria, packs/, tools/)`);
  }
  paths.push('- Suggested idea file: ideas/new-idea.md');
  paths.push('- Sync index: README_IDEAS.md and IDEAS_INDEX.md');
  return paths.join('\n');
}

function buildIncrementalPlan(idea) {
  const checklist = formatChecklist(idea.actions_next);
  const plan = [
    '### Phase 1 · Discovery & Framing',
    '- Audit existing lore and mechanics impacted by the idea.',
    '- Confirm assets and references listed below are reachable.',
    '- Align keywords with `/config/project_index.json` taxonomy.',
    '- Verifica che biomi/ecosistemi siano presenti in `data/biomes.yaml` e negli export `docs/evo-tactics-pack/`.',
    '- Allinea specie e tratti con `data/species.yaml`, `data/traits/` e `docs/catalog/species_trait_matrix.json`.',
    '',
    '### Phase 2 · Implementation Draft',
    '- Implement gameplay changes incrementally in dedicated branches.',
    '- Update rules text and supporting data in `/packs`, `/docs`, `/data` as needed.',
    '- Produce playtest hooks or sample encounters under `/data/playtests`.',
    '',
    '### Phase 3 · Playtest & Integration',
    '- Run automated validations (`npm test`, `npm run validate:species`).',
    '- Capture adjustments in `/logs/design-journal`. ',
    '- Merge once documentation and checklists below are satisfied.',
  ];
  if (idea.game_functions && idea.game_functions.length) {
    plan.splice(6, 0, `- Coordina le funzioni di gioco (${formatList(idea.game_functions)}) con docs/telemetria, tools/ e packs/ pertinenti.`);
  }
  if (checklist !== '-') {
    plan.push('', '### Next Actions (from intake)', checklist);
  }
  return plan.join('\n');
}

function buildCodexReport(idea) {
  const createdAt = idea.created_at || new Date().toISOString();
  const report = [
    '# Codex GPT Integration Brief',
    '',
    `**Idea ID:** ${idea.id}`,
    `**Created at:** ${createdAt}`,
    '',
    '## Core Pitch',
    `- **Title:** ${idea.title}`,
    `- **Summary:** ${idea.summary || '-'}`,
    `- **Category:** ${idea.category}`,
    `- **Priority:** ${idea.priority || 'P2'}`,
    `- **Tags:** ${formatTags(idea.tags)}`,
    `- **Biomi:** ${formatList(idea.biomes)}`,
    `- **Ecosistemi:** ${formatList(idea.ecosystems)}`,
    `- **Specie:** ${formatList(idea.species)}`,
    `- **Tratti:** ${formatList(idea.traits)}`,
    `- **Funzioni di gioco:** ${formatList(idea.game_functions)}`,
    '',
    '## Repository Touchpoints',
    repoTouchpoints(idea),
    '',
    '## Incremental Delivery Plan',
    buildIncrementalPlan(idea),
    '',
    '## Acceptance Criteria',
    '- [ ] Narrative and mechanical notes updated in repository.',
    '- [ ] All referenced assets committed alongside updated README sections.',
    '- [ ] Automated tests and linting pipelines succeed.',
    '- [ ] Reminder block mirrored in production trackers (Drive, issues).',
    '',
    '## Reminder Block',
    '```',
    reminderBlock(idea),
    '```',
  ];
  if (idea.link_drive) {
    report.push('', `## Google Drive References\n- ${idea.link_drive}`);
  }
  if (idea.github) {
    report.push('', `## GitHub References\n- ${idea.github}`);
  }
  if (idea.note) {
    report.push('', '## Additional Notes', idea.note);
  }
  if (idea.feedback && idea.feedback.length) {
    report.push('', '## Intake Feedback', formatFeedbackEntries(idea.feedback));
  }
  return report.join('\n');
}

module.exports = {
  buildCodexReport,
  formatFeedbackEntries,
};
