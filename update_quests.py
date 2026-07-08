with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

quest_old = """              {!q.isSystem && (
                <form action={removeQuestAction} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
                  <input type="hidden" name="id" value={q.id} />
                  <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                </form>
              )}"""

quest_new = """              {!q.isSystem && (
                <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button type="button" onClick={() => setEditingQuestId(editingQuestId === q.id ? null : q.id)} className="text-[0.65rem] text-cyan-300">edit</button>
                  <form action={removeQuestAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <button className="text-[0.65rem] text-slate-500 hover:text-red-300">remove</button>
                  </form>
                </div>
              )}"""

content = content.replace(quest_old, quest_new)

quest_info_old = """              <p className="mt-1.5 text-[0.7rem] text-slate-400">
                {q.progress}/{q.target} ({pct}%) · {q.domain} · +{q.rewardXp} XP
              </p>
            </div>"""

quest_info_new = """              <p className="mt-1.5 text-[0.7rem] text-slate-400">
                {q.progress}/{q.target} ({pct}%) · {q.domain} · +{q.rewardXp} XP
              </p>
              {editingQuestId === q.id && (
                <form action={updateQuestAction} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                  <input type="hidden" name="id" value={q.id} />
                  <input name="title" defaultValue={q.title} required className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                  <div className="flex gap-2">
                    <select name="domain" defaultValue={q.domain} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none">
                      {["Execution", "Knowledge", "Body", "Expression", "Mind", "Relationships"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input name="target" type="number" defaultValue={q.target} className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <input name="rewardXp" type="number" defaultValue={q.rewardXp} className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none" />
                    <button type="submit" className="rounded-lg bg-emerald-300/20 px-3 py-1.5 text-xs font-bold text-emerald-200">save</button>
                  </div>
                </form>
              )}
            </div>"""

content = content.replace(quest_info_old, quest_info_new)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)
