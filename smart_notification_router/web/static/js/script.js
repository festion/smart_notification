/**
 * Smart Notification Router Dashboard Script
 * 
 * This script handles all UI interactions for the Smart Notification Router dashboard,
 * including navigation, user preferences, test notifications, and configuration.
 */

// Set a global flag to indicate the script loaded
window.scriptLoaded = true;

// Log script load immediately
console.log('Script file loaded - v2.0.0-alpha.25');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Smart Notification Dashboard loaded');
    
    // EMERGENCY FIX: Force UI visibility and styles
    document.documentElement.classList.add('force-visibility');
    
    // Add debug outline toggle
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+O to toggle outlines for debugging
        if (e.ctrlKey && e.shiftKey && e.key === 'O') {
            document.body.classList.toggle('debug-outline');
            console.log('Debug outlines toggled');
        }
    });
    
    // Force all sections to be visible initially
    document.querySelectorAll('.dashboard-section').forEach(function(section) {
        console.log('Found section:', section);
        section.style.display = 'block';
        section.style.opacity = '1';
        section.style.visibility = 'visible';
    });
    
    try {
        // Initialize all UI components with error handling
        console.log('Starting to initialize UI components');
        
        try { initUserContext(); console.log('✓ User context initialized'); } 
        catch (e) { console.error('Failed to init user context:', e); }
        
        try { initStatusChecking(); console.log('✓ Status checking initialized'); } 
        catch (e) { console.error('Failed to init status checking:', e); }
        
        try { initTestNotification(); console.log('✓ Test notification initialized'); } 
        catch (e) { console.error('Failed to init test notification:', e); }
        
        try { initAudiencesUI(); console.log('✓ Audiences UI initialized'); } 
        catch (e) { console.error('Failed to init audiences UI:', e); }
        
        try { initNavigation(); console.log('✓ Navigation initialized'); } 
        catch (e) { console.error('Failed to init navigation:', e); }
        
        try { initButtons(); console.log('✓ Buttons initialized'); } 
        catch (e) { console.error('Failed to init buttons:', e); }
        
        try { initDebugMode(); console.log('✓ Debug mode initialized'); } 
        catch (e) { console.error('Failed to init debug mode:', e); }
        
        // Poll status every 30 seconds
        setInterval(checkStatus, 30000);
        
        console.log('Dashboard initialization complete');
        
        // Add a visual indicator that JS is working
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.bottom = '10px';
        indicator.style.right = '10px';
        indicator.style.backgroundColor = 'green';
        indicator.style.color = 'white';
        indicator.style.padding = '5px 10px';
        indicator.style.borderRadius = '5px';
        indicator.style.zIndex = '9999';
        indicator.textContent = 'JS Active v24';
        document.body.appendChild(indicator);
        
    } catch (error) {
        console.error('Fatal error in main initialization:', error);
        alert('There was an error initializing the dashboard. See console for details.');
    }
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
 * Initialize navigation functionality
 */
