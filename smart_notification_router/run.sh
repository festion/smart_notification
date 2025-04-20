#!/usr/bin/with-contenv bashio

# ==============================================================================
# Smart Notification Router
# ==============================================================================
bashio::log.info "Starting Smart Notification Router..."

# Ensure we have all the directories we need
bashio::log.info "Setting up directories..."
mkdir -p /config /data
chmod 777 /config

# List environment for debugging
bashio::log.debug "Environment variables:"
env | grep -v TOKEN | sort

# Verify Python is available
bashio::log.info "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    bashio::log.error "Python3 is not installed or not in PATH"
    exit 1
fi

# Verify required Python packages
bashio::log.info "Checking Python packages..."
python3 -c "import flask, yaml" || {
    bashio::log.error "Required Python packages are missing. Trying to install..."
    pip3 install --no-cache-dir flask pyyaml
}

# Generate configuration from the add-on options
bashio::log.info "Generating configuration file from add-on options..."

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
bashio::log.info "Checking application directory..."
if [ ! -d "/app" ]; then
    bashio::log.error "Application directory /app does not exist"
    exit 1
fi

# Check if the main script exists
if [ ! -f "/app/main.py" ]; then
    bashio::log.error "Main script /app/main.py does not exist"
    exit 1
fi

# Check permissions
bashio::log.info "Checking permissions..."
if [ ! -r "/app/main.py" ]; then
    bashio::log.error "Main script /app/main.py is not readable"
    chmod a+r /app/main.py || bashio::log.warning "Could not fix permissions"
fi

# Start the application
bashio::log.info "Starting Flask application..."
cd /app
exec python3 /app/main.py