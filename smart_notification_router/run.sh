#!/usr/bin/with-contenv bashio

# ==============================================================================
# Smart Notification Router
# ==============================================================================
bashio::log.info "Starting Smart Notification Router..."

# Create directories if they don't exist
mkdir -p /config
chmod 777 /config

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
        with open('/config/notification_config.yaml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
except Exception as e:
    print(f'Error generating configuration: {e}')
    sys.exit(1)
"

# Start the application
bashio::log.info "Starting Flask application..."
cd /app
python3 /app/main.py