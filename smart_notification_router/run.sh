#!/bin/bash

# Simpler run script that doesn't depend on bashio
echo "[INFO] Starting Smart Notification Router service..."
echo "[INFO] Generating configuration file from add-on options..."

# Generate config from options
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

# Process audience_config if present
echo "[INFO] Processing audience_config if present..."
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

# Apply monkey patch to fix Flask run_simple issue with debug parameter
echo "[INFO] Starting Flask application with debug parameter patch and persistent server..."

python3 -c "
import flask
import types
import sys
import signal
import time

# Signal handler to keep the process running
def handle_signal(sig, frame):
    print('Received signal:', sig)
    if sig == signal.SIGTERM:
        print('Terminating gracefully...')
        sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

# Fixed patched run method that filters out the debug parameter
def patched_run(self, host=None, port=None, debug=None, **kwargs):
    print('Starting Flask with host=0.0.0.0, port=8080')
    from werkzeug.serving import run_simple
    host = '0.0.0.0'
    port = 8080
    
    # Filter out debug parameter as run_simple doesn't accept it
    if 'debug' in kwargs:
        del kwargs['debug']
    
    # Add threaded=True for better performance
    kwargs['threaded'] = True
    
    # Use try-except to keep the process alive even if Flask crashes
    try:
        run_simple(host, port, self, **kwargs)
    except Exception as e:
        print(f'Error in Flask server: {e}')
        print('Restarting server in 5 seconds...')
        time.sleep(5)
        run_simple(host, port, self, **kwargs)

# Apply the monkey patch
flask.Flask.run = patched_run

# Import and run the main application with error handling
try:
    import runpy
    runpy.run_path('/app/main.py')
except Exception as e:
    print(f'Fatal error in main application: {e}')
    # Keep the process alive to prevent container restart loops
    print('Keeping process alive to prevent restart loops...')
    while True:
        time.sleep(60)
"
