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
let selectedEntityIds = new Set(); // Use a Set instead of an array for better performance
let batchOperation = 'add'; // Default batch operation
let currentBatchFilter = 'all'; // Default batch filter
let batchSearchQuery = '';
let allEntities = [];
let availableTags = [];
let recentlyUsedTags = []; // Track recently used tags for suggestions
// Add new variables for advanced filtering
let currentTagFilter = ''; // Add currentTagFilter variable
let tagFilterMode = 'contains'; // 'contains', 'exact', 'startsWith', 'endsWith'
let tagCategoryFilters = {}; // Store category-specific filters

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
    
    // Initialize tabs
    initTabs();
    
    // Create the advanced filter UI if it doesn't exist
    createAdvancedFilterUI();
    
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
 * Initialize tab functionality
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Set first tab as active by default if none is active
    let hasActiveTab = false;
    tabs.forEach(tab => {
        if (tab.classList.contains('active')) {
            hasActiveTab = true;
        }
    });
    
    if (!hasActiveTab && tabs.length > 0) {
        tabs[0].classList.add('active');
        const targetId = tabs[0].getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    }
    
    // Add click handlers for tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and its content
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
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
    
    // Test expression button
    document.getElementById('test-expression-button').addEventListener('click', testExpression);
    
    // Expression examples
    const expressionExamples = document.querySelectorAll('.expression-example');
    expressionExamples.forEach(example => {
        example.addEventListener('click', () => {
            document.getElementById('expression-input').value = example.dataset.expression;
            testExpression();
        });
    });
    
    // Expression input enter key
    document.getElementById('expression-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            testExpression();
        }
    });
    
    // Batch operations
    document.getElementById('batch-entity-search').addEventListener('input', handleBatchSearch);
    
    document.getElementById('select-all-btn').addEventListener('click', selectAllEntities);
    document.getElementById('select-none-btn').addEventListener('click', clearEntitySelection);
    
    document.getElementById('select-all-checkbox').addEventListener('change', toggleSelectAllVisible);
    
    // Batch operation options
    const operationOptions = document.querySelectorAll('.operation-option');
    operationOptions.forEach(option => {
        option.addEventListener('click', () => {
            operationOptions.forEach(op => op.classList.remove('active'));
            option.classList.add('active');
            batchOperation = option.dataset.operation;
        });
    });
    
    // Batch tag suggestions
    const batchTagSuggestions = document.querySelectorAll('.tag-suggestions .tag-suggestion');
    batchTagSuggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const batchTagInput = document.getElementById('batch-tag-input');
            const cursorPos = batchTagInput.selectionStart;
            const currentText = batchTagInput.value;
            
            // If there's already some text, add a comma before the new tag
            let newText;
            if (currentText) {
                // Check if the last character is already a comma
                if (currentText[currentText.length - 1] === ',') {
                    newText = currentText + ' ' + suggestion.dataset.tag;
                } else {
                    newText = currentText + ', ' + suggestion.dataset.tag;
                }
            } else {
                newText = suggestion.dataset.tag;
            }
            
            batchTagInput.value = newText;
            batchTagInput.focus();
        });
    });
    
    // Apply batch changes
    document.getElementById('batch-apply-btn').addEventListener('click', applyBatchChanges);
    
    // Batch filter menu
    const batchFilterItems = document.querySelectorAll('[data-batch-filter]');
    batchFilterItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active filter
            batchFilterItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Apply filter to batch view
            applyBatchFilter(item.dataset.batchFilter);
        });
    });

    // Tag filter input
    document.getElementById('tag-filter-input').addEventListener('input', filterEntitiesByTags);
    
    // Clear filter button
    document.getElementById('clear-filter-btn').addEventListener('click', clearTagFilter);

    // Enhanced tag filter input
    document.getElementById('tag-filter-input').addEventListener('input', advancedTagFilter);
    
    // Tag filter mode selector
    const tagFilterMode = document.getElementById('tag-filter-mode');
    if (tagFilterMode) {
        tagFilterMode.addEventListener('change', advancedTagFilter);
    }
    
    // Clear filter button
    document.getElementById('clear-filter-btn').addEventListener('click', clearTagFilter);
}

/**
 * Load entities from API or use sample data if API fails
 */
function loadEntities() {
    fetch('/api/entities')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allEntities = data;
            populateEntityList();
            extractAvailableTags();
        })
        .catch(error => {
            console.warn('Failed to load entities from API, using sample data instead:', error);
            loadSampleData();
        });
}

/**
 * Load sample data for testing when API is not available
 */
function loadSampleData() {
    console.log('Loading sample data for testing');
    
    // Create sample entities and tags
    const sampleEntities = [
        {
            entity_id: 'person.john',
            state: 'home',
            attributes: {
                friendly_name: 'John Doe',
                id: 'john',
                source: 'device_tracker.john_phone'
            }
        },
        {
            entity_id: 'person.jane',
            state: 'not_home',
            attributes: {
                friendly_name: 'Jane Doe',
                id: 'jane',
                source: 'device_tracker.jane_phone'
            }
        },
        {
            entity_id: 'device_tracker.john_phone',
            state: 'home',
            attributes: {
                friendly_name: 'John\'s Phone',
                battery_level: 82,
                source_type: 'gps'
            }
        },
        {
            entity_id: 'device_tracker.jane_phone',
            state: 'not_home',
            attributes: {
                friendly_name: 'Jane\'s Phone',
                battery_level: 64,
                source_type: 'gps'
            }
        },
        {
            entity_id: 'device_tracker.john_tablet',
            state: 'home',
            attributes: {
                friendly_name: 'John\'s Tablet',
                battery_level: 96,
                source_type: 'gps'
            }
        },
        {
            entity_id: 'media_player.living_room_speaker',
            state: 'idle',
            attributes: {
                friendly_name: 'Living Room Speaker',
                volume_level: 0.5,
                supported_features: 4
            }
        },
        {
            entity_id: 'media_player.bedroom_speaker',
            state: 'idle',
            attributes: {
                friendly_name: 'Bedroom Speaker',
                volume_level: 0.3,
                supported_features: 4
            }
        },
        {
            entity_id: 'media_player.kitchen_display',
            state: 'idle',
            attributes: {
                friendly_name: 'Kitchen Display',
                volume_level: 0.7,
                supported_features: 12
            }
        },
        {
            entity_id: 'light.living_room',
            state: 'on',
            attributes: {
                friendly_name: 'Living Room Light',
                brightness: 255
            }
        },
        {
            entity_id: 'switch.coffee_maker',
            state: 'off',
            attributes: {
                friendly_name: 'Coffee Maker'
            }
        }
    ];
    
    // Create sample tags
    const sampleEntityTags = {
        'person.john': ['user:john', 'priority:high'],
        'person.jane': ['user:jane', 'priority:high'],
        'device_tracker.john_phone': ['user:john', 'device:mobile', 'area:dynamic'],
        'device_tracker.jane_phone': ['user:jane', 'device:mobile', 'area:dynamic'],
        'device_tracker.john_tablet': ['user:john', 'device:tablet', 'area:home'],
        'media_player.living_room_speaker': ['area:living_room', 'device:speaker', 'priority:medium'],
        'media_player.bedroom_speaker': ['area:bedroom', 'device:speaker', 'priority:low'],
        'media_player.kitchen_display': ['area:kitchen', 'device:display', 'priority:high'],
        'light.living_room': ['area:living_room']
    };
    
    entities = sampleEntities;
    entityTags = sampleEntityTags;
    
    // Process and display entities
    processEntities(entities);
    
    // Hide loading overlay
    document.getElementById('loading-overlay').style.display = 'none';
    
    // Show message
    showSyncStatus('Loaded sample data for testing (API not available)', false);
}

/**
 * Provide sample entity data for testing when API is not available
 */
