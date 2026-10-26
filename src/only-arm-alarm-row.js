import {OnlyServiceRow} from './only-service-row.js';

/**
 * An alarm panel row that can arm but not disarm. It only offers changes to a more
 * secure state: going from armed away to armed home would turn off the indoor
 * sensors, which is a partial disarm. For night, vacation and custom bypass it
 * isn't clear which change is more secure, so it offers none.
 */
export class OnlyArmAlarmRow extends OnlyServiceRow {
  static domain = 'alarm_control_panel';
  static actions = [
    {
      id: 'arm_away',
      service: 'alarm_arm_away',
      labelKey: 'ui.card.alarm_control_panel.arm_away',
      fallback: 'Arm away',
      enabledWhen: (state) => state === 'disarmed' || state === 'armed_home',
    },
    {
      id: 'arm_home',
      service: 'alarm_arm_home',
      labelKey: 'ui.card.alarm_control_panel.arm_home',
      fallback: 'Arm home',
      enabledWhen: (state) => state === 'disarmed',
    },
  ];
}
