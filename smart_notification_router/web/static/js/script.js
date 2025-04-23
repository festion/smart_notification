/**
 * Smart Notification Router Dashboard Script
 * 
 * This script handles all UI interactions for the Smart Notification Router dashboard,
 * including navigation, user preferences, test notifications, and configuration.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Smart Notification Dashboard loaded');
    
    // Initialize all UI components
    initUserContext();
    initStatusChecking();
    initTestNotification(); 
    initAudiencesUI();
    initNavigation();
    initButtons();
    
    // Poll status every 30 seconds
    setInterval(checkStatus, 30000);
    
    console.log('Dashboard initialization complete');
});

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    // Add active class to current page link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        // If we're on the dashboard page, only the dashboard link should be active
        if (currentPath === '/' || currentPath === '') {
            if (link.getAttribute('href') === '/' || link.getAttribute('href') === '') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        } 
        // Otherwise, activate link if its href matches the current path
        else if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
        
        // Add click handler for navigation links that use hash
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Update header title
                const headerTitle = document.querySelector('.header-title');
                const linkText = this.textContent.trim();
                
                if (headerTitle) {
                    headerTitle.textContent = linkText + ' Dashboard';
                }
                
                // Show appropriate section based on link text
                handleNavigation(linkText);
            });
        }
    });
    
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
    
    // Get content sections
    const personalSection = document.querySelector('.dashboard-section:nth-child(1)');
    const toolsSection = document.querySelector('.dashboard-section:nth-child(2)');
    const adminSection = document.getElementById('admin-section');
    
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
            break;
            
        case 'Audiences':
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
            } else {
                alert('Administrator privileges required to access audience configuration');
                // Revert to dashboard
                handleNavigation('Dashboard');
            }
            break;
            
        case 'Settings':
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
            break;
            
        case 'Help':
            // Show help dialog and stay on current page
            showHelpDialog();
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
    // Prepare notification payload
    const payload = {
        title: title.trim(),
        message: message.trim(),
        severity,
        audience
    };
    
    console.log('Sending test notification with payload:', payload);
    
    // Determine the base URL prefix
    const baseUrlPrefix = getBaseUrlPrefix();
    
    // Send notification request
    fetch(`${baseUrlPrefix}/notify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'ok') {
            showTestResult(`Notification sent successfully to ${data.routed_count} services!`, true);
            
            // Update the notification history (simulated)
            updateNotificationHistory(title, message, severity);
        } else if (data.status === 'duplicate') {
            showTestResult('Duplicate notification: ' + data.message, false);
        } else {
            showTestResult('Error: ' + data.message, false);
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