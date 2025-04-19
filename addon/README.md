# Smart Notification Router

A flexible notification routing service for Home Assistant that enables targeted notifications based on severity and audience.

## Features

- **Severity-based filtering**: Route notifications based on priority levels
- **Audience targeting**: Send notifications only to relevant recipients
- **Deduplication**: Prevent notification spam by filtering duplicate messages
- **Simple REST API**: Easy integration with any system that can make HTTP requests
- **Web UI**: Configure notification rules through a user-friendly interface

## Configuration

Configuration can be done through the Web UI or by editing the add-on configuration:

```yaml
# Deduplication time window in seconds
deduplication_ttl: 300

# Define your notification audiences
audiences:
  mobile:  # Audience name
    services:  # Home Assistant notification services to use
      - notify.mobile_app_pixel_9_pro_xl
    min_severity: high  # Only send high or higher severity notifications
  
  dashboard:
    services:
      - persistent_notification.create
    min_severity: low  # Send all notifications

# Define your severity levels from lowest to highest
severity_levels:
  - low
  - medium
  - high
  - emergency
```

See the [repository README](https://github.com/festion/smart_notification) for full documentation.