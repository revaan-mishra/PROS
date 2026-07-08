"use server";

import {
  logActivity,
  createQuest,
  updateQuest,
  removeQuest,
  createSkill,
  updateSkill,
  removeSkill,
  createTemplate,
  updateTemplate,
  removeTemplate,
  createProject,
  updateProject,
  removeProject,
  createBook,
  updateBook,
  updateBookProgress,
  removeBook,
  updateSettings,
  exportSystemBackup,
  importSystemBackup,
  updateProfile,
  updateActivity,
  deleteActivity,
  saveWorkoutSession
} from "@/lib/pros/data";
import { revalidatePath } from "next/cache";

async function runAndRevalidate<T>(task: () => Promise<T>) {
  await task();
  revalidatePath("/");
}

export async function logActivityAction(formData: FormData) {
  await runAndRevalidate(() => logActivity(formData));
}

export async function createQuestAction(formData: FormData) {
  await runAndRevalidate(() => createQuest(formData));
}

export async function updateQuestAction(formData: FormData) {
  await runAndRevalidate(() => updateQuest(formData));
}

export async function removeQuestAction(formData: FormData) {
  await runAndRevalidate(() => removeQuest(formData));
}

export async function createSkillAction(formData: FormData) {
  await runAndRevalidate(() => createSkill(formData));
}

export async function updateSkillAction(formData: FormData) {
  await runAndRevalidate(() => updateSkill(formData));
}

export async function removeSkillAction(formData: FormData) {
  await runAndRevalidate(() => removeSkill(formData));
}

export async function createTemplateAction(formData: FormData) {
  await runAndRevalidate(() => createTemplate(formData));
}

export async function updateTemplateAction(formData: FormData) {
  await runAndRevalidate(() => updateTemplate(formData));
}

export async function removeTemplateAction(formData: FormData) {
  await runAndRevalidate(() => removeTemplate(formData));
}

export async function createProjectAction(formData: FormData) {
  await runAndRevalidate(() => createProject(formData));
}

export async function updateProjectAction(formData: FormData) {
  await runAndRevalidate(() => updateProject(formData));
}

export async function removeProjectAction(formData: FormData) {
  await runAndRevalidate(() => removeProject(formData));
}

export async function createBookAction(formData: FormData) {
  await runAndRevalidate(() => createBook(formData));
}

export async function updateBookAction(formData: FormData) {
  await runAndRevalidate(() => updateBook(formData));
}

export async function updateBookProgressAction(formData: FormData) {
  await runAndRevalidate(() => updateBookProgress(formData));
}

export async function removeBookAction(formData: FormData) {
  await runAndRevalidate(() => removeBook(formData));
}

export async function updateSettingsAction(formData: FormData) {
  await runAndRevalidate(() => updateSettings(formData));
}

export async function exportSystemBackupAction() {
  return await exportSystemBackup();
}

export async function importSystemBackupAction(formData: FormData) {
  const result = await importSystemBackup(formData);
  if (result.ok) {
    revalidatePath("/");
  }
  return result;
}

export async function updateProfileAction(formData: FormData) {
  await runAndRevalidate(() => updateProfile(formData));
}

export async function updateActivityAction(formData: FormData) {
  await runAndRevalidate(() => updateActivity(formData));
}

export async function deleteActivityAction(formData: FormData) {
  await runAndRevalidate(() => deleteActivity(formData));
}

export async function saveWorkoutSessionAction(payload: any) {
  await runAndRevalidate(() => saveWorkoutSession(payload));
}
