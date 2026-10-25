# Changelog

## Unreleased
### Fixes
* Lint now catches undefined variables (`eslint:recommended`), which would have caught the v0.6 breakage
* Removed leftover Polymer code from all three rows (no behavior change)
### Maintenance
* CI runs on Node 24 with current GitHub Actions
* README: corrected the alarm service names, documented the `name` option, and added a note that the rows only hide controls

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
