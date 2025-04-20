#!/usr/bin/with-contenv bash

echo "[CONFIG] Generating configuration file..."
mkdir -p /config

python3 - << "EOL" > /config/notification_config.yaml
import json
import yaml
import os
import sys

try:
    options_file = "/data/options.json"
    
    if os.path.exists(options_file):
        with open(options_file, "r") as f:
            options = json.load(f)
            
        config = {
            "audiences": options.get("audiences", {}),
            "severity_levels": options.get("severity_levels", ["low", "medium", "high", "emergency"])
        }
        
        with open("/config/notification_config.yaml", "w") as f:
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
            "severity_levels": ["low", "medium", "high", "emergency"]
        }
        with open("/config/notification_config.yaml", "w") as f:
            yaml.dump(config, f, default_flow_style=False)
        print("Created default configuration")
except Exception as e:
    print(f"Error generating configuration: {e}")
    sys.exit(1)
EOL

echo "[CONFIG] Configuration generated"
echo "[CONFIG] Setting up environment"

# Make scripts executable
find /etc/services.d -type f -name "run" -exec chmod +x {} \;
find /etc/s6-overlay -type f -name "run" -exec chmod +x {} \;

echo "[CONFIG] Setup completed"