#!/bin/bash
set -e

# Get the repository root directory
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the add-on directory
ADDON_DIR="${REPO_DIR}/smart_notification_router"

# Set the path to your Home Assistant config directory
HA_CONFIG_DIR=~/homeassistant

# Create the local add-ons directory if it doesn't exist
mkdir -p "${HA_CONFIG_DIR}/addons/local"

# Copy the add-on to the Home Assistant config directory
echo "Deploying add-on to Home Assistant..."
cp -r "${ADDON_DIR}" "${HA_CONFIG_DIR}/addons/local/smart_notification_router"

echo "Deployment complete! Refresh your Add-on Store in Home Assistant."
