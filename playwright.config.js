import {defineConfig, devices} from '@playwright/test';
import {HA_URL, STORAGE_STATE} from './test/integration/ha.js';

export default defineConfig({
  testDir: './test/integration',
  globalSetup: './test/integration/global-setup.js',
  globalTeardown: './test/integration/global-teardown.js',
  // Every test shares one HA instance, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: {timeout: 10_000},
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: HA_URL,
    storageState: STORAGE_STATE,
    trace: 'retain-on-failure',
  },
});
