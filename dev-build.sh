#!/bin/bash
set -e

ARCH=${1:-amd64}

# Build the Docker image using the smart_notification_router directory as the build context
# This ensures all COPY instructions in the Dockerfile can find the files they need

docker build \
  --build-arg BUILD_FROM=python:3.11-slim \
  -t "local/smart_notification_router:latest" \
  -f smart_notification_router/Dockerfile \
  smart_notification_router

echo "Build complete!"
