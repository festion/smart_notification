"""
Home Assistant API Client for Smart Notification Router.
This module handles communication with Home Assistant API.
"""

import logging
import json
import os
import requests
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class HomeAssistantAPIClient:
    """Client for Home Assistant API communication."""

    def __init__(self, demo_mode: bool = True):
        """Initialize the Home Assistant API client.
        
        Args:
            demo_mode: Whether to use demo data instead of actual API calls
        """
        self.demo_mode = demo_mode
        self._entity_tags = {}  # In-memory entity tags for demo mode
        
        # Initialize Home Assistant API connection
        self.ha_url = os.environ.get("SUPERVISOR_URL", "http://supervisor/core")
        self.ha_token = os.environ.get("SUPERVISOR_TOKEN", None)
        
        # If in demo mode, load demo data
        if demo_mode:
            self._load_demo_data()
    
    def _load_demo_data(self):
        """Load demo entity data."""
        # Demo entity tags
        self._entity_tags = {
            "person.john": ["user:john", "priority:high", "device:mobile"],
            "person.jane": ["user:jane", "priority:high", "device:mobile"],
            "person.guest": ["user:guest", "priority:low"],
            "media_player.living_room_speaker": [
                "device:speaker", 
                "area:living_room", 
                "priority:medium"
            ],
            "media_player.bedroom_speaker": [
                "device:speaker", 
                "area:bedroom", 
                "priority:low"
            ],
            "media_player.kitchen_display": [
                "device:display", 
                "area:kitchen", 
                "priority:medium"
            ],
            "device_tracker.john_phone": [
                "user:john",
                "device:mobile", 
                "priority:high"
            ],
            "device_tracker.jane_phone": [
                "user:jane",
                "device:mobile", 
                "priority:high"
            ],
            "device_tracker.guest_phone": [
                "user:guest", 
                "device:mobile", 
                "priority:low"
            ]
        }
        
    def _check_api_connection(self) -> bool:
        """Check if we have a valid API connection to Home Assistant.
        
        Returns:
            bool: True if connection is valid, False otherwise
        """
        if self.demo_mode:
            return True
            
        if not self.ha_token:
            logger.error("No Home Assistant API token provided")
            return False
            
        return True

    def get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity from Home Assistant."""
        if not self.demo_mode:
            # In a real implementation, this would call Home Assistant API
            raise NotImplementedError("Real API communication not implemented")
        
        # For demo, create some fake entities based on the entity ID
        parts = entity_id.split('.')
        if len(parts) != 2:
            return None
            
        domain, name = parts
        
        # Create a basic entity structure
        entity = {
            "entity_id": entity_id,
            "state": "unknown",
            "attributes": {
                "friendly_name": name.replace('_', ' ').title()
            }
        }
        
        # Add more realistic states based on domain
        if domain == 'person':
            entity["state"] = "home" if name != "guest" else "not_home"
            entity["attributes"]["id"] = name
            entity["attributes"]["source"] = "device_tracker." + name + "_phone"
            
        elif domain == 'device_tracker':
            if name.endswith('phone'):
                user = name.replace('_phone', '')
                entity["state"] = "home" if user != "guest" else "not_home"
                entity["attributes"]["source_type"] = "gps"
                entity["attributes"]["battery_level"] = 75
            
        elif domain == 'media_player':
            entity["state"] = "idle"
            if "speaker" in name:
                entity["attributes"]["device_class"] = "speaker"
                entity["attributes"]["volume_level"] = 0.5
            elif "display" in name:
                entity["attributes"]["device_class"] = "tv"
                entity["attributes"]["volume_level"] = 0.3
        
        return entity
    
    def get_entities(self) -> List[Dict[str, Any]]:
        """Get all entities from Home Assistant."""
        if not self.demo_mode:
            # In a real implementation, this would call Home Assistant API
            raise NotImplementedError("Real API communication not implemented")
        
        # For demo mode, return a list of fake entities based on our tag data
        entities = []
        for entity_id in self._entity_tags.keys():
            entity = self.get_entity(entity_id)
            if entity:
                entities.append(entity)
        
        # Add a few more entities without tags
        additional_entities = [
            "light.living_room",
            "light.kitchen",
            "light.bedroom",
            "switch.coffee_maker",
            "binary_sensor.front_door"
        ]
        
        for entity_id in additional_entities:
            entity = self.get_entity(entity_id)
            if entity:
                entities.append(entity)
        
        return entities
    
    def get_entity_tags(self) -> Dict[str, List[str]]:
        """Get all entity tags."""
        if not self.demo_mode:
            # In a real implementation, this would call Home Assistant API
            raise NotImplementedError("Real API communication not implemented")
        
        return self._entity_tags
    
    def set_entity_tags(self, entity_id: str, tags: List[str]) -> None:
        """Set tags for an entity."""
        if not self.demo_mode:
            # In a real implementation, this would call Home Assistant API
            raise NotImplementedError("Real API communication not implemented")
        
        self._entity_tags[entity_id] = tags
        
    def call_service(self, domain: str, service: str, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call a Home Assistant service.
        
        Args:
            domain: Service domain (e.g., 'notify', 'persistent_notification')
            service: Service name (e.g., 'mobile_app_pixel_9_pro_xl', 'create')
            service_data: Data to send with service call
            
        Returns:
            Dict: Response from Home Assistant
        """
        if self.demo_mode:
            # In demo mode, just log the call and return a success response
            logger.info(f"DEMO MODE: Called service {domain}.{service} with data: {service_data}")
            return {"result": "ok", "demo_mode": True}
        
        if not self._check_api_connection():
            logger.error("Cannot call service, no valid API connection")
            return {"error": "No valid API connection"}
        
        try:
            # Prepare the API call to Home Assistant
            url = f"{self.ha_url}/api/services/{domain}/{service}"
            headers = {
                "Authorization": f"Bearer {self.ha_token}",
                "Content-Type": "application/json"
            }
            
            # Make the API call
            response = requests.post(url, headers=headers, json=service_data, timeout=10)
            
            # Check for errors
            response.raise_for_status()
            
            # Return the response as a dictionary
            return response.json() if response.content else {"result": "ok"}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling service {domain}.{service}: {e}")
            return {"error": str(e)}
            
    def send_notification(self, service_name: str, title: str, message: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a notification through a Home Assistant notification service.
        
        Args:
            service_name: Full service name (e.g., 'notify.mobile_app_pixel_9_pro_xl')
            title: Notification title
            message: Notification message
            data: Additional notification data (optional)
            
        Returns:
            Dict: Response from Home Assistant
        """
        # Split service name into domain and service
        parts = service_name.split('.')
        if len(parts) != 2:
            logger.error(f"Invalid service name: {service_name}")
            return {"error": f"Invalid service name: {service_name}"}
            
        domain, service = parts
        
        # Prepare service data
        service_data = {
            "title": title,
            "message": message
        }
        
        # Add additional data if provided
        if data:
            if domain == "notify":
                service_data["data"] = data
            else:
                # For non-notify services, merge data at top level
                service_data.update(data)
        
        # Call the service
        return self.call_service(domain, service, service_data)
        
    def get_services(self) -> List[Dict[str, Any]]:
        """Get all available services from Home Assistant.
        
        Returns:
            List: List of available services
        """
        if self.demo_mode:
            # Return a list of demo services
            return [
                {
                    "domain": "notify",
                    "services": {
                        "mobile_app_pixel_9_pro_xl": {
                            "description": "Send a notification to a mobile app",
                            "fields": {
                                "message": {"description": "Message to send", "example": "The garage door has been open for 10 minutes."},
                                "title": {"description": "Title for the notification", "example": "Home Assistant"},
                                "target": {"description": "An array of targets to send the notification to", "example": "[\"john\", \"jane\"]"},
                                "data": {"description": "Extended information for notification", "example": "{\"android\": {\"channel\": \"alarm\"}}"}
                            }
                        },
                        "persistent_notification": {
                            "description": "Create a notification in the Home Assistant web UI",
                            "fields": {
                                "message": {"description": "Message to display", "example": "The garage door has been open for 10 minutes."},
                                "title": {"description": "Title for the notification", "example": "Home Assistant"}
                            }
                        }
                    }
                },
                {
                    "domain": "persistent_notification",
                    "services": {
                        "create": {
                            "description": "Create a persistent notification",
                            "fields": {
                                "message": {"description": "Message to display", "example": "The garage door has been open for 10 minutes."},
                                "title": {"description": "Title for the notification", "example": "Home Assistant"},
                                "notification_id": {"description": "ID for the notification", "example": "1234"}
                            }
                        },
                        "dismiss": {
                            "description": "Remove a persistent notification",
                            "fields": {
                                "notification_id": {"description": "ID for the notification to remove", "example": "1234"}
                            }
                        }
                    }
                }
            ]
        
        if not self._check_api_connection():
            logger.error("Cannot get services, no valid API connection")
            return []
            
        try:
            # Get services from Home Assistant API
            url = f"{self.ha_url}/api/services"
            headers = {
                "Authorization": f"Bearer {self.ha_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting services: {e}")
            return []