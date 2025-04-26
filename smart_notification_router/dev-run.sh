#!/bin/bash
set -e

# Stop any existing container
docker stop test-addon 2>/dev/null || true
docker rm test-addon 2>/dev/null || true

# Create data directory if it doesn't exist
mkdir -p ./data

# Run the add-on in development mode
docker run -it \
  --name test-addon \
  -v "$PWD/data:/data" \
  -e "TZ=America/Los_Angeles" \
  --network host \
  local/smart_notification_router:latest
