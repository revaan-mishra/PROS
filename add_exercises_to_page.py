with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Add exercises import
content = content.replace(
    'import { db } from "@/db";',
    'import { db } from "@/db";\nimport { exercises } from "@/db/schema";'
)

# Fetch exercises
fetch_code = """
  const exercisesData = await db.select().from(exercises).orderBy(exercises.name);

  // Group the data so it fits DashboardData
"""

content = content.replace(
    '  // Gather player and events',
    fetch_code + '  // Gather player and events'
)

# Pass exercises to client
content = content.replace(
    '    templates: templateRows,\n  };',
    '    templates: templateRows,\n    exercises: exercisesData,\n  };'
)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
