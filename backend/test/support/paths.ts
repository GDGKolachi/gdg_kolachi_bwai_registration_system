import { join } from 'node:path';

export const BACKEND_ROOT = join(__dirname, '..', '..');
export const COMPILED_DIR = join(
  BACKEND_ROOT,
  'node_modules',
  '.cache',
  'e2e-dist',
);
export const COMPILED_MAIN = join(COMPILED_DIR, 'main.js');
