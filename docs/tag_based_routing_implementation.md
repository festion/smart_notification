# Tag-Based Notification Routing Implementation Guide

This document provides implementation details and examples for using the tag-based notification routing system in the Smart Notification Router.

## Overview

The tag-based routing system extends the traditional audience-based routing with a more flexible and dynamic approach using entity tags from Home Assistant. This allows for routing notifications based on user presence, device capabilities, and location context.

## Architecture

The implementation consists of several key components:

1. **Tag Expression Parser**: Parses tag expressions into structured format
2. **Tag Resolution Service**: Resolves tag expressions to Home Assistant entities
3. **Context Resolver**: Determines routing context (user presence, device states)
4. **Routing Engine**: Makes intelligent routing decisions
5. **Service Discovery**: Identifies available notification services
6. **Entity Tag Manager**: Manages entity tags for resolution

## Tag Expression Syntax

Tag expressions use a simple syntax to define target entities:

- **Simple tag**: `user:john`
- **AND operator**: `user:john+device:mobile`
- **OR operator**: `user:john|user:jane`
- **NOT operator**: `area:home-area:bedroom`
- **Parentheses for grouping**: `(user:john+device:mobile)|(user:jane+device:tablet)`

### Tag Naming Conventions

Tags follow a namespace:value format to organize entities:

- `user:<username>` - Identifies a user (e.g., `user:john`)
- `device:<type>` - Identifies device type (e.g., `device:mobile`, `device:speaker`)
- `area:<name>` - Identifies location (e.g., `area:living_room`, `area:home`)
- `priority:<level>` - Identifies priority (e.g., `priority:high`)

## API Endpoints

The tag-based routing system provides several API endpoints:

### 1. Send Notification

```
POST /api/v2/notify
```

**Request body**:
```json
{
  "title": "Temperature Warning",
  "message": "Kitchen temperature has exceeded 30°C",
  "severity": "high",
  "target": "user:john+device:mobile|area:kitchen+device:display"
}
```

**Response**:
```json
{
  "status": "ok",
  "message": "Notification routed to 2 services",
  "services": ["notify.mobile_app_pixel", "media_player.kitchen_display"],
  "tracking_id": "abc123"
}
```

### 2. Resolve Tag Expression

```
POST /api/v2/resolve-tag
```

**Request body**:
```json
{
  "expression": "user:john+device:mobile"
}
```

**Response**:
```json
{
  "status": "ok",
  "expression": "user:john+device:mobile",
  "entities": ["notify.mobile_app_pixel", "notify.mobile_app_watch"],
  "count": 2
}
```

### 3. Get User Context

```
GET /api/v2/user-context/user:john
```

**Response**:
```json
{
  "status": "ok",
  "user_id": "user:john",
  "context": {
    "user_id": "john",
    "presence": "home",
    "location": "living_room",
    "devices": [
      {
        "entity_id": "notify.mobile_app_pixel",
        "state": "connected",
        "attributes": {
          "friendly_name": "John's Pixel",
          "device_type": "mobile"
        }
      }
    ]
  }
}
```

### 4. Get Available Services

```
GET /api/v2/services
```

**Response**:
```json
{
  "status": "ok",
  "services": {
    "notify": ["notify.mobile_app_pixel", "notify.telegram"],
    "media_player": ["media_player.living_room_speaker"],
    "persistent": ["persistent_notification.create"]
  }
}
```

## Integration with Home Assistant

### Entity Tags in Home Assistant

The tag-based system relies on entity tags in Home Assistant. These can be set through:

1. **Home Assistant UI**: In the entity's configuration page
2. **YAML Configuration**: Using the `tags` attribute
3. **Entity Tag Manager API**: Using the `/api/v2/entity-tags` endpoint

Example Home Assistant configuration with entity tags:

