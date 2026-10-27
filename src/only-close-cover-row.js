import {OnlyServiceRow} from './only-service-row.js';

/** A cover row that can close but not open. */
export class OnlyCloseCoverRow extends OnlyServiceRow {
  static domain = 'cover';
  static actions = [{
    id: 'close_cover',
    service: 'close_cover',
    labelKey: 'ui.card.cover.close_cover',
    fallback: 'Close cover',
    enabledWhen: (state) => !['closed', 'closing'].includes(state),
  }];
}
