ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base system
ARG BUILD_ARCH=amd64

# Copy root filesystem
COPY rootfs /

# Copy application files
WORKDIR /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/
COPY run.sh /app/

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

# Make scripts executable
RUN chmod a+x /app/run.sh
RUN chmod -R 755 /app
RUN chmod -R 755 /app/web

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
