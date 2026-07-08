"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SubmitButton } from "./submit-button";
import { WorldMap } from "./world-map";
import { StreakCalendar } from "./streak-calendar";
import { ActiveWorkout, type Exercise } from "./active-workout";
import { useSyncQueue } from "@/lib/offline/useSyncQueue";
import { pushToSyncQueue } from "@/lib/offline/db";
import {
  logActivityAction,
  createQuestAction,
  updateQuestAction,
  removeQuestAction,
  createSkillAction,
  updateSkillAction,
  removeSkillAction,
  createTemplateAction,
  updateTemplateAction,
  removeTemplateAction,
  createProjectAction,
  updateProjectAction,
  removeProjectAction,
  createBookAction,
  updateBookAction,
  updateBookProgressAction,
  removeBookAction,
  updateSettingsAction,
  updateProfileAction,
  updateActivityAction,
  deleteActivityAction,
  exportSystemBackupAction,
  importSystemBackupAction,
} from "@/app/actions";

type DashboardProps = {
  data: {
    player: {
      handle: string;
      archetype: string;
      level: number;
      xp: number;
      xpToNextLevel: number;
      energy: number;
      focusStreakDays: number;
      streakBest: number;
      momentum: number;
      dormant: boolean;
      currentTitle: string;
    };
    attributes: Array<{ id: string; key: string; label: string; score: number; xp: number }>;
    skills: Array<{ id: string; name: string; domain: string; level: number; xp: number; masteryTier: string }>;
    quests: Array<{
      id: string;
      title: string;
      description?: string;
      domain: string;
      status: string;
      progress: number;
      target: number;
      rewardXp: number;
      dueLabel: string;
      isSystem: boolean;
    }>;
    events: Array<{
      id: string;
      type: string;
      title: string;
      minutes: number;
      intensity: number;
      xpAwarded: number;
      attributeImpacts: Array<{ key: string; label: string; xp: number }>;
      skillImpacts: Array<{ name: string; xp: number }>;
      createdAt: Date | string;
    }>;
    journals: Array<{ id: string; prompt: string; content: string; mood: string; createdAt: Date | string }>;
    achievements: Array<{ id: string; title: string; description: string; progress: number; target: number; unlockedAt?: Date | string | null }>;
    templates: Array<{ id: string; name: string; type: string; defaultMinutes: number; defaultIntensity: number; uses: number }>;
    projects: Array<{
      id: string;
      title: string;
      description: string;
      domain: string;
      status: string;
      progress: number;
      target: number;
      rewardXp: number;
    }>;
    books: Array<{
      id: string;
      title: string;
      author: string;
      totalPages: number;
      pagesRead: number;
      status: string;
      mappedSkill: string;
    }>;
    settings: {
      id: string;
      theme: string;
      hardcoreMode: boolean;
      notificationsEnabled: boolean;
      autoBackup: boolean;
    } | null;
    activityDefinitions: Array<{
      type: string;
      label: string;
      verb: string;
      domain: string;
      baseXp: number;
      skill: string;
      description: string;
    }>;
    dormant: boolean;
    currentMultiplier: number;
    analytics: {
      totalSkillXp: number;
      completedQuests: number;
      recentXp: number;
      strongestAttribute: string;
      primarySkill: string;
      systemReadiness: number;
    };
    exercises: import("./active-workout").Exercise[];
  };
};

type Tab = "home" | "log" | "fitness" | "codex" | "quests" | "profile" | "chronicle";
type CodexTab = "skills" | "attributes" | "books" | "projects";

