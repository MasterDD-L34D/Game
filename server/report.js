function formatTags(tags) {
  if (!tags || !tags.length) return '-';
  return tags
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ');
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

function reminderBlock(idea) {
  const fields = [
    ['IDEA', idea.title],
    ['SOMMARIO', idea.summary],
    ['CATEGORIA', idea.category],
    ['TAGS', formatTags(idea.tags)],
    ['MODULE', idea.module],
    ['ENTITÀ', idea.entities],
    ['PRIORITÀ', idea.priority],
    ['AZIONI_NEXT', idea.actions_next],
    ['LINK_DRIVE', idea.link_drive],
    ['GITHUB', idea.github],
    ['NOTE', idea.note],
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
  if (idea.module) {
    const moduleSlug = idea.module.replace(/\s+/g, '-').toLowerCase();
    const ideaFile = idea.id ? `${moduleSlug}-${String(idea.id).padStart(3, '0')}.md` : `${moduleSlug}-idea.md`;
    paths.push(`- Module focus: ${idea.module}`);
    paths.push(`- Suggested doc stub: docs/modules/${moduleSlug}/README.md`);
    paths.push(`- Suggested idea file: ideas/${ideaFile}`);
  } else {
    paths.push('- Suggested idea file: ideas/new-idea.md');
  }
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
    '',
    '### Phase 2 · Implementation Draft',
    '- Implement gameplay changes incrementally in dedicated branches.',
    '- Update rules text and supporting data in `/packs` or `/appendici` as needed.',
    '- Produce playtest hooks or sample encounters under `/data/playtests`.',
    '',
    '### Phase 3 · Playtest & Integration',
    '- Run automated validations (`npm test`, `npm run validate:species`).',
    '- Capture adjustments in `/logs/design-journal`. ',
    '- Merge once documentation and checklists below are satisfied.',
  ];
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
    `- **Module / Arc:** ${idea.module || '-'}`,
    `- **Key Entities:** ${idea.entities || '-'}`,
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
  return report.join('\n');
}

module.exports = {
  buildCodexReport,
};