function initNavigation() {
    // Get navigation elements
    const dashboardLink = document.getElementById('nav-dashboard');
    const historyLink = document.getElementById('nav-history');
    const preferencesLink = document.getElementById('nav-preferences');
    const audiencesLink = document.getElementById('nav-audiences');
    const helpLink = document.getElementById('nav-help');
    
    // Set up click handlers
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function() {
            activateNavLink(this);
            handleNavigation('Dashboard');
        });
    }
    
    if (historyLink) {
        historyLink.addEventListener('click', function() {
            activateNavLink(this);
            handleNavigation('Notification History');
        });
    }
    
    if (preferencesLink) {
        preferencesLink.addEventListener('click', function() {
            activateNavLink(this);
            handleNavigation('User Preferences');
        });
    }
    
    if (audiencesLink) {
        audiencesLink.addEventListener('click', function() {
            activateNavLink(this);
            handleNavigation('Audience Config');
        });
    }
    
    if (helpLink) {
        helpLink.addEventListener('click', function() {
            activateNavLink(this);
            handleNavigation('Help');
        });
    }
    
    // Activate the dashboard link by default if we're on the main page
    const currentPath = window.location.pathname;
    if (currentPath === '/' || currentPath === '') {
        dashboardLink && dashboardLink.classList.add('active');
    }
    
    // Check if URL has a hash and navigate to that section
    const hash = window.location.hash;
    if (hash) {
        const sectionName = hash.substring(1); // Remove the # from the hash
        
        // Map hash to section name
        const sections = {
            'notification-history': 'Notification History',
            'preferences': 'User Preferences',
            'audiences': 'Audience Config',
            'help': 'Help'
        };
        
        if (sections[sectionName]) {
            // Activate the corresponding link
            switch(sectionName) {
                case 'notification-history':
                    historyLink && activateNavLink(historyLink);
                    break;
                case 'preferences':
                    preferencesLink && activateNavLink(preferencesLink);
                    break;
                case 'audiences':
                    audiencesLink && activateNavLink(audiencesLink);
                    break;
                case 'help':
                    helpLink && activateNavLink(helpLink);
                    break;
            }
            
            // Navigate to the section
            handleNavigation(sections[sectionName]);
        }
    }
    
    // Refresh dashboard button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Refreshing dashboard...');
            // Add a visual spinning effect to the refresh button
            this.classList.add('refreshing');
            
            // Check status
            checkStatus();
            
            // Refresh user context
            initUserContext();
            
            // Stop spinning after 1 second
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 1000);
        });
    }
    
    // Help button
    const helpBtn = document.getElementById('help-button');
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            console.log('Showing help dialog');
            showHelpDialog();
        });
    }
}

/**
 * Activate a navigation link and deactivate others
 * @param {HTMLElement} link The link to activate
 */
function activateNavLink(link) {
    // Remove active class from all links
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(l => l.classList.remove('active'));
    
    // Add active class to the clicked link
    link.classList.add('active');
    
    // Update header title
    const headerTitle = document.querySelector('.header-title');
    const linkText = link.textContent.trim();
    
    if (headerTitle) {
        headerTitle.textContent = linkText + ' Dashboard';
    }
}

/**
 * Show help dialog with information about the Smart Notification Router
 */
function showHelpDialog() {
    alert(`Smart Notification Router Help

The Smart Notification Router allows you to:
- Route notifications based on severity and audience
- Configure user preferences for notifications
- Test notifications with different settings
- Define audience targets for notifications
- Use tag-based routing for dynamic notification delivery

For more information, visit the documentation at:
https://github.com/festion/smart_notification`);
}

/**
 * Handle navigation to different sections
 * @param {string} section Section name
 */
