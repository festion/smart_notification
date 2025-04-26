#!/bin/bash
set -e

ARCH=${1:-amd64}

# Build the Docker image from the workspace root, using the Dockerfile in smart_notification_router
# This ensures all COPY instructions work as intended

docker build \
  --build-arg BUILD_FROM=python:3.11-slim \
  -t "local/smart_notification_router:latest" \
  -f smart_notification_router/Dockerfile \
  .

echo "Build complete!"
