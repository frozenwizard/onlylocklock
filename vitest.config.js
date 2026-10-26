import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

// Component tests run in a real Chromium, so the rows get real custom elements and shadow DOM.
export default defineConfig({
  test: {
    include: ['test/component/**/*.test.js'],
    setupFiles: ['test/component/setup.js'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: 'chromium'}],
    },
  },
});