function handleNavigation(section) {
    console.log('Navigating to section:', section);
    
    // Get content sections and log for debugging
    console.log('Navigating to section:', section);
    
    // Query sections by class rather than nth-child for better reliability
    const personalSection = document.querySelector('.personal-section');
    const toolsSection = document.querySelector('.tools-section');
    const adminSection = document.getElementById('admin-section');
    
    // Log what sections we found
    console.log('Found sections:', { 
        personalSection: !!personalSection, 
        toolsSection: !!toolsSection, 
        adminSection: !!adminSection 
    });
    
    // Handle different navigation targets
    switch(section) {
        case 'Dashboard':
            // Show all default sections
            personalSection.style.display = 'block';
            toolsSection.style.display = 'block';
            if (adminSection) {
                const isAdmin = document.getElementById('sidebar-user-role').textContent === 'Administrator';
                adminSection.style.display = isAdmin ? 'block' : 'none';
            }
            // Update URL hash
            history.pushState(null, null, '#dashboard');
            break;
            
        case 'Notification History':
            // Show only notification history section
            personalSection.style.display = 'block';
            toolsSection.style.display = 'none';
            if (adminSection) adminSection.style.display = 'none';
            
            // Focus on notification history card
            const historyCard = document.querySelector('.notification-history-card');
            if (historyCard) {
                historyCard.scrollIntoView({ behavior: 'smooth' });
                // Add highlight effect
                historyCard.classList.add('highlight');
                setTimeout(() => {
                    historyCard.classList.remove('highlight');
                }, 1500);
            }
            // Update URL hash
            history.pushState(null, null, '#notification-history');
            break;
            
        case 'Audience Config':
            // Show only audience configuration section
            personalSection.style.display = 'none';
            toolsSection.style.display = 'none';
            if (adminSection) {
                adminSection.style.display = 'block';
                // Focus on audience card
                const audienceCard = document.querySelector('.audience-settings-card');
                if (audienceCard) {
                    audienceCard.scrollIntoView({ behavior: 'smooth' });
                    // Add highlight effect
                    audienceCard.classList.add('highlight');
                    setTimeout(() => {
                        audienceCard.classList.remove('highlight');
                    }, 1500);
                }
                // Update URL hash
                history.pushState(null, null, '#audiences');
            } else {
                alert('Administrator privileges required to access audience configuration');
                // Revert to dashboard
                handleNavigation('Dashboard');
            }
            break;
            
        case 'User Preferences':
            // Show only settings section
            personalSection.style.display = 'block';
            toolsSection.style.display = 'none';
            if (adminSection) adminSection.style.display = 'none';
            
            // Focus on user preferences card
            const preferencesCard = document.querySelector('.user-preferences-card');
            if (preferencesCard) {
                preferencesCard.scrollIntoView({ behavior: 'smooth' });
                // Add highlight effect
                preferencesCard.classList.add('highlight');
                setTimeout(() => {
                    preferencesCard.classList.remove('highlight');
                }, 1500);
            }
            // Update URL hash
            history.pushState(null, null, '#preferences');
            break;
            
        case 'Help':
            // Show help dialog and stay on current page
            showHelpDialog();
            // Don't update URL hash for help dialog
            break;
            
        default:
            // Show a message that this feature is coming soon
            alert(`${section} feature is coming in a future update.`);
            // Revert to dashboard view
            handleNavigation('Dashboard');
            break;
    }
}

/**
 * Initialize all button functions
 */
function initButtons() {
    // View all notifications button
    const viewAllBtn = document.getElementById('view-all-notifications');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            console.log('View all notifications clicked');
            // Find history link in sidebar and trigger click
            const historyLink = Array.from(document.querySelectorAll('.sidebar-nav a')).find(
                link => link.textContent.trim().includes('Notification History')
            );
            
            if (historyLink) {
                historyLink.click();
            } else {
                alert('Notification History feature coming soon!');
            }
        });
    }
    
    // Save user preferences button
    const savePrefsBtn = document.getElementById('save-preferences');
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', function() {
            saveUserPreferences();
        });
    }
}

/**
 * Initialize user context by fetching user data
 */
function initUserContext() {
    // Determine the base URL prefix
    const baseUrlPrefix = getBaseUrlPrefix();
    
    // Fetch user information
    fetch(`${baseUrlPrefix}/user`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok') {
                updateUserInterface(data.user);
            } else {
                console.error('Error fetching user data:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching user context:', error);
            // Use default user as fallback
            updateUserInterface({
                id: 'default',
                name: 'Default User',
                is_admin: false,
                audiences: ['mobile', 'dashboard'],
                preferences: {
                    min_severity: 'low',
                    notifications_enabled: true
                }
            });
        });
}

/**
 * Update the user interface based on user data
 * @param {Object} user User data
 */
