#!/bin/bash
set -e

# Get the repository root directory
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the add-on directory
ADDON_DIR="${REPO_DIR}/smart_notification_router"

# Stop any existing container
docker stop debug-addon 2>/dev/null || true
docker rm debug-addon 2>/dev/null || true

# Run in interactive mode with a shell
docker run -it --rm \
  --name debug-addon \
  -p 8080:8080 \
  -v "${ADDON_DIR}/data:/data" \
  -v "${ADDON_DIR}:/app" \
  -e "TZ=America/Los_Angeles" \
  --entrypoint /bin/bash \
  local/smart_notification_router:latest