function getSampleEntityData() {
    return [
        {
            "entity_id": "light.living_room",
            "friendly_name": "Living Room Light",
            "state": "on",
            "tags": ["room:living", "floor:1", "type:light"]
        },
        {
            "entity_id": "light.kitchen",
            "friendly_name": "Kitchen Light",
            "state": "off",
            "tags": ["room:kitchen", "floor:1", "type:light"]
        },
        {
            "entity_id": "switch.coffee_maker",
            "friendly_name": "Coffee Maker",
            "state": "off",
            "tags": ["room:kitchen", "floor:1", "type:appliance"]
        },
        {
            "entity_id": "sensor.temperature_bedroom",
            "friendly_name": "Bedroom Temperature",
            "state": "22.5",
            "tags": ["room:bedroom", "floor:2", "type:sensor", "measure:temperature"]
        },
        {
            "entity_id": "binary_sensor.front_door",
            "friendly_name": "Front Door Sensor",
            "state": "off",
            "tags": ["door:front", "floor:1", "type:security"]
        }
    ];
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
    
    // Also populate the batch entity list
    populateBatchEntityList(entities);
}

/**
 * Populate the batch entity list
 * @param {Array} entities List of entities
 */
function populateBatchEntityList(entities) {
    const batchEntityList = document.getElementById('batch-entity-list');
    
    // Clear existing content except select-all-container
    const selectAllContainer = batchEntityList.querySelector('.select-all-container');
    batchEntityList.innerHTML = '';
    batchEntityList.appendChild(selectAllContainer);
    
    // Group entities by type
    const entityGroups = {};
    
    entities.forEach(entity => {
        const entityId = entity.entity_id;
        const entityType = entityId.split('.')[0];
        const friendlyName = entity.attributes?.friendly_name || entityId;
        const tags = entityTags[entityId] || [];
        
        // Create group if it doesn't exist
        if (!entityGroups[entityType]) {
            entityGroups[entityType] = [];
        }
        
        // Add entity to group
        entityGroups[entityType].push({
            entity_id: entityId,
            friendly_name: friendlyName,
            tags: tags,
            entity_type: entityType
        });
    });
    
    // Sort entity types
    const orderedTypes = ['person', 'device_tracker', 'media_player', 'light', 'switch', 'binary_sensor'];
    const otherTypes = Object.keys(entityGroups).filter(type => !orderedTypes.includes(type));
    const allTypes = [...orderedTypes, ...otherTypes].filter(type => entityGroups[type]);
    
    // Add entities to list
    allTypes.forEach(entityType => {
        const entities = entityGroups[entityType];
        
        // Sort entities by name
        entities.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
        
        // Add entities to list
        entities.forEach(entity => {
            const entityItem = document.createElement('div');
            entityItem.className = 'entity-item';
            entityItem.dataset.entityId = entity.entity_id;
            entityItem.dataset.entityType = entity.entity_type;
            entityItem.dataset.tags = entity.tags.join(',');
            
            // Create icon based on entity type
            let iconClass = 'mdi-shape';
            
            if (entity.entity_type === 'person') {
                iconClass = 'mdi-account';
            } else if (entity.entity_type === 'device_tracker') {
                iconClass = 'mdi-cellphone';
            } else if (entity.entity_type === 'media_player') {
                iconClass = 'mdi-speaker';
            } else if (entity.entity_type === 'light') {
                iconClass = 'mdi-lightbulb';
            } else if (entity.entity_type === 'switch') {
                iconClass = 'mdi-toggle-switch';
            } else if (entity.entity_type === 'binary_sensor') {
                iconClass = 'mdi-checkbox-blank-circle';
            }
            
            // Create entity item content
            entityItem.innerHTML = `
                <input type="checkbox" class="entity-select" data-entity-id="${entity.entity_id}">
                <div class="entity-selector">
                    <div class="entity-type-icon">
                        <i class="mdi ${iconClass}"></i>
                    </div>
                    <div class="entity-name">${entity.friendly_name}</div>
                </div>
                <div class="entity-id">${entity.entity_id}</div>
                <div class="entity-tags">${entity.tags.length > 0 ? entity.tags.join(', ') : ''}</div>
            `;
            
            // Add checkbox event listener
            const checkbox = entityItem.querySelector('.entity-select');
            checkbox.addEventListener('change', () => handleEntitySelection(checkbox));
            
            // Check if entity is already selected
            if (selectedEntityIds.has(entity.entity_id)) {
                checkbox.checked = true;
            }
            
            batchEntityList.appendChild(entityItem);
        });
    });
    
    // Update selection count
    updateSelectionCount();
    
    // Apply filters
    applyBatchFilters();
}

/**
 * Apply filters to entity list
 */
