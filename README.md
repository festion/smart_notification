# Smart Notification Router

A flexible notification routing service for Home Assistant that enables targeted notifications based on severity and audience.

![Smart Notification Router](https://github.com/festion/smart_notification/raw/main/smart_notification_router/logo.svg)

## Features

- **Severity-based filtering**: Route notifications based on priority levels (low, medium, high, emergency)
- **Audience targeting**: Send notifications only to relevant recipients
- **Deduplication**: Prevent notification spam by filtering duplicate messages
- **Simple REST API**: Easy integration with any system that can make HTTP requests
- **Web UI**: Configure notification rules through a user-friendly interface
- **Home Assistant Integration**: Native add-on for seamless Home Assistant integration

## Installation

### As a Home Assistant Add-on

1. Navigate to **Settings** > **Add-ons** > **Add-on Store**
2. Click the menu (⋮) in the top right corner and select **Repositories**
3. Add the repository URL: `https://github.com/festion/smart_notification`
4. Find the "Smart Notification Router" add-on in the add-on store and click **Install**
5. Start the add-on and open the Web UI to configure your notification settings

## Configuration

Configuration can be done through the Web UI or by editing the add-on configuration:

```yaml
deduplication_ttl: 300
audiences:
  mobile:
    services:
      - notify.mobile_app_pixel_9_pro_xl
    min_severity: high
  dashboard:
    services:
      - persistent_notification.create
    min_severity: low
severity_levels:
  - low
  - medium
  - high
  - emergency
```

### Configuration Options

- **deduplication_ttl**: Time in seconds to prevent duplicate notifications (default: 300)
- **audiences**: Define recipient groups and their notification preferences
  - Each audience has:
    - **services**: List of notification services to use
    - **min_severity**: Minimum severity level to trigger notifications
- **severity_levels**: List of severity levels in ascending order of importance

## API Usage

Send notifications via a simple HTTP POST request:

```
POST /notify
```

Request body:
```json
{
  "title": "Temperature Warning",
  "message": "Kitchen temperature has exceeded 30°C",
  "severity": "high",
  "audience": ["mobile", "dashboard"]
}
```

## Home Assistant Automation Example

```yaml
automation:
  - alias: "High Temperature Alert"
    trigger:
      - platform: numeric_state
        entity_id: sensor.kitchen_temperature
        above: 30
    action:
      - service: rest_command.smart_notification
        data:
          title: "Temperature Warning"
          message: "Kitchen temperature has exceeded 30°C"
          severity: "high"
          audience: ["mobile", "dashboard"]
```

Rest command configuration:
```yaml
rest_command:
  smart_notification:
    url: http://localhost:8099/notify
    method: POST
    content_type: application/json
    payload: >
      {
        "title": "{{ title }}",
        "message": "{{ message }}",
        "severity": "{{ severity }}",
        "audience": {{ audience }}
      }
```

## Repository Structure

This repository follows the Home Assistant add-on repository structure:

```
smart_notification/               # Repository root
├── README.md                     # Repository README
├── CLAUDE.md                     # Development documentation
├── repository.json               # Repository information
└── smart_notification_router/    # Add-on directory
    ├── config.json               # Add-on configuration
    ├── Dockerfile                # Add-on container definition
    ├── main.py                   # Main application code
    ├── requirements.txt          # Python dependencies
    ├── README.md                 # Add-on specific README
    ├── rootfs/                   # Add-on filesystem
    ├── web/                      # Web UI files
    └── ...                       # Other add-on files
```

## License

MIT