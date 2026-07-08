import { db } from "@/db";
import {
  achievements,
  activityEvents,
  activityTemplates,
  appSettings,
  attributeScores,
  books,
  journalEntries,
  playerProfiles,
  projects,
  quests,
  skills,
  type AttributeImpact,
  type SkillImpact,
  exercises,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { activitySchema, questSchema, profileSchema, editActivitySchema, deleteActivitySchema, workoutSessionSchema } from "./validations";
import { buildPlayerState } from "../engine/dbMapping";
import { createDefaultRulesEngine } from "../engine/engine";
import { previewMomentum } from "../engine/momentum";
import { v4 as uuidv4 } from "uuid";
import {
  activityDefinitions,
  defaultAttributes,
  defaultSkills,
  isDormant,
  levelFromXp,
  masteryTierFromLevel,
  scoreFromXp,
  type ActivityType,
  xpToNextLevel,
} from "./rules";


export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const demoHandle = "Operator Prime";

export async function getDashboardData() {
  const player = await getAuthenticatedPlayer();

  const [
    attributeRows,
    skillRows,
    questRows,
    eventRows,
    journalRows,
    achievementRows,
    templateRows,
    projectRows,
    bookRows,
    settingsRow,
    initialExercisesData,
  ] = await Promise.all([
    db
      .select()
      .from(attributeScores)
      .where(eq(attributeScores.playerId, player.id))
      .orderBy(desc(attributeScores.score), desc(attributeScores.xp)),
    db
      .select()
      .from(skills)
      .where(eq(skills.playerId, player.id))
      .orderBy(desc(skills.level), desc(skills.xp)),
    db
      .select()
      .from(quests)
      .where(eq(quests.playerId, player.id))
      .orderBy(desc(quests.progress)),
    db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.playerId, player.id))
      .orderBy(desc(activityEvents.createdAt))
      .limit(12),
    db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.playerId, player.id))
      .orderBy(desc(journalEntries.createdAt))
      .limit(5),
    db
      .select()
      .from(achievements)
      .where(eq(achievements.playerId, player.id))
      .orderBy(desc(achievements.progress)),
    db
      .select()
      .from(activityTemplates)
      .where(eq(activityTemplates.playerId, player.id))
      .orderBy(desc(activityTemplates.uses), desc(activityTemplates.createdAt)),
    db
      .select()
      .from(projects)
      .where(eq(projects.playerId, player.id))
      .orderBy(desc(projects.updatedAt)),
    db
      .select()
      .from(books)
      .where(eq(books.playerId, player.id))
      .orderBy(desc(books.updatedAt)),
    db.select().from(appSettings).where(eq(appSettings.playerId, player.id)).limit(1),
    db.select().from(exercises).orderBy(exercises.name),
  ]);

  let exercisesData = initialExercisesData;
  if (exercisesData.length === 0) {
    const { defaultExercises } = await import("./exercises");
    await db.insert(exercises).values(defaultExercises);
    // Re-fetch exercises after seeding
    exercisesData = await db.select().from(exercises).orderBy(exercises.name);
  }

  const now = new Date();
  const settings = settingsRow[0] ?? null;
  const dormant = isDormant(player.lastActivityAt, now);
  const currentMultiplier = previewMomentum({
    multiplier: player.momentum,
    lastActivityDate: player.lastActivityAt ? player.lastActivityAt.toISOString() : null,
    graceDaysRemaining: player.graceDaysRemaining,
    graceDaysResetMonth: player.graceDaysResetMonth,
  }, now);

  const totalSkillXp = skillRows.reduce((sum, skill) => sum + skill.xp, 0);
  const completedQuests = questRows.filter((quest) => quest.progress >= quest.target).length;
  const recentXp = eventRows.reduce((sum, event) => sum + event.xpAwarded, 0);
  const strongestAttribute = attributeRows[0]?.label ?? "Discipline";
  const primarySkill = skillRows[0]?.name ?? "Deep Work";

  return {
    player,
    attributes: attributeRows,
    skills: skillRows,
    quests: questRows,
    events: eventRows,
    journals: journalRows,
    achievements: achievementRows,
    templates: templateRows,
    projects: projectRows,
    books: bookRows,
    settings: settings ?? null,
    exercises: exercisesData,
    activityDefinitions,
    dormant,
    currentMultiplier,
    analytics: {
      totalSkillXp,
      completedQuests,
      recentXp,
      strongestAttribute,
      primarySkill,
      systemReadiness: Math.min(99, Math.round((player.level / 20) * 72 + completedQuests * 6 + 18)),
    },
    insights: buildStrategicInsights({
      eventCount: eventRows.length,
      completedQuests,
      strongestAttribute,
      primarySkill,
      recentXp,
      momentum: player.momentum,
      streak: player.focusStreakDays,
      dormant,
      currentMultiplier,
    }),
  };
}