function updateUserInterface(user) {
    // Update sidebar
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    
    if (sidebarName) sidebarName.textContent = user.name;
    if (sidebarRole) sidebarRole.textContent = user.is_admin ? 'Administrator' : 'User';
    
    // Update preferences
    const minSeverity = document.getElementById('user-minimum-severity');
    const notificationsEnabled = document.getElementById('notifications-enabled');
    
    if (minSeverity) minSeverity.value = user.preferences.min_severity;
    if (notificationsEnabled) notificationsEnabled.checked = user.preferences.notifications_enabled;
    
    // Update user audiences
    const audiencesContainer = document.getElementById('user-audiences');
    if (audiencesContainer) {
        audiencesContainer.innerHTML = '';
        
        if (user.audiences && user.audiences.length > 0) {
            user.audiences.forEach(audience => {
                const audienceEl = document.createElement('div');
                audienceEl.className = 'audience-tag';
                audienceEl.textContent = audience;
                audiencesContainer.appendChild(audienceEl);
            });
        } else {
            audiencesContainer.innerHTML = '<p>No audiences configured</p>';
        }
    }
    
    // Pre-select user's audiences in test notification
    const audienceCheckboxes = document.querySelectorAll('input[name="test_audience"]');
    audienceCheckboxes.forEach(checkbox => {
        checkbox.checked = user.audiences && user.audiences.includes(checkbox.value);
    });
    
    // Show admin section if user is admin
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = user.is_admin ? 'block' : 'none';
    }
}

/**
 * Save user preferences
 */
function saveUserPreferences() {
    const minSeverity = document.getElementById('user-minimum-severity').value;
    const notificationsEnabled = document.getElementById('notifications-enabled').checked;
    
    // In a real implementation, this would send data to the server
    // For now, just show a success message
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message success-message';
    messageEl.textContent = 'Preferences saved successfully';
    messageEl.style.marginTop = '15px';
    
    // Add to user preferences card
    const cardContent = document.querySelector('.user-preferences-card .card-content');
    cardContent.appendChild(messageEl);
    
    // Simulate updating the user object
    const user = {
        preferences: {
            min_severity: minSeverity,
            notifications_enabled: notificationsEnabled
        }
    };
    
    console.log('User preferences updated:', user.preferences);
    
    // Remove message after a delay
    setTimeout(() => {
        cardContent.removeChild(messageEl);
    }, 3000);
}

/**
 * Check system status
 */
function checkStatus() {
    // Determine the base URL prefix
    const baseUrlPrefix = getBaseUrlPrefix();
    
    fetch(`${baseUrlPrefix}/status`)
        .then(response => response.json())
        .then(data => {
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const dedupTime = document.getElementById('dedup-time');
            const activeMessages = document.getElementById('active-messages');
            
            if (data.status === 'running') {
                statusIndicator.className = 'mdi mdi-circle status-online';
                statusText.textContent = 'Online';
            } else {
                statusIndicator.className = 'mdi mdi-circle status-offline';
                statusText.textContent = 'Offline';
            }
            
            if (dedupTime) dedupTime.textContent = data.deduplication_ttl;
            if (activeMessages) activeMessages.textContent = data.message_count;
        })
        .catch(error => {
            console.error('Status check failed:', error);
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            if (statusIndicator) statusIndicator.className = 'mdi mdi-circle status-offline';
            if (statusText) statusText.textContent = 'Offline';
        });
}

/**
 * Initialize audience UI
 */
function initAudiencesUI() {
    const container = document.getElementById('audiences-container');
    const addButton = document.getElementById('add-audience');
    const saveButton = document.getElementById('save-config');
    
    // Add audience button
    if (addButton && container) {
        addButton.addEventListener('click', function() {
            addAudienceEntry();
        });
    }
    
    // Remove audience handler
    if (container) {
        container.addEventListener('click', function(e) {
            if (e.target.closest('.remove-btn')) {
                const button = e.target.closest('.remove-btn');
                const entry = button.closest('.audience-entry');
                entry.remove();
            }
        });
    }
    
    // Save config button
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveConfiguration();
        });
    }
}

/**
 * Add a new audience entry
 * @param {string} name Audience name
 * @param {string} severity Minimum severity
 * @param {Array} services Services array
 */
