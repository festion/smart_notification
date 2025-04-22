# Tag-Based Routing System

This module implements the tag-based routing functionality for the Smart Notification Router v2. It enables dynamic, context-aware notification routing based on tag expressions that match Home Assistant entities.

## Components

### Tag Expression Parser

The `TagExpressionParser` converts string tag expressions into a parse tree that can be evaluated against entity tags. It supports the following operators:

- `+` (AND): Both expressions must be true
- `|` (OR): Either expression must be true
- `-` (NOT): First expression must be true, second expression must be false

#### Example Expressions

- `user:john` - All entities tagged with "user:john"
- `user:john+device:mobile` - All mobile devices owned by John
- `area:kitchen+device:speaker` - All speakers in the kitchen
- `user:john|user:jane` - All entities belonging to either John or Jane
- `area:home-area:bedroom` - All entities in the home but not in the bedroom

### Home Assistant API Client

The `HomeAssistantAPIClient` provides an interface to the Home Assistant REST API for retrieving entity states, tags, and other information needed for tag resolution and routing.

Key features:
- Entity state retrieval
- Tag-based entity querying
- Service discovery and categorization
- Notification sending

### Tag Resolution Service

The `TagResolutionService` resolves tag expressions to Home Assistant entities by evaluating the expressions against entity tags.

Features:
- Expression to entity resolution
- Caching for performance optimization
- Backward compatibility with traditional audiences

### Context Resolver

The `ContextResolver` determines the best notification targets based on user context, device states, and notification priority.

Features:
- User presence detection
- Device state monitoring
- Context-aware target selection

### Routing Engine

The `RoutingEngine` makes routing decisions based on tag expressions, context, and routing rules.

Features:
- Context-aware routing
- Deduplication
- Notification tracking
- Multiple service support

### Service Discovery

The `ServiceDiscovery` module automatically discovers and categorizes Home Assistant notification services.

Features:
- Service discovery by type
- Service capability detection
- Category-based service selection

## API Endpoints

The tag-based routing system provides the following API endpoints:

- `POST /api/v2/notify` - Send a notification using tag-based routing
- `POST /api/v2/resolve-tag` - Resolve a tag expression to entities
- `GET /api/v2/user-context/<user_id>` - Get context for a user
- `GET /api/v2/services` - Get available notification services
- `GET /api/v2/notification-history` - Get notification history

## Usage

### Sending a Notification

```http
POST /api/v2/notify
Content-Type: application/json

{
  "title": "Temperature Alert",
  "message": "Living room temperature is high",
  "severity": "high",
  "target": "user:john+area:home"
}
```

### Tag Expression Examples

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

To ensure consistent tag usage, follow these naming conventions:

- `user:{username}` - Entities associated with a specific user
- `area:{area_name}` - Entities in a specific area
- `device:{device_type}` - Entities of a specific device type
- `priority:{level}` - Notification priority for entities
- `time:{period}` - Entities for specific time periods

## Context-Aware Routing

The system determines the best notification targets based on:

1. User presence (home/away)
2. Device states (active/inactive)
3. Notification priority (low/normal/high)
4. Time of day

This ensures notifications are delivered to the most appropriate devices in each context.

## Migration from v1

The tag-based routing system maintains backward compatibility with v1 audiences. When a notification specifies an audience name instead of a tag expression, the system falls back to v1 routing logic.

To migrate from v1 to v2:
1. Add appropriate tags to your Home Assistant entities
2. Update your notification calls to use `target` instead of `audience`
3. Replace audience names with tag expressions

Example migration:
```diff
- "audience": "mobile"
+ "target": "user:john+device:mobile"
```

## Demo

See the `examples/tag_parser_demo.py` script for a demonstration of the tag expression parser and entity matching.