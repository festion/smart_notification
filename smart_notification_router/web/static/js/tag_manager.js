/**
 * Tag Manager for Smart Notification Router
 * 
 * This script handles the entity tag management UI for the Smart Notification v2 tag-based routing system.
 */

// Global state
let entities = [];
let selectedEntity = null;
let entityTags = {};
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Tag Manager loaded');
    
    // Initialize UI
    initUI();
    
    // Initialize debug mode
    initDebugMode();
    
    // Load entities from Home Assistant
    loadEntities();
    
    // Initialize event listeners
    initEventListeners();
    
    console.log('Tag Manager initialization complete');
});

/**
 * Initialize debug mode functionality
 * Press Ctrl+Shift+D to toggle debug links visibility
 */
function initDebugMode() {
    // Check if we should enable debug mode by default
    const debugParam = new URLSearchParams(window.location.search).get('debug');
    if (debugParam === 'true' || debugParam === '1') {
        toggleDebugLinks(true);
    }
    
    // Add keyboard shortcut for debug mode
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+D to toggle debug mode
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            toggleDebugLinks();
        }
    });
}

/**
 * Toggle visibility of debug links
 * @param {boolean} [forceShow] Force show or hide
 */
function toggleDebugLinks(forceShow) {
    const debugLinks = document.querySelectorAll('.debug-link');
    const currentState = debugLinks[0]?.style.display !== 'none';
    
    const newState = forceShow !== undefined ? forceShow : !currentState;
    
    debugLinks.forEach(link => {
        link.style.display = newState ? 'block' : 'none';
    });
    
    if (newState) {
        console.log('Debug mode enabled - debug links are now visible');
    } else {
        console.log('Debug mode disabled - debug links are now hidden');
    }
}

/**
 * Initialize UI
 */
function initUI() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Initialize entity category collapsible sections
    const categoryTitles = document.querySelectorAll('.entity-category-title');
    categoryTitles.forEach(title => {
        title.addEventListener('click', () => {
            const category = title.closest('.entity-category');
            const items = category.querySelector('.entity-category-items');
            
            if (items.style.display === 'none') {
                items.style.display = 'block';
                title.querySelector('i').classList.remove('mdi-chevron-right');
                title.querySelector('i').classList.add('mdi-chevron-down');
            } else {
                items.style.display = 'none';
                title.querySelector('i').classList.remove('mdi-chevron-down');
                title.querySelector('i').classList.add('mdi-chevron-right');
            }
        });
    });
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Refresh entities button
    document.getElementById('refresh-entities').addEventListener('click', loadEntities);
    
    // Help button
    document.getElementById('help-button').addEventListener('click', showHelp);
    
    // Sync tags button
    document.getElementById('sync-tags-button').addEventListener('click', syncTags);
    
    // Entity search
    document.getElementById('entity-search').addEventListener('input', handleSearch);
    
    // Filter menu
    const filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active filter
            filterItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Apply filter
            currentFilter = item.dataset.filter;
            applyFilters();
        });
    });
    
    // Add tag button
    document.getElementById('add-tag-button').addEventListener('click', addTag);
    
    // Tag input enter key
    document.getElementById('tag-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            addTag();
        }
    });
    
    // Tag suggestions
    const tagSuggestions = document.querySelectorAll('.tag-suggestion');
    tagSuggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            document.getElementById('tag-input').value = suggestion.dataset.tag;
            document.getElementById('tag-input').focus();
        });
    });
    
    // Save tags button
    document.getElementById('save-tags-button').addEventListener('click', saveTags);
}

/**
 * Load entities from Home Assistant
 */
