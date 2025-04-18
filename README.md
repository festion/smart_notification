# Smart Notification Router

A flexible notification routing service for smart home systems that enables targeted notifications based on severity and audience.

## Features

- **Severity-based filtering**: Route notifications based on priority levels (low, medium, high, emergency)
- **Audience targeting**: Send notifications only to relevant recipients
- **Deduplication**: Prevent notification spam by filtering duplicate messages
- **Simple REST API**: Easy integration with any system that can make HTTP requests

## Configuration

Notification routing is controlled by the `notification_config.yaml` file:

```yaml
audiences:
  mobile:
    services:
      - notify.mobile_app_pixel_9_pro_xl
    min_severity: high

  dashboard:
    services:
      - persistent_notification.create
    min_severity: low

severity_levels: [low, medium, high, emergency]
```

### Configuration Options

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

## Installation

### Docker

```bash
docker build -t smart-notification .
docker run -p 8080:8080 -v /path/to/config:/app smart-notification
```

### Manual

```bash
pip install -r requirements.txt
bash run.sh
```

## License

MIT