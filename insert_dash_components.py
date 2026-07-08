with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { WorldMap } from "./world-map";\nimport { StreakCalendar } from "./streak-calendar";'
)

# Insert components after Character Card
old_card = """      </div>

      {/* Dormant Warning */}"""

new_card = """      </div>

      {/* World Map */}
      <WorldMap attributes={data.attributes} />

      {/* Streak Calendar */}
      <StreakCalendar events={data.events} />

      {/* Dormant Warning */}"""

content = content.replace(old_card, new_card)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)
