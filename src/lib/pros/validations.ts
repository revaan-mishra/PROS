import { z } from "zod";

export const activitySchema = z.object({
  type: z.enum(["learning", "deep-work", "training", "creative", "journal", "social"]),
  title: z.string().trim().optional(),
  note: z.string().trim().optional(),
  minutes: z.coerce.number().min(1).max(720).default(25),
  intensity: z.coerce.number().min(1).max(5).default(3),
  templateId: z.string().uuid().optional().or(z.literal("")),
  offlineId: z.string().uuid().optional(),
});

export const editActivitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const deleteActivitySchema = z.object({
  id: z.string().uuid(),
});

export const questSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional().default(""),
  domain: z.string().trim().default("Execution"),
  target: z.coerce.number().min(1).default(100),
  rewardXp: z.coerce.number().min(10).default(200),
  dueLabel: z.string().trim().default("This week"),
});

export const profileSchema = z.object({
  handle: z.string().trim().min(1, "Handle is required").max(50),
  archetype: z.string().trim().min(1, "Archetype is required").max(50),
});

export const workoutSetSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().min(0),
});

export const workoutSessionSchema = z.object({
  durationMinutes: z.coerce.number().min(1).max(720).default(60),
  notes: z.string().trim().optional(),
  sets: z.array(workoutSetSchema).min(1, "Must log at least one set"),
  offlineId: z.string().uuid().optional(),
});
