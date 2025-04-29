/**
 * Smart Notification Router Dashboard Script - ROOT DEBUG VERSION
 */

// Very clear debug identifier
console.log('=== SMART NOTIFICATION ROUTER ROOT DEBUG ===');
console.log('Script location: /web/static/js/script.js (ROOT VERSION)');
console.log('Debug timestamp: ' + new Date().toISOString());
console.log('Version: v30-debug-root');

// Set scriptLoaded flag
window.scriptLoaded = true;

// Define required functions to prevent errors
function initStatusChecking() {
  console.log('ROOT initStatusChecking stub defined');
  const statusIndicator = document.getElementById('status-indicator');
  if (statusIndicator) {
    statusIndicator.className = 'mdi mdi-circle status-online';
  }
}

function initTestNotification() {
  console.log('ROOT initTestNotification stub defined');
}

function initAudiencesUI() {
  console.log('ROOT initAudiencesUI stub defined');
}

function initNavigation() {
  console.log('ROOT initNavigation stub defined');
}

function initButtons() {
  console.log('ROOT initButtons stub defined');
}

function initUserContext() {
  console.log('ROOT initUserContext stub defined');
}

function initDebugMode() {
  console.log('ROOT initDebugMode stub defined');
}

// Create debug visual indicator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('ROOT DEBUG: DOM content loaded');
  
  // Create a red debug indicator
  const debugIndicator = document.createElement('div');
  debugIndicator.style.position = 'fixed';
  debugIndicator.style.top = '10px';
  debugIndicator.style.left = '10px';
  debugIndicator.style.backgroundColor = '#cc0000';
  debugIndicator.style.color = 'white';
  debugIndicator.style.padding = '10px';
  debugIndicator.style.borderRadius = '5px';
  debugIndicator.style.zIndex = '10000';
  debugIndicator.textContent = 'LOADING ROOT VERSION v30-debug-root';
  document.body.appendChild(debugIndicator);
});