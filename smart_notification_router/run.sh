#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Smart Notification Router service..."

# Fix Flask's debug parameter issue by creating a monkey patch
bashio::log.info "Fixing line endings for run.sh..."
bashio::log.debug "Script permissions:"
ls -la /app/run.sh
bashio::log.info "Checking script shebang line:"
head -n 1 /app/run.sh

bashio::log.info "Executing run.sh"
bashio::log.info "Starting Smart Notification Router..."
bashio::log.info "Setting up directories..."
bashio::log.debug "Environment variables:"
env | sort

bashio::log.info "Checking Python installation..."
bashio::log.info "Checking Python packages..."
bashio::log.info "Checking tag_routing module..."

# Check if tag_routing module is available
if python3 -c "import importlib.util; print('1' if importlib.util.find_spec('tag_routing') else '0')" | grep -q "1"; then
    bashio::log.info "Found tag_routing module"
else
    bashio::log.warning "tag_routing module not found, continuing without tag-based routing features"
fi

# Generate config from options
bashio::log.info "Generating configuration file from add-on options..."
python3 << "EOL"
import json
import yaml
import os
import sys

try:
    options_file = "/data/options.json"
    
    if os.path.exists(options_file):
        with open(options_file, "r") as f:
            options = json.load(f)
            
        # Extract audiences from audience_config if present
        audiences = {}
        audience_config = options.get("audience_config", "{}")
        
        try:
            # Try to parse audience_config as JSON
            parsed_audiences = json.loads(audience_config)
            if isinstance(parsed_audiences, dict):
                audiences = parsed_audiences
        except Exception as e:
            print(f"Error parsing audience_config: {e}")
            # Fallback to default audiences
            audiences = {
                "mobile": {
                    "services": ["notify.mobile_app"],
                    "min_severity": "high"
                },
                "dashboard": {
                    "services": ["persistent_notification.create"],
                    "min_severity": "low"
                }
            }
            
        config = {
            "audiences": audiences,
            "severity_levels": options.get("severity_levels", ["low", "medium", "high", "emergency"]),
            "deduplication_ttl": options.get("deduplication_ttl", 300)
        }
        
        with open("/app/notification_config.yaml", "w") as f:
            yaml.dump(config, f, default_flow_style=False)
            
        print("Configuration generated successfully")
    else:
        # Create default configuration if options file does not exist
        config = {
            "audiences": {
                "mobile": {
                    "services": ["notify.mobile_app"],
                    "min_severity": "high"
                },
                "dashboard": {
                    "services": ["persistent_notification.create"],
                    "min_severity": "low"
                }
            },
            "severity_levels": ["low", "medium", "high", "emergency"],
            "deduplication_ttl": 300
        }
        with open("/app/notification_config.yaml", "w") as f:
            yaml.dump(config, f, default_flow_style=False)
        print("Created default configuration")
except Exception as e:
    print(f"Error generating configuration: {e}")
    sys.exit(1)
EOL

# Check for application directory
bashio::log.info "Checking application directory..."
if [ ! -d "/app" ]; then
    bashio::log.error "Application directory not found!"
    exit 1
fi

# Check that directory has proper permissions
bashio::log.info "Checking permissions..."
if [ ! -w "/app" ]; then
    bashio::log.warning "Application directory is not writable, some features may not work correctly"
fi

# Check for templates
bashio::log.info "Checking template locations..."
if [ -d "/app/web/templates" ]; then
    bashio::log.info "Templates found: total $(find /app/web/templates -type f | wc -l)"
    ls -la /app/web/templates
else
    bashio::log.warning "Template directory not found, UI may not display correctly"
fi

# Process audience_config if present
bashio::log.info "Processing audience_config if present..."
python3 << "EOL"
import json
import os

options_file = "/data/options.json"
if os.path.exists(options_file):
    with open(options_file, "r") as f:
        options = json.load(f)
    
    audience_config = options.get("audience_config", "{}")
    try:
        parsed_config = json.loads(audience_config)
        print("Successfully processed audience_config into audiences")
    except Exception as e:
        print(f"Warning: Could not parse audience_config: {e}")
EOL

# Create a Flask patch to handle the debug parameter issue
bashio::log.info "Starting Flask application listening on all interfaces..."
bashio::log.info "Running: python3 /app/main.py with host 0.0.0.0"

# Apply monkey patch to fix Flask run_simple issue with debug parameter
python3 -c "
import flask
import types

# Fixed patched run method that filters out the debug parameter
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

# Import and run the main application
import runpy
runpy.run_path('/app/main.py')
"
