const fs = require('fs');

const files = [
  'src/components/dashboard/MyStructures.tsx',
  'src/components/dashboard/ActivityTimeline.tsx',
  'src/components/dashboard/AccountSettings.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Backgrounds
  content = content.replace(/\bbg-neutral-950(?!\/)\b/g, 'bg-[var(--bg-header)]');
  content = content.replace(/\bbg-neutral-900(?!\/)\b/g, 'bg-[var(--bg-header)]');
  content = content.replace(/\bbg-neutral-800(?!\/)\b/g, 'bg-[var(--input-bg)]');
  content = content.replace(/\bbg-neutral-700(?!\/)\b/g, 'bg-[var(--input-bg)]');
  
  // Opacity Backgrounds
  content = content.replace(/\bbg-neutral-950\/[0-9]+\b/g, 'bg-[var(--bg-header)]');
  content = content.replace(/\bbg-neutral-900\/[0-9]+\b/g, 'bg-[var(--bg-header)]');
  content = content.replace(/\bbg-neutral-800\/[0-9]+\b/g, 'bg-[var(--input-bg)]');
  content = content.replace(/\bbg-neutral-700\/[0-9]+\b/g, 'bg-[var(--input-bg)]');
  
  // Borders
  content = content.replace(/\bborder-neutral-800(?!\/)\b/g, 'border-[var(--border-main)]');
  content = content.replace(/\bborder-neutral-700(?!\/)\b/g, 'border-[var(--border-main)]');
  content = content.replace(/\bborder-neutral-800\/[0-9]+\b/g, 'border-[var(--border-main)]');
  content = content.replace(/\bborder-neutral-700\/[0-9]+\b/g, 'border-[var(--border-main)]');

  // Text colors
  content = content.replace(/\btext-neutral-100\b/g, 'text-[var(--text-primary)]');
  content = content.replace(/\btext-neutral-200\b/g, 'text-[var(--text-primary)]');
  content = content.replace(/\btext-neutral-300\b/g, 'text-[var(--text-secondary)]');
  content = content.replace(/\btext-neutral-400\b/g, 'text-[var(--text-secondary)]');
  content = content.replace(/\btext-neutral-500\b/g, 'text-[var(--text-muted)]');
  content = content.replace(/\btext-neutral-600\b/g, 'text-[var(--text-muted)]');

  // We DO NOT blindly replace text-white. We'll replace text-white only if it's not preceeded by a colored button
  // Actually, to be safe, we replace text-white everywhere, then revert for solid brand colors.
  content = content.replace(/\btext-white\b/g, 'text-[var(--text-primary)]');
  
  // Revert buttons: bg-blue-600, bg-red-600, etc. Usually they have text-[var(--text-primary)] now. Let's fix it.
  content = content.replace(/(bg-(?:blue|red|emerald|amber|green|pink)-[56]00[^>]*?)text-\[var\(--text-primary\)\]/g, '$1text-white');
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
