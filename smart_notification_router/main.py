#!/usr/bin/env python3
import os
import time
import logging
import json
import hashlib
import yaml
import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template, Response

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("smart_notification_router")

# Initialize Flask app
app = Flask(__name__, static_folder='web/static', template_folder='web/templates')

# Default configuration
DEFAULT_CONFIG = {
    'audiences': {
        'mobile': {
            'services': ['notify.mobile_app_default'],
            'min_severity': 'high',
            'description': 'Mobile device notifications'
        },
        'dashboard': {
            'services': ['persistent_notification.create'],
            'min_severity': 'low',
            'description': 'Home Assistant dashboard notifications'
        }
    },
    'severity_levels': ['low', 'medium', 'high', 'emergency']
}

# In-memory message cache for deduplication
message_cache = {}
deduplication_ttl = 300  # default: 5 minutes (300 seconds)
notification_history = []  # Store recent notifications

# Load configuration from YAML file
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'notification_config.yaml')
    if os.path.exists(config_path):
        with open(config_path, 'r') as file:
            try:
                config = yaml.safe_load(file)
                logger.info(f"Configuration loaded from {config_path}")
                return config
            except Exception as e:
                logger.error(f"Error loading configuration: {e}")
    
    logger.warning("Using default configuration")
    return DEFAULT_CONFIG

# Get current configuration
config = load_config()

# Helper function to check message deduplication
def is_duplicate(message_data):
    message_hash = hashlib.sha256(
        f"{message_data.get('title', '')}-{message_data.get('message', '')}-{','.join(message_data.get('audience', []))}".encode()
    ).hexdigest()
    
    current_time = time.time()
    if message_hash in message_cache:
        if current_time - message_cache[message_hash] < deduplication_ttl:
            return True
    
    # Update cache with new timestamp
    message_cache[message_hash] = current_time
    return False

# Clean expired cache entries periodically
def clean_message_cache():
    current_time = time.time()
    expired_keys = []
    for key, timestamp in message_cache.items():
        if current_time - timestamp > deduplication_ttl:
            expired_keys.append(key)
    
    for key in expired_keys:
        del message_cache[key]

# Main web UI
@app.route('/')
def index():
    logger.info("Index route accessed")
    return render_template('index.html', config=config)

# Emergency UI for testing when main UI has issues
@app.route('/emergency')
def emergency():
    return """
    <html>
    <head>
        <title>Smart Notification Router - Emergency UI</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
            button { background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }
            .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>Smart Notification Router - Emergency Test Interface</h1>
        <div class="form-group">
            <label for="title">Title:</label>
            <input type="text" id="title" value="Test Notification">
        </div>
        <div class="form-group">
            <label for="message">Message:</label>
            <textarea id="message" rows="3">This is a test message from the Smart Notification Router.</textarea>
        </div>
        <div class="form-group">
            <label for="severity">Severity:</label>
            <select id="severity">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
            </select>
        </div>
        <div class="form-group">
            <label>Audience:</label>
            <div>
                <input type="checkbox" id="mobile" value="mobile"> 
                <label for="mobile">Mobile</label>
            </div>
            <div>
                <input type="checkbox" id="dashboard" value="dashboard" checked> 
                <label for="dashboard">Dashboard</label>
            </div>
        </div>
        <button onclick="sendNotification()">Send Notification</button>
        
        <div id="result" class="result" style="display: none;"></div>
        
        <script>
            function sendNotification() {
                // Get form values
                const title = document.getElementById('title').value;
                const message = document.getElementById('message').value;
                const severity = document.getElementById('severity').value;
                
                // Get selected audiences
                const audiences = [];
                document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                    audiences.push(checkbox.value);
                });
                
                // Create payload
                const payload = {
                    title: title,
                    message: message,
                    severity: severity,
                    audience: audiences
                };
                
                // Send request
                fetch('/notify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })
                .then(response => response.json())
                .then(data => {
                    // Display result
                    const resultDiv = document.getElementById('result');
                    resultDiv.innerHTML = '<h3>Result:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    resultDiv.style.display = 'block';
                })
                .catch(error => {
                    // Display error
                    const resultDiv = document.getElementById('result');
                    resultDiv.innerHTML = '<h3>Error:</h3><pre>' + error + '</pre>';
                    resultDiv.style.display = 'block';
                });
            }
        </script>
    </body>
    </html>
    """