function applyFilters() {
    // Replace current filter implementation with enhanced version
    enhancedFilterEntities();
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
 * Handle batch search input
 * @param {Event} event Input event
 */
function handleBatchSearch(event) {
    batchSearchQuery = event.target.value.toLowerCase();
    applyBatchFilters();
}

/**
 * Apply filters to batch entity list
 */
function applyBatchFilters() {
    const entityItems = document.querySelectorAll('#batch-entity-list .entity-item');
    let visibleCount = 0;
    
    entityItems.forEach(item => {
        const entityType = item.dataset.entityType;
        const tags = item.dataset.tags.split(',').filter(tag => tag !== '');
        const searchTerms = item.querySelector('.entity-name').textContent.toLowerCase();
        const entityId = item.dataset.entityId.toLowerCase();
        
        // Apply type filter
        let typeMatch = true;
        if (currentBatchFilter !== 'all' && currentBatchFilter !== 'tagged') {
            typeMatch = entityType === currentBatchFilter;
        }
        
        // Apply tagged filter
        let tagMatch = true;
        if (currentBatchFilter === 'tagged') {
            tagMatch = tags.length > 0;
        }
        
        // Apply search filter
        let searchMatch = true;
        if (batchSearchQuery !== '') {
            searchMatch = searchTerms.includes(batchSearchQuery) || entityId.includes(batchSearchQuery);
        }
        
        // Show/hide item
        if (typeMatch && tagMatch && searchMatch) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show message if no entities match filters
    if (visibleCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No entities match the selected filters';
        
        // Check if we already have a no-results message
        const existingNoResults = document.querySelector('#batch-entity-list .no-results');
        if (!existingNoResults) {
            document.getElementById('batch-entity-list').appendChild(noResults);
        }
    } else {
        // Remove any existing no-results message
        const existingNoResults = document.querySelector('#batch-entity-list .no-results');
        if (existingNoResults) {
            existingNoResults.remove();
        }
    }
    
    // Update select all checkbox based on visible selections
    updateSelectAllCheckbox();
}

/**
 * Update the select all checkbox based on visible selections
 */
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const visibleCheckboxes = document.querySelectorAll('#batch-entity-list .entity-item[style="display: flex;"] .entity-select');
    const checkedVisibleCheckboxes = document.querySelectorAll('#batch-entity-list .entity-item[style="display: flex;"] .entity-select:checked');
    
    if (visibleCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedVisibleCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedVisibleCheckboxes.length === visibleCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

/**
 * Handle entity selection for batch operations
 * @param {HTMLElement} checkbox The checkbox element
 */
function handleEntitySelection(checkbox) {
    const entityId = checkbox.dataset.entityId;
    
    if (checkbox.checked) {
        selectedEntityIds.add(entityId);
    } else {
        selectedEntityIds.delete(entityId);
    }
    
    // Update selection count
    updateSelectionCount();
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

/**
 * Update selection count
 */
function updateSelectionCount() {
    const countElement = document.getElementById('batch-selection-count');
    const count = selectedEntityIds.size;
    
    countElement.textContent = count === 1 ? '1 entity selected' : `${count} entities selected`;
}

/**
 * Select all entities
 */
function selectAllEntities() {
    // Select all entities (not just visible ones)
    const checkboxes = document.querySelectorAll('#batch-entity-list .entity-select');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedEntityIds.add(checkbox.dataset.entityId);
    });
    
    // Update selection count
    updateSelectionCount();
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

/**
 * Clear entity selection
 */
function clearEntitySelection() {
    // Clear all selections
    const checkboxes = document.querySelectorAll('#batch-entity-list .entity-select');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    selectedEntityIds.clear();
    
    // Update selection count
    updateSelectionCount();
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

/**
 * Toggle selection of all visible entities
 * @param {Event} event Change event
 */
function toggleSelectAllVisible(event) {
    const isChecked = event.target.checked;
    const visibleCheckboxes = document.querySelectorAll('#batch-entity-list .entity-item[style="display: flex;"] .entity-select');
    
    visibleCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const entityId = checkbox.dataset.entityId;
        
        if (isChecked) {
            selectedEntityIds.add(entityId);
        } else {
            selectedEntityIds.delete(entityId);
        }
    });
    
    // Update selection count
    updateSelectionCount();
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
 * Test a tag expression against entities
 */
function testExpression() {
    const expressionInput = document.getElementById('expression-input');
    const expression = expressionInput.value.trim();
    
    if (!expression) {
        // Show error for empty expression
        showExpressionError('Please enter a tag expression');
        return;
    }
    
    // Clear previous error
    hideExpressionError();
    
    // Show loading in results area
    document.getElementById('test-results').innerHTML = '<div class="no-results">Testing expression...</div>';
    
    // Function to get base URL prefix (reused from other functions)
    function getBaseUrlPrefix() {
        const scripts = document.querySelectorAll('script');
        let scriptSrc = '';
        
        for (const script of scripts) {
            if (script.src && script.src.includes('tag_manager.js')) {
                scriptSrc = script.src;
                break;
            }
        }
        
        let baseUrlPrefix = '';
        if (scriptSrc) {
            const staticIndex = scriptSrc.lastIndexOf('/static/');
            if (staticIndex > 0) {
                baseUrlPrefix = scriptSrc.substring(0, staticIndex);
            }
        }
        
        if (!baseUrlPrefix) {
            const pathParts = window.location.pathname.split('/');
            const tagManagerIndex = pathParts.indexOf('tag-manager');
            
            if (tagManagerIndex > 0) {
                baseUrlPrefix = pathParts.slice(0, tagManagerIndex).join('/');
            } else {
                baseUrlPrefix = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            }
        }
        
        return baseUrlPrefix.replace(/\/$/, '');
    }
    
    const baseUrlPrefix = getBaseUrlPrefix();
    const apiBaseUrl = `${baseUrlPrefix}/api/v2`;
    
    // Make API call to test expression
    fetch(`${apiBaseUrl}/test-expression`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            expression: expression
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('API request failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'ok') {
            displayExpressionResults(data, expression);
        } else {
            showExpressionError(data.error || 'Error testing expression');
            // Try with sample data if the API failed with a parse error
            if (data.error && data.error.includes('parse')) {
                showExpressionError(data.error + " - Using sample data instead");
                testExpressionWithSampleData(expression);
            }
        }
    })
    .catch(error => {
        console.error('Error testing expression:', error);
        showExpressionError('Failed to test expression with API, using sample data');
        
        // Use sample data when the API is unavailable
        testExpressionWithSampleData(expression);
    });
}

/**
 * Test a tag expression against sample entities when API is not available
 */
function testExpressionWithSampleData(expression) {
    console.log('Testing expression with sample data:', expression);
    
    // Use our current entities and tags from memory
    const testEntities = entities.map(entity => {
        return {
            ...entity,
            tags: entityTags[entity.entity_id] || []
        };
    });
    
    // Simple expression parser
    function matchesExpression(tags, expr) {
        // Handle the expr at a high level:
        if (!expr) return false;
        
        // Case 1: Simple tag match
        if (!expr.includes('+') && !expr.includes('|') && !expr.includes('-')) {
            return tags.includes(expr);
        }
        
        // Case 2: OR operation with |
        if (expr.includes('|')) {
            const parts = expr.split('|').map(p => p.trim());
            return parts.some(part => matchesExpression(tags, part));
        }
        
        // Case 3: AND operation with +
        if (expr.includes('+')) {
            const parts = expr.split('+').map(p => p.trim());
            return parts.every(part => matchesExpression(tags, part));
        }
        
        // Case 4: NOT operation with -
        if (expr.includes('-')) {
            const parts = expr.split('-').map(p => p.trim());
            const basePart = parts[0].trim();
            const excludeParts = parts.slice(1);
            
            return matchesExpression(tags, basePart) && 
                   !excludeParts.some(part => matchesExpression(tags, part));
        }
        
        return false;
    }
    
    // Determine matches
    const matches = testEntities.filter(entity => matchesExpression(entity.tags, expression));
    const nonMatches = testEntities.filter(entity => !matchesExpression(entity.tags, expression));
    
    // Create a simple expression tree for visualization
    const expressionTree = {
        type: 'root',
        expression: expression,
        children: parseExpressionTree(expression)
    };
    
    // Display results
    displayExpressionResults({
        status: 'ok',
        matches: matches,
        non_matches: nonMatches,
        total_entities: testEntities.length,
        expression_tree: expressionTree
    }, expression);
}

/**
 * Create a simple parse tree for expression visualization
 */
function parseExpressionTree(expr) {
    if (!expr) return [];
    
    // Simple parser for visualizing the expression
    // OR has lowest precedence
    if (expr.includes('|')) {
        const parts = expr.split('|').map(p => p.trim()).filter(p => p);
        return [{
            type: 'OR',
            children: parts.map(part => parseExpressionTree(part))
        }];
    }
    
    // AND has medium precedence
    if (expr.includes('+')) {
        const parts = expr.split('+').map(p => p.trim()).filter(p => p);
        return [{
            type: 'AND',
            children: parts.map(part => parseExpressionTree(part))
        }];
    }
    
    // NOT has highest precedence
    if (expr.includes('-')) {
        const parts = expr.split('-').map(p => p.trim()).filter(p => p);
        const basePart = parts[0].trim();
        const excludeParts = parts.slice(1);
        
        if (excludeParts.length > 0) {
            return [{
                type: 'NOT',
                base: parseExpressionTree(basePart)[0] || { type: 'TAG', value: basePart },
                exclude: excludeParts.map(part => parseExpressionTree(part)[0] || { type: 'TAG', value: part })
            }];
        }
    }
    
    // Simple tag
    return [{ type: 'TAG', value: expr }];
}

/**
 * Display the results of testing an expression
 * @param {Object} data API response data
 * @param {string} expression The expression that was tested
 */
function displayExpressionResults(data, expression) {
    const resultsContainer = document.getElementById('test-results');
    const matches = data.matches || [];
    const expressionTree = data.expression_tree;
    const nonMatches = data.non_matches || [];
    const totalEntities = (data.total_entities || 0);
    
    // Show expression tree if available
    if (expressionTree) {
        const visualizer = document.getElementById('expression-visualizer');
        const treeContainer = document.getElementById('expression-tree');
        
        treeContainer.textContent = JSON.stringify(expressionTree, null, 2);
        visualizer.style.display = 'block';
    } else {
        document.getElementById('expression-visualizer').style.display = 'none';
    }
    
    // Build results HTML
    let html = '';
    
    // Add header with summary
    html += `<div class="result-header">
        Expression: <code>${expression}</code><br>
        ${matches.length} of ${totalEntities} entities match (${((matches.length / totalEntities) * 100).toFixed(1)}%)
    </div>`;
    
    // Sort matches by entity type and name
    const sortedMatches = [...matches].sort((a, b) => {
        const typeA = a.entity_id.split('.')[0];
        const typeB = b.entity_id.split('.')[0];
        if (typeA === typeB) {
            return a.friendly_name.localeCompare(b.friendly_name);
        }
        return typeA.localeCompare(typeB);
    });
    
    // Add all matching entities
    sortedMatches.forEach(entity => {
        const entityId = entity.entity_id;
        const friendlyName = entity.attributes?.friendly_name || entityId;
        const tags = entity.tags || [];
        
        html += `<div class="result-entity">
            <div class="entity-details">
                <span class="entity-name">${friendlyName}</span>
                <span class="entity-id">${entityId}</span>
                <span class="entity-tags">${tags.join(', ')}</span>
            </div>
            <div class="expression-result match-true">MATCH</div>
        </div>`;
    });
    
    // Add sample of non-matching entities if available
    if (nonMatches.length > 0) {
        // Take max 5 non-matching entities as examples
        const nonMatchSamples = nonMatches.slice(0, 5);
        
        html += `<div class="result-header">
            Sample of non-matching entities (${nonMatches.length} total)
        </div>`;
        
        nonMatchSamples.forEach(entity => {
            const entityId = entity.entity_id;
            const friendlyName = entity.attributes?.friendly_name || entityId;
            const tags = entity.tags || [];
            
            html += `<div class="result-entity">
                <div class="entity-details">
                    <span class="entity-name">${friendlyName}</span>
                    <span class="entity-id">${entityId}</span>
                    <span class="entity-tags">${tags.join(', ')}</span>
                </div>
                <div class="expression-result match-false">NO MATCH</div>
            </div>`;
        });
    }
    
    // If no matches, show a special message
    if (matches.length === 0) {
        html += `<div class="no-results">
            No entities match this expression
        </div>`;
    }
    
    resultsContainer.innerHTML = html;
}

/**
 * Show an expression error
 * @param {string} message Error message
 */
function showExpressionError(message) {
    const errorElement = document.getElementById('expression-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Reset results to default state
    document.getElementById('test-results').innerHTML = '<div class="no-results">Enter an expression and click "Test Expression" to see results</div>';
    
    // Hide visualizer
    document.getElementById('expression-visualizer').style.display = 'none';
}

/**
 * Hide the expression error
 */
function hideExpressionError() {
    document.getElementById('expression-error').style.display = 'none';
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
    const helpText = `Tag Manager Help

The Tag Manager allows you to add and manage tags for Home Assistant entities without editing YAML files.

Tags use the format "category:value" and enable the Smart Notification v2 routing system to target notifications based on tag expressions.

Common tag categories:
- user:name - Associate entity with a user
- device:type - Device type (mobile, speaker, display)
- area:location - Physical location of entity
- priority:level - Priority level for notification
- time:period - Time period when entity should be used

Tag Expression Operators:
+ (AND) - Both conditions must match (user:john+device:mobile)
| (OR) - Either condition can match (user:john|user:jane)
- (NOT) - Exclude matches (area:home-area:bedroom)

For example, to route notifications to John's mobile phone, use the tag expression "user:john+device:mobile".`;

    alert(helpText);
}

/**
 * Apply batch changes to multiple entities
 */
function applyBatchChanges() {
    const operation = document.getElementById('batch-operation').value;
    const tagValue = document.getElementById('batch-tag-input').value.trim();
    const selectedEntities = getSelectedEntities();
    
    if (selectedEntities.length === 0) {
        showNotification('Please select at least one entity', 'warning');
        return;
    }
    
    if (!tagValue && operation !== 'clear') {
        showNotification('Please enter a tag value', 'warning');
        return;
    }
    
    // Create a batch operation to send to the backend
    const batchOperation = {
        operation: operation,
        tag: tagValue,
        entities: selectedEntities
    };
    
    // Show processing indicator
    document.getElementById('batch-operation-spinner').style.display = 'inline-block';
    
    // Send the batch operation to the backend
    fetch('/api/batch_tag_operation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchOperation)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Update the local entity tags based on the operation
        updateLocalEntityTags(operation, tagValue, selectedEntities);
        
        // Update the UI to reflect the changes
        updateTagsDisplay();
        
        // Show success notification
        const message = `Successfully ${getOperationText(operation)} for ${selectedEntities.length} entities`;
        showNotification(message, 'success');
        
        // Clear the selection after operation is complete
        clearSelection();
    })
    .catch(error => {
        console.error('Error applying batch changes:', error);
        showNotification('Error applying batch changes', 'error');
    })
    .finally(() => {
        // Hide processing indicator
        document.getElementById('batch-operation-spinner').style.display = 'none';
    });
}

/**
 * Get text description for operation type
 */
function getOperationText(operation) {
    switch(operation) {
        case 'add':
            return 'added tag';
        case 'remove':
            return 'removed tag';
        case 'clear':
            return 'cleared all tags';
        default:
            return 'updated tags';
    }
}

/**
 * Update local entity tags based on batch operation
 */
function updateLocalEntityTags(operation, tagValue, entityIds) {
    entityIds.forEach(entityId => {
        if (!entityTags[entityId]) {
            entityTags[entityId] = [];
        }
        
        switch(operation) {
            case 'add':
                if (!entityTags[entityId].includes(tagValue)) {
                    entityTags[entityId].push(tagValue);
                }
                break;
                
            case 'remove':
                entityTags[entityId] = entityTags[entityId].filter(tag => tag !== tagValue);
                break;
                
            case 'clear':
                entityTags[entityId] = [];
                break;
        }
    });
}

/**
 * Get array of selected entity IDs
 */
function getSelectedEntities() {
    const selectedRows = document.querySelectorAll('.entity-row.selected');
    return Array.from(selectedRows).map(row => row.getAttribute('data-entity-id'));
}

/**
 * Clear all entity selections
 */
function clearSelection() {
    document.querySelectorAll('.entity-row.selected').forEach(row => {
        row.classList.remove('selected');
    });
    
    updateSelectionCount();
}

/**
 * Update the selection counter
 */
function updateSelectionCount() {
    const selectedCount = document.querySelectorAll('.entity-row.selected').length;
    const totalCount = document.querySelectorAll('.entity-row:not(.filtered-out)').length;
    
    const countElement = document.getElementById('selection-count');
    if (countElement) {
        countElement.textContent = `${selectedCount} of ${totalCount} selected`;
        
        // Show/hide batch operations based on selection
        const batchOpsContainer = document.getElementById('batch-operations-container');
        if (batchOpsContainer) {
            batchOpsContainer.style.display = selectedCount > 0 ? 'block' : 'none';
        }
    }
}

/**
 * Toggle selection for an entity row
 */
function toggleEntitySelection(row) {
    row.classList.toggle('selected');
    updateSelectionCount();
}

/**
 * Toggle selection for all visible entities
 */
function toggleSelectAllVisible() {
    const visibleRows = document.querySelectorAll('.entity-row:not(.filtered-out)');
    
    // Check if all visible rows are already selected
    const allSelected = Array.from(visibleRows).every(row => row.classList.contains('selected'));
    
    // Toggle selection based on current state
    visibleRows.forEach(row => {
        if (allSelected) {
            row.classList.remove('selected');
        } else {
            row.classList.add('selected');
        }
    });
    
    updateSelectionCount();
    
    // Update the select all button text
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.textContent = allSelected ? 'Select All Visible' : 'Deselect All';
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Auto-hide after a few seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

/**
 * Get entity name from entity object
 */
function getEntityName(entity) {
    return entity.attributes?.friendly_name || entity.entity_id;
}

/**
 * Filter entities based on tag expression
 */
function filterEntitiesByTags() {
    const filterExpression = document.getElementById('tag-filter-input').value.trim();
    currentTagFilter = filterExpression;
    
    // If expression is empty, show all entities
    if (!filterExpression) {
        document.querySelectorAll('.entity-row').forEach(row => {
            row.classList.remove('filtered-out');
            row.style.display = '';
        });
        updateFilterStats();
        return;
    }
    
    try {
        // Update the input field style based on expression validity
        const isValid = isValidTagExpression(filterExpression);
        const filterInput = document.getElementById('tag-filter-input');
        
        if (isValid) {
            filterInput.classList.remove('invalid-expression');
            filterInput.classList.add('valid-expression');
        } else {
            filterInput.classList.remove('valid-expression');
            filterInput.classList.add('invalid-expression');
            // If invalid, don't proceed with filtering
            return;
        }
        
        // Apply the filter to each entity
        document.querySelectorAll('.entity-row').forEach(row => {
            const entityId = row.getAttribute('data-entity-id');
            const entityTagsList = entityTags[entityId] || [];
            
            // Test if this entity passes the filter
            const passesFilter = testTagExpression(filterExpression, entityTagsList);
            
            if (passesFilter) {
                row.classList.remove('filtered-out');
                row.style.display = '';
            } else {
                row.classList.add('filtered-out');
                row.style.display = 'none';
            }
        });
        
        updateFilterStats();
    } catch (error) {
        console.error('Error filtering entities:', error);
    }
}

/**
 * Update filter statistics
 */
function updateFilterStats() {
    const totalEntities = document.querySelectorAll('.entity-row').length;
    const visibleEntities = document.querySelectorAll('.entity-row:not(.filtered-out)').length;
    const filteredOutCount = totalEntities - visibleEntities;
    
    const statsElement = document.getElementById('filter-stats');
    if (statsElement) {
        statsElement.textContent = `Showing ${visibleEntities} of ${totalEntities} entities`;
        statsElement.style.display = 'block';
    }
    
    // Update the clear filter button visibility
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) {
        if (currentTagFilter) {
            clearFilterBtn.style.display = 'inline-block';
        } else {
            clearFilterBtn.style.display = 'none';
        }
    }
}

/**
 * Clear the tag filter
 */
function clearTagFilter() {
    const filterInput = document.getElementById('tag-filter-input');
    filterInput.value = '';
    filterInput.classList.remove('invalid-expression', 'valid-expression');
    currentTagFilter = '';
    
    // Show all entities
    document.querySelectorAll('.entity-row').forEach(row => {
        row.classList.remove('filtered-out');
        row.style.display = '';
    });
    
    updateFilterStats();
}

/**
 * Check if a tag expression is valid
 */
function isValidTagExpression(expression) {
    if (!expression || expression.trim() === '') return true;
    
    try {
        // Basic validation for parentheses matching
        let parenCount = 0;
        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === '(') parenCount++;
            if (expression[i] === ')') parenCount--;
            if (parenCount < 0) return false; // Mismatched parentheses
        }
        if (parenCount !== 0) return false; // Unmatched parentheses
        
        // Check for invalid operators
        const invalidSequences = ['&&&&', '||||', '!&', '!|', '&|', '|&'];
        for (const seq of invalidSequences) {
            if (expression.includes(seq)) return false;
        }
        
        // More comprehensive validation could be added here
        
        return true;
    } catch (e) {
        console.error('Error validating expression:', e);
        return false;
    }
}

/**
 * Test if tags match an expression
 */
function testTagExpression(expression, tagsList) {
    // Handle empty expression (always matches)
    if (!expression || expression.trim() === '') return true;
    
    try {
        // Convert tags list to a Set for faster lookups
        const tagsSet = new Set(tagsList);
        
        // Process the expression
        // This is a simplified version - for complex expressions, consider a proper parser
        const normalizedExpr = expression
            .replace(/\s*&&\s*/g, ' && ') // Normalize AND operators
            .replace(/\s*\|\|\s*/g, ' || ') // Normalize OR operators
            .replace(/\s*!\s*/g, '!') // Normalize NOT operator
            .replace(/\(\s*/g, '(') // Remove spaces after opening parenthesis
            .replace(/\s*\)/g, ')'); // Remove spaces before closing parenthesis
        
        // Simple expressions without logical operators
        if (!normalizedExpr.includes('&&') && 
            !normalizedExpr.includes('||') && 
            !normalizedExpr.startsWith('!')) {
            return tagsSet.has(normalizedExpr);
        }
        
        // For simple NOT expression
        if (normalizedExpr.startsWith('!') && 
            !normalizedExpr.includes('&&') && 
            !normalizedExpr.includes('||')) {
            const tagName = normalizedExpr.substring(1);
            return !tagsSet.has(tagName);
        }
        
        // For more complex expressions, we'll use a simplified evaluation approach
        // Note: A production implementation would use a proper expression parser
        let result;
        
        // Replace tag names with true/false based on whether they exist in the entity's tags
        const evalExpr = normalizedExpr.replace(/[a-zA-Z0-9_-]+/g, (match) => {
            // Skip if it's one of our operators
            if (match === 'true' || match === 'false') return match;
            return tagsSet.has(match) ? 'true' : 'false';
        });
        
        // Perform the evaluation (use with caution - for production consider a safer approach)
        // This is vulnerable to injection if user input isn't properly sanitized
        try {
            // Use Function constructor instead of eval for slightly better safety
            result = new Function(`return ${evalExpr}`)();
            return !!result;
        } catch (e) {
            console.error('Error evaluating tag expression:', e);
            return false;
        }
    } catch (error) {
        console.error('Error testing tag expression:', error);
        return false;
    }
}

/**
 * Run tag expression test
 */
function runExpressionTest() {
    const expression = document.getElementById('expression-input').value.trim();
    const tagsInput = document.getElementById('test-tags-input').value.trim();
    const resultContainer = document.getElementById('expression-test-result');
    
    if (!expression) {
        resultContainer.textContent = 'Please enter a tag expression to test';
        resultContainer.className = 'test-result warning';
        return;
    }
    
    // Parse tags (comma separated)
    const tags = tagsInput.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
    
    try {
        // Validate the expression first
        const isValid = isValidTagExpression(expression);
        if (!isValid) {
            resultContainer.textContent = 'Invalid expression format';
            resultContainer.className = 'test-result error';
            return;
        }
        
        // Test the expression against the provided tags
        const result = testTagExpression(expression, tags);
        
        // Show the result
        resultContainer.textContent = result ? 'MATCH' : 'NO MATCH';
        resultContainer.className = `test-result ${result ? 'success' : 'info'}`;
    } catch (error) {
        resultContainer.textContent = `Error: ${error.message}`;
        resultContainer.className = 'test-result error';
    }
}

/**
 * Filter entities based on user-defined criteria
 */
function filterEntities() {
    const filterText = document.getElementById('entity-filter').value.toLowerCase();
    const filterTagExpr = document.getElementById('tag-filter').value.trim();
    const domainFilter = document.getElementById('domain-filter').value;
    
    const rows = document.querySelectorAll('.entity-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const entityId = row.getAttribute('data-entity-id').toLowerCase();
        const friendlyName = row.getAttribute('data-friendly-name').toLowerCase();
        const domain = entityId.split('.')[0];
        const tags = entityTags[entityId] || [];
        
        // Apply domain filter
        const domainMatch = domainFilter === 'all' || domain === domainFilter;
        
        // Apply text filter
        const textMatch = filterText === '' || 
            entityId.includes(filterText) || 
            friendlyName.includes(filterText);
            
        // Apply tag expression filter
        const tagMatch = !filterTagExpr || evaluateTagExpression(filterTagExpr, tags);
        
        // Show/hide based on all filters
        if (domainMatch && textMatch && tagMatch) {
            row.classList.remove('filtered-out');
            visibleCount++;
        } else {
            row.classList.remove('selected'); // Deselect filtered out entities
            row.classList.add('filtered-out');
        }
    });
    
    // Update filter summary
    const summaryElement = document.getElementById('filter-summary');
    if (summaryElement) {
        summaryElement.textContent = `${visibleCount} entities matching filters`;
    }
    
    updateSelectionCount();
}

