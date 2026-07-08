/**
 * Core domain types for the Personal RPG Operating System (PROS) rules engine.
 *
 * This module has zero framework dependencies (no React, no browser-only APIs)
 * so it can be unit-tested in isolation and reused unchanged once the UI layer
 * (Phase 2+) is built on top of it.
 */

export type ISODateString = string;

/** A single point on a levelling curve: how much total XP a level represents. */
export interface LevelProgress {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** Attributes are a small, fixed set defined in attributeRegistry.ts. */
export type AttributeState = LevelProgress;

/** Skills are open-ended and user-defined, added to the registry at runtime. */
export interface SkillDefinition {
  id: string;
  name: string;
  category?: string;
  /**
   * How strongly practicing this skill feeds each attribute, e.g.
   * { discipline: 0.5, creativity: 1 }. An activity on this skill awards
   * attribute XP proportional to these weights - this is what makes one
   * logged action ripple across multiple systems instead of updating a
   * single counter. Weights are independent multipliers, not percentages -
   * they need not sum to 1.
   */
  attributeWeights: Partial<Record<string, number>>;
  createdAt: ISODateString;
}

export type SkillState = LevelProgress;

/** A single logged real-world action. This is the only thing the user creates directly. */
export interface ActivityEvent {
  id: string;
  /** Free-form activity type, e.g. 'workout', 'reading', 'deep-work'. */
  type: string;
  /** Which skill (if any) this activity practiced. Must exist in skillRegistry. */
  skillId?: string;
  /** Base XP this activity is worth, before the momentum multiplier is applied. */
  baseXp: number;
  durationMinutes?: number;
  notes?: string;
  timestamp: ISODateString;
}

/**
 * Momentum is a short-lived, decaying bonus - never a penalty on anything
 * already earned. See momentum.ts for the full design rationale.
 */
export interface MomentumState {
  multiplier: number;
  lastActivityDate: ISODateString | null;
  graceDaysRemaining: number;
  /** 'YYYY-MM' - tracks when graceDaysRemaining was last refilled. */
  graceDaysResetMonth: string;
}

export interface ChangeLogEntry {
  type:
    | 'xp_gained'
    | 'level_up'
    | 'skill_xp_gained'
    | 'skill_level_up'
    | 'attribute_xp_gained'
    | 'attribute_level_up'
    | 'momentum_increased'
    | 'momentum_decayed'
    | 'momentum_grace_used';
  message: string;
  data?: Record<string, unknown>;
}

export interface HandlerOutput {
  state: PlayerState;
  changes: ChangeLogEntry[];
}

export interface PlayerState {
  schemaVersion: number;
  player: {
    name: string;
    createdAt: ISODateString;
  };
  character: LevelProgress;
  attributes: Record<string, AttributeState>;
  skills: Record<string, SkillState>;
  skillRegistry: Record<string, SkillDefinition>;
  momentum: MomentumState;
  /** Append-only. Consider capping/archiving this once it grows large. */
  activityLog: ActivityEvent[];
}
