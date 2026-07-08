import re

with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

# Add chronicle to Tab type
content = content.replace(
    'type Tab = "home" | "log" | "codex" | "quests" | "profile";',
    'type Tab = "home" | "log" | "codex" | "quests" | "profile" | "chronicle";'
)

# Add search query state
state_import = 'const [logIntensity, setLogIntensity] = useState(3);'
new_state = 'const [logIntensity, setLogIntensity] = useState(3);\n  const [searchQuery, setSearchQuery] = useState("");\n  const [editingEventId, setEditingEventId] = useState<string | null>(null);'
content = content.replace(state_import, new_state)

# Add updateActivityAction, deleteActivityAction
content = content.replace(
    'updateProfileAction,',
    'updateProfileAction,\n  updateActivityAction,\n  deleteActivityAction,'
)

# Add nav item
content = content.replace(
    '{ key: "profile", label: "Profile", icon: "◎" },',
    '{ key: "profile", label: "Profile", icon: "◎" },\n    { key: "chronicle", label: "History", icon: "◷" },'
)

# Add renderChronicleTab()
chronicle_tab = """

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
              <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button type="button" onClick={() => setEditingEventId(editingEventId === e.id ? null : e.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                <form action={deleteActivityAction}>
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
                <form action={updateActivityAction} className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="title" defaultValue={e.title} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <button type="submit" className="rounded-lg bg-cyan-300/20 px-3 py-1.5 text-xs font-bold text-cyan-200">Save</button>
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
"""

content = content.replace(
    '// ─── PROFILE TAB ───',
    chronicle_tab + '\n  // ─── PROFILE TAB ───'
)

# Add to main switch
content = content.replace(
    '{tab === "profile" && renderProfileTab()}',
    '{tab === "profile" && renderProfileTab()}\n        {tab === "chronicle" && renderChronicleTab()}'
)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)

print("Done")
