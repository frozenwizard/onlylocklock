import {ALARM_CODE, DASHBOARD, ENTITIES, KNOWN_PAGE_ERRORS, expect, row, test} from './ha.js';

const TAGS = ['only-lock-lock-row', 'only-close-cover-row', 'only-arm-alarm-row'];

test('dashboard loads with no errors and all rows defined', async ({page}) => {
  // The page fixture already fails the test on uncaught errors. This also catches logged ones.
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(DASHBOARD);
  await expect(row(page, 'only-lock-lock-row', 'Test lock').getByRole('button')).toBeVisible();
  // HA's own startup calls finish just after the rows render, and their errors arrive then.
  await page.waitForTimeout(2000);

  const defined = await page.evaluate((tags) => tags.filter((tag) => customElements.get(tag)), TAGS);
  expect(defined).toEqual(TAGS);
  await expect(page.locator('hui-error-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('lock row shows the name and only a Lock button', async ({dashboard}) => {
  const lock = row(dashboard, 'only-lock-lock-row', 'Test lock');
  await expect(lock.getByRole('button')).toHaveCount(1);
  await expect(lock.getByRole('button')).toHaveText('Lock');
  await expect(lock).not.toContainText(/unlock/i);
});

test('Lock locks the lock', async ({dashboard, api}) => {
  await api.setState(ENTITIES.lock, 'unlock', 'unlocked');
  await row(dashboard, 'only-lock-lock-row', 'Test lock').getByRole('button', {name: 'Lock'}).click();
  await expect.poll(() => api.state(ENTITIES.lock)).toBe('locked');
});

test('Close closes the cover', async ({dashboard, api}) => {
  await api.setState(ENTITIES.cover, 'open_cover', 'open');
  await row(dashboard, 'only-close-cover-row', 'Test cover').getByRole('button', {name: 'Close'}).click();
  await expect.poll(() => api.state(ENTITIES.cover)).toBe('closed');
});

test('Arm Home and Arm Away arm the alarm', async ({dashboard, api}) => {
  const alarm = row(dashboard, 'only-arm-alarm-row', 'Test alarm');

  await api.setState(ENTITIES.alarm, 'alarm_disarm', 'disarmed');
  await alarm.getByRole('button', {name: 'Arm Home'}).click();
  await expect.poll(() => api.state(ENTITIES.alarm)).toBe('armed_home');

  await api.setState(ENTITIES.alarm, 'alarm_disarm', 'disarmed');
  await alarm.getByRole('button', {name: 'Arm Away'}).click();
  await expect.poll(() => api.state(ENTITIES.alarm)).toBe('armed_away');
});

test('tapping, holding or double-tapping a row never opens more-info', async ({dashboard}) => {
  // The rows fire hass-more-info to open the popup. Record every one.
  await dashboard.evaluate(() => {
    window.moreInfoEvents = [];
    window.addEventListener('hass-more-info', (event) => window.moreInfoEvents.push(event.detail.entityId), true);
  });
  const moreInfoEvents = () => dashboard.evaluate(() => window.moreInfoEvents);
  const dialog = dashboard.getByRole('dialog');

  // A standard row opens more-info when its name is tapped, which shows the checks below can see it.
  await dashboard.locator('hui-lock-entity-row').getByText('Control lock').click();
  await expect(dialog).toBeVisible();
  expect(await moreInfoEvents()).toEqual([ENTITIES.lock]);
  await dashboard.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await dashboard.evaluate(() => window.moreInfoEvents = []);

  for (const [tag, name] of [
    ['only-lock-lock-row', 'Test lock'],
    ['only-close-cover-row', 'Test cover'],
    ['only-arm-alarm-row', 'Test alarm'],
  ]) {
    const target = row(dashboard, tag, name);
    await target.getByText(name).click();
    await target.locator('state-badge').click();
    await target.getByText(name).dblclick();
    await target.getByText(name).hover();
    await dashboard.mouse.down();
    await dashboard.waitForTimeout(1000);
    await dashboard.mouse.up();
  }
  // Give a delayed tap or hold action time to fire.
  await dashboard.waitForTimeout(1000);
  expect(await moreInfoEvents()).toEqual([]);
  await expect(dialog).toHaveCount(0);
});

// These record what happens today: the row has no way to enter a code, so HA
// rejects the call. Update them if code entry is added (see the backlog).
const UNCAUGHT_FAILURE = {annotation: {type: KNOWN_PAGE_ERRORS, description: 'Bug 12: a failed call is never caught'}};

test('Lock on a lock that needs a code leaves it unlocked and shows an error', UNCAUGHT_FAILURE, async ({
  dashboard, api,
}) => {
  await api.setState(ENTITIES.codeLock, 'unlock', 'unlocked', {code: ALARM_CODE});
  await row(dashboard, 'only-lock-lock-row', 'Code lock').getByRole('button', {name: 'Lock'}).click();
  // HA's error toast names the entity.
  await expect(dashboard.locator('ha-toast').filter({hasText: ENTITIES.codeLock})).toBeVisible();
  expect(await api.state(ENTITIES.codeLock)).toBe('unlocked');
});

test('Arm on an alarm that needs a code leaves it disarmed and shows an error', UNCAUGHT_FAILURE, async ({
  dashboard, api,
}) => {
  await api.setState(ENTITIES.codeAlarm, 'alarm_disarm', 'disarmed', {code: ALARM_CODE});
  await row(dashboard, 'only-arm-alarm-row', 'Code alarm').getByRole('button', {name: 'Arm Home'}).click();
  await expect(dashboard.locator('ha-toast').filter({hasText: ENTITIES.codeAlarm})).toBeVisible();
  expect(await api.state(ENTITIES.codeAlarm)).toBe('disarmed');
});
