ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
ENV S6_KEEP_ENV=1
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2
ENV S6_CMD_WAIT_FOR_SERVICES=1

# Install necessary packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-setuptools \
    py3-wheel

# Copy add-on files
RUN mkdir -p /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Create config directory
RUN mkdir -p /config

# Set directory permissions
RUN chmod -R 755 /app
RUN chmod -R 777 /config

# Install requirements
WORKDIR /app
RUN apk add --no-cache \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2

# Install requirements from requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt || \
    echo "Continuing with system packages only"

# Copy root filesystem (S6 overlay)
COPY rootfs /

# Make sure scripts are executable
RUN chmod a+x /etc/services.d/smart-notification/run

CMD [ "/usr/bin/with-contenv", "python3", "/app/main.py" ]
