![GitHub](https://img.shields.io/github/license/frozenwizard/onlylocklock)
![GitHub all releases](https://img.shields.io/github/downloads/frozenwizard/onlylocklock/total)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/frozenwizard/onlylocklock)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/integration)
# onlylocklock

This project provides custom entity rows for locks, covers and alarm systems in Home Assistant.  The intent is to expose the locks/covers/alarm so that they can only be locked/closed/armed and not be unlocked/opened/disarmed through the ui.  This is good for wall tablets or for users with restricted access.

> **Note:** these rows only hide controls in the dashboard. They don't restrict what a user can do: anyone who can log in to Home Assistant can still unlock, open or disarm through other dashboards or the API.

The only lock lock row only allows the `lock` command to be called on a lock and prevents the more-info popup from being shown.  It looks like a normal lock row. Similarly, the only close cover row only allows the `close_cover` command to be called on a cover.  The only arm alarm row only allows `alarm_arm_home` or `alarm_arm_away` to be called on an alarm_control_panel.

Each row shows the entity's state under its name, and disables a button when it doesn't apply: when the lock is already locked, the cover is already closed, or the entity is unavailable. The alarm row only offers arming to a more secure state. Once the alarm is armed away, Arm home is disabled, because switching to home would turn off the indoor sensors. In night, vacation or custom bypass mode, neither button is offered.

Button labels come from Home Assistant's own translations, so they follow each user's language.
# Usage
Add the type "custom:only-lock-lock-row" to your lock or "custom:only-close-cover-row" to your cover or "custom:only-arm-alarm-row" to your security system. Note that the cover row is intended for, and only tested on, garage doors, but it should work with other cover types.

| Option | Description |
|--------|-------------|
| `entity` | Required. A lock, cover or alarm_control_panel entity, matching the row type. |
| `name` | Optional. Overrides the entity's name. |
| `labels` | Optional. Overrides button labels: `lock` for the lock row, `close_cover` for the cover row, and `arm_away` and `arm_home` for the alarm row. |

The rows ignore `tap_action`, `hold_action` and `double_tap_action`, so the more-info popup, with its unlock, open or disarm controls, never opens.

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
Or
```yaml
entity: alarm_control_panel.house
type: custom:only-arm-alarm-row
labels:
  arm_home: Home
  arm_away: Away
```

### Inside an Entities Card Configuration
```yaml
type: entities
entities:
- entity: lock.front_door
  type: custom:only-lock-lock-row
```

![Demo](images/Demo.gif)


# Status
This project is feature-complete and in maintenance mode. Each week, its dependencies and the Home Assistant version 
its tests run against are updated automatically, as long as the integration tests still pass, so a Home Assistant 
release that breaks the rows gets noticed. Bug reports are welcome, but no new features are planned.
