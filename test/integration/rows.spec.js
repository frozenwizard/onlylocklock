import {ALARM_CODE, DASHBOARD, ENTITIES, expect, row, test} from './ha.js';

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

test('rows are not offered in the card picker', async ({dashboard}) => {
  const types = await dashboard.evaluate(() => (window.customCards ?? []).map((card) => card.type));
  expect(types.filter((type) => type.startsWith('only-'))).toEqual([]);
});

test('lock row shows the name, the state and only a Lock button', async ({dashboard, api}) => {
  await api.setState(ENTITIES.lock, 'unlock', 'unlocked');
  const lock = row(dashboard, 'only-lock-lock-row', 'Test lock');
  await expect(lock.getByRole('button')).toHaveCount(1);
  await expect(lock.getByRole('button')).toHaveText('Lock');
  await expect(lock.getByRole('button')).toHaveAccessibleName('Lock: Test lock');
  await expect(lock.getByText('Unlocked', {exact: true})).toBeVisible();
});

test('Lock locks the lock, then is disabled', async ({dashboard, api}) => {
  await api.setState(ENTITIES.lock, 'unlock', 'unlocked');
  const lock = row(dashboard, 'only-lock-lock-row', 'Test lock').getByRole('button', {name: 'Lock'});
  await lock.click();
  await expect.poll(() => api.state(ENTITIES.lock)).toBe('locked');
  await expect(lock).toBeDisabled();
});

test('Close cover closes the cover, then is disabled', async ({dashboard, api}) => {
  await api.setState(ENTITIES.cover, 'open_cover', 'open');
  const close = row(dashboard, 'only-close-cover-row', 'Test cover').getByRole('button', {name: 'Close cover'});
  await close.click();
  await expect.poll(() => api.state(ENTITIES.cover)).toBe('closed');
  await expect(close).toBeDisabled();
});

test('the alarm row arms home, then away, and never offers a partial disarm', async ({dashboard, api}) => {
  const alarm = row(dashboard, 'only-arm-alarm-row', 'Test alarm');
  const away = alarm.getByRole('button', {name: 'Arm away'});
  const home = alarm.getByRole('button', {name: 'Arm home'});

  await api.setState(ENTITIES.alarm, 'alarm_disarm', 'disarmed');
  await expect(away).toBeEnabled();
  await home.click();
  await expect.poll(() => api.state(ENTITIES.alarm)).toBe('armed_home');

  // Away is more secure than home, so it's still offered.
  await expect(home).toBeDisabled();
  await away.click();
  await expect.poll(() => api.state(ENTITIES.alarm)).toBe('armed_away');

  // Home from away would turn off the indoor sensors.
  await expect(home).toBeDisabled();
  await expect(away).toBeDisabled();
  // A disabled button can still be clicked, but the click does nothing.
  await home.click({force: true});
  await dashboard.waitForTimeout(1000);
  expect(await api.state(ENTITIES.alarm)).toBe('armed_away');
});

// Only disarmed and armed home have a more secure state to move to.
test('the alarm row offers nothing in night, vacation, custom bypass or triggered', async ({dashboard, api}) => {
  const buttons = row(dashboard, 'only-arm-alarm-row', 'Test alarm').getByRole('button');
  for (const [service, state] of [
    ['alarm_arm_night', 'armed_night'],
    ['alarm_arm_vacation', 'armed_vacation'],
    ['alarm_arm_custom_bypass', 'armed_custom_bypass'],
    ['alarm_trigger', 'triggered'],
  ]) {
    await api.setState(ENTITIES.alarm, service, state);
    await expect(buttons.first()).toBeDisabled();
    await expect(buttons.last()).toBeDisabled();
  }
  await api.setState(ENTITIES.alarm, 'alarm_disarm', 'disarmed');
});

test('a button stays disabled while its call runs, and keeps focus', async ({dashboard, api}) => {
  await api.setState(ENTITIES.slowLock, 'unlock', 'unlocked');
  const lock = row(dashboard, 'only-lock-lock-row', 'Slow lock').getByRole('button', {name: 'Lock'});
  // From the keyboard, where losing focus would send the user back to the top of the page.
  await lock.press('Enter');
  // The lock takes 2 seconds, so it's still unlocked while the button is disabled.
  await expect(lock).toBeDisabled();
  await expect(lock).toBeFocused();
  expect(await api.state(ENTITIES.slowLock)).toBe('unlocked');
  await expect.poll(() => api.state(ENTITIES.slowLock)).toBe('locked');
  // Now it's disabled because the lock is locked.
  await expect(lock).toBeDisabled();
  await expect(lock).toBeFocused();
});

// As when assistive tech or automation tooling clicks twice. Both clicks arrive
// before the button is next rendered.
test('two clicks in one task send one call', async ({dashboard, api}) => {
  await api.setState(ENTITIES.lock, 'unlock', 'unlocked');
  // Count the calls as HA receives them.
  await dashboard.evaluate(async (entityId) => {
    window.lockCalls = 0;
    await document.querySelector('home-assistant').hass.connection.subscribeEvents((event) => {
      const {domain, service, service_data: data} = event.data;
      if (domain === 'lock' && service === 'lock' && data?.entity_id === entityId) window.lockCalls++;
    }, 'call_service');
  }, ENTITIES.lock);

  await row(dashboard, 'only-lock-lock-row', 'Test lock').getByRole('button', {name: 'Lock'})
      .evaluate((button) => {
        button.click();
        button.click();
      });
  await expect.poll(() => api.state(ENTITIES.lock)).toBe('locked');
  // Give a second call time to arrive.
  await dashboard.waitForTimeout(1000);
  expect(await dashboard.evaluate(() => window.lockCalls)).toBe(1);
});

