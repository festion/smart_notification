"""
Notification Router for Smart Notification Router.

This module handles the routing of notifications to appropriate Home Assistant services
based on severity levels and audience targeting.
"""

import logging
from typing import Dict, List, Any, Optional
from .ha_client import HomeAssistantAPIClient

logger = logging.getLogger(__name__)


class NotificationRouter:
    """Routes notifications to appropriate Home Assistant services."""

    def __init__(self, ha_client: HomeAssistantAPIClient, config: Dict[str, Any]):
        """Initialize the notification router.

        Args:
            ha_client: Home Assistant API client
            config: Configuration dictionary with audiences and severity levels
        """
        self.ha_client = ha_client
        self.config = config
        self.severity_levels = config.get(
            'severity_levels', ['low', 'medium', 'high', 'emergency'])

    def get_severity_level_index(self, severity: str) -> int:
        """Get the index of a severity level.

        Args:
            severity: Severity level string

        Returns:
            int: Index of severity level (higher is more severe), -1 if not found
        """
        try:
            return self.severity_levels.index(severity)
        except ValueError:
            logger.warning(f"Unknown severity level: {severity}")
            return -1

    def is_severity_at_least(self, check_severity: str, min_severity: str) -> bool:
        """Check if a severity level is at least a minimum level.

        Args:
            check_severity: Severity level to check
            min_severity: Minimum severity level

        Returns:
            bool: True if check_severity is at least min_severity
        """
        check_idx = self.get_severity_level_index(check_severity)
        min_idx = self.get_severity_level_index(min_severity)

        if check_idx == -1 or min_idx == -1:
            return False

        return check_idx >= min_idx

    def get_audience_services(self, audience_name: str, severity: str) -> List[str]:
        """Get services for an audience if severity meets minimum threshold.

        Args:
            audience_name: Name of the audience
            severity: Severity level of the notification

        Returns:
            List[str]: List of service names to call, empty if severity is too low
        """
        # Get audience configuration
        audience = self.config.get('audiences', {}).get(audience_name)
        if not audience:
            logger.warning(f"Unknown audience: {audience_name}")
            return []

        # Check if severity meets minimum threshold
        min_severity = audience.get('min_severity', 'low')
        if not self.is_severity_at_least(severity, min_severity):
            logger.info(
                f"Notification severity {severity} below minimum {min_severity} for audience {audience_name}")
            return []

        # Return services for this audience
        return audience.get('services', [])

    def route_notification(self, title: str, message: str, severity: str, audiences: List[str],
                           data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Route a notification to appropriate services.

        Args:
            title: Notification title
            message: Notification message
            severity: Severity level
            audiences: List of audience names
            data: Additional notification data (optional)

        Returns:
            Dict: Results of notification routing
        """
        results = {
            'success': True,
            'sent_to_services': [],
            'failed_services': [],
            'audiences_processed': []
        }

        # Track which services we've already called to avoid duplicates
        called_services = set()

        # Process each audience
        for audience_name in audiences:
            # Get services for this audience based on severity
            services = self.get_audience_services(audience_name, severity)

            # Track that we processed this audience
            audience_result = {
                'name': audience_name,
                'services_called': [],
                'services_skipped': [],
                'min_severity': self.config.get('audiences', {}).get(audience_name, {}).get('min_severity', 'low')
            }

            # Call each service
            for service_name in services:
                # Skip if we've already called this service
                if service_name in called_services:
                    audience_result['services_skipped'].append(service_name)
                    continue

                # Call the service
                try:
                    logger.info(
                        f"Sending notification to service: {service_name}")
                    response = self.ha_client.send_notification(
                        service_name, title, message, data)

                    # Check for errors
                    if 'error' in response:
                        logger.error(
                            f"Error sending notification to {service_name}: {response['error']}")
                        results['failed_services'].append({
                            'service': service_name,
                            'error': response['error']
                        })
                    else:
                        # Success!
                        called_services.add(service_name)
                        results['sent_to_services'].append(service_name)
                        audience_result['services_called'].append(service_name)

                except Exception as e:
                    logger.exception(
                        f"Exception sending notification to {service_name}")
                    results['failed_services'].append({
                        'service': service_name,
                        'error': str(e)
                    })

            # Add audience result to processed list
            results['audiences_processed'].append(audience_result)

        # Update success flag if we failed to deliver any notifications
        if not results['sent_to_services']:
            if results['failed_services']:
                results['success'] = False
                results['error'] = f"All service calls failed ({len(results['failed_services'])} failures)"
            else:
                results['info'] = "No services matched the notification criteria"

        return results
