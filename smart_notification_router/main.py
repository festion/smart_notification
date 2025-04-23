import time
import json
import yaml
import hashlib
import os
from flask import Flask, request, jsonify, render_template, redirect, url_for
import logging
import threading

# For module imports, prepare the path
import sys
import os

# Add current directory to path so we can import tag_routing as a module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import tag-based routing system
try:
    # Try relative import first
    import tag_routing.integration
    initialize_tag_routing = tag_routing.integration.initialize_tag_routing
    register_tag_routing_endpoints = tag_routing.integration.register_tag_routing_endpoints
    logger = logging.getLogger('smart_notification')
    logger.info("Successfully imported tag_routing module (relative)")
except ImportError as e:
    logger = logging.getLogger('smart_notification')
    logger.warning(f"Cannot import tag_routing module: {e}. V2 features will be disabled.")
    
    # Create dummy functions for compatibility
    def initialize_tag_routing(config):
        return {}
        
    def register_tag_routing_endpoints(app):
        pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('smart_notification')

# Configuration paths
CONFIG_FILE = "/config/notification_config.yaml"
OPTIONS_FILE = "/data/options.json"

# Default values
DEFAULT_CONFIG = {
    "audiences": {
        "mobile": {
            "services": ["notify.mobile_app"],
            "min_severity": "high"
        },
        "dashboard": {
            "services": ["persistent_notification.create"],
            "min_severity": "low"
        }
    },
    "severity_levels": ["low", "medium", "high", "emergency"]
}

# Initialize variables
config = DEFAULT_CONFIG.copy()
DEDUPLICATION_TTL = 300  # seconds
SENT_MESSAGES = {}

# User context (will be populated from Home Assistant)
CURRENT_USER = {
    "id": "default",
    "name": "Default User",
    "is_admin": False,
    "audiences": ["mobile", "dashboard"],
    "preferences": {
        "min_severity": "low",
        "notifications_enabled": True,
        "notification_services": ["notify.mobile_app_default"]
    }
}

app = Flask(__name__, 
    static_folder='/app/web/static',
    template_folder='/app/web/templates')
    
# Configure for reverse proxy/ingress
app.config['APPLICATION_ROOT'] = '/'
app.config['PREFERRED_URL_SCHEME'] = 'http'

# Support Home Assistant ingress by properly handling the script_name and path_info
class ReverseProxied(object):
    """Wrap the application in this middleware to handle multiple layers of reverse proxies"""
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Handle various proxy headers that might be present
        # These could come from Home Assistant ingress, NPM, or other proxies

        # First, check for X-Forwarded-Host, which NPM might set
        forwarded_host = environ.get('HTTP_X_FORWARDED_HOST', '')
        if forwarded_host:
            environ['HTTP_HOST'] = forwarded_host

        # Check for X-Forwarded-For to get the original client IP
        forwarded_for = environ.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded_for:
            environ['REMOTE_ADDR'] = forwarded_for.split(',')[0].strip()
            
        # Check for X-Forwarded-Proto to handle https
        scheme = environ.get('HTTP_X_FORWARDED_PROTO', '')
        if scheme:
            environ['wsgi.url_scheme'] = scheme
            
        # Look for X-Forwarded-Prefix or X-Script-Name which NPM might use
        script_name = environ.get('HTTP_X_FORWARDED_PREFIX', '')
        if not script_name:
            script_name = environ.get('HTTP_X_SCRIPT_NAME', '')
            
        # Also check Home Assistant specific headers
        if not script_name:
            script_name = environ.get('HTTP_X_INGRESS_PATH', '')
        
        # Apply the script_name if found
        if script_name:
            # Store the original for debugging
            environ['HTTP_ORIGINAL_SCRIPT_NAME'] = environ.get('SCRIPT_NAME', '')
            environ['HTTP_ORIGINAL_PATH_INFO'] = environ.get('PATH_INFO', '')
            
            # Update the SCRIPT_NAME
            environ['SCRIPT_NAME'] = script_name
            
            # Fix PATH_INFO if it starts with the script_name
            path_info = environ.get('PATH_INFO', '')
            if path_info.startswith(script_name):
                environ['PATH_INFO'] = path_info[len(script_name):]
        
        # Log proxy headers for debugging in development
        if os.environ.get('FLASK_ENV') == 'development':
            proxy_headers = {k: v for k, v in environ.items() if k.startswith('HTTP_X_')}
            if proxy_headers:
                print("Proxy headers:", proxy_headers)
                print("SCRIPT_NAME:", environ.get('SCRIPT_NAME', ''))
                print("PATH_INFO:", environ.get('PATH_INFO', ''))
            
        return self.app(environ, start_response)

