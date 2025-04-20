#!/bin/bash

# ========================================================================
# Fix script permissions at container startup
# This script runs early in the boot process to ensure proper permissions
# ========================================================================

echo "[INFO] Setting correct permissions for S6 scripts..."

# Fix permission issue with run scripts
find /etc/services.d -type f -name "run" -exec chmod 755 {} \;
find /etc/services.d -type f -name "finish" -exec chmod 755 {} \; || true
find /etc/cont-init.d -type f -exec chmod 755 {} \; || true
find /etc/cont-finish.d -type f -exec chmod 755 {} \; || true

# Specific check for the smart-notification service
if [[ -f /etc/services.d/smart-notification/run ]]; then
    echo "[INFO] Setting permissions for smart-notification service..."
    chmod 755 /etc/services.d/smart-notification/run
    ls -la /etc/services.d/smart-notification/run
else
    echo "[WARNING] smart-notification run script not found!"
    find /etc/services.d -type d | sort
fi

# Check app directory permissions
if [[ -d /app ]]; then
    echo "[INFO] Setting permissions for app directory..."
    chmod -R 755 /app
    chmod 755 /app/run.sh
fi

# Double-check run script permission
if [[ -f /app/run.sh ]]; then
    chmod 755 /app/run.sh
    ls -la /app/run.sh
fi

echo "[INFO] Permission fixes applied"