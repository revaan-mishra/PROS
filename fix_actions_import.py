import re

with open('src/app/actions.ts', 'r') as f:
    content = f.read()

# Replace the import from "@/lib/pros/data" to include saveWorkoutSession
old_import_regex = r'import\s*\{([^\}]*)\}\s*from\s*"@/lib/pros/data";'

match = re.search(old_import_regex, content)
if match:
    imports = match.group(1)
    if 'saveWorkoutSession' not in imports:
        new_imports = imports + ', saveWorkoutSession'
        content = content.replace(match.group(0), f'import {{{new_imports}}} from "@/lib/pros/data";')

with open('src/app/actions.ts', 'w') as f:
    f.write(content)

