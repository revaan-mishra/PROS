with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

onboarding_component = """
function OnboardingWizard({ handle, onComplete }: { handle: string; onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to PROS",
      desc: `Operator ${handle}, your Personal RPG Operating System is online.`,
      action: "Initialize"
    },
    {
      title: "The Rules Engine",
      desc: "Every action you take in the real world—learning, working out, deep work—will now grant you XP in one of 6 core Domains.",
      action: "Understood"
    },
    {
      title: "Your First Quest",
      desc: "Go to the Log tab to record your first real-world action. Your stats will begin to calibrate.",
      action: "Begin Journey"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/90 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-3xl border border-cyan-500/30 bg-black p-8 text-center shadow-2xl shadow-cyan-900/20">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/10 text-3xl">
          {step === 0 ? "◈" : step === 1 ? "⚙" : "◆"}
        </div>
        <h2 className="mb-3 text-2xl font-bold text-white">{steps[step].title}</h2>
        <p className="mb-8 text-sm text-slate-400 leading-relaxed">
          {steps[step].desc}
        </p>
        <button
          onClick={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else onComplete();
          }}
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-cyan-300"
        >
          {steps[step].action}
        </button>
      </div>
    </div>
  );
}
"""

# Insert Onboarding component before ProsDashboard
content = content.replace(
    'export default function ProsDashboard({ data }: { data: DashboardData }) {',
    onboarding_component + '\nexport default function ProsDashboard({ data }: { data: DashboardData }) {'
)

# Add state inside ProsDashboard
content = content.replace(
    '  const [editingEventId, setEditingEventId] = useState<string | null>(null);',
    '  const [editingEventId, setEditingEventId] = useState<string | null>(null);\n  const [showOnboarding, setShowOnboarding] = useState(data.player.level === 1 && data.events.length === 0);'
)

# Add <OnboardingWizard /> at the start of return
render_return = """
  return (
    <div className="min-h-screen bg-[#070A12] text-slate-200">
      {showOnboarding && <OnboardingWizard handle={data.player.handle} onComplete={() => setShowOnboarding(false)} />}
"""
content = content.replace(
    '  return (\n    <div className="min-h-screen bg-[#070A12] text-slate-200">',
    render_return
)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)
