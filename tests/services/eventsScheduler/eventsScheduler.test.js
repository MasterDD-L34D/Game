'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventTimeline } = require('../../../services/eventsScheduler/index.js');

// Mock external deps as constrained
globalThis.fetch = () => Promise.resolve({ ok: true });
globalThis.localAsset = () => null;
globalThis.fetchFromCandidates = () => Promise.resolve({});

test('buildEventTimeline - main path', () => {
  const events = [
    {
      id: 'test-event',
      title: 'Main',
      start: '2025-01-01T10:00:00Z',
      durationMinutes: 60,
      timezone: 'UTC',
    },
  ];

  const timeline = buildEventTimeline(events);

  assert.ok(Array.isArray(timeline));
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].id, 'test-event');
  assert.equal(timeline[0].title, 'Main');
  assert.equal(timeline[0].durationMinutes, 60);
});

test('buildEventTimeline - edge/error path (invalid timezone fallbacks)', () => {
  // If timezone is empty, the function might still parse start, but we can test
  // falling back or filtering out completely bad events.
  const events = [
    {
      id: 'bad-event',
      title: 'Bad',
      start: null,
    },
  ];

  const timeline = buildEventTimeline(events);

  assert.ok(Array.isArray(timeline));
  assert.equal(timeline.length, 0);
});
