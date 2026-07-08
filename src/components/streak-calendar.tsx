"use client";

import { useMemo } from "react";

interface StreakCalendarProps {
  events: Array<{ createdAt: string | Date }>;
}

export function StreakCalendar({ events }: StreakCalendarProps) {
  // Generate a map of YYYY-MM-DD -> count
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(e => {
      const date = new Date(e.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [events]);

  // Generate the last 12 weeks of days (84 days)
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysArray = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      daysArray.push({
        date: d,
        key,
        count: activityMap.get(key) || 0
      });
    }
    return daysArray;
  }, [activityMap]);

  // Determine color based on count
  const getColor = (count: number) => {
    if (count === 0) return "bg-white/5 border border-white/5";
    if (count === 1) return "bg-cyan-900/40 border border-cyan-800";
    if (count === 2) return "bg-cyan-700/60 border border-cyan-600";
    if (count === 3) return "bg-cyan-500 border border-cyan-400";
    return "bg-cyan-300 border border-cyan-200 shadow-[0_0_8px_rgba(103,232,249,0.5)]";
  };

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Momentum Matrix</h3>
          <p className="text-[0.65rem] text-slate-400 mt-1">Consistency compounds.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-300">{events.length}</p>
          <p className="text-[0.6rem] text-slate-400 uppercase tracking-widest">Total Actions</p>
        </div>
      </div>

      {/* Grid: 7 rows (Sun-Sat), 12 cols (weeks) */}
      <div className="grid grid-cols-[repeat(12,1fr)] grid-rows-7 gap-1.5 overflow-x-auto pb-2">
        {days.map((day, i) => (
          <div
            key={day.key}
            className={`w-full aspect-square rounded-sm transition-all hover:scale-125 hover:z-10 cursor-crosshair ${getColor(day.count)}`}
            title={`${day.key}: ${day.count} actions`}
            style={{ 
              gridRow: day.date.getDay() + 1,
              gridColumn: Math.floor(i / 7) + 1
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[0.65rem] text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-white/5" />
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-900/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-700/60" />
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-300 shadow-[0_0_4px_rgba(103,232,249,0.5)]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
