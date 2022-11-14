/**
 *  Only Arm Alarm custom entity
 */
class OnlyArmAlarmRow extends Polymer.Element {
    static get template() {
        return Polymer.html`
          <style include="iron-flex iron-flex-alignment"></style>
          <style>
            mwc-button {
              top: 3px;
              height: 37px;
              margin-right: -0.57em;
            }
          </style>
          <hui-generic-entity-row hass="[[hass]]" config="[[_config]]"
            <div class="horizontal justified layout">
              <state-info hass="[[hass]]" state-obj="[[stateObj]]"></state-info>        
              <mwc-button on-click="_callArmAway">Arm Away</mwc-button>
              <mwc-button on-click="_callArmHome">Arm Home</mwc-button>
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

    _callArmHome(ev) {
        ev.stopPropagation();
        const data = {
            entity_id: this._config.entity,
        };
        this.hass.callService('alarm_control_panel', 'alarm_arm_home', data);
    }

    _callArmAway(ev) {
        ev.stopPropagation();
        const data = {
            entity_id: this._config.entity,
        };
        this.hass.callService('alarm_control_panel', 'alarm_arm_away', data);
    }
}

customElements.define('only-arm-alarm-row', OnlyArmAlarmRow);
