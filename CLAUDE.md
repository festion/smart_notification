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
  - **templates/index.html**: Main dashboard template
  - **static/js/script.js**: JavaScript for UI interactivity
  - **static/css/styles.css**: CSS styles for the UI

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

### v2.0.0-alpha.26
- Complete CSS rewrite with pure inline styles for maximum compatibility
- Added floating debug panel with real-time logging
- Made emergency UI compatible with Home Assistant ingress
- Fixed path handling in emergency notification test UI
- Added dynamic URLs for all debug endpoints
- Enhanced visibility with stronger style enforcement
- Improved emergency access via debug panel link
- Added keyboard shortcut to toggle debug panel (Ctrl+Shift+D)

### v2.0.0-alpha.25
- Resolved grey UI rendering issue with emergency CSS fixes
- Added backup emergency UI at /emergency endpoint for testing
- Added keyboard shortcut (Ctrl+Shift+O) to toggle debug outlines
- Forced all dashboard sections to be visible by default
- Improved UI visibility with !important CSS rules
- Added version-specific CSS cache breaking
- Added direct notification testing through emergency UI

### v2.0.0-alpha.24
- Complete overhaul of web UI loading and error handling
- Added robust error tracing and debugging for each component initialization
- Added fallback UI that activates if main JavaScript fails to load
- Enhanced static file handling with explicit permissions
- Added visual indicator to show when JavaScript is working correctly
- Improved error reporting in browser console
- Added detailed static file inspection in debug endpoints
- Added version number to UI title and console logs

### v2.0.0-alpha.23
- Fixed icon image file consistency between repository root and add-on directory
- Optimized icon file size from 1.1MB to 3.8KB for faster loading
- Updated Dockerfile to copy icon files to root locations for better visibility
- Added additional docker build debugging for image issues
- Forced container rebuild to pick up latest UI changes

### v2.0.0-alpha.22
- Fixed icon display in Home Assistant add-on store by removing explicit icon reference
- Improved script.js navigation debugging with better section selection
- Added more detailed console logging for UI navigation issues
- Enhanced script.js error handling for section loading

### v2.0.0-alpha.21
- Fixed "manifest unknown" Docker image pull error
- Removed image parameter from config.json to allow local building
- Fixed add-on installation issues related to non-existent Docker image

### v2.0.0-alpha.20
- Fixed icon display issue in the Home Assistant add-on store
- Added image parameter to config.json for proper store display
- Ensured icon.png and logo.png are consistent across all locations
- Added icon.png inside the add-on directory for proper reference
- Standardized icon paths for maximum compatibility

### v2.0.0-alpha.19
- Fixed 'Unknown error, see supervisor' issue during add-on update
- Completely restructured audience configuration to use string-based JSON
- Changed from 'audiences' to 'audience_config' in options schema for better validation
- Added enhanced error handling and debugging for audience configuration
- Maintained backward compatibility with previous configuration formats

### v2.0.0-alpha.18
- Fixed invalid schema format issue: 'dict' is not a recognized schema type
- Changed audiences schema from 'dict' to 'str' for maximum compatibility
- Fixed issue with add-on not appearing in the store
- Updated to use only standard schema types recognized by Home Assistant

### v2.0.0-alpha.17
- Fixed Supervisor timeout when reloading add-ons
- Simplified schema structure to improve loading time
- Changed audiences schema from nested structure to simple dict type
- Optimized configuration for better compatibility with Home Assistant

### v2.0.0-alpha.16
- Fixed schema validation error in config.json
- Improved schema compatibility with the Home Assistant add-on store
- Fixed "expected string or buffer for dictionary value @ data['schema']['audiences']['str?']" error

### v2.0.0-alpha.15
- Fixed icon reference inconsistency between repository.json and config.json
- Updated config.json to use icon.png instead of logo.png for add-on store compatibility
- Ensured proper icon display in the Home Assistant add-on store
- Updated version numbers across all files

### v2.0.0-alpha.14
- Fixed navigation links on sidebar to work properly
- Fixed JSON parsing issue with test notifications
- Improved navigation system with javascript handlers
- Added URL hash-based navigation for better linking
- Enhanced form submission with FormData instead of JSON
- Added error handling for various content types
- Fixed layout issues with navigation sections
- Unified navigation interface across all pages

### v1.0.36
- Redesigned navigation sidebar with improved structure
- Added debug mode toggle with keyboard shortcut (Ctrl+Shift+D)
- Improved visual feedback for active navigation items
- Enhanced UI consistency across all pages
- Updated logo and product name in header
- Added highlighting effect for navigation targets
- Cleaned up legacy navigation items from v1.0
- Improved styling for dashboard elements

### v1.0.35
- Completely rebuilt GUI navigation system with section switching
- Added fully functional button interactions across the dashboard
- Implemented context-aware UI updates based on user role
- Enhanced test notification feedback with real-time history updates
- Added help dialogs and tooltips for improved user experience
- Improved user preferences management with visual confirmation
- Fixed inconsistent navigation between dashboard sections
- Added animation effects and visual feedback for user interactions
- Implemented modular JavaScript with comprehensive JSDoc documentation

### v1.0.34
- Added tag-based routing system for dynamic notification targeting
- Implemented tag expression parser with AND, OR, NOT logical operators
- Enhanced Home Assistant API client with tag resolution capabilities
- Added demo script showcasing tag-based notification routing
- Created detailed implementation documentation for tag-based routing
- Added support for context-aware notification delivery
- Improved entity tag resolution and caching for better performance
- Extended API with new endpoints for tag-based routing
- Added support for different notification service types (mobile, speakers, etc.)

