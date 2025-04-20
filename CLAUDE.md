# Smart Notification Router - Development Guide

This document provides technical details for development and maintenance of the Smart Notification Router.

## Project Structure

- **main.py**: Core application logic with Flask server implementation
- **notification_config.yaml**: Configuration file for audiences and severity levels
- **Dockerfile**: Container definition for deployment
- **run.sh**: Application startup script
- **requirements.txt**: Python dependencies
- **config.json**: Add-on configuration for Home Assistant
- **web/**: Web UI files

## Repository Structure

The repository is structured according to Home Assistant add-on requirements:
```
smart_notification/               # Repository root
├── README.md                     # Repository README
├── CLAUDE.md                     # Development documentation
├── repository.json               # Repository information
└── smart_notification_router/    # Add-on directory
    ├── config.json               # Add-on configuration
    ├── Dockerfile                # Add-on container definition
    ├── main.py                   # Main application code
    ├── requirements.txt          # Python dependencies
    ├── README.md                 # Add-on specific README
    ├── rootfs/                   # Add-on filesystem
    │   └── etc/services.d/smart-notification/
    │       └── run               # S6 service definition
    ├── web/                      # Web UI files
    └── ...                       # Other add-on files
```

## Core Components

### 1. Flask API Server

The application runs a Flask server exposing a `/notify` endpoint that processes notification requests and a web UI for configuration.

Key components:
- Message deduplication using SHA-256 hashing
- Configurable deduplication time window (default: 300 seconds)
- Request validation and parsing
- Web UI for configuration

### 2. Configuration System

The YAML configuration file supports:
- Multiple audience definitions
- Service routing per audience
- Minimum severity level filtering
- Customizable severity level hierarchy

### 3. Notification Routing Logic

The routing logic:
1. Receives a notification request with title, message, severity, and target audiences
2. Checks if the message is a duplicate (sent recently)
3. For each target audience:
   - Retrieves the audience configuration
   - Checks if the message severity meets the minimum threshold
   - Routes to all configured services for that audience if severity is sufficient

## Home Assistant Add-on Integration

The add-on integrates with Home Assistant using:
- Ingress for the web UI
- Home Assistant API for notification services
- Add-on configuration for storing user preferences
- S6 overlay for service management

## Release History

### v1.0.14
- Complete overhaul of Docker and S6 configuration
- Switched to python-specific base image
- Fixed S6 overlay issues by using simpler service script
- Changed startup command to use direct Python execution
- Added more S6 environment variables for stability
- Simplified Dockerfile and build process

### v1.0.13
- Removed image reference to fix installation error
- Reverted to building locally while keeping S6 fixes
- Added GitHub Actions workflow for future pre-built images
- Created GitHub Actions configuration for automated builds

### v1.0.12
- Fixed S6 overlay issues with process initialization
- Added pre-built Docker image support to avoid local builds
- Improved S6 service script with better error handling
- Added default configuration when options file is missing
- Added S6 behavior settings for better container stability

### v1.0.11
- Fixed pip installation issue in modern Debian
- Added --break-system-packages flag to pip installation
- Added fallback mechanism for system-only packages

### v1.0.10
- Fixed schema validation error for the audiences configuration
- Reverted to using match(.*) for audience schema
- Simplified schema to ensure compatibility with Home Assistant

### v1.0.9
- Reverted repository.json to working structure from v1.0.5
- Simplified add-on configuration to restore visibility in the Add-on Store
- Removed experimental Home Assistant API settings that may have caused issues
- Maintained schema improvements for audience configuration

### v1.0.8
- Fixed repository.json structure to match Home Assistant add-on repository requirements
- Updated the repository metadata with proper slug and add-ons list
- Ensures the add-on is visible in the Home Assistant Add-on Store

### v1.0.7
- Added Home Assistant API integration settings in config.json
- Added `ingress_entry` parameter to improve Ingress functionality
- Improved Dockerfile with proper permissions and dependencies
- Added fallback pip installation for requirements
- Fixed directories permission issues

### v1.0.6
- Fixed schema validation error in config.json (properly defined the audience schema)
- Created new icon files and fixed repository icon path
- Added SVG vector version of the icon for better scaling

### v1.0.5
- Fixed S6 overlay initialization error (s6-overlay-suexec: fatal: can only run as pid 1)
- Updated Dockerfile to properly use the S6 init system
- Changed service script to use exec for proper process management

### v1.0.4
- Fixed repository icon by adding proper reference in repository.json
- Corrected hacs.json filename (was incorrectly named hacs.jason)

### v1.0.3
- Version bump for stability improvements

### v1.0.2
- Updated repository structure to match Home Assistant add-on requirements
- Renamed add-on directory to smart_notification_router for clarity
- Updated configuration to use standard Home Assistant add-on conventions
- Fixed Dockerfile to use standard Home Assistant base image

### v1.0.1
- Updated repository structure to comply with Home Assistant add-on requirements
- Added build.json for add-on build configuration
- Fixed Home Assistant integration configurations:
  - Added hassio_api and hassio_role parameters
  - Updated initialization parameters in config.json
  - Added custom icon and panel configuration

### v1.0.0
- Initial release with basic notification routing
- Web UI for configuration
- Severity-based filtering
- Audience targeting
- Deduplication mechanism

## Development Guidelines

### Adding Features

1. **New Notification Channels**:
   - Add service entries to the appropriate audience in `notification_config.yaml`

2. **Audience Templates**:
   - Consider implementing audience templates for common configurations

3. **Enhanced Filtering**:
   - Add content-based filtering or time-based rules

### Testing

Test the notification API with:

```python
# Example test request
import requests

payload = {
    "title": "Test Notification",
    "message": "This is a test message",
    "severity": "high",
    "audience": ["mobile", "dashboard"]
}

response = requests.post("http://localhost:8099/notify", json=payload)
print(response.json())
```

## Future Improvements

1. Authentication for the API endpoint
2. Notification history and status tracking
3. Templating system for notification formatting
4. Direct integration with additional notification services
5. Enhanced error handling and recovery
6. Real-time notification preview in the web UI