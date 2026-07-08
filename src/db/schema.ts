import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  real,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export type AttributeImpact = {
  key: string;
  label: string;
  xp: number;
};

export type SkillImpact = {
  name: string;
  xp: number;
};

export const playerProfiles = pgTable("player_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  handle: text("handle").notNull(),
  archetype: text("archetype").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(1000),
  energy: integer("energy").notNull().default(86),
  focusStreakDays: integer("focus_streak_days").notNull().default(0),
  streakBest: integer("streak_best").notNull().default(0),
  momentum: real("momentum").notNull().default(1.0),
  graceDaysRemaining: integer("grace_days_remaining").notNull().default(3),
  graceDaysResetMonth: text("grace_days_reset_month").notNull().default(""),
  dormant: boolean("dormant").notNull().default(false),
  currentTitle: text("current_title").notNull().default("Novice"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  hardcoreMode: boolean("hardcore_mode").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  autoBackup: boolean("auto_backup").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attributeScores = pgTable(
  "attribute_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    score: integer("score").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("attribute_scores_player_key_idx").on(table.playerId, table.key)],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    masteryTier: text("mastery_tier").notNull().default("Initiate"),
    signal: text("signal").notNull().default("active"),
    attributeWeights: jsonb("attribute_weights").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("skills_player_name_idx").on(table.playerId, table.name)],
);

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  offlineId: uuid("offline_id"),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  minutes: integer("minutes").notNull().default(0),
  intensity: integer("intensity").notNull().default(3),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  attributeImpacts: jsonb("attribute_impacts")
    .$type<AttributeImpact[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  skillImpacts: jsonb("skill_impacts")
    .$type<SkillImpact[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quests = pgTable("quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  target: integer("target").notNull().default(100),
  rewardXp: integer("reward_xp").notNull().default(100),
  dueLabel: text("due_label").notNull().default("This week"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTemplates = pgTable("activity_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  defaultMinutes: integer("default_minutes").notNull().default(30),
  defaultIntensity: integer("default_intensity").notNull().default(3),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  content: text("content").notNull(),
  mood: text("mood").notNull().default("focused"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    progress: integer("progress").notNull().default(0),
    target: integer("target").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("achievements_player_title_idx").on(table.playerId, table.title)],
);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  domain: text("domain").notNull().default("Execution"),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  target: integer("target").notNull().default(100),
  rewardXp: integer("reward_xp").notNull().default(500),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  totalPages: integer("total_pages").notNull().default(200),
  pagesRead: integer("pages_read").notNull().default(0),
  status: text("status").notNull().default("reading"),
  mappedSkill: text("mapped_skill").notNull().default("Learning Systems"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  offlineId: uuid("offline_id"),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerProfiles.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  notes: text("notes"),
  xpAwarded: integer("xp_awarded").notNull().default(0),
});

export const workoutSets = pgTable("workout_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weight: integer("weight").notNull(), // can be in lbs or kg
});
