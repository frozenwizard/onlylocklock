![GitHub](https://img.shields.io/github/license/frozenwizard/onlylocklock)
![GitHub all releases](https://img.shields.io/github/downloads/frozenwizard/onlylocklock/total)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/frozenwizard/onlylocklock)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/integration)
# onlylocklock

This is a custom entity row for locks and covers in Home Assistant.  The intent is to expose the locks/covers so that they can only be locked/closed and not be unlocked/opened through the ui.  This is good for wall tablets or for users with restricted access.

This entity row only allows the lock command to be called on a lock and prevents the more-info popup from being shown.  It looks like a normal lock row. Similarly, the only close cover row only allows the close_cover command to be called on a cover.
# Usage
Add the type "custom:only-lock-lock-row" to your lock or "custom:only-close-cover-row" to your cover. Configuration is the same for both types in that they only have entity to be configured.  Note that cover is intended an only tested on "Garage doors", it will work on other cover types.

## Example
```yaml
entity: lock.front_door
type: custom:only-lock-lock-row
```
Or
```yaml
entity: cover.garage_door
type: custom:only-close-cover-row
```


### Inside an Entities Card Configuration
```yaml
type: entities
entities:
- entity: lock.front_door
  type: custom:only-lock-lock-row
```

![Demo](images/Demo.gif)

# Roadmap
In general, the intended purpose of this is complete, outside of maintenance/cleanup.  However, there are some optional features I want to add.
- Add battery level icon next to lock
  - Requires setting a battery sensor entity per lock.
- Allow specific user to unlock and view the more info popup.
- Support theming?