ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

# Install necessary packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy root filesystem
COPY rootfs /

# Copy add-on files
COPY run.sh /
RUN mkdir -p /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Set permissions
RUN chmod a+x /run.sh
RUN chmod a+x /etc/services.d/smart-notification/run

# Install requirements
WORKDIR /app
RUN apt-get update && apt-get install -y \
    python3-paho-mqtt \
    python3-yaml \
    python3-flask \
    python3-requests \
    python3-jinja2 \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/init"]
