"""
Service Discovery Module

This module provides functionality to discover and categorize
Home Assistant notification services for the routing engine.
"""

import logging
import time

logger = logging.getLogger(__name__)

class ServiceDiscovery:
    """Service for discovering and categorizing notification services."""
    
    def __init__(self, ha_client):
        """Initialize the service discovery.
        
        Args:
            ha_client (HomeAssistantAPIClient): Home Assistant API client
        """
        self.ha_client = ha_client
        self.services = {}
        self.service_categories = {}
        self.cache_time = 0
        self.cache_ttl = 300  # 5 minutes cache TTL
    
    def discover_services(self, force_refresh=False):
        """Discover all notification services in Home Assistant.
        
        Args:
            force_refresh (bool): Force refresh of services
            
        Returns:
            dict: Discovered services by category
        """
        # Check cache
        if not force_refresh and self.services and (time.time() - self.cache_time) < self.cache_ttl:
            return self.services
        
        # Fetch all services
        all_services = self._make_request("/services")
        
        if not all_services:
            logger.error("Failed to retrieve services from Home Assistant")
            return {}
        
        # Extract notification services
        notify_services = []
        for domain in all_services:
            if domain.get("domain") == "notify":
                services = domain.get("services", {})
                for service_name, service_data in services.items():
                    notify_services.append({
                        "name": service_name,
                        "service_id": f"notify.{service_name}",
                        "description": service_data.get("description", ""),
                        "fields": service_data.get("fields", {})
                    })
        
        # Categorize services
        categorized = {
            "mobile": [],
            "media": [],
            "text": [],
            "other": []
        }
        
        for service in notify_services:
            category = self.categorize_service(service)
            categorized[category].append(service)
            self.service_categories[service["service_id"]] = category
        
        # Update cache
        self.services = categorized
        self.cache_time = time.time()
        
        logger.info(f"Discovered {len(notify_services)} notification services")
        return categorized
    
    def categorize_service(self, service):
        """Categorize a service by its type and capabilities.
        
        Args:
            service (dict): Service information
            
        Returns:
            str: Service category (mobile, media, text, other)
        """
        name = service.get("name", "").lower()
        service_id = service.get("service_id", "").lower()
        description = service.get("description", "").lower()
        
        # Mobile services
        if "mobile" in name or "mobile" in service_id or "mobile_app" in service_id:
            return "mobile"
        if "phone" in name or "phone" in description:
            return "mobile"
        if "android" in name or "ios" in name or "app" in name:
            return "mobile"
        
        # Media services
        if any(media in name for media in ["tv", "speaker", "media", "audio", "sonos", "display"]):
            return "media"
        if "cast" in name or "chromecast" in name:
            return "media"
        if "tts" in name or "speech" in name:
            return "media"
        
        # Text-based services
        if any(text in name for text in ["email", "sms", "push", "telegram", "slack", "discord"]):
            return "text"
        if "mail" in name or "message" in name:
            return "text"
        
        # Default
        return "other"
    
    def get_service_category(self, service_id):
        """Get the category for a service.
        
        Args:
            service_id (str): Service ID
            
        Returns:
            str: Service category
        """
        # Ensure services are discovered
        if not self.services:
            self.discover_services()
        
        # Return cached category if available
        if service_id in self.service_categories:
            return self.service_categories[service_id]
        
        # Try to categorize by service ID
        if service_id.startswith("notify."):
            service_name = service_id.split(".", 1)[1]
            for category, services in self.services.items():
                for service in services:
                    if service["name"] == service_name:
                        return category
        
        # Default categorization
        if "mobile" in service_id:
            return "mobile"
        elif any(media in service_id for media in ["tv", "speaker", "media", "audio", "sonos", "display"]):
            return "media"
        elif any(text in service_id for text in ["email", "sms", "push", "telegram", "slack", "discord"]):
            return "text"
        
        return "other"
    
    def get_services_by_category(self, category):
        """Get services in a specific category.
        
        Args:
            category (str): Service category
            
        Returns:
            list: Services in the category
        """
        # Ensure services are discovered
        if not self.services:
            self.discover_services()
        
        return self.services.get(category, [])
    
    def _make_request(self, endpoint):
        """Make a request to the Home Assistant API.
        
        Args:
            endpoint (str): API endpoint
            
        Returns:
            dict: Response data or None on error
        """
        return self.ha_client._make_request(endpoint)


# Helper function to create service discovery instance
def create_service_discovery(ha_client):
    """Create a new ServiceDiscovery instance.
    
    Args:
        ha_client (HomeAssistantAPIClient): Home Assistant API client
        
    Returns:
        ServiceDiscovery: New service discovery instance
    """
    return ServiceDiscovery(ha_client)