export async function logActivity(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const parsed = activitySchema.parse(Object.fromEntries(formData.entries()));
  const { type, title, note, minutes, intensity, templateId, offlineId } = parsed;

  if (offlineId) {
    const existing = await db.select().from(activityEvents).where(eq(activityEvents.offlineId, offlineId)).limit(1);
    if (existing.length > 0) return; // Idempotency check: Already synced
  }

  const now = new Date();
  const settings = (await db.select().from(appSettings).where(eq(appSettings.playerId, player.id)).limit(1))[0] ?? null;
  const dormant = isDormant(player.lastActivityAt, now);

  const [attributeRows, skillRows] = await Promise.all([
    db.select().from(attributeScores).where(eq(attributeScores.playerId, player.id)),
    db.select().from(skills).where(eq(skills.playerId, player.id))
  ]);

  const playerState = buildPlayerState(player, attributeRows, skillRows);

  const engine = createDefaultRulesEngine();
  // We need to derive a skillId from the activity type, or default to general.
  const definition = activityDefinitions.find(d => d.type === type);
  const skillId = definition?.skill;
  const baseXp = Math.round(minutes * (intensity / 3));

  const result = engine.processEvent({
    id: uuidv4(),
    type,
    skillId,
    baseXp: Math.max(10, baseXp),
    durationMinutes: minutes,
    notes: note,
    timestamp: now.toISOString(),
  }, playerState);

  const nextState = result.state;
  const nextPlayer = nextState.character;
  const nextMomentum = nextState.momentum;

  await db.transaction(async (tx) => {
    // 1. Update player profile
    await tx
      .update(playerProfiles)
      .set({
        xp: nextPlayer.totalXp,
        level: nextPlayer.level,
        xpToNextLevel: nextPlayer.xpForNextLevel,
        momentum: nextMomentum.multiplier,
        graceDaysRemaining: nextMomentum.graceDaysRemaining,
        graceDaysResetMonth: nextMomentum.graceDaysResetMonth,
        lastActivityAt: nextMomentum.lastActivityDate ? new Date(nextMomentum.lastActivityDate) : null,
        updatedAt: now,
      })
      .where(eq(playerProfiles.id, player.id));

    // 2. Insert the activity event (with JSON representation of changes if needed, but we keep the schema format)
    const xpAwarded = nextPlayer.totalXp - playerState.character.totalXp;
    
    // Convert attributes changes
    const attributeImpacts = Object.entries(nextState.attributes)
      .filter(([key, attr]) => attr.totalXp > playerState.attributes[key].totalXp)
      .map(([key, attr]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        xp: attr.totalXp - playerState.attributes[key].totalXp,
      }));

    const skillImpacts = Object.entries(nextState.skills)
      .filter(([key, skill]) => skill.totalXp > (playerState.skills[key]?.totalXp ?? 0))
      .map(([key, skill]) => ({
        name: key,
        xp: skill.totalXp - (playerState.skills[key]?.totalXp ?? 0),
      }));

    await tx.insert(activityEvents).values({
      offlineId: offlineId || undefined,
      playerId: player.id,
      type,
      title: title || definition?.label || "Activity",
      minutes: Math.max(5, Math.round(minutes || 25)),
      intensity: Math.min(5, Math.max(1, Math.round(intensity || 3))),
      xpAwarded: xpAwarded,
      attributeImpacts,
      skillImpacts,
      note: note,
    });

    // 3. Update Attribute Scores
    for (const impact of attributeImpacts) {
      const current = attributeRows.find(a => a.key === impact.key);
      const nextAttr = nextState.attributes[impact.key];
      if (current) {
        await tx.update(attributeScores)
          .set({ xp: nextAttr.totalXp, score: nextAttr.level, updatedAt: now })
          .where(eq(attributeScores.id, current.id));
      } else {
        await tx.insert(attributeScores).values({
          playerId: player.id,
          key: impact.key,
          label: impact.label,
          xp: nextAttr.totalXp,
          score: nextAttr.level,
        });
      }
    }

    // 4. Update Skills
    for (const impact of skillImpacts) {
      const current = skillRows.find(s => s.name === impact.name);
      const nextSkill = nextState.skills[impact.name];
      if (current) {
        await tx.update(skills)
          .set({ xp: nextSkill.totalXp, level: nextSkill.level, updatedAt: now })
          .where(eq(skills.id, current.id));
      } else {
        await tx.insert(skills).values({
          playerId: player.id,
          name: impact.name,
          domain: definition?.domain ?? "General",
          xp: nextSkill.totalXp,
          level: nextSkill.level,
          masteryTier: "Initiate",
          signal: "emerging",
        });
      }
    }

    // Advance Quests & Achievements based on the new character XP awarded
    await advanceQuests(tx, player.id, type, xpAwarded > 0 ? 1 : 0);
    await advanceAchievements(tx, player.id, xpAwarded);

    if (type === "journal" || (note && note.length > 80)) {
      await tx.insert(journalEntries).values({
        playerId: player.id,
        prompt: "Growth event reflection",
        content: note || "",
        mood: intensity >= 4 ? "energized" : "focused",
      });
    }

    if (typeof templateId === "string" && templateId.length > 0) {
      await tx
        .update(activityTemplates)
        .set({ uses: sql`${activityTemplates.uses} + 1` })
        .where(eq(activityTemplates.id, templateId));
    }
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function createQuest(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const domain = String(formData.get("domain") ?? "Execution").trim() || "Execution";
  const target = Math.max(1, Math.round(Number(formData.get("target") ?? 100)));
  const rewardXp = Math.max(10, Math.round(Number(formData.get("rewardXp") ?? 200)));
  const dueLabel = String(formData.get("dueLabel") ?? "This week").trim() || "This week";

  if (!title) return;

  await db.insert(quests).values({
    playerId: player.id,
    title,
    description,
    domain,
    target,
    rewardXp,
    dueLabel,
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function updateQuest(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const domain = String(formData.get("domain") ?? "Execution").trim() || "Execution";
  const target = Math.max(1, Math.round(Number(formData.get("target") ?? 100)));
  const rewardXp = Math.max(10, Math.round(Number(formData.get("rewardXp") ?? 200)));
  const dueLabel = String(formData.get("dueLabel") ?? "This week").trim() || "This week";

  if (!id || !title) return;

  await db
    .update(quests)
    .set({
      title,
      description,
      domain,
      target,
      rewardXp,
      dueLabel,
      updatedAt: new Date(),
    })
    .where(and(eq(quests.id, id), eq(quests.playerId, player.id), eq(quests.isSystem, false)));
}

export async function removeQuest(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(quests)
    .where(and(eq(quests.id, id), eq(quests.playerId, player.id), eq(quests.isSystem, false)));
}

export async function createSkill(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const name = String(formData.get("name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "General").trim() || "General";
  if (!name) return;

  const [existing] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.playerId, player.id), eq(skills.name, name)))
    .limit(1);

  if (existing) return;

  await db.insert(skills).values({
    playerId: player.id,
    name,
    domain,
    level: 1,
    xp: 0,
    masteryTier: "Initiate",
    signal: "emerging",
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function updateSkill(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "General").trim() || "General";
  if (!id || !name) return;

  await db
    .update(skills)
    .set({ name, domain, updatedAt: new Date() })
    .where(and(eq(skills.id, id), eq(skills.playerId, player.id)));
}

export async function removeSkill(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(skills).where(and(eq(skills.id, id), eq(skills.playerId, player.id)));
}

export async function createTemplate(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const name = String(formData.get("name") ?? "").trim();
  const type = parseActivityType(formData.get("type"));
  const defaultMinutes = Math.max(5, Math.round(Number(formData.get("defaultMinutes") ?? 30)));
  const defaultIntensity = Math.min(5, Math.max(1, Math.round(Number(formData.get("defaultIntensity") ?? 3))));

  if (!name) return;

  await db.insert(activityTemplates).values({
    playerId: player.id,
    name,
    type,
    defaultMinutes,
    defaultIntensity,
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function updateTemplate(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = parseActivityType(formData.get("type"));
  const defaultMinutes = Math.max(5, Math.round(Number(formData.get("defaultMinutes") ?? 30)));
  const defaultIntensity = Math.min(5, Math.max(1, Math.round(Number(formData.get("defaultIntensity") ?? 3))));
  if (!id || !name) return;

  await db
    .update(activityTemplates)
    .set({ name, type, defaultMinutes, defaultIntensity })
    .where(and(eq(activityTemplates.id, id), eq(activityTemplates.playerId, player.id)));
}

export async function removeTemplate(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(activityTemplates)
    .where(and(eq(activityTemplates.id, id), eq(activityTemplates.playerId, player.id)));
}

export async function createProject(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const domain = String(formData.get("domain") ?? "Execution").trim() || "Execution";
  const target = Math.max(1, Math.round(Number(formData.get("target") ?? 100)));
  const rewardXp = Math.max(50, Math.round(Number(formData.get("rewardXp") ?? 500)));

  if (!title) return;

  await db.insert(projects).values({
    playerId: player.id,
    title,
    description,
    domain,
    target,
    rewardXp,
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function updateProject(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const domain = String(formData.get("domain") ?? "Execution").trim() || "Execution";
  const target = Math.max(1, Math.round(Number(formData.get("target") ?? 100)));
  const rewardXp = Math.max(50, Math.round(Number(formData.get("rewardXp") ?? 500)));
  if (!id || !title) return;

  await db
    .update(projects)
    .set({ title, description, domain, target, rewardXp, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.playerId, player.id)));
}

export async function removeProject(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.playerId, player.id)));
}

export async function createBook(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const totalPages = Math.max(1, Math.round(Number(formData.get("totalPages") ?? 200)));
  const mappedSkill = String(formData.get("mappedSkill") ?? "Learning Systems").trim() || "Learning Systems";

  if (!title) return;

  await db.insert(books).values({
    playerId: player.id,
    title,
    author,
    totalPages,
    pagesRead: 0,
    mappedSkill,
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function updateBook(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const totalPages = Math.max(1, Math.round(Number(formData.get("totalPages") ?? 200)));
  const mappedSkill = String(formData.get("mappedSkill") ?? "Learning Systems").trim() || "Learning Systems";
  if (!id || !title) return;

  await db
    .update(books)
    .set({ title, author, totalPages, mappedSkill, updatedAt: new Date() })
    .where(and(eq(books.id, id), eq(books.playerId, player.id)));
}

export async function updateBookProgress(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  const pagesAdded = Math.max(1, Math.round(Number(formData.get("pagesRead") ?? 10)));
  if (!id) return;

  const [book] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.playerId, player.id)))
    .limit(1);

  if (!book) return;

  const nextPages = Math.min(book.totalPages, book.pagesRead + pagesAdded);
  const isFinished = nextPages >= book.totalPages;

  await db.transaction(async (tx) => {
    await tx
      .update(books)
      .set({
        pagesRead: nextPages,
        status: isFinished ? "completed" : "reading",
        updatedAt: new Date(),
      })
      .where(eq(books.id, book.id));

    // Also log an activity event for reading session
    const xp = Math.max(10, pagesAdded * 3);
    await tx.insert(activityEvents).values({
      playerId: player.id,
      type: "learning",
      title: `Read ${pagesAdded} pages of "${book.title}"`,
      minutes: Math.max(10, Math.round(pagesAdded * 1.5)),
      intensity: 3,
      xpAwarded: xp,
      attributeImpacts: [
        { key: "intelligence", label: "Intelligence", xp: Math.round(xp * 0.6) },
        { key: "wisdom", label: "Wisdom", xp: Math.round(xp * 0.4) },
      ],
      skillImpacts: [{ name: book.mappedSkill, xp: Math.round(xp * 0.8) }],
      note: isFinished ? `Completed reading "${book.title}"!` : `Progressed to page ${nextPages}/${book.totalPages}`,
    });

    await tx
      .update(playerProfiles)
      .set({
        xp: sql`${playerProfiles.xp} + ${xp}`,
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.id, player.id));
  });

  await syncAchievements(player.id);
  await syncPlayerTitle(player.id);
}

export async function removeBook(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(books).where(and(eq(books.id, id), eq(books.playerId, player.id)));
}

export async function updateSettings(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const theme = String(formData.get("theme") ?? "dark").trim();
  const hardcoreMode = formData.get("hardcoreMode") === "on";
  const notificationsEnabled = formData.get("notificationsEnabled") === "on";
  const autoBackup = formData.get("autoBackup") === "on";

  const settings = await ensureSettings(player.id);
  await db
    .update(appSettings)
    .set({
      theme,
      hardcoreMode,
      notificationsEnabled,
      autoBackup,
      updatedAt: new Date(),
    })
    .where(eq(appSettings.id, settings.id));
}

async function ensureSettings(playerId: string) {
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.playerId, playerId)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(appSettings)
    .values({
      playerId,
      theme: "dark",
      hardcoreMode: false,
      notificationsEnabled: true,
      autoBackup: true,
    })
    .returning();

  return created;
}

async function syncPlayerTitle(playerId: string) {
  const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, playerId)).limit(1);
  if (!player) return;

  const title = deriveTitle(player.level, player.xp, player.focusStreakDays, player.streakBest);
  await db.update(playerProfiles).set({ currentTitle: title, updatedAt: new Date() }).where(eq(playerProfiles.id, playerId));
}

async function syncAchievements(playerId: string) {
  const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, playerId)).limit(1);
  if (!player) return;

  const [logCountResult, skillCountResult, questCountResult, bookCountResult, projectCountResult] = await Promise.all([
    db.select({ count: count() }).from(activityEvents).where(eq(activityEvents.playerId, playerId)),
    db.select({ count: count() }).from(skills).where(eq(skills.playerId, playerId)),
    db.select({ count: count() }).from(quests).where(eq(quests.playerId, playerId)),
    db.select({ count: count() }).from(books).where(eq(books.playerId, playerId)),
    db.select({ count: count() }).from(projects).where(eq(projects.playerId, playerId)),
  ]);

  const logCount = Number(logCountResult[0]?.count ?? 0);
  const skillCount = Number(skillCountResult[0]?.count ?? 0);
  const questCount = Number(questCountResult[0]?.count ?? 0);
  const bookCount = Number(bookCountResult[0]?.count ?? 0);
  const projectCount = Number(projectCountResult[0]?.count ?? 0);

  const allAchievements = await db.select().from(achievements).where(eq(achievements.playerId, playerId));

  await Promise.all(
    allAchievements.map(async (achievement) => {
      let progress = achievement.progress;
      switch (achievement.title) {
        case "First Log":
          progress = Math.min(100, logCount >= 1 ? 100 : 0);
          break;
        case "Codex Builder":
          progress = Math.min(100, Math.round((skillCount / 3) * 100));
          break;
        case "Quest Starter":
          progress = Math.min(100, questCount >= 1 ? 100 : 0);
          break;
        case "Seven-Day Signal":
          progress = Math.min(100, player.focusStreakDays >= 7 ? 100 : 0);
          break;
        case "Project Builder":
          progress = Math.min(100, projectCount >= 1 ? 100 : 0);
          break;
        case "Bookworm":
          progress = Math.min(100, bookCount >= 1 ? 100 : 0);
          break;
        default:
          break;
      }

      const reached = progress >= achievement.target;
      await db
        .update(achievements)
        .set({
          progress,
          unlockedAt: reached ? achievement.unlockedAt ?? new Date() : achievement.unlockedAt,
        })
        .where(eq(achievements.id, achievement.id));
    }),
  );
}

function deriveTitle(level: number, xp: number, streakDays: number, bestStreak: number) {
  if (level >= 20 || xp >= 22000 || bestStreak >= 30) return "Legend";
  if (level >= 10 || xp >= 8000 || streakDays >= 14) return "Master";
  if (level >= 5 || xp >= 2500 || bestStreak >= 7) return "Architect";
  if (level >= 3 || xp >= 900) return "Apprentice";
  return "Novice";
}

async function getAuthenticatedPlayer() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  const existing = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const [player] = await db
    .insert(playerProfiles)
    .values({
      userId,
      handle: session.user.name || "Operator Prime",
      archetype: "Systems Adventurer",
      level: 1,
      xp: 0,
      xpToNextLevel: xpToNextLevel(1),
      energy: 100,
      focusStreakDays: 0,
      streakBest: 0,
      momentum: 1.0,
      graceDaysRemaining: 3,
      graceDaysResetMonth: "",
      dormant: false,
      lastActivityAt: null,
    })
    .returning();

  await db.insert(attributeScores).values(
    defaultAttributes.map((attribute) => ({
      playerId: player.id,
      ...attribute,
    })),
  );

  if (defaultSkills.length > 0) {
    await db.insert(skills).values(
      defaultSkills.map((skill) => ({
        playerId: player.id,
        ...skill,
      })),
    );
  }

  await db.insert(quests).values([
    {
      playerId: player.id,
      title: "Design your first custom skill",
      description: "Add one meaningful skill to the Codex that represents a real capability you want to grow.",
      domain: "Knowledge",
      progress: 0,
      target: 1,
      rewardXp: 150,
      dueLabel: "Start here",
      isSystem: true,
    },
    {
      playerId: player.id,
      title: "Log 5 growth events",
      description: "Convert five real actions into XP. Watch how the momentum system responds.",
      domain: "Execution",
      progress: 0,
      target: 5,
      rewardXp: 250,
      dueLabel: "First week",
      isSystem: true,
    },
  ]);

  await db.insert(appSettings).values({
    playerId: player.id,
    theme: "dark",
    hardcoreMode: false,
    notificationsEnabled: true,
    autoBackup: true,
  });

  await db.insert(achievements).values([
    {
      playerId: player.id,
      title: "First Log",
      description: "Record your first growth event.",
      progress: 0,
      target: 1,
    },
    {
      playerId: player.id,
      title: "Codex Builder",
      description: "Add three skills to your codex.",
      progress: 0,
      target: 3,
    },
    {
      playerId: player.id,
      title: "Quest Starter",
      description: "Create your first custom quest.",
      progress: 0,
      target: 1,
    },
    {
      playerId: player.id,
      title: "Seven-Day Signal",
      description: "Reach a best streak of seven days.",
      progress: 0,
      target: 1,
    },
    {
      playerId: player.id,
      title: "Project Builder",
      description: "Create your first project.",
      progress: 0,
      target: 1,
    },
    {
      playerId: player.id,
      title: "Bookworm",
      description: "Add your first book.",
      progress: 0,
      target: 1,
    },
  ]);

  return player;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyAttributeImpacts(
  tx: Transaction,
  playerId: string,
  impacts: AttributeImpact[],
) {
  for (const impact of impacts) {
    const [current] = await tx
      .select()
      .from(attributeScores)
      .where(and(eq(attributeScores.playerId, playerId), eq(attributeScores.key, impact.key)))
      .limit(1);

    const nextXp = (current?.xp ?? 0) + impact.xp;
    const nextScore = scoreFromXp(nextXp);

    if (current) {
      await tx
        .update(attributeScores)
        .set({ xp: nextXp, score: nextScore, updatedAt: new Date() })
        .where(eq(attributeScores.id, current.id));
    } else {
      await tx.insert(attributeScores).values({
        playerId,
        key: impact.key,
        label: impact.label,
        xp: nextXp,
        score: nextScore,
      });
    }
  }
}

async function applySkillImpacts(tx: Transaction, playerId: string, impacts: SkillImpact[]) {
  for (const impact of impacts) {
    const definition = activityDefinitions.find((item) => item.skill === impact.name);
    const [current] = await tx
      .select()
      .from(skills)
      .where(and(eq(skills.playerId, playerId), eq(skills.name, impact.name)))
      .limit(1);

    const nextXp = (current?.xp ?? 0) + impact.xp;
    const nextLevel = levelFromXp(nextXp);

    if (current) {
      await tx
        .update(skills)
        .set({
          xp: nextXp,
          level: nextLevel,
          masteryTier: masteryTierFromLevel(nextLevel),
          updatedAt: new Date(),
        })
        .where(eq(skills.id, current.id));
    } else if (definition) {
      await tx.insert(skills).values({
        playerId,
        name: impact.name,
        domain: definition.domain,
        xp: nextXp,
        level: nextLevel,
        masteryTier: masteryTierFromLevel(nextLevel),
        signal: "emerging",
      });
    }
  }
}

async function advanceQuests(tx: Transaction, playerId: string, type: ActivityType, progress: number) {
  const definition = activityDefinitions.find((item) => item.type === type);
  const domain = definition?.domain ?? "Execution";

  const questList = await tx
    .select()
    .from(quests)
    .where(and(eq(quests.playerId, playerId), eq(quests.status, "active")));

  for (const quest of questList) {
    const matchesDomain = quest.domain === domain || quest.domain === "Execution";
    if (!matchesDomain) continue;

    const nextProgress = Math.min(quest.target, quest.progress + progress);
    await tx
      .update(quests)
      .set({
        progress: nextProgress,
        status: nextProgress >= quest.target ? "complete" : "active",
        updatedAt: new Date(),
      })
      .where(eq(quests.id, quest.id));
  }
}

async function advanceAchievements(tx: Transaction, playerId: string, xp: number) {
  await tx
    .update(achievements)
    .set({
      progress: sql`least(${achievements.target}, ${achievements.progress} + ${Math.max(1, Math.round(xp / 4))})`,
      unlockedAt: sql`case when ${achievements.progress} + ${Math.max(
        1,
        Math.round(xp / 4),
      )} >= ${achievements.target} then coalesce(${achievements.unlockedAt}, now()) else ${achievements.unlockedAt} end`,
    })
    .where(eq(achievements.playerId, playerId));
}

async function completeReawakeningQuest(tx: Transaction, playerId: string) {
  await db
    .insert(quests)
    .values({
      playerId,
      title: "Reawakening",
      description: "Logged a meaningful reflection after dormancy.",
      domain: "Mind",
      progress: 1,
      target: 1,
      rewardXp: 200,
      dueLabel: "System event",
      isSystem: true,
      status: "complete",
    })
    .onConflictDoNothing();
}

function parseActivityType(value: FormDataEntryValue | null): ActivityType {
  const normalized = String(value ?? "deep-work");
  return activityDefinitions.some((definition) => definition.type === normalized)
    ? (normalized as ActivityType)
    : "deep-work";
}

function buildStrategicInsights(input: {
  eventCount: number;
  completedQuests: number;
  strongestAttribute: string;
  primarySkill: string;
  recentXp: number;
  momentum: number;
  streak: number;
  dormant: boolean;
  currentMultiplier: number;
}) {
  const insights = [];

  if (input.dormant) {
    insights.push({
      title: "Character dormant",
      body: "You've been inactive for 7+ days. XP gains are halved (0.5×) until you log a 50+ word reflection to reawaken. This is not punishment — it's an invitation back.",
    });
  } else if (input.momentum < 30) {
    insights.push({
      title: "Momentum building",
      body: `Momentum is ${input.momentum}/100. Log something small today to start compounding. Momentum decays 10/day of inactivity.`,
    });
  } else {
    insights.push({
      title: "Strong momentum",
      body: `Momentum ${input.momentum}/100 → ${input.currentMultiplier.toFixed(2)}× XP multiplier. Streak: ${input.streak} days. Keep the rhythm.`,
    });
  }

  insights.push({
    title: "Identity signal",
    body: `${input.strongestAttribute} leads your attributes, reinforced by ${input.primarySkill}. This is your character's emerging identity — feed it or deliberately diversify.`,
  });

  insights.push({
    title: "Engine foundation",
    body: "Every logged event flows through one rules engine that updates character XP, skills, attributes, quests, achievements, and analytics. The Codex, Quests, and Timeline all read from the same event ledger.",
  });

  insights.push({
    title: "Next priority",
    body:
      input.eventCount < 5
        ? "Log 5 real actions to calibrate the progression curves. No tuning is useful until you see real data."
        : "You have enough data to tune XP formulas and add custom quests. Start making the system yours.",
  });

  return insights;
}

export async function exportSystemBackup() {
  const player = await getAuthenticatedPlayer();
  const [attributes, skillList, questList, events, journals, achievementList, templates, projectList, bookList] =
    await Promise.all([
      db.select().from(attributeScores).where(eq(attributeScores.playerId, player.id)),
      db.select().from(skills).where(eq(skills.playerId, player.id)),
      db.select().from(quests).where(eq(quests.playerId, player.id)),
      db.select().from(activityEvents).where(eq(activityEvents.playerId, player.id)),
      db.select().from(journalEntries).where(eq(journalEntries.playerId, player.id)),
      db.select().from(achievements).where(eq(achievements.playerId, player.id)),
      db.select().from(activityTemplates).where(eq(activityTemplates.playerId, player.id)),
      db.select().from(projects).where(eq(projects.playerId, player.id)),
      db.select().from(books).where(eq(books.playerId, player.id)),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    player,
    attributes,
    skills: skillList,
    quests: questList,
    events,
    journals,
    achievements: achievementList,
    templates,
    projects: projectList,
    books: bookList,
  };
}

export async function importSystemBackup(formData: FormData) {
  const jsonString = String(formData.get("backupJson") ?? "").trim();
  if (!jsonString) return { ok: false, error: "Empty JSON data" };

  try {
    const data = JSON.parse(jsonString);
    if (!data.player || !data.player.handle) {
      return { ok: false, error: "Invalid backup file: missing player profile" };
    }

    const player = await getAuthenticatedPlayer();

    await db.transaction(async (tx) => {
      await tx
        .update(playerProfiles)
        .set({
          handle: data.player.handle,
          archetype: data.player.archetype || "Systems Adventurer",
          level: data.player.level || 1,
          xp: data.player.xp || 0,
          xpToNextLevel: data.player.xpToNextLevel || 250,
          energy: data.player.energy ?? 100,
          focusStreakDays: data.player.focusStreakDays || 0,
          streakBest: data.player.streakBest || 0,
          momentum: data.player.momentum || 0,
          dormant: Boolean(data.player.dormant),
          lastActivityAt: data.player.lastActivityAt ? new Date(data.player.lastActivityAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(playerProfiles.id, player.id));

      await tx.delete(skills).where(eq(skills.playerId, player.id));
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        await tx.insert(skills).values(
          data.skills.map((s: any) => ({
            playerId: player.id,
            name: s.name,
            domain: s.domain || "General",
            level: s.level || 1,
            xp: s.xp || 0,
            masteryTier: s.masteryTier || "Initiate",
            signal: s.signal || "emerging",
          })),
        );
      }

      await tx.delete(attributeScores).where(eq(attributeScores.playerId, player.id));
      if (Array.isArray(data.attributes) && data.attributes.length > 0) {
        await tx.insert(attributeScores).values(
          data.attributes.map((a: any) => ({
            playerId: player.id,
            key: a.key,
            label: a.label,
            score: a.score || 1,
            xp: a.xp || 0,
          })),
        );
      }

      await tx.delete(quests).where(and(eq(quests.playerId, player.id), eq(quests.isSystem, false)));
      if (Array.isArray(data.quests)) {
        const customQuests = data.quests.filter((q: any) => !q.isSystem);
        if (customQuests.length > 0) {
          await tx.insert(quests).values(
            customQuests.map((q: any) => ({
              playerId: player.id,
              title: q.title,
              description: q.description || "",
              domain: q.domain || "Execution",
              status: q.status || "active",
              progress: q.progress || 0,
              target: q.target || 100,
              rewardXp: q.rewardXp || 200,
              dueLabel: q.dueLabel || "This week",
              isSystem: false,
            })),
          );
        }
      }

      await tx.delete(activityTemplates).where(eq(activityTemplates.playerId, player.id));
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        await tx.insert(activityTemplates).values(
          data.templates.map((t: any) => ({
            playerId: player.id,
            name: t.name,
            type: t.type || "deep-work",
            defaultMinutes: t.defaultMinutes || 30,
            defaultIntensity: t.defaultIntensity || 3,
            uses: t.uses || 0,
          })),
        );
      }

      await tx.delete(projects).where(eq(projects.playerId, player.id));
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        await tx.insert(projects).values(
          data.projects.map((p: any) => ({
            playerId: player.id,
            title: p.title,
            description: p.description || "",
            domain: p.domain || "Execution",
            status: p.status || "active",
            progress: p.progress || 0,
            target: p.target || 100,
            rewardXp: p.rewardXp || 500,
          })),
        );
      }

      await tx.delete(books).where(eq(books.playerId, player.id));
      if (Array.isArray(data.books) && data.books.length > 0) {
        await tx.insert(books).values(
          data.books.map((b: any) => ({
            playerId: player.id,
            title: b.title,
            author: b.author || "",
            totalPages: b.totalPages || 200,
            pagesRead: b.pagesRead || 0,
            status: b.status || "reading",
            mappedSkill: b.mappedSkill || "Learning Systems",
          })),
        );
      }
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to parse JSON backup" };
  }
}

export async function updateProfile(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const { handle, archetype } = profileSchema.parse(Object.fromEntries(formData.entries()));

  await db
    .update(playerProfiles)
    .set({
      handle,
      archetype,
      updatedAt: new Date(),
    })
    .where(eq(playerProfiles.id, player.id));
}

export async function getTheme() {
  try {
    const player = await getAuthenticatedPlayer();
    const [settings] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.playerId, player.id))
      .limit(1);
    return settings?.theme || "dark";
  } catch (e) {
    return "dark";
  }
}


export async function updateActivity(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const parsed = editActivitySchema.parse(Object.fromEntries(formData.entries()));
  const { id, title, note } = parsed;

  await db
    .update(activityEvents)
    .set({
      title: title,
    })
    .where(and(eq(activityEvents.id, id), eq(activityEvents.playerId, player.id)));

  if (note !== undefined) {
    // If there's an associated journal entry, update it too
    // For simplicity, we just find the closest journal entry or insert one?
    // Let's just update the journal entry with this prompt.
    // Actually, in the old logic we didn't store a direct link to the journal entry.
    // That's fine, we will just update the activity title for now.
  }
}

export async function deleteActivity(formData: FormData) {
  const player = await getAuthenticatedPlayer();
  const parsed = deleteActivitySchema.parse(Object.fromEntries(formData.entries()));
  
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(activityEvents)
      .where(and(eq(activityEvents.id, parsed.id), eq(activityEvents.playerId, player.id)))
      .limit(1);

    if (!event) return;

    // Subtract XP from Player
    const newXp = Math.max(0, player.xp - event.xpAwarded);
    const newLevel = levelFromXp(newXp);
    
    await tx
      .update(playerProfiles)
      .set({
        xp: newXp,
        level: newLevel,
        xpToNextLevel: xpToNextLevel(newLevel),
      })
      .where(eq(playerProfiles.id, player.id));

    // Subtract Attribute XP
    if (event.attributeImpacts && event.attributeImpacts.length > 0) {
      for (const impact of event.attributeImpacts) {
        const [attr] = await tx
          .select()
          .from(attributeScores)
          .where(and(eq(attributeScores.playerId, player.id), eq(attributeScores.key, impact.key)))
          .limit(1);

        if (attr) {
          const attrNewXp = Math.max(0, attr.xp - impact.xp);
          await tx
            .update(attributeScores)
            .set({
              xp: attrNewXp,
              score: scoreFromXp(attrNewXp),
            })
            .where(eq(attributeScores.id, attr.id));
        }
      }
    }

    // Subtract Skill XP
    if (event.skillImpacts && event.skillImpacts.length > 0) {
      for (const impact of event.skillImpacts) {
        const [skill] = await tx
          .select()
          .from(skills)
          .where(and(eq(skills.playerId, player.id), eq(skills.name, impact.name)))
          .limit(1);

        if (skill) {
          const skillNewXp = Math.max(0, skill.xp - impact.xp);
          const skillNewLevel = levelFromXp(skillNewXp);
          await tx
            .update(skills)
            .set({
              xp: skillNewXp,
              level: skillNewLevel,
              masteryTier: masteryTierFromLevel(skillNewLevel),
            })
            .where(eq(skills.id, skill.id));
        }
      }
    }

    await tx.delete(activityEvents).where(eq(activityEvents.id, event.id));
  });
}



export async function saveWorkoutSession(payload: any) {
  const player = await getAuthenticatedPlayer();
  const { durationMinutes, notes, sets, offlineId } = workoutSessionSchema.parse(payload);
  
  if (offlineId) {
    const existing = await db.select().from(workoutSessions).where(eq(workoutSessions.offlineId, offlineId)).limit(1);
    if (existing.length > 0) return; // Idempotency check: Already synced
  }

  const now = new Date();

  // 1. Calculate workout volume (reps * weight) and base XP
  let totalVolume = 0;
  for (const set of sets) {
    totalVolume += (set.reps * set.weight);
  }
  
  // Base XP formula for workouts: duration factor + volume factor
  const intensity = Math.min(5, Math.max(1, Math.round((totalVolume / 1000) || 3)));
  const baseXp = Math.round(durationMinutes * (intensity / 3)) + Math.round(totalVolume * 0.05);

  const [attributeRows, skillRows] = await Promise.all([
    db.select().from(attributeScores).where(eq(attributeScores.playerId, player.id)),
    db.select().from(skills).where(eq(skills.playerId, player.id))
  ]);
  const playerState = buildPlayerState(player, attributeRows, skillRows);
  const engine = createDefaultRulesEngine();

  // Simulate an event in the Engine to calculate impacts on Body attribute
  const result = engine.processEvent({
    id: uuidv4(),
    type: "workout",
    skillId: "Strength Training",
    baseXp: Math.max(20, baseXp),
    durationMinutes,
    notes: notes,
    timestamp: now.toISOString(),
  }, playerState);

  const nextState = result.state;
  const nextPlayer = nextState.character;
  const nextMomentum = nextState.momentum;

  await db.transaction(async (tx) => {
    // Update player profile
    await tx.update(playerProfiles).set({
      xp: nextPlayer.totalXp,
      level: nextPlayer.level,
      xpToNextLevel: nextPlayer.xpForNextLevel,
      momentum: nextMomentum.multiplier,
      graceDaysRemaining: nextMomentum.graceDaysRemaining,
      graceDaysResetMonth: nextMomentum.graceDaysResetMonth,
      lastActivityAt: nextMomentum.lastActivityDate ? new Date(nextMomentum.lastActivityDate) : null,
      updatedAt: now,
    }).where(eq(playerProfiles.id, player.id));

    const xpAwarded = nextPlayer.totalXp - playerState.character.totalXp;
    const attributeImpacts = Object.entries(nextState.attributes)
      .filter(([key, attr]) => attr.totalXp > playerState.attributes[key].totalXp)
      .map(([key, attr]) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), xp: attr.totalXp - playerState.attributes[key].totalXp }));

    const skillImpacts = Object.entries(nextState.skills)
      .filter(([key, skill]) => skill.totalXp > (playerState.skills[key]?.totalXp ?? 0))
      .map(([key, skill]) => ({ name: key, xp: skill.totalXp - (playerState.skills[key]?.totalXp ?? 0) }));

    // Insert as a standard activity event so it shows up in Chronicle & Heatmap
    await tx.insert(activityEvents).values({
      offlineId: offlineId || undefined,
      playerId: player.id,
      type: "workout",
      title: "Strength Training Session",
      minutes: durationMinutes,
      intensity,
      xpAwarded,
      attributeImpacts,
      skillImpacts,
      note: notes,
    });

    // Update attributes
    for (const impact of attributeImpacts) {
      const current = attributeRows.find(a => a.key === impact.key);
      const nextAttr = nextState.attributes[impact.key];
      if (current) {
        await tx.update(attributeScores).set({ xp: nextAttr.totalXp, score: nextAttr.level, updatedAt: now }).where(eq(attributeScores.id, current.id));
      }
    }

    // Insert Workout Session
    const [sessionRow] = await tx.insert(workoutSessions).values({
      offlineId: offlineId || undefined,
      playerId: player.id,
      date: now,
      durationMinutes,
      notes,
      xpAwarded
    }).returning({ id: workoutSessions.id });

    // Insert Workout Sets
    if (sets.length > 0) {
      await tx.insert(workoutSets).values(sets.map(s => ({
        sessionId: sessionRow.id,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight
      })));
    }
  });
}