# Apply the reverse proxy middleware
app.wsgi_app = ReverseProxied(app.wsgi_app)

# Set up proper URL defaults
app.config['SERVER_NAME'] = None

def load_options():
    """Load options from the add-on configuration"""
    global DEDUPLICATION_TTL, config
    try:
        if os.path.exists(OPTIONS_FILE):
            with open(OPTIONS_FILE, "r") as f:
                options = json.load(f)
                
                # Set deduplication TTL
                DEDUPLICATION_TTL = options.get("deduplication_ttl", 300)
                
                # Handle audiences if present in options
                if "audiences" in options:
                    logger.debug(f"Found audiences in options: {type(options['audiences'])}")
                    
                    # If the options file has audiences as a dictionary, use it to update config
                    if isinstance(options["audiences"], dict):
                        if "audiences" not in config or not isinstance(config["audiences"], dict):
                            config["audiences"] = {}
                            
                        # Update each audience from options
                        for audience_name, audience_data in options["audiences"].items():
                            if isinstance(audience_data, dict):
                                config["audiences"][audience_name] = audience_data
                                logger.debug(f"Added audience from options: {audience_name}")
                
                # Handle severity levels if present
                if "severity_levels" in options and isinstance(options["severity_levels"], list):
                    config["severity_levels"] = options["severity_levels"]
                    
                return options
        return {}
    except Exception as e:
        logger.error(f"Error loading options: {e}")
        return {}

def load_config():
    """Load notification configuration"""
    global config
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r") as f:
                loaded_config = yaml.safe_load(f)
                if loaded_config:
                    # Validate and fix the config structure if needed
                    if not isinstance(loaded_config, dict):
                        logger.error(f"Invalid config format - not a dictionary: {type(loaded_config)}")
                        return DEFAULT_CONFIG
                    
                    # Ensure audiences is a dictionary
                    if "audiences" not in loaded_config:
                        logger.warning("No audiences in config, using defaults")
                        loaded_config["audiences"] = DEFAULT_CONFIG["audiences"]
                    elif not isinstance(loaded_config["audiences"], dict):
                        logger.warning(f"Invalid audiences format: {type(loaded_config['audiences'])}, using defaults")
                        loaded_config["audiences"] = DEFAULT_CONFIG["audiences"]
                    
                    # Ensure severity_levels is a list
                    if "severity_levels" not in loaded_config:
                        logger.warning("No severity levels in config, using defaults")
                        loaded_config["severity_levels"] = DEFAULT_CONFIG["severity_levels"]
                    elif not isinstance(loaded_config["severity_levels"], list):
                        logger.warning(f"Invalid severity_levels format: {type(loaded_config['severity_levels'])}, using defaults")
                        loaded_config["severity_levels"] = DEFAULT_CONFIG["severity_levels"]
                    
                    config = loaded_config
                    logger.info("Configuration loaded successfully")
                    return config
        else:
            # If config file doesn't exist, create it with defaults
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            with open(CONFIG_FILE, "w") as f:
                yaml.dump(DEFAULT_CONFIG, f, default_flow_style=False)
            logger.info("Created default configuration file")
    except Exception as e:
        logger.error(f"Error loading config: {e}")
    
    return config

