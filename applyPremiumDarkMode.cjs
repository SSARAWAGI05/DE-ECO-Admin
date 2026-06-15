const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');

const replacements = [
  // Layout & Backgrounds
  { regex: /\bmin-h-screen bg-slate-50\b(?! dark:bg-slate-950)/g, replace: 'min-h-screen bg-slate-50 dark:bg-slate-950' },
  { regex: /\bbg-white\b(?! dark:bg-slate-900)/g, replace: 'bg-white dark:bg-slate-900' },
  { regex: /\bbg-slate-50\b(?! dark:bg-slate-800\/50)(?! dark:bg-slate-950)/g, replace: 'bg-slate-50 dark:bg-slate-800/50' },
  { regex: /\bbg-slate-100\b(?! dark:bg-slate-800)/g, replace: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /\bbg-slate-900\b(?! dark:bg-white)/g, replace: 'bg-slate-900 dark:bg-white' },

  // Typography
  { regex: /\btext-slate-900\b(?! dark:text-slate-50)/g, replace: 'text-slate-900 dark:text-slate-50' },
  { regex: /\btext-slate-800\b(?! dark:text-slate-200)/g, replace: 'text-slate-800 dark:text-slate-200' },
  { regex: /\btext-slate-700\b(?! dark:text-slate-300)/g, replace: 'text-slate-700 dark:text-slate-300' },
  { regex: /\btext-slate-600\b(?! dark:text-slate-400)/g, replace: 'text-slate-600 dark:text-slate-400' },
  { regex: /\btext-slate-500\b(?! dark:text-slate-400)/g, replace: 'text-slate-500 dark:text-slate-400' },
  { regex: /\btext-white\b(?! dark:text-slate-900)/g, replace: 'text-white dark:text-slate-900' },

  // Borders
  { regex: /\bborder-slate-100\b(?! dark:border-slate-800\/50)/g, replace: 'border-slate-100 dark:border-slate-800/50' },
  { regex: /\bborder-slate-200\b(?! dark:border-slate-800)/g, replace: 'border-slate-200 dark:border-slate-800' },
  { regex: /\bborder-slate-300\b(?! dark:border-slate-700)/g, replace: 'border-slate-300 dark:border-slate-700' },
  { regex: /\bborder-slate-800\b(?! dark:border-slate-700)/g, replace: 'border-slate-800 dark:border-slate-700' },
  { regex: /\bdivide-slate-100\b(?! dark:divide-slate-800)/g, replace: 'divide-slate-100 dark:divide-slate-800' },

  // Hovers
  { regex: /\bhover:bg-slate-50\b(?! dark:hover:bg-slate-800\/50)/g, replace: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
  { regex: /\bhover:bg-slate-100\b(?! dark:hover:bg-slate-800)/g, replace: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
  { regex: /\bhover:bg-slate-200\b(?! dark:hover:bg-slate-700)/g, replace: 'hover:bg-slate-200 dark:hover:bg-slate-700' },
  { regex: /\bhover:bg-slate-800\b(?! dark:hover:bg-slate-200)/g, replace: 'hover:bg-slate-800 dark:hover:bg-slate-200' },

  // Badges & Status
  { regex: /\bbg-emerald-50\b(?! dark:bg-emerald-500\/10)/g, replace: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { regex: /\btext-emerald-700\b(?! dark:text-emerald-400)/g, replace: 'text-emerald-700 dark:text-emerald-400' },
  { regex: /\bborder-emerald-200\b(?! dark:border-emerald-500\/20)/g, replace: 'border-emerald-200 dark:border-emerald-500/20' },

  { regex: /\bbg-rose-50\b(?! dark:bg-rose-500\/10)/g, replace: 'bg-rose-50 dark:bg-rose-500/10' },
  { regex: /\btext-rose-700\b(?! dark:text-rose-400)/g, replace: 'text-rose-700 dark:text-rose-400' },
  { regex: /\bborder-rose-200\b(?! dark:border-rose-500\/20)/g, replace: 'border-rose-200 dark:border-rose-500/20' },

  { regex: /\bbg-blue-50\b(?! dark:bg-blue-500\/10)/g, replace: 'bg-blue-50 dark:bg-blue-500/10' },
  { regex: /\btext-blue-700\b(?! dark:text-blue-400)/g, replace: 'text-blue-700 dark:text-blue-400' },
  { regex: /\bborder-blue-200\b(?! dark:border-blue-500\/20)/g, replace: 'border-blue-200 dark:border-blue-500/20' },

  { regex: /\bbg-amber-50\b(?! dark:bg-amber-500\/10)/g, replace: 'bg-amber-50 dark:bg-amber-500/10' },
  { regex: /\btext-amber-700\b(?! dark:text-amber-400)/g, replace: 'text-amber-700 dark:text-amber-400' },
  { regex: /\bborder-amber-200\b(?! dark:border-amber-500\/20)/g, replace: 'border-amber-200 dark:border-amber-500/20' },

  { regex: /\bbg-indigo-50\b(?! dark:bg-indigo-500\/10)/g, replace: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { regex: /\btext-indigo-700\b(?! dark:text-indigo-400)/g, replace: 'text-indigo-700 dark:text-indigo-400' },
  { regex: /\bborder-indigo-200\b(?! dark:border-indigo-500\/20)/g, replace: 'border-indigo-200 dark:border-indigo-500/20' },

  { regex: /\btext-rose-500\b(?! dark:text-rose-400)/g, replace: 'text-rose-500 dark:text-rose-400' },
  { regex: /\btext-rose-600\b(?! dark:text-rose-400)/g, replace: 'text-rose-600 dark:text-rose-400' },
  { regex: /\btext-emerald-500\b(?! dark:text-emerald-400)/g, replace: 'text-emerald-500 dark:text-emerald-400' },
  { regex: /\btext-emerald-600\b(?! dark:text-emerald-400)/g, replace: 'text-emerald-600 dark:text-emerald-400' },
];

function processDirectory(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Special manual fixes for edge cases:
      // Don't invert text-white to text-slate-900 if it's inside an SVG stroke or something where it doesn't make sense,
      // but usually Tailwind utilities apply to the element. The regex is safe enough.

      replacements.forEach(({ regex, replace }) => {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Applied Premium Dark Mode to ${file}`);
      }
    }
  });
}

processDirectory(directoryPath);

// Also process App.tsx specifically
const appPath = path.join(__dirname, 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
let appModified = false;
replacements.forEach(({ regex, replace }) => {
  if (regex.test(appContent)) {
    appContent = appContent.replace(regex, replace);
    appModified = true;
  }
});
if (appModified) {
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('Applied Premium Dark Mode to App.tsx');
}