function addAudienceEntry(name = '', severity = '', services = []) {
    const container = document.getElementById('audiences-container');
    if (!container) return;
    
    const severityLevelsInput = document.getElementById('severity-levels-input');
    if (!severityLevelsInput) return;
    
    const severityLevels = severityLevelsInput.value
        .split(',')
        .map(level => level.trim())
        .filter(level => level !== '');
    
    // Create audience entry div
    const entry = document.createElement('div');
    entry.className = 'audience-entry';
    
    // Create input for audience name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'audience_name';
    nameInput.className = 'audience-name';
    nameInput.placeholder = 'Audience Name';
    nameInput.value = name;
    
    // Create severity dropdown
    const severitySelect = document.createElement('select');
    severitySelect.name = 'audience_severity';
    severitySelect.className = 'audience-severity';
    
    severityLevels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        
        if (level === severity) {
            option.selected = true;
        }
        
        severitySelect.appendChild(option);
    });
    
    // Create input for services
    const servicesInput = document.createElement('input');
    servicesInput.type = 'text';
    servicesInput.name = 'audience_services';
    servicesInput.className = 'audience-services';
    servicesInput.placeholder = 'notify.service1, notify.service2';
    
    // Set services value (handle both string and array)
    if (Array.isArray(services)) {
        servicesInput.value = services.join(', ');
    } else if (typeof services === 'string') {
        servicesInput.value = services;
    } else {
        servicesInput.value = '';
    }
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn-icon remove-btn';
    removeButton.innerHTML = '<i class="mdi mdi-delete"></i>';
    
    // Add all elements to entry
    entry.appendChild(nameInput);
    entry.appendChild(severitySelect);
    entry.appendChild(servicesInput);
    entry.appendChild(removeButton);
    
    // Add entry to container
    container.appendChild(entry);
}

/**
 * Save system configuration
 */
function saveConfiguration() {
    // Collect audience data
    const audiences = {};
    const audienceEntries = document.querySelectorAll('.audience-entry');
    
    audienceEntries.forEach(entry => {
        const name = entry.querySelector('.audience-name').value;
        if (name) {
            const severity = entry.querySelector('.audience-severity').value;
            const services = entry.querySelector('.audience-services').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s !== '');
                
            audiences[name] = {
                min_severity: severity,
                services: services
            };
        }
    });
    
    // Collect severity levels
    const severityLevels = document.getElementById('severity-levels-input').value
        .split(',')
        .map(level => level.trim())
        .filter(level => level !== '');
        
    // Prepare form data
    const formData = new FormData();
    formData.append('severity_levels', severityLevels.join(','));
    
    // Add audience data
    Object.keys(audiences).forEach((name, index) => {
        formData.append('audience_name', name);
        formData.append('audience_severity', audiences[name].min_severity);
        formData.append('audience_services', audiences[name].services.join(','));
    });
    
    // Determine the base URL prefix
    const baseUrlPrefix = getBaseUrlPrefix();
    
    // Submit form
    fetch(`${baseUrlPrefix}/config`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            showAdminMessage('Configuration saved successfully', true);
            // Reload the page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAdminMessage('Error saving configuration', false);
        }
    })
    .catch(error => {
        console.error('Error saving configuration:', error);
        showAdminMessage('Error saving configuration: ' + error.message, false);
    });
}

/**
 * Show admin message
 * @param {string} message Message to display
 * @param {boolean} success Whether it's a success or error message
 */
function showAdminMessage(message, success) {
    // Create a notification at the top of the admin section
    const adminSection = document.getElementById('admin-section');
    
    const messageEl = document.createElement('div');
    messageEl.className = success ? 'notification-message success-message' : 'notification-message error-message';
    messageEl.textContent = message;
    messageEl.style.marginBottom = '20px';
    
    // Insert at the top of the admin section
    adminSection.insertBefore(messageEl, adminSection.firstChild);
    
    // Remove after a delay
    setTimeout(() => {
        adminSection.removeChild(messageEl);
    }, 5000);
}

/**
 * Initialize test notification functionality
 */
