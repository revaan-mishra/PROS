/**
 * A single tunable XP curve, reused by character/skill/attribute levelling.
 * Each uses its own config instance so they can be balanced independently
 * later (e.g. make attributes level slower than skills) without touching
 * this module or any handler.
 */
export interface XpCurveConfig {
  /** XP required for level 1, before scaling. */
  baseXp: number;
  /** Growth rate - higher means each level costs proportionally more. */
  exponent: number;
}

export const DEFAULT_CHARACTER_CURVE: XpCurveConfig = { baseXp: 100, exponent: 1.5 };
export const DEFAULT_ATTRIBUTE_CURVE: XpCurveConfig = { baseXp: 60, exponent: 1.6 };
export const DEFAULT_SKILL_CURVE: XpCurveConfig = { baseXp: 40, exponent: 1.4 };

/** XP required to go from (level - 1) to level. */
export function xpRequiredForLevel(level: number, curve: XpCurveConfig = DEFAULT_CHARACTER_CURVE): number {
  if (level <= 0) return 0;
  return Math.round(curve.baseXp * Math.pow(level, curve.exponent));
}

export interface LevelResult {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** Derives level + progress-into-level from a cumulative XP total. */
export function levelFromTotalXp(totalXp: number, curve: XpCurveConfig = DEFAULT_CHARACTER_CURVE): LevelResult {
  let level = 0;
  let remaining = Math.max(0, totalXp);
  // Safety cap so a corrupted/huge XP value can never loop forever.
  for (let i = 0; i < 10000; i++) {
    const req = xpRequiredForLevel(level + 1, curve);
    if (remaining < req) break;
    remaining -= req;
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpRequiredForLevel(level + 1, curve) };
}
