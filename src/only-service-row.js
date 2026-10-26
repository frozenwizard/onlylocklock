import {LitElement, css, html, nothing} from 'lit';

const NO_ACTION = {action: 'none'};

/**
 * An entities-card row that offers only some of an entity's services, as buttons.
 *
 * Subclasses set `domain` and `actions`. Each action is
 * `{id, service, labelKey, fallback, enabledWhen}`:
 * - `id` is its key in the `labels` option
 * - `labelKey` is the HA frontend translation key for its label, and `fallback` is
 *   the English label for HA versions that don't have that key
 * - `enabledWhen(state)` says whether the button is enabled in that entity state
 */
export class OnlyServiceRow extends LitElement {
  static properties = {
    hass: {attribute: false},
    _config: {state: true},
    _pending: {state: true},
  };

  static domain = '';
  static actions = [];

  setConfig(config) {
    const {domain, actions} = this.constructor;
    if (typeof config?.entity !== 'string' || !config.entity) {
      throw new Error('You need to define an entity');
    }
    if (!config.entity.startsWith(`${domain}.`)) {
      throw new Error(`Entity must be a ${domain} entity, not ${config.entity}`);
    }
    const ids = actions.map((action) => action.id);
    if (config.labels !== undefined) {
      if (typeof config.labels !== 'object' || config.labels === null || Array.isArray(config.labels)) {
        throw new Error(`labels must be a map of ${ids.join(', ')} to text`);
      }
      const unknown = Object.keys(config.labels).filter((id) => !ids.includes(id));
      if (unknown.length) {
        throw new Error(`Unknown label ${unknown.join(', ')}. Labels can be ${ids.join(', ')}`);
      }
    }
    // Set after the user's config so it can't turn the more-info popup, and its
    // unlock, open or disarm controls, back on.
    this._config = {...config, tap_action: NO_ACTION, hold_action: NO_ACTION, double_tap_action: NO_ACTION};
  }

  // Re-render only for changes to this row's config or entity, not every HA update.
  shouldUpdate(changed) {
    if (changed.has('_config') || changed.has('_pending')) return true;
    if (!changed.has('hass')) return false;
    const old = changed.get('hass');
    const {entity} = this._config ?? {};
    return !old ||
      old.states[entity] !== this.hass.states[entity] ||
      old.entities?.[entity] !== this.hass.entities?.[entity] ||
      old.localize !== this.hass.localize ||
      old.formatEntityState !== this.hass.formatEntityState ||
      old.formatEntityName !== this.hass.formatEntityName;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    const stateObj = this.hass.states[this._config.entity];
    // hui-generic-entity-row shows its own warning when the entity doesn't exist.
    // Without catchInteraction, it wraps the buttons in its tap handler for some
    // domains, including alarm panels. The state goes under the name, unless the
    // config asks for other secondary info.
    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .catchInteraction=${false}
        .secondaryText=${stateObj && !this._config.secondary_info ?
          this.hass.formatEntityState?.(stateObj) ?? stateObj.state : undefined}
      >
        ${stateObj ? this._renderButtons(stateObj) : nothing}
      </hui-generic-entity-row>
    `;
  }

  _renderButtons(stateObj) {
    const name = this.hass.formatEntityName?.(stateObj, this._config.name) ||
      this._config.name || stateObj.attributes.friendly_name || stateObj.entity_id;
    return html`
      <div class="buttons">
        ${this.constructor.actions.map((action) => {
          const label = this._label(action);
          return html`
            <button
              type="button"
              aria-label="${label}: ${name}"
              ?disabled=${this._pending || stateObj.state === 'unavailable' || !action.enabledWhen(stateObj.state)}
              @click=${(ev) => this._call(ev, action)}
            >${label}</button>
          `;
        })}
      </div>
    `;
  }

  _label(action) {
    return this._config.labels?.[action.id] || this.hass.localize?.(action.labelKey) || action.fallback;
  }

  async _call(ev, action) {
    // Keep the click away from the row's own tap handler.
    ev.stopPropagation();
    this._pending = true;
    try {
      await this.hass.callService(this.constructor.domain, action.service, {entity_id: this._config.entity});
    } catch {
      // HA has already shown the error in a toast.
    } finally {
      this._pending = false;
    }
  }

  static styles = css`
    /* On a narrow card, the buttons stack instead of squeezing the name. */
    .buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      column-gap: 8px;
      margin-inline-end: -8px;
    }
    button {
      white-space: nowrap;
      min-height: 36px;
      padding: 0 8px;
      border: none;
      border-radius: var(--ha-border-radius-md, 8px);
      background: none;
      color: var(--primary-color);
      font: inherit;
      font-weight: var(--ha-font-weight-medium, 500);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    button:disabled {
      color: var(--disabled-text-color);
      cursor: default;
    }
  `;
}
