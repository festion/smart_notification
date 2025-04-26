"""
Tag Expression Parser

This module provides a parser for tag expressions used in the Smart Notification Router.
Tag expressions allow defining notification targets based on entity tags in Home Assistant.

Example expressions:
- "user:john" - All entities tagged with "user:john"
- "user:john+device:mobile" - All mobile devices owned by John
- "area:kitchen+device:speaker" - All speakers in the kitchen
- "user:john|user:jane" - All entities belonging to either John or Jane
- "area:home-area:bedroom" - All entities in the home but not in the bedroom

The parser converts these expressions into a structured format that can be evaluated
against entity tags to determine if an entity matches the expression.
"""

import re
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class OperatorType(Enum):
    """Enumeration of supported operators in tag expressions."""
    AND = '+'
    OR = '|'
    NOT = '-'


class TagNode:
    """Base class for nodes in the tag expression parse tree."""
    def evaluate(self, entity_tags):
        """Evaluate if entity tags match this node.
        
        Args:
            entity_tags: List of tags for an entity
            
        Returns:
            bool: True if the entity matches, False otherwise
        """
        raise NotImplementedError("Subclasses must implement evaluate()")
    
    def to_dict(self):
        """Convert node to dictionary representation.
        
        Returns:
            dict: Dictionary representation of node
        """
        raise NotImplementedError("Subclasses must implement to_dict()")


class TagLiteral(TagNode):
    """Node representing a literal tag in an expression."""
    def __init__(self, tag):
        """Initialize with a tag value.
        
        Args:
            tag: String tag value (e.g., "user:john")
        """
        self.tag = tag
    
    def evaluate(self, entity_tags):
        """Check if entity has this tag.
        
        Args:
            entity_tags: List of tags for an entity
            
        Returns:
            bool: True if entity has this tag
        """
        # Special case for wildcard tag
        if self.tag == "*":
            return True
        return self.tag in entity_tags
    
    def to_dict(self):
        """Convert to dictionary representation.
        
        Returns:
            dict: Dictionary with tag type and value
        """
        return {
            "type": "literal",
            "value": self.tag
        }
    
    def __str__(self):
        return f"Tag({self.tag})"


class TagOperator(TagNode):
    """Node representing an operator in a tag expression."""
    def __init__(self, operator_type, left, right=None):
        """Initialize with operator type and operands.
        
        Args:
            operator_type: Type of operator (AND, OR, NOT)
            left: Left operand node
            right: Right operand node (None for unary operators)
        """
        self.operator_type = operator_type
        self.left = left
        self.right = right
    
    def evaluate(self, entity_tags):
        """Evaluate operator node against entity tags.
        
        Args:
            entity_tags: List of tags for an entity
            
        Returns:
            bool: Result of evaluating the operator
        """
        if self.operator_type == OperatorType.AND:
            return self.left.evaluate(entity_tags) and self.right.evaluate(entity_tags)
        elif self.operator_type == OperatorType.OR:
            return self.left.evaluate(entity_tags) or self.right.evaluate(entity_tags)
        elif self.operator_type == OperatorType.NOT:
            return self.left.evaluate(entity_tags) and not self.right.evaluate(entity_tags)
        else:
            raise ValueError(f"Unknown operator type: {self.operator_type}")
    
    def to_dict(self):
        """Convert to dictionary representation.
        
        Returns:
            dict: Dictionary with operator type and operands
        """
        result = {
            "type": "operator",
            "operator": self.operator_type.name,
            "left": self.left.to_dict()
        }
        if self.right:
            result["right"] = self.right.to_dict()
        return result
    
    def __str__(self):
        if self.operator_type == OperatorType.AND:
            return f"({self.left} AND {self.right})"
        elif self.operator_type == OperatorType.OR:
            return f"({self.left} OR {self.right})"
        elif self.operator_type == OperatorType.NOT:
            return f"({self.left} NOT {self.right})"
        return f"Op({self.operator_type}, {self.left}, {self.right})"