```yaml
# Example automation with entity tags
automation:
  - id: low_battery_notification
    alias: "Low Battery Notification"
    trigger:
      - platform: numeric_state
        entity_id: sensor.phone_battery
        below: 20
    action:
      - service: rest_command.smart_notification
        data:
          title: "Low Battery Warning"
          message: "Your phone battery is below 20%"
          severity: "high"
          target: "user:john+device:mobile"

# Example notify service with tags
notify:
  - name: johns_phone
    platform: mobile_app
    target: pixel_6
    tags:
      - user:john
      - device:mobile
      - priority:high
```

### Using Tag-Based Routing in Home Assistant

1. **Create a REST Command**:

```yaml
rest_command:
  smart_notification:
    url: http://localhost:8080/api/v2/notify
    method: POST
    content_type: application/json
    payload: >
      {
        "title": "{{ title }}",
        "message": "{{ message }}",
        "severity": "{{ severity }}",
        "target": "{{ target }}"
      }
```

2. **Call from Automations**:

```yaml
automation:
  - alias: "Motion Detected Notification"
    trigger:
      - platform: state
        entity_id: binary_sensor.living_room_motion
        to: "on"
    action:
      - service: rest_command.smart_notification
        data:
          title: "Motion Detected"
          message: "Motion detected in the living room"
          severity: "normal"
          target: "user:home+device:mobile"
```

## Example Use Cases

### 1. Context-Aware Notifications

Send notifications to the most appropriate device based on user presence:

```yaml
# If user is home, send to home speakers
# If user is away, send to mobile devices
rest_command.smart_notification:
  title: "Package Delivered"
  message: "Your package has been delivered"
  severity: "normal"
  target: "user:john+area:home+device:speaker|user:john+device:mobile"
```

### 2. Emergency Alerts

Send emergency alerts to all family members regardless of presence:

```yaml
rest_command.smart_notification:
  title: "ALERT: Smoke Detected"
  message: "Smoke detector activated in the kitchen"
  severity: "critical"
  target: "user:all+device:*"
```

### 3. Room-Specific Announcements

Send announcements to specific rooms:

```yaml
rest_command.smart_notification:
  title: "Dinner Ready"
  message: "Dinner is ready in the kitchen"
  severity: "info"
  target: "area:living_room+device:speaker|area:bedroom+device:speaker"
```

### 4. Time-Sensitive Notifications

Send time-sensitive notifications to active devices:

```yaml
rest_command.smart_notification:
  title: "Video Doorbell"
  message: "Someone is at the front door"
  severity: "high"
  target: "user:home+device:display|user:all+device:mobile"
```

## Demo Script

The repository includes a demonstration script that showcases tag-based routing:

```bash
# Run the tag-based notification demo
cd /path/to/smart_notification
python examples/tag_based_notification.py --url http://localhost:8080
```

This script demonstrates:
1. How tag expressions are resolved to entities
2. How the routing engine selects appropriate targets
3. How notifications are sent to different services based on context

## Best Practices

1. **Use Specific Tags**: Create specific and meaningful tags for entities
2. **Test Expressions**: Use the `/api/v2/resolve-tag` endpoint to test expressions
3. **Check User Context**: Understand user presence with `/api/v2/user-context`
4. **Fallback Targets**: Include OR conditions for fallback targets
5. **Tag Hierarchy**: Create a logical hierarchy of tags (e.g., `area:home` for all home areas)

## Troubleshooting

Common issues and solutions:

1. **No Matching Entities**:
   - Check that entities have appropriate tags
   - Verify tag expression syntax
   - Review Home Assistant entity configuration

2. **Incorrect Routing**:
   - Check user presence information
   - Review entity state information
   - Verify routing rules in configuration

3. **Service Discovery Issues**:
   - Ensure Home Assistant API is accessible
   - Check service naming and compatibility
   - Review Home Assistant service configuration

## Conclusion

The tag-based routing system provides a powerful and flexible way to deliver notifications based on dynamic context. By leveraging Home Assistant's entity system and user presence information, notifications can be intelligently routed to the most appropriate devices at the right time.