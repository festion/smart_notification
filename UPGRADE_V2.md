# Smart Notification V2 Upgrade Guide

This document explains the new tag-based routing system for Smart Notification v2 and how to migrate from v1.

## What's New in v2

Smart Notification v2 introduces a tag-based routing system that enables dynamic, context-aware notification routing based on Home Assistant entity tags. This replaces the static audience definitions from v1 with a more flexible expression-based system.

### Key Features

1. **Tag Expression System**: Define notification targets using expressions like:
   - `user:john` - All entities tagged with "user:john"
   - `user:john+device:mobile` - All mobile devices owned by John
   - `area:home-area:bedroom` - All entities in home but not in bedroom

2. **Context-Aware Routing**: Routes notifications based on:
   - User presence
   - Device states
   - Notification priority
   - Time of day

3. **Home Assistant Integration**: Leverages Home Assistant's native tag system to:
   - Fetch entities by tag
   - Get entity states
   - Get user presence information

4. **Dynamic Routing**: Automatically selects the best notification target based on context rather than static configuration

## How to Upgrade

### 1. Tag Your Entities

Add tags to your Home Assistant entities in your `configuration.yaml`:

```yaml
homeassistant:
  customize:
    # User's mobile phone
    mobile_app.john_pixel:
      tags:
        - user:john
        - device:mobile
    
    # Living room speaker
    media_player.living_room_speaker:
      tags:
        - area:living_room
        - device:speaker
```

### 2. Update Your Notification Calls

Replace `audience` with `target` and update your notification payloads:

```yaml
# Old v1 way
service: rest_command.smart_notify
data:
  title: "Temperature Alert"
  message: "Living room temperature is high"
  severity: "high"
  audience: "mobile"

# New v2 way
service: rest_command.smart_notify_v2
data:
  title: "Temperature Alert"
  message: "Living room temperature is high"
  severity: "high"
  target: "user:john+device:mobile"
```

### 3. Define Your REST Command

Add the v2 REST command to your configuration:

```yaml
rest_command:
  smart_notify_v2:
    url: http://homeassistant.local:8080/api/v2/notify
    method: POST
    content_type: "application/json"
    payload: >
      {
        "title": "{{ title }}",
        "message": "{{ message }}",
        "severity": "{{ severity }}",
        "target": "{{ target }}"
      }
```

## Tag Expression Syntax

The tag expression parser supports the following operators:

- `+` (AND): Both tags must be present
- `|` (OR): Either tag must be present
- `-` (NOT): First tag must be present, second tag must not be present

### Example Expressions

1. Send to all mobile devices owned by John:
   ```
   user:john+device:mobile
   ```

2. Send to all devices in the living room:
   ```
   area:living_room
   ```

3. Send to all speakers in home areas except bedrooms:
   ```
   device:speaker+area:home-area:bedroom
   ```

4. Send to either John's or Jane's devices:
   ```
   user:john|user:jane
   ```

## Tag Naming Conventions

For consistent tag usage, follow these naming conventions:

- `user:{username}` - Entities associated with a specific user
- `area:{area_name}` - Entities in a specific area
- `device:{device_type}` - Entities of a specific device type
- `priority:{level}` - Notification priority for entities
- `time:{period}` - Entities for specific time periods

## Backward Compatibility

The v2 system maintains backward compatibility with v1 audiences. When a notification specifies an audience name instead of a tag expression, the system falls back to v1 routing logic.

## API Endpoints

The new v2 API is available at these endpoints:

- `POST /api/v2/notify` - Send a notification using tag-based routing
- `POST /api/v2/resolve-tag` - Resolve a tag expression to entities
- `GET /api/v2/user-context/<user_id>` - Get context for a user
- `GET /api/v2/services` - Get available notification services
- `GET /api/v2/notification-history` - Get notification history

## Examples

See the `examples/tag_based_notification.yaml` file for usage examples in Home Assistant automations.