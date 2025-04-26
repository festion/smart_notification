ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system
ARG BUILD_ARCH=amd64

# Copy root filesystem
COPY smart_notification_router/rootfs/ /

# Immediately set execute permissions on critical scripts after copy
RUN chmod -R 755 /etc/services.d
RUN chmod -R 755 /etc/cont-init.d || true
RUN chmod -R 755 /etc/cont-finish.d || true

# Ensure python3 and pip3 are installed if not present (for Home Assistant base compatibility)
RUN if ! command -v python3 >/dev/null 2>&1; then \
    apk add --no-cache python3 py3-pip; \
fi

# Copy application files
WORKDIR /app
COPY smart_notification_router/main.py /app/
COPY smart_notification_router/notification_config.yaml /app/
COPY smart_notification_router/requirements.txt /app/
COPY smart_notification_router/web /app/web/
COPY smart_notification_router/run.sh /app/
# Debug: List /app contents after copying run.sh
RUN echo "Debug: Listing /app after copying run.sh" && ls -l /app
COPY smart_notification_router/tag_routing /app/tag_routing/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Echo file tree for debugging
RUN echo "Verifying web content:" && \
    ls -la /app/web/ && \
    ls -la /app/web/static/ && \
    ls -la /app/web/static/js/ && \
    ls -la /app/web/static/css/ && \
    ls -la /app/web/templates/

# Ensure file permissions are correct
RUN chmod -R 755 /app/web/static

# Create Python package structure 
RUN mkdir -p /app/tag_routing
RUN touch /app/tag_routing/__init__.py

# Debug: Show apt sources and environment before install (non-fatal if missing)
RUN echo "APT sources:" && (cat /etc/apt/sources.list || echo "/etc/apt/sources.list not found") && (ls /etc/apt/sources.list.d/ || echo "/etc/apt/sources.list.d/ not found") && env

# Fix line endings and make scripts executable
RUN sed -i 's/\r$//' /app/run.sh && \
    chmod a+x /app/run.sh && \
    find /app -type f -name "*.sh" -exec sed -i 's/\r$//' {} \; && \
    find /app -type f -name "*.py" -exec sed -i 's/\r$//' {} \; && \
    chmod -R 755 /app && \
    chmod -R 755 /app/web

# Ensure S6 scripts are executable (critical fix)
RUN find /etc/services.d -type f -name run -exec chmod 755 {} \;
RUN find /etc/services.d -type f -name finish -exec chmod 755 {} \; || true
RUN find /etc/cont-init.d -type f -exec chmod 755 {} \; || true
RUN find /etc/cont-finish.d -type f -exec chmod 755 {} \; || true

# Explicitly check and set permissions for the run script
RUN if [ -f "/etc/services.d/smart-notification/run" ]; then \
    echo "Setting permissions for service script"; \
    chmod 755 /etc/services.d/smart-notification/run; \
    ls -la /etc/services.d/smart-notification/run; \
fi

# Set working directory and create config directory
WORKDIR /app
RUN mkdir -p /config && chmod 777 /config

# For debugging
RUN echo "Flask app is in $(pwd)" && \
    ls -la /app && \
    ls -la /app/web && \
    ls -la /app/web/static && \
    ls -la /app/web/templates
    
# Copy icon files to multiple locations for maximum compatibility
COPY smart_notification_router/icon.png /icon.png
COPY smart_notification_router/icon.png /logo.png
RUN ls -la /*.png

CMD ["/app/run.sh"]
