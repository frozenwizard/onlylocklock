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
  constructor() {
    super();
  }
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
              <state-info hass="[[hass]]" state-obj="[[stateObj]]"></state-info>        
              <button @click=${this.callArmAway}>Arm Away</button>
              <button  @click=${this.callArmHome}>Arm Home</button>
            </div>
          </hui-generic-entity-row>
        `;
  }


  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: '_stateObjChanged',
      },
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


  displayName() {
    return this._config.name || this.stateObj.attributes.friendly_name;
  }

  _stateObjChanged(newVal) {
    this.setProperties({
      _stateObj: stateObj,
    });
  }

  callArmHome(ev) {
    const data = {
      entity_id: this._config.entity,
    };
    this.hass.callService('alarm_control_panel', 'alarm_arm_home', data);
  }

  callArmAway(ev) {
    const data = {
      entity_id: this._config.entity,
    };
    this.hass.callService('alarm_control_panel', 'alarm_arm_away', data);
  }
}
