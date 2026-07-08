import { ActivityEvent, HandlerOutput, PlayerState } from '../types';
import { applyActivityToMomentum } from '../momentum';

/**
 * Must run before characterXpHandler/skillHandler/attributeHandler - they
 * all read state.momentum.multiplier to compute this event's XP.
 */
export function momentumHandler(event: ActivityEvent, state: PlayerState): HandlerOutput {
  const now = new Date(event.timestamp);
  const { momentum, events } = applyActivityToMomentum(state.momentum, now);

  return {
    state: { ...state, momentum },
    changes: events,
  };
}