function initTestNotification() {
    const sendButton = document.getElementById('send-test');
    if (!sendButton) return;
    
    sendButton.addEventListener('click', function() {
        const titleEl = document.getElementById('test-title');
        const messageEl = document.getElementById('test-message');
        const severityEl = document.getElementById('test-severity');
        
        if (!titleEl || !messageEl || !severityEl) return;
        
        const title = titleEl.value;
        const message = messageEl.value;
        const severity = severityEl.value;
        
        const audienceChecks = document.querySelectorAll('input[name="test_audience"]:checked');
        const audience = Array.from(audienceChecks).map(check => check.value);
        
        if (!title || !message) {
            showTestResult('Please provide both title and message', false);
            return;
        }
        
        if (audience.length === 0) {
            showTestResult('Please select at least one audience', false);
            return;
        }
        
        sendTestNotification(title, message, severity, audience);
    });
}

/**
 * Send a test notification
 * @param {string} title Notification title
 * @param {string} message Notification message
 * @param {string} severity Notification severity
 * @param {Array} audience Audience array
 */
function sendTestNotification(title, message, severity, audience) {
    // Create form data instead of JSON to avoid parsing issues
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('message', message.trim());
    formData.append('severity', severity);
    
    // Add each audience item as a separate form field to ensure proper array handling
    audience.forEach(item => {
        formData.append('audience', item);
    });
    
    console.log('Sending test notification with form data');
    
    // Determine the base URL prefix
    const baseUrlPrefix = getBaseUrlPrefix();
    
    // Send notification request using FormData
    fetch(`${baseUrlPrefix}/notify`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        // Handle non-JSON responses gracefully
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json().then(data => ({ ok: response.ok, data }));
        } else {
            return response.text().then(text => ({ 
                ok: response.ok, 
                data: { 
                    status: response.ok ? 'ok' : 'error',
                    message: text
                }
            }));
        }
    })
    .then(({ ok, data }) => {
        if (ok && data.status === 'ok') {
            showTestResult(`Notification sent successfully to ${data.routed_count || '?'} services!`, true);
            
            // Update the notification history (simulated)
            updateNotificationHistory(title, message, severity);
        } else if (data.status === 'duplicate') {
            showTestResult('Duplicate notification: ' + data.message, false);
        } else {
            showTestResult('Error: ' + (data.message || 'Unknown error'), false);
        }
    })
    .catch(error => {
        console.error('Failed to send test notification:', error);
        showTestResult('Failed to send notification: ' + error.message, false);
    });
}

/**
 * Update notification history with a new notification (simulated)
 * @param {string} title Notification title
 * @param {string} message Notification message
 * @param {string} severity Notification severity
 */
function updateNotificationHistory(title, message, severity) {
    const historyContainer = document.getElementById('recent-notifications');
    if (!historyContainer) return;
    
    // Create notification item
    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item';
    notificationItem.innerHTML = `
        <div class="notification-header">
            <strong>${title}</strong>
            <span class="severity-tag severity-${severity}">${severity}</span>
        </div>
        <div class="notification-message">
            ${message}
        </div>
        <div class="notification-time">
            Just now
        </div>
    `;
    
    // Add to history at the top
    historyContainer.insertBefore(notificationItem, historyContainer.firstChild);
    
    // Limit to 5 notifications
    const items = historyContainer.querySelectorAll('.notification-item');
    if (items.length > 5) {
        historyContainer.removeChild(items[items.length - 1]);
    }
}

/**
 * Show test notification result
 * @param {string} message Message to display
 * @param {boolean} success Whether it's a success or error message
 */
function showTestResult(message, success) {
    const resultDiv = document.getElementById('test-result');
    if (!resultDiv) return;
    
    resultDiv.textContent = message;
    resultDiv.className = success ? 'notification-message success-message' : 'notification-message error-message';
    resultDiv.classList.remove('hidden');
    
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 5000);
}

/**
 * Get the base URL prefix for API calls
 * This handles proxy configurations and ensures all API calls use the same base URL
 * @returns {string} Base URL prefix
 */
function getBaseUrlPrefix() {
    // Most reliable way to get the current base URL
    return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
}