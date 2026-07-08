import type { AttributeImpact, SkillImpact } from "@/db/schema";

export type ActivityType =
  | "learning"
  | "deep-work"
  | "training"
  | "creative"
  | "journal"
  | "social";

export type ActivityDefinition = {
  type: ActivityType;
  label: string;
  verb: string;
  domain: string;
  baseXp: number;
  skill: string;
  attributes: Array<{ key: string; label: string; weight: number }>;
  description: string;
};

export type ActivityInput = {
  type: ActivityType;
  title: string;
  minutes: number;
  intensity: number;
  note?: string;
};



export const activityDefinitions: ActivityDefinition[] = [
  {
    type: "learning",
    label: "Learning",
    verb: "Studied",
    domain: "Knowledge",
    baseXp: 18,
    skill: "Learning Systems",
    attributes: [
      { key: "intelligence", label: "Intelligence", weight: 0.55 },
      { key: "wisdom", label: "Wisdom", weight: 0.25 },
      { key: "discipline", label: "Discipline", weight: 0.2 },
    ],
    description: "Courses, reading, research, deliberate practice, and skill acquisition.",
  },
  {
    type: "deep-work",
    label: "Deep Work",
    verb: "Built",
    domain: "Execution",
    baseXp: 22,
    skill: "Deep Work",
    attributes: [
      { key: "discipline", label: "Discipline", weight: 0.45 },
      { key: "intelligence", label: "Intelligence", weight: 0.25 },
      { key: "creativity", label: "Creativity", weight: 0.3 },
    ],
    description: "Focused output, project building, business execution, and maker sessions.",
  },
  {
    type: "training",
    label: "Training",
    verb: "Trained",
    domain: "Body",
    baseXp: 20,
    skill: "Physical Conditioning",
    attributes: [
      { key: "strength", label: "Strength", weight: 0.55 },
      { key: "discipline", label: "Discipline", weight: 0.3 },
      { key: "wisdom", label: "Wisdom", weight: 0.15 },
    ],
    description: "Strength work, mobility, sport, cardio, and recovery routines.",
  },
  {
    type: "creative",
    label: "Creative Output",
    verb: "Created",
    domain: "Expression",
    baseXp: 19,
    skill: "Creative Production",
    attributes: [
      { key: "creativity", label: "Creativity", weight: 0.55 },
      { key: "charisma", label: "Charisma", weight: 0.2 },
      { key: "discipline", label: "Discipline", weight: 0.25 },
    ],
    description: "Writing, design, music, content, invention, and artistic practice.",
  },
  {
    type: "journal",
    label: "Reflection",
    verb: "Reflected on",
    domain: "Mind",
    baseXp: 13,
    skill: "Self Reflection",
    attributes: [
      { key: "wisdom", label: "Wisdom", weight: 0.5 },
      { key: "discipline", label: "Discipline", weight: 0.25 },
      { key: "charisma", label: "Charisma", weight: 0.25 },
    ],
    description: "Journaling, planning, reviews, emotional processing, and retrospectives.",
  },
  {
    type: "social",
    label: "Social Growth",
    verb: "Connected through",
    domain: "Relationships",
    baseXp: 16,
    skill: "Communication",
    attributes: [
      { key: "charisma", label: "Charisma", weight: 0.55 },
      { key: "wisdom", label: "Wisdom", weight: 0.25 },
      { key: "creativity", label: "Creativity", weight: 0.2 },
    ],
    description: "Networking, difficult conversations, mentoring, teaching, and community.",
  },
];

export const defaultAttributes = [
  { key: "strength", label: "Strength", score: 1, xp: 0 },
  { key: "intelligence", label: "Intelligence", score: 1, xp: 0 },
  { key: "discipline", label: "Discipline", score: 1, xp: 0 },
  { key: "creativity", label: "Creativity", score: 1, xp: 0 },
  { key: "charisma", label: "Charisma", score: 1, xp: 0 },
  { key: "wisdom", label: "Wisdom", score: 1, xp: 0 },
];

export const defaultSkills: Array<{
  name: string;
  domain: string;
  level: number;
  xp: number;
  masteryTier: string;
  signal: string;
}> = [];

export function getActivityDefinition(type: ActivityType) {
  return activityDefinitions.find((definition) => definition.type === type) ?? activityDefinitions[0];
}

export function isDormant(lastActivityAt: Date | null, now: Date) {
  if (!lastActivityAt) return false;
  const days = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 7;
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 125)) + 1);
}

export function scoreFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 90)) + 1);
}

export function masteryTierFromLevel(level: number) {
  if (level >= 20) return "Paragon";
  if (level >= 12) return "Expert";
  if (level >= 5) return "Adept";
  return "Initiate";
}

export function xpToNextLevel(level: number) {
  return Math.max(250, level * level * 125);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
