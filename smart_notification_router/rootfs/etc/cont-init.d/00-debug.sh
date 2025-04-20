#!/usr/bin/with-contenv bash

echo "====================================="
echo "SMART NOTIFICATION ROUTER DEBUG INFO"
echo "====================================="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "Container filesystem layout:"
ls -la /
echo "====================================="
echo "Service directories:"
ls -la /etc/services.d/ || echo "services.d not found"
ls -la /etc/services.d/smart-notification/ || echo "smart-notification service not found"
echo "====================================="
echo "S6 directories:"
ls -la /etc/s6-overlay/ || echo "s6-overlay not found"
find / -name "*s6*" -type d | grep -v proc | sort
echo "====================================="
echo "Environment variables:"
env | sort
echo "====================================="
echo "Process information:"
ps aux
echo "====================================="
echo "S6 information:"
if command -v s6-version >/dev/null 2>&1; then
    s6-version
else
    echo "s6-version command not found"
fi
if command -v s6-svscan >/dev/null 2>&1; then
    which s6-svscan
    s6-svscan -h || echo "s6-svscan help not available"
else
    echo "s6-svscan command not found"
fi
echo "====================================="
echo "Application files:"
ls -la /app/
echo "====================================="
echo "Debug info completed"
echo "====================================="