function loadEntities() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Reset selected entity
    selectEntity(null);
    
    // Clear entity counters
    document.querySelectorAll('.entity-count').forEach(counter => {
        counter.textContent = '0';
    });
    
    // Clear entity lists
    document.querySelectorAll('.entity-category-items').forEach(container => {
        container.innerHTML = '';
    });
    
    // Determine the base URL prefix considering multiple proxy layers
    // Get the script src which should have been rendered with url_for
    const scripts = document.querySelectorAll('script');
    let scriptSrc = '';
    
    // Find our tag_manager.js script
    for (const script of scripts) {
        if (script.src && script.src.includes('tag_manager.js')) {
            scriptSrc = script.src;
            break;
        }
    }
    
    // Log the detected script path for debugging
    console.log('Detected script path:', scriptSrc);
    
    // Extract base URL up to the last occurrence of /static/
    let baseUrlPrefix = '';
    if (scriptSrc) {
        // Extract everything before /static/ in the URL
        const staticIndex = scriptSrc.lastIndexOf('/static/');
        if (staticIndex > 0) {
            baseUrlPrefix = scriptSrc.substring(0, staticIndex);
        }
    }
    
    // Fallback: look at the current page URL
    if (!baseUrlPrefix) {
        // Extract from the current page URL path
        const pathParts = window.location.pathname.split('/');
        const tagManagerIndex = pathParts.indexOf('tag-manager');
        
        if (tagManagerIndex > 0) {
            // Remove the last part (tag-manager) and join
            baseUrlPrefix = pathParts.slice(0, tagManagerIndex).join('/');
        } else {
            // Use window location as is
            baseUrlPrefix = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        }
    }
    
    // Ensure no trailing slash
    baseUrlPrefix = baseUrlPrefix.replace(/\/$/, '');
    
    const apiBaseUrl = `${baseUrlPrefix}/api/v2`;
    
    // Log the determined base URL for debugging
    console.log('Base URL prefix:', baseUrlPrefix);
    console.log('API base URL:', apiBaseUrl);
    
    // Fetch entities from API with the corrected URL
    fetch(`${apiBaseUrl}/entities`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok') {
                entities = data.entities || [];
                entityTags = data.entity_tags || {};
                
                // Process and display entities
                processEntities(entities);
                
                // Hide loading overlay
                document.getElementById('loading-overlay').style.display = 'none';
                
                // Show success message
                showSyncStatus('Entities loaded successfully', true);
            } else {
                console.error('Failed to load entities:', data.error);
                showSyncStatus('Failed to load entities: ' + data.error, false);
                document.getElementById('loading-overlay').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error loading entities:', error);
            showSyncStatus('Error loading entities: ' + error.message, false);
            document.getElementById('loading-overlay').style.display = 'none';
        });
}

/**
 * Process entities and display them in the UI
 * @param {Array} entities List of entities from Home Assistant
 */
function processEntities(entities) {
    // Count entities by category
    const counts = {
        person: 0,
        device_tracker: 0,
        media_player: 0,
        other: 0,
        tagged: 0
    };
    
    // Process each entity
    entities.forEach(entity => {
        const entityId = entity.entity_id;
        const entityType = entityId.split('.')[0];
        const tags = entityTags[entityId] || [];
        
        // Create entity item
        const entityItem = createEntityItem(entity, tags);
        
        // Add to appropriate category
        let categoryContainer;
        
        if (entityType === 'person') {
            categoryContainer = document.querySelector('.entity-category[data-category="person"] .entity-category-items');
            counts.person++;
        } else if (entityType === 'device_tracker') {
            categoryContainer = document.querySelector('.entity-category[data-category="device_tracker"] .entity-category-items');
            counts.device_tracker++;
        } else if (entityType === 'media_player') {
            categoryContainer = document.querySelector('.entity-category[data-category="media_player"] .entity-category-items');
            counts.media_player++;
        } else {
            categoryContainer = document.querySelector('.entity-category[data-category="other"] .entity-category-items');
            counts.other++;
        }
        
        // Count tagged entities
        if (tags.length > 0) {
            counts.tagged++;
        }
        
        // Add to container if found
        if (categoryContainer) {
            categoryContainer.appendChild(entityItem);
        }
    });
    
    // Update entity counts
    document.querySelector('.entity-category[data-category="person"] .entity-count').textContent = counts.person;
    document.querySelector('.entity-category[data-category="device_tracker"] .entity-count').textContent = counts.device_tracker;
    document.querySelector('.entity-category[data-category="media_player"] .entity-count').textContent = counts.media_player;
    document.querySelector('.entity-category[data-category="other"] .entity-count').textContent = counts.other;
    
    // Apply filters
    applyFilters();
}

/**
 * Create an entity item element
 * @param {Object} entity Entity data
 * @param {Array} tags Array of entity tags
 * @returns {HTMLElement} The entity item element
 */