# API endpoint for notifications
@app.route('/notify', methods=['POST'])
def notify():
    try:
        # Get request data (support both JSON and form data)
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
        else:
            # Handle form data
            data = {
                'title': request.form.get('title', ''),
                'message': request.form.get('message', ''),
                'severity': request.form.get('severity', 'medium'),
                'audience': request.form.getlist('audience')
            }
        
        if not data:
            return jsonify({'success': False, 'error': 'Invalid payload'}), 400
        
        # Validate required fields
        if not all(k in data for k in ['title', 'message', 'audience']):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Check for duplicate message
        if is_duplicate(data):
            return jsonify({'success': True, 'status': 'duplicate', 'info': 'Duplicate message, not sent'}), 200
        
        # Process notification
        title = data.get('title')
        message = data.get('message')
        severity = data.get('severity', 'medium')
        audiences = data.get('audience', [])
        
        logger.info(f"Notification received: {title} ({severity}) -> {audiences}")
        
        # In a real implementation, this would route to notification services
        # For now, we just log the notification and add to history
        
        # Add to notification history
        notification_history.append({
            'title': title,
            'message': message,
            'severity': severity,
            'audiences': audiences,
            'timestamp': datetime.datetime.now().isoformat(),
            'routed_to': []  # Would contain actual services in real implementation
        })
        
        # Keep history to last 20 items
        if len(notification_history) > 20:
            notification_history.pop(0)
        
        return jsonify({
            'success': True, 
            'status': 'ok',
            'message': 'Notification processed',
            'routed_count': 0,  # In real implementation, this would be the count of services notified
            'details': {
                'title': title,
                'message': message,
                'severity': severity,
                'audiences': audiences
            }
        })
    
    except Exception as e:
        logger.error(f"Error processing notification: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Status endpoint to check if service is running
@app.route('/status')
def status():
    clean_message_cache()  # Clean expired messages when checking status
    
    return jsonify({
        'status': 'running',
        'message_count': len(message_cache),
        'deduplication_ttl': deduplication_ttl,
        'notification_count': len(notification_history),
        'timestamp': datetime.datetime.now().isoformat()
    })

# User endpoint for UI (simulated user data)
@app.route('/user')
def user():
    return jsonify({
        'status': 'ok',
        'user': {
            'id': 'default',
            'name': 'Home Assistant User',
            'is_admin': True,  # Let user be admin for testing UI
            'audiences': list(config['audiences'].keys()),
            'preferences': {
                'min_severity': 'low',
                'notifications_enabled': True
            }
        }
    })

# Configuration endpoint (GET for retrieving, POST for updating)
@app.route('/config', methods=['GET', 'POST'])
def configuration():
    global config
    
    if request.method == 'GET':
        return jsonify({
            'status': 'ok',
            'config': config
        })
    
    elif request.method == 'POST':
        try:
            # In a real implementation, this would update the YAML file
            # For now, just update the in-memory config
            
            # Get form data
            severity_levels = request.form.get('severity_levels', '').split(',')
            severity_levels = [s.strip() for s in severity_levels if s.strip()]
            
            if severity_levels:
                config['severity_levels'] = severity_levels
            
            # Get audience data (this is a simplified version)
            audience_names = request.form.getlist('audience_name')
            audience_severities = request.form.getlist('audience_severity')
            audience_services = request.form.getlist('audience_services')
            
            if audience_names:
                # Create new audiences config
                new_audiences = {}
                
                for i in range(len(audience_names)):
                    name = audience_names[i]
                    if not name:
                        continue
                    
                    # Get severity (use default if not provided)
                    severity = audience_severities[i] if i < len(audience_severities) else 'low'
                    
                    # Get services (use empty list if not provided)
                    services_str = audience_services[i] if i < len(audience_services) else ''
                    services = [s.strip() for s in services_str.split(',') if s.strip()]
                    
                    new_audiences[name] = {
                        'min_severity': severity,
                        'services': services,
                        'description': f'{name} notifications'
                    }
                
                if new_audiences:
                    config['audiences'] = new_audiences
            
            return jsonify({
                'status': 'ok',
                'message': 'Configuration updated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error updating configuration: {e}")
            return jsonify({
                'status': 'error',
                'message': f'Error updating configuration: {str(e)}'
            }), 500

# Notification history endpoint
@app.route('/notifications')
def get_notifications():
    return jsonify({
        'status': 'ok',
        'notifications': notification_history
    })

# Debug routes endpoint
@app.route('/routes')
def get_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'route': str(rule)
        })
    
    return jsonify({
        'status': 'ok',
        'routes': routes
    })

# Debug endpoint
@app.route('/debug')
def debug():
    debug_info = {
        'app_info': {
            'static_folder': app.static_folder,
            'template_folder': app.template_folder,
            'static_url_path': app.static_url_path
        },
        'config': config,
        'cache_info': {
            'message_cache_count': len(message_cache),
            'deduplication_ttl': deduplication_ttl
        },
        'notification_history': len(notification_history),
        'environment': dict(os.environ),
        'routes': [str(rule) for rule in app.url_map.iter_rules()]
    }
    
    return jsonify(debug_info)

# Request debug endpoint (used by simple tag manager)
@app.route('/request-debug')
def request_debug():
    debug_info = {
        'method': request.method,
        'url': request.url,
        'headers': dict(request.headers),
        'args': dict(request.args),
        'form': dict(request.form) if request.form else None,
        'json': request.json if request.is_json else None,
        'cookies': dict(request.cookies),
        'remote_addr': request.remote_addr
    }
    
    return jsonify(debug_info)

# Static files (served from web/static)
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory(app.static_folder, path)

# Serve tag manager page
@app.route('/tag-manager')
def tag_manager():
    return render_template('tag_manager.html')

# Simple tag manager (v1)
@app.route('/simple-tag-manager')
def simple_tag_manager():
    return render_template('tag_manager_simple.html')

def main():
    """Main function to run the Smart Notification Router."""
    logger.info("Smart Notification Router started")
    try:
        # Start Flask server with debug enabled for troubleshooting
        app.run(host='0.0.0.0', port=8080, debug=True)
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Error in main loop: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Fatal error in main(): {e}", exc_info=True)
        import sys
        sys.exit(1)