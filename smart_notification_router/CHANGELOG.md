# Smart Notification Router Changelog

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