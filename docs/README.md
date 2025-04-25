# Smart Notification Router Documentation

Welcome to the documentation for the Smart Notification Router add-on for Home Assistant.

## Table of Contents

- [User Documentation](#user-documentation)
- [Developer API](#developer-api)
- [Development Documentation](#development-documentation)
- [Feature Status](#feature-status)

## User Documentation

- [Installation Guide](../MANUAL_INSTALL.md) - How to install the add-on
- [Configuration Guide](../README.md) - How to configure the add-on
- [Upgrade Guide](../UPGRADE_V2.md) - How to upgrade to v2.0
- [Troubleshooting](../REINSTALL_GUIDE.md) - Common issues and solutions

## Developer API

The Smart Notification Router provides a RESTful API for sending notifications:

```http
POST /notify
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "This is a test message",
  "severity": "high",
  "audience": ["mobile", "dashboard"]
}
```

See [API Reference](#api-reference) below for complete documentation.

## Development Documentation

- [Project Structure](../CLAUDE.md) - Overview of the codebase structure
- [Release History](../CLAUDE.md) - Full version history and changes
- [Tag-Based Routing Design](./tag_based_routing_design.md) - Technical design for tag-based routing
- [Tag-Based Routing Implementation](./tag_based_routing_implementation.md) - Implementation details

## Feature Status

### Implemented Features (v2.0.0-alpha.32)

1. ✅ **Web Dashboard**: Full UI for notification management
2. ✅ **Audience Configuration**: Define and manage notification audiences
3. ✅ **Deduplication System**: Prevent duplicate notifications
4. ✅ **Notification History**: Track sent notifications
5. ✅ **REST API**: Complete RESTful API for sending and managing notifications
6. ✅ **Tag Management UI**: Basic interface for managing tag-based routing

### In Progress Features

1. 🔄 **Tag-Based Routing**: Dynamic routing based on entity tags
2. 🔄 **Context-Aware Routing**: Route based on presence and status
3. 🔄 **Tag Expression Parser**: Parser for tag expressions

## API Reference

### `POST /notify`

Send a notification.

**Request:**
```json
{
  "title": "Notification Title",
  "message": "Notification Message",
  "severity": "medium",
  "audience": ["mobile", "dashboard"]
}
```

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "message": "Notification processed",
  "details": {
    "title": "Notification Title",
    "message": "Notification Message", 
    "severity": "medium",
    "audiences": ["mobile", "dashboard"]
  }
}
```

### `GET /config`

Get current configuration.

**Response:**
```json
{
  "status": "ok",
  "config": {
    "audiences": {
      "mobile": {
        "services": ["notify.mobile_app_default"],
        "min_severity": "high"
      },
      "dashboard": {
        "services": ["persistent_notification.create"],
        "min_severity": "low"
      }
    },
    "severity_levels": ["low", "medium", "high", "emergency"]
  }
}
```

For more API endpoints, see the [CLAUDE.md](../CLAUDE.md) documentation.