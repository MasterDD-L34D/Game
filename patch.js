const fs = require('fs');
const file = 'tests/api/abilityExecutor.test.js';
let content = fs.readFileSync(file, 'utf8');

const search = `  // Drena AP via move finché ne resta 1 (insufficiente per dash_strike cost_ap=2).
  // scout ap=3 → draina 2 con 2 move da 1 cella ciascuno.
  for (let i = 0; i < initialAp - 1; i += 1) {
    const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
    const self = stateRes.body.units.find((u) => u.id === 'p_scout');
    const from = self.position;
    const occupied = new Set(
      stateRes.body.units
        .filter((u) => u.hp > 0 && u.id !== 'p_scout')
        .map((u) => \`\${u.position.x},\${u.position.y}\`),
    );
    const candidates = [
      { x: from.x + 1, y: from.y },
      { x: from.x - 1, y: from.y },
      { x: from.x, y: from.y + 1 },
      { x: from.x, y: from.y - 1 },
    ].filter((p) => p.x >= 0 && p.x < 6 && p.y >= 0 && p.y < 6 && !occupied.has(\`\${p.x},\${p.y}\`));
    assert.ok(candidates.length > 0);
    const mres = await request(app).post('/api/session/action').send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: candidates[0],
    });
    assert.equal(mres.status, 200);
  }`;

const replace = `  // Drena AP via move finché ne resta 1 (insufficiente per dash_strike cost_ap=2).
  // scout ap=3 → draina 2 con 2 move da 1 cella ciascuno.
  let currentPos = scout.position;
  const occupied = new Set(
    state.units
      .filter((u) => u.hp > 0 && u.id !== 'p_scout')
      .map((u) => \`\${u.position.x},\${u.position.y}\`),
  );

  for (let i = 0; i < initialAp - 1; i += 1) {
    const candidates = [
      { x: currentPos.x + 1, y: currentPos.y },
      { x: currentPos.x - 1, y: currentPos.y },
      { x: currentPos.x, y: currentPos.y + 1 },
      { x: currentPos.x, y: currentPos.y - 1 },
    ].filter((p) => p.x >= 0 && p.x < 6 && p.y >= 0 && p.y < 6 && !occupied.has(\`\${p.x},\${p.y}\`));
    assert.ok(candidates.length > 0);

    currentPos = candidates[0];

    const mres = await request(app).post('/api/session/action').send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: currentPos,
    });
    assert.equal(mres.status, 200);
  }`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync(file, content);
  console.log('Patched successfully');
} else {
  console.log('Search string not found');
}
