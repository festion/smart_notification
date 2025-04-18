ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.16
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install required packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    nginx

# Create app directory
WORKDIR /app

# Copy files
COPY requirements.txt /app/
COPY main.py /app/
COPY run.sh /app/
COPY web /app/web/

# Copy rootfs
COPY rootfs /

# Install python requirements
RUN pip3 install --no-cache-dir -r requirements.txt

# Make scripts executable
RUN chmod a+x /app/run.sh \
    && chmod a+x /etc/services.d/smart-notification/run

# Expose ports
EXPOSE 8099

# Set S6 init as entrypoint
ENTRYPOINT ["/init"]

# Labels
LABEL \
    io.hass.name="Smart Notification Router" \
    io.hass.description="Flexible notification routing with severity, audience, and deduplication" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="Festion <festion@example.com>"