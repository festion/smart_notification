#!/usr/bin/env python3
"""
Tag Expression Parser Demo

This script demonstrates the usage of the TagExpressionParser to parse and
evaluate tag expressions for the Smart Notification Router.
"""

import sys
import os
import logging

# Add parent directory to path to import from smart_notification_router
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from smart_notification_router.tag_routing.parser import TagExpressionParser


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    """Main function to run the demo."""
    parser = TagExpressionParser()
    
    # Example entity tags
    entities = {
        "John's Phone": ["user:john", "device:mobile", "area:home"],
        "Jane's Speaker": ["user:jane", "device:speaker", "area:living_room"],
        "Kitchen Display": ["device:display", "area:kitchen"],
        "John's Tablet": ["user:john", "device:tablet", "area:bedroom"],
        "Living Room TV": ["device:tv", "area:living_room"],
    }
    
    # Example expressions
    expressions = [
        "user:john",
        "user:john+device:mobile",
        "user:john|user:jane",
        "area:home-area:bedroom",
        "user:john+device:mobile|user:jane+device:speaker",
        "area:living_room+device:speaker",
    ]
    
    print("\n===== Tag Expression Parser Demo =====\n")
    
    # Demonstrate parsing and evaluating expressions
    for expr in expressions:
        print(f"\nExpression: '{expr}'")
        try:
            # Parse the expression
            parse_tree = parser.parse(expr)
            print(f"  Parse Tree: {parse_tree}")
            
            # Convert to dictionary representation
            dict_repr = parse_tree.to_dict()
            print(f"  Dict Representation: {dict_repr}")
            
            # Evaluate expression against entity tags
            print("\n  Matching Entities:")
            for entity_name, entity_tags in entities.items():
                if parser.evaluate(expr, entity_tags):
                    print(f"    - {entity_name} {entity_tags}")
        
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\n===== Custom Expression =====\n")
    
    # Allow user to enter a custom expression
    while True:
        try:
            user_expr = input("\nEnter a tag expression (or 'q' to quit): ")
            if user_expr.lower() == 'q':
                break
            
            # Parse the expression
            parse_tree = parser.parse(user_expr)
            print(f"  Parse Tree: {parse_tree}")
            
            # Evaluate expression against entity tags
            print("\n  Matching Entities:")
            for entity_name, entity_tags in entities.items():
                if parser.evaluate(user_expr, entity_tags):
                    print(f"    - {entity_name} {entity_tags}")
            
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\nThank you for using the Tag Expression Parser Demo!")


if __name__ == "__main__":
    main()