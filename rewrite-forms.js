const fs = require('fs');

let content = fs.readFileSync('src/components/pros-dashboard.tsx', 'utf8');

// 1. Add SubmitButton import if not there
if (!content.includes('import { SubmitButton }')) {
  content = content.replace(
    'import { WorldMap }',
    'import { SubmitButton } from "./submit-button";\nimport { WorldMap }'
  );
}

// 2. Add withToast helper inside ProsDashboard
const withToastHelper = `
  const withToast = (actionFn: (fd: FormData) => Promise<any>, loading: string, success: string) => {
    return async (formData: FormData) => {
      try {
        await toast.promise(actionFn(formData), {
          loading,
          success,
          error: (e: any) => e.message || "Action failed"
        });
      } catch (e) {
        console.error(e);
      }
    };
  };
`;

if (!content.includes('const withToast = ')) {
  content = content.replace(
    /export function ProsDashboard\(\{ data \}: DashboardProps\) \{\n/,
    'export function ProsDashboard({ data }: DashboardProps) {\n' + withToastHelper + '\n'
  );
}

// 3. Replace simple form actions with withToast wrappers
const actionMap = {
  'createSkillAction': { loading: 'Creating skill...', success: 'Skill created!' },
  'removeSkillAction': { loading: 'Removing skill...', success: 'Skill removed!' },
  'updateSkillAction': { loading: 'Updating skill...', success: 'Skill updated!' },
  'createBookAction': { loading: 'Adding book...', success: 'Book added!' },
  'removeBookAction': { loading: 'Removing book...', success: 'Book removed!' },
  'updateBookProgressAction': { loading: 'Updating progress...', success: 'Progress updated!' },
  'updateBookAction': { loading: 'Updating book...', success: 'Book updated!' },
  'createProjectAction': { loading: 'Creating project...', success: 'Project created!' },
  'removeProjectAction': { loading: 'Removing project...', success: 'Project removed!' },
  'updateProjectAction': { loading: 'Updating project...', success: 'Project updated!' },
  'createQuestAction': { loading: 'Creating quest...', success: 'Quest created!' },
  'removeQuestAction': { loading: 'Removing quest...', success: 'Quest removed!' },
  'updateQuestAction': { loading: 'Updating quest...', success: 'Quest updated!' },
  'deleteActivityAction': { loading: 'Deleting activity...', success: 'Activity deleted!' },
  'updateActivityAction': { loading: 'Updating activity...', success: 'Activity updated!' },
  'createTemplateAction': { loading: 'Creating template...', success: 'Template created!' },
  'removeTemplateAction': { loading: 'Removing template...', success: 'Template removed!' },
  'updateTemplateAction': { loading: 'Updating template...', success: 'Template updated!' },
  'updateProfileAction': { loading: 'Saving profile...', success: 'Profile saved!' },
  'updateSettingsAction': { loading: 'Saving settings...', success: 'Settings saved!' }
};

for (const [actionName, msgs] of Object.entries(actionMap)) {
  const regex = new RegExp(`action=\\{${actionName}\\}`, 'g');
  content = content.replace(regex, `action={withToast(${actionName}, "${msgs.loading}", "${msgs.success}")}`);
}

// Replace button type="submit" with SubmitButton
// We'll just replace `<button type="submit"` with `<SubmitButton`
// and `</button>` inside forms? Actually it's safer to just replace it generally.
// Wait, replacing all submit buttons might break styling. Let's look at a few submit buttons.
content = content.replace(/<button type="submit"([^>]*)>([^<]*)<\/button>/g, '<SubmitButton$1>$2</SubmitButton>');

fs.writeFileSync('src/components/pros-dashboard.tsx', content);
console.log('Forms rewritten');
