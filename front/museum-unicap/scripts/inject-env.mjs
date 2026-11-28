import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');
const outputFile = path.join(rootDir, 'public', 'env.js');

/**
 * Loads key=value pairs from .env if present (without overriding existing process.env).
 */
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(envFile);

const payload = {
  SUPABASE_URL: process.env['SUPABASE_URL'] || '',
  SUPABASE_ANON_KEY: process.env['SUPABASE_ANON_KEY'] || '',
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(
  outputFile,
  `// Generated automatically by scripts/inject-env.mjs — do not commit.\nwindow.__ENV__ = ${JSON.stringify(payload, null, 2)};\n`,
  'utf8',
);

console.log(
  `[inject-env] public/env.js written (SUPABASE_URL=${payload.SUPABASE_URL ? 'set' : 'empty'}).`,
);
