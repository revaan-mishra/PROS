with open('src/app/actions.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'export async function saveWorkoutSessionAction(formData: FormData) {\n  await runAndRevalidate(() => saveWorkoutSession(formData));\n}',
    'export async function saveWorkoutSessionAction(payload: any) {\n  await runAndRevalidate(() => saveWorkoutSession(payload));\n}'
)

with open('src/app/actions.ts', 'w') as f:
    f.write(content)
