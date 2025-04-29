#!/usr/bin/env python3
import os
import time
import logging
import json
import hashlib
import yaml
import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template, Response

# Import the tag parser
from tag_routing.parser import TagExpressionParser, TagLiteral, TagOperator
from tag_routing.entity_manager import EntityManager, EntityTagManager
from tag_routing.ha_client import HomeAssistantAPIClient
from tag_routing.notification_router import NotificationRouter

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("smart_notification_router")

# Initialize Flask app
app = Flask(
    __name__,
    static_folder=os.path.abspath(os.path.join(
        os.path.dirname(__file__), 'web/static')),
    template_folder=os.path.abspath(os.path.join(
        os.path.dirname(__file__), 'web/templates'))
)

# Log the static folder path for debugging
logger.info(f"Flask static folder path: {app.static_folder}")
logger.info(f"Flask template folder path: {app.template_folder}")

# Initialize clients
ha_client = HomeAssistantAPIClient(demo_mode=True)
entity_manager = EntityManager(demo_mode=True)

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
    'severity_levels': ['low', 'medium', 'high', 'emergency'],
    'port': 8181  # Default port is now 8181
}

# In-memory message cache for deduplication
message_cache = {}
deduplication_ttl = 300  # default: 5 minutes (300 seconds)
notification_history = []  # Store recent notifications

# Load add-on options
def load_options():
    options_path = '/data/options.json'
    
    if os.path.exists(options_path):
        try:
            with open(options_path, 'r') as f:
                options = json.load(f)
                logger.info(f"Loaded options from {options_path}")
                return options
        except Exception as e:
            logger.error(f"Error loading options: {e}")
    
    test_options_path = '/workspaces/smart_notification/test_data/options.json'
    if os.path.exists(test_options_path):
        try:
            with open(test_options_path, 'r') as f:
                options = json.load(f)
                logger.info(f"Loaded test options from {test_options_path}")
                return options
        except Exception as e:
            logger.error(f"Error loading test options: {e}")
    
    logger.warning("Options file not found, using default options")
    return {}

# Load configuration from YAML file
def load_config():
    config_path = os.path.join(os.path.dirname(
        __file__), 'notification_config.yaml')
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

# Get add-on options and override config values if needed
options = load_options()
if options:
    # Override deduplication_ttl if provided in options
    if 'deduplication_ttl' in options:
        deduplication_ttl = options['deduplication_ttl']
        logger.info(f"Setting deduplication TTL from options: {deduplication_ttl}")
    
    # Set port from options if provided
    if 'port' in options:
        config['port'] = options['port']
        logger.info(f"Setting port from options: {config['port']}")

