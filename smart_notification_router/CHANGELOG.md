# Smart Notification Router Changelog

## v2.0.0-alpha.16 (2025-04-23)
- Fixed schema validation error in config.json
- Improved schema compatibility with the Home Assistant add-on store
- Fixed "expected string or buffer for dictionary value @ data['schema']['audiences']['str?']" error

## v2.0.0-alpha.15 (2025-04-23)
- Fixed icon reference inconsistency between repository.json and config.json
- Updated config.json to use icon.png instead of logo.png for add-on store compatibility
- Ensured proper icon display in the Home Assistant add-on store
- Updated version numbers across all files

## v2.0.0-alpha.14 (2025-04-23)
- Fixed navigation links on sidebar to work properly
- Fixed JSON parsing issue with test notifications
- Improved navigation system with javascript handlers
- Added URL hash-based navigation for better linking
- Enhanced form submission with FormData instead of JSON
- Added error handling for various content types
- Fixed layout issues with navigation sections
- Unified navigation interface across all pages

## v2.0.0-alpha.13 (2025-04-23)
- Redesigned navigation sidebar with improved structure 
- Added debug mode toggle with keyboard shortcut (Ctrl+Shift+D)
- Improved visual feedback for active navigation items
- Enhanced UI consistency across all pages
- Updated logo and product name in header
- Added highlighting effect for navigation targets
- Cleaned up legacy navigation items from v1.0
- Improved styling for dashboard elements

## v2.0.0-alpha.12 (2025-04-23)
- Completely rebuilt GUI navigation system with section switching
- Added fully functional button interactions across the dashboard
- Implemented context-aware UI updates based on user role
- Enhanced test notification feedback with real-time history updates
- Added help dialogs and tooltips for improved user experience
- Improved user preferences management with visual confirmation
- Fixed inconsistent navigation between dashboard sections
- Added animation effects and visual feedback for user interactions

## v2.0.0-alpha.11 (2025-04-23)
- Added tag-based routing system for dynamic notification targeting
- Implemented tag expression parser with AND, OR, NOT logical operators
- Enhanced Home Assistant API client with tag resolution capabilities
- Added demo script showcasing tag-based notification routing
- Created detailed implementation documentation for tag-based routing
- Added support for context-aware notification delivery
- Improved entity tag resolution and caching for better performance
- Extended API with new endpoints for tag-based routing
- Added support for different notification service types (mobile, speakers, etc.)

## v2.0.0-alpha.10 (2025-04-22)
- Fixed Home Assistant ingress integration for tag manager
- Added reverse proxy middleware to handle URL rewriting
- Added request debug endpoint for diagnosing ingress issues
- Updated templates to use url_for with _external=True for proper URL generation
- Improved JavaScript API URL handling for ingress compatibility
- Enhanced navigation links between dashboard and tag manager

## v2.0.0-alpha.9 (2025-04-22)
- Added routes diagnostic endpoint
- Enhanced logging for template rendering
- Fixed Flask route configuration
- Added template directory validation
- Added route listing for debugging

## v2.0.0-alpha.8 (2025-04-22)
- Fixed route conflict with tag manager
- Added demo mode with mock entities for testing
- Fixed authentication errors with Home Assistant API
- Added automatic fallback to demo mode when auth fails
- Improved error handling for API requests

## v2.0.0-alpha.7 (2025-04-22)
- Fixed navigation to tag manager page
- Modified sidebar link behavior to allow v2 features
- Improved cursor styling for navigation links
- Fixed JavaScript that was preventing navigation
- Added explicit dashboard and tag manager navigation paths

## v2.0.0-alpha.6 (2025-04-22)
- Added direct tag manager route in main application
- Added navigation link to tag manager in sidebar
- Added debug endpoint for diagnosing issues
- Fixed routing to tag manager template
- Improved error handling for template rendering

## v2.0.0-alpha.5 (2025-04-22)
- Fixed Docker build error with package installation
- Simplified module import mechanism
- Improved module detection and fallback
- Removed complex package structure to fix installation issues
- Enhanced module availability checks

## v2.0.0-alpha.4 (2025-04-22)
- Fixed module import errors in Docker container
- Added proper Python package structure
- Improved error handling for module imports
- Added fallback for missing tag routing module
- Fixed compatibility with Home Assistant add-on environment

## v2.0.0-alpha.3 (2025-04-22)
- Fixed integration of tag-based routing with main application
- Connected tag manager UI to main Flask application
- Added proper initialization of tag routing components
- Improved Home Assistant API integration

## v2.0.0-alpha.2 (2025-04-22)
- Added tag manager UI for entity tagging
- Created web interface to manage entity tags without editing YAML
- Added API endpoints for entity and tag management
- Implemented Home Assistant configuration sync for tags
- Added entity browsing, searching, and filtering capabilities

## v2.0.0-alpha.1 (2025-04-22)
- Implemented core tag-based routing system components
- Added Home Assistant API client for entity and tag integration
- Created tag expression parser with AND, OR, NOT operators
- Added tag resolution service with caching layer
- Implemented context resolver for presence-aware routing
- Created routing engine with dynamic service selection
- Added service discovery for categorizing notification services
- Implemented API endpoints for v2 notification system
- Added backward compatibility with v1 audiences
- Created comprehensive documentation for tag-based routing
- Added examples for tag-based notifications in Home Assistant

## Development Roadmap (2025-05)
- Planning tag-based routing enhancement
- Added design document and implementation plan
- Scheduled development to begin May 2025
- See `/docs/tag_based_routing_design.md` for details

## v1.0.40 (2025-04-22)
- Updated add-on logo with Gemini logo
- Replaced all icon files with new branding
- Enhanced visual identity of the add-on

## v1.0.39 (2025-04-22)
- Fixed icon URL for Home Assistant Supervisor API
- Changed icon path to logo.png in the root directory
- Fixed icon 404 error in the add-on store

## v1.0.38 (2025-04-22)
- Fixed "Loading your audiences" placeholder with actual audience tags
- Fixed test notification JSON parsing with FormData submission
- Enhanced notification API endpoint to handle multiple formats
- Added complete form data handling for more reliable message sending
- Added audience tag styling in the UI
- Updated icon path to standard Home Assistant add-on location
- Set default user information instead of "Loading..."
- Fixed multiple request format handling (JSON, FormData)

## v1.0.37 (2025-04-22)
- Fixed icon display by placing icon.png in proper root locations
- Updated icon paths in all configuration files
- Standardized icon references in repository configuration

## v1.0.36 (2025-04-22)
- Fixed broken addon icon by copying icon files to addon directory
- Fixed JSON parsing error in test notification functionality
- Improved sidebar navigation with proper user feedback
- Added page not implemented alerts for navigation items
- Fixed JSON formatting in notification payload
- Added icon reference in config.json for proper display
- Enhanced error handling for test notification

## v1.0.35 (2025-04-22)
- Fixed UI buttons and links not working properly
- Added proper script.js file reference with correct script tag
- Fixed ID mismatch between HTML and JavaScript for severity levels
- Added null checks throughout JavaScript to prevent errors
- Implemented sidebar navigation functionality
- Added functional header buttons with visual feedback
- Made "View All" notifications button functional
- Added initialization function for all UI buttons
- Fixed animation styles for refresh button

## v1.0.33
- Fixed "Invalid audiences format" warning in logs
- Improved options loading from Home Assistant configuration
- Fixed white text on gray background in UI for better visibility
- Enhanced text contrast throughout the interface
- Ensured consistent text colors for all UI elements
- Added explicit background colors for better readability
- Improved button text visibility with higher contrast