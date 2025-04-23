#!/usr/bin/env python3
"""
Tag-Based Notification Demo

This script demonstrates sending notifications using the tag-based routing system
of the Smart Notification Router.

It sends sample notifications to different targets using tag expressions and
shows how the routing engine resolves these expressions to actual entities.
"""

import sys
import os
import logging
import requests
import json
import argparse
import time

# Add parent directory to path to import modules if running directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def send_notification(url, notification, verbose=False):
    """Send a notification through the Smart Notification Router.
    
    Args:
        url (str): URL of the notification endpoint
        notification (dict): Notification data including target, title, message, and severity
        verbose (bool): Whether to print verbose output
    
    Returns:
        dict: Response from the server or error information
    """
    try:
        if verbose:
            logger.info(f"Sending notification to {url}")
            logger.info(f"Notification data: {json.dumps(notification, indent=2)}")
        
        response = requests.post(url, json=notification, timeout=10)
        
        if verbose:
            logger.info(f"Response status code: {response.status_code}")
            
        if response.status_code == 200:
            result = response.json()
            if verbose:
                logger.info(f"Response: {json.dumps(result, indent=2)}")
            return result
        else:
            error_info = {
                "status": "error",
                "status_code": response.status_code,
                "message": f"Request failed with status code {response.status_code}"
            }
            
            try:
                error_info.update(response.json())
            except:
                error_info["raw_response"] = response.text
                
            logger.error(f"Error sending notification: {error_info['message']}")
            return error_info
            
    except Exception as e:
        logger.error(f"Exception sending notification: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


def resolve_tag_expression(url, expression, verbose=False):
    """Resolve a tag expression to entities using the resolution service.
    
    Args:
        url (str): Base URL of the Smart Notification Router API
        expression (str): Tag expression to resolve
        verbose (bool): Whether to print verbose output
    
    Returns:
        list: List of resolved entities
    """
    try:
        resolve_url = f"{url}/api/v2/resolve-tag"
        
        if verbose:
            logger.info(f"Resolving tag expression: {expression}")
        
        response = requests.post(
            resolve_url, 
            json={"expression": expression},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if verbose:
                logger.info(f"Resolution result: {json.dumps(result, indent=2)}")
            return result.get("entities", [])
        else:
            logger.error(f"Error resolving expression: {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Exception resolving expression: {e}")
        return []


def list_available_services(url, verbose=False):
    """List available notification services from Home Assistant.
    
    Args:
        url (str): Base URL of the Smart Notification Router API
        verbose (bool): Whether to print verbose output
    
    Returns:
        dict: Dictionary of available services by category
    """
    try:
        services_url = f"{url}/api/v2/services"
        
        if verbose:
            logger.info("Fetching available services")
        
        response = requests.get(services_url, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if verbose:
                logger.info(f"Services result: {json.dumps(result, indent=2)}")
            return result.get("services", {})
        else:
            logger.error(f"Error fetching services: {response.status_code}")
            return {}
            
    except Exception as e:
        logger.error(f"Exception fetching services: {e}")
        return {}


def run_demo(base_url, verbose=False):
    """Run the tag-based notification demo.
    
    Args:
        base_url (str): Base URL of the Smart Notification Router API
        verbose (bool): Whether to print verbose output
    """
    # Normalize base URL by removing trailing slash if present
    base_url = base_url.rstrip("/")
    
    # URLs for API endpoints
    notify_url = f"{base_url}/api/v2/notify"
    
    # Step 1: List available notification services
    print("\n=== Available Notification Services ===")
    services = list_available_services(base_url, verbose)
    
    if not services:
        print("No services found. Using example services instead.")
        services = {
            "notify": [
                "notify.mobile_app_phone",
                "notify.mobile_app_tablet"
            ],
            "media_player": [
                "media_player.living_room_speaker"
            ],
            "persistent": [
                "persistent_notification.create"
            ]
        }
    
    # Display available services
    for category, service_list in services.items():
        print(f"\n{category.upper()} Services:")
        for service in service_list:
            print(f"  - {service}")
    
    # Step 2: Show tag expression resolution
    print("\n=== Tag Expression Resolution ===")
    sample_expressions = [
        "user:john",
        "user:john+device:mobile",
        "area:home+device:speaker",
        "user:john|user:jane"
    ]
    
    for expr in sample_expressions:
        print(f"\nExpression: {expr}")
        entities = resolve_tag_expression(base_url, expr, verbose)
        
        if entities:
            print(f"  Resolved to {len(entities)} entities:")
            for entity in entities:
                print(f"  - {entity}")
        else:
            print("  No matching entities found")
            
            # For demonstration purposes, show example entities
            if "user:john" in expr:
                print("  Demo entities that would match:")
                print("  - notify.mobile_app_john_phone")
                print("  - notify.mobile_app_john_tablet")
            elif "area:home+device:speaker" in expr:
                print("  Demo entities that would match:")
                print("  - media_player.living_room_speaker")
                print("  - media_player.kitchen_speaker")
    
    # Step 3: Send example notifications
    print("\n=== Sending Example Notifications ===")
    
    example_notifications = [
        {
            "title": "Critical Alert",
            "message": "Water leak detected in basement!",
            "severity": "critical",
            "target": "user:all+device:mobile"
        },
        {
            "title": "Home Update",
            "message": "Front door has been open for 10 minutes",
            "severity": "high",
            "target": "area:home+device:speaker|user:homeowner+device:mobile"
        },
        {
            "title": "Weather Information",
            "message": "Rain expected in 30 minutes",
            "severity": "info",
            "target": "user:john"
        }
    ]
    
    for notification in example_notifications:
        print(f"\nSending notification: {notification['title']}")
        print(f"  Message: {notification['message']}")
        print(f"  Severity: {notification['severity']}")
        print(f"  Target: {notification['target']}")
        
        # For demo purposes, attempt to resolve the target expression
        target = notification["target"]
        entities = resolve_tag_expression(base_url, target, verbose)
        
        print(f"  Target would resolve to: {entities or 'No entities (using demo services)'}")
        
        # Send the notification
        if input("\nSend this notification? (y/n): ").lower() == "y":
            result = send_notification(notify_url, notification, verbose)
            
            if result.get("status") == "ok":
                print(f"  Success! Notification sent to {len(result.get('services', []))} services")
                if "services" in result:
                    for service in result["services"]:
                        print(f"    - {service}")
                if "tracking_id" in result:
                    print(f"  Tracking ID: {result['tracking_id']}")
            else:
                print(f"  Failed to send notification: {result.get('message', 'Unknown error')}")
        else:
            print("  Notification skipped")
        
        # Wait a moment before the next notification
        time.sleep(1)
    
    print("\n=== Demo Complete ===\n")
    print("The tag-based notification system allows routing notifications to specific")
    print("entities based on tag expressions that can include user, device, and area tags.")
    print("This enables dynamic routing based on user presence and device capabilities.")
    print("\nTo use in Home Assistant automations, call the API endpoint with appropriate tag expressions.")


def main():
    """Main function to parse arguments and run the demo."""
    parser = argparse.ArgumentParser(description="Tag-based notification demo")
    parser.add_argument(
        "--url", 
        type=str, 
        default="http://localhost:8080",
        help="Base URL of the Smart Notification Router"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    print("\n=== Smart Notification Router - Tag-Based Routing Demo ===\n")
    print(f"Using Smart Notification Router at: {args.url}")
    print("This demo will show how tag expressions can be used to dynamically route")
    print("notifications based on user, device, and location contexts.")
    
    # Run the demo
    run_demo(args.url, args.verbose)


if __name__ == "__main__":
    main()