/**
 * Evaluate a tag expression against an entity's tags
 * Supports: tag1 (has tag), !tag1 (doesn't have tag), 
 * tag1&tag2 (has both), tag1|tag2 (has either)
 */
function evaluateTagExpression(expression, entityTags) {
    if (!expression) return true;
    
    // Handle empty tag array
    if (!entityTags || entityTags.length === 0) {
        // If expression checks for absence of tags with ! operator
        if (expression.startsWith('!')) return true;
        return false;
    }
    
    // Handle basic expressions
    if (!expression.includes('&') && !expression.includes('|')) {
        // Single tag expression
        if (expression.startsWith('!')) {
            // NOT operator
            const tag = expression.substring(1);
            return !entityTags.includes(tag);
        } else {
            // Simple tag presence
            return entityTags.includes(expression);
        }
    }
    
    // Handle AND operator
    if (expression.includes('&')) {
        const subExpressions = expression.split('&');
        return subExpressions.every(subExpr => 
            evaluateTagExpression(subExpr.trim(), entityTags)
        );
    }
    
    // Handle OR operator
    if (expression.includes('|')) {
        const subExpressions = expression.split('|');
        return subExpressions.some(subExpr => 
            evaluateTagExpression(subExpr.trim(), entityTags)
        );
    }
    
    return false;
}