### v1.0.33
- Fixed "Invalid audiences format" warning in logs
- Improved options loading from Home Assistant configuration
- Fixed white text on gray background in UI for better visibility
- Enhanced text contrast throughout the interface
- Ensured consistent text colors for all UI elements
- Added explicit background colors for better readability
- Improved button text visibility with higher contrast

### v1.0.32
- Enhanced services API endpoint for better integration
- Improved notification_config.yaml with detailed documentation
- Added service categorization by type (mobile, dashboard, media)
- Added example audience configurations for common use cases
- Improved service descriptions for UI integration
- Enhanced code to better reflect the audience/target design
- Added detailed comments on severity levels

### v1.0.31
- Fixed "Invalid audiences type" error messages in logs
- Added robust config validation and repair on load
- Enhanced config structure validation for all components
- Reduced log verbosity for production use
- Added DEBUG_CONFIG environment variable for optional diagnostics
- Improved error handling for malformed YAML configuration
- Fixed audience type issues in multiple functions

### v1.0.30
- Fixed notification JSON parsing errors
- Added robust error handling for audience format variations
- Enhanced notification API endpoint with better error messages
- Fixed JSON format issues in notification submission
- Added detailed logging for notification processing
- Improved audience type handling to support string inputs
- Added diagnostic information for payload formatting

### v1.0.29
- Fixed UI style to match Home Assistant design
- Added CSS variables for Home Assistant theme compatibility
- Fixed buttons and form elements to follow HA styling
- Fixed "[object Object]" issue with custom CSS hiding
- Enhanced test notification functionality
- Improved diagnostics for troubleshooting config issues
- Added direct CSS overrides for better HA integration

### v1.0.28
- Fixed UI issues: buttons not working and "[object Object]" display in audiences
- Added fallback JavaScript to ensure UI functionality works
- Fixed JavaScript to properly handle different service data types
- Copied icon files to add-on directory to fix broken icon display
- Added debug logging to trace JavaScript initialization
- Implemented browser console logging for UI debugging

### v1.0.27
- Fixed Jinja2 template error: "jinja2.exceptions.UndefinedError: 'str object' has no attribute 'items'"
- Added defensive code to handle invalid config structure
- Fixed template to use the correct iteration method for audiences
- Added more logging for debugging template rendering issues
- Enhanced error handling to prevent application crashes

### v1.0.26
- Fixed Windows line ending (CRLF) issues in shell scripts
- Added automatic line ending conversion in Dockerfile and startup
- Modified S6 service script to properly handle scripts with Windows line endings
- Added additional debugging output for script execution
- Enhanced permissions script to fix line endings at startup

### v1.0.25
- Fixed broken icon display in the repository
- Fixed icon references in repository.json and repository.yaml
- Updated hacs.json with better configuration
- Fixed URL references to point to the correct repository
- Improved repository configuration files

### v1.0.24
- Fixed "unable to exec bashio: No such file or directory" error
- Replaced bashio with standard bash scripts to avoid dependency issues
- Updated run.sh to use standard shell commands instead of bashio functions
- Modified S6 service scripts to use regular bash
- Fixed permission script to be compatible with the base image

### v1.0.23
- Fixed critical "unable to exec run: Permission denied" error with S6 service
- Added dedicated script in cont-init.d to fix permissions at startup
- Set explicit permissions for all service scripts in the Dockerfile
- Added multiple permission checks and fixes at different stages of initialization
- Improved permission handling for the run script

### v1.0.22
- Fixed 502 Bad Gateway error when starting the addon
- Added comprehensive error handling and logging in run.sh
- Enhanced Flask application configuration with debug mode
- Fixed directory and file permissions issues
- Added missing Python dependencies required by Flask
- Improved S6 service script with better error detection
- Added directory existence checks and creation with proper permissions

### v1.0.21
- Switched to community add-on base image (ghcr.io/hassio-addons/base:12.2.7)
- Removed custom S6 overlay configuration in favor of add-on base image
- Updated run.sh script to use bashio for proper Home Assistant integration
- Simplified Dockerfile and service structure
- Fixed init issues by properly using the community add-on base image
- Set init:false in config.json to use the base image's init system

### v1.0.20
- Added extensive debugging and logging
- Created diagnostic scripts for troubleshooting
- Added cont-init.d scripts for proper initialization
- Implemented detailed logging throughout startup process
- Added process tree analysis and S6 diagnostics

### v1.0.19
- Completely restructured S6 overlay integration
- Added proper S6 service structure for Home Assistant
- Implemented S6 long-running service configuration
- Created S6-compatible run scripts
- Fixed container entrypoint issue

### v1.0.18
- Fixed Docker image format issues
- Created separate start.sh script for proper execution
- Fixed Home Assistant add-on Docker build requirements
- Used valid Docker image format in build.json
- Added explicit file-based startup script

### v1.0.17
- Completely rebuilt container using official Python Alpine image
- Removed all S6 overlay dependencies to fix PID 1 issues
- Implemented standalone startup script with configuration generation
- Simplified container to a single process application
- Added direct execution of Python application

### v1.0.16
- Fixed Alpine Linux compatibility issues
- Switched from apt-get to apk for package installation
- Updated Python package names for Alpine
- Removed --break-system-packages flag (not needed in Alpine)
- Fixed package installation commands for Alpine Linux base

### v1.0.15
- Fixed "manifest unknown" error during installation
- Switched to official homeassistant base images
- Changed Docker image source for better compatibility

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
7. Complete implementation of navigation section switching
8. Functional admin configuration UI with validation
9. User preferences persistence via Home Assistant API