# Initialize the notification router with the config
notification_router = NotificationRouter(ha_client, config)

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
    logger.info("Index route accessed (rendering index.html)")
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
        # Get any additional data to pass to notification services
        additional_data = data.get('data', {})

        logger.info(
            f"Notification received: {title} ({severity}) -> {audiences}")

        # Route the notification using our new NotificationRouter
        routing_result = notification_router.route_notification(
            title=title,
            message=message,
            severity=severity,
            audiences=audiences,
            data=additional_data
        )

        # Add to notification history with routing results
        history_entry = {
            'title': title,
            'message': message,
            'severity': severity,
            'audiences': audiences,
            'timestamp': datetime.datetime.now().isoformat(),
            'routed_to': routing_result.get('sent_to_services', []),
            'routing_success': routing_result.get('success', False),
            'failed_services': routing_result.get('failed_services', [])
        }
        notification_history.append(history_entry)

        # Keep history to last 20 items
        if len(notification_history) > 20:
            notification_history.pop(0)

        return jsonify({
            'success': routing_result.get('success', False),
            'status': 'ok',
            'message': 'Notification processed',
            'routed_count': len(routing_result.get('sent_to_services', [])),
            'details': {
                'title': title,
                'message': message,
                'severity': severity,
                'audiences': audiences,
                'services_notified': routing_result.get('sent_to_services', []),
                'failed_services': routing_result.get('failed_services', [])
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
            severity_levels = request.form.get(
                'severity_levels', '').split(',')
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
                    severity = audience_severities[i] if i < len(
                        audience_severities) else 'low'

                    # Get services (use empty list if not provided)
                    services_str = audience_services[i] if i < len(
                        audience_services) else ''
                    services = [s.strip()
                                for s in services_str.split(',') if s.strip()]

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

# Serve tag manager page


@app.route('/tag-manager')
def tag_manager():
    return render_template('tag_manager.html')

# Simple tag manager (v1)


@app.route('/simple-tag-manager')
def simple_tag_manager():
    return render_template('tag_manager_simple.html')

# API v2 endpoints


@app.route('/api/v2/entities', methods=['GET'])
def get_entities_v2():
    """Get all entities with their tags"""
    try:
        # Get all entities
        entities = entity_manager.get_entities()
        entity_tags = entity_manager.get_entity_tags()

        return jsonify({
            'status': 'ok',
            'entities': entities,
            'entity_tags': entity_tags
        })
    except Exception as e:
        logger.error(f"Error getting entities: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/api/v2/entity-tags', methods=['GET'])
def get_entity_tags_v2():
    """Get all entity tags."""
    try:
        entity_tags = entity_manager.get_entity_tags()
        return jsonify({"status": "ok", "entity_tags": entity_tags})
    except Exception as e:
        logger.error(f"Error getting entity tags: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route('/api/v2/entity-tags', methods=['POST'])
def set_entity_tags_v2():
    """Set tags for an entity."""
    try:
        data = request.json
        entity_id = data.get("entity_id")
        tags = data.get("tags", [])

        if not entity_id:
            return jsonify({"status": "error", "error": "Missing entity_id"}), 400

        entity_manager.set_entity_tags(entity_id, tags)
        return jsonify({"status": "ok", "message": f"Tags updated for {entity_id}"})
    except Exception as e:
        logger.error(f"Error setting entity tags: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route('/api/v2/sync-tags', methods=['POST'])
def sync_tags_v2():
    """Sync entity tags with Home Assistant"""
    try:
        # In a real implementation, we would sync tags with Home Assistant
        # For demo purposes, we'll just return success

        return jsonify({
            'status': 'ok',
            'message': 'Tags synced with Home Assistant'
        })
    except Exception as e:
        logger.error(f"Error syncing tags: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route("/api/v2/batch-update-tags", methods=["POST"])
def batch_update_tags_v2():
    """Update tags for multiple entities at once."""
    try:
        data = request.json
        entity_ids = data.get("entity_ids", [])
        tags = data.get("tags", [])
        operation = data.get("operation", "add")  # add, remove, or replace

        if not entity_ids:
            return jsonify({"status": "error", "error": "Missing entity_ids"}), 400

        if not tags:
            return jsonify({"status": "error", "error": "Missing tags"}), 400

        if operation not in ["add", "remove", "replace"]:
            return jsonify({"status": "error", "error": f"Invalid operation: {operation}"}), 400

        # Process batch update
        results = entity_manager.batch_update_tags(entity_ids, tags, operation)

        return jsonify({
            "status": "ok",
            "operation": operation,
            "entities_updated": len(results),
            "updated_entity_tags": results
        })
    except Exception as e:
        logger.error(f"Error in batch tag update: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route('/api/v2/test-expression', methods=['POST'])
def test_expression_v2():
    """Test a tag expression against entities"""
    try:
        data = request.json
        expression = data.get('expression')

        if not expression:
            return jsonify({
                'status': 'error',
                'error': 'Expression is required'
            }), 400

        # Create a tag expression parser
        parser = TagExpressionParser()

        try:
            # Parse the expression
            parse_tree = parser.parse(expression)

            # Get expression tree for visualization
            expression_tree = parse_tree.to_dict() if hasattr(parse_tree, 'to_dict') else {
                "error": "Expression tree not available"}

            # Get all entities
            entities = entity_manager.get_entities()
            entity_tags = entity_manager.get_entity_tags()

            # Test expression against each entity
            matches = []
            non_matches = []

            for entity in entities:
                entity_id = entity['entity_id']
                entity_tag_list = entity_tags.get(entity_id, [])

                # Evaluate if entity matches the expression
                if parse_tree.evaluate(entity_tag_list):
                    # Add to matches with tags
                    entity_copy = entity.copy()
                    entity_copy['tags'] = entity_tag_list
                    matches.append(entity_copy)
                else:
                    # Add to non-matches with tags
                    entity_copy = entity.copy()
                    entity_copy['tags'] = entity_tag_list
                    non_matches.append(entity_copy)

            return jsonify({
                'status': 'ok',
                'expression': expression,
                'matches': matches,
                'non_matches': non_matches,
                'total_entities': len(entities),
                'expression_tree': expression_tree
            })
        except Exception as e:
            # Handle parsing errors
            return jsonify({
                'status': 'error',
                'error': f'Invalid expression: {str(e)}'
            }), 400

    except Exception as e:
        logger.error(f"Error testing expression: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


def main():
    """Main function to run the Smart Notification Router."""
    # Get port from config or use default
    port = config.get('port', 8181)
    
    logger.info(f"Smart Notification Router starting on port {port}")
    try:
        # Start Flask server with debug enabled for troubleshooting
        app.run(host='0.0.0.0', port=port, debug=True)
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
