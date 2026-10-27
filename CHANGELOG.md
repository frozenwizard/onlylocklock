# Changelog

## Unreleased
### Changes
* The alarm row only offers arming to a more secure state. Arm home is disabled once the alarm is armed away, so the row can't be used for a partial disarm, and neither button is offered in night, vacation or custom bypass mode
* Buttons are disabled when they don't apply: the lock is already locked, the cover is already closed, or the entity is unavailable
* Button labels come from Home Assistant's translations and follow the user's language. In English they now read "Close cover", "Arm away" and "Arm home". The new `labels` option overrides them
* The entity's state shows under its name
* The config can no longer turn `tap_action`, `hold_action` or `double_tap_action` back on, so the more-info popup never opens
* A missing entity, an entity of the wrong type or an unknown label is now a configuration error
* The rows no longer appear in the card picker, where they didn't work as cards
### Fixes
* Lint now catches undefined variables (`eslint:recommended`), which would have caught the v0.6 breakage
* Removed leftover Polymer code from all three rows (no behavior change)
* A failed call, such as locking a lock that needs a code, no longer causes an uncaught error. Home Assistant still shows its error message
* Buttons are disabled until a call finishes, so repeated taps send only one call
* Loading the file twice no longer throws an error
* The rows re-render only when their own entity changes, not on every Home Assistant update
* The rows bundle their own copy of Lit instead of borrowing it from Home Assistant's dashboard
* The buttons use Home Assistant theme colors, and screen readers announce the entity name with each button
### Maintenance
* CI runs on Node 24 with current GitHub Actions
* Integration tests: Playwright drives the rows in a real Home Assistant running in Docker, on every pull request
* ESLint 10 with a flat config and the Lit and web component rules, replacing ESLint 8 and the unmaintained Google style config
* The source is in `src/` and is bundled with esbuild for the same browsers as Home Assistant, back to iOS 12 and Chrome 61, so old wall tablets keep working
* README: corrected the alarm service names, documented the options, and added a note that the rows only hide controls

## v0.6.1 (21-05-2023)
Fixes v0.6: the close cover row still extended `Polymer.Element` after Polymer was removed. Depending on your Home Assistant version, this broke all three rows or left the cover row empty.

## v0.6 (20-05-2023)
Removing Polymer

**Broken release:** depending on your Home Assistant version, all three rows failed to load or the cover row was empty. Upgrade to v0.6.1.

## v0.5 (15-11-2022)
Simplifies importing the row files

## v0.4 (14-11-2022)
Adds new only arm alarm functionality

## v0.3.1 (09-04-2022)
### Bug Fixes
Fixes close cover service call failing

## v0.3 (09-04-2022)
Adds new only close cover functionality

## v0.2 (21-02-2022)
This is a minor code improvement release focusing on the internals only, no new features have been added.
### Features/Improvements
* Got published to HACS default
* Added JS linting
* Added badges
* Minor code cleanup/formatting

## v0.1 (05-02-2022)
### Features
* Initial Release
* Added only-lock-lock-row.js and initial features
* Repo setup
