#!/bin/bash

# Smart Notification Router Fix Installer
# This script helps you install the fixed Smart Notification Router to your Home Assistant instance

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== Smart Notification Router Fix Installer =====${NC}"
echo "This script will install the fixed Smart Notification Router (v2.0.0-alpha.32.1) add-on directly."

# Configuration
HA_ADDONS_DIR="/config/addons"  # Default path in Home Assistant
ADDON_NAME="smart_notification_router"
SOURCE_DIR="/mnt/c/GIT/smart_notification/smart_notification_router"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory not found at $SOURCE_DIR${NC}"
    exit 1
fi

# Create the add-ons directory if it doesn't exist
echo -e "${YELLOW}Creating add-ons directory if it doesn't exist...${NC}"
mkdir -p "$HA_ADDONS_DIR"

# Remove existing addon if it exists
if [ -d "$HA_ADDONS_DIR/$ADDON_NAME" ]; then
    echo -e "${YELLOW}Removing existing add-on...${NC}"
    rm -rf "$HA_ADDONS_DIR/$ADDON_NAME"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to remove existing add-on.${NC}"
        exit 1
    fi
fi

# Copy the add-on to the Home Assistant add-ons directory
echo -e "${YELLOW}Copying fixed add-on to Home Assistant...${NC}"
cp -r "$SOURCE_DIR" "$HA_ADDONS_DIR/"
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to copy the add-on to Home Assistant.${NC}"
    exit 1
fi

echo -e "${GREEN}Installation complete!${NC}"
echo -e "The fixed Smart Notification Router add-on has been installed to $HA_ADDONS_DIR/$ADDON_NAME"
echo -e "${YELLOW}Important: You need to restart Home Assistant to see the add-on in your list.${NC}"
echo -e "After restarting, go to Settings > Add-ons > Local Add-ons to find and install the add-on."

exit 0