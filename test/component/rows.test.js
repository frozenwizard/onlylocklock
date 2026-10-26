import {afterEach, describe, expect, it, vi} from 'vitest';
import '../../src/index.js';

// HA's English labels for the translation keys the rows use.
const ENGLISH = {
  'ui.card.lock.lock': 'Lock',
  'ui.card.cover.close_cover': 'Close cover',
  'ui.card.alarm_control_panel.arm_away': 'Arm away',
  'ui.card.alarm_control_panel.arm_home': 'Arm home',
};

const ROWS = [
  {
    tag: 'only-lock-lock-row',
    entity: 'lock.front_door',
    ready: 'unlocked',
    ids: ['lock'],
    labels: ['Lock'],
    services: [['lock', 'lock']],
  },
  {
    tag: 'only-close-cover-row',
    entity: 'cover.garage_door',
    ready: 'open',
    ids: ['close_cover'],
    labels: ['Close cover'],
    services: [['cover', 'close_cover']],
  },
  {
    tag: 'only-arm-alarm-row',
    entity: 'alarm_control_panel.house',
    ready: 'disarmed',
    ids: ['arm_away', 'arm_home'],
    labels: ['Arm away', 'Arm home'],
    services: [['alarm_control_panel', 'alarm_arm_away'], ['alarm_control_panel', 'alarm_arm_home']],
  },
];

function stateObj(entityId, state) {
  return {entity_id: entityId, state, attributes: {friendly_name: 'Front door'}};
}

// Just the parts of HA's hass object that the rows use.
function fakeHass(states, overrides = {}) {
  return {
    states: Object.fromEntries(Object.entries(states).map(([id, state]) => [id, stateObj(id, state)])),
    entities: {},
    callService: vi.fn().mockResolvedValue({}),
    localize: (key) => ENGLISH[key] ?? '',
    formatEntityState: (entity) => `${entity.state} (formatted)`,
    formatEntityName: (entity, name) => name ?? entity.attributes.friendly_name,
    ...overrides,
  };
}

// HA replaces the hass object, and each changed state object, on every update.
function withState(hass, entityId, state) {
  return {...hass, states: {...hass.states, [entityId]: stateObj(entityId, state)}};
}

async function mount(tag, config, hass) {
  const row = document.createElement(tag);
  row.setConfig(config);
  row.hass = hass;
  document.body.append(row);
  await row.updateComplete;
  return row;
}

const buttons = (row) => [...row.shadowRoot.querySelectorAll('button')];
const enabled = (row) => buttons(row).map((button) => !button.disabled);
const genericRow = (row) => row.shadowRoot.querySelector('hui-generic-entity-row');

afterEach(() => document.body.replaceChildren());