test('labels in the config replace HA\'s', async ({dashboard}) => {
  await expect(row(dashboard, 'only-arm-alarm-row', 'Alarm with labels').getByRole('button'))
      .toHaveText(['Away', 'Home']);
});

// As when it's added both through HACS and as a manual resource.
test('loading the file a second time does not throw', async ({dashboard}) => {
  await dashboard.evaluate(() => import('/local/onlylocklock/content.js?again'));
});

test('an unavailable entity disables the button', async ({dashboard}) => {
  const lock = row(dashboard, 'only-lock-lock-row', 'Unavailable lock');
  await expect(lock.getByText('Unavailable', {exact: true})).toBeVisible();
  await expect(lock.getByRole('button', {name: 'Lock'})).toBeDisabled();
});

test('tapping, holding or double-tapping a row never opens more-info', async ({dashboard, api}) => {
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
    // Its config sets every action to more-info.
    ['only-arm-alarm-row', 'Alarm with tap actions'],
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

  // Pressing a button doesn't reach the row's tap handler either.
  await api.setState(ENTITIES.alarm, 'alarm_disarm', 'disarmed');
  await row(dashboard, 'only-arm-alarm-row', 'Alarm with tap actions').getByRole('button', {name: 'Arm home'}).click();
  await expect.poll(() => api.state(ENTITIES.alarm)).toBe('armed_home');

  // Give a delayed tap or hold action time to fire.
  await dashboard.waitForTimeout(1000);
  expect(await moreInfoEvents()).toEqual([]);
  await expect(dialog).toHaveCount(0);
});

// The rows have no way to enter a code, so HA rejects these calls (see the backlog).
// HA's error toast names the entity, and the row catches the failure.
test('Lock on a lock that needs a code leaves it unlocked and shows an error', async ({dashboard, api}) => {
  await api.setState(ENTITIES.codeLock, 'unlock', 'unlocked', {code: ALARM_CODE});
  const lock = row(dashboard, 'only-lock-lock-row', 'Code lock').getByRole('button', {name: 'Lock'});
  await lock.click();
  await expect(dashboard.locator('ha-toast').filter({hasText: ENTITIES.codeLock})).toBeVisible();
  expect(await api.state(ENTITIES.codeLock)).toBe('unlocked');
  await expect(lock).toBeEnabled();
});

test('Arm on an alarm that needs a code leaves it disarmed and shows an error', async ({dashboard, api}) => {
  await api.setState(ENTITIES.codeAlarm, 'alarm_disarm', 'disarmed', {code: ALARM_CODE});
  const home = row(dashboard, 'only-arm-alarm-row', 'Code alarm').getByRole('button', {name: 'Arm home'});
  await home.click();
  await expect(dashboard.locator('ha-toast').filter({hasText: ENTITIES.codeAlarm})).toBeVisible();
  expect(await api.state(ENTITIES.codeAlarm)).toBe('disarmed');
  await expect(home).toBeEnabled();
});

test('a misconfigured row shows HA\'s config error', async ({page}) => {
  // The error card only shows the message in the card editor, but HA also logs it.
  const logged = [];
  page.on('console', (message) => {
    if (message.type() === 'error') logged.push(message.text());
  });
  await page.goto('/onlylocklock-test/errors');
  await expect(page.locator('hui-error-card')).toHaveCount(3);
  for (const error of [
    'You need to define an entity',
    'Entity must be a cover entity, not lock.test_lock',
    'Unknown label disarm',
  ]) {
    expect(logged.some((text) => text.includes(error)), `"${error}" in ${JSON.stringify(logged)}`).toBe(true);
  }
});

test('labels and state follow the user\'s language', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('selectedLanguage', JSON.stringify('de')));
  await page.goto(DASHBOARD);
  const lock = row(page, 'only-lock-lock-row', 'Test lock');
  await expect(lock.getByRole('button')).toBeVisible();

  // Compare with HA's own translations, so HA rewording one doesn't break the test.
  const german = await page.evaluate(() => {
    const hass = document.querySelector('home-assistant').hass;
    return {
      language: hass.language,
      lock: hass.localize('ui.card.lock.lock'),
      close: hass.localize('ui.card.cover.close_cover'),
      away: hass.localize('ui.card.alarm_control_panel.arm_away'),
      home: hass.localize('ui.card.alarm_control_panel.arm_home'),
      lockState: hass.formatEntityState(hass.states['lock.test_lock']),
    };
  });
  expect(german.language).toBe('de');
  expect(german.lock).not.toBe('Lock');

  await expect(lock.getByRole('button')).toHaveText(german.lock);
  await expect(lock.getByText(german.lockState, {exact: true})).toBeVisible();
  await expect(row(page, 'only-close-cover-row', 'Test cover').getByRole('button')).toHaveText(german.close);
  await expect(row(page, 'only-arm-alarm-row', 'Test alarm').getByRole('button'))
      .toHaveText([german.away, german.home]);
});
