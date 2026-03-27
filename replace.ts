import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace Tailwind arbitrary values
  content = content.replace(/bg-\[\#E1FF01\]/g, 'bg-brand-primary');
  content = content.replace(/text-\[\#E1FF01\]/g, 'text-brand-primary');
  content = content.replace(/border-\[\#E1FF01\]/g, 'border-brand-primary');
  content = content.replace(/accent-\[\#E1FF01\]/g, 'accent-brand-primary');
  content = content.replace(/selection:bg-\[\#E1FF01\]/g, 'selection:bg-brand-primary');
  content = content.replace(/selection:text-\[\#E1FF01\]/g, 'selection:text-brand-primary');
  
  // Replace shadow arbitrary values
  content = content.replace(/shadow-\[0_0_20px_rgba\(225,255,1,0\.2\)\]/g, 'shadow-[0_0_20px] shadow-brand-primary/20');
  content = content.replace(/shadow-\[0_0_20px_rgba\(225,255,1,0\.3\)\]/g, 'shadow-[0_0_20px] shadow-brand-primary/30');
  content = content.replace(/shadow-\[0_0_10px_rgba\(225,255,1,0\.3\)\]/g, 'shadow-[0_0_10px] shadow-brand-primary/30');

  // Replace raw hex codes in strings (like in Recharts or inline styles)
  content = content.replace(/'#E1FF01'/g, "'var(--color-brand-primary)'");
  content = content.replace(/"#E1FF01"/g, '"var(--color-brand-primary)"');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
