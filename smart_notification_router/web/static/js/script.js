/**
 * Smart Notification Router Dashboard Script
 * Version: v32-enhanced
 */

console.log('=== SMART NOTIFICATION ROUTER ===');
console.log('Loading enhanced script.js v32-enhanced');
console.log('Loading timestamp: ' + new Date().toISOString());

// Configuration
const CONFIG = {
    apiBase: '',
    refreshInterval: 30000, // 30 seconds
    debug: true
};

// Set a flag to indicate the script loaded properly
window.scriptLoaded = true;

// Application state
const STATE = {
    audiences: [],
    notifications: [],
    status: {
        online: false,
        lastCheck: null
    },
    userContext: {
        name: 'Default User',
        role: 'User',
        permissions: ['view']
    }
};

// Utility functions
function formatDateTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="mdi ${type === 'success' ? 'mdi-check-circle' : type === 'error' ? 'mdi-alert-circle' : 'mdi-information'}"></i>
        </div>
        <div class="notification-content">${message}</div>
        <div class="notification-close"><i class="mdi mdi-close"></i></div>
    `;
    
    // Add to notifications container (create if it doesn't exist)
    let notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications-container';
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    notificationsContainer.appendChild(notification);
    
    // Add click listener to close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// API functions
async function fetchWithTimeout(url, options = {}) {
    const { timeout = 5000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function checkStatus() {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/status`);
        const data = await response.json();
        
        STATE.status.online = data.online === true;
        STATE.status.lastCheck = new Date();
        
        updateStatusIndicator();
        return data;
    } catch (error) {
        console.error('Error checking status:', error);
        STATE.status.online = false;
        STATE.status.lastCheck = new Date();
        updateStatusIndicator();
        return { online: false, error: error.message };
    }
}

function updateStatusIndicator() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (!statusIndicator || !statusText) return;
    
    if (STATE.status.online) {
        statusIndicator.className = 'mdi mdi-circle status-online';
        statusText.textContent = 'Online';
    } else {
        statusIndicator.className = 'mdi mdi-circle status-offline';
        statusText.textContent = 'Offline';
    }
    
    console.log(`Status updated: ${STATE.status.online ? 'Online' : 'Offline'}`);
}

async function fetchNotificationHistory() {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/notifications`);
        const data = await response.json();
        
        if (data.status === 'ok' && Array.isArray(data.notifications)) {
            STATE.notifications = data.notifications;
            return data.notifications;
        } else {
            throw new Error('Invalid notification data received');
        }
    } catch (error) {
        console.error('Error fetching notification history:', error);
        throw error;
    }
}

async function saveUserPreferences(preferences) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to save preferences');
        }
    } catch (error) {
        console.error('Error saving user preferences:', error);
        throw error;
    }
}

async function getUserPreferences() {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/preferences`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data.preferences;
        } else {
            throw new Error(data.message || 'Failed to get preferences');
        }
    } catch (error) {
        console.error('Error getting user preferences:', error);
        // Return default preferences on error
        return {
            notificationChannels: {
                browser: true,
                mobile: true,
                email: false
            },
            priorities: {
                low: true,
                medium: true,
                high: true,
                emergency: true
            },
            doNotDisturb: {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00'
            },
            muteAudiences: []
        };
    }
}

async function getNotificationHistory(filters = {}) {
    try {
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.startDate) queryParams.append('start_date', filters.startDate);
        if (filters.endDate) queryParams.append('end_date', filters.endDate);
        if (filters.priority) queryParams.append('priority', filters.priority);
        if (filters.audience) queryParams.append('audience', filters.audience);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.limit) queryParams.append('limit', filters.limit);
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/notifications/history${queryString}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data.notifications || [];
        } else {
            throw new Error(data.message || 'Failed to retrieve notification history');
        }
    } catch (error) {
        console.error('Error getting notification history:', error);
        throw error;
    }
}

async function markNotificationRead(notificationId) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to mark notification as read');
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

async function markAllNotificationsRead() {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/notifications/read-all`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to mark all notifications as read');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to delete notification');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}

// Feature initialization functions
function initStatusChecking() {
    console.log('Initializing status checking');
    
    // Initial status check
    checkStatus();
    
    // Setup interval for regular status checks
    setInterval(() => {
        checkStatus();
    }, CONFIG.refreshInterval);
}

function initTestNotification() {
    console.log('Initializing test notification');
    
    // Find test notification button
    const testButton = document.getElementById('test-notification-button');
    if (!testButton) return;
    
    // Add event listener
    testButton.addEventListener('click', async () => {
        console.log('Sending test notification');
        showNotification('Sending test notification...', 'info');
        
        try {
            const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/test-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Test notification from Smart Notification Router',
                    title: 'Test Notification',
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Test notification sent successfully!', 'success');
            } else {
                showNotification(`Failed to send test notification: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    });
}

function initAudiencesUI() {
    console.log('Initializing audiences UI');
    
    const audiencesSection = document.getElementById('audiences-section');
    if (!audiencesSection) return;
    
    // We'll implement this more fully in the next version
    console.log('Audiences section found, will be populated in next version');
}

