#!/usr/bin/env bash

# Simpler run script that doesn't depend on bashio
set -e

# Create a lock file mechanism to prevent multiple simultaneous runs, but with forced cleanup
LOCK_FILE="/tmp/smart_notification_router.lock"

# Always remove stale lock file on startup
if [ -f "$LOCK_FILE" ]; then
    echo "[INFO] Removing existing lock file on startup"
    rm -f "$LOCK_FILE"
fi

# Create lock file with current PID
echo $$ > "$LOCK_FILE"

# Set up trap to remove lock file on exit
trap 'rm -f "$LOCK_FILE"; echo "[INFO] Lock file removed"; exit 0' EXIT INT TERM

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
            parsed_audiences = json.loads(audience_config)
            if isinstance(parsed_audiences, dict):
                audiences = parsed_audiences
        except Exception as e:
            print(f"Error parsing audience_config: {e}")
            audiences = {
                "mobile": {"services": ["notify.mobile_app"], "min_severity": "high"},
                "dashboard": {"services": ["persistent_notification.create"], "min_severity": "low"}
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
        config = {
            "audiences": {
                "mobile": {"services": ["notify.mobile_app"], "min_severity": "high"},
                "dashboard": {"services": ["persistent_notification.create"], "min_severity": "low"}
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

echo "[INFO] Starting Flask application in foreground (debugging mode)..."
exec python3 /app/main.py
