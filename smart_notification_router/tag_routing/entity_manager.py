"""
Entity Manager for Smart Notification Router.
This module manages entity tags and provides access to Home Assistant entities.
"""

import logging
from typing import Dict, List, Any, Optional
from .ha_client import HomeAssistantAPIClient

logger = logging.getLogger(__name__)

class EntityManager:
    """Manages entities and their tags."""

    def __init__(self, demo_mode: bool = True):
        """Initialize the entity manager.
        
        Args:
            demo_mode: Whether to use demo data instead of actual API calls
        """
        self.ha_client = HomeAssistantAPIClient(demo_mode=demo_mode)
    
    def get_all_entities(self) -> List[Dict[str, Any]]:
        """Get all entities from Home Assistant."""
        return self.ha_client.get_entities()
    
    def get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get a single entity by ID."""
        return self.ha_client.get_entity(entity_id)
    
    def get_entity_tags(self) -> Dict[str, List[str]]:
        """Get all entity tags.
        
        Returns:
            Dictionary mapping entity IDs to lists of tags
        """
        return self.ha_client.get_entity_tags()
    
    def get_tags_for_entity(self, entity_id: str) -> List[str]:
        """Get tags for a specific entity.
        
        Args:
            entity_id: The ID of the entity
            
        Returns:
            List of tags for the entity
        """
        all_tags = self.ha_client.get_entity_tags()
        return all_tags.get(entity_id, [])
    
    def set_entity_tags(self, entity_id: str, tags: List[str]) -> None:
        """Set tags for an entity."""
        self.ha_client.set_entity_tags(entity_id, tags)
    
    def add_tag_to_entity(self, entity_id: str, tag: str) -> None:
        """Add a tag to an entity if it doesn't already exist."""
        current_tags = self.get_tags_for_entity(entity_id)
        if tag not in current_tags:
            current_tags.append(tag)
            self.set_entity_tags(entity_id, current_tags)
    
    def remove_tag_from_entity(self, entity_id: str, tag: str) -> None:
        """Remove a tag from an entity if it exists."""
        current_tags = self.get_tags_for_entity(entity_id)
        if tag in current_tags:
            current_tags.remove(tag)
            self.set_entity_tags(entity_id, current_tags)
    
    def batch_update_tags(self, entity_ids: List[str], tags: List[str], 
                           operation: str = 'add') -> Dict[str, List[str]]:
        """Update tags for multiple entities in batch.
        
        Args:
            entity_ids: List of entity IDs to update
            tags: List of tags to apply
            operation: The operation to perform ('add', 'remove', or 'replace')
            
        Returns:
            Dictionary mapping entity IDs to their updated tags
        """
        results = {}
        
        for entity_id in entity_ids:
            current_tags = self.get_tags_for_entity(entity_id)
            
            if operation == 'add':
                # Add tags without duplicates
                new_tags = current_tags.copy()
                for tag in tags:
                    if tag not in new_tags:
                        new_tags.append(tag)
            elif operation == 'remove':
                # Remove specified tags
                new_tags = [tag for tag in current_tags if tag not in tags]
            else:  # replace
                # Replace all tags
                new_tags = tags.copy()
            
            # Update tags for this entity
            self.set_entity_tags(entity_id, new_tags)
            
            # Add to results
            results[entity_id] = new_tags
        
        return results
    
    def find_entities_by_tag(self, tag: str) -> List[str]:
        """Find entities that have a specific tag.
        
        Args:
            tag: The tag to search for
            
        Returns:
            List of entity IDs that have the tag
        """
        results = []
        entity_tags = self.get_entity_tags()
        
        for entity_id, tags in entity_tags.items():
            if tag in tags:
                results.append(entity_id)
        
        return results
    
    def get_entities(self) -> List[Dict[str, Any]]:
        """Alias for get_all_entities() for compatibility."""
        return self.get_all_entities()
    
class EntityTagManager:
    """Legacy class for backwards compatibility."""
    
    def __init__(self, demo_mode: bool = True):
        """Initialize with an EntityManager."""
        self.entity_manager = EntityManager(demo_mode=demo_mode)
    
    def get_entity_tags(self) -> Dict[str, List[str]]:
        """Get all entity tags."""
        return self.entity_manager.ha_client.get_entity_tags()
    
    def set_entity_tags(self, entity_id: str, tags: List[str]) -> None:
        """Set tags for an entity."""
        self.entity_manager.set_entity_tags(entity_id, tags)