function initNotificationHistory() {
    console.log('Initializing notification history');
    
    const historySection = document.getElementById('history-section');
    if (!historySection) return;
    
    // Replace placeholder with proper content
    historySection.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Notification History</h2>
            <div class="section-actions">
                <button class="btn btn-secondary" id="filter-history-btn">
                    <i class="mdi mdi-filter-variant"></i> Filter
                </button>
                <button class="btn btn-primary" id="refresh-history-btn">
                    <i class="mdi mdi-refresh"></i> Refresh
                </button>
                <button class="btn btn-outline" id="mark-all-read-btn">
                    <i class="mdi mdi-check-all"></i> Mark All Read
                </button>
            </div>
        </div>
        
        <div class="filter-panel" id="history-filter-panel" style="display: none;">
            <div class="filter-row">
                <div class="filter-group">
                    <label for="history-date-from" class="filter-label">From Date</label>
                    <input type="date" id="history-date-from" class="filter-input">
                </div>
                
                <div class="filter-group">
                    <label for="history-date-to" class="filter-label">To Date</label>
                    <input type="date" id="history-date-to" class="filter-input">
                </div>
                
                <div class="filter-group">
                    <label for="history-priority" class="filter-label">Priority</label>
                    <select id="history-priority" class="filter-input">
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="history-audience" class="filter-label">Audience</label>
                    <select id="history-audience" class="filter-input">
                        <option value="">All Audiences</option>
                    </select>
                </div>
            </div>
            
            <div class="filter-row">
                <div class="filter-group filter-search">
                    <label for="history-search" class="filter-label">Search</label>
                    <div class="search-input-wrapper">
                        <input type="text" id="history-search" class="filter-input" placeholder="Search notifications...">
                        <button class="search-btn" id="history-search-btn">
                            <i class="mdi mdi-magnify"></i>
                        </button>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button class="btn btn-outline" id="clear-filters-btn">Clear Filters</button>
                    <button class="btn btn-primary" id="apply-filters-btn">Apply Filters</button>
                </div>
            </div>
        </div>
        
        <div class="notification-list" id="history-notification-list">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading notification history...</p>
            </div>
        </div>
        
        <div class="pagination" id="history-pagination">
            <button class="pagination-btn" id="prev-page-btn" disabled>
                <i class="mdi mdi-chevron-left"></i> Previous
            </button>
            <span class="pagination-info">Page <span id="current-page">1</span> of <span id="total-pages">1</span></span>
            <button class="pagination-btn" id="next-page-btn" disabled>
                Next <i class="mdi mdi-chevron-right"></i>
            </button>
        </div>
        
        <!-- Notification detail modal -->
        <div class="modal" id="notification-detail-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Notification Detail</h3>
                    <button class="modal-close" id="close-notification-modal">&times;</button>
                </div>
                <div class="modal-body" id="notification-detail-content">
                    <!-- Content will be populated dynamically -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="mark-read-btn">Mark as Read</button>
                    <button class="btn btn-danger" id="delete-notification-btn">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const filterBtn = historySection.querySelector('#filter-history-btn');
    const filterPanel = historySection.querySelector('#history-filter-panel');
    const refreshBtn = historySection.querySelector('#refresh-history-btn');
    const markAllReadBtn = historySection.querySelector('#mark-all-read-btn');
    const applyFiltersBtn = historySection.querySelector('#apply-filters-btn');
    const clearFiltersBtn = historySection.querySelector('#clear-filters-btn');
    const searchBtn = historySection.querySelector('#history-search-btn');
    
    // Modal elements
    const modal = document.getElementById('notification-detail-modal');
    const closeModalBtn = document.getElementById('close-notification-modal');
    const markReadBtn = document.getElementById('mark-read-btn');
    const deleteNotificationBtn = document.getElementById('delete-notification-btn');
    
    // Pagination elements
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    // Toggle filter panel
    if (filterBtn && filterPanel) {
        filterBtn.addEventListener('click', () => {
            const isVisible = filterPanel.style.display === 'block';
            filterPanel.style.display = isVisible ? 'none' : 'block';
            filterBtn.innerHTML = isVisible ? 
                '<i class="mdi mdi-filter-variant"></i> Filter' : 
                '<i class="mdi mdi-filter-variant-remove"></i> Hide Filters';
        });
    }
    
    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadNotificationHistory());
    }
    
    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                await markAllNotificationsRead();
                showNotification('All notifications marked as read', 'success');
                loadNotificationHistory();
            } catch (error) {
                showNotification('Failed to mark notifications as read: ' + error.message, 'error');
            }
        });
    }
    
    // Apply filters
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => loadNotificationHistory());
    }
    
    // Clear filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            document.getElementById('history-date-from').value = '';
            document.getElementById('history-date-to').value = '';
            document.getElementById('history-priority').value = '';
            document.getElementById('history-audience').value = '';
            document.getElementById('history-search').value = '';
            loadNotificationHistory();
        });
    }
    
    // Search button
    if (searchBtn) {
        searchBtn.addEventListener('click', () => loadNotificationHistory());
    }
    
    // Modal close button
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Mark as read button
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            const notificationId = markReadBtn.dataset.notificationId;
            if (!notificationId) return;
            
            try {
                await markNotificationRead(notificationId);
                showNotification('Notification marked as read', 'success');
                
                // Update UI
                const notificationItem = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (notificationItem) {
                    notificationItem.classList.remove('unread');
                }
                
                modal.style.display = 'none';
                
            } catch (error) {
                showNotification('Failed to mark notification as read: ' + error.message, 'error');
            }
        });
    }
    
    // Delete notification button
    if (deleteNotificationBtn) {
        deleteNotificationBtn.addEventListener('click', async () => {
            const notificationId = deleteNotificationBtn.dataset.notificationId;
            if (!notificationId) return;
            
            if (!confirm('Are you sure you want to delete this notification?')) {
                return;
            }
            
            try {
                await deleteNotification(notificationId);
                showNotification('Notification deleted', 'success');
                
                // Update UI
                const notificationItem = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (notificationItem) {
                    notificationItem.remove();
                }
                
                modal.style.display = 'none';
                
            } catch (error) {
                showNotification('Failed to delete notification: ' + error.message, 'error');
            }
        });
    }
    
    // Pagination
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            const currentPage = parseInt(document.getElementById('current-page').textContent);
            if (currentPage > 1) {
                STATE.historyPage = currentPage - 1;
                loadNotificationHistory();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const currentPage = parseInt(document.getElementById('current-page').textContent);
            const totalPages = parseInt(document.getElementById('total-pages').textContent);
            
            if (currentPage < totalPages) {
                STATE.historyPage = currentPage + 1;
                loadNotificationHistory();
            }
        });
    }
    
    // Initialize state if not exists
    if (!STATE.historyPage) {
        STATE.historyPage = 1;
    }
    
    // Populate audience filter
    populateAudienceFilter();
    
    // Load notification history
    loadNotificationHistory();
}

function populateAudienceFilter() {
    const audienceSelect = document.getElementById('history-audience');
    if (!audienceSelect) return;
    
    // Get all available audiences
    const audiences = STATE.audiences.length > 0 ? 
        STATE.audiences : 
        [
            { id: 'browser', name: 'Browser' },
            { id: 'mobile', name: 'Mobile' },
            { id: 'email', name: 'Email' },
            { id: 'slack', name: 'Slack' },
            { id: 'webhook', name: 'Webhooks' }
        ];
    
    // Add options
    audiences.forEach(audience => {
        const option = document.createElement('option');
        option.value = audience.id;
        option.textContent = audience.name || audience.id;
        audienceSelect.appendChild(option);
    });
}

// Load notification history with pagination
async function loadNotificationHistory(page = 1, limit = 10) {
    try {
        showLoading('history-container');
        const response = await fetchNotificationHistory(page, limit);
        
        if (!response.success) {
            displayError('Failed to load notification history: ' + response.error);
            return;
        }
        
        const { items, metadata } = response;
        renderNotificationHistory(items);
        updatePagination(metadata);
        hideLoading('history-container');
        
        // Update notification badge count if needed
        if (metadata && metadata.unread_count !== undefined) {
            updateNotificationBadge(metadata.unread_count);
        }
    } catch (error) {
        console.error('Error loading notification history:', error);
        displayError('Failed to load notification history. Please try again later.');
        hideLoading('history-container');
    }
}

// Render notification history items
function renderNotificationHistory(notifications) {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    
    if (!notifications || notifications.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state">No notifications found</div>';
        return;
    }
    
    historyContainer.innerHTML = '';
    const notificationList = document.createElement('ul');
    notificationList.className = 'notification-list';
    
    notifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationList.appendChild(notificationItem);
    });
    
    historyContainer.appendChild(notificationList);
}

// Create a single notification item for the history list
function createNotificationItem(notification) {
    const item = document.createElement('li');
    item.className = 'notification-item';
    if (!notification.read) {
        item.classList.add('unread');
    }
    
    const notificationDate = new Date(notification.timestamp);
    const formattedDate = notificationDate.toLocaleString();
    
    // Create notification header
    const header = document.createElement('div');
    header.className = 'notification-header';
    
    const title = document.createElement('h3');
    title.className = 'notification-title';
    title.textContent = notification.title || 'Notification';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'notification-timestamp';
    timestamp.textContent = formattedDate;
    
    header.appendChild(title);
    header.appendChild(timestamp);
    
    // Create notification content
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    if (notification.message) {
        const message = document.createElement('p');
        message.className = 'notification-message';
        message.textContent = notification.message;
        content.appendChild(message);
    }
    
    // Add tags if present
    if (notification.tags && notification.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'notification-tags';
        
        notification.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
        
        content.appendChild(tagsContainer);
    }
    
    // Create action buttons
    const actions = document.createElement('div');
    actions.className = 'notification-actions';
    
    // Mark as read/unread button
    const readButton = document.createElement('button');
    readButton.className = 'action-button';
    readButton.textContent = notification.read ? 'Mark as unread' : 'Mark as read';
    readButton.addEventListener('click', async () => {
        await toggleNotificationRead(notification.id, !notification.read);
        loadNotificationHistory(); // Reload to reflect changes
    });
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-button delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this notification?')) {
            await deleteNotification(notification.id);
            loadNotificationHistory(); // Reload to reflect changes
        }
    });
    
    actions.appendChild(readButton);
    actions.appendChild(deleteButton);
    
    // Assemble the notification item
    item.appendChild(header);
    item.appendChild(content);
    item.appendChild(actions);
    
    return item;
}

