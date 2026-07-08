import { ActivityEvent, ChangeLogEntry, HandlerOutput, PlayerState, SkillState } from '../types';
import { levelFromTotalXp, DEFAULT_SKILL_CURVE } from '../xpCurve';

export function skillHandler(event: ActivityEvent, state: PlayerState): HandlerOutput {
  if (!event.skillId || !state.skillRegistry[event.skillId]) {
    return { state, changes: [] };
  }

  const skillId = event.skillId;
  const skillName = state.skillRegistry[skillId].name;
  const xpGained = Math.round(event.baseXp * state.momentum.multiplier);
  const existing: SkillState = state.skills[skillId] ?? { level: 0, totalXp: 0, xpIntoLevel: 0, xpForNextLevel: 0 };
  const newTotalXp = existing.totalXp + xpGained;
  const progress = levelFromTotalXp(newTotalXp, DEFAULT_SKILL_CURVE);

  const changes: ChangeLogEntry[] = [
    { type: 'skill_xp_gained', message: `+${xpGained} XP in ${skillName}`, data: { skillId, xpGained } },
  ];
  if (progress.level > existing.level) {
    changes.push({
      type: 'skill_level_up',
      message: `${skillName} reached mastery level ${progress.level}`,
      data: { skillId, newLevel: progress.level },
    });
  }

  return {
    state: {
      ...state,
      skills: {
        ...state.skills,
        [skillId]: {
          level: progress.level,
          totalXp: newTotalXp,
          xpIntoLevel: progress.xpIntoLevel,
          xpForNextLevel: progress.xpForNextLevel,
        },
      },
    },
    changes,
  };
}
