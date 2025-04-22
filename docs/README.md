# Smart Notification Router Documentation

Welcome to the documentation for the Smart Notification Router add-on for Home Assistant.

## Table of Contents

- [User Documentation](#user-documentation)
- [Development Documentation](#development-documentation)
- [Roadmap](#roadmap)

## User Documentation

- [Installation Guide](../MANUAL_INSTALL.md) - How to install the add-on
- [Configuration Guide](../README.md) - How to configure the add-on
- [Troubleshooting](../README.md) - Common issues and solutions

## Development Documentation

- [Project Structure](../CLAUDE.md) - Overview of the codebase structure
- [Release History](../smart_notification_router/CHANGELOG.md) - Full version history and changes

## Roadmap

### Current Development: Tag-Based Routing

We're currently working on a major enhancement to the Smart Notification Router that will leverage Home Assistant's tag system to create a more dynamic, context-aware notification system.

- [Tag-Based Routing Design Document](./tag_based_routing_design.md) - Technical design for the new feature
- [Tag-Based Routing Implementation Plan](./tag_based_routing_implementation.md) - Detailed implementation roadmap

### Key Features in Development

1. **Tag-Based Audience Resolution**: Define audiences using tag expressions instead of static lists
2. **Context-Aware Routing**: Route notifications based on user presence and device status
3. **Dynamic Service Selection**: Automatically choose the best notification method based on context
4. **Enhanced Tag Management UI**: UI for creating and managing tag-based routing rules

Development is scheduled to begin in May 2025. If you'd like to contribute or provide feedback on the design, please open an issue on the GitHub repository.