export function ProsDashboard({ data }: DashboardProps) {

  const withToast = (actionFn: (fd: FormData) => Promise<any>, loading: string, success: string) => {
    return async (formData: FormData) => {
      try {
        await toast.promise(actionFn(formData), {
          loading,
          success,
          error: (e: any) => e.message || "Action failed"
        });
      } catch (e) {
        console.error(e);
      }
    };
  };

  const [tab, setTab] = useState<Tab>("home");
  const [codexTab, setCodexTab] = useState<CodexTab>("skills");
  const [questFilter, setQuestFilter] = useState<"active" | "completed">("active");
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState(25);

  // Log form state
  const [logType, setLogType] = useState("deep-work");
  const [logTitle, setLogTitle] = useState("");
  const [logMinutes, setLogMinutes] = useState(45);
  const [logIntensity, setLogIntensity] = useState(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(data.player.level === 1 && data.events.length === 0);
  const [logNote, setLogNote] = useState("");
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // Offline sync queue
  const { isSyncing } = useSyncQueue();

  // Track newly completed achievements
  const prevAchievements = useRef(data.achievements.map(a => ({ id: a.id, progress: a.progress })));
  
  useEffect(() => {
    data.achievements.forEach(a => {
      const prev = prevAchievements.current.find(p => p.id === a.id);
      if (prev && prev.progress < a.target && a.progress >= a.target) {
        toast.success(`Achievement Unlocked: ${a.title}`, {
          description: a.description,
          icon: "🏆"
        });
      }
    });
    prevAchievements.current = data.achievements.map(a => ({ id: a.id, progress: a.progress }));
  }, [data.achievements]);


  const xpPct = Math.min(100, Math.round((data.player.xp / data.player.xpToNextLevel) * 100));
  const activeQuests = data.quests.filter((q) => q.status === "active");
  const completedQuests = data.quests.filter((q) => q.status === "complete");

  // Timer effect
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const id = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) {
      setTimeout(() => {
        setTimerRunning(false);
        setLogMinutes(timerPreset);
        setLogTitle(`Focus Session (${timerPreset}m)`);
        setLogType("deep-work");
        setTab("log");
      }, 0);
    }
  }, [timerSeconds, timerRunning, timerPreset]);

  const startTimer = useCallback((mins: number) => {
    setTimerPreset(mins);
    setTimerSeconds(mins * 60);
    setTimerRunning(true);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleExport = async () => {
    try {
      setBackupStatus("Exporting...");
      const backup = await exportSystemBackupAction();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pros-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus("✓ Backup saved");
      setTimeout(() => setBackupStatus(null), 3000);
    } catch {
      setBackupStatus("❌ Export failed");
    }
  };

  const handleImport = async (formData: FormData) => {
    setBackupStatus("Restoring...");
    const res = await importSystemBackupAction(formData);
    setBackupStatus(res.ok ? "✓ Restored" : `❌ ${res.error}`);
    setTimeout(() => setBackupStatus(null), 3000);
  };

  const applyTemplate = (t: (typeof data.templates)[0]) => {
    setLogType(t.type);
    setLogTitle(t.name);
    setLogMinutes(t.defaultMinutes);
    setLogIntensity(t.defaultIntensity);
  };

  // ─── HOME TAB ───
  const renderHomeTab = () => (
    <div className="space-y-5 pb-24">
      {/* Character Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-3xl">
            ◈
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{data.player.handle}</h1>
            <p className="text-sm text-slate-400">
              {data.player.archetype} · {data.player.currentTitle} · Level {data.player.level}
            </p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>XP to Level {data.player.level + 1}</span>
            <span>
              {data.player.xp} / {data.player.xpToNextLevel}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <MiniStat label="Momentum" value={data.player.momentum} />
          <MiniStat label="Multiplier" value={`${data.currentMultiplier.toFixed(1)}×`} />
          <MiniStat label="Streak" value={`${data.player.focusStreakDays}d`} />
          <MiniStat label="Energy" value={`${data.player.energy}%`} />
        </div>
      </div>

      {/* Quick Timer */}
      <div className="rounded-3xl border border-cyan-300/20 bg-[#07111F] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/70">Focus Timer</p>
            <p className="mt-1 text-3xl font-mono font-bold text-white">{formatTime(timerSeconds)}</p>
          </div>
          <div className="flex gap-2">
            {!timerRunning ? (
              <button
                onClick={() => setTimerRunning(true)}
                className="rounded-xl bg-cyan-300/20 px-4 py-2 text-sm font-bold text-cyan-200 border border-cyan-300/30"
              >
                Start
              </button>
            ) : (
              <button
                onClick={() => setTimerRunning(false)}
                className="rounded-xl bg-amber-300/20 px-4 py-2 text-sm font-bold text-amber-200 border border-amber-300/30"
              >
                Pause
              </button>
            )}
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(timerPreset * 60);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {[25, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => {
                setTimerPreset(m);
                setTimerSeconds(m * 60);
                setTimerRunning(false);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                timerPreset === m
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Big Log Button */}
      <button
        onClick={() => setTab("log")}
        className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 py-4 text-base font-bold text-white shadow-lg shadow-cyan-950/40 active:scale-[0.98] transition"
      >
        ⚡ Log a Growth Action
      </button>

      {/* Active Quests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Active Quests</h2>
          <button onClick={() => setTab("quests")} className="text-xs text-cyan-300">
            See all →
          </button>
        </div>
        <div className="space-y-2.5">
          {activeQuests.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No active quests. Create one in the Quests tab.</p>
          )}
          {activeQuests.slice(0, 3).map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            return (
              <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-white">{q.title}</p>
                  <span className="text-[0.65rem] text-emerald-300 bg-emerald-300/10 px-2 py-0.5 rounded-full">+{q.rewardXp} XP</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[0.7rem] text-slate-400">
                  {q.progress} / {q.target} ({pct}%) · {q.domain}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent</h2>
        <div className="space-y-2">
          {data.events.slice(0, 4).map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-200 truncate">{e.title}</p>
                <p className="text-[0.7rem] text-slate-500">
                  {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                +{e.xpAwarded}
              </span>
            </div>
          ))}
          {data.events.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No activity yet. Log your first action above.</p>}
        </div>
      </div>

      {/* World Map */}
      <WorldMap attributes={data.attributes} />

      {/* Streak Calendar */}
      <StreakCalendar events={data.events} />

      {/* Dormant Warning */}
      {data.dormant && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-100">Character Dormant</p>
          <p className="mt-1 text-xs text-amber-100/70">
            7+ days inactive. XP is halved. Log an action with a 50+ word note to reawaken.
          </p>
        </div>
      )}
    </div>
  );

  // ─── LOG TAB ───
  const renderLogTab = () => (
    <div className="space-y-5 pb-24">
      <h2 className="text-2xl font-bold text-white">Log Action</h2>

      {/* Activity Type */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">Type</p>
        <div className="grid grid-cols-2 gap-2">
          {data.activityDefinitions.map((def) => (
            <button
              key={def.type}
              onClick={() => setLogType(def.type)}
              className={`rounded-2xl border p-3 text-left transition ${
                logType === def.type
                  ? "border-cyan-300/40 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p className={`text-sm font-semibold ${logType === def.type ? "text-cyan-200" : "text-white"}`}>
                {def.label}
              </p>
              <p className="text-[0.7rem] text-slate-400 mt-0.5">{def.skill}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Templates */}
      {data.templates.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">Templates</p>
          <div className="flex flex-wrap gap-2">
            {data.templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-300/40"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form action={async (formData: FormData) => {
        if (!navigator.onLine) {
          const payload = Object.fromEntries(formData.entries());
          await pushToSyncQueue("logActivity", payload);
          toast.success("Saved offline. XP will update when back online.");
          setLogTitle("");
          setLogMinutes(45);
          setLogNote("");
          setLogType("deep-work");
          return;
        }
        await logActivityAction(formData);
        setLogTitle("");
        setLogMinutes(45);
        setLogNote("");
      }} className="space-y-4">
        <input type="hidden" name="type" value={logType} />

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1.5">What did you do?</p>
          <input
            name="title"
            required
            value={logTitle}
            onChange={(e) => setLogTitle(e.target.value)}
            placeholder="e.g. Built onboarding flow"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1.5">Minutes</p>
            <input
              name="minutes"
              type="number"
              min="5"
              max="720"
              value={logMinutes}
              onChange={(e) => setLogMinutes(Number(e.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1.5">Intensity (1-5)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLogIntensity(i)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                    i <= logIntensity
                      ? "bg-fuchsia-300/20 text-fuchsia-200 border border-fuchsia-300/40"
                      : "bg-white/5 text-slate-500 border border-white/10"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <input type="hidden" name="intensity" value={logIntensity} />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Note</p>
            {data.dormant && <p className="text-[0.7rem] text-amber-300">50+ words to reawaken</p>}
          </div>
          <textarea
            name="note"
            rows={3}
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            placeholder="What did you learn or overcome?"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition"
        >
          Log Action · Earn XP
        </button>
      </form>
    </div>
  );

  
  // ─── FITNESS TAB ───
  const renderFitnessTab = () => (
    <ActiveWorkout exercises={data.exercises} />
  );

  // ─── CODEX TAB ───
  const renderCodexTab = () => (
    <div className="space-y-5 pb-24">
      <h2 className="text-2xl font-bold text-white">Codex</h2>

      {/* Codex Sub-tabs */}
      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        {(["skills", "attributes", "books", "projects"] as CodexTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setCodexTab(t)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition ${
              codexTab === t
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {codexTab === "skills" && (
        <div className="space-y-3">
          <form action={withToast(createSkillAction, "Creating skill...", "Skill created!")} className="flex gap-2">
            <input name="name" required placeholder="New skill name" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
            <select name="domain" className="rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none">
              {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <SubmitButton className="rounded-xl bg-fuchsia-300/20 px-4 py-2 text-sm font-bold text-fuchsia-200">+</SubmitButton>
          </form>

          {data.skills.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No skills yet. Add your first above.</p>}
          {data.skills.map((s) => (
            <div key={s.id} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="absolute right-3 top-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <button type="button" onClick={() => setEditingSkillId(editingSkillId === s.id ? null : s.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                <form action={withToast(removeSkillAction, "Removing skill...", "Skill removed!")}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                </form>
              </div>
              <div className="flex justify-between pr-12">
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-[0.7rem] text-slate-500 uppercase tracking-wider">{s.domain}</p>
                </div>
                <span className="rounded-full bg-fuchsia-300/10 px-2.5 py-1 text-xs font-bold text-fuchsia-200">Lv {s.level}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${Math.min(100, (s.xp % 1000) / 10)}%` }} />
              </div>
              <p className="mt-1 text-[0.7rem] text-slate-400">{s.masteryTier} · {s.xp} XP</p>
              {editingSkillId === s.id && (
                <form action={withToast(updateSkillAction, "Updating skill...", "Skill updated!")} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="name" defaultValue={s.name} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <div className="flex gap-2">
                    <select name="domain" defaultValue={s.domain} className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none">
                      {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <SubmitButton className="rounded-lg bg-fuchsia-300/20 px-3 py-1.5 text-xs font-bold text-fuchsia-200">save</SubmitButton>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {codexTab === "attributes" && (
        <div className="grid grid-cols-2 gap-3">
          {data.attributes.map((a) => (
            <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">{a.label}</p>
              <p className="text-2xl font-bold text-cyan-200 mt-1">{a.score}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, a.score * 8)}%` }} />
              </div>
              <p className="mt-1.5 text-[0.7rem] text-slate-400">{a.xp} XP</p>
            </div>
          ))}
        </div>
      )}

      {codexTab === "books" && (
        <div className="space-y-3">
          <form action={withToast(createBookAction, "Adding book...", "Book added!")} className="space-y-2">
            <input name="title" required placeholder="Book title" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
            <div className="flex gap-2">
              <input name="author" placeholder="Author" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
              <input name="totalPages" type="number" defaultValue={250} className="w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" />
              <SubmitButton className="rounded-xl bg-amber-300/20 px-4 py-2 text-sm font-bold text-amber-200">+</SubmitButton>
            </div>
          </form>

          {data.books.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No books. Add one above.</p>}
          {data.books.map((b) => {
            const pct = Math.min(100, Math.round((b.pagesRead / b.totalPages) * 100));
            return (
              <div key={b.id} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="absolute right-3 top-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                  <button type="button" onClick={() => setEditingBookId(editingBookId === b.id ? null : b.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                  <form action={withToast(removeBookAction, "Removing book...", "Book removed!")}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                  </form>
                </div>
                <p className="font-medium text-white pr-12">{b.title}</p>
                {b.author && <p className="text-xs text-slate-400">by {b.author}</p>}
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[0.7rem] text-slate-400">{b.pagesRead}/{b.totalPages} ({pct}%)</p>
                  <form action={withToast(updateBookProgressAction, "Updating progress...", "Progress updated!")}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="pagesRead" value="15" />
                    <button className="rounded-lg bg-amber-300/15 border border-amber-300/30 px-2.5 py-1 text-[0.7rem] font-bold text-amber-200">+15p</button>
                  </form>
                </div>
                {editingBookId === b.id && (
                  <form action={withToast(updateBookAction, "Updating book...", "Book updated!")} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input name="title" defaultValue={b.title} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <div className="flex gap-2">
                      <input name="author" defaultValue={b.author} className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                      <input name="totalPages" type="number" defaultValue={b.totalPages} className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                      <SubmitButton className="rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs font-bold text-amber-200">save</SubmitButton>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {codexTab === "projects" && (
        <div className="space-y-3">
          <form action={withToast(createProjectAction, "Creating project...", "Project created!")} className="space-y-2">
            <input name="title" required placeholder="Project name" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
            <div className="flex gap-2">
              <input name="description" placeholder="Description" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
              <SubmitButton className="rounded-xl bg-purple-300/20 px-4 py-2 text-sm font-bold text-purple-200">+</SubmitButton>
            </div>
          </form>

          {data.projects.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No projects. Add one above.</p>}
          {data.projects.map((p) => (
            <div key={p.id} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="absolute right-3 top-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <button type="button" onClick={() => setEditingProjectId(editingProjectId === p.id ? null : p.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                <form action={withToast(removeProjectAction, "Removing project...", "Project removed!")}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                </form>
              </div>
              <p className="font-medium text-white pr-12">{p.title}</p>
              {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
              <p className="mt-1 text-[0.7rem] text-slate-500">{p.domain}</p>
              {editingProjectId === p.id && (
                <form action={withToast(updateProjectAction, "Updating project...", "Project updated!")} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="title" defaultValue={p.title} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <div className="flex gap-2">
                    <input name="description" defaultValue={p.description} className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <select name="domain" defaultValue={p.domain} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none">
                      {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <SubmitButton className="rounded-lg bg-purple-300/20 px-3 py-1.5 text-xs font-bold text-purple-200">save</SubmitButton>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── QUESTS TAB ───
  const renderQuestsTab = () => (
    <div className="space-y-5 pb-24">
      <h2 className="text-2xl font-bold text-white">Quests</h2>

      {/* Filter */}
      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        <button
          onClick={() => setQuestFilter("active")}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition ${
            questFilter === "active" ? "bg-white/10 text-white" : "text-slate-400"
          }`}
        >
          Active ({activeQuests.length})
        </button>
        <button
          onClick={() => setQuestFilter("completed")}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition ${
            questFilter === "completed" ? "bg-white/10 text-white" : "text-slate-400"
          }`}
        >
          Done ({completedQuests.length})
        </button>
      </div>

      {/* Create Quest */}
      <form action={withToast(createQuestAction, "Creating quest...", "Quest created!")} className="space-y-2">
        <input name="title" required placeholder="New quest title" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
        <div className="flex gap-2">
          <select name="domain" className="rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none">
            {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input name="target" type="number" defaultValue={10} className="w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" />
          <input name="rewardXp" type="number" defaultValue={300} className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" />
          <SubmitButton className="rounded-xl bg-emerald-300/20 px-4 py-2 text-sm font-bold text-emerald-200">+</SubmitButton>
        </div>
      </form>

      {/* Quest List */}
      <div className="space-y-2.5">
        {(questFilter === "active" ? activeQuests : completedQuests).map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <div key={q.id} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              {!q.isSystem && (
                <div className="absolute right-3 top-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                  <button type="button" onClick={() => setEditingQuestId(editingQuestId === q.id ? null : q.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                  <form action={withToast(removeQuestAction, "Removing quest...", "Quest removed!")}>
                    <input type="hidden" name="id" value={q.id} />
                    <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                  </form>
                </div>
              )}
              <div className="flex justify-between pr-10">
                <p className="font-medium text-white">{q.title}</p>
                <span className={`text-[0.7rem] px-2 py-0.5 rounded-full ${q.status === "complete" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-300"}`}>
                  {q.status}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[0.7rem] text-slate-400">
                {q.progress}/{q.target} ({pct}%) · {q.domain} · +{q.rewardXp} XP
              </p>
              {editingQuestId === q.id && (
                <form action={withToast(updateQuestAction, "Updating quest...", "Quest updated!")} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  <input type="hidden" name="id" value={q.id} />
                  <input name="title" defaultValue={q.title} required className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <div className="flex gap-2">
                    <select name="domain" defaultValue={q.domain} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none">
                      {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input name="target" type="number" defaultValue={q.target} className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <input name="rewardXp" type="number" defaultValue={q.rewardXp} className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <SubmitButton className="rounded-lg bg-emerald-300/20 px-3 py-1.5 text-xs font-bold text-emerald-200">save</SubmitButton>
                  </div>
                </form>
              )}
            </div>
          );
        })}
        {(questFilter === "active" ? activeQuests : completedQuests).length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No {questFilter} quests.</p>
        )}
      </div>
    </div>
  );

  

  // ─── CHRONICLE TAB ───
  const renderChronicleTab = () => {
    const filtered = data.events.filter(
      (e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-5 pb-24">
        <h2 className="text-2xl font-bold text-white">Chronicle</h2>
        <input
          type="text"
          placeholder="Search activity..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-300/50"
        />
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="absolute right-3 top-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <button type="button" onClick={() => setEditingEventId(editingEventId === e.id ? null : e.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                <form action={withToast(deleteActivityAction, "Deleting activity...", "Activity deleted!")}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                </form>
              </div>
              <div className="min-w-0 pr-16">
                <p className="text-sm font-semibold text-slate-200">{e.title}</p>
                <p className="text-[0.75rem] text-slate-500 uppercase tracking-widest mt-1">
                  {e.type} · {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="absolute right-4 bottom-4 shrink-0 rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                +{e.xpAwarded}
              </span>
              {editingEventId === e.id && (
                <form action={withToast(updateActivityAction, "Updating activity...", "Activity updated!")} className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="title" defaultValue={e.title} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <SubmitButton className="rounded-lg bg-cyan-300/20 px-3 py-1.5 text-xs font-bold text-cyan-200">Save</SubmitButton>
                </form>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No matching events.</p>
          )}
        </div>
      </div>
    );
  };

  // ─── PROFILE TAB ───
  const renderProfileTab = () => (
    <div className="space-y-5 pb-24">
      <h2 className="text-2xl font-bold text-white">Profile</h2>

      {/* Character Summary */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-2xl">◈</div>
          <div>
            <p className="text-lg font-bold text-white">{data.player.handle}</p>
            <p className="text-sm text-slate-400">Lv {data.player.level} · {data.player.archetype}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/30 p-3 text-center">
            <p className="text-2xl font-bold text-white">{data.analytics.totalSkillXp.toLocaleString()}</p>
            <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider">Skill XP</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3 text-center">
            <p className="text-2xl font-bold text-white">{data.analytics.completedQuests}</p>
            <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider">Quests Done</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3 text-center">
            <p className="text-2xl font-bold text-white">{data.player.streakBest}d</p>
            <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider">Best Streak</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3 text-center">
            <p className="text-2xl font-bold text-white">{data.events.length}</p>
            <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider">Total Logs</p>
          </div>
        </div>
      </div>

      {/* Templates Manager */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Templates</h3>
        <form action={withToast(createTemplateAction, "Creating template...", "Template created!")} className="flex gap-2 mb-3">
          <input name="name" required placeholder="Template name" className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none" />
          <select name="type" className="rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none">
            {data.activityDefinitions.map((d) => (
              <option key={d.type} value={d.type}>{d.label}</option>
            ))}
          </select>
          <input name="defaultMinutes" type="number" defaultValue={30} className="w-16 rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none" />
          <SubmitButton className="rounded-xl bg-cyan-300/20 px-3 py-2 text-sm font-bold text-cyan-200">+</SubmitButton>
        </form>
        <div className="space-y-2">
          {data.templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-[0.7rem] text-slate-400">{t.type} · {t.defaultMinutes}m · {t.uses}× used</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingTemplateId(editingTemplateId === t.id ? null : t.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                  <form action={withToast(removeTemplateAction, "Removing template...", "Template removed!")}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                  </form>
                </div>
              </div>
              {editingTemplateId === t.id && (
                <form action={withToast(updateTemplateAction, "Updating template...", "Template updated!")} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="name" defaultValue={t.name} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <div className="flex gap-2">
                    <select name="type" defaultValue={t.type} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none">
                      {data.activityDefinitions.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
                    </select>
                    <input name="defaultMinutes" type="number" defaultValue={t.defaultMinutes} className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <SubmitButton className="rounded-lg bg-cyan-300/20 px-3 py-1.5 text-xs font-bold text-cyan-200">save</SubmitButton>
                  </div>
                </form>
              )}
            </div>
          ))}
          {data.templates.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No templates yet.</p>}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Achievements</h3>
        <div className="space-y-2">
          {data.achievements.map((a) => {
            const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
            return (
              <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <span className={`text-[0.7rem] ${a.progress >= a.target ? "text-emerald-300" : "text-slate-400"}`}>
                    {a.progress >= a.target ? "Unlocked" : `${pct}%`}
                  </span>
                </div>
                <p className="mt-1 text-[0.7rem] text-slate-400">{a.description}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings & Profile */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Profile</h3>
          <form action={withToast(updateProfileAction, "Saving profile...", "Profile saved!")} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div>
              <label className="text-[0.7rem] font-medium text-slate-400">Handle</label>
              <input type="text" name="handle" defaultValue={data.player.handle} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" required />
            </div>
            <div>
              <label className="text-[0.7rem] font-medium text-slate-400">Archetype</label>
              <input type="text" name="archetype" defaultValue={data.player.archetype} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" required />
            </div>
            <SubmitButton className="w-full rounded-xl bg-cyan-300/20 px-3 py-2 text-sm font-bold text-cyan-200">Save profile</SubmitButton>
          </form>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-2">System Settings</h3>
        <form action={withToast(updateSettingsAction, "Saving settings...", "Settings saved!")} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Hardcore mode</p>
              <p className="text-[0.7rem] text-slate-400">Dormancy penalties become harsher.</p>
            </div>
            <input type="checkbox" name="hardcoreMode" defaultChecked={Boolean(data.settings?.hardcoreMode)} className="h-4 w-4 rounded border-white/10 bg-black/40" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Notifications</p>
              <p className="text-[0.7rem] text-slate-400">Enable reminders and nudges.</p>
            </div>
            <input type="checkbox" name="notificationsEnabled" defaultChecked={Boolean(data.settings?.notificationsEnabled)} className="h-4 w-4 rounded border-white/10 bg-black/40" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Auto backup</p>
              <p className="text-[0.7rem] text-slate-400">Keep your JSON backup workflow enabled.</p>
            </div>
            <input type="checkbox" name="autoBackup" defaultChecked={Boolean(data.settings?.autoBackup)} className="h-4 w-4 rounded border-white/10 bg-black/40" />
          </div>
          <select name="theme" defaultValue={data.settings?.theme ?? "dark"} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <SubmitButton className="w-full rounded-xl bg-cyan-300/20 px-3 py-2 text-sm font-bold text-cyan-200">Save settings</SubmitButton>
        </form>
        </div>
      </div>

      {/* Journal */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Journal</h3>
        <div className="space-y-2">
          {data.journals.slice(0, 5).map((j) => (
            <div key={j.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex justify-between">
                <span className="text-[0.7rem] text-amber-300">{j.mood}</span>
                <span className="text-[0.7rem] text-slate-500">
                  {new Date(j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 line-clamp-3">{j.content}</p>
            </div>
          ))}
          {data.journals.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Log 80+ words in a note to create journal entries.</p>}
        </div>
      </div>

      {/* Backup */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Backup & Restore</h3>
        {backupStatus && (
          <p className="text-xs text-cyan-300 mb-2">{backupStatus}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 rounded-xl bg-emerald-300/15 border border-emerald-300/30 py-3 text-sm font-bold text-emerald-200"
          >
            Export JSON
          </button>
        </div>
        <form action={handleImport} className="mt-2">
          <textarea
            name="backupJson"
            rows={3}
            placeholder="Paste backup JSON here..."
            className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 outline-none"
          />
          <SubmitButton className="mt-2 w-full rounded-xl border border-emerald-300/30 bg-emerald-400/10 py-2 text-sm font-bold text-emerald-200">
            Restore from JSON
          </SubmitButton>
        </form>
      </div>
    </div>
  );

  // ─── BOTTOM NAV ───
  const navItems: { key: Tab; label: string; icon: string }[] = [
    { key: "home", label: "Home", icon: "◈" },
    { key: "log", label: "Log", icon: "⚡" },
    { key: "fitness", label: "Train", icon: "💪" },
    { key: "codex", label: "Codex", icon: "◉" },
    { key: "quests", label: "Quests", icon: "◆" },
    { key: "profile", label: "Profile", icon: "◎" },
    { key: "chronicle", label: "History", icon: "◷" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-1 px-4 pt-5 pb-4">
        {tab === "home" && renderHomeTab()}
        {tab === "log" && renderLogTab()}
        {tab === "fitness" && renderFitnessTab()}
        {tab === "codex" && renderCodexTab()}
        {tab === "quests" && renderQuestsTab()}
        {tab === "profile" && renderProfileTab()}
        {tab === "chronicle" && renderChronicleTab()}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-50 border-t border-white/10 bg-[#070A12]/90 backdrop-blur-xl px-2 pb-safe">
        <div className="flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-1 flex-col items-center py-3 transition ${
                tab === item.key ? "text-cyan-300" : "text-slate-500"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[0.65rem] font-medium mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-black/30 p-2.5 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[0.6rem] uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
