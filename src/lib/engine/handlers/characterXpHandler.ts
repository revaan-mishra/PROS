import { ActivityEvent, ChangeLogEntry, HandlerOutput, PlayerState } from '../types';
import { levelFromTotalXp, DEFAULT_CHARACTER_CURVE } from '../xpCurve';

export function characterXpHandler(event: ActivityEvent, state: PlayerState): HandlerOutput {
  const xpGained = Math.round(event.baseXp * state.momentum.multiplier);
  const newTotalXp = state.character.totalXp + xpGained;
  const progress = levelFromTotalXp(newTotalXp, DEFAULT_CHARACTER_CURVE);

  const changes: ChangeLogEntry[] = [
    { type: 'xp_gained', message: `+${xpGained} character XP`, data: { xpGained, source: event.type } },
  ];
  if (progress.level > state.character.level) {
    changes.push({ type: 'level_up', message: `Character reached level ${progress.level}`, data: { newLevel: progress.level } });
  }

  return {
    state: {
      ...state,
      character: {
        level: progress.level,
        totalXp: newTotalXp,
        xpIntoLevel: progress.xpIntoLevel,
        xpForNextLevel: progress.xpForNextLevel,
      },
    },
    changes,
  };
}
