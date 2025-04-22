ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system
ARG BUILD_ARCH=amd64

# Copy root filesystem
COPY rootfs /

# Immediately set execute permissions on critical scripts after copy
RUN chmod -R 755 /etc/services.d
RUN chmod -R 755 /etc/cont-init.d || true
RUN chmod -R 755 /etc/cont-finish.d || true

# Copy application files
WORKDIR /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/
COPY run.sh /app/
COPY tag_routing /app/tag_routing/
COPY __init__.py /app/

# Create Python package structure
RUN touch /app/tag_routing/__init__.py

# Install Python dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2 \
    py3-werkzeug \
    py3-itsdangerous \
    py3-markupsafe

# Install any remaining requirements
RUN pip3 install --no-cache-dir -r /app/requirements.txt || echo "Continuing with system packages"

# Install the package in development mode
RUN cd /app && pip3 install -e .

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
    ls -la /app/web/templates && \
    python3 -m flask --version
