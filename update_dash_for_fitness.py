import re

with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace(
    'import { StreakCalendar } from "./streak-calendar";',
    'import { StreakCalendar } from "./streak-calendar";\nimport { ActiveWorkout, type Exercise } from "./active-workout";'
)

# Update DashboardData
content = content.replace(
    '  templates: { id: string; name: string; type: string; title: string; minutes: number; intensity: number }[];\n}',
    '  templates: { id: string; name: string; type: string; title: string; minutes: number; intensity: number }[];\n  exercises: Exercise[];\n}'
)

# Update Tab type
content = content.replace(
    'type Tab = "home" | "log" | "codex" | "quests" | "profile" | "chronicle";',
    'type Tab = "home" | "log" | "fitness" | "codex" | "quests" | "profile" | "chronicle";'
)

# Update navItems
content = content.replace(
    '{ key: "log", label: "Log", icon: "⚡" },',
    '{ key: "log", label: "Log", icon: "⚡" },\n    { key: "fitness", label: "Train", icon: "💪" },'
)

# Add renderFitnessTab()
fitness_tab = """
  // ─── FITNESS TAB ───
  const renderFitnessTab = () => (
    <ActiveWorkout exercises={data.exercises} />
  );
"""
content = content.replace(
    '// ─── CODEX TAB ───',
    fitness_tab + '\n  // ─── CODEX TAB ───'
)

# Add to main switch
content = content.replace(
    '{tab === "log" && renderLogTab()}',
    '{tab === "log" && renderLogTab()}\n        {tab === "fitness" && renderFitnessTab()}'
)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)

