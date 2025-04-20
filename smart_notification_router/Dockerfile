FROM python:3.11-alpine

ENV LANG C.UTF-8

# Copy application files
WORKDIR /app
COPY main.py .
COPY notification_config.yaml .
COPY requirements.txt .
COPY web ./web/

# Create config directory
RUN mkdir -p /config && \
    chmod -R 755 /app && \
    chmod -R 777 /config

# Install dependencies
RUN apk add --no-cache \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2 \
    bash

# Install any other required packages
RUN pip install --no-cache-dir -r requirements.txt

# Create script to process configuration and start the app
RUN echo '#!/bin/sh\n\
echo "Generating configuration file..."\n\
mkdir -p /config\n\
\n\
python3 - << "EOL" > /config/notification_config.yaml\n\
import json\n\
import yaml\n\
import os\n\
import sys\n\
\n\
try:\n\
    options_file = "/data/options.json"\n\
    \n\
    if os.path.exists(options_file):\n\
        with open(options_file, "r") as f:\n\
            options = json.load(f)\n\
            \n\
        config = {\n\
            "audiences": options.get("audiences", {}),\n\
            "severity_levels": options.get("severity_levels", ["low", "medium", "high", "emergency"])\n\
        }\n\
        \n\
        with open("/config/notification_config.yaml", "w") as f:\n\
            yaml.dump(config, f, default_flow_style=False)\n\
            \n\
        print("Configuration generated successfully")\n\
    else:\n\
        # Create default configuration if options file does not exist\n\
        config = {\n\
            "audiences": {\n\
                "mobile": {\n\
                    "services": ["notify.mobile_app"],\n\
                    "min_severity": "high"\n\
                },\n\
                "dashboard": {\n\
                    "services": ["persistent_notification.create"],\n\
                    "min_severity": "low"\n\
                }\n\
            },\n\
            "severity_levels": ["low", "medium", "high", "emergency"]\n\
        }\n\
        with open("/config/notification_config.yaml", "w") as f:\n\
            yaml.dump(config, f, default_flow_style=False)\n\
        print("Created default configuration")\n\
except Exception as e:\n\
    print(f"Error generating configuration: {e}")\n\
    sys.exit(1)\n\
EOL\n\
\n\
echo "Starting Smart Notification Router..."\n\
exec python3 /app/main.py' > /start.sh

RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
