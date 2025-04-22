"""
Tag Routing Integration Module

This module integrates the tag-based routing system with the main application,
providing the necessary interfaces to use tag expressions in notifications.
"""

import logging
import yaml
import os
from flask import request, jsonify, Blueprint, render_template
from .ha_client import HomeAssistantAPIClient
from .parser import TagExpressionParser
from .resolution import TagResolutionService, ContextResolver
from .routing import RoutingEngine
from .service_discovery import ServiceDiscovery
from .entity_manager import EntityTagManager

logger = logging.getLogger(__name__)

# Create Flask Blueprint for tag-based routing
tag_routing_bp = Blueprint('tag_routing', __name__, url_prefix='/api/v2')

# Global variables for shared components
ha_client = None
tag_resolver = None
context_resolver = None
routing_engine = None
service_discovery = None
entity_manager = None

# Configuration constants
HA_URL_OPTION = "homeassistant_url"
HA_TOKEN_OPTION = "homeassistant_token"
DEFAULT_HA_URL = "http://supervisor/core/api"


def initialize_tag_routing(app_config):
    """Initialize the tag-based routing system.
    
    Args:
        app_config (dict): Application configuration
        
    Returns:
        dict: Initialized components
    """
    global ha_client, tag_resolver, context_resolver, routing_engine, service_discovery, entity_manager
    
    # Get Home Assistant API configuration
    ha_url = app_config.get(HA_URL_OPTION, DEFAULT_HA_URL)
    ha_token = app_config.get(HA_TOKEN_OPTION, "")
    
    if not ha_token:
        logger.warning("Home Assistant token not configured, using demo mode")
        ha_token = "DEMO_TOKEN"
    
    # Initialize Home Assistant API client
    ha_client = HomeAssistantAPIClient(ha_url, ha_token)
    
    # Initialize tag resolution service
    tag_resolver = TagResolutionService(ha_client)
    
    # Initialize context resolver
    context_resolver = ContextResolver(ha_client)
    
    # Initialize service discovery
    service_discovery = ServiceDiscovery(ha_client)
    
    # Initialize routing engine
    routing_engine = RoutingEngine(tag_resolver, context_resolver, ha_client, app_config)
    
    # Initialize entity tag manager
    entity_manager = EntityTagManager(ha_client, config_dir=app_config.get("config_dir", "/config"))
    
    logger.info("Tag-based routing system initialized")
    
    return {
        "ha_client": ha_client,
        "tag_resolver": tag_resolver,
        "context_resolver": context_resolver,
        "routing_engine": routing_engine,
        "service_discovery": service_discovery,
        "entity_manager": entity_manager
    }


def register_tag_routing_endpoints(app):
    """Register tag-based routing endpoints with Flask app.
    
    Args:
        app (Flask): Flask application
    """
    # Register the blueprint
    app.register_blueprint(tag_routing_bp)
    
    # Register web routes - commented out to avoid conflicts with main.py route
    # app.add_url_rule('/tag-manager', 'tag_manager', tag_manager_view)
    
    logger.info("Tag-based routing endpoints registered")
    
def tag_manager_view():
    """Render the tag manager web interface.
    
    Returns:
        Response: Flask response with rendered template
    """
    return render_template('tag_manager.html')


