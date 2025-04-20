ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
ENV S6_KEEP_ENV=1
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2
ENV S6_VERBOSITY=4
ENV S6_CMD_WAIT_FOR_SERVICES=1
ENV S6_LOGGING=1

# Create directories
RUN mkdir -p /app /config /var/log/smart_notification

# Copy application files
WORKDIR /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Create debug script
RUN echo '#!/bin/sh\n\
echo "DEBUG: Starting diagnostic script"\n\
echo "===== Environment variables ====="\n\
env | sort\n\
echo "===== Process list ====="\n\
ps aux\n\
echo "===== Directory structure ====="\n\
find / -name "*s6*" -type d | sort\n\
echo "===== Script permissions ====="\n\
ls -la /etc/services.d/smart-notification/run || echo "Run script not found"\n\
echo "===== S6 version ====="\n\
/command/s6-version || echo "S6 command not found"\n\
' > /debug.sh && chmod +x /debug.sh

# Install necessary packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2

# Set permissions
RUN chmod -R 755 /app && \
    chmod -R 777 /config

# Install any remaining requirements
RUN pip3 install --no-cache-dir -r /app/requirements.txt || echo "Continuing with system packages"

# Create direct script as backup
COPY start.sh /
RUN chmod +x /start.sh

# Copy root filesystem (after all other operations)
COPY rootfs /

# Make scripts executable for S6
RUN find /etc/services.d -type f -name "run" -exec chmod +x {} \;
RUN find /etc/s6-overlay -type f -name "run" -exec chmod +x {} \;
RUN find /etc/s6-overlay -type f -exec chmod +x {} \;
RUN find /etc/services.d -type f -exec chmod +x {} \;

# Set explicit CMD
CMD [ "/init" ]

EXPOSE 8080