/**
 * Test tag expression against a sample entity
 */
function testTagExpression() {
    const expressionInput = document.getElementById('test-tag-expression');
    const expression = expressionInput.value.trim();
    const sampleTags = document.getElementById('test-sample-tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    let result;
    let explanation;
    
    if (!expression) {
        result = true;
        explanation = 'Empty expression always matches';
    } else {
        try {
            result = evaluateTagExpression(expression, sampleTags);
            explanation = result 
                ? 'Expression matches the sample tags' 
                : 'Expression does not match the sample tags';
        } catch (error) {
            result = false;
            explanation = `Error evaluating expression: ${error.message}`;
        }
    }
    
    // Display result
    const resultElement = document.getElementById('test-result');
    const explanationElement = document.getElementById('test-explanation');
    
    resultElement.textContent = result ? 'MATCH' : 'NO MATCH';
    resultElement.className = result ? 'match-result success' : 'match-result error';
    explanationElement.textContent = explanation;
    
    // Show the result container
    document.getElementById('test-result-container').style.display = 'block';
}

/**
 * Reset all filters to default values
 */
function resetFilters() {
    document.getElementById('entity-filter').value = '';
    document.getElementById('tag-filter').value = '';
    document.getElementById('domain-filter').value = 'all';
    
    filterEntities();
    
    // Update filter button state
    const filterButton = document.getElementById('filter-button');
    if (filterButton) {
        filterButton.classList.remove('active-filter');
    }
}

/**
 * Initialize tab navigation for the tag manager interface
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Set first tab as active by default if none is active
    let hasActiveTab = false;
    tabs.forEach(tab => {
        if (tab.classList.contains('active')) {
            hasActiveTab = true;
        }
    });
    
    if (!hasActiveTab && tabs.length > 0) {
        tabs[0].classList.add('active');
        const targetId = tabs[0].getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    }
    
    // Add click handlers for tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and its content
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

/**
 * Add event listeners for the tag manager interface
 */
function addEventListeners() {
    // Entity filtering
    const entityFilter = document.getElementById('entity-filter');
    if (entityFilter) {
        entityFilter.addEventListener('input', filterEntities);
    }
    
    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
        tagFilter.addEventListener('input', filterEntities);
    }
    
    const domainFilter = document.getElementById('domain-filter');
    if (domainFilter) {
        domainFilter.addEventListener('change', filterEntities);
    }
    
    // Filter reset button
    const resetFilterButton = document.getElementById('reset-filters');
    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', resetFilters);
    }
    
    // Tag expression testing
    const testExpressionButton = document.getElementById('test-expression-button');
    if (testExpressionButton) {
        testExpressionButton.addEventListener('click', testTagExpression);
    }
    
    // Batch operations
    const selectAllButton = document.getElementById('select-all');
    if (selectAllButton) {
        selectAllButton.addEventListener('click', function() {
            toggleSelectAllVisible(true);
        });
    }
    
    const selectNoneButton = document.getElementById('select-none');
    if (selectNoneButton) {
        selectNoneButton.addEventListener('click', function() {
            toggleSelectAllVisible(false);
        });
    }
    
    // Batch operation apply button
    const applyBatchButton = document.getElementById('apply-batch');
    if (applyBatchButton) {
        applyBatchButton.addEventListener('click', applyBatchChanges);
    }
    
    // Setup individual entity row click handlers
    setupEntityRows();
}

