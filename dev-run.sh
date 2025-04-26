#!/bin/bash
set -e

# Get the repository root directory
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the add-on directory
ADDON_DIR="${REPO_DIR}/smart_notification_router"

# Stop any existing container
docker stop test-addon 2>/dev/null || true
docker rm test-addon 2>/dev/null || true

# Create data directory if it doesn't exist
mkdir -p "${ADDON_DIR}/data"

# Run the add-on in development mode with proper port mapping
echo "Running add-on in development mode..."
echo "Press Ctrl+C to stop the container (it may take a moment)"
docker run -it --rm \
  --name test-addon \
  -p 8080:8080 \
  -v "${ADDON_DIR}/data:/data" \
  -e "TZ=America/Los_Angeles" \
  local/smart_notification_router:latest
