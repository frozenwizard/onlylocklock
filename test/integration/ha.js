// Shared settings and fixtures for the integration tests.
import {test as base, expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';

export const HA_PORT = process.env.HA_PORT || '18123';
// Not "localhost": HA only registers its service worker there or on https, and the
// worker reloads the page the first time it takes control.
export const HA_URL = `http://127.0.0.1:${HA_PORT}`;
// The frontend's client id is its own origin with a trailing slash.
export const CLIENT_ID = `${HA_URL}/`;
export const COMPOSE_FILE = fileURLToPath(new URL('./docker-compose.yml', import.meta.url));
export const DASHBOARD = '/onlylocklock-test/rows';

export const ENTITIES = {
  lock: 'lock.test_lock',
  codeLock: 'lock.code_lock',
  cover: 'cover.test_cover',
  alarm: 'alarm_control_panel.test_alarm',
  codeAlarm: 'alarm_control_panel.code_alarm',
  unavailableLock: 'lock.unavailable_lock',
};
export const ALARM_CODE = '1234';

// Annotate a test with this type when the page is expected to throw.
export const KNOWN_PAGE_ERRORS = 'known-page-errors';

export const test = base.extend({
  // Fails the test if the page throws, including unhandled promise rejections.
  page: async ({page}, use, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    if (!testInfo.annotations.some((annotation) => annotation.type === KNOWN_PAGE_ERRORS)) {
      expect(errors, 'uncaught errors in the page').toEqual([]);
    }
  },

  // REST client for setting up and checking entity state, authenticated as the test user.
  api: async ({playwright}, use) => {
    const request = await playwright.request.newContext({
      baseURL: HA_URL,
      extraHTTPHeaders: {Authorization: `Bearer ${process.env.HA_TOKEN}`},
    });
    await use({
      async state(entityId) {
        const response = await request.get(`/api/states/${entityId}`);
        expect(response.ok(), `GET state of ${entityId}`).toBe(true);
        return (await response.json()).state;
      },
      async call(domain, service, data) {
        const response = await request.post(`/api/services/${domain}/${service}`, {data});
        expect(response.ok(), `${domain}.${service}: ${await response.text()}`).toBe(true);
      },
      // Calls a service and waits until the entity reaches the expected state.
      async setState(entityId, service, expected, data = {}) {
        await this.call(entityId.split('.')[0], service, {entity_id: entityId, ...data});
        await expect.poll(() => this.state(entityId)).toBe(expected);
      },
    });
    await request.dispose();
  },

  // The test dashboard, loaded and showing the rows.
  dashboard: async ({page}, use) => {
    await page.goto(DASHBOARD);
    await expect(row(page, 'only-lock-lock-row', 'Test lock').getByRole('button')).toBeVisible();
    await use(page);
  },
});

// Finds one of the custom rows by its tag and the entity name it shows.
export function row(page, tag, name) {
  return page.locator(tag).filter({hasText: name});
}

export {expect};