/**
 * Setup click handlers for entity rows
 */
function setupEntityRows() {
    const entityRows = document.querySelectorAll('.entity-row');
    
    entityRows.forEach(row => {
        // Setup tag management for this row
        const entityId = row.getAttribute('data-entity-id');
        
        // Add click handler for the checkbox
        const checkbox = row.querySelector('.entity-select');
        if (checkbox) {
            checkbox.addEventListener('change', updateSelectionCount);
        }
        
        // Add click handler for the row (select when clicked)
        row.addEventListener('click', function(e) {
            // Don't trigger if they clicked on specific elements
            if (e.target.classList.contains('entity-tag') || 
                e.target.classList.contains('tag-input') ||
                e.target.classList.contains('add-tag-button') ||
                e.target.tagName === 'INPUT') {
                return;
            }
            
            // Toggle the checkbox
            const checkbox = this.querySelector('.entity-select');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                updateSelectionCount();
            }
        });
        
        // Setup tag input and add button for this entity
        const addTagInput = row.querySelector('.tag-input');
        const addTagButton = row.querySelector('.add-tag-button');
        
        if (addTagInput && addTagButton) {
            // Handle Enter key in the input field
            addTagInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagToEntity(entityId, this.value);
                    this.value = '';
                }
            });
            
            // Handle Add button click
            addTagButton.addEventListener('click', function() {
                const input = row.querySelector('.tag-input');
                if (input) {
                    addTagToEntity(entityId, input.value);
                    input.value = '';
                }
            });
        }
        
        // Setup click handlers for existing tags (for removal)
        const tagElements = row.querySelectorAll('.entity-tag');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', function() {
                const tagName = this.getAttribute('data-tag');
                removeTagFromEntity(entityId, tagName);
            });
        });
    });
}

/**
 * Initialize the tag manager interface
 */
function initTagManager() {
    // Initialize tabs
    initTabs();
    
    // Add event listeners
    addEventListeners();
    
    // Initial filter setup
    filterEntities();
    
    // Initialize selection count
    updateSelectionCount();
    
    console.log('Tag Manager interface initialized');
}

// Initialize when document is fully loaded
document.addEventListener('DOMContentLoaded', initTagManager);

/**
 * Create the advanced filter UI if it doesn't exist in the DOM
 */
function createAdvancedFilterUI() {
    // Check if the filter section already exists
    if (document.getElementById('advanced-tag-filter-section')) {
        return;
    }
    
    // Create the filter section
    const filterSection = document.createElement('div');
    filterSection.id = 'advanced-tag-filter-section';
    filterSection.className = 'filter-section';
    
    filterSection.innerHTML = `
        <div class="filter-header">
            <h4>Advanced Tag Filter</h4>
            <button id="clear-filter-btn" class="secondary-button" title="Clear filter">
                <i class="mdi mdi-close"></i> Clear
            </button>
        </div>
        <div class="filter-body">
            <div class="input-group">
                <input type="text" id="tag-filter-input" placeholder="Enter tag expression (e.g. user:john+area:home)">
                <button id="filter-help-btn" class="icon-button" title="Filter help">
                    <i class="mdi mdi-help-circle-outline"></i>
                </button>
            </div>
            <div id="filter-stats" class="filter-stats"></div>
            <div class="tag-suggestions filter-suggestions">
                <span class="suggestion-label">Common filters:</span>
                <span class="tag-suggestion" data-tag="user:">user:</span>
                <span class="tag-suggestion" data-tag="area:">area:</span>
                <span class="tag-suggestion" data-tag="device:">device:</span>
                <span class="tag-suggestion" data-tag="priority:">priority:</span>
            </div>
        </div>
    `;
    
    // Insert the filter section into the DOM at the appropriate location
    const entityListContainer = document.querySelector('.entity-list-container');
    if (entityListContainer) {
        entityListContainer.insertBefore(filterSection, entityListContainer.firstChild);
    } else {
        // Fallback to adding to the main container
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.insertBefore(filterSection, mainContainer.querySelector('.entity-categories'));
        }
    }
    
    // Initialize event listeners for the filter components
    document.getElementById('tag-filter-input').addEventListener('input', filterEntitiesByTags);
    document.getElementById('clear-filter-btn').addEventListener('click', clearTagFilter);
    document.getElementById('filter-help-btn').addEventListener('click', showFilterHelp);
    
    // Setup tag suggestion click handlers
    const tagSuggestions = document.querySelectorAll('#advanced-tag-filter-section .tag-suggestion');
    tagSuggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const filterInput = document.getElementById('tag-filter-input');
            const cursorPos = filterInput.selectionStart;
            const currentText = filterInput.value;
            const suggestionText = suggestion.dataset.tag;
            
            // Insert the tag at cursor position
            const newText = currentText.substring(0, cursorPos) + suggestionText + 
                currentText.substring(cursorPos);
                
            filterInput.value = newText;
            filterInput.focus();
            filterInput.setSelectionRange(cursorPos + suggestionText.length, 
                cursorPos + suggestionText.length);
            
            // Trigger filter to update
            filterEntitiesByTags();
        });
    });
}

/**
 * Extract all available tags from entities for suggestions and filters
 */
function extractAvailableTags() {
    const tagsSet = new Set();
    
    // Extract from entity tags
    Object.values(entityTags).forEach(tags => {
        tags.forEach(tag => tagsSet.add(tag));
    });
    
    // Sort alphabetically
    availableTags = Array.from(tagsSet).sort();
    
    // Update tag suggestions in the UI
    updateTagSuggestions();
    
    console.log(`Extracted ${availableTags.length} unique tags from entities`);
}

/**
 * Update tag suggestions UI based on available tags
 */
