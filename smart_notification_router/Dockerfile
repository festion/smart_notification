ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
ENV S6_KEEP_ENV=1
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

# Create directories
RUN mkdir -p /app /config

# Copy root filesystem
COPY rootfs /

# Make scripts executable
RUN chmod -x /etc/services.d/smart-notification/finish || true
RUN chmod +x /etc/services.d/smart-notification/run

# Install necessary packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2

# Copy application files
WORKDIR /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Set permissions
RUN chmod -R 755 /app && \
    chmod -R 777 /config

# Install any remaining requirements
RUN pip3 install --no-cache-dir -r /app/requirements.txt || echo "Continuing with system packages"

EXPOSE 8080
