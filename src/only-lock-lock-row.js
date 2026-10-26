import {OnlyServiceRow} from './only-service-row.js';

/** A lock row that can lock but not unlock. */
export class OnlyLockLockRow extends OnlyServiceRow {
  static domain = 'lock';
  static actions = [{
    id: 'lock',
    service: 'lock',
    labelKey: 'ui.card.lock.lock',
    fallback: 'Lock',
    enabledWhen: (state) => !['locked', 'locking'].includes(state),
  }];
}
