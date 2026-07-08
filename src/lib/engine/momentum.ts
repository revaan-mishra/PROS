import { MomentumState } from './types';

/**
 * Momentum design principle: it is the ONLY thing in the engine that can go
 * down, and even then it only ever reduces a temporary bonus multiplier -
 * never XP, levels, or anything already earned. That distinction is what
 * lets consistency be rewarded without punishing a missed day so harshly
 * that a broken streak stops feeling worth rebuilding.
 *
 * All the tuning knobs live here - adjust these, not the handler logic.
 */
export const MOMENTUM_CONFIG = {
  /** Momentum never drops below this - a lapse costs bonus, never baseline. */
  floor: 1.0,
  /** Momentum never exceeds this, so the bonus stays meaningful, not runaway. */
  cap: 1.5,
  /** How much multiplier is gained per consecutive active day. */
  gainPerActiveDay: 0.05,
  /** How much multiplier decays per missed day beyond the grace allowance. */
  decayPerMissedDay: 0.1,
  /** Grace days refilled at the start of each calendar month - misses within
   *  this allowance cost nothing at all. */
  graceDaysPerMonth: 3,
};

export function createInitialMomentum(now: Date = new Date()): MomentumState {
  return {
    multiplier: MOMENTUM_CONFIG.floor,
    lastActivityDate: null,
    graceDaysRemaining: MOMENTUM_CONFIG.graceDaysPerMonth,
    graceDaysResetMonth: monthKey(now),
  };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Whole calendar days between two dates, using UTC day boundaries. */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcB - utcA) / msPerDay);
}

export interface MomentumEvent {
  type: 'momentum_increased' | 'momentum_decayed' | 'momentum_grace_used';
  message: string;
  data?: Record<string, unknown>;
}

export interface MomentumUpdateResult {
  momentum: MomentumState;
  events: MomentumEvent[];
}

/**
 * Advances momentum to account for the gap between the last logged activity
 * and `now`, then applies today's activity on top. Call this once per
 * ActivityEvent, before computing that event's XP.
 */
export function applyActivityToMomentum(momentum: MomentumState, now: Date): MomentumUpdateResult {
  const events: MomentumEvent[] = [];
  let { multiplier, graceDaysRemaining, graceDaysResetMonth } = momentum;

  const currentMonth = monthKey(now);
  if (currentMonth !== graceDaysResetMonth) {
    graceDaysRemaining = MOMENTUM_CONFIG.graceDaysPerMonth;
    graceDaysResetMonth = currentMonth;
  }

  if (momentum.lastActivityDate === null) {
    multiplier = Math.min(MOMENTUM_CONFIG.cap, MOMENTUM_CONFIG.floor + MOMENTUM_CONFIG.gainPerActiveDay);
  } else {
    const gap = daysBetween(new Date(momentum.lastActivityDate), now);
    const missedDays = Math.max(0, gap - 1);

    if (missedDays === 0) {
      multiplier = Math.min(MOMENTUM_CONFIG.cap, multiplier + MOMENTUM_CONFIG.gainPerActiveDay);
      events.push({ type: 'momentum_increased', message: `Momentum up to ${multiplier.toFixed(2)}x` });
    } else if (missedDays <= graceDaysRemaining) {
      graceDaysRemaining -= missedDays;
      events.push({
        type: 'momentum_grace_used',
        message: `Used ${missedDays} grace day${missedDays > 1 ? 's' : ''} - momentum held at ${multiplier.toFixed(2)}x`,
        data: { missedDays, graceDaysRemaining },
      });
    } else {
      const usedGrace = graceDaysRemaining;
      const uncoveredDays = missedDays - usedGrace;
      graceDaysRemaining = 0;
      const decayed = Math.max(MOMENTUM_CONFIG.floor, multiplier - uncoveredDays * MOMENTUM_CONFIG.decayPerMissedDay);

      if (usedGrace > 0) {
        events.push({
          type: 'momentum_grace_used',
          message: `Used remaining ${usedGrace} grace day${usedGrace > 1 ? 's' : ''}`,
          data: { usedGrace },
        });
      }
      if (decayed < multiplier) {
        events.push({
          type: 'momentum_decayed',
          message: `Momentum eased to ${decayed.toFixed(2)}x after ${uncoveredDays} day${uncoveredDays > 1 ? 's' : ''} away - never below ${MOMENTUM_CONFIG.floor.toFixed(2)}x`,
          data: { uncoveredDays },
        });
      }
      multiplier = decayed;
    }
  }

  return {
    momentum: { multiplier, lastActivityDate: now.toISOString(), graceDaysRemaining, graceDaysResetMonth },
    events,
  };
}

/**
 * Read-only projection of momentum "as of now" without logging a new
 * activity - use this to show current momentum on a dashboard even on days
 * with no new events, so decay is visible rather than a surprise.
 */
export function previewMomentum(momentum: MomentumState, now: Date): number {
  if (momentum.lastActivityDate === null) return MOMENTUM_CONFIG.floor;
  const gap = daysBetween(new Date(momentum.lastActivityDate), now);
  const missedDays = Math.max(0, gap - 1);
  if (missedDays <= momentum.graceDaysRemaining) return momentum.multiplier;
  const uncovered = missedDays - momentum.graceDaysRemaining;
  return Math.max(MOMENTUM_CONFIG.floor, momentum.multiplier - uncovered * MOMENTUM_CONFIG.decayPerMissedDay);
}