function createEntityItem(entity, tags) {
    const entityId = entity.entity_id;
    const friendlyName = entity.attributes?.friendly_name || entityId;
    const entityType = entityId.split('.')[0];
    
    // Create entity item
    const entityItem = document.createElement('div');
    entityItem.className = 'entity-item';
    entityItem.dataset.entityId = entityId;
    entityItem.dataset.entityType = entityType;
    entityItem.dataset.tags = tags.join(',');
    
    // Add icon based on entity type
    let iconClass = 'mdi-shape';
    
    if (entityType === 'person') {
        iconClass = 'mdi-account';
    } else if (entityType === 'device_tracker') {
        iconClass = 'mdi-cellphone';
    } else if (entityType === 'media_player') {
        iconClass = 'mdi-speaker';
    } else if (entityType === 'light') {
        iconClass = 'mdi-lightbulb';
    } else if (entityType === 'switch') {
        iconClass = 'mdi-toggle-switch';
    } else if (entityType === 'binary_sensor') {
        iconClass = 'mdi-checkbox-blank-circle';
    }
    
    // Create entity item content
    entityItem.innerHTML = `
        <div class="entity-selector">
            <div class="entity-type-icon">
                <i class="mdi ${iconClass}"></i>
            </div>
            <div class="entity-name">${friendlyName}</div>
        </div>
        <div class="entity-tag-count">${tags.length > 0 ? `<span class="entity-count">${tags.length}</span>` : ''}</div>
    `;
    
    // Add click handler
    entityItem.addEventListener('click', () => selectEntity(entity));
    
    return entityItem;
}

/**
 * Apply filters to entity list
 */
