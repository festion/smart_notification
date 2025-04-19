ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.16
FROM ${BUILD_FROM}

# Install requirements for add-on
RUN \
    apk add --no-cache \
        python3 \
        py3-pip \
        bash \
        nginx \
        jq \
        curl \
        unzip

# Install bashio
RUN mkdir -p /usr/lib/bashio \
 && curl -sSL https://github.com/hassio-addons/bashio/archive/refs/heads/main.zip -o /tmp/bashio.zip \
 && unzip /tmp/bashio.zip -d /tmp \
 && mv /tmp/bashio-main/lib/* /usr/lib/bashio/ \
 && rm -rf /tmp/bashio.zip /tmp/bashio-main

# Copy app files
WORKDIR /app
COPY ../smart_notification_router/main.py /app/
COPY ../smart_notification_router/run.sh /
COPY ../smart_notification_router/requirements.txt /app/
COPY ../smart_notification_router/web /app/web/
COPY ../smart_notification_router/notification_config.yaml /app/

# Fix any potential line ending issues
RUN sed -i 's/\r$//' /run.sh && \
    chmod a+x /run.sh

# Install Python requirements
RUN pip3 install --no-cache-dir -r requirements.txt

# Expose the application port
EXPOSE 8099

# Start the application
CMD ["/bin/bash", "/run.sh"]