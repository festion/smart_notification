ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

# Install necessary packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy add-on files
COPY run.sh /
COPY app /app

# Set permissions
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
