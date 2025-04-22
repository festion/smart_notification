"""
Entity Tag Manager

This module provides functionality for managing Home Assistant entity tags
for the Smart Notification Router v2 tag-based routing system.
"""

import logging
import yaml
import os
import json
from .ha_client import HomeAssistantAPIClient

logger = logging.getLogger(__name__)

class EntityTagManager:
    """Manager for Home Assistant entity tags."""
    
    def __init__(self, ha_client, config_dir="/config"):
        """Initialize the entity tag manager.
        
        Args:
            ha_client (HomeAssistantAPIClient): Home Assistant API client
            config_dir (str): Home Assistant configuration directory
        """
        self.ha_client = ha_client
        self.config_dir = config_dir
        self.customize_file = os.path.join(config_dir, "customize.yaml")
        self.entity_tags = {}
        self.entities = []
        
        # Load entity tags from Home Assistant
        self._load_entity_tags()
    
    def _load_entity_tags(self):
        """Load entity tags from Home Assistant."""
        try:
            # Get all entities with tags
            entities_with_tags = self.ha_client.get_entities_with_tags()
            self.entity_tags = entities_with_tags
            
            # Get all entities
            states = self.ha_client.get_entity_states()
            self.entities = states if states else []
            
            logger.info(f"Loaded {len(self.entity_tags)} entities with tags")
            logger.info(f"Loaded {len(self.entities)} total entities")
        except Exception as e:
            logger.error(f"Error loading entity tags: {e}")
    
    def get_entities(self):
        """Get all entities from Home Assistant.
        
        Returns:
            list: List of entities
        """
        return self.entities
    
    def get_entity_tags(self):
        """Get all entity tags.
        
        Returns:
            dict: Dictionary mapping entity IDs to lists of tags
        """
        return self.entity_tags
    
    def set_entity_tags(self, entity_id, tags):
        """Set tags for an entity.
        
        Args:
            entity_id (str): Entity ID
            tags (list): List of tags
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Update local cache
            self.entity_tags[entity_id] = tags
            
            return True
        except Exception as e:
            logger.error(f"Error setting tags for entity {entity_id}: {e}")
            return False
    
    def sync_tags_to_ha(self):
        """Sync entity tags to Home Assistant.
        
        This generates a customize.yaml file for Home Assistant to load
        entity customizations including tags.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            customize_data = {}
            
            # Create customization data for each entity with tags
            for entity_id, tags in self.entity_tags.items():
                if tags:
                    customize_data[entity_id] = {"tags": tags}
            
            # Backup existing customize file if it exists
            if os.path.exists(self.customize_file):
                backup_file = self.customize_file + ".backup"
                try:
                    with open(self.customize_file, "r") as f:
                        existing_data = yaml.safe_load(f) or {}
                    
                    with open(backup_file, "w") as f:
                        yaml.dump(existing_data, f, default_flow_style=False)
                    
                    logger.info(f"Backed up existing customize file to {backup_file}")
                except Exception as e:
                    logger.error(f"Error backing up customize file: {e}")
            
            # Create customize directory if needed
            os.makedirs(os.path.dirname(self.customize_file), exist_ok=True)
            
            # Write new customize file
            with open(self.customize_file, "w") as f:
                yaml.dump(customize_data, f, default_flow_style=False)
            
            logger.info(f"Wrote customize file with {len(customize_data)} entities")
            
            # Reload Home Assistant customization
            if self._reload_ha_customization():
                logger.info("Reloaded Home Assistant customization")
                return True
            else:
                logger.error("Failed to reload Home Assistant customization")
                return False
        
        except Exception as e:
            logger.error(f"Error syncing tags to Home Assistant: {e}")
            return False
    
    def _reload_ha_customization(self):
        """Reload Home Assistant customization.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Call homeassistant.reload_core_config service
            result = self.ha_client.call_service("homeassistant", "reload_core_config")
            return result
        except Exception as e:
            logger.error(f"Error reloading Home Assistant customization: {e}")
            return False
    
    def load_tags_from_file(self):
        """Load entity tags from customize.yaml file.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if os.path.exists(self.customize_file):
                with open(self.customize_file, "r") as f:
                    customize_data = yaml.safe_load(f) or {}
                
                # Extract tags from customize data
                entity_tags = {}
                for entity_id, data in customize_data.items():
                    if isinstance(data, dict) and "tags" in data:
                        entity_tags[entity_id] = data["tags"]
                
                # Update local cache
                self.entity_tags.update(entity_tags)
                
                logger.info(f"Loaded {len(entity_tags)} entities with tags from file")
                return True
            else:
                logger.warning(f"Customize file not found: {self.customize_file}")
                return False
        except Exception as e:
            logger.error(f"Error loading tags from file: {e}")
            return False