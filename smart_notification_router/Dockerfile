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
RUN mkdir -p /app
COPY main.py /app/
COPY notification_config.yaml /app/
COPY requirements.txt /app/
COPY web /app/web/

# Set permissions
RUN chmod a+x /run.sh

# Install requirements
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt

CMD [ "/run.sh" ]
