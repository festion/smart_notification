#!/usr/bin/with-contenv bashio

# Get config values
CONFIG_SETTING1=$(bashio::config 'setting1')
CONFIG_SETTING2=$(bashio::config 'setting2')

bashio::log.info "Starting add-on with setting1=${CONFIG_SETTING1} and setting2=${CONFIG_SETTING2}"

# Start your application
python3 /app/main.py
