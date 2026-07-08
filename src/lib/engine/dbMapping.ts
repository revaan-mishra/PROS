import { PlayerState, ActivityEvent } from "./types";
import { type playerProfiles, type attributeScores, type skills } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

type PlayerRow = InferSelectModel<typeof playerProfiles>;
type AttributeRow = InferSelectModel<typeof attributeScores>;
type SkillRow = InferSelectModel<typeof skills>;

export function buildPlayerState(
  player: PlayerRow,
  attributes: AttributeRow[],
  skills: SkillRow[]
): PlayerState {
  const state: PlayerState = {
    schemaVersion: 1,
    player: {
      name: player.handle,
      createdAt: player.createdAt.toISOString(),
    },
    character: {
      level: player.level,
      totalXp: player.xp,
      xpIntoLevel: 0,
      xpForNextLevel: player.xpToNextLevel,
    },
    attributes: {},
    skills: {},
    skillRegistry: {},
    momentum: {
      multiplier: player.momentum,
      lastActivityDate: player.lastActivityAt ? player.lastActivityAt.toISOString() : null,
      graceDaysRemaining: player.graceDaysRemaining,
      graceDaysResetMonth: player.graceDaysResetMonth,
    },
    activityLog: [],
  };

  for (const attr of attributes) {
    state.attributes[attr.key] = {
      level: attr.score,
      totalXp: attr.xp,
      xpIntoLevel: 0,
      xpForNextLevel: 100, // Dummy
    };
  }

  for (const skill of skills) {
    state.skills[skill.name] = {
      level: skill.level,
      totalXp: skill.xp,
      xpIntoLevel: 0,
      xpForNextLevel: 100, // Dummy
    };
    state.skillRegistry[skill.name] = {
      id: skill.name,
      name: skill.name,
      category: skill.domain,
      attributeWeights: skill.attributeWeights || {},
      createdAt: skill.createdAt.toISOString(),
    };
  }

  return state;
}