function applyFilters() {
    const entityItems = document.querySelectorAll('.entity-item');
    let visibleCount = 0;
    
    entityItems.forEach(item => {
        const entityType = item.dataset.entityType;
        const tags = item.dataset.tags.split(',').filter(tag => tag !== '');
        const searchTerms = item.querySelector('.entity-name').textContent.toLowerCase();
        const entityId = item.dataset.entityId.toLowerCase();
        
        // Apply type filter
        let typeMatch = true;
        if (currentFilter !== 'all' && currentFilter !== 'tagged') {
            typeMatch = entityType === currentFilter;
        }
        
        // Apply tagged filter
        let tagMatch = true;
        if (currentFilter === 'tagged') {
            tagMatch = tags.length > 0;
        }
        
        // Apply search filter
        let searchMatch = true;
        if (searchQuery !== '') {
            searchMatch = searchTerms.includes(searchQuery) || entityId.includes(searchQuery);
        }
        
        // Show/hide item
        if (typeMatch && tagMatch && searchMatch) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update entity category visibility based on their content
    document.querySelectorAll('.entity-category').forEach(category => {
        const items = category.querySelectorAll('.entity-item[style="display: flex;"]');
        if (items.length > 0) {
            category.style.display = 'block';
        } else {
            category.style.display = 'none';
        }
    });
    
    // Show message if no entities match filters
    if (visibleCount === 0) {
        showSyncStatus('No entities match the selected filters', false);
    } else {
        document.getElementById('sync-status').style.display = 'none';
    }
}

/**
 * Handle search input
 * @param {Event} event Input event
 */
function handleSearch(event) {
    searchQuery = event.target.value.toLowerCase();
    applyFilters();
}

/**
 * Select an entity to edit
 * @param {Object} entity Entity data
 */
function selectEntity(entity) {
    // Update selected entity
    selectedEntity = entity;
    
    // Remove selected class from all entities
    document.querySelectorAll('.entity-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update UI
    if (entity) {
        // Show entity edit section
        document.getElementById('no-entity-selected').style.display = 'none';
        document.getElementById('entity-edit').style.display = 'block';
        
        // Add selected class to entity item
        const entityItem = document.querySelector(`.entity-item[data-entity-id="${entity.entity_id}"]`);
        if (entityItem) {
            entityItem.classList.add('selected');
        }
        
        // Update entity details
        const entityId = entity.entity_id;
        const friendlyName = entity.attributes?.friendly_name || entityId;
        
        document.getElementById('entity-title').textContent = friendlyName;
        document.getElementById('entity-id').textContent = entityId;
        document.getElementById('entity-state').textContent = entity.state || 'unknown';
        
        // Update entity tags
        updateEntityTags(entityId);
        
        // Update YAML preview
        updateYamlPreview(entityId);
    } else {
        // Show no entity selected section
        document.getElementById('no-entity-selected').style.display = 'block';
        document.getElementById('entity-edit').style.display = 'none';
    }
}

/**
 * Update entity tags display
 * @param {string} entityId Entity ID
 */
function updateEntityTags(entityId) {
    const tags = entityTags[entityId] || [];
    const tagContainer = document.getElementById('entity-tags');
    
    // Clear tags container
    tagContainer.innerHTML = '';
    
    // Add tags
    if (tags.length > 0) {
        tags.forEach(tag => {
            const tagBadge = document.createElement('div');
            tagBadge.className = 'tag-badge';
            tagBadge.innerHTML = `
                <span>${tag}</span>
                <span class="remove-tag" data-tag="${tag}"><i class="mdi mdi-close"></i></span>
            `;
            
            // Add remove handler
            tagBadge.querySelector('.remove-tag').addEventListener('click', () => removeTag(tag));
            
            tagContainer.appendChild(tagBadge);
        });
    } else {
        tagContainer.innerHTML = '<p>No tags assigned to this entity</p>';
    }
}

/**
 * Update YAML preview
 * @param {string} entityId Entity ID
 */
function updateYamlPreview(entityId) {
    const tags = entityTags[entityId] || [];
    let yaml = `homeassistant:
  customize:
    ${entityId}:
      tags:`;
    
    if (tags.length > 0) {
        tags.forEach(tag => {
            yaml += `\n        - ${tag}`;
        });
    } else {
        yaml += ' []';
    }
    
    document.getElementById('yaml-preview').textContent = yaml;
}

/**
 * Add a tag to the selected entity
 */
function addTag() {
    if (!selectedEntity) return;
    
    const tagInput = document.getElementById('tag-input');
    const tag = tagInput.value.trim();
    
    if (tag) {
        const entityId = selectedEntity.entity_id;
        const tags = entityTags[entityId] || [];
        
        // Check if tag already exists
        if (tags.includes(tag)) {
            showSyncStatus('Tag already exists', false);
            return;
        }
        
        // Add tag
        tags.push(tag);
        entityTags[entityId] = tags;
        
        // Update UI
        updateEntityTags(entityId);
        updateYamlPreview(entityId);
        
        // Update entity item
        const entityItem = document.querySelector(`.entity-item[data-entity-id="${entityId}"]`);
        if (entityItem) {
            entityItem.dataset.tags = tags.join(',');
            const tagCount = entityItem.querySelector('.entity-tag-count');
            tagCount.innerHTML = `<span class="entity-count">${tags.length}</span>`;
        }
        
        // Clear input
        tagInput.value = '';
        
        // Reapply filters
        applyFilters();
    }
}

/**
 * Remove a tag from the selected entity
 * @param {string} tag Tag to remove
 */
function removeTag(tag) {
    if (!selectedEntity) return;
    
    const entityId = selectedEntity.entity_id;
    let tags = entityTags[entityId] || [];
    
    // Remove tag
    tags = tags.filter(t => t !== tag);
    entityTags[entityId] = tags;
    
    // Update UI
    updateEntityTags(entityId);
    updateYamlPreview(entityId);
    
    // Update entity item
    const entityItem = document.querySelector(`.entity-item[data-entity-id="${entityId}"]`);
    if (entityItem) {
        entityItem.dataset.tags = tags.join(',');
        const tagCount = entityItem.querySelector('.entity-tag-count');
        if (tags.length > 0) {
            tagCount.innerHTML = `<span class="entity-count">${tags.length}</span>`;
        } else {
            tagCount.innerHTML = '';
        }
    }
    
    // Reapply filters
    applyFilters();
}

/**
 * Save entity tags
 */
function saveTags() {
    if (!selectedEntity) return;
    
    const entityId = selectedEntity.entity_id;
    const tags = entityTags[entityId] || [];
    
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Create a function to get base URL prefix (for consistency)
    function getBaseUrlPrefix() {
        // Get the script src which should have been rendered with url_for
        const scripts = document.querySelectorAll('script');
        let scriptSrc = '';
        
        // Find our tag_manager.js script
        for (const script of scripts) {
            if (script.src && script.src.includes('tag_manager.js')) {
                scriptSrc = script.src;
                break;
            }
        }
        
        // Extract base URL up to the last occurrence of /static/
        let baseUrlPrefix = '';
        if (scriptSrc) {
            // Extract everything before /static/ in the URL
            const staticIndex = scriptSrc.lastIndexOf('/static/');
            if (staticIndex > 0) {
                baseUrlPrefix = scriptSrc.substring(0, staticIndex);
            }
        }
        
        // Fallback: look at the current page URL
        if (!baseUrlPrefix) {
            // Extract from the current page URL path
            const pathParts = window.location.pathname.split('/');
            const tagManagerIndex = pathParts.indexOf('tag-manager');
            
            if (tagManagerIndex > 0) {
                // Remove the last part (tag-manager) and join
                baseUrlPrefix = pathParts.slice(0, tagManagerIndex).join('/');
            } else {
                // Use window location as is
                baseUrlPrefix = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            }
        }
        
        // Ensure no trailing slash
        return baseUrlPrefix.replace(/\/$/, '');
    }
    
    const baseUrlPrefix = getBaseUrlPrefix();
    const apiBaseUrl = `${baseUrlPrefix}/api/v2`;
    
    console.log('Save Tags - Using API URL:', apiBaseUrl);
    
    // Send tags to API
    fetch(`${apiBaseUrl}/entity-tags`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            entity_id: entityId,
            tags: tags
        })
    })
        .then(response => response.json())
        .then(data => {
            // Hide loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
            
            if (data.status === 'ok') {
                showSyncStatus('Tags saved successfully', true);
            } else {
                showSyncStatus('Failed to save tags: ' + data.error, false);
            }
        })
        .catch(error => {
            console.error('Error saving tags:', error);
            showSyncStatus('Error saving tags: ' + error.message, false);
            document.getElementById('loading-overlay').style.display = 'none';
        });
}

