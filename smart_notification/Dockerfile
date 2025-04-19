ARG BUILD_FROM
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Set up base system
ARG BUILD_ARCH=amd64

# Install requirements for add-on
RUN \
    apk add --no-cache \
        python3 \
        py3-pip \
        bash \
        nginx

# Copy root filesystem
COPY rootfs /

WORKDIR /app

# Copy app files
COPY main.py /app/
COPY run.sh /app/
COPY requirements.txt /app/
COPY web /app/web/

# Make scripts executable
RUN chmod a+x /app/run.sh \
    && chmod a+x /etc/services.d/smart-notification/run

# Install python requirements
RUN pip3 install --no-cache-dir -r requirements.txt

# Labels
LABEL \
    io.hass.name="Smart Notification Router" \
    io.hass.description="Flexible notification routing with severity, audience, and deduplication" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="Festion <festion@example.com>"