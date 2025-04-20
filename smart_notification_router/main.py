import time
import json
import yaml
import hashlib
import os
from flask import Flask, request, jsonify, render_template, redirect, url_for
import logging
import threading

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

app = Flask(__name__, 
    static_folder='/app/web/static',
    template_folder='/app/web/templates')

def load_options():
    """Load options from the add-on configuration"""
    global DEDUPLICATION_TTL
    try:
        if os.path.exists(OPTIONS_FILE):
            with open(OPTIONS_FILE, "r") as f:
                options = json.load(f)
                DEDUPLICATION_TTL = options.get("deduplication_ttl", 300)
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
    # Ensure config has the expected structure
    if not isinstance(config, dict):
        logger.error(f"Invalid config type: {type(config)}. Setting to default.")
        global_config = DEFAULT_CONFIG.copy()
    elif not isinstance(config.get('audiences'), dict):
        logger.error(f"Invalid audiences type: {type(config.get('audiences'))}. Setting to default.")
        global_config = DEFAULT_CONFIG.copy()
    else:
        global_config = config
    
    # Debug and log the config structure to help diagnose issues
    logger.info(f"Config structure: {type(global_config)}")
    for key, value in global_config.items():
        logger.info(f"Key: {key}, Type: {type(value)}")
        if key == "audiences" and isinstance(value, dict):
            for audience_name, audience_config in value.items():
                logger.info(f"  Audience: {audience_name}, Type: {type(audience_config)}")
    
    logger.info(f"Rendering template with config: {global_config}")
    
    return render_template(
        "index.html", 
        config=global_config,
        deduplication_ttl=DEDUPLICATION_TTL
    )

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
        payload = request.get_json()
        if not payload:
            return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400
            
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
        audience = payload.get("audience", [])

        # Update sent messages
        SENT_MESSAGES[message_id] = now

        # Prune old messages
        for msg_id in list(SENT_MESSAGES.keys()):
            if now - SENT_MESSAGES[msg_id] > DEDUPLICATION_TTL:
                del SENT_MESSAGES[msg_id]

        # Route notifications
        for target in audience:
            target_config = current_config["audiences"].get(target, {})
            min_severity = target_config.get("min_severity", "low")
            
            try:
                if current_config["severity_levels"].index(severity) >= current_config["severity_levels"].index(min_severity):
                    for service in target_config.get("services", []):
                        logger.info(f"[{target.upper()}] {service} -> {title}: {message}")
                        # Here would be the actual notification sending logic
                        # This would integrate with Home Assistant API
            except ValueError:
                logger.error(f"Invalid severity level: {severity}")

        return jsonify({"status": "ok", "message": "Notification routed"}), 200
        
    except Exception as e:
        logger.error(f"Error processing notification: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/services")
def get_services():
    """API endpoint to get available notification services from Home Assistant"""
    # In a real implementation, this would query the Home Assistant API
    # For now, we'll return a dummy list
    services = [
        "notify.mobile_app_pixel_9_pro_xl",
        "notify.telegram",
        "persistent_notification.create",
        "notify.smtp"
    ]
    return jsonify(services)

@app.route("/status")
def status():
    """API endpoint to get service status"""
    return jsonify({
        "status": "running",
        "deduplication_ttl": DEDUPLICATION_TTL,
        "message_count": len(SENT_MESSAGES),
        "config_loaded": bool(config != DEFAULT_CONFIG)
    })

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

if __name__ == "__main__":
    # Load configuration at startup
    load_options()
    load_config()
    
    # Start cleanup thread
    threading.Thread(target=cleanup_thread, daemon=True).start()
    
    # Start the application
    logger.info("Starting Flask application on 0.0.0.0:8080")
    # Use Debug mode for better error reporting during development
    app.run(host="0.0.0.0", port=8080, debug=True)