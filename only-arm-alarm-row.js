window.customCards = window.customCards || [];
window.customCards.push({
  type: 'only-arm-alarm-row',
  name: 'Only Arm Alarm row',
  description: 'A plugin to only arm an Alarm.',
  preview: false,
});

const LitElement = customElements.get('ha-panel-lovelace') ?
    Object.getPrototypeOf(customElements.get('ha-panel-lovelace')) :
    Object.getPrototypeOf(customElements.get('hc-lovelace'));
const html = LitElement.prototype.html;

/**
 *  Only Arm Alarm custom entity
 */
export class OnlyArmAlarmRow extends LitElement {
  render() {
    return html`
          <style include="iron-flex iron-flex-alignment"></style>
          <style>
            mwc-button {
              top: 3px;
              height: 37px;
              margin-right: -0.57em;
            }
          </style>
          <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
            <div class="horizontal justified layout">
              <button @click=${this.callArmAway}>Arm Away</button>
              <button  @click=${this.callArmHome}>Arm Home</button>
            </div>
          </hui-generic-entity-row>
        `;
  }


  static get properties() {
    return {
      hass: Object,
    };
  }

  setConfig(config) {
    this._config = {
      tap_action: {
        action: 'none',
      },
      ...config,
    };
  }

  callArmHome() {
    const data = {
      entity_id: this._config.entity,
    };
    this.hass.callService('alarm_control_panel', 'alarm_arm_home', data);
  }

  callArmAway() {
    const data = {
      entity_id: this._config.entity,
    };
    this.hass.callService('alarm_control_panel', 'alarm_arm_away', data);
  }
}
