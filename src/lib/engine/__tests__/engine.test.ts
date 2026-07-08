import { test } from 'node:test';
import assert from 'node:assert/strict';

import { levelFromTotalXp, DEFAULT_ATTRIBUTE_CURVE } from '../xpCurve';
import { applyActivityToMomentum, createInitialMomentum, MOMENTUM_CONFIG } from '../momentum';
import { createDefaultRulesEngine, createNewPlayer, addSkillToRegistry } from '../engine';
import { exportStateAsJson, importStateFromJson, migrateEnvelope } from '../persistence';

test('xpCurve: level increases monotonically with more xp', () => {
  const low = levelFromTotalXp(50, DEFAULT_ATTRIBUTE_CURVE);
  const high = levelFromTotalXp(5000, DEFAULT_ATTRIBUTE_CURVE);
  assert.ok(high.level > low.level);
});

test('xpCurve: safety cap keeps huge/corrupted xp from hanging', () => {
  const result = levelFromTotalXp(Number.MAX_SAFE_INTEGER, DEFAULT_ATTRIBUTE_CURVE);
  assert.ok(Number.isFinite(result.level));
  assert.ok(result.level <= 10000);
});

test('xpCurve: zero or negative xp never produces a negative level', () => {
  assert.equal(levelFromTotalXp(0).level, 0);
  assert.equal(levelFromTotalXp(-500).level, 0);
});

test('momentum: consecutive active days raise the multiplier', () => {
  let momentum = createInitialMomentum(new Date('2026-01-01T09:00:00Z'));
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-01T09:00:00Z')));
  const before = momentum.multiplier;
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-02T09:00:00Z')));
  assert.ok(momentum.multiplier > before);
});

test('momentum: a gap inside the grace allowance holds the multiplier steady', () => {
  let momentum = createInitialMomentum(new Date('2026-01-01T09:00:00Z'));
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-01T09:00:00Z')));
  const before = momentum.multiplier;
  // 2-day gap, well inside the default 3-grace-day monthly allowance.
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-04T09:00:00Z')));
  assert.equal(momentum.multiplier, before);
  assert.ok(momentum.graceDaysRemaining < MOMENTUM_CONFIG.graceDaysPerMonth);
});

test('momentum: a gap beyond grace decays but never drops below the floor', () => {
  let momentum = createInitialMomentum(new Date('2026-01-01T09:00:00Z'));
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-01T09:00:00Z')));
  // 30-day gap - far beyond any grace allowance.
  ({ momentum } = applyActivityToMomentum(momentum, new Date('2026-01-31T09:00:00Z')));
  assert.equal(momentum.multiplier, MOMENTUM_CONFIG.floor);
  assert.ok(momentum.multiplier >= MOMENTUM_CONFIG.floor);
});

test('rulesEngine: one activity ripples across character, skill, and every weighted attribute', () => {
  let state = createNewPlayer('Tester', new Date('2026-01-01T00:00:00Z'));
  state = addSkillToRegistry(
    state,
    { id: 'guitar', name: 'Guitar', attributeWeights: { creativity: 1, discipline: 0.5 } },
    new Date('2026-01-01T00:00:00Z')
  );
  const engine = createDefaultRulesEngine();

  const result = engine.processEvent(
    { id: 'e1', type: 'practice', skillId: 'guitar', baseXp: 100, timestamp: '2026-01-01T10:00:00.000Z' },
    state
  );

  assert.ok(result.state.character.totalXp > 0, 'character xp should increase');
  assert.ok(result.state.skills.guitar.totalXp > 0, 'skill xp should increase');
  assert.ok(result.state.attributes.creativity.totalXp > 0, 'weighted attribute (creativity) should increase');
  assert.ok(result.state.attributes.discipline.totalXp > 0, 'weighted attribute (discipline) should increase');
  assert.equal(result.state.attributes.strength.totalXp, 0, 'unrelated attribute should be untouched');
});

test('rulesEngine: an unknown skillId is ignored rather than throwing', () => {
  const state = createNewPlayer('Tester', new Date('2026-01-01T00:00:00Z'));
  const engine = createDefaultRulesEngine();
  assert.doesNotThrow(() => {
    engine.processEvent(
      { id: 'e1', type: 'practice', skillId: 'does-not-exist', baseXp: 50, timestamp: '2026-01-01T10:00:00.000Z' },
      state
    );
  });
});

test('persistence: export/import round-trips the exact state', () => {
  const state = createNewPlayer('RoundTrip', new Date('2026-01-01T00:00:00Z'));
  const json = exportStateAsJson(state);
  const restored = importStateFromJson(json);
  assert.deepStrictEqual(restored, state);
});

test('persistence: an unrecognized schema version fails loudly instead of silently corrupting state', () => {
  assert.throws(() => migrateEnvelope({ schemaVersion: 999, state: {} }));
});
