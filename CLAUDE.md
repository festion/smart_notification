# Smart Notification Router - Development Guide

This document provides technical details for development and maintenance of the Smart Notification Router.

## Project Structure

- **main.py**: Core application logic with Flask server implementation
- **notification_config.yaml**: Configuration file for audiences and severity levels
- **Dockerfile**: Container definition for deployment
- **run.sh**: Application startup script
- **requirements.txt**: Python dependencies
- **config.json**: Add-on configuration for Home Assistant

## Core Components

### 1. Flask API Server

The application runs a Flask server exposing a `/notify` endpoint that processes notification requests.

Key components:
- Message deduplication using SHA-256 hashing
- Configurable deduplication time window (default: 300 seconds)
- Request validation and parsing

### 2. Configuration System

The YAML configuration file supports:
- Multiple audience definitions
- Service routing per audience
- Minimum severity level filtering
- Customizable severity level hierarchy

### 3. Notification Routing Logic

The routing logic:
1. Receives a notification request with title, message, severity, and target audiences
2. Checks if the message is a duplicate (sent recently)
3. For each target audience:
   - Retrieves the audience configuration
   - Checks if the message severity meets the minimum threshold
   - Routes to all configured services for that audience if severity is sufficient

## Development Guidelines

### Adding Features

1. **New Notification Channels**:
   - Add service entries to the appropriate audience in `notification_config.yaml`

2. **Audience Templates**:
   - Consider implementing audience templates for common configurations

3. **Enhanced Filtering**:
   - Add content-based filtering or time-based rules

### Testing

```python
# Example test request
import requests

payload = {
    "title": "Test Notification",
    "message": "This is a test message",
    "severity": "high",
    "audience": ["mobile", "dashboard"]
}

response = requests.post("http://localhost:8080/notify", json=payload)
print(response.json())
```

## Docker Container

The application is containerized with:
- Python 3.11 base image
- Minimal dependencies
- Configurable through volume mounts

Build the container with:
```bash
docker build -t smart-notification .
```

## Future Improvements

1. Authentication for the API endpoint
2. Notification history and status tracking
3. Templating system for notification formatting
4. Integration with additional notification services
5. Web UI for configuration management