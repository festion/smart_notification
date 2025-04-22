"""
Tag Resolution Service

This module provides services for resolving tag expressions to Home Assistant entities
and determining the appropriate notification targets based on context.
"""

import logging
import time
from .parser import TagExpressionParser, create_parser
from .ha_client import HomeAssistantAPIClient

logger = logging.getLogger(__name__)

class TagResolutionService:
    """Service for resolving tag expressions to entities."""
    
    def __init__(self, ha_client):
        """Initialize the tag resolution service.
        
        Args:
            ha_client (HomeAssistantAPIClient): Home Assistant API client
        """
        self.ha_client = ha_client
        self.parser = create_parser()
        self.cache = {}
        self.cache_time = {}
        self.cache_ttl = 300  # 5 minutes cache TTL
    
    def resolve_expression(self, expression):
        """Resolve a tag expression to matching entities.
        
        Args:
            expression (str): A tag expression
            
        Returns:
            list: Matching entity IDs
        """
        # Check cache
        if expression in self.cache and (time.time() - self.cache_time.get(expression, 0)) < self.cache_ttl:
            return self.cache[expression]
            
        # Special case for traditional audiences (backward compatibility)
        if ':' not in expression:
            logger.info(f"Traditional audience detected: {expression}")
            # Returning empty list as traditional audiences are handled separately
            return []
            
        # Get entities matching the expression
        entities = self.ha_client.get_entities_by_tag_expression(expression)
        
        # Cache and return results
        self.cache[expression] = entities
        self.cache_time[expression] = time.time()
        
        logger.info(f"Resolved expression '{expression}' to {len(entities)} entities")
        return entities
    
    def invalidate_cache(self):
        """Invalidate the resolution cache."""
        self.cache = {}
        self.cache_time = {}
        logger.info("Tag resolution cache invalidated")


class ContextResolver:
    """Service for resolving context information for smart routing."""
    
    def __init__(self, ha_client):
        """Initialize the context resolver.
        
        Args:
            ha_client (HomeAssistantAPIClient): Home Assistant API client
        """
        self.ha_client = ha_client
        self.parser = create_parser()
    
    def get_user_presence(self, user_id):
        """Get presence information for a user.
        
        Args:
            user_id (str): User ID or tag (e.g., "user:john")
            
        Returns:
            dict: Presence information with location and devices
        """
        # Extract username from tag if provided in tag format
        username = user_id
        if ':' in user_id:
            _, username = user_id.split(':', 1)
        
        # Get person entity
        person_entity = self.ha_client.get_entity_state(f"person.{username}")
        
        if not person_entity:
            logger.warning(f"Person entity not found for user: {username}")
            return {
                "user_id": username,
                "presence": "unknown",
                "location": "unknown",
                "devices": []
            }
        
        # Get state and attributes
        state = person_entity.get("state")
        attributes = person_entity.get("attributes", {})
        
        # Determine presence
        presence = "home" if state == "home" else "away"
        
        # Get user's devices
        devices_expression = f"user:{username}+device:*"
        device_entities = self.ha_client.get_entities_by_tag_expression(devices_expression)
        
        device_states = []
        for device_id in device_entities:
            device_state = self.ha_client.get_entity_state(device_id)
            if device_state:
                device_states.append({
                    "entity_id": device_id,
                    "state": device_state.get("state"),
                    "attributes": device_state.get("attributes", {})
                })
        
        return {
            "user_id": username,
            "presence": presence,
            "location": state,
            "devices": device_states
        }
    
    def get_notification_priority(self, severity):
        """Map severity level to notification priority.
        
        Args:
            severity (str): Notification severity
            
        Returns:
            str: Priority level
        """
        severity_map = {
            "critical": "high",
            "high": "high",
            "normal": "normal",
            "low": "low",
            "info": "low"
        }
        
        return severity_map.get(severity.lower(), "normal")
    
    def get_best_notification_targets(self, user_id, severity):
        """Get best notification targets for a user based on context.
        
        Args:
            user_id (str): User ID or tag
            severity (str): Notification severity
            
        Returns:
            dict: Primary and secondary notification targets
        """
        # Get user presence information
        presence_info = self.get_user_presence(user_id)
        
        # Determine priority
        priority = self.get_notification_priority(severity)
        
        # Default targets
        targets = {
            "primary": [],
            "secondary": []
        }
        
        # Extract username from tag if provided in tag format
        username = user_id
        if ':' in user_id:
            _, username = user_id.split(':', 1)
        
        # High priority notifications go to all devices
        if priority == "high":
            # Get all user devices
            device_expression = f"user:{username}+device:*"
            all_devices = self.ha_client.get_entities_by_tag_expression(device_expression)
            
            # Mobile devices for primary
            mobile_expression = f"user:{username}+device:mobile"
            mobile_devices = self.ha_client.get_entities_by_tag_expression(mobile_expression)
            
            targets["primary"] = mobile_devices
            
            # Other devices for secondary
            other_devices = [d for d in all_devices if d not in mobile_devices]
            targets["secondary"] = other_devices
            
        # Normal priority based on location
        elif priority == "normal":
            if presence_info["presence"] == "home":
                # User is home, prefer home devices
                home_expression = f"user:{username}+device:*+area:home"
                home_devices = self.ha_client.get_entities_by_tag_expression(home_expression)
                
                # Use most recently active device
                targets["primary"] = home_devices[:1] if home_devices else []
                
                # Mobile as backup
                mobile_expression = f"user:{username}+device:mobile"
                mobile_devices = self.ha_client.get_entities_by_tag_expression(mobile_expression)
                targets["secondary"] = mobile_devices
            else:
                # User is away, use mobile devices
                mobile_expression = f"user:{username}+device:mobile"
                mobile_devices = self.ha_client.get_entities_by_tag_expression(mobile_expression)
                targets["primary"] = mobile_devices
        
        # Low priority notifications are more selective
        else:  # priority == "low"
            if presence_info["presence"] == "home":
                # User is home, use home devices only
                home_expression = f"user:{username}+device:*+area:home"
                home_devices = self.ha_client.get_entities_by_tag_expression(home_expression)
                
                # Use most recently active non-mobile device
                for device in home_devices:
                    if "mobile" not in device:
                        targets["primary"] = [device]
                        break
                
                # If no primary set, use first home device
                if not targets["primary"] and home_devices:
                    targets["primary"] = [home_devices[0]]
            else:
                # User is away, only notify on mobile if recent activity
                mobile_expression = f"user:{username}+device:mobile"
                mobile_devices = self.ha_client.get_entities_by_tag_expression(mobile_expression)
                
                # Check if any device was active recently (would need device state processing)
                # For now, just add first mobile device if available
                if mobile_devices:
                    targets["primary"] = [mobile_devices[0]]
        
        # Log the decision
        logger.info(
            f"Selected notification targets for user {username} (priority: {priority}): "
            f"primary={targets['primary']}, secondary={targets['secondary']}"
        )
        
        return targets


# Helper function to create resolution service instance
def create_resolution_service(ha_client):
    """Create a new TagResolutionService instance.
    
    Args:
        ha_client (HomeAssistantAPIClient): Home Assistant API client
        
    Returns:
        TagResolutionService: New resolution service instance
    """
    return TagResolutionService(ha_client)

# Helper function to create context resolver instance
def create_context_resolver(ha_client):
    """Create a new ContextResolver instance.
    
    Args:
        ha_client (HomeAssistantAPIClient): Home Assistant API client
        
    Returns:
        ContextResolver: New context resolver instance
    """
    return ContextResolver(ha_client)