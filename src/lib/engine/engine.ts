import { RulesEngine } from './rulesEngine';
import { momentumHandler } from './handlers/momentumHandler';
import { characterXpHandler } from './handlers/characterXpHandler';
import { skillHandler } from './handlers/skillHandler';
import { attributeHandler } from './handlers/attributeHandler';
import { createInitialAttributeState } from './attributeRegistry';
import { createInitialMomentum } from './momentum';
import { PlayerState, SkillDefinition } from './types';

/** Bump this and add a migration in persistence.ts whenever PlayerState's shape changes. */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Handler order matters: momentum must run first (it decides this event's
 * multiplier), character/skill/attribute all read that multiplier after.
 * Future phases add handlers here (e.g. questHandler, achievementHandler) -
 * they should not need to touch the ones already registered.
 */
export function createDefaultRulesEngine(): RulesEngine {
  return new RulesEngine()
    .registerHandler(momentumHandler)
    .registerHandler(characterXpHandler)
    .registerHandler(skillHandler)
    .registerHandler(attributeHandler);
}

export function createNewPlayer(name: string, now: Date = new Date()): PlayerState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    player: { name, createdAt: now.toISOString() },
    character: { level: 0, totalXp: 0, xpIntoLevel: 0, xpForNextLevel: 100 },
    attributes: createInitialAttributeState(),
    skills: {},
    skillRegistry: {},
    momentum: createInitialMomentum(now),
    activityLog: [],
  };
}

export function addSkillToRegistry(
  state: PlayerState,
  skill: Omit<SkillDefinition, 'createdAt'>,
  now: Date = new Date()
): PlayerState {
  if (state.skillRegistry[skill.id]) {
    throw new Error(`Skill "${skill.id}" already exists in the registry.`);
  }
  return {
    ...state,
    skillRegistry: {
      ...state.skillRegistry,
      [skill.id]: { ...skill, createdAt: now.toISOString() },
    },
  };
}