@tag_routing_bp.route('/notify', methods=['POST'])
def tag_based_notify():
    """API endpoint for tag-based notifications.
    
    Returns:
        Response: Flask response
    """
    try:
        payload = request.get_json()
        
        # Validate required fields
        required_fields = ["title", "message", "severity"]
        for field in required_fields:
            if field not in payload:
                return jsonify({
                    "status": "error", 
                    "message": f"Missing required field: {field}"
                }), 400
        
        # Get target expression
        target = payload.get("target") or payload.get("audience")
        
        if not target:
            return jsonify({
                "status": "error", 
                "message": "Missing target expression or audience"
            }), 400
        
        # Route notification
        result = routing_engine.route_notification(payload, target)
        
        if not result["success"]:
            return jsonify({
                "status": "error",
                "message": result.get("error", "Failed to route notification"),
                "detail": result
            }), 400
        
        # Send notifications to selected services
        services_sent = []
        for service in result["services"]:
            try:
                # Build notification data
                notification_data = {
                    "message": payload["message"],
                    "title": payload["title"],
                    "data": {
                        "severity": payload["severity"],
                        "tracking_id": result.get("tracking_id"),
                        "target": target
                    }
                }
                
                # Add any additional data from the payload
                for key, value in payload.items():
                    if key not in ["title", "message", "severity", "target", "audience"]:
                        notification_data["data"][key] = value
                
                # Send notification
                success = ha_client.send_notification(service, notification_data)
                
                if success:
                    services_sent.append(service)
                else:
                    logger.error(f"Failed to send notification to service: {service}")
                
            except Exception as e:
                logger.error(f"Error sending notification to {service}: {e}")
        
        return jsonify({
            "status": "ok",
            "message": f"Notification routed to {len(services_sent)} services",
            "services": services_sent,
            "tracking_id": result.get("tracking_id"),
            "detail": result
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing tag-based notification: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/resolve-tag', methods=['POST'])
def resolve_tag_expression():
    """API endpoint to resolve a tag expression to entities.
    
    Returns:
        Response: Flask response
    """
    try:
        payload = request.get_json()
        
        # Get expression
        expression = payload.get("expression")
        
        if not expression:
            return jsonify({
                "status": "error", 
                "message": "Missing tag expression"
            }), 400
        
        # Resolve expression
        entities = tag_resolver.resolve_expression(expression)
        
        return jsonify({
            "status": "ok",
            "expression": expression,
            "entities": entities,
            "count": len(entities)
        }), 200
        
    except Exception as e:
        logger.error(f"Error resolving tag expression: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/user-context/<user_id>', methods=['GET'])
def get_user_context(user_id):
    """API endpoint to get context for a user.
    
    Args:
        user_id (str): User ID
        
    Returns:
        Response: Flask response
    """
    try:
        # Get user presence
        presence = context_resolver.get_user_presence(user_id)
        
        return jsonify({
            "status": "ok",
            "user_id": user_id,
            "context": presence
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user context: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/services', methods=['GET'])
def get_services():
    """API endpoint to get available notification services.
    
    Returns:
        Response: Flask response
    """
    try:
        # Get services from discovery
        services = service_discovery.discover_services(force_refresh="refresh" in request.args)
        
        return jsonify({
            "status": "ok",
            "services": services
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting services: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/notification-history', methods=['GET'])
def get_notification_history():
    """API endpoint to get notification history.
    
    Returns:
        Response: Flask response
    """
    try:
        # Get limit from query string
        limit = request.args.get("limit", 10)
        try:
            limit = int(limit)
        except:
            limit = 10
            
        # Get history from routing engine
        history = routing_engine.get_notification_history(limit)
        
        return jsonify({
            "status": "ok",
            "history": history,
            "count": len(history)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification history: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/entities', methods=['GET'])
def get_entities():
    """API endpoint to get all entities from Home Assistant.
    
    Returns:
        Response: Flask response
    """
    try:
        # Get entities from entity manager
        entities = entity_manager.get_entities()
        entity_tags = entity_manager.get_entity_tags()
        
        return jsonify({
            "status": "ok",
            "entities": entities,
            "entity_tags": entity_tags,
            "count": len(entities)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting entities: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/entity-tags', methods=['POST'])
def set_entity_tags():
    """API endpoint to set tags for an entity.
    
    Returns:
        Response: Flask response
    """
    try:
        # Get entity ID and tags from request
        payload = request.get_json()
        
        entity_id = payload.get("entity_id")
        tags = payload.get("tags", [])
        
        if not entity_id:
            return jsonify({
                "status": "error", 
                "message": "Missing entity_id parameter"
            }), 400
        
        # Set entity tags
        success = entity_manager.set_entity_tags(entity_id, tags)
        
        if success:
            return jsonify({
                "status": "ok",
                "message": f"Tags set for entity {entity_id}",
                "entity_id": entity_id,
                "tags": tags
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": f"Failed to set tags for entity {entity_id}"
            }), 500
        
    except Exception as e:
        logger.error(f"Error setting entity tags: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@tag_routing_bp.route('/sync-tags', methods=['POST'])
def sync_tags():
    """API endpoint to sync entity tags to Home Assistant.
    
    Returns:
        Response: Flask response
    """
    try:
        # Sync tags to Home Assistant
        success = entity_manager.sync_tags_to_ha()
        
        if success:
            return jsonify({
                "status": "ok",
                "message": "Tags synced to Home Assistant"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to sync tags to Home Assistant"
            }), 500
        
    except Exception as e:
        logger.error(f"Error syncing tags: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# Update config file with tag routing configuration
def update_config_with_tag_routing(config_file, new_config):
    """Update configuration file with tag routing configuration.
    
    Args:
        config_file (str): Path to config file
        new_config (dict): New configuration
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Load existing config
        existing_config = {}
        if os.path.exists(config_file):
            with open(config_file, "r") as f:
                existing_config = yaml.safe_load(f) or {}
        
        # Add tag routing configuration
        existing_config["tag_routing"] = new_config.get("tag_routing", {})
        
        # Write updated config
        with open(config_file, "w") as f:
            yaml.dump(existing_config, f, default_flow_style=False)
            
        logger.info("Tag routing configuration updated")
        return True
        
    except Exception as e:
        logger.error(f"Error updating config with tag routing: {e}")
        return False