"""
Tag-Based Routing Engine

This module provides the routing engine for the Smart Notification Router,
using tag expressions to determine notification targets based on context.
"""

import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class RoutingEngine:
    """Engine for routing notifications based on tag expressions."""
    
    def __init__(self, tag_resolver, context_resolver, ha_client, config):
        """Initialize the routing engine.
        
        Args:
            tag_resolver (TagResolutionService): Tag resolution service
            context_resolver (ContextResolver): Context resolver
            ha_client (HomeAssistantAPIClient): Home Assistant API client
            config (dict): Router configuration
        """
        self.tag_resolver = tag_resolver
        self.context_resolver = context_resolver
        self.ha_client = ha_client
        self.config = config
        self.notification_history = []
        self.max_history = 100
    
    def route_notification(self, notification, target_expression):
        """Route a notification based on target expression and context.
        
        Args:
            notification (dict): Notification data
            target_expression (str): Target tag expression or audience
            
        Returns:
            dict: Routing result with selected services
        """
        # Validate notification data
        if not self._validate_notification(notification):
            logger.error(f"Invalid notification data: {notification}")
            return {
                "success": False,
                "error": "Invalid notification data",
                "services": []
            }
        
        # Check for duplicate notification
        if self._is_duplicate(notification):
            logger.info(f"Duplicate notification detected: {notification.get('title')}")
            return {
                "success": False,
                "error": "Duplicate notification",
                "services": []
            }
        
        # Track notification
        tracking_id = str(uuid.uuid4())
        self._track_notification(tracking_id, notification, target_expression)
        
        # Check if traditional audience or tag expression
        if target_expression in self.config.get("audiences", {}):
            logger.info(f"Routing by traditional audience: {target_expression}")
            result = self._route_by_audience(notification, target_expression)
        else:
            logger.info(f"Routing by tag expression: {target_expression}")
            result = self._route_by_tag_expression(notification, target_expression)
        
        # Add tracking ID to result
        result["tracking_id"] = tracking_id
        
        return result
    
    def _route_by_audience(self, notification, audience):
        """Route notification using a traditional audience.
        
        Args:
            notification (dict): Notification data
            audience (str): Audience name
            
        Returns:
            dict: Routing result with selected services
        """
        # Get audience configuration
        audience_config = self.config.get("audiences", {}).get(audience, {})
        
        if not audience_config:
            logger.error(f"Audience not found: {audience}")
            return {
                "success": False,
                "error": f"Audience not found: {audience}",
                "services": []
            }
        
        # Check severity threshold
        severity = notification.get("severity", "normal").lower()
        min_severity = audience_config.get("min_severity", "normal").lower()
        
        severity_levels = ["low", "normal", "high", "critical"]
        severity_index = severity_levels.index(severity) if severity in severity_levels else 1
        min_severity_index = severity_levels.index(min_severity) if min_severity in severity_levels else 1
        
        if severity_index < min_severity_index:
            logger.info(f"Notification severity {severity} below threshold {min_severity} for audience {audience}")
            return {
                "success": False,
                "error": f"Severity {severity} below threshold {min_severity}",
                "services": []
            }
        
        # Get services for audience
        services = audience_config.get("services", [])
        
        return {
            "success": True,
            "services": services,
            "audience": audience,
            "severity": severity
        }
    
    def _route_by_tag_expression(self, notification, expression):
        """Route notification using a tag expression.
        
        Args:
            notification (dict): Notification data
            expression (str): Tag expression
            
        Returns:
            dict: Routing result with selected services
        """
        # Resolve tag expression to entities
        entities = self.tag_resolver.resolve_expression(expression)
        
        if not entities:
            logger.warning(f"No entities found for expression: {expression}")
            return {
                "success": False,
                "error": f"No entities found for expression: {expression}",
                "services": []
            }
        
        # Apply context-aware routing
        severity = notification.get("severity", "normal")
        services = []
        
        # Group entities by user
        users = {}
        for entity_id in entities:
            # Extract user from entity tags
            entity_state = self.ha_client.get_entity_state(entity_id)
            if not entity_state:
                continue
                
            entity_tags = entity_state.get("attributes", {}).get("tags", [])
            user_tag = next((tag for tag in entity_tags if tag.startswith("user:")), None)
            
            if user_tag:
                user_id = user_tag.split(":", 1)[1]
                users.setdefault(user_id, []).append(entity_id)
        
        # Process each user
        for user_id, user_entities in users.items():
            # Get best notification targets based on context
            targets = self.context_resolver.get_best_notification_targets(user_id, severity)
            
            # Add services to the list
            if targets.get("primary"):
                for entity_id in targets["primary"]:
                    # Convert entity to service name
                    service = self._entity_to_service(entity_id)
                    if service and service not in services:
                        services.append(service)
            
            # Add secondary targets if needed
            if len(services) == 0 and targets.get("secondary"):
                for entity_id in targets["secondary"]:
                    service = self._entity_to_service(entity_id)
                    if service and service not in services:
                        services.append(service)
        
        # If no services selected, try to use default services
        if not services and self.config.get("default_services"):
            logger.info("No specific services found, using default services")
            services = self.config.get("default_services", [])
        
        return {
            "success": len(services) > 0,
            "services": services,
            "entities": entities,
            "expression": expression,
            "severity": severity,
            "error": "No services found" if not services else None
        }
    
    def _entity_to_service(self, entity_id):
        """Convert an entity ID to a notification service name.
        
        Args:
            entity_id (str): Entity ID
            
        Returns:
            str: Service name or None
        """
        # Map entity types to services based on configuration
        entity_mappings = self.config.get("entity_service_mappings", {})
        
        # Check for direct entity mapping
        if entity_id in entity_mappings:
            return entity_mappings[entity_id]
        
        # Check for entity type mapping
        entity_type = entity_id.split(".")[0] if "." in entity_id else ""
        if entity_type in entity_mappings:
            return entity_mappings[entity_type]
        
        # Default mappings
        if entity_id.startswith("mobile_app."):
            device_name = entity_id.split(".", 1)[1]
            return f"mobile_app_{device_name}"
        elif entity_id.startswith("notify."):
            return entity_id.split(".", 1)[1]
        
        # Entity specific logic
        if "mobile" in entity_id.lower():
            # Try to extract device name
            parts = entity_id.split(".")
            if len(parts) > 1:
                device_name = parts[1].replace("_", "")
                return f"mobile_app_{device_name}"
        
        # Check entity state for mobile app data
        entity_state = self.ha_client.get_entity_state(entity_id)
        if entity_state:
            attributes = entity_state.get("attributes", {})
            source = attributes.get("source_type")
            
            if source == "mobile_app":
                device_name = attributes.get("friendly_name", "").replace(" ", "").lower()
                if device_name:
                    return f"mobile_app_{device_name}"
        
        logger.warning(f"Could not map entity {entity_id} to a notification service")
        return None
    
    def _validate_notification(self, notification):
        """Validate notification data.
        
        Args:
            notification (dict): Notification data
            
        Returns:
            bool: True if valid, False otherwise
        """
        # Check for required fields
        required_fields = ["title", "message"]
        for field in required_fields:
            if field not in notification:
                return False
        
        # Check severity if provided
        if "severity" in notification:
            severity = notification["severity"].lower()
            valid_severities = ["low", "normal", "high", "critical", "info"]
            if severity not in valid_severities:
                notification["severity"] = "normal"
        else:
            notification["severity"] = "normal"
        
        return True
    
    def _is_duplicate(self, notification):
        """Check if notification is a duplicate.
        
        Args:
            notification (dict): Notification data
            
        Returns:
            bool: True if duplicate, False otherwise
        """
        # Skip duplicate detection if disabled
        if not self.config.get("enable_deduplication", True):
            return False
        
        # Get deduplication window
        window_seconds = self.config.get("deduplication_window", 60)
        
        # Check for recent notifications with same title and message
        now = datetime.now()
        
        for record in self.notification_history:
            # Skip if outside window
            time_diff = (now - record["timestamp"]).total_seconds()
            if time_diff > window_seconds:
                continue
            
            # Check for matching title and message
            if (record["notification"].get("title") == notification.get("title") and
                    record["notification"].get("message") == notification.get("message")):
                return True
        
        return False
    
    def _track_notification(self, tracking_id, notification, target):
        """Track notification for history and confirmation.
        
        Args:
            tracking_id (str): Unique tracking ID
            notification (dict): Notification data
            target (str): Target expression or audience
        """
        # Add to history
        record = {
            "tracking_id": tracking_id,
            "notification": notification.copy(),
            "target": target,
            "timestamp": datetime.now()
        }
        self.notification_history.insert(0, record)
        
        # Trim history
        if len(self.notification_history) > self.max_history:
            self.notification_history = self.notification_history[:self.max_history]
    
    def get_notification_history(self, limit=10):
        """Get notification history.
        
        Args:
            limit (int): Maximum number of records
            
        Returns:
            list: Notification history records
        """
        return [{
            "tracking_id": record["tracking_id"],
            "title": record["notification"].get("title"),
            "message": record["notification"].get("message"),
            "severity": record["notification"].get("severity"),
            "target": record["target"],
            "timestamp": record["timestamp"].isoformat()
        } for record in self.notification_history[:limit]]


# Helper function to create routing engine instance
def create_routing_engine(tag_resolver, context_resolver, ha_client, config):
    """Create a new RoutingEngine instance.
    
    Args:
        tag_resolver (TagResolutionService): Tag resolution service
        context_resolver (ContextResolver): Context resolver
        ha_client (HomeAssistantAPIClient): Home Assistant API client
        config (dict): Router configuration
        
    Returns:
        RoutingEngine: New routing engine instance
    """
    return RoutingEngine(tag_resolver, context_resolver, ha_client, config)