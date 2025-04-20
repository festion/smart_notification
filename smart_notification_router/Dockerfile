ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

# Install necessary packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-yaml \
    py3-flask \
    py3-requests \
    py3-jinja2

# Create directories
WORKDIR /app
RUN mkdir -p /config

# Copy application files
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Set permissions
RUN chmod -R 755 /app && \
    chmod -R 777 /config

# Install any remaining requirements
RUN pip3 install --no-cache-dir -r /app/requirements.txt || echo "Continuing with system packages"

# Create start script
COPY start.sh /
RUN chmod +x /start.sh

EXPOSE 8080

# Entry point
CMD ["/start.sh"]
