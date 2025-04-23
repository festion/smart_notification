#!/bin/bash

# ==============================================================================
# Smart Notification Router
# ==============================================================================
echo "[INFO] Starting Smart Notification Router..."

# Ensure we have all the directories we need
echo "[INFO] Setting up directories..."
mkdir -p /config /data
chmod 777 /config

# List environment for debugging
echo "[DEBUG] Environment variables:"
env | grep -v TOKEN | sort

# Verify Python is available
echo "[INFO] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed or not in PATH"
    exit 1
fi

# Verify required Python packages
echo "[INFO] Checking Python packages..."
python3 -c "import flask, yaml" || {
    echo "[ERROR] Required Python packages are missing. Trying to install..."
    pip3 install --no-cache-dir flask pyyaml
}

# Ensure tag_routing module is available
echo "[INFO] Checking tag_routing module..."
if [ -d "/app/tag_routing" ]; then
    echo "[INFO] Found tag_routing module"
    
    # Ensure it has an __init__.py file
    if [ ! -f "/app/tag_routing/__init__.py" ]; then
        echo "[INFO] Creating __init__.py in tag_routing module"
        touch /app/tag_routing/__init__.py
    fi
else
    echo "[WARNING] tag_routing module not found. V2 features will be disabled."
fi

# Generate configuration from the add-on options
echo "[INFO] Generating configuration file from add-on options..."

python3 -c "
import json
import yaml
import os
import sys

try:
    options_file = '/data/options.json'
    
    if os.path.exists(options_file):
        with open(options_file, 'r') as f:
            options = json.load(f)
            
        config = {
            'audiences': options.get('audiences', {}),
            'severity_levels': options.get('severity_levels', ['low', 'medium', 'high', 'emergency']),
            'deduplication_ttl': options.get('deduplication_ttl', 300)
        }
        
        os.makedirs('/config', exist_ok=True)
        with open('/config/notification_config.yaml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
            
        print('Configuration generated successfully')
    else:
        print('Options file not found, using default configuration')
        # Create default configuration
        config = {
            'audiences': {
                'mobile': {
                    'services': ['notify.mobile_app'],
                    'min_severity': 'high'
                },
                'dashboard': {
                    'services': ['persistent_notification.create'],
                    'min_severity': 'low'
                }
            },
            'severity_levels': ['low', 'medium', 'high', 'emergency'],
            'deduplication_ttl': 300
        }
        os.makedirs('/config', exist_ok=True)
        with open('/config/notification_config.yaml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
except Exception as e:
    print(f'Error generating configuration: {e}')
    sys.exit(1)
"

# Check if the application directory exists
echo "[INFO] Checking application directory..."
if [ ! -d "/app" ]; then
    echo "[ERROR] Application directory /app does not exist"
    exit 1
fi

# Check if the main script exists
if [ ! -f "/app/main.py" ]; then
    echo "[ERROR] Main script /app/main.py does not exist"
    exit 1
fi

# Check permissions
echo "[INFO] Checking permissions..."
if [ ! -r "/app/main.py" ]; then
    echo "[ERROR] Main script /app/main.py is not readable"
    chmod a+r /app/main.py || echo "[WARNING] Could not fix permissions"
fi

# Make sure template files are accessible
echo "[INFO] Checking template locations..."
if [ ! -d "/app/web/templates" ]; then
    echo "[ERROR] Templates directory not found: /app/web/templates"
else
    echo "[INFO] Templates found: $(ls -la /app/web/templates)"
fi

# Fix for audience_config option
echo "[INFO] Processing audience_config if present..."
python3 -c "
import json
import yaml
import os

try:
    options_file = '/data/options.json'
    
    if os.path.exists(options_file):
        with open(options_file, 'r') as f:
            options = json.load(f)
            
        if 'audience_config' in options and isinstance(options['audience_config'], str):
            try:
                audiences = json.loads(options['audience_config'])
                
                # Create a new options file with 'audiences' instead of 'audience_config'
                options['audiences'] = audiences
                del options['audience_config']
                
                with open('/data/processed_options.json', 'w') as f:
                    json.dump(options, f)
                
                print('[INFO] Successfully processed audience_config into audiences')
            except Exception as e:
                print(f'[WARNING] Error processing audience_config: {e}')
except Exception as e:
    print(f'[WARNING] Error checking for audience_config: {e}')
"

# Start the application
echo "[INFO] Starting Flask application listening on all interfaces..."
cd /app

# Explicitly bind to all interfaces (0.0.0.0) to ensure ingress works
echo "[INFO] Running: python3 /app/main.py with host 0.0.0.0"
exec python3 -c "
import main
import flask

# Monkey patch the Flask run method to ensure we bind to all interfaces
def patched_run(self, host=None, port=None, **kwargs):
    print(f'Starting Flask with host=0.0.0.0, port=8080')
    from werkzeug.serving import run_simple
    host = '0.0.0.0'
    port = 8080
    run_simple(host, port, self, **kwargs)

# Apply the monkey patch
flask.Flask.run = patched_run

# Run the main module
if __name__ == '__main__':
    main.app.run(debug=True)
else:
    # Run directly since we're using exec
    main.app.run(debug=True)
"