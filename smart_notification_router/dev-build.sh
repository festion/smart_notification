#!/bin/bash
set -e

# Get the repository root directory (one level up from this script)
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Set the add-on directory
ADDON_DIR="${REPO_DIR}/smart_notification_router"

# Architecture to build for
ARCH=${1:-amd64}

# Base image
BASE_IMAGE="homeassistant/${ARCH}-base:latest"

# Check if Dockerfile exists
if [ ! -f "${ADDON_DIR}/Dockerfile" ]; then
    echo "Error: Dockerfile not found in ${ADDON_DIR}"
    exit 1
fi

# Build the Docker image
echo "Building Docker image for ${ARCH}..."
echo "Using add-on directory: ${ADDON_DIR}"

docker build \
  --build-arg BUILD_FROM=python:3.11-slim \
  -t "local/smart_notification_router:latest" \
  -f "${ADDON_DIR}/Dockerfile" \
  "${REPO_DIR}"

echo "Build complete!"
