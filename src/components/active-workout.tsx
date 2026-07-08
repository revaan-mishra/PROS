"use client";

import { useState } from "react";
import { saveWorkoutSessionAction } from "@/app/actions";
import { pushToSyncQueue } from "@/lib/offline/db";
import { toast } from "sonner";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface ActiveWorkoutProps {
  exercises: Exercise[];
}

interface WorkoutSet {
  id: string; // temp client id
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
}

export function ActiveWorkout({ exercises }: ActiveWorkoutProps) {
  const [active, setActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState("All");
  
  // Selected exercises for this session to group sets
  const [sessionExercises, setSessionExercises] = useState<Exercise[]>([]);

  if (!active) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-900/10 p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Ready to train?</h2>
          <p className="text-sm text-slate-400 mb-6">Log your sets, reps, and weight. Earn Body XP based on total volume.</p>
          <button 
            onClick={() => { setActive(true); setStartTime(new Date()); }}
            className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-cyan-300 w-full"
          >
            Start Empty Workout
          </button>
        </div>
      </div>
    );
  }

  const handleAddExercise = (ex: Exercise) => {
    if (!sessionExercises.find(e => e.id === ex.id)) {
      setSessionExercises([...sessionExercises, ex]);
      // Add first empty set
      setSets([...sets, {
        id: crypto.randomUUID(),
        exerciseId: ex.id,
        setNumber: 1,
        reps: 0,
        weight: 0,
      }]);
    }
    setShowAddExercise(false);
  };

  const handleAddSet = (exerciseId: string) => {
    const exSets = sets.filter(s => s.exerciseId === exerciseId);
    const lastSet = exSets[exSets.length - 1];
    setSets([...sets, {
      id: crypto.randomUUID(),
      exerciseId,
      setNumber: exSets.length + 1,
      reps: lastSet ? lastSet.reps : 0,
      weight: lastSet ? lastSet.weight : 0,
    }]);
  };

  const handleUpdateSet = (id: string, field: "reps" | "weight", value: number) => {
    setSets(sets.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const handleFinish = async () => {
    const validSets = sets.filter(s => s.reps > 0);
    if (validSets.length === 0) {
      toast.error("Please log at least one set with reps > 0.");
      return;
    }

    const durationMinutes = Math.max(1, Math.round((new Date().getTime() - startTime!.getTime()) / 60000));
    
    const payload = {
      durationMinutes,
      notes,
      sets: validSets.map(s => ({
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight
      }))
    };

    try {
      if (!navigator.onLine) {
        await pushToSyncQueue("saveWorkoutSession", payload);
        toast.success("Workout Saved Offline!", { description: `Logged ${validSets.length} sets. XP will update upon sync.` });
      } else {
        await saveWorkoutSessionAction(payload);
        toast.success("Workout Complete!", { description: `Logged ${validSets.length} sets. Body XP awarded!` });
      }
      
      setActive(false);
      setSets([]);
      setSessionExercises([]);
      setNotes("");
    } catch (e: any) {
      toast.error("Failed to save workout", { description: e.message });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Active Workout</h2>
          <p className="text-xs text-slate-400 mt-1">Duration: {Math.max(1, Math.round((new Date().getTime() - startTime!.getTime()) / 60000))} min</p>
        </div>
        <button onClick={handleFinish} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/30">
          Finish
        </button>
      </div>

      <textarea 
        placeholder="Workout notes..." 
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-300/50 min-h-[80px]"
      />

      {sessionExercises.map((ex) => {
        const exSets = sets.filter(s => s.exerciseId === ex.id);
        return (
          <div key={ex.id} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
              <h3 className="text-sm font-bold text-cyan-200">{ex.name}</h3>
              <p className="text-[0.65rem] text-slate-400 uppercase tracking-widest">{ex.muscleGroup}</p>
            </div>
            
            <div className="p-2 space-y-1">
              <div className="grid grid-cols-[30px_1fr_1fr] gap-2 px-2 py-1 text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest text-center">
                <div>Set</div>
                <div>Kgs</div>
                <div>Reps</div>
              </div>
              
              {exSets.map((s, idx) => (
                <div key={s.id} className="grid grid-cols-[30px_1fr_1fr] gap-2 items-center text-sm">
                  <div className="text-center font-bold text-slate-400 bg-black/30 rounded-lg py-1">{idx + 1}</div>
                  <input 
                    type="number" 
                    value={s.weight || ""} 
                    onChange={e => handleUpdateSet(s.id, "weight", Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white outline-none focus:border-cyan-500/50"
                  />
                  <input 
                    type="number" 
                    value={s.reps || ""} 
                    onChange={e => handleUpdateSet(s.id, "reps", Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white outline-none focus:border-cyan-500/50"
                  />
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleAddSet(ex.id)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition border-t border-white/5"
            >
              + Add Set
            </button>
          </div>
        );
      })}

      {!showAddExercise ? (
        <button 
          onClick={() => setShowAddExercise(true)}
          className="w-full rounded-2xl border border-dashed border-white/20 py-4 text-sm font-bold text-cyan-400/70 hover:bg-white/5 transition"
        >
          + Add Exercise
        </button>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white">Select Exercise</h3>
            <button onClick={() => setShowAddExercise(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
            {["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].map((g) => (
              <button
                key={g}
                onClick={() => setExerciseFilter(g)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${exerciseFilter === g ? "bg-cyan-400 text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
            {exercises.filter(ex => exerciseFilter === "All" || ex.muscleGroup === exerciseFilter).map((ex) => (
              <button 
                key={ex.id}
                onClick={() => handleAddExercise(ex)}
                className="w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
              >
                <span className="text-sm text-slate-200">{ex.name}</span>
                <span className="text-[0.65rem] text-slate-500 uppercase tracking-widest">{ex.muscleGroup}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
