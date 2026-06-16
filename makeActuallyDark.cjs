const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');

const replacements = [
  // App Background -> Pure Black
  { regex: /dark:bg-slate-950/g, replace: 'dark:bg-black' },
  
  // Cards & Sidebars -> Dark Neutral
  { regex: /dark:bg-slate-900/g, replace: 'dark:bg-neutral-900' },
  
  // Inner Cards / Headers
  { regex: /dark:bg-slate-800\/50/g, replace: 'dark:bg-neutral-800/50' },
  { regex: /dark:bg-slate-800/g, replace: 'dark:bg-neutral-800' },
  
  // Borders
  { regex: /dark:border-slate-800/g, replace: 'dark:border-neutral-800' },
  { regex: /dark:border-slate-700/g, replace: 'dark:border-neutral-700' },
  { regex: /dark:divide-slate-800/g, replace: 'dark:divide-neutral-800' },
  
  // Hovers
  { regex: /dark:hover:bg-slate-800\/50/g, replace: 'dark:hover:bg-neutral-800/50' },
  { regex: /dark:hover:bg-slate-800/g, replace: 'dark:hover:bg-neutral-800' },
];

function processDirectory(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      replacements.forEach(({ regex, replace }) => {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated to True Dark Mode in ${file}`);
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
  console.log('Updated to True Dark Mode in App.tsx');
}
