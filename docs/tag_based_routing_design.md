# Tag-Based Notification Routing - Design Document

## Overview

This document outlines the design for enhancing the Smart Notification Router with tag-based routing capabilities. By leveraging Home Assistant's entity tag system, we can create a more dynamic, context-aware notification system that automatically routes messages based on user-device relationships, presence information, and location context.

## Current Limitations

The current notification router has several limitations:

1. **Static Audience Definitions**: Audiences must be manually configured and maintained.
2. **Lack of User-Device Relationships**: No built-in understanding of which devices belong to which users.
3. **No Context Awareness**: Unable to route notifications based on user presence or location.
4. **Manual Service Configuration**: Services must be explicitly listed for each audience.
5. **No Dynamic Routing**: Cannot automatically select the best notification target based on context.

## Design Goals

1. **Automated User-Device Relationships**: Use tags to automatically associate users with their devices.
2. **Context-Aware Routing**: Route notifications based on user presence, device location, and notification priority.
3. **Flexible Tag-Based Audiences**: Define audiences using tag expressions rather than static lists.
4. **Integration with Home Assistant**: Leverage Home Assistant's native tag system and entity relationships.
5. **Backward Compatibility**: Maintain support for existing audience configurations.

## Key Components

### 1. Tag Resolution System

The tag resolution system will translate tag expressions into concrete notification targets:

- **Tag Expression Syntax**: 
  - Simple tag: `user:john`
  - Multiple tags: `user:john+device:mobile`
  - Negative matching: `area:home-area:bedroom`
  - OR conditions: `user:john|user:jane`
  
- **Resolution Process**:
  1. Parse tag expression into components
  2. Query Home Assistant API for entities with matching tags
  3. Apply filtering and combination logic
  4. Return list of resolved entities

### 2. Context-Aware Routing Engine

The routing engine will determine the best way to deliver notifications based on context:

- **Context Factors**:
  - User presence (home/away)
  - Device states (active/inactive)
  - Notification priority
  - Time of day
  - Historical notification interaction data

- **Routing Decisions**:
  - Which device types to use (mobile, speaker, display)
  - Which notification services to invoke
  - Delivery timing (immediate vs. delayed)
  - Notification format (brief vs. detailed)

### 3. Home Assistant Integration Layer

This layer will handle all interactions with the Home Assistant API:

- **API Functions**:
  - Fetch entities by tag
  - Get entity states
  - Get user presence information
  - Discover notification services
  - Send notifications via services

- **Authentication**:
  - Use Home Assistant Long-Lived Access Tokens
  - Support OAuth2 for secure API access

### 4. Tag Management UI

The UI will allow users to manage tag-based routing configurations:

- **Features**:
  - View available tags from Home Assistant
  - Create tag-based audience definitions
  - Test tag resolution
  - Configure routing rules
  - Preview routing decisions

### 5. Notification Service Discovery

This component will automatically discover and categorize notification services:

- **Service Categories**:
  - Mobile notifications
  - Voice announcements
  - Visual displays
  - External integrations (email, SMS, etc.)

- **Metadata Collection**:
  - Service capabilities
  - Associated devices
  - User preferences

## Data Models

### Tag Expression
```json
{
  "expression": "user:john+device:mobile", 
  "name": "John's Mobile Devices",
  "description": "All mobile devices belonging to John"
}
```

### Routing Rule
```json
{
  "name": "Emergency Alerts",
  "condition": {
    "severity": "emergency"
  },
  "routing": {
    "primary_target": "user:all+device:mobile",
    "secondary_target": "area:home+device:speaker",
    "require_confirmation": true,
    "retry_interval": 300,
    "max_retries": 3
  }
}
```

### User Context
```json
{
  "id": "john",
  "name": "John Smith",
  "is_admin": true,
  "presence": {
    "home": true,
    "current_area": "living_room"
  },
  "devices": [
    {
      "id": "mobile_john_pixel",
      "name": "John's Pixel",
      "type": "mobile",
      "notification_service": "notify.mobile_app_pixel"
    },
    {
      "id": "speaker_living_room",
      "name": "Living Room Speaker",
      "type": "speaker",
      "notification_service": "media_player.living_room_speaker"
    }
  ],
  "tags": ["user:john", "role:admin"]
}
```

