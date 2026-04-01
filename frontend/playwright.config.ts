import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, 'e2e', '.auth', 'admin.json');

/**
 * E2E tests — start backend first, then frontend (or rely on webServer for UI only).
 *
 * Env:
 * - PLAYWRIGHT_BASE_URL — frontend (default http://localhost:5173)
 * - PLAYWRIGHT_API_URL — API origin without path (default http://localhost:3000) for workshop helpers
 * - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD — admin login (auth.setup.ts)
 */
export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    /** Capture after every test so HTML report includes success + failure screenshots */
    screenshot: 'on',
  },
  projects: [
    { name: 'setup', testMatch: 'auth.setup.ts' },
    {
      name: 'admin',
      dependencies: ['setup'],
      testMatch: 'admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'public',
      testMatch: 'public/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
