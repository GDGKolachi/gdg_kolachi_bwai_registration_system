import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { BACKEND_ROOT, COMPILED_DIR, COMPILED_MAIN } from './paths';

export default function compileBackend() {
  rmSync(COMPILED_DIR, { recursive: true, force: true });
  spawnSync(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '-p',
      join(BACKEND_ROOT, 'tsconfig.build.json'),
      '--outDir',
      COMPILED_DIR,
      '--incremental',
      'false',
    ],
    { cwd: BACKEND_ROOT, stdio: 'inherit' },
  );
  if (!existsSync(COMPILED_MAIN)) {
    throw new Error(`The backend did not compile to ${COMPILED_MAIN}`);
  }
}
