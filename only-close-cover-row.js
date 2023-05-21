window.customCards = window.customCards || [];
window.customCards.push({
  type: 'only-close-cover-row',
  name: 'Only Close Cover row',
  description: 'A plugin to only close a Cover.',
  preview: false,
});

const LitElement = customElements.get('ha-panel-lovelace') ?
    Object.getPrototypeOf(customElements.get('ha-panel-lovelace')) :
    Object.getPrototypeOf(customElements.get('hc-lovelace'));
const html = LitElement.prototype.html;

/**
 *  Only Close Cover custom entity
 */
export class OnlyCloseCoverRow extends Polymer.Element {
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
              <button @click=${this.callCloseService}>Close</button>
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

  callCloseService(ev) {
    const data = {
      entity_id: this._config.entity,
    };
    this.hass.callService('cover', 'close_cover', data);
  }
}
