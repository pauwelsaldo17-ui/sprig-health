#!/usr/bin/env node
// Babel validation for the app's JSX.
//  1. Syntax: every file in src/screens parses.
//  2. Missing imports: in src/screens, src/components and src/App.jsx, every
//     capitalized name used as a JSX tag or value (e.g. <Sparkles />) must be
//     imported or defined. A missing icon import builds fine but crashes the
//     app at render ("Can't find variable: Sparkles" on iOS).
// Run: node scripts/validate-screens.js
// Exit code 0 = all OK, 1 = syntax errors or missing imports found.
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');
const SCREENS_DIR = join(SRC_DIR, 'screens');
const isJs = (f) => f.endsWith('.jsx') || f.endsWith('.js');
const files = readdirSync(SCREENS_DIR).filter(isJs);

// Browser / JS globals that start with a capital letter and need no import.
const GLOBALS = new Set(('Math Date JSON Object Array Number String Promise Set Map WeakMap WeakSet Intl ' +
  'Error TypeError RangeError Boolean RegExp Symbol Proxy Reflect BigInt Infinity NaN URL URLSearchParams ' +
  'Blob File FileReader Image Audio AudioContext OfflineAudioContext MediaRecorder Notification ' +
  'AbortController Response Request Headers FormData Event CustomEvent DOMException Worker HTMLElement ' +
  'IntersectionObserver ResizeObserver MutationObserver TextEncoder TextDecoder ' +
  'Uint8Array Int16Array Float32Array ArrayBuffer DataView').split(' '));

const parseFile = (path) => parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });

let errors = 0;
const asts = new Map();
for (const file of files) {
  const fullPath = join(SCREENS_DIR, file);
  try {
    asts.set(`screens/${file}`, parseFile(fullPath));
  } catch (e) {
    process.stderr.write(`[validate] ERR ${file} line ${e.loc?.line}: ${e.message}\n`);
    errors++;
  }
}

// Extra files for the missing-import check (syntax errors there are left to `npm run build`).
const extra = [
  ...readdirSync(join(SRC_DIR, 'components')).filter(isJs).map((f) => `components/${f}`),
  'App.jsx',
];
for (const rel of extra) {
  try { asts.set(rel, parseFile(join(SRC_DIR, rel))); } catch { /* reported by the build */ }
}

let missing = 0;
for (const [rel, ast] of asts) {
  const found = new Map();
  const check = (name, path, line) => {
    if (/^[A-Z]/.test(name) && !GLOBALS.has(name) && !path.scope.hasBinding(name) && !found.has(name)) found.set(name, line);
  };
  traverse(ast, {
    JSXOpeningElement(p) {
      const n = p.node.name;
      if (n.type === 'JSXIdentifier') check(n.name, p, n.loc?.start.line);
    },
    ReferencedIdentifier(p) {
      if (p.node.type === 'Identifier') check(p.node.name, p, p.node.loc?.start.line);
    },
  });
  for (const [name, line] of found) {
    process.stderr.write(`[validate] ERR ${rel} line ${line}: "${name}" is used but never imported or defined\n`);
    missing++;
  }
}

if (errors === 0 && missing === 0) {
  process.stdout.write(`[validate] All ${files.length} screens OK, no missing imports in ${asts.size} files\n`);
} else {
  if (errors) process.stdout.write(`[validate] ${errors} file(s) have syntax errors\n`);
  if (missing) process.stdout.write(`[validate] ${missing} missing import(s) — add them to the file's import list\n`);
  process.exit(1);
}