async function loadNotificationHistory() {
    const notificationList = document.getElementById('history-notification-list');
    if (!notificationList) return;
    
    // Show loading
    notificationList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading notification history...</p>
        </div>
    `;
    
    try {
        // Collect filters
        const filters = {
            startDate: document.getElementById('history-date-from').value || undefined,
            endDate: document.getElementById('history-date-to').value || undefined,
            priority: document.getElementById('history-priority').value || undefined,
            audience: document.getElementById('history-audience').value || undefined,
            search: document.getElementById('history-search').value || undefined,
            page: STATE.historyPage || 1,
            limit: 10
        };
        
        // Get notification history
        const notifications = await getNotificationHistory(filters);
        
        // If no notifications
        if (!notifications || notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="empty-state">
                    <i class="mdi mdi-bell-off"></i>
                    <p>No notifications found</p>
                </div>
            `;
            return;
        }
        
        // Update pagination
        updatePagination(notifications.metadata || { currentPage: 1, totalPages: 1 });
        
        // Render notifications
        notificationList.innerHTML = notifications.map(notification => {
            const date = new Date(notification.timestamp);
            const formattedDate = date.toLocaleString();
            
            let priorityClass = '';
            switch (notification.priority) {
                case 'low': priorityClass = 'priority-low'; break;
                case 'medium': priorityClass = 'priority-medium'; break;
                case 'high': priorityClass = 'priority-high'; break;
                case 'emergency': priorityClass = 'priority-emergency'; break;
            }
            
            return `
                <div class="notification-item ${notification.read ? '' : 'unread'} ${priorityClass}"
                    data-notification-id="${notification.id}">
                    <div class="notification-header">
                        <div class="notification-meta">
                            <span class="notification-time">${formattedDate}</span>
                            <span class="notification-priority">${notification.priority || 'normal'}</span>
                        </div>
                        <div class="notification-actions">
                            <button class="action-btn view-notification-btn" title="View details">
                                <i class="mdi mdi-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="notification-content">
                        <div class="notification-title">${notification.title || 'Notification'}</div>
                        <div class="notification-message">${notification.message || ''}</div>
                    </div>
                    
                    <div class="notification-footer">
                        <div class="notification-tags">
                            ${notification.tags ? notification.tags.map(tag => 
                                `<span class="tag">${tag}</span>`
                            ).join('') : ''}
                        </div>
                        <div class="notification-source">
                            <span class="source-label">From:</span>
                            <span class="source-value">${notification.source || 'system'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for notification items
        notificationList.querySelectorAll('.view-notification-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const notificationId = btn.closest('.notification-item').dataset.notificationId;
                openNotificationDetail(notificationId, notifications);
            });
        });
        
        notificationList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (event) => {
                // Don't trigger on button clicks
                if (event.target.closest('button')) return;
                
                const notificationId = item.dataset.notificationId;
                openNotificationDetail(notificationId, notifications);
            });
        });
        
    } catch (error) {
        console.error('Failed to load notification history:', error);
        notificationList.innerHTML = `
            <div class="error-state">
                <i class="mdi mdi-alert"></i>
                <p>Failed to load notifications: ${error.message}</p>
                <button class="btn btn-outline retry-btn">Retry</button>
            </div>
        `;
        
        const retryBtn = notificationList.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadNotificationHistory());
        }
    }
}

function updatePagination(metadata) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (!metadata || metadata.total_pages <= 1) {
        return; // No need for pagination if there's only one page
    }
    
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '← Previous';
    prevButton.disabled = metadata.current_page <= 1;
    prevButton.addEventListener('click', () => {
        loadNotificationHistory(metadata.current_page - 1, metadata.items_per_page);
    });
    
    // Page numbers
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${metadata.current_page} of ${metadata.total_pages}`;
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = metadata.current_page >= metadata.total_pages;
    nextButton.addEventListener('click', () => {
        loadNotificationHistory(metadata.current_page + 1, metadata.items_per_page);
    });
    
    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextButton);
    
    paginationContainer.appendChild(paginationControls);
}

// Show notification details in modal
function showNotificationDetail(notification) {
    const modal = document.getElementById('notification-detail-modal');
    const content = document.getElementById('notification-detail-content');
    const markReadBtn = document.getElementById('mark-read-btn');
    const deleteBtn = document.getElementById('delete-notification-btn');
    
    if (!modal || !content || !markReadBtn || !deleteBtn) return;
    
    // Format notification details
    const date = new Date(notification.timestamp);
    const formattedDate = date.toLocaleString();
    
    // Set modal content
    content.innerHTML = `
        <div class="notification-detail">
            <div class="detail-header">
                <h3 class="detail-title">${notification.title || 'Notification'}</h3>
                <div class="detail-meta">
                    <span class="detail-timestamp">${formattedDate}</span>
                    <span class="detail-priority priority-badge priority-${notification.priority || 'normal'}">${notification.priority || 'normal'}</span>
                </div>
            </div>
            
            <div class="detail-message">
                <p>${notification.message || 'No message content'}</p>
            </div>
            
            ${notification.data ? `
                <div class="detail-data">
                    <h4>Additional Data</h4>
                    <pre>${JSON.stringify(notification.data, null, 2)}</pre>
                </div>
            ` : ''}
            
            <div class="detail-info">
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${notification.read ? 'Read' : 'Unread'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Audience:</span>
                    <span class="info-value">${notification.audience || 'All'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">ID:</span>
                    <span class="info-value">${notification.id}</span>
                </div>
            </div>
        </div>
    `;
    
    // Set button data attributes and visibility
    markReadBtn.dataset.notificationId = notification.id;
    deleteBtn.dataset.notificationId = notification.id;
    
    // Hide mark as read button if already read
    markReadBtn.style.display = notification.read ? 'none' : 'block';
    
    // Show modal
    modal.style.display = 'block';
}

// Event listener setup for notification items
function setupNotificationItemListeners() {
    const notificationItems = document.querySelectorAll('.notification-item');
    
    notificationItems.forEach(item => {
        item.addEventListener('click', async () => {
            const notificationId = item.dataset.notificationId;
            if (!notificationId) return;
            
            try {
                // Fetch notification details if needed
                // For now we'll use the data already present
                
                // Find the notification in our state
                const notification = STATE.notifications.find(n => n.id === notificationId);
                
                if (notification) {
                    showNotificationDetail(notification);
                } else {
                    // If not found in state, fetch it
                    const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/notifications/${notificationId}`);
                    const data = await response.json();
                    
                    if (data.status === 'ok') {
                        showNotificationDetail(data.notification);
                    } else {
                        throw new Error(data.message || 'Failed to load notification details');
                    }
                }
            } catch (error) {
                showNotification(`Error loading notification details: ${error.message}`, 'error');
            }
        });
    });
}

// Close modal when clicking outside of it
window.addEventListener('click', event => {
    const modal = document.getElementById('notification-detail-modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

// Keyboard navigation for modal
window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('notification-detail-modal');
        if (modal && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    }
});

// Handle Enter key in search field
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                loadNotificationHistory();
            }
        });
    }
});

function openNotificationDetail(notificationId, notifications) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    const modal = document.getElementById('notification-detail-modal');
    const contentEl = document.getElementById('notification-detail-content');
    const markReadBtn = document.getElementById('mark-read-btn');
    const deleteBtn = document.getElementById('delete-notification-btn');
    
    if (!modal || !contentEl || !markReadBtn || !deleteBtn) return;
    
    // Format date
    const date = new Date(notification.timestamp);
    const formattedDate = date.toLocaleString();
    
    // Set button data attributes
    markReadBtn.dataset.notificationId = notificationId;
    deleteBtn.dataset.notificationId = notificationId;
    
    // Hide mark as read button if already read
    markReadBtn.style.display = notification.read ? 'none' : 'inline-block';
    
    // Populate modal content
    contentEl.innerHTML = `
        <div class="notification-detail">
            <div class="detail-header">
                <h3 class="detail-title">${notification.title || 'Notification'}</h3>
                <div class="detail-meta">
                    <div class="detail-time">
                        <i class="mdi mdi-clock-outline"></i>
                        ${formattedDate}
                    </div>
                    <div class="detail-priority ${notification.priority}">
                        <i class="mdi mdi-flag"></i>
                        ${notification.priority || 'normal'} priority
                    </div>
                    <div class="detail-status">
                        <i class="mdi mdi-${notification.read ? 'eye-outline' : 'eye-off-outline'}"></i>
                        ${notification.read ? 'Read' : 'Unread'}
                    </div>
                </div>
            </div>
            
            <div class="detail-content">
                <div class="detail-message">${notification.message || ''}</div>
                
                ${notification.imageUrl ? `
                    <div class="detail-image">
                        <img src="${notification.imageUrl}" alt="Notification image">
                    </div>
                ` : ''}
                
                ${notification.actionUrl ? `
                    <div class="detail-actions">
                        <a href="${notification.actionUrl}" class="btn btn-primary detail-action-btn" target="_blank">
                            <i class="mdi mdi-open-in-new"></i>
                            ${notification.actionText || 'Open'}
                        </a>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-footer">
                <div class="detail-tags">
                    <h4>Tags</h4>
                    ${notification.tags && notification.tags.length ? 
                        notification.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 
                        '<span class="no-tags">No tags</span>'}
                </div>
                
                <div class="detail-metadata">
                    <h4>Metadata</h4>
                    <div class="metadata-item">
                        <span class="metadata-label">Source:</span>
                        <span class="metadata-value">${notification.source || 'system'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">ID:</span>
                        <span class="metadata-value">${notification.id}</span>
                    </div>
                    ${notification.audiences ? `
                        <div class="metadata-item">
                            <span class="metadata-label">Audiences:</span>
                            <span class="metadata-value">${notification.audiences.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
}

function initNavigation() {
    console.log('Initializing navigation');
    
    // Handle hash changes for SPA-style navigation
    window.addEventListener('hashchange', handleNavigation);
    
    // Initial navigation - important to call this on page load
    handleNavigation();
    
    // Add click event listeners to all nav links to ensure proper navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (event) => {
            console.log(`Nav link clicked: ${link.getAttribute('href')}`);
            // The default behavior will change the hash, which triggers handleNavigation
        });
    });
}

function handleNavigation() {
    const hash = window.location.hash || '#dashboard';
    const sectionId = hash.substring(1); // Remove the # character
    
    console.log(`Navigating to section: ${sectionId}`);
    
    // Handle direct URL navigation for external routes
    if (['tag-manager', 'simple-tag-manager', 'routes', 'debug', 'emergency'].includes(sectionId)) {
        // These are server-side routes, redirect to them
        window.location.href = `/${sectionId}`;
        return;
    }
    
    // Hide all sections first
    const allSections = document.querySelectorAll('.dashboard-section');
    allSections.forEach(section => {
        section.style.display = 'none';
        console.log(`Hiding section: ${section.id}`);
    });
    
    // Show active section
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
        activeSection.style.display = 'block';
        console.log(`Showing section: ${activeSection.id}`);
    } else {
        console.warn(`Section not found: ${sectionId}-section`);
        // Fallback to dashboard if section not found
        if (sectionId !== 'dashboard') {
            window.location.hash = '#dashboard';
        }
    }
    
    // Update header title based on active section
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
        headerTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/-/g, ' ');
    }
    
    // Update active nav item
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Get the href attribute (e.g., "#dashboard")
        const href = link.getAttribute('href');
        
        // Add active class to the matching link
        if (href === hash || (hash === '' && href === '#dashboard')) {
            link.classList.add('active');
            console.log(`Active nav link: ${href}`);
        }
    });
}