describe.each(ROWS)('$tag', ({tag, entity, ready, ids, labels, services}) => {
  const create = () => document.createElement(tag);

  it('needs an entity', () => {
    expect(() => create().setConfig({})).toThrow('You need to define an entity');
    expect(() => create().setConfig({entity: ''})).toThrow('You need to define an entity');
  });

  it('rejects an entity from another domain', () => {
    const other = entity.startsWith('lock.') ? 'cover.garage_door' : 'lock.front_door';
    expect(() => create().setConfig({entity: other})).toThrow(`not ${other}`);
  });

  it('rejects unknown labels', () => {
    expect(() => create().setConfig({entity, labels: {unlock: 'Unlock'}})).toThrow('Unknown label unlock');
    expect(() => create().setConfig({entity, labels: 'Lock'})).toThrow('labels must be a map');
  });

  it('turns off tap, hold and double-tap actions, even when the config sets them', async () => {
    const moreInfo = {action: 'more-info'};
    const row = await mount(tag, {
      entity, name: 'Back door', tap_action: moreInfo, hold_action: moreInfo, double_tap_action: moreInfo,
    }, fakeHass({[entity]: ready}));
    expect(genericRow(row).config).toEqual({
      entity,
      name: 'Back door',
      tap_action: {action: 'none'},
      hold_action: {action: 'none'},
      double_tap_action: {action: 'none'},
    });
  });

  it('shows a button for each action, labelled for screen readers with the entity name', async () => {
    const row = await mount(tag, {entity}, fakeHass({[entity]: ready}));
    expect(buttons(row).map((button) => button.textContent)).toEqual(labels);
    expect(buttons(row).map((button) => button.getAttribute('aria-label')))
        .toEqual(labels.map((label) => `${label}: Front door`));
    expect(enabled(row)).toEqual(labels.map(() => true));
  });

  it('uses the configured name in the screen reader label', async () => {
    const row = await mount(tag, {entity, name: 'Back door'}, fakeHass({[entity]: ready}));
    expect(buttons(row)[0].getAttribute('aria-label')).toBe(`${labels[0]}: Back door`);
  });

  it('shows the formatted state under the name, unless the config sets secondary_info', async () => {
    const hass = fakeHass({[entity]: ready});
    expect(genericRow(await mount(tag, {entity}, hass)).secondaryText).toBe(`${ready} (formatted)`);
    expect(genericRow(await mount(tag, {entity, secondary_info: 'last-changed'}, hass)).secondaryText)
        .toBeUndefined();
  });

  it.each(services.map((service, index) => [labels[index], ...service]))(
      '%s calls %s.%s on the entity', async (label, domain, service) => {
        const hass = fakeHass({[entity]: ready});
        const row = await mount(tag, {entity}, hass);
        buttons(row).find((button) => button.textContent === label).click();
        expect(hass.callService).toHaveBeenCalledExactlyOnceWith(domain, service, {entity_id: entity});
      });

  it('disables the buttons when the entity is unavailable', async () => {
    const row = await mount(tag, {entity}, fakeHass({[entity]: 'unavailable'}));
    expect(enabled(row)).toEqual(labels.map(() => false));
  });

  it('shows no buttons when the entity does not exist', async () => {
    const row = await mount(tag, {entity}, fakeHass({}));
    expect(genericRow(row)).not.toBeNull();
    expect(buttons(row)).toEqual([]);
  });

  it('disables the buttons until the service call finishes, so repeated taps send one call', async () => {
    let finish;
    const hass = fakeHass({[entity]: ready});
    hass.callService.mockReturnValue(new Promise((resolve) => finish = resolve));
    const row = await mount(tag, {entity}, hass);

    buttons(row)[0].click();
    await row.updateComplete;
    expect(enabled(row)).toEqual(labels.map(() => false));
    buttons(row)[0].click();
    expect(hass.callService).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(enabled(row)).toEqual(labels.map(() => true)));
  });

  it('catches a failed service call', async () => {
    const rejections = [];
    const onRejection = (event) => rejections.push(event.reason);
    window.addEventListener('unhandledrejection', onRejection);
    try {
      const hass = fakeHass({[entity]: ready});
      hass.callService.mockRejectedValue(new Error('Code required'));
      const row = await mount(tag, {entity}, hass);

      buttons(row)[0].click();
      await vi.waitFor(() => expect(enabled(row)).toEqual(labels.map(() => true)));
      // unhandledrejection fires in a later task.
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      window.removeEventListener('unhandledrejection', onRejection);
    }
    expect(rejections).toEqual([]);
  });

  it('keeps button clicks away from the row tap handler', async () => {
    const row = await mount(tag, {entity}, fakeHass({[entity]: ready}));
    expect(genericRow(row).catchInteraction).toBe(false);
    const clicks = vi.fn();
    genericRow(row).addEventListener('click', clicks);
    buttons(row)[0].click();
    expect(clicks).not.toHaveBeenCalled();
  });

  describe('labels', () => {
    it('come from HA translations', async () => {
      const row = await mount(tag, {entity}, fakeHass({[entity]: ready}, {localize: (key) => `de:${key}`}));
      expect(buttons(row)[0].textContent).toMatch(/^de:ui\.card\./);
    });

    it('fall back to English when HA has no translation', async () => {
      for (const localize of [() => '', undefined]) {
        const row = await mount(tag, {entity}, fakeHass({[entity]: ready}, {localize}));
        expect(buttons(row).map((button) => button.textContent)).toEqual(labels);
      }
    });

    it('can be set in the config', async () => {
      const row = await mount(tag, {entity, labels: {[ids[0]]: 'Custom'}}, fakeHass({[entity]: ready}));
      expect(buttons(row)[0].textContent).toBe('Custom');
      expect(buttons(row)[0].getAttribute('aria-label')).toBe('Custom: Front door');
    });
  });

  describe('updates', () => {
    it('re-render when the config changes', async () => {
      const row = await mount(tag, {entity}, fakeHass({[entity]: ready}));
      row.setConfig({entity, name: 'Back door'});
      await row.updateComplete;
      expect(genericRow(row).config.name).toBe('Back door');
    });

    it('re-render when the entity or the language changes, but not for other entities', async () => {
      const hass = fakeHass({[entity]: ready, 'light.kitchen': 'off'});
      const row = await mount(tag, {entity}, hass);
      const render = vi.spyOn(row, 'render');

      row.hass = withState(hass, 'light.kitchen', 'on');
      await row.updateComplete;
      expect(render).not.toHaveBeenCalled();

      row.hass = withState(row.hass, entity, 'unavailable');
      await row.updateComplete;
      expect(render).toHaveBeenCalledTimes(1);

      row.hass = {...row.hass, localize: (key) => `de:${key}`};
      await row.updateComplete;
      expect(render).toHaveBeenCalledTimes(2);
    });
  });
});

describe('enabled states', () => {
  async function enabledIn(tag, entity, state) {
    return enabled(await mount(tag, {entity}, fakeHass({[entity]: state})));
  }

  it.each([
    ['unlocked', true], ['unlocking', true], ['jammed', true], ['open', true], ['unknown', true],
    ['locked', false], ['locking', false],
  ])('lock %s: Lock enabled is %s', async (state, lock) => {
    expect(await enabledIn('only-lock-lock-row', 'lock.front_door', state)).toEqual([lock]);
  });

  it.each([
    ['open', true], ['opening', true], ['unknown', true],
    ['closed', false], ['closing', false],
  ])('cover %s: Close cover enabled is %s', async (state, close) => {
    expect(await enabledIn('only-close-cover-row', 'cover.garage_door', state)).toEqual([close]);
  });

  // Only changes to a more secure state: armed away to armed home would be a partial disarm.
  it.each([
    ['disarmed', true, true],
    ['armed_home', true, false],
    ['armed_away', false, false],
    ['armed_night', false, false],
    ['armed_vacation', false, false],
    ['armed_custom_bypass', false, false],
    ['arming', false, false],
    ['pending', false, false],
    ['triggered', false, false],
    ['unknown', false, false],
  ])('alarm %s: Arm away enabled is %s, Arm home enabled is %s', async (state, away, home) => {
    expect(await enabledIn('only-arm-alarm-row', 'alarm_control_panel.house', state)).toEqual([away, home]);
  });
});

describe('the bundle', () => {
  it('can load twice, for example from HACS and a manual resource', async () => {
    await expect(import('../../src/index.js?again')).resolves.toBeDefined();
  });

  it('does not add the rows to the card picker', () => {
    const types = (window.customCards ?? []).map((card) => card.type);
    expect(types).toEqual([]);
  });
});
