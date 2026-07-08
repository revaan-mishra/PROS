with open('src/lib/pros/data.ts', 'r') as f:
    content = f.read()

# Import new schemas
content = content.replace(
    'activitySchema, editActivitySchema, deleteActivitySchema',
    'activitySchema, editActivitySchema, deleteActivitySchema, workoutSessionSchema'
)

# Import new tables
content = content.replace(
    'attributeScores, skills, activityEvents, quests, activityTemplates, appSettings',
    'attributeScores, skills, activityEvents, quests, activityTemplates, appSettings, workoutSessions, workoutSets'
)

# Add saveWorkoutSession function
save_workout_code = """
export async function saveWorkoutSession(payload: any) {
  const player = await getAuthenticatedPlayer();
  const { durationMinutes, notes, sets } = workoutSessionSchema.parse(payload);
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

  revalidatePath("/");
}
"""

content = content + "\n\n" + save_workout_code

with open('src/lib/pros/data.ts', 'w') as f:
    f.write(content)
