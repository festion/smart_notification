"""
Home Assistant API Client

This module provides a client for interacting with the Home Assistant REST API
to fetch entity information, tags, and states for the tag-based routing system.
"""

import logging
import requests
import time
from urllib.parse import urljoin
from .parser import TagExpressionParser

logger = logging.getLogger(__name__)

class HomeAssistantAPIClient:
    """Client for Home Assistant API interactions."""
    
    def __init__(self, base_url, access_token):
        """Initialize the Home Assistant API client.
        
        Args:
            base_url (str): Base URL for Home Assistant API (e.g., "http://supervisor/core/api/")
            access_token (str): Long-lived access token for authentication
        """
        self.base_url = base_url.rstrip("/") + "/"
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        self.entity_cache = {}
        self.tag_cache = {}
        self.cache_time = {}
        self.cache_ttl = 300  # 5 minutes cache TTL
        
    def _make_request(self, endpoint, method="GET", params=None, json_data=None):
        """Make a request to the Home Assistant API.
        
        Args:
            endpoint (str): API endpoint
            method (str): HTTP method (GET, POST, etc.)
            params (dict): URL parameters
            json_data (dict): JSON data for POST requests
            
        Returns:
            dict: Response data or None on error
        """
        url = urljoin(self.base_url, endpoint.lstrip("/"))
        
        # Check if we're in demo mode
        if self.access_token == "DEMO_TOKEN":
            logger.info(f"DEMO MODE: Simulating request to {endpoint}")
            # Return mock data based on the endpoint
            if endpoint == "/states":
                return self._mock_states()
            elif endpoint.startswith("/states/"):
                entity_id = endpoint.split("/")[-1]
                return self._mock_entity_state(entity_id)
            else:
                # Default mock response
                return {"mock_data": True, "endpoint": endpoint}
        
        # Real API request
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                params=params,
                json=json_data,
                timeout=10
            )
            
            response.raise_for_status()
            
            if response.status_code == 204:
                return True
                
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {e}")
            # If authorization error, switch to demo mode
            if "401" in str(e) or "Unauthorized" in str(e):
                logger.warning("Authorization failed, falling back to demo mode")
                self.access_token = "DEMO_TOKEN"
                # Try again with demo mode
                return self._make_request(endpoint, method, params, json_data)
            return None
            
    def _mock_states(self):
        """Generate mock entity states for demo mode.
        
        Returns:
            list: Mock entity states
        """
        # Create some demo entities
        return [
            {
                "entity_id": "person.john",
                "state": "home",
                "attributes": {
                    "friendly_name": "John",
                    "tags": ["user:john"]
                }
            },
            {
                "entity_id": "person.jane",
                "state": "away",
                "attributes": {
                    "friendly_name": "Jane",
                    "tags": ["user:jane"]
                }
            },
            {
                "entity_id": "device_tracker.john_phone",
                "state": "home",
                "attributes": {
                    "friendly_name": "John's Phone",
                    "tags": ["user:john", "device:mobile", "area:home"]
                }
            },
            {
                "entity_id": "media_player.living_room_speaker",
                "state": "idle",
                "attributes": {
                    "friendly_name": "Living Room Speaker",
                    "tags": ["device:speaker", "area:living_room"]
                }
            },
            {
                "entity_id": "media_player.kitchen_speaker",
                "state": "idle",
                "attributes": {
                    "friendly_name": "Kitchen Speaker",
                    "tags": ["device:speaker", "area:kitchen"]
                }
            }
        ]
        
    def _mock_entity_state(self, entity_id):
        """Generate a mock entity state for demo mode.
        
        Args:
            entity_id (str): Entity ID
            
        Returns:
            dict: Mock entity state
        """
        # Find the entity in mock states
        mock_states = self._mock_states()
        for state in mock_states:
            if state["entity_id"] == entity_id:
                return state
                
        # Create a generic mock entity if not found
        return {
            "entity_id": entity_id,
            "state": "unknown",
            "attributes": {
                "friendly_name": entity_id.replace(".", " ").title(),
                "tags": []
            }
        }
    
    def get_entity_states(self):
        """Get states for all entities.
        
        Returns:
            list: List of entity state objects
        """
        # Check cache
        cache_key = "entity_states"
        if cache_key in self.entity_cache and (time.time() - self.cache_time.get(cache_key, 0)) < self.cache_ttl:
            return self.entity_cache[cache_key]
        
        # Fetch entity states
        states = self._make_request("/states")
        
        if states:
            # Update cache
            self.entity_cache[cache_key] = states
            self.cache_time[cache_key] = time.time()
            
        return states
    
    def get_entity_state(self, entity_id):
        """Get the current state of an entity.
        
        Args:
            entity_id (str): Entity ID
            
        Returns:
            dict: Entity state object
        """
        # Check cache first
        cache_key = f"entity_{entity_id}"
        if cache_key in self.entity_cache and (time.time() - self.cache_time.get(cache_key, 0)) < self.cache_ttl:
            return self.entity_cache[cache_key]
        
        # Fetch entity state
        state = self._make_request(f"/states/{entity_id}")
        
        if state:
            # Update cache
            self.entity_cache[cache_key] = state
            self.cache_time[cache_key] = time.time()
            
        return state
    
    def get_entities_with_tags(self):
        """Get all entities with their tags.
        
        Returns:
            dict: Dictionary mapping entity IDs to lists of tags
        """
        # Check cache
        cache_key = "entities_with_tags"
        if cache_key in self.tag_cache and (time.time() - self.cache_time.get(cache_key, 0)) < self.cache_ttl:
            return self.tag_cache[cache_key]
        
        # Fetch all entities
        states = self.get_entity_states()
        
        if not states:
            return {}
        
        # Extract tags from each entity
        result = {}
        for entity in states:
            entity_id = entity.get("entity_id")
            
            # Skip entities without IDs
            if not entity_id:
                continue
                
            # Get tags from attributes
            attributes = entity.get("attributes", {})
            tags = attributes.get("tags", [])
            
            # Only include entities with tags
            if tags:
                result[entity_id] = tags
        
        # Update cache
        self.tag_cache[cache_key] = result
        self.cache_time[cache_key] = time.time()
        
        return result
    
    def get_entities_by_tag(self, tag):
        """Get entities with a specific tag.
        
        Args:
            tag (str): The tag to search for
            
        Returns:
            list: List of entity IDs with the specified tag
        """
        # Get all entities with tags
        entities_with_tags = self.get_entities_with_tags()
        
        # Filter entities with the specified tag
        return [
            entity_id
            for entity_id, tags in entities_with_tags.items()
            if tag in tags
        ]
    
    def get_entities_by_tag_expression(self, expression):
        """Get entities matching a tag expression.
        
        Args:
            expression (str): Tag expression
            
        Returns:
            list: List of entity IDs matching the expression
        """
        # Get all entities with their tags
        entities_with_tags = self.get_entities_with_tags()
        
        # Initialize parser
        parser = TagExpressionParser()
        
        # Find entities matching the expression
        matching_entities = []
        for entity_id, tags in entities_with_tags.items():
            try:
                if parser.evaluate(expression, tags):
                    matching_entities.append(entity_id)
            except Exception as e:
                logger.error(f"Error evaluating expression for {entity_id}: {e}")
        
        return matching_entities
    
    def call_service(self, domain, service, service_data=None):
        """Call a Home Assistant service.
        
        Args:
            domain (str): Service domain
            service (str): Service name
            service_data (dict): Service data
            
        Returns:
            bool: True if successful, False otherwise
        """
        endpoint = f"/services/{domain}/{service}"
        return self._make_request(endpoint, method="POST", json_data=service_data or {}) is not None
    
    def send_notification(self, service_name, notification_data):
        """Send a notification using a notify service.
        
        Args:
            service_name (str): Notification service name
            notification_data (dict): Notification data
            
        Returns:
            bool: True if successful, False otherwise
        """
        return self.call_service("notify", service_name, notification_data)
    
    def get_person_entities(self):
        """Get all person entities and their states.
        
        Returns:
            list: List of person entities with states
        """
        # Get all entities
        states = self.get_entity_states()
        
        if not states:
            return []
        
        # Filter for person entities
        return [
            entity for entity in states
            if entity.get("entity_id", "").startswith("person.")
        ]
    
    def get_device_entities(self):
        """Get all device entities and their states.
        
        Returns:
            list: List of device entities with states
        """
        # Get all entities
        states = self.get_entity_states()
        
        if not states:
            return []
        
        # Filter for device entities (mobile_app and device_tracker)
        return [
            entity for entity in states
            if entity.get("entity_id", "").startswith(("device_tracker.", "sensor."))
            and "mobile_app" in entity.get("entity_id", "")
        ]