function updateTagSuggestions() {
    const suggestionContainers = document.querySelectorAll('.tag-suggestions');
    
    suggestionContainers.forEach(container => {
        // Keep the first few suggestions (common categories) and the suggestion label
        const staticElements = Array.from(container.children).filter(
            el => el.classList.contains('suggestion-label') || 
                 (el.dataset.tag && el.dataset.tag.endsWith(':'))
        );
        
        // Clear existing suggestions except static elements
        container.innerHTML = '';
        
        // Add back static elements
        staticElements.forEach(el => container.appendChild(el));
        
        // Extract tag categories (everything before :)
        const categories = new Set();
        availableTags.forEach(tag => {
            if (tag.includes(':')) {
                const category = tag.split(':')[0];
                categories.add(category + ':');
            }
        });
        
        // Add category suggestions first (if not already in static elements)
        Array.from(categories)
            .sort()
            .slice(0, 8) // Limit to 8 categories
            .forEach(category => {
                if (!staticElements.some(el => el.dataset && el.dataset.tag === category)) {
                    const suggestion = document.createElement('span');
                    suggestion.className = 'tag-suggestion';
                    suggestion.dataset.tag = category;
                    suggestion.textContent = category;
                    container.appendChild(suggestion);
                }
            });
            
        // Add recently used tags
        recentlyUsedTags.slice(0, 5).forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion recent';
            suggestion.dataset.tag = tag;
            suggestion.textContent = tag;
            container.appendChild(suggestion);
        });
        
        // Add some popular full tags
        const popularTags = getPopularTags(5);
        popularTags.forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion popular';
            suggestion.dataset.tag = tag;
            suggestion.textContent = tag;
            container.appendChild(suggestion);
        });
    });
    
    // Reinitialize event listeners for new suggestions
    initTagSuggestionListeners();
}

/**
 * Get popular tags based on usage frequency
 */
function getPopularTags(limit = 5) {
    const tagCounts = {};
    
    // Count occurrences of each tag
    Object.values(entityTags).forEach(tags => {
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    // Sort by frequency
    return Object.keys(tagCounts)
        .sort((a, b) => tagCounts[b] - tagCounts[a])
        .slice(0, limit);
}

/**
 * Initialize event listeners for tag suggestions
 */
function initTagSuggestionListeners() {
    const tagSuggestions = document.querySelectorAll('.tag-suggestion');
    
    tagSuggestions.forEach(suggestion => {
        // Remove existing event listener if any
        const newSuggestion = suggestion.cloneNode(true);
        suggestion.parentNode.replaceChild(newSuggestion, suggestion);
        
        // Add new event listener
        newSuggestion.addEventListener('click', () => {
            const isFilterSuggestion = newSuggestion.closest('.filter-suggestions');
            
            if (isFilterSuggestion) {
                // Handle filter suggestion click
                const filterInput = document.getElementById('tag-filter-input');
                if (filterInput) {
                    const cursorPos = filterInput.selectionStart;
                    const currentText = filterInput.value;
                    const suggestionText = newSuggestion.dataset.tag;
                    
                    // Insert the tag at cursor position
                    const newText = currentText.substring(0, cursorPos) + suggestionText + 
                        currentText.substring(cursorPos);
                        
                    filterInput.value = newText;
                    filterInput.focus();
                    filterInput.setSelectionRange(cursorPos + suggestionText.length, 
                        cursorPos + suggestionText.length);
                    
                    // Trigger filter to update
                    filterEntitiesByTags();
                }
            } else {
                // Handle regular tag suggestion click
                document.getElementById('tag-input').value = newSuggestion.dataset.tag;
                document.getElementById('tag-input').focus();
            }
        });
    });
}

/**
 * Show help for the tag filter
 */
function showFilterHelp() {
    const helpText = `Advanced Tag Filter Help:

You can filter entities based on their tags using expressions.

Basic operators:
+ (AND) - Entities must have both tags (user:john+device:mobile)
| (OR) - Entities must have either tag (area:home|area:office)
- (NOT) - Exclude entities with tag (area:home-area:bedroom)

Example expressions:
user:john+device:mobile - John's mobile devices
area:home-area:bedroom - Home devices excluding bedroom
device:speaker|device:display - All speakers and displays

You can combine operators with parentheses for more complex expressions.`;

    alert(helpText);
}

/**
 * Show a notification message
 * @param {string} message The message to display
 * @param {string} type The type of notification (success, warning, error, info)
 * @param {number} duration Duration in ms before auto-hiding (0 for permanent)
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Look for existing notification container
    let notificationContainer = document.getElementById('notification-container');
    
    // Create container if it doesn't exist
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-message">${message}</div>
        <button class="notification-close">×</button>
    `;
    
    // Add dismiss button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
            notification.remove();
        }, 300); // Animation duration
    });
    
    // Auto dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            // Only dismiss if the notification is still in the DOM
            if (notification.parentNode) {
                notification.classList.add('notification-hiding');
                setTimeout(() => {
                    notification.remove();
                }, 300); // Animation duration
            }
        }, duration);
    }
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Trigger show animation
    setTimeout(() => {
        notification.classList.add('notification-visible');
    }, 10);
    
    return notification;
}

/**
 * Filter entities by advanced tag criteria
 */
function advancedTagFilter() {
    const tagFilterInput = document.getElementById('tag-filter-input');
    const filterValue = tagFilterInput.value.trim().toLowerCase();
    currentTagFilter = filterValue;
    
    // Get filter mode from dropdown
    const filterModeSelect = document.getElementById('tag-filter-mode');
    if (filterModeSelect) {
        tagFilterMode = filterModeSelect.value;
    }
    
    // Apply filters
    applyFilters();
    
    // Update UI to show active filter
    updateActiveFilterDisplay(filterValue);
}

/**
 * Update the active filter display in the UI
 */
function updateActiveFilterDisplay(filterValue) {
    const activeFilterDisplay = document.getElementById('active-filter-display');
    if (!activeFilterDisplay) return;
    
    if (filterValue) {
        let displayText = `Active filter: ${tagFilterMode} "${filterValue}"`;
        activeFilterDisplay.textContent = displayText;
        activeFilterDisplay.style.display = 'block';
        
        // Show clear button
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn) {
            clearFilterBtn.style.display = 'inline-flex';
        }
    } else {
        activeFilterDisplay.style.display = 'none';
        
        // Hide clear button
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn) {
            clearFilterBtn.style.display = 'none';
        }
    }
}

/**
 * Apply tag filter based on the selected mode
 */
function matchesTagFilter(entityId) {
    if (!currentTagFilter) return true;
    
    const tags = entityTags[entityId] || [];
    
    switch (tagFilterMode) {
        case 'exact':
            return tags.some(tag => tag.toLowerCase() === currentTagFilter.toLowerCase());
        
        case 'startsWith':
            return tags.some(tag => tag.toLowerCase().startsWith(currentTagFilter.toLowerCase()));
        
        case 'endsWith':
            return tags.some(tag => tag.toLowerCase().endsWith(currentTagFilter.toLowerCase()));
        
        case 'category':
            // Filter by tag category (prefix before ':')
            const category = currentTagFilter.toLowerCase();
            return tags.some(tag => {
                const parts = tag.toLowerCase().split(':');
                return parts.length > 1 && parts[0] === category;
            });
        
        case 'contains':
        default:
            return tags.some(tag => tag.toLowerCase().includes(currentTagFilter.toLowerCase()));
    }
}

/**
 * Enhanced entity filter that combines all filtering criteria
 */
