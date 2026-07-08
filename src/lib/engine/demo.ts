import { createDefaultRulesEngine, createNewPlayer, addSkillToRegistry } from './engine';
import { InMemoryStorageAdapter, exportStateAsJson, wrapForSave } from './persistence';
import { ActivityEvent } from './types';

async function main() {
  const engine = createDefaultRulesEngine();
  let state = createNewPlayer('Player One');

  state = addSkillToRegistry(state, {
    id: 'guitar',
    name: 'Guitar',
    category: 'creative',
    attributeWeights: { creativity: 1, discipline: 0.4 },
  });
  state = addSkillToRegistry(state, {
    id: 'running',
    name: 'Running',
    category: 'fitness',
    attributeWeights: { strength: 1, discipline: 0.3 },
  });

  const day = (offset: number) => {
    const d = new Date('2026-07-01T09:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  };

  const events: ActivityEvent[] = [
    { id: 'e1', type: 'practice', skillId: 'guitar', baseXp: 30, timestamp: day(0) },
    { id: 'e2', type: 'workout', skillId: 'running', baseXp: 25, timestamp: day(1) },
    { id: 'e3', type: 'practice', skillId: 'guitar', baseXp: 30, timestamp: day(2) },
    // 4-day gap: more than the 3 free grace days, so momentum should ease - never crash to a penalty.
    { id: 'e4', type: 'workout', skillId: 'running', baseXp: 25, timestamp: day(7) },
  ];

  for (const event of events) {
    const result = engine.processEvent(event, state);
    state = result.state;
    console.log(`\n[${event.timestamp.slice(0, 10)}] logged "${event.type}" (${event.skillId ?? 'no skill'})`);
    for (const change of result.changes) console.log(`  - ${change.message}`);
  }

  console.log('\n--- Final state summary ---');
  console.log('Character level:', state.character.level, `(${state.character.xpIntoLevel}/${state.character.xpForNextLevel} xp)`);
  console.log('Momentum multiplier:', state.momentum.multiplier.toFixed(2) + 'x');
  console.log('Attributes:', Object.fromEntries(Object.entries(state.attributes).map(([k, v]) => [k, v.level])));
  console.log('Skills:', Object.fromEntries(Object.entries(state.skills).map(([k, v]) => [k, v.level])));

  const storage = new InMemoryStorageAdapter();
  await storage.save(wrapForSave(state));
  console.log('\nSaved to storage adapter. Exported JSON length:', exportStateAsJson(state).length, 'chars');
}

main();
