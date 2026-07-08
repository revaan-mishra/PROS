import { AttributeState } from './types';
import { xpRequiredForLevel, DEFAULT_ATTRIBUTE_CURVE } from './xpCurve';

/**
 * Attributes are the small, fixed set from the project vision - unlike
 * skills, these are not user-extensible at runtime. Add more here directly
 * if you want a 7th or 8th attribute; every player gets the full set.
 */
export const ATTRIBUTE_DEFINITIONS = [
  { id: 'strength', name: 'Strength', description: 'Physical training and endurance.' },
  { id: 'intelligence', name: 'Intelligence', description: 'Learning, analysis, and technical skill.' },
  { id: 'discipline', name: 'Discipline', description: 'Consistency, focus, and follow-through.' },
  { id: 'creativity', name: 'Creativity', description: 'Original thinking and creative output.' },
  { id: 'charisma', name: 'Charisma', description: 'Communication and social connection.' },
  { id: 'wisdom', name: 'Wisdom', description: 'Reflection, judgment, and self-awareness.' },
] as const;

export type AttributeId = (typeof ATTRIBUTE_DEFINITIONS)[number]['id'];

export function createInitialAttributeState(): Record<AttributeId, AttributeState> {
  const state = {} as Record<AttributeId, AttributeState>;
  for (const def of ATTRIBUTE_DEFINITIONS) {
    state[def.id] = {
      level: 0,
      totalXp: 0,
      xpIntoLevel: 0,
      xpForNextLevel: xpRequiredForLevel(1, DEFAULT_ATTRIBUTE_CURVE),
    };
  }
  return state;
}
