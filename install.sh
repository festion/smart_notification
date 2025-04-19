#!/bin/bash

# Smart Notification Router Direct Installer
# This script helps you install the Smart Notification Router directly to your Home Assistant instance

# Configuration
ADDON_REPO="https://github.com/festion/smart_notification.git"
ADDON_NAME="smart_notification_router"
HA_ADDONS_DIR="/config/addons"  # Default path in Home Assistant

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== Smart Notification Router Direct Installer =====${NC}"
echo "This script will install the Smart Notification Router add-on directly."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed. Please install git first.${NC}"
    exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo -e "Created temporary directory: ${TEMP_DIR}"

# Clone the repository
echo -e "${YELLOW}Cloning the repository...${NC}"
git clone "$ADDON_REPO" "$TEMP_DIR/repo"
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to clone the repository.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Check if the add-on directory exists in the repository
if [ ! -d "$TEMP_DIR/repo/$ADDON_NAME" ]; then
    echo -e "${RED}Error: Add-on directory not found in the repository.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Create the add-ons directory if it doesn't exist
echo -e "${YELLOW}Creating add-ons directory if it doesn't exist...${NC}"
mkdir -p "$HA_ADDONS_DIR"

# Copy the add-on to the Home Assistant add-ons directory
echo -e "${YELLOW}Copying add-on to Home Assistant...${NC}"
cp -r "$TEMP_DIR/repo/$ADDON_NAME" "$HA_ADDONS_DIR/"
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to copy the add-on to Home Assistant.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Clean up
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Installation complete!${NC}"
echo -e "The Smart Notification Router add-on has been installed to $HA_ADDONS_DIR/$ADDON_NAME"
echo -e "${YELLOW}Important: You may need to restart Home Assistant to see the add-on in your list.${NC}"
echo -e "After restarting, go to Settings > Add-ons > Local Add-ons to find and install the add-on."

exit 0