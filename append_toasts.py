with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

# Import toast
content = content.replace(
    'import { useState } from "react";',
    'import { useState, useEffect, useRef } from "react";\nimport { toast } from "sonner";'
)

# Add useEffect for achievements inside ProsDashboard
effect_code = """
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
"""

content = content.replace(
    '  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);',
    '  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);\n' + effect_code
)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)