def save_config():
    """Save notification configuration"""
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            yaml.dump(config, f, default_flow_style=False)
        logger.info("Configuration saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        return False

def get_hash(payload):
    """Create a hash for deduplication"""
    base = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(base.encode()).hexdigest()

@app.route("/")
def index():
    """Web UI home page"""
    # The load_config function now validates and fixes the configuration
    # So we can use it directly without additional checks here
    current_config = load_config()
    
    # Only log detailed debug information if requested
    if os.environ.get('DEBUG_CONFIG', '').lower() in ('true', '1', 'yes', 'on'):
        logger.info(f"Config structure: {type(current_config)}")
        for key, value in current_config.items():
            logger.info(f"Key: {key}, Type: {type(value)}")
            if key == "audiences" and isinstance(value, dict):
                for audience_name, audience_config in value.items():
                    logger.info(f"  Audience: {audience_name}, Type: {type(audience_config)}")
    
    logger.debug(f"Rendering template with configured audiences: {list(current_config.get('audiences', {}).keys())}")
    
    return render_template(
        "index.html", 
        config=current_config,
        deduplication_ttl=DEDUPLICATION_TTL
    )

@app.route("/tag-manager")
def tag_manager():
    """Tag manager page"""
    # Gather debug information about the request for logging
    request_info = {
        "url": str(request.url),
        "base_url": str(request.base_url),
        "url_root": str(request.url_root),
        "path": request.path,
        "script_root": request.script_root,
        "headers": {key: value for key, value in request.headers.items()},
        "remote_addr": request.remote_addr,
        "host": request.host,
    }
    
    logger.info(f"Tag manager page requested with request info: {request_info}")
    
    # Log environment variables for debugging
    proxy_headers = {k: v for k, v in request.environ.items() if k.startswith('HTTP_X_')}
    if proxy_headers:
        logger.info(f"Proxy headers detected: {proxy_headers}")
        logger.info(f"SCRIPT_NAME: {request.environ.get('SCRIPT_NAME', '')}")
        logger.info(f"PATH_INFO: {request.environ.get('PATH_INFO', '')}")
    
    try:
        logger.info("Attempting to render tag_manager.html template")
        return render_template("tag_manager.html")
    except Exception as e:
        logger.error(f"Error rendering tag manager template: {e}")
        try:
            # Try the simple template as fallback
            logger.info("Attempting to render simple tag manager template as fallback")
            return render_template("tag_manager_simple.html")
        except Exception as e2:
            logger.error(f"Error rendering simple tag manager template: {e2}")
            return f"Error rendering tag manager: {e}", 500
            
@app.route("/simple-tag-manager")
def simple_tag_manager():
    """Simple tag manager page for testing"""
    logger.info("Simple tag manager page requested")
    try:
        return render_template("tag_manager_simple.html")
    except Exception as e:
        logger.error(f"Error rendering simple tag manager template: {e}")
        return f"Error: {e}", 500

@app.route("/routes")
def list_routes():
    """Show all available routes for debugging"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": [m for m in rule.methods if m != "OPTIONS" and m != "HEAD"],
            "path": str(rule)
        })
    
    # Check if template directory exists
    template_dir = app.template_folder
    templates = []
    if os.path.exists(template_dir):
        templates = os.listdir(template_dir)
    
    return jsonify({
        "routes": routes,
        "template_folder": template_dir,
        "templates": templates,
        "static_folder": app.static_folder,
        "blueprints": list(app.blueprints.keys()),
        "version": "2.0.0-alpha.17"
    })

@app.route("/debug")
def debug_info():
    """Display debug information"""
    import sys
    import flask
    
    # Gather debug information
    debug_data = {
        "Python Version": sys.version,
        "Flask Version": flask.__version__,
        "App Name": app.name,
        "App Import Name": app.import_name,
        "URL Map": str(app.url_map),
        "Blueprints": list(app.blueprints.keys()),
        "Static Folder": app.static_folder,
        "Template Folder": app.template_folder,
        "Available Templates": os.listdir(app.template_folder) if os.path.exists(app.template_folder) else [],
        "Environment": dict(os.environ),
        "Sys Path": sys.path,
        "Current Directory": os.getcwd(),
        "Config": load_config(),
    }
    
    # Check for tag_routing module
    try:
        import tag_routing
        debug_data["Tag Routing Available"] = True
        debug_data["Tag Routing Version"] = getattr(tag_routing, "__version__", "Unknown")
        debug_data["Tag Routing Path"] = tag_routing.__file__
    except ImportError as e:
        debug_data["Tag Routing Available"] = False
        debug_data["Tag Routing Error"] = str(e)
    
    return jsonify(debug_data)

@app.route("/request-debug")
def request_debug():
    """Display detailed information about the current request"""
    request_data = {
        "URL": str(request.url),
        "Base URL": str(request.base_url),
        "URL Root": str(request.url_root),
        "Path": request.path,
        "Full Path": request.full_path,
        "Script Root": request.script_root,
        "Headers": dict(request.headers),
        "Method": request.method,
        "Query String": request.query_string.decode('utf-8'),
        "Environment": {k: str(v) for k, v in request.environ.items()},
        "Remote Address": request.remote_addr,
        "Host": request.host,
    }
    
    return jsonify(request_data)

@app.route("/config", methods=["POST"])
def update_config():
    """Update configuration via web UI"""
    global config
    
    form_data = request.form
    
    # Update audiences
    new_audiences = {}
    audience_names = form_data.getlist("audience_name")
    audience_services = form_data.getlist("audience_services")
    audience_severity = form_data.getlist("audience_severity")
    
    for i in range(len(audience_names)):
        name = audience_names[i]
        if name:
            services = audience_services[i].split(",")
            services = [s.strip() for s in services]
            severity = audience_severity[i]
            
            new_audiences[name] = {
                "services": services,
                "min_severity": severity
            }
    
    # Update severity levels
    severity_levels = form_data.get("severity_levels", "").split(",")
    severity_levels = [s.strip() for s in severity_levels]
    
    # Update config
    config["audiences"] = new_audiences
    config["severity_levels"] = severity_levels
    
    # Save config
    save_config()
    
    return redirect(url_for("index"))

@app.route("/notify", methods=["POST"])
def notify():
    """API endpoint to receive notifications"""
    try:
        # Log request information for debugging
        logger.debug(f"Content-Type: {request.headers.get('Content-Type')}")
        logger.debug(f"Form data present: {bool(request.form)}")
        logger.debug(f"JSON available: {request.is_json}")
        
        # Initialize payload as empty dict
        payload = {}
        
        # Handle different request formats
        content_type = request.headers.get('Content-Type', '')
        
        # Case 1: FormData submission (from web UI)
        if request.form:
            logger.debug("Processing form data submission")
            # Get form data
            title = request.form.get('title')
            message = request.form.get('message')
            severity = request.form.get('severity')
            # Handle audience as list from form
            audience = request.form.getlist('audience')
            
            payload = {
                'title': title,
                'message': message,
                'severity': severity,
                'audience': audience
            }
        
        # Case 2: JSON API request
        elif 'application/json' in content_type or request.is_json:
            logger.debug("Processing JSON submission")
            try:
                payload = request.get_json(force=True)
            except Exception as json_err:
                logger.error(f"JSON parsing error: {json_err}")
                return jsonify({"status": "error", "message": f"JSON parsing error: {json_err}"}), 400
        
        # Case 3: Other formats - try to handle as best we can
        else:
            logger.debug("Attempting to process unknown format")
            # Try to extract fields from any available source
            if request.data:
                # Try direct JSON parsing
                try:
                    import json
                    payload = json.loads(request.data.decode('utf-8'))
                except Exception as e:
                    logger.error(f"Failed to parse request data: {e}")
                    # Try to build payload from request.values
                    payload = {
                        'title': request.values.get('title'),
                        'message': request.values.get('message'),
                        'severity': request.values.get('severity'),
                        'audience': request.values.getlist('audience')
                    }
            else:
                return jsonify({"status": "error", "message": "No data provided in request"}), 400
                
        # Log and validate payload
        logger.debug(f"Parsed payload: {payload}")
        
        # Ensure we have required data
        if not payload:
            return jsonify({"status": "error", "message": "Failed to parse request data"}), 400
            
        # Check required fields
        required_fields = ["title", "message", "severity"]
        for field in required_fields:
            if field not in payload:
                return jsonify({"status": "error", "message": f"Missing required field: {field}"}), 400
        
        # Get current config
        current_config = load_config()
        message_id = get_hash(payload)

        # Check for duplicates
        now = time.time()
        last_sent = SENT_MESSAGES.get(message_id, 0)
        if now - last_sent < DEDUPLICATION_TTL:
            return jsonify({"status": "duplicate", "message": "Message already sent recently"}), 200

        title = payload.get("title")
        message = payload.get("message")
        severity = payload.get("severity")
        
        # Check audience format and convert to list if needed
        audience = payload.get("audience", [])
        if isinstance(audience, str):
            try:
                # Try to convert from JSON string if it came that way
                import json
                parsed_audience = json.loads(audience)
                if isinstance(parsed_audience, list):
                    audience = parsed_audience
                else:
                    # If it's a single string name, treat it as a single-item list
                    audience = [audience]
            except:
                # If it's not valid JSON, treat it as a single string name
                audience = [audience]
        elif not isinstance(audience, list):
            # If it's some other type, convert to string and use as single item
            audience = [str(audience)]
            
        logger.info(f"Notification received - Title: {title}, Severity: {severity}, Audience: {audience}")

        # Update sent messages
        SENT_MESSAGES[message_id] = now

        # Prune old messages
        for msg_id in list(SENT_MESSAGES.keys()):
            if now - SENT_MESSAGES[msg_id] > DEDUPLICATION_TTL:
                del SENT_MESSAGES[msg_id]

        # Route notifications
        routed_count = 0
        for target in audience:
            if target in current_config["audiences"]:
                target_config = current_config["audiences"].get(target, {})
                min_severity = target_config.get("min_severity", "low")
                
                try:
                    if current_config["severity_levels"].index(severity) >= current_config["severity_levels"].index(min_severity):
                        for service in target_config.get("services", []):
                            logger.info(f"[{target.upper()}] {service} -> {title}: {message}")
                            # Here would be the actual notification sending logic
                            # This would integrate with Home Assistant API
                            routed_count += 1
                except ValueError:
                    logger.error(f"Invalid severity level: {severity}")
            else:
                logger.warning(f"Unknown audience: {target}")

        return jsonify({
            "status": "ok", 
            "message": f"Notification routed to {routed_count} services",
            "routed_count": routed_count
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing notification: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/services")
def get_services():
    """API endpoint to get available notification services from Home Assistant"""
    # In a real implementation, this would query the Home Assistant API
    try:
        # For now, we'll return a predefined list
        # This would ideally fetch from Home Assistant API
        services = {
            "notify": [
                # Mobile/companion apps
                "notify.mobile_app_pixel_9_pro_xl",
                "notify.mobile_app_iphone",
                "notify.mobile_app_samsung_watch",
                
                # Other notification services
                "notify.telegram",
                "notify.email",
                "notify.pushbullet",
                "notify.smtp"
            ],
            "persistent": [
                "persistent_notification.create"
            ],
            "media_player": [
                # TTS/announce (future feature)
                "media_player.living_room_speaker",
                "media_player.kitchen_speaker"
            ]
        }
        
        # Add description of service types (for UI)
        service_descriptions = {
            "notify": "Push notifications to mobile devices, watches, and messaging platforms",
            "persistent": "Display notifications in the Home Assistant UI",
            "media_player": "Announce notifications through speakers (future feature)"
        }
        
        return jsonify({
            "services": services,
            "descriptions": service_descriptions
        })
    except Exception as e:
        logger.error(f"Error getting services: {e}")
        return jsonify({
            "services": {
                "notify": ["notify.mobile_app"],
                "persistent": ["persistent_notification.create"]
            },
            "descriptions": {
                "notify": "Push notifications",
                "persistent": "Home Assistant UI notifications"
            }
        })

@app.route("/status")
def status():
    """API endpoint to get service status"""
    return jsonify({
        "status": "running",
        "deduplication_ttl": DEDUPLICATION_TTL,
        "message_count": len(SENT_MESSAGES),
        "config_loaded": bool(config != DEFAULT_CONFIG)
    })

@app.route("/user")
def get_user():
    """API endpoint to get current user information"""
    try:
        # In a real implementation, this would get the user from Home Assistant
        # For now, just return our default user
        return jsonify({
            "user": CURRENT_USER,
            "status": "ok"
        })
    except Exception as e:
        logger.error(f"Error getting user information: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def cleanup_thread():
    """Background thread to clean up old messages"""
    while True:
        try:
            now = time.time()
            for msg_id in list(SENT_MESSAGES.keys()):
                if now - SENT_MESSAGES[msg_id] > DEDUPLICATION_TTL:
                    del SENT_MESSAGES[msg_id]
        except Exception as e:
            logger.error(f"Error in cleanup thread: {e}")
        time.sleep(60)

def initialize_app():
    """Initialize the application with all required components."""
    # Load options and config
    options = load_options()
    config_data = load_config()
    
    # Create app configuration for tag-based routing
    app_config = {
        "homeassistant_url": options.get("homeassistant_url", "http://supervisor/core/api"),
        "homeassistant_token": options.get("homeassistant_token", ""),
        "config_dir": "/config",
        "deduplication_ttl": options.get("deduplication_ttl", 300),
        "audiences": config_data.get("audiences", {}),
        "severity_levels": config_data.get("severity_levels", ["low", "medium", "high", "emergency"]),
    }
    
    # Check if tag_routing module is available
    tag_routing_available = False
    try:
        # Check if the module exists by importing it
        import tag_routing
        tag_routing_available = True
        logger.info("Tag routing module found")
    except ImportError as e:
        logger.warning(f"Tag routing module not found: {e}")
        logger.warning("Tag-based routing will be disabled")
        return
    
    # Initialize tag-based routing
    logger.info("Initializing tag-based routing system")
    try:
        components = initialize_tag_routing(app_config)
        logger.info("Tag-based routing system initialized successfully")
        
        # Register tag-based routing endpoints
        register_tag_routing_endpoints(app)
        logger.info("Tag-based routing endpoints registered successfully")
    except Exception as e:
        logger.error(f"Error setting up tag-based routing: {e}")

if __name__ == "__main__":
    # Load configuration at startup
    load_options()
    load_config()
    
    # Start cleanup thread
    threading.Thread(target=cleanup_thread, daemon=True).start()
    
    # Initialize app with all components
    initialize_app()
    
    # Start the application
    logger.info("Starting Flask application on 0.0.0.0:8080")
    # Use Debug mode for better error reporting during development
    app.run(host="0.0.0.0", port=8080, debug=True)