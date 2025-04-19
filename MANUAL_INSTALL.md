# Manual Installation Instructions

If you're having trouble adding the Smart Notification Router as a repository add-on, here are several alternative installation methods.

## Method 1: Install as a Local Add-on

You can install the add-on by directly copying the files to your Home Assistant configuration directory:

1. SSH into your Home Assistant server or access the file system directly
2. Create a directory for local add-ons if it doesn't exist:
   ```bash
   mkdir -p /config/addons
   ```
3. Download and extract the add-on:
   ```bash
   cd /config/addons
   wget https://github.com/festion/smart_notification/archive/refs/heads/main.zip
   unzip main.zip
   mv smart_notification-main/smart_notification_router .
   rm -rf main.zip smart_notification-main
   ```
4. Restart Home Assistant
5. Go to Settings > Add-ons > Local Add-ons to find and install the add-on

## Method 2: Add to configuration.yaml (Advanced Users)

Advanced users can add the repository manually in the configuration.yaml file:

1. Edit your configuration.yaml file
2. Add the following configuration:
   ```yaml
   hassio:
     addons_repositories:
       - https://github.com/festion/smart_notification
   ```
3. Restart Home Assistant
4. Check the Add-on Store for the Smart Notification Router

## Method 3: Use the Direct Installation Script

If you have shell access to your Home Assistant instance:

1. Download the install.sh script:
   ```bash
   wget https://raw.githubusercontent.com/festion/smart_notification/main/install.sh
   ```
2. Make it executable:
   ```bash
   chmod +x install.sh
   ```
3. Run the script:
   ```bash
   ./install.sh
   ```
4. Restart Home Assistant
5. Look for the add-on in Settings > Add-ons > Local Add-ons

## Method 4: Run as a Docker Container (Without Add-on)

You can run the Smart Notification Router directly as a Docker container:

```bash
docker run -d \
  --name smart-notification-router \
  --restart=unless-stopped \
  -p 8099:8099 \
  -v /path/to/config:/config:rw \
  -e TZ=YOUR_TIME_ZONE \
  ghcr.io/home-assistant/amd64-base:3.16 \
  /bin/bash -c "cd /app && python3 main.py"
```

Then add the service to Home Assistant via REST commands.

## Troubleshooting

If you're still having issues:

1. Make sure Home Assistant has been restarted after adding the repository
2. Check Home Assistant logs for any errors related to add-on discovery
3. Try clearing your browser cache and reloading Home Assistant
4. Ensure you have the correct permissions on your Home Assistant instance
5. Look for error messages in the Home Assistant Supervisor logs

For additional help, please open an issue on the GitHub repository.