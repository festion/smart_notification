#!/usr/bin/env bashio

bashio::log.info "Starting Smart Notification Router..."
cd /app

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
            'severity_levels': options.get('severity_levels', ['low', 'medium', 'high', 'emergency'])
        }
        
        with open('/config/notification_config.yaml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
            
        print('Configuration generated successfully')
    else:
        print('Options file not found')
        
except Exception as e:
    print(f'Error generating configuration: {e}')
    sys.exit(1)
"

# Start the application
python3 main.py