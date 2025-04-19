document.addEventListener('DOMContentLoaded', function() {
    // Check service status
    checkStatus();
    
    // Initialize UI
    initAudiencesUI();
    initTestNotification();
    
    // Poll status every 30 seconds
    setInterval(checkStatus, 30000);
});

function checkStatus() {
    fetch('/status')
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
            
            dedupTime.textContent = data.deduplication_ttl;
            activeMessages.textContent = data.message_count;
        })
        .catch(error => {
            console.error('Status check failed:', error);
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            statusIndicator.className = 'mdi mdi-circle status-offline';
            statusText.textContent = 'Offline';
        });
}

function initAudiencesUI() {
    const container = document.getElementById('audiences-container');
    const addButton = document.getElementById('add-audience');
    const severityLevelsInput = document.getElementById('severity-levels');
    
    // Add audience handler
    addButton.addEventListener('click', function() {
        addAudienceEntry();
    });
    
    // Remove audience handler
    container.addEventListener('click', function(e) {
        if (e.target.closest('.remove-btn')) {
            const button = e.target.closest('.remove-btn');
            const entry = button.closest('.audience-entry');
            entry.remove();
        }
    });
    
    // Update severity options when severity levels change
    severityLevelsInput.addEventListener('change', function() {
        updateSeverityDropdowns();
    });
}

function addAudienceEntry(name = '', severity = '', services = []) {
    const container = document.getElementById('audiences-container');
    const severityLevels = document.getElementById('severity-levels').value
        .split(',')
        .map(level => level.trim())
        .filter(level => level !== '');
    
    const entry = document.createElement('div');
    entry.className = 'audience-entry';
    
    // Create name input
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
    
    // Create services input
    const servicesInput = document.createElement('input');
    servicesInput.type = 'text';
    servicesInput.name = 'audience_services';
    servicesInput.className = 'audience-services';
    servicesInput.placeholder = 'notify.service1, notify.service2';
    servicesInput.value = services.join(', ');
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.innerHTML = '<i class="mdi mdi-delete"></i>';
    
    // Append all elements
    entry.appendChild(nameInput);
    entry.appendChild(severitySelect);
    entry.appendChild(servicesInput);
    entry.appendChild(removeButton);
    
    container.appendChild(entry);
}

function updateSeverityDropdowns() {
    const severityLevels = document.getElementById('severity-levels').value
        .split(',')
        .map(level => level.trim())
        .filter(level => level !== '');
    
    const severityDropdowns = document.querySelectorAll('.audience-severity');
    
    severityDropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = '';
        
        severityLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            
            if (level === currentValue) {
                option.selected = true;
            }
            
            dropdown.appendChild(option);
        });
    });
    
    // Update test severity dropdown
    const testSeverity = document.getElementById('test-severity');
    const currentTestValue = testSeverity.value;
    testSeverity.innerHTML = '';
    
    severityLevels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        
        if (level === currentTestValue) {
            option.selected = true;
        }
        
        testSeverity.appendChild(option);
    });
}

function initTestNotification() {
    const sendButton = document.getElementById('send-test');
    
    sendButton.addEventListener('click', function() {
        const title = document.getElementById('test-title').value;
        const message = document.getElementById('test-message').value;
        const severity = document.getElementById('test-severity').value;
        
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

function sendTestNotification(title, message, severity, audience) {
    const payload = {
        title,
        message,
        severity,
        audience
    };
    
    fetch('/notify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'ok') {
            showTestResult('Notification sent successfully!', true);
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

function showTestResult(message, success) {
    const resultDiv = document.getElementById('test-result');
    
    resultDiv.textContent = message;
    resultDiv.className = success ? 'success-message' : 'error-message';
    resultDiv.classList.remove('hidden');
    
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 5000);
}