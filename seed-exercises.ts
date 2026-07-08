import { db } from "./src/db";
import { exercises } from "./src/db/schema";
import { sql } from "drizzle-orm";

const EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "Chest" },
  { name: "Incline Barbell Bench Press", muscleGroup: "Chest" },
  { name: "Decline Barbell Bench Press", muscleGroup: "Chest" },
  { name: "Dumbbell Bench Press", muscleGroup: "Chest" },
  { name: "Incline Dumbbell Bench Press", muscleGroup: "Chest" },
  { name: "Dumbbell Flyes", muscleGroup: "Chest" },
  { name: "Cable Crossovers", muscleGroup: "Chest" },
  { name: "Pec Deck Machine", muscleGroup: "Chest" },
  { name: "Push-ups", muscleGroup: "Chest" },
  { name: "Dips (Chest Focus)", muscleGroup: "Chest" },

  // Back
  { name: "Deadlift", muscleGroup: "Back" },
  { name: "Pull-ups", muscleGroup: "Back" },
  { name: "Chin-ups", muscleGroup: "Back" },
  { name: "Barbell Rows", muscleGroup: "Back" },
  { name: "T-Bar Rows", muscleGroup: "Back" },
  { name: "Seated Cable Rows", muscleGroup: "Back" },
  { name: "Lat Pulldown", muscleGroup: "Back" },
  { name: "Dumbbell Rows", muscleGroup: "Back" },
  { name: "Straight-Arm Pulldown", muscleGroup: "Back" },
  { name: "Back Extensions", muscleGroup: "Back" },

  // Legs
  { name: "Barbell Squat", muscleGroup: "Legs" },
  { name: "Front Squat", muscleGroup: "Legs" },
  { name: "Leg Press", muscleGroup: "Legs" },
  { name: "Romanian Deadlift", muscleGroup: "Legs" },
  { name: "Lunges", muscleGroup: "Legs" },
  { name: "Leg Extensions", muscleGroup: "Legs" },
  { name: "Leg Curls", muscleGroup: "Legs" },
  { name: "Bulgarian Split Squats", muscleGroup: "Legs" },
  { name: "Calf Raises (Standing)", muscleGroup: "Legs" },
  { name: "Calf Raises (Seated)", muscleGroup: "Legs" },

  // Shoulders
  { name: "Overhead Press", muscleGroup: "Shoulders" },
  { name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders" },
  { name: "Arnold Press", muscleGroup: "Shoulders" },
  { name: "Lateral Raises", muscleGroup: "Shoulders" },
  { name: "Front Raises", muscleGroup: "Shoulders" },
  { name: "Reverse Pec Deck", muscleGroup: "Shoulders" },
  { name: "Face Pulls", muscleGroup: "Shoulders" },
  { name: "Upright Rows", muscleGroup: "Shoulders" },
  { name: "Cable Lateral Raises", muscleGroup: "Shoulders" },
  { name: "Shrugs", muscleGroup: "Shoulders" },

  // Arms (Biceps & Triceps)
  { name: "Barbell Curls", muscleGroup: "Arms" },
  { name: "Dumbbell Curls", muscleGroup: "Arms" },
  { name: "Hammer Curls", muscleGroup: "Arms" },
  { name: "Preacher Curls", muscleGroup: "Arms" },
  { name: "Cable Curls", muscleGroup: "Arms" },
  { name: "Tricep Pushdowns", muscleGroup: "Arms" },
  { name: "Overhead Tricep Extension", muscleGroup: "Arms" },
  { name: "Skullcrushers", muscleGroup: "Arms" },
  { name: "Close-Grip Bench Press", muscleGroup: "Arms" },
  { name: "Tricep Dips", muscleGroup: "Arms" },

  // Core
  { name: "Crunches", muscleGroup: "Core" },
  { name: "Plank", muscleGroup: "Core" },
  { name: "Hanging Leg Raises", muscleGroup: "Core" },
  { name: "Russian Twists", muscleGroup: "Core" },
  { name: "Ab Wheel Rollouts", muscleGroup: "Core" },
  { name: "Cable Crunches", muscleGroup: "Core" },
  { name: "Bicycle Crunches", muscleGroup: "Core" },
  { name: "Decline Crunches", muscleGroup: "Core" },
  { name: "V-Ups", muscleGroup: "Core" },
  { name: "Woodchoppers", muscleGroup: "Core" }
];

async function seed() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(exercises);
  if (Number(existing[0].count) === 0) {
    console.log("Seeding exercises...");
    await db.insert(exercises).values(EXERCISES);
    console.log("Seeding complete.");
  } else {
    console.log("Exercises already seeded.");
  }
}

seed().catch(console.error);
