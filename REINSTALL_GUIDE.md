# Smart Notification Router - Troubleshooting Guide

## Common Issues and Solutions

### Flask Debug Parameter Error (v2.0.0-alpha.32)

If you encounter the following error when starting the Smart Notification Router:

```
TypeError: run_simple() got an unexpected keyword argument 'debug'
```

This is caused by an incompatibility between Flask and Werkzeug versions. It was fixed in version 2.0.0-alpha.32.1.

#### Quick Fix Instructions

1. Completely uninstall the Smart Notification Router add-on from Home Assistant
2. Restart Home Assistant
3. Refresh the add-on store repository by:
   - Go to Settings > Add-ons > Add-on Store
   - Click the three-dots menu in the top right
   - Select "Check for updates" 
4. Install the latest version of Smart Notification Router

#### Manual Fix (v2.0.0-alpha.32.1)

If the above doesn't work, you can manually install the fixed version using the `fix_install.sh` script:

1. Access your Home Assistant system's shell (via SSH or terminal)
2. Navigate to the repository directory: `cd /path/to/smart_notification`
3. Run the fix installation script: `./fix_install.sh`
4. Restart Home Assistant
5. The fixed version should now appear in your local add-ons

### Schema Validation Error

If you're experiencing schema validation errors like the following:
```
WARNING Can't read /data/addons/local/smart_notification_router/addon/config.json: expected string or buffer for dictionary value @ data['schema']['audiences']['str?']. Got {'services': ['str'], 'min_severity': 'str'}
```

This is due to conflicts between previous installations and the new configuration format. Follow this guide to perform a clean reinstallation.

## Step 1: Complete Uninstallation

1. Go to the Home Assistant Add-on Store
2. Find the Smart Notification Router add-on
3. Click on it to open its page
4. Click the "Uninstall" button
5. Wait for the uninstallation to complete

## Step 2: Clean Up Leftover Files (Optional but Recommended)

If you have SSH access to your Home Assistant instance:

```bash
# SSH into your Home Assistant system
ssh homeassistant@your-ha-ip

# Remove any leftover configuration files
rm -rf /data/addons/local/smart_notification_router
rm -rf /data/addons/git/*/*/smart_notification_router
```

If you don't have SSH access, you can skip this step, but there's a higher chance leftover files could cause issues.

## Step 3: Restart Home Assistant Supervisor

1. Go to Settings → System
2. Click the three-dot menu in the top-right corner
3. Select "Restart Supervisor"
4. Wait for the Supervisor to restart completely

## Step 4: Reinstall the Add-on

1. Go to the Add-on Store
2. Click "Repositories" from the three-dot menu in the top-right corner
3. Remove any existing Smart Notification Router repository if present
4. Add the repository URL: `https://github.com/festion/smart_notification`
5. Find the "Smart Notification Router" add-on in the store
6. Install it fresh with default settings

## Step 5: Configure and Start

1. Configure the add-on with your desired settings
2. Start the add-on
3. Check the logs to ensure it starts correctly

## If Problems Persist

If you continue to experience schema validation errors after following these steps, please:

1. Check the add-on logs for detailed error messages
2. Try restarting the Home Assistant host completely
3. If using a custom build or development version, make sure all files are properly updated
4. Consider restoring from a backup if you have one from before you installed the add-on

## Technical Details

### Schema Validation Error

The schema validation error is occurring because:

1. There was a change in how audience configuration is handled between versions
2. The old schema used a nested structure for audiences that's no longer compatible
3. The new schema uses a simplified string-based JSON approach for better compatibility

Version 2.0.0-alpha.30 includes fixes that should prevent these issues with clean installations.

### Flask Debug Parameter Error

The Flask run_simple debug parameter error occurs because:

1. Werkzeug's `run_simple()` function in newer versions doesn't accept the `debug` parameter
2. Flask still tries to pass this parameter to Werkzeug
3. This results in the TypeError: `run_simple() got an unexpected keyword argument 'debug'`

The fix in version 2.0.0-alpha.32.1 applies a monkey patch during startup:

```python
def patched_run(self, host=None, port=None, debug=None, **kwargs):
    print('Starting Flask with host=0.0.0.0, port=8080')
    from werkzeug.serving import run_simple
    host = '0.0.0.0'
    port = 8080
    
    # Filter out debug parameter as run_simple doesn't accept it
    if 'debug' in kwargs:
        del kwargs['debug']
    
    run_simple(host, port, self, **kwargs)

# Apply the monkey patch
flask.Flask.run = patched_run
```

We also pin Flask and Werkzeug to compatible versions in requirements.txt:
```
flask==2.3.3
werkzeug==2.3.7
```