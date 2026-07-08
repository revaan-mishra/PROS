import { db } from "./src/db";
import { exercises } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const commonExercises = [
    { name: "Bench Press", muscleGroup: "Chest" },
    { name: "Squat", muscleGroup: "Legs" },
    { name: "Deadlift", muscleGroup: "Back" },
    { name: "Overhead Press", muscleGroup: "Shoulders" },
    { name: "Pull-up", muscleGroup: "Back" },
    { name: "Barbell Row", muscleGroup: "Back" },
    { name: "Dumbbell Curl", muscleGroup: "Arms" },
    { name: "Tricep Extension", muscleGroup: "Arms" },
    { name: "Leg Press", muscleGroup: "Legs" },
    { name: "Calf Raise", muscleGroup: "Legs" },
    { name: "Lat Pulldown", muscleGroup: "Back" },
    { name: "Incline Bench Press", muscleGroup: "Chest" }
  ];

  for (const ex of commonExercises) {
    const existing = await db.select().from(exercises).where(eq(exercises.name, ex.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(exercises).values(ex);
      console.log(`Inserted ${ex.name}`);
    }
  }
  
  console.log("Seeding complete.");
  process.exit(0);
}

main().catch(console.error);
