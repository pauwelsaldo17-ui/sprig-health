#!/usr/bin/env node
// Babel syntax validation for all JSX screens.
// Run: node scripts/validate-screens.js
// Exit code 0 = all OK, 1 = syntax error(s) found.
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = join(__dirname, '..', 'src', 'screens');
const files = readdirSync(SCREENS_DIR).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

let errors = 0;
for (const file of files) {
  const fullPath = join(SCREENS_DIR, file);
  try {
    parse(readFileSync(fullPath, 'utf8'), {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (e) {
    process.stderr.write(`[validate] ERR ${file} line ${e.loc?.line}: ${e.message}\n`);
    errors++;
  }
}

if (errors === 0) {
  process.stdout.write(`[validate] All ${files.length} screens OK\n`);
} else {
  process.stdout.write(`[validate] ${errors} file(s) have syntax errors\n`);
  process.exit(1);
}
