import re

with open('src/lib/pros/data.ts', 'r') as f:
    content = f.read()

# 1. Replace imports and add Zod / Auth imports
content = content.replace('import { buildPlayerState } from "../engine/dbMapping";',
                          'import { auth } from "@/auth";\nimport { activitySchema, questSchema, profileSchema } from "./validations";\nimport { buildPlayerState } from "../engine/dbMapping";')

# 2. Replace ensureDemoState with getAuthenticatedPlayer
old_func = """async function ensureDemoState() {
  const existing = await db.select().from(playerProfiles).limit(1);
  if (existing[0]) return existing[0];

  const [player] = await db
    .insert(playerProfiles)
    .values({
      handle: demoHandle,
      archetype: "Systems Adventurer",
      level: 1,
      xp: 0,
      xpToNextLevel: xpToNextLevel(1),
      energy: 100,
      focusStreakDays: 0,
      streakBest: 0,
      momentum: 0,
      dormant: false,
      lastActivityAt: null,
    })
    .returning();"""

new_func = """async function getAuthenticatedPlayer() {
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
    .returning();"""

content = content.replace(old_func, new_func)

# 3. Replace calls to ensureDemoState() with getAuthenticatedPlayer()
content = content.replace('ensureDemoState()', 'getAuthenticatedPlayer()')

# 4. Refactor logActivity Zod parse
log_act_old = """  const type = parseActivityType(formData.get("type"));
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const minutes = Number(formData.get("minutes") ?? 25);
  const intensity = Number(formData.get("intensity") ?? 3);
  const templateId = formData.get("templateId");"""

log_act_new = """  const parsed = activitySchema.parse(Object.fromEntries(formData.entries()));
  const { type, title, note, minutes, intensity, templateId } = parsed;"""

content = content.replace(log_act_old, log_act_new)

# 5. Add updateProfile function at the end
update_prof = """
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
"""
content += update_prof

with open('src/lib/pros/data.ts', 'w') as f:
    f.write(content)

print("Done")