function enhancedFilterEntities() {
    const searchInput = document.getElementById('entity-search').value.toLowerCase();
    const tagFilterInput = currentTagFilter.toLowerCase();
    searchQuery = searchInput;
    
    // Get domain filter if available
    let domainFilter = 'all';
    const domainSelect = document.getElementById('domain-filter');
    if (domainSelect) {
        domainFilter = domainSelect.value;
    }
    
    // Apply filters to entities
    const entityRows = document.querySelectorAll('.entity-row');
    let visibleCount = 0;
    
    entityRows.forEach(row => {
        const entityId = row.dataset.entityId;
        const domain = entityId.split('.')[0];
        const entityName = row.dataset.name.toLowerCase();
        const tags = entityTags[entityId] || [];
        
        // Check if the entity matches all filter criteria
        const matchesDomain = domainFilter === 'all' || domain === domainFilter;
        const matchesSearch = !searchQuery || 
                              entityId.toLowerCase().includes(searchQuery) || 
                              entityName.includes(searchQuery);
        const matchesTags = matchesTagFilter(entityId);
        const matchesFilter = currentFilter === 'all' || 
                              (currentFilter === 'tagged' && tags.length > 0) || 
                              (currentFilter === 'untagged' && tags.length === 0);
        
        // Show/hide based on combined criteria
        if (matchesDomain && matchesSearch && matchesTags && matchesFilter) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update visible count
    const countDisplay = document.getElementById('entity-count');
    if (countDisplay) {
        countDisplay.textContent = `${visibleCount} of ${entities.length} entities`;
    }
    
    // Update selected count for batch operations
    updateSelectionCount();
}

/**
 * Clear all tag filters
 */
function clearTagFilter() {
    const tagFilterInput = document.getElementById('tag-filter-input');
    if (tagFilterInput) {
        tagFilterInput.value = '';
    }
    
    const filterModeSelect = document.getElementById('tag-filter-mode');
    if (filterModeSelect) {
        filterModeSelect.value = 'contains';
    }
    
    currentTagFilter = '';
    tagFilterMode = 'contains';
    
    // Hide active filter display
    const activeFilterDisplay = document.getElementById('active-filter-display');
    if (activeFilterDisplay) {
        activeFilterDisplay.style.display = 'none';
    }
    
    // Hide clear button
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) {
        clearFilterBtn.style.display = 'none';
    }
    
    // Reapply filters
    applyFilters();
}

/**
 * Create the advanced filter UI
 */
function createAdvancedFilterUI() {
    // Create container for advanced filter controls if it doesn't exist
    let filterControls = document.querySelector('.filter-controls');
    
    if (!filterControls) {
        filterControls = document.createElement('div');
        filterControls.className = 'filter-controls';
        
        // Insert after tag-filter-container
        const tagFilterContainer = document.querySelector('.tag-filter-container');
        if (tagFilterContainer) {
            tagFilterContainer.insertAdjacentElement('afterend', filterControls);
        }
    }
    
    // Create filter mode selector if it doesn't exist
    if (!document.getElementById('tag-filter-mode')) {
        const modeSelector = document.createElement('select');
        modeSelector.id = 'tag-filter-mode';
        modeSelector.className = 'tag-filter-mode';
        
        const modes = [
            { value: 'contains', label: 'Contains tag' },
            { value: 'exact', label: 'Exact tag match' },
            { value: 'startsWith', label: 'Starts with' },
            { value: 'endsWith', label: 'Ends with' }
        ];
        
        modes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.value;
            option.textContent = mode.label;
            modeSelector.appendChild(option);
        });
        
        // Add event listener
        modeSelector.addEventListener('change', advancedTagFilter);
        
        // Create label
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Match mode:';
        modeLabel.htmlFor = 'tag-filter-mode';
        
        // Create container
        const modeContainer = document.createElement('div');
        modeContainer.className = 'filter-control-group';
        modeContainer.appendChild(modeLabel);
        modeContainer.appendChild(modeSelector);
        
        filterControls.appendChild(modeContainer);
    }
    
    // Create category filter buttons if they don't exist
    if (!document.querySelector('.category-filters')) {
        const categories = [
            { id: 'user', label: 'User' },
            { id: 'area', label: 'Area' },
            { id: 'device', label: 'Device' },
            { id: 'priority', label: 'Priority' }
        ];
        
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-filters';
        
        // Create label
        const catLabel = document.createElement('div');
        catLabel.className = 'filter-label';
        catLabel.textContent = 'Filter by category:';
        categoryContainer.appendChild(catLabel);
        
        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'category-buttons';
        
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'category-filter-btn';
            button.dataset.category = cat.id;
            button.textContent = cat.label;
            
            // Add event listener
            button.addEventListener('click', function() {
                // Toggle active state
                this.classList.toggle('active');
                
                // Update category filters
                if (this.classList.contains('active')) {
                    tagCategoryFilters[cat.id] = true;
                } else {
                    delete tagCategoryFilters[cat.id];
                }
                
                // Apply filter
                advancedTagFilter();
            });
            
            buttonContainer.appendChild(button);
        });
        
        categoryContainer.appendChild(buttonContainer);
        filterControls.appendChild(categoryContainer);
    }
}

/**
 * Enhanced entity filtering with advanced options
 */
function enhancedFilterEntities() {
    const entityItems = document.querySelectorAll('.entity-category-items .entity-item');
    
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
        
        // Apply tag filter with advanced options
        let tagFilterMatch = true;
        if (currentTagFilter) {
            tagFilterMatch = applyAdvancedTagFiltering(tags, currentTagFilter);
        }
        
        // Apply category filters
        let categoryMatch = true;
        if (Object.keys(tagCategoryFilters).length > 0) {
            categoryMatch = applyCategoryFilters(tags);
        }
        
        // Show/hide item based on all filters
        if (typeMatch && tagMatch && searchMatch && tagFilterMatch && categoryMatch) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show/hide "no results" message
    updateNoResultsMessage();
}

/**
 * Apply advanced tag filtering based on filter mode
 * @param {Array} tags Array of entity tags
 * @param {string} filterText Text to filter by
 * @returns {boolean} Whether the entity matches the filter
 */
function applyAdvancedTagFiltering(tags, filterText) {
    // For empty tags array, no match
    if (tags.length === 0) return false;
    
    // Get current filter mode
    const mode = document.getElementById('tag-filter-mode')?.value || tagFilterMode;
    
    // Support multiple tag filters separated by comma or space
    const filterTerms = filterText.toLowerCase().split(/[\s,]+/).filter(term => term.trim() !== '');
    
    // For AND logic, all terms must match at least one tag
    for (const term of filterTerms) {
        let termMatched = false;
        
        for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            
            if (mode === 'contains') {
                if (tagLower.includes(term)) {
                    termMatched = true;
                    break;
                }
            } else if (mode === 'exact') {
                if (tagLower === term) {
                    termMatched = true;
                    break;
                }
            } else if (mode === 'startsWith') {
                if (tagLower.startsWith(term)) {
                    termMatched = true;
                    break;
                }
            } else if (mode === 'endsWith') {
                if (tagLower.endsWith(term)) {
                    termMatched = true;
                    break;
                }
            }
        }
        
        // If any term doesn't match any tag, return false
        if (!termMatched) return false;
    }
    
    return true;
}

/**
 * Apply category filters to an entity's tags
 * @param {Array} tags Array of entity tags
 * @returns {boolean} Whether the entity matches the category filters
 */
function applyCategoryFilters(tags) {
    // If no category filters, return true
    if (Object.keys(tagCategoryFilters).length === 0) return true;
    
    // For empty tags array, no match
    if (tags.length === 0) return false;
    
    // Check if entity has any tag in the selected categories
    for (const category in tagCategoryFilters) {
        let categoryFound = false;
        
        for (const tag of tags) {
            if (tag.startsWith(`${category}:`)) {
                categoryFound = true;
                break;
            }
        }
        
        // If any selected category isn't found, return false
        if (!categoryFound) return false;
    }
    
    return true;
}

/**
 * Advanced tag filtering based on input and mode
 */
function advancedTagFilter() {
    const filterInput = document.getElementById('tag-filter-input');
    currentTagFilter = filterInput.value.trim();
    
    // Update filter mode from selector if it exists
    const modeSelector = document.getElementById('tag-filter-mode');
    if (modeSelector) {
        tagFilterMode = modeSelector.value;
    }
    
    // Apply filters
    enhancedFilterEntities();
}

/**
 * Clear tag filter
 */
function clearTagFilter() {
    // Clear input
    document.getElementById('tag-filter-input').value = '';
    currentTagFilter = '';
    
    // Reset filter mode
    const modeSelector = document.getElementById('tag-filter-mode');
    if (modeSelector) {
        modeSelector.value = 'contains';
        tagFilterMode = 'contains';
    }
    
    // Clear category filters
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    tagCategoryFilters = {};
    
    // Apply filters
    enhancedFilterEntities();
}

/**
 * Update "no results" message
 */
function updateNoResultsMessage() {
    const entityCategories = document.querySelectorAll('.entity-category');
    
    entityCategories.forEach(category => {
        const items = category.querySelectorAll('.entity-item[style="display: flex;"]');
        const noResultsMsg = category.querySelector('.no-results');
        
        if (items.length === 0) {
            // Create "no results" message if it doesn't exist
            if (!noResultsMsg) {
                const message = document.createElement('div');
                message.className = 'no-results';
                message.textContent = 'No entities match the current filters';
                
                const itemsContainer = category.querySelector('.entity-category-items');
                itemsContainer.appendChild(message);
            }
        } else {
            // Remove "no results" message if it exists
            if (noResultsMsg) {
                noResultsMsg.remove();
            }
        }
    });
}