## Workflows

### 1. Notification Routing Workflow

1. Receive notification request with:
   - Title, message, severity
   - Target audience (tag expression or legacy audience name)

2. Resolve target audience:
   - If legacy audience name, use traditional lookup
   - If tag expression, resolve to entities using Tag Resolution System

3. Apply context-aware routing:
   - Check user presence for each resolved target
   - Determine best notification services based on context
   - Apply routing rules based on notification severity

4. Send notifications:
   - Invoke selected notification services
   - Track delivery and interaction status
   - Handle retries and escalations as needed

### 2. Configuration Workflow

1. User accesses Tag Management UI
2. System fetches available tags from Home Assistant
3. User creates tag-based audience definitions
4. User configures routing rules
5. System validates and saves configuration
6. Configuration is applied to the Routing Engine

## Technical Implementation

### API Endpoints

1. **GET /api/tags**
   - Fetch all available tags from Home Assistant

2. **GET /api/entities/bytag/{expression}**
   - Resolve entities matching a tag expression

3. **POST /api/audiences**
   - Create a new tag-based audience definition

4. **GET /api/services/discover**
   - Discover available notification services

5. **POST /api/notify**
   - Enhanced notification endpoint supporting tag expressions

### Configuration Structure

```yaml
# Enhanced configuration with tag support
tag_expressions:
  johns_devices:
    expression: "user:john"
    description: "All of John's devices"
  
  home_speakers:
    expression: "area:home+device:speaker"
    description: "All speakers in the home"

routing_rules:
  emergency:
    severity: "emergency"
    primary_target: "user:all+device:mobile"
    secondary_target: "area:home+device:speaker"
    require_confirmation: true
  
  information:
    severity: "low"
    primary_target: "user:{user}+device:preferred"
    fallback: "dashboard"

# Legacy support
audiences:
  mobile:
    services: ["notify.mobile_app"]
    min_severity: "high"
  
  dashboard:
    services: ["persistent_notification.create"]
    min_severity: "low"
```

## Integration with Home Assistant

### Tag System

Home Assistant allows entities to be tagged with arbitrary tags. We will use a naming convention for tags:

- `user:{username}` - Entities associated with a specific user
- `area:{area_name}` - Entities in a specific area
- `device:{device_type}` - Entities of a specific device type
- `priority:{level}` - Notification priority for entities

### API Integration

We will use the Home Assistant Websocket API for real-time updates on:
- Entity state changes
- User presence changes
- Device status changes

This allows the routing engine to always have the latest context for making routing decisions.

## Security Considerations

1. **API Authentication**: Use secure methods (OAuth2, Long-Lived Access Tokens) for Home Assistant API access
2. **Authorization**: Validate user permissions before allowing configuration changes
3. **Data Validation**: Sanitize and validate all tag expressions and routing rules
4. **Rate Limiting**: Implement rate limiting to prevent notification flooding
5. **Logging**: Log all routing decisions and notification deliveries for auditing

## Backward Compatibility

The enhanced system will maintain support for traditional audience-based routing:

1. **Legacy Configuration**: Continue supporting the existing audience configuration format
2. **Automatic Migration**: Provide tools to migrate from audiences to tag expressions
3. **Mixed Mode**: Allow mixing of traditional audiences and tag expressions during transition

## Future Enhancements

1. **Machine Learning**: Use ML to improve routing decisions based on user interaction history
2. **Rich Notifications**: Support for images, actions, and interactive elements
3. **Scheduled Delivery**: Allow scheduling notifications for optimal delivery times
4. **Notification Aggregation**: Group related notifications to reduce interruption
5. **Cross-User Coordination**: Ensure notifications are not duplicated across household members

## Conclusion

The tag-based routing enhancement will transform the Smart Notification Router from a static, configuration-heavy system to a dynamic, context-aware notification platform. By leveraging Home Assistant's entity relationships and tag system, we can create a more intelligent notification experience that automatically adapts to users' changing contexts and preferences.