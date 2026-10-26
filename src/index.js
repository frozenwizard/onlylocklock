import {OnlyArmAlarmRow} from './only-arm-alarm-row.js';
import {OnlyCloseCoverRow} from './only-close-cover-row.js';
import {OnlyLockLockRow} from './only-lock-lock-row.js';

// These are rows, not cards, so they aren't added to window.customCards.
const ROWS = {
  'only-arm-alarm-row': OnlyArmAlarmRow,
  'only-close-cover-row': OnlyCloseCoverRow,
  'only-lock-lock-row': OnlyLockLockRow,
};

for (const [tag, row] of Object.entries(ROWS)) {
  // The file can load twice, for example from both HACS and a manual resource.
  if (!customElements.get(tag)) customElements.define(tag, row);
}
