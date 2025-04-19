FROM ghcr.io/hassio-addons/base:12.2.7

ENV LANG C.UTF-8

# Install required packages
RUN apk add --no-cache \
    bash \
    jq \
    python3 \
    py3-pip \
    nginx \
    curl \
    unzip

RUN mkdir -p /usr/lib/bashio \
 && curl -sSL https://github.com/hassio-addons/bashio/archive/refs/heads/main.zip -o /tmp/bashio.zip \
 && unzip /tmp/bashio.zip -d /tmp \
 && mv /tmp/bashio-main/lib/* /usr/lib/bashio/ \
 && rm -rf /tmp/bashio.zip /tmp/bashio-main

# Copy root filesystem
COPY rootfs /

# Copy app files
COPY main.py /app/
COPY run.sh /
COPY requirements.txt /app/
COPY web /app/web/
COPY notification_config.yaml /app/

# Fix any potential line ending issues
RUN sed -i 's/\r$//' /run.sh && \
    chmod a+x /run.sh

# Install Python requirements
WORKDIR /app
RUN pip3 install --no-cache-dir -r requirements.txt

# Make sure bash is the shell used
SHELL ["/bin/bash", "-c"]

# Set the entry point
ENTRYPOINT ["/bin/bash"]
CMD ["/run.sh"]