class TagExpressionParser:
    """Parser for tag expressions.
    
    Converts string tag expressions into a parse tree that can be evaluated
    against entity tags.
    """
    
    def __init__(self):
        """Initialize the parser."""
        # Regular expression to validate tag format
        self.tag_pattern = re.compile(r'^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$')
    
    def parse(self, expression):
        """Parse a tag expression into a structured representation.
        
        Args:
            expression (str): A tag expression like "user:john+device:mobile"
            
        Returns:
            TagNode: Root node of the parse tree
        """
        if not expression or not isinstance(expression, str):
            raise ValueError("Expression must be a non-empty string")
            
        # Check for standalone operators which are invalid
        if expression in ['+', '|', '-']:
            raise ValueError(f"Invalid expression: '{expression}' is a standalone operator")
            
        # Check for trailing operators which are invalid
        if expression.endswith('+') or expression.endswith('|') or expression.endswith('-'):
            raise ValueError(f"Invalid expression: '{expression}' has a trailing operator")
            
        # Check for leading operators other than NOT which are invalid
        if expression.startswith('+') or expression.startswith('|'):
            raise ValueError(f"Invalid expression: '{expression}' has a leading operator")
        
        # Start with parsing OR operator (lowest precedence)
        return self._parse_or(expression)
    
    def _parse_or(self, expression):
        """Parse an OR expression.
        
        Args:
            expression (str): Tag expression
            
        Returns:
            TagNode: Root node of the parse tree
        """
        # Split by OR operator
        parts = []
        current = ""
        depth = 0
        for char in expression:
            if char == '(' and not (current and current[-1] == '\\'): 
                depth += 1
            elif char == ')' and not (current and current[-1] == '\\'):
                depth -= 1
            
            if char == OperatorType.OR.value and depth == 0:
                parts.append(current)
                current = ""
            else:
                current += char
        
        if current:
            parts.append(current)
        
        # If there's only one part, there's no OR operator
        if len(parts) == 1:
            return self._parse_and(parts[0].strip())
        
        # Process left-to-right for multiple OR operators
        node = self._parse_and(parts[0].strip())
        for part in parts[1:]:
            node = TagOperator(OperatorType.OR, node, self._parse_and(part.strip()))
        
        return node
    
    def _parse_and(self, expression):
        """Parse an AND expression.
        
        Args:
            expression (str): Tag expression
            
        Returns:
            TagNode: Root node of the parse tree
        """
        # Split by AND operator
        parts = []
        current = ""
        depth = 0
        for char in expression:
            if char == '(' and not (current and current[-1] == '\\'): 
                depth += 1
            elif char == ')' and not (current and current[-1] == '\\'):
                depth -= 1
            
            if char == OperatorType.AND.value and depth == 0:
                parts.append(current)
                current = ""
            else:
                current += char
        
        if current:
            parts.append(current)
        
        # If there's only one part, there's no AND operator
        if len(parts) == 1:
            return self._parse_not(parts[0].strip())
        
        # Process left-to-right for multiple AND operators
        node = self._parse_not(parts[0].strip())
        for part in parts[1:]:
            node = TagOperator(OperatorType.AND, node, self._parse_not(part.strip()))
        
        return node
    
    def _parse_not(self, expression):
        """Parse a NOT expression.
        
        Args:
            expression (str): Tag expression
            
        Returns:
            TagNode: Root node of the parse tree
        """
        # Split by NOT operator
        parts = []
        current = ""
        depth = 0
        for char in expression:
            if char == '(' and not (current and current[-1] == '\\'): 
                depth += 1
            elif char == ')' and not (current and current[-1] == '\\'):
                depth -= 1
            
            if char == OperatorType.NOT.value and depth == 0:
                parts.append(current)
                current = ""
            else:
                current += char
        
        if current:
            parts.append(current)
        
        # If there's only one part, there's no NOT operator
        if len(parts) == 1:
            return self._parse_atom(parts[0].strip())
        
        # Process left-to-right for NOT operator
        node = self._parse_atom(parts[0].strip())
        for part in parts[1:]:
            node = TagOperator(OperatorType.NOT, node, self._parse_atom(part.strip()))
        
        return node
    
    def _parse_atom(self, expression):
        """Parse an atomic expression (tag or parenthesized expression).
        
        Args:
            expression (str): Tag expression
            
        Returns:
            TagNode: Root node of the parse tree
        """
        expression = expression.strip()
        
        # Empty expression
        if not expression:
            raise ValueError("Empty expression")
        
        # Parenthesized expression
        if expression.startswith('(') and expression.endswith(')'):
            return self.parse(expression[1:-1].strip())
        
        # Validate tag format
        if not self.tag_pattern.match(expression):
            raise ValueError(f"Invalid tag format: {expression}")
        
        return TagLiteral(expression)
    
    def evaluate(self, expression, entity_tags):
        """Evaluate if an entity's tags match the expression.
        
        Args:
            expression (str): Tag expression
            entity_tags (list): List of tags for an entity
            
        Returns:
            bool: True if the entity matches the expression
        """
        if not expression:
            return False
        
        try:
            parse_tree = self.parse(expression)
            return parse_tree.evaluate(entity_tags)
        except Exception as e:
            logger.error(f"Error evaluating expression '{expression}': {e}")
            return False


# Helper function to create parser instance
def create_parser():
    """Create a new TagExpressionParser instance.
    
    Returns:
        TagExpressionParser: New parser instance
    """
    return TagExpressionParser()