/**
 * Sync tags with Home Assistant
 */
function syncTags() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Use the getBaseUrlPrefix function defined in saveTags
    function getBaseUrlPrefix() {
        // Get the script src which should have been rendered with url_for
        const scripts = document.querySelectorAll('script');
        let scriptSrc = '';
        
        // Find our tag_manager.js script
        for (const script of scripts) {
            if (script.src && script.src.includes('tag_manager.js')) {
                scriptSrc = script.src;
                break;
            }
        }
        
        // Extract base URL up to the last occurrence of /static/
        let baseUrlPrefix = '';
        if (scriptSrc) {
            // Extract everything before /static/ in the URL
            const staticIndex = scriptSrc.lastIndexOf('/static/');
            if (staticIndex > 0) {
                baseUrlPrefix = scriptSrc.substring(0, staticIndex);
            }
        }
        
        // Fallback: look at the current page URL
        if (!baseUrlPrefix) {
            // Extract from the current page URL path
            const pathParts = window.location.pathname.split('/');
            const tagManagerIndex = pathParts.indexOf('tag-manager');
            
            if (tagManagerIndex > 0) {
                // Remove the last part (tag-manager) and join
                baseUrlPrefix = pathParts.slice(0, tagManagerIndex).join('/');
            } else {
                // Use window location as is
                baseUrlPrefix = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            }
        }
        
        // Ensure no trailing slash
        return baseUrlPrefix.replace(/\/$/, '');
    }
    
    const baseUrlPrefix = getBaseUrlPrefix();
    const apiBaseUrl = `${baseUrlPrefix}/api/v2`;
    
    console.log('Sync Tags - Using API URL:', apiBaseUrl);
    
    // Send sync request to API
    fetch(`${apiBaseUrl}/sync-tags`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            // Hide loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
            
            if (data.status === 'ok') {
                showSyncStatus('Tags synced successfully with Home Assistant', true);
                
                // Reload entities after sync
                setTimeout(loadEntities, 1000);
            } else {
                showSyncStatus('Failed to sync tags: ' + data.error, false);
            }
        })
        .catch(error => {
            console.error('Error syncing tags:', error);
            showSyncStatus('Error syncing tags: ' + error.message, false);
            document.getElementById('loading-overlay').style.display = 'none';
        });
}

/**
 * Show sync status message
 * @param {string} message Message to show
 * @param {boolean} success Whether the operation was successful
 */
function showSyncStatus(message, success) {
    const statusEl = document.getElementById('sync-status');
    statusEl.textContent = message;
    statusEl.className = success ? 'sync-status sync-success' : 'sync-status sync-error';
    
    // Hide after 5 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

/**
 * Show help dialog
 */
function showHelp() {
    alert(`Tag Manager Help

The Tag Manager allows you to add and manage tags for Home Assistant entities without editing YAML files.

Tags use the format "category:value" and enable the Smart Notification v2 routing system to target notifications based on tag expressions.

Common tag categories:
- user:name - Associate entity with a user
- device:type - Device type (mobile, speaker, display)
- area:location - Physical location of entity
- priority:level - Priority level for notification
- time:period - Time period when entity should be used

For example, to route notifications to John's mobile phone, use the tag expression "user:john+device:mobile".`);
}