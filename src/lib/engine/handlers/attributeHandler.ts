import { ActivityEvent, AttributeState, ChangeLogEntry, HandlerOutput, PlayerState } from '../types';
import { levelFromTotalXp, DEFAULT_ATTRIBUTE_CURVE } from '../xpCurve';

/**
 * This handler never hardcodes "guitar feeds creativity" - it just reads
 * whatever attributeWeights the skill's registry entry declares. That's the
 * whole trick behind "one action affects multiple systems": the mapping
 * lives in data (the skill registry), not in this code, so adding a new
 * skill later never means editing a handler.
 */
export function attributeHandler(event: ActivityEvent, state: PlayerState): HandlerOutput {
  if (!event.skillId) return { state, changes: [] };
  const skill = state.skillRegistry[event.skillId];
  if (!skill) return { state, changes: [] };

  const changes: ChangeLogEntry[] = [];
  const nextAttributes = { ...state.attributes };

  for (const [attributeId, weight] of Object.entries(skill.attributeWeights)) {
    if (!weight) continue;
    const existing: AttributeState = nextAttributes[attributeId] ?? { level: 0, totalXp: 0, xpIntoLevel: 0, xpForNextLevel: 0 };
    const xpGained = Math.round(event.baseXp * weight * state.momentum.multiplier);
    if (xpGained <= 0) continue;

    const newTotalXp = existing.totalXp + xpGained;
    const progress = levelFromTotalXp(newTotalXp, DEFAULT_ATTRIBUTE_CURVE);

    changes.push({ type: 'attribute_xp_gained', message: `+${xpGained} ${attributeId} XP`, data: { attributeId, xpGained } });
    if (progress.level > existing.level) {
      changes.push({
        type: 'attribute_level_up',
        message: `${attributeId} reached level ${progress.level}`,
        data: { attributeId, newLevel: progress.level },
      });
    }

    nextAttributes[attributeId] = {
      level: progress.level,
      totalXp: newTotalXp,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
    };
  }

  return { state: { ...state, attributes: nextAttributes }, changes };
}