function initButtons() {
    console.log('Initializing buttons');
    
    // Generic button handlers can be added here
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(event) {
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.top = `${y}px`;
            ripple.style.left = `${x}px`;
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

function initUserContext() {
    console.log('Initializing user context');
    
    // This would normally fetch user data from the server
    // For now we'll use mock data
    const userData = STATE.userContext;
    
    // Update user info in the sidebar
    const userNameEl = document.getElementById('sidebar-user-name');
    const userRoleEl = document.getElementById('sidebar-user-role');
    
    if (userNameEl) userNameEl.textContent = userData.name;
    if (userRoleEl) userRoleEl.textContent = userData.role;
    
    // Show debug links for admin users
    if (userData.role === 'Admin') {
        document.querySelectorAll('.debug-link').forEach(link => {
            link.style.display = 'block';
        });
    }
}

function initDebugMode() {
    if (!CONFIG.debug) return;
    
    console.log('Debug mode enabled');
    
    // Create visual debug indicator
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = '#444';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.fontSize = '14px';
    debugPanel.style.fontFamily = 'Arial, sans-serif';
    debugPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    debugPanel.innerHTML = '<strong>Debug v32-enhanced</strong><br>';
    document.body.appendChild(debugPanel);
    
    function debugLog(message) {
        console.log(message);
        const line = document.createElement('div');
        line.textContent = message;
        debugPanel.appendChild(line);
        
        // Cap the number of messages
        if (debugPanel.children.length > 10) {
            debugPanel.removeChild(debugPanel.children[1]);
        }
    }
    
    // Add debug info
    debugLog('UI Loaded: ' + new Date().toLocaleTimeString());
    window.debugLog = debugLog;
}

function createDefaultUI() {
    // Create default UI structure if it doesn't exist
    if (document.querySelector('.dashboard-container')) {
        return; // Already has UI structure
    }
    
    console.log('Creating default UI structure');
    
    const mainContent = document.createElement('div');
    mainContent.className = 'dashboard-container';
    
    // Build sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <i class="mdi mdi-bell-ring-outline"></i>
            <span>Smart Notification Router</span>
        </div>
        
        <ul class="sidebar-nav">
            <li><a href="#dashboard" class="active"><i class="mdi mdi-view-dashboard"></i> Dashboard</a></li>
            <li><a href="#notification-history"><i class="mdi mdi-history"></i> Notification History</a></li>
            <li><a href="#preferences"><i class="mdi mdi-account-cog"></i> User Preferences</a></li>
            <li><a href="#audiences"><i class="mdi mdi-account-group"></i> Audience Config</a></li>
            <li><a href="/tag-manager"><i class="mdi mdi-tag-multiple"></i> Tag Manager</a></li>
            <li><a href="#help"><i class="mdi mdi-help-circle"></i> Help</a></li>
            <li class="debug-link" style="display: none;"><a href="/routes"><i class="mdi mdi-routes"></i> Debug Routes</a></li>
            <li class="debug-link" style="display: none;"><a href="/debug"><i class="mdi mdi-bug"></i> Debug Info</a></li>
        </ul>
        
        <div class="user-info" id="sidebar-user-info">
            <div class="user-avatar">
                <i class="mdi mdi-account"></i>
            </div>
            <div class="user-details">
                <div class="user-name" id="sidebar-user-name">Default User</div>
                <div class="user-role" id="sidebar-user-role">User</div>
            </div>
        </div>
    `;
    
    // Build header
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
        <h1 class="header-title">Dashboard</h1>
        
        <div class="header-actions">
            <button class="header-btn" id="refresh-button" title="Refresh"><i class="mdi mdi-refresh"></i></button>
            <button class="header-btn" id="help-button" title="Help"><i class="mdi mdi-help-circle-outline"></i></button>
        </div>
    `;
    
    // Build main content
    const main = document.createElement('main');
    main.className = 'main-content';
    
    // Add dashboard section
    const dashboardSection = document.createElement('section');
    dashboardSection.id = 'dashboard-section';
    dashboardSection.className = 'dashboard-section';
    dashboardSection.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Dashboard Overview</h2>
            <button class="btn btn-primary" id="test-notification-button">
                <i class="mdi mdi-bell-ring"></i> Test Notification
            </button>
        </div>
        
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">System Status</h3>
                </div>
                <div class="card-content">
                    <div class="status-card">
                        <div class="status-indicator">
                            <i class="mdi mdi-circle status-online" id="status-indicator"></i>
                            <span id="status-text">Checking...</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Notifications</h3>
                </div>
                <div class="card-content">
                    <div class="notification-list" id="notification-list">
                        <div class="empty-state">
                            No recent notifications
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add remaining sections (placeholder for now)
    const sections = ['notification-history', 'preferences', 'audiences', 'help'];
    sections.forEach(section => {
        const sectionElement = document.createElement('section');
        sectionElement.id = `${section}-section`;
        sectionElement.className = 'dashboard-section';
        sectionElement.style.display = 'none';
        sectionElement.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">${section.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h2>
            </div>
            <div class="card">
                <div class="card-content">
                    <p>This section is under development.</p>
                </div>
            </div>
        `;
        main.appendChild(sectionElement);
    });
    
    // Add dashboard section to main
    main.appendChild(dashboardSection);
    
    // Add sidebar, header, and main to container
    mainContent.appendChild(sidebar);
    mainContent.appendChild(header);
    mainContent.appendChild(main);
    
    // Replace existing body content with the new structure
    document.body.innerHTML = '';
    document.body.appendChild(mainContent);
    
    // Add notification container
    const notificationsContainer = document.createElement('div');
    notificationsContainer.id = 'notifications-container';
    notificationsContainer.className = 'notifications-container';
    document.body.appendChild(notificationsContainer);
}

function initUserPreferences() {
    console.log('Initializing user preferences');
    
    const preferencesSection = document.getElementById('preferences-section');
    if (!preferencesSection) return;
    
    // Replace placeholder with proper content
    preferencesSection.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">User Preferences</h2>
            <div class="section-actions">
                <button class="btn btn-primary" id="save-preferences-btn">
                    <i class="mdi mdi-content-save"></i> Save Changes
                </button>
            </div>
        </div>
        
        <div class="preferences-grid">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Notification Channels</h3>
                </div>
                <div class="card-content">
                    <p class="card-description">Choose how you want to receive notifications</p>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-browser" class="checkbox-input">
                            <label for="pref-browser" class="checkbox-label">Browser Notifications</label>
                        </div>
                        <div class="setting-description">
                            Receive notifications in this browser window
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-mobile" class="checkbox-input">
                            <label for="pref-mobile" class="checkbox-label">Mobile Push Notifications</label>
                        </div>
                        <div class="setting-description">
                            Receive push notifications on your mobile devices
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-email" class="checkbox-input">
                            <label for="pref-email" class="checkbox-label">Email Notifications</label>
                        </div>
                        <div class="setting-description">
                            Receive important notifications via email
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Priority Settings</h3>
                </div>
                <div class="card-content">
                    <p class="card-description">Select which priority levels you want to receive</p>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-low" class="checkbox-input">
                            <label for="pref-low" class="checkbox-label">Low Priority</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-medium" class="checkbox-input">
                            <label for="pref-medium" class="checkbox-label">Medium Priority</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-high" class="checkbox-input">
                            <label for="pref-high" class="checkbox-label">High Priority</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-emergency" class="checkbox-input">
                            <label for="pref-emergency" class="checkbox-label">Emergency Alerts</label>
                        </div>
                        <div class="setting-description setting-description-warning">
                            <i class="mdi mdi-alert"></i> Emergency alerts cannot be completely disabled
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Do Not Disturb</h3>
                </div>
                <div class="card-content">
                    <div class="form-group">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="pref-dnd" class="checkbox-input">
                            <label for="pref-dnd" class="checkbox-label">Enable Do Not Disturb</label>
                        </div>
                    </div>
                    
                    <div id="dnd-time-settings" class="form-group time-range">
                        <div class="time-input-group">
                            <label for="dnd-start" class="form-label">From</label>
                            <input type="time" id="dnd-start" class="form-input time-input">
                        </div>
                        <div class="time-input-group">
                            <label for="dnd-end" class="form-label">To</label>
                            <input type="time" id="dnd-end" class="form-input time-input">
                        </div>
                    </div>
                    
                    <div class="setting-description">
                        <i class="mdi mdi-information-outline"></i> Emergency notifications will still be delivered during Do Not Disturb hours
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Muted Audiences</h3>
                </div>
                <div class="card-content">
                    <p class="card-description">Select audiences you want to mute</p>
                    
                    <div class="muted-audiences-list" id="muted-audiences-list">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <p>Loading audiences...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const saveBtn = preferencesSection.querySelector('#save-preferences-btn');
    const dndCheckbox = preferencesSection.querySelector('#pref-dnd');
    const dndTimeSettings = preferencesSection.querySelector('#dnd-time-settings');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => savePreferences());
    }
    
    if (dndCheckbox && dndTimeSettings) {
        dndCheckbox.addEventListener('change', () => {
            dndTimeSettings.style.display = dndCheckbox.checked ? 'flex' : 'none';
        });
    }
    
    // Load user preferences
    loadUserPreferences();
}

async function loadUserPreferences() {
    try {
        // Get user preferences from API
        const preferences = await getUserPreferences();
        
        // Update UI with preferences
        const browserCheckbox = document.getElementById('pref-browser');
        const mobileCheckbox = document.getElementById('pref-mobile');
        const emailCheckbox = document.getElementById('pref-email');
        
        const lowCheckbox = document.getElementById('pref-low');
        const mediumCheckbox = document.getElementById('pref-medium');
        const highCheckbox = document.getElementById('pref-high');
        const emergencyCheckbox = document.getElementById('pref-emergency');
        
        const dndCheckbox = document.getElementById('pref-dnd');
        const dndStart = document.getElementById('dnd-start');
        const dndEnd = document.getElementById('dnd-end');
        const dndTimeSettings = document.getElementById('dnd-time-settings');
        
        // Notification channels
        if (browserCheckbox) browserCheckbox.checked = preferences.notificationChannels.browser;
        if (mobileCheckbox) mobileCheckbox.checked = preferences.notificationChannels.mobile;
        if (emailCheckbox) emailCheckbox.checked = preferences.notificationChannels.email;
        
        // Priorities
        if (lowCheckbox) lowCheckbox.checked = preferences.priorities.low;
        if (mediumCheckbox) mediumCheckbox.checked = preferences.priorities.medium;
        if (highCheckbox) highCheckbox.checked = preferences.priorities.high;
        if (emergencyCheckbox) {
            emergencyCheckbox.checked = preferences.priorities.emergency;
            // Emergency is always required
            emergencyCheckbox.disabled = emergencyCheckbox.checked;
        }
        
        // Do Not Disturb
        if (dndCheckbox) {
            dndCheckbox.checked = preferences.doNotDisturb.enabled;
            if (dndTimeSettings) {
                dndTimeSettings.style.display = dndCheckbox.checked ? 'flex' : 'none';
            }
        }
        
        if (dndStart) dndStart.value = preferences.doNotDisturb.startTime;
        if (dndEnd) dndEnd.value = preferences.doNotDisturb.endTime;
        
        // Load muted audiences
        loadMutedAudiences(preferences.muteAudiences || []);
        
    } catch (error) {
        console.error('Failed to load preferences:', error);
        showNotification('Failed to load preferences. Using defaults.', 'warning');
    }
}

function loadMutedAudiences(mutedAudiences) {
    const audiencesList = document.getElementById('muted-audiences-list');
    if (!audiencesList) return;
    
    // Get all available audiences
    const audiences = STATE.audiences.length > 0 ? 
        STATE.audiences : 
        [
            { id: 'browser', name: 'Browser' },
            { id: 'mobile', name: 'Mobile' },
            { id: 'email', name: 'Email' },
            { id: 'slack', name: 'Slack' },
            { id: 'webhook', name: 'Webhooks' }
        ];
    
    if (audiences.length === 0) {
        audiencesList.innerHTML = `
            <div class="empty-state">
                <i class="mdi mdi-account-off"></i>
                <p>No audiences available</p>
            </div>
        `;
        return;
    }
    
    // Create checkbox for each audience
    audiencesList.innerHTML = audiences.map(audience => {
        const isMuted = mutedAudiences.includes(audience.id);
        return `
            <div class="form-group">
                <div class="checkbox-wrapper">
                    <input type="checkbox" id="mute-${audience.id}" class="checkbox-input mute-audience-checkbox" 
                        data-audience-id="${audience.id}" ${isMuted ? 'checked' : ''}>
                    <label for="mute-${audience.id}" class="checkbox-label">${audience.name || audience.id}</label>
                </div>
            </div>
        `;
    }).join('');
}

async function savePreferences() {
    // Collect preferences from UI
    const preferences = {
        notificationChannels: {
            browser: document.getElementById('pref-browser').checked,
            mobile: document.getElementById('pref-mobile').checked,
            email: document.getElementById('pref-email').checked
        },
        priorities: {
            low: document.getElementById('pref-low').checked,
            medium: document.getElementById('pref-medium').checked,
            high: document.getElementById('pref-high').checked,
            emergency: document.getElementById('pref-emergency').checked
        },
        doNotDisturb: {
            enabled: document.getElementById('pref-dnd').checked,
            startTime: document.getElementById('dnd-start').value,
            endTime: document.getElementById('dnd-end').value
        },
        muteAudiences: []
    };
    
    // Collect muted audiences
    document.querySelectorAll('.mute-audience-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            preferences.muteAudiences.push(checkbox.dataset.audienceId);
        }
    });
    
    // Validate
    if (preferences.doNotDisturb.enabled) {
        if (!preferences.doNotDisturb.startTime || !preferences.doNotDisturb.endTime) {
            showNotification('Please set both start and end times for Do Not Disturb mode', 'error');
            return;
        }
    }
    
    // Emergency is always required
    preferences.priorities.emergency = true;
    
    try {
        // Save preferences
        showNotification('Saving preferences...', 'info');
        
        await saveUserPreferences(preferences);
        
        showNotification('Preferences saved successfully', 'success');
    } catch (error) {
        console.error('Error saving preferences:', error);
        showNotification('Failed to save preferences: ' + error.message, 'error');
    }
}

function initAudiencesConfig() {
    console.log('Initializing audiences configuration');
    
    const audiencesSection = document.getElementById('audiences-section');
    if (!audiencesSection) return;
    
    // Replace placeholder with proper content
    audiencesSection.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Audience Configuration</h2>
            <div class="section-actions">
                <button class="btn btn-secondary" id="refresh-audiences-btn">
                    <i class="mdi mdi-refresh"></i> Refresh
                </button>
                <button class="btn btn-primary" id="add-audience-btn">
                    <i class="mdi mdi-account-plus"></i> Add Audience
                </button>
            </div>
        </div>
        
        <div class="audiences-grid">
            <div class="card table-card">
                <div class="card-header">
                    <h3 class="card-title">Active Audiences</h3>
                    <div class="card-actions">
                        <div class="search-input-wrapper">
                            <input type="text" id="audience-search" class="search-input" placeholder="Search audiences...">
                            <button class="search-btn" id="audience-search-btn">
                                <i class="mdi mdi-magnify"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-content">
                    <div class="table-responsive">
                        <table class="data-table" id="audiences-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Messages</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="audiences-table-body">
                                <tr>
                                    <td colspan="5" class="loading-cell">
                                        <div class="loading-spinner">
                                            <div class="spinner"></div>
                                            <p>Loading audiences...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add/Edit Audience Modal -->
        <div class="modal" id="audience-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="audience-modal-title">Add New Audience</h3>
                    <button class="modal-close" id="close-audience-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="audience-form">
                        <div class="form-group">
                            <label for="audience-name" class="form-label">Audience Name</label>
                            <input type="text" id="audience-name" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="audience-type" class="form-label">Audience Type</label>
                            <select id="audience-type" class="form-input" required>
                                <option value="">Select a type</option>
                                <option value="device">Device</option>
                                <option value="person">Person</option>
                                <option value="group">Group</option>
                                <option value="service">Service</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="audience-description" class="form-label">Description</label>
                            <textarea id="audience-description" class="form-input" rows="3"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Default Platforms</label>
                            <div class="checkbox-grid">
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" id="platform-browser" class="checkbox-input">
                                    <label for="platform-browser" class="checkbox-label">Browser</label>
                                </div>
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" id="platform-mobile" class="checkbox-input">
                                    <label for="platform-mobile" class="checkbox-label">Mobile</label>
                                </div>
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" id="platform-email" class="checkbox-input">
                                    <label for="platform-email" class="checkbox-label">Email</label>
                                </div>
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" id="platform-webhook" class="checkbox-input">
                                    <label for="platform-webhook" class="checkbox-label">Webhook</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="audience-tags" class="form-label">Default Tags</label>
                            <input type="text" id="audience-tags" class="form-input" placeholder="Enter tags separated by commas">
                            <div class="setting-description">
                                Tags will be automatically applied to notifications sent to this audience
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-audience-btn">Cancel</button>
                    <button class="btn btn-primary" id="save-audience-btn">Save</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const refreshBtn = audiencesSection.querySelector('#refresh-audiences-btn');
    const addAudienceBtn = audiencesSection.querySelector('#add-audience-btn');
    const closeModalBtn = audiencesSection.querySelector('#close-audience-modal');
    const cancelBtn = audiencesSection.querySelector('#cancel-audience-btn');
    const saveBtn = audiencesSection.querySelector('#save-audience-btn');
    const searchBtn = audiencesSection.querySelector('#audience-search-btn');
    const searchInput = audiencesSection.querySelector('#audience-search');
    const modal = audiencesSection.querySelector('#audience-modal');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAudiences());
    }
    
    if (addAudienceBtn && modal) {
        addAudienceBtn.addEventListener('click', () => {
            openAudienceModal();
        });
    }
    
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveAudience());
    }
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            loadAudiences(searchInput.value);
        });
        
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                loadAudiences(searchInput.value);
            }
        });
    }
    
    // Load audiences
    loadAudiences();
}

async function loadAudiences(search = '') {
    const tableBody = document.getElementById('audiences-table-body');
    if (!tableBody) return;
    
    // Show loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-cell">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading audiences...</p>
                </div>
            </td>
        </tr>
    `;
    
    try {
        // Get audiences from API
        const audiences = await fetchAudiences(search);
        
        STATE.audiences = audiences;
        
        // If no audiences
        if (!audiences || audiences.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">
                        <div class="empty-state">
                            <i class="mdi mdi-account-group-outline"></i>
                            <p>No audiences found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render audiences
        tableBody.innerHTML = audiences.map(audience => {
            const statusClass = audience.active ? 'status-active' : 'status-inactive';
            const messageCount = audience.messageCount || 0;
            
            return `
                <tr data-audience-id="${audience.id}">
                    <td>${audience.name}</td>
                    <td>${audience.type || 'Standard'}</td>
                    <td><span class="status-badge ${statusClass}">${audience.active ? 'Active' : 'Inactive'}</span></td>
                    <td>${messageCount}</td>
                    <td class="actions-cell">
                        <button class="icon-btn edit-audience-btn" title="Edit audience">
                            <i class="mdi mdi-pencil"></i>
                        </button>
                        <button class="icon-btn delete-audience-btn" title="Delete audience">
                            <i class="mdi mdi-delete"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Add event listeners for buttons
        tableBody.querySelectorAll('.edit-audience-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const audienceId = btn.closest('tr').dataset.audienceId;
                openAudienceModal(audienceId);
            });
        });
        
        tableBody.querySelectorAll('.delete-audience-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const audienceId = btn.closest('tr').dataset.audienceId;
                const audience = audiences.find(a => a.id === audienceId);
                
                if (confirm(`Are you sure you want to delete the audience "${audience.name}"?`)) {
                    try {
                        await deleteAudience(audienceId);
                        showNotification('Audience deleted successfully', 'success');
                        loadAudiences();
                    } catch (error) {
                        showNotification('Failed to delete audience: ' + error.message, 'error');
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to load audiences:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="error-cell">
                    <div class="error-state">
                        <i class="mdi mdi-alert"></i>
                        <p>Failed to load audiences: ${error.message}</p>
                        <button class="btn btn-outline retry-btn">Retry</button>
                    </div>
                </td>
            </tr>
        `;
        
        const retryBtn = tableBody.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadAudiences(search));
        }
    }
}

function openAudienceModal(audienceId = null) {
    const modal = document.getElementById('audience-modal');
    const modalTitle = document.getElementById('audience-modal-title');
    const form = document.getElementById('audience-form');
    const nameInput = document.getElementById('audience-name');
    const typeSelect = document.getElementById('audience-type');
    const descriptionTextarea = document.getElementById('audience-description');
    const tagsInput = document.getElementById('audience-tags');
    
    if (!modal || !form) return;
    
    // Clear form
    form.reset();
    
    // Set title and button text
    if (audienceId) {
        // Editing existing audience
        modalTitle.textContent = 'Edit Audience';
        document.getElementById('save-audience-btn').textContent = 'Update';
        
        // Find audience data
        const audience = STATE.audiences.find(a => a.id === audienceId);
        if (audience) {
            // Populate form
            nameInput.value = audience.name || '';
            typeSelect.value = audience.type || '';
            descriptionTextarea.value = audience.description || '';
            tagsInput.value = Array.isArray(audience.tags) ? audience.tags.join(', ') : '';
            
            // Set platforms
            if (audience.platforms) {
                document.getElementById('platform-browser').checked = audience.platforms.includes('browser');
                document.getElementById('platform-mobile').checked = audience.platforms.includes('mobile');
                document.getElementById('platform-email').checked = audience.platforms.includes('email');
                document.getElementById('platform-webhook').checked = audience.platforms.includes('webhook');
            }
            
            // Set data attribute for ID
            form.dataset.audienceId = audienceId;
        }
    } else {
        // Adding new audience
        modalTitle.textContent = 'Add New Audience';
        document.getElementById('save-audience-btn').textContent = 'Save';
        
        // Clear data attribute
        delete form.dataset.audienceId;
    }
    
    // Show modal
    modal.style.display = 'block';
}

async function saveAudience() {
    const form = document.getElementById('audience-form');
    const nameInput = document.getElementById('audience-name');
    const typeSelect = document.getElementById('audience-type');
    const descriptionTextarea = document.getElementById('audience-description');
    const tagsInput = document.getElementById('audience-tags');
    
    if (!form || !nameInput || !typeSelect) return;
    
    // Validate
    if (!nameInput.value.trim()) {
        showNotification('Please enter an audience name', 'error');
        nameInput.focus();
        return;
    }
    
    if (!typeSelect.value) {
        showNotification('Please select an audience type', 'error');
        typeSelect.focus();
        return;
    }
    
    // Collect form data
    const audienceData = {
        name: nameInput.value.trim(),
        type: typeSelect.value,
        description: descriptionTextarea.value.trim(),
        platforms: [],
        tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    // Collect platforms
    if (document.getElementById('platform-browser').checked) audienceData.platforms.push('browser');
    if (document.getElementById('platform-mobile').checked) audienceData.platforms.push('mobile');
    if (document.getElementById('platform-email').checked) audienceData.platforms.push('email');
    if (document.getElementById('platform-webhook').checked) audienceData.platforms.push('webhook');
    
    // Determine if we're adding or updating
    const audienceId = form.dataset.audienceId;
    const isUpdate = !!audienceId;
    
    try {
        if (isUpdate) {
            // Update existing audience
            audienceData.id = audienceId;
            await updateAudience(audienceData);
            showNotification('Audience updated successfully', 'success');
        } else {
            // Add new audience
            await createAudience(audienceData);
            showNotification('Audience created successfully', 'success');
        }
        
        // Close modal
        document.getElementById('audience-modal').style.display = 'none';
        
        // Reload audiences
        loadAudiences();
        
    } catch (error) {
        console.error('Error saving audience:', error);
        showNotification(`Failed to ${isUpdate ? 'update' : 'create'} audience: ${error.message}`, 'error');
    }
}

async function fetchAudiences(search = '') {
    try {
        // Build query string
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/audiences${queryString}`);
        const data = await response.json();
        
        if (data.status === 'ok' && Array.isArray(data.audiences)) {
            return data.audiences;
        } else {
            throw new Error(data.message || 'Failed to retrieve audiences');
        }
    } catch (error) {
        console.error('Error fetching audiences:', error);
        
        // Return mock data for development
        if (CONFIG.debug) {
            console.log('Using mock audience data');
            return [
                {
                    id: 'browser-1',
                    name: 'Browser Notifications',
                    type: 'device',
                    active: true,
                    messageCount: 142,
                    platforms: ['browser'],
                    tags: ['browser', 'ui']
                },
                {
                    id: 'mobile-1',
                    name: 'Mobile Devices',
                    type: 'device',
                    active: true,
                    messageCount: 89,
                    platforms: ['mobile'],
                    tags: ['mobile', 'app']
                },
                {
                    id: 'admin-team',
                    name: 'Administrators',
                    type: 'group',
                    active: true,
                    messageCount: 56,
                    platforms: ['browser', 'mobile', 'email'],
                    tags: ['admin', 'urgent']
                },
                {
                    id: 'support',
                    name: 'Support Team',
                    type: 'group',
                    active: false,
                    messageCount: 34,
                    platforms: ['browser', 'email'],
                    tags: ['support', 'ticket']
                },
                {
                    id: 'webhook-1',
                    name: 'External Systems',
                    type: 'service',
                    active: true,
                    messageCount: 203,
                    platforms: ['webhook'],
                    tags: ['webhook', 'external']
                }
            ];
        }
        
        throw error;
    }
}

async function createAudience(audienceData) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/audiences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audienceData)
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to create audience');
        }
    } catch (error) {
        console.error('Error creating audience:', error);
        throw error;
    }
}

async function updateAudience(audienceData) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/audiences/${audienceData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audienceData)
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to update audience');
        }
    } catch (error) {
        console.error('Error updating audience:', error);
        throw error;
    }
}

async function deleteAudience(audienceId) {
    try {
        const response = await fetchWithTimeout(`${CONFIG.apiBase}/api/audiences/${audienceId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data;
        } else {
            throw new Error(data.message || 'Failed to delete audience');
        }
    } catch (error) {
        console.error('Error deleting audience:', error);
        throw error;
    }
}

function initHelpSection() {
    console.log('Initializing help section');
    
    const helpSection = document.getElementById('help-section');
    if (!helpSection) return;
    
    // Replace placeholder with proper content
    helpSection.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Help & Documentation</h2>
        </div>
        
        <div class="help-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Quick Start Guide</h3>
                </div>
                <div class="card-content">
                    <div class="help-text">
                        <p>The Smart Notification Router helps you manage and route notifications to various audiences based on tags and other criteria.</p>
                        <p>Here's how to get started:</p>
                        
                        <ol class="help-steps">
                            <li>
                                <h4>Configure Your Audiences</h4>
                                <p>Go to the <a href="#audiences">Audience Config</a> section to set up different audience groups that will receive notifications.</p>
                            </li>
                            <li>
                                <h4>Set Up Tag Routing</h4>
                                <p>Use the <a href="/tag-manager">Tag Manager</a> to create rules for routing notifications based on their tags.</p>
                            </li>
                            <li>
                                <h4>Customize Your Preferences</h4>
                                <p>Adjust your <a href="#preferences">User Preferences</a> to control how and when you receive notifications.</p>
                            </li>
                            <li>
                                <h4>Start Sending Notifications</h4>
                                <p>Use the test notification feature on the Dashboard to verify your setup.</p>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">FAQ</h3>
                </div>
                <div class="card-content">
                    <div class="accordion" id="faq-accordion">
                        <div class="accordion-item">
                            <div class="accordion-header" id="faq-header-1">
                                <button class="accordion-button" type="button" data-toggle="collapse" data-target="#faq-content-1" aria-expanded="false" aria-controls="faq-content-1">
                                    What is tag-based routing?
                                </button>
                            </div>
                            <div id="faq-content-1" class="accordion-collapse collapse" aria-labelledby="faq-header-1">
                                <div class="accordion-body">
                                    <p>Tag-based routing allows you to automatically direct notifications to specific audiences based on tags attached to the notification. For example, a notification with the tag "security" might be routed to the "Admin" audience, while a notification with the tag "update" might go to all users.</p>
                                    <p>This approach provides a flexible way to ensure notifications reach the right people without having to manually specify recipients each time.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="accordion-item">
                            <div class="accordion-header" id="faq-header-2">
                                <button class="accordion-button" type="button" data-toggle="collapse" data-target="#faq-content-2" aria-expanded="false" aria-controls="faq-content-2">
                                    How do I create a new audience?
                                </button>
                            </div>
                            <div id="faq-content-2" class="accordion-collapse collapse" aria-labelledby="faq-header-2">
                                <div class="accordion-body">
                                    <p>To create a new audience:</p>
                                    <ol>
                                        <li>Navigate to the <a href="#audiences">Audience Config</a> section</li>
                                        <li>Click the "Add Audience" button</li>
                                        <li>Fill out the audience details form</li>
                                        <li>Select which platforms this audience should receive notifications on</li>
                                        <li>Add any default tags that should be applied to this audience</li>
                                        <li>Click "Save" to create the audience</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                        
                        <div class="accordion-item">
                            <div class="accordion-header" id="faq-header-3">
                                <button class="accordion-button" type="button" data-toggle="collapse" data-target="#faq-content-3" aria-expanded="false" aria-controls="faq-content-3">
                                    Can I temporarily disable notifications?
                                </button>
                            </div>
                            <div id="faq-content-3" class="accordion-collapse collapse" aria-labelledby="faq-header-3">
                                <div class="accordion-body">
                                    <p>Yes, you can use the Do Not Disturb feature in the <a href="#preferences">User Preferences</a> section to temporarily disable notifications during specific hours.</p>
                                    <p>Note that emergency notifications will still be delivered even when Do Not Disturb is enabled.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="accordion-item">
                            <div class="accordion-header" id="faq-header-4">
                                <button class="accordion-button" type="button" data-toggle="collapse" data-target="#faq-content-4" aria-expanded="false" aria-controls="faq-content-4">
                                    How do notification priorities work?
                                </button>
                            </div>
                            <div id="faq-content-4" class="accordion-collapse collapse" aria-labelledby="faq-header-4">
                                <div class="accordion-body">
                                    <p>Notifications can have one of four priority levels:</p>
                                    <ul>
                                        <li><strong>Low</strong>: Informational notifications with no urgency</li>
                                        <li><strong>Medium</strong>: Standard notifications (default)</li>
                                        <li><strong>High</strong>: Important notifications that require attention soon</li>
                                        <li><strong>Emergency</strong>: Critical alerts that require immediate attention</li>
                                    </ul>
                                    <p>You can filter which priority levels you want to receive in your user preferences, but emergency notifications cannot be completely disabled.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="accordion-item">
                            <div class="accordion-header" id="faq-header-5">
                                <button class="accordion-button" type="button" data-toggle="collapse" data-target="#faq-content-5" aria-expanded="false" aria-controls="faq-content-5">
                                    How can I integrate with other systems?
                                </button>
                            </div>
                            <div id="faq-content-5" class="accordion-collapse collapse" aria-labelledby="faq-header-5">
                                <div class="accordion-body">
                                    <p>The Smart Notification Router provides an API for integration with other systems. Common integration methods include:</p>
                                    <ul>
                                        <li><strong>REST API</strong>: Send notifications using HTTP POST requests</li>
                                        <li><strong>Webhooks</strong>: Configure webhook endpoints to receive notifications</li>
                                        <li><strong>Home Assistant Integration</strong>: Connect directly with Home Assistant entities</li>
                                    </ul>
                                    <p>For detailed integration documentation, please refer to our <a href="https://github.com/your-repo/smart-notification-router/wiki" target="_blank">GitHub Wiki</a>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Resources</h3>
                </div>
                <div class="card-content">
                    <div class="resources-grid">
                        <a href="#" class="resource-card" target="_blank">
                            <div class="resource-icon"><i class="mdi mdi-github"></i></div>
                            <div class="resource-content">
                                <h4>GitHub Repository</h4>
                                <p>Access the source code, report issues, and contribute</p>
                            </div>
                        </a>
                        
                        <a href="#" class="resource-card" target="_blank">
                            <div class="resource-icon"><i class="mdi mdi-book-open-page-variant"></i></div>
                            <div class="resource-content">
                                <h4>Documentation</h4>
                                <p>Detailed documentation and API reference</p>
                            </div>
                        </a>
                        
                        <a href="#" class="resource-card" target="_blank">
                            <div class="resource-icon"><i class="mdi mdi-frequently-asked-questions"></i></div>
                            <div class="resource-content">
                                <h4>Community Forum</h4>
                                <p>Ask questions and get help from the community</p>
                            </div>
                        </a>
                        
                        <a href="#" class="resource-card" target="_blank">
                            <div class="resource-icon"><i class="mdi mdi-video"></i></div>
                            <div class="resource-content">
                                <h4>Tutorial Videos</h4>
                                <p>Watch tutorials and demonstrations</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Contact Support</h3>
                </div>
                <div class="card-content">
                    <div class="support-content">
                        <p>Need additional help? Contact our support team:</p>
                        
                        <div class="support-options">
                            <a href="#" class="support-option">
                                <i class="mdi mdi-email"></i>
                                <span>Email Support</span>
                            </a>
                            
                            <a href="#" class="support-option">
                                <i class="mdi mdi-discord"></i>
                                <span>Discord Community</span>
                            </a>
                            
                            <a href="#" class="support-option">
                                <i class="mdi mdi-github"></i>
                                <span>Open Issue on GitHub</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize accordion functionality
    initAccordion();
}

function initAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-button');
    
    accordionItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = document.querySelector(item.dataset.target);
            if (!target) return;
            
            const isExpanded = item.getAttribute('aria-expanded') === 'true';
            
            // Toggle current item
            item.setAttribute('aria-expanded', !isExpanded);
            target.classList.toggle('collapse');
            
            // Add/remove 'active' class for styling
            if (!isExpanded) {
                item.classList.add('active');
                target.classList.add('show');
            } else {
                item.classList.remove('active');
                target.classList.remove('show');
            }
        });
    });
}

// Render notification history
function renderNotificationHistory(notifications, metadata) {
    const historyContainer = document.getElementById('notification-history-container');
    if (!historyContainer) return;
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    if (!notifications || notifications.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state">No notifications found</div>';
        return;
    }
    
    // Create a container for the notifications
    const notificationsList = document.createElement('div');
    notificationsList.className = 'notifications-list';
    
    // Add each notification to the list
    notifications.forEach(notification => {
        const date = new Date(notification.timestamp);
        const formattedDate = date.toLocaleString();
        
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        notificationItem.dataset.notificationId = notification.id;
        
        notificationItem.innerHTML = `
            <div class="notification-header">
                <h3 class="notification-title">${notification.title || 'Notification'}</h3>
                <span class="notification-timestamp">${formattedDate}</span>
            </div>
            <div class="notification-message">${notification.message || 'No content'}</div>
            <div class="notification-footer">
                <span class="priority-badge priority-${notification.priority || 'normal'}">${notification.priority || 'normal'}</span>
                ${notification.read ? 
                    '<span class="status-badge read">Read</span>' : 
                    '<span class="status-badge unread">Unread</span>'}
            </div>
        `;
        
        notificationsList.appendChild(notificationItem);
    });
    
    // Add the notifications list to the container
    historyContainer.appendChild(notificationsList);
    
    // Update pagination
    updatePagination(metadata);
    
    // Setup listeners for the notification items
    setupNotificationItemListeners();
}

// Update pagination controls
function updatePagination(metadata) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (!metadata || metadata.total_pages <= 1) {
        return; // No need for pagination if there's only one page
    }
    
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '← Previous';
    prevButton.disabled = metadata.current_page <= 1;
    prevButton.addEventListener('click', () => {
        loadNotificationHistory(metadata.current_page - 1, metadata.items_per_page);
    });
    
    // Page numbers
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${metadata.current_page} of ${metadata.total_pages}`;
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = metadata.current_page >= metadata.total_pages;
    nextButton.addEventListener('click', () => {
        loadNotificationHistory(metadata.current_page + 1, metadata.items_per_page);
    });
    
    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextButton);
    
    paginationContainer.appendChild(paginationControls);
}

// Update notification badge count
function updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Toggle notification read status
async function toggleNotificationRead(id, markAsRead) {
    try {
        const response = await fetch(`/api/notifications/${id}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: markAsRead })
        });
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to update notification');
        }
        
        return result;
    } catch (error) {
        console.error('Error toggling notification read status:', error);
        displayError(`Failed to ${markAsRead ? 'mark as read' : 'mark as unread'}`);
        return { success: false, error: error.message };
    }
}

// Helper functions for loading state
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>Loading...</p>
    `;
    
    container.innerHTML = '';
    container.appendChild(loadingIndicator);
}

function hideLoading(containerId) {
    // The loading indicator will be replaced when content is added
}

// Display error messages
function displayError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.textContent = message;
    
    // Show the error message for a few seconds
    document.body.appendChild(errorContainer);
    setTimeout(() => {
        errorContainer.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(errorContainer);
        }, 500);
    }, 3000);
}

// Simple document ready handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Create default UI if needed
    createDefaultUI();
    
    // Initialize components
    initStatusChecking();
    initTestNotification();
    initNavigation();
    initButtons();
    initUserContext();
    initDebugMode();
    
    // Initialize sections
    initNotificationHistory();
    initUserPreferences();
    initAudiencesConfig();
    initHelpSection();
    
    console.log('Initialization complete');
});