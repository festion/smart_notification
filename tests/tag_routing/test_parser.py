"""
Unit tests for the Tag Expression Parser.
"""

import unittest
from smart_notification_router.tag_routing.parser import (
    TagExpressionParser, TagLiteral, TagOperator, OperatorType
)


class TestTagExpressionParser(unittest.TestCase):
    """Test cases for the TagExpressionParser class."""
    
    def setUp(self):
        """Set up test environment."""
        self.parser = TagExpressionParser()
    
    def test_parse_single_tag(self):
        """Test parsing a single tag."""
        expression = "user:john"
        result = self.parser.parse(expression)
        
        self.assertIsInstance(result, TagLiteral)
        self.assertEqual(result.tag, "user:john")
    
    def test_parse_and_expression(self):
        """Test parsing an AND expression."""
        expression = "user:john+device:mobile"
        result = self.parser.parse(expression)
        
        self.assertIsInstance(result, TagOperator)
        self.assertEqual(result.operator_type, OperatorType.AND)
        self.assertIsInstance(result.left, TagLiteral)
        self.assertEqual(result.left.tag, "user:john")
        self.assertIsInstance(result.right, TagLiteral)
        self.assertEqual(result.right.tag, "device:mobile")
    
    def test_parse_or_expression(self):
        """Test parsing an OR expression."""
        expression = "user:john|user:jane"
        result = self.parser.parse(expression)
        
        self.assertIsInstance(result, TagOperator)
        self.assertEqual(result.operator_type, OperatorType.OR)
        self.assertIsInstance(result.left, TagLiteral)
        self.assertEqual(result.left.tag, "user:john")
        self.assertIsInstance(result.right, TagLiteral)
        self.assertEqual(result.right.tag, "user:jane")
    
    def test_parse_not_expression(self):
        """Test parsing a NOT expression."""
        expression = "area:home-area:bedroom"
        result = self.parser.parse(expression)
        
        self.assertIsInstance(result, TagOperator)
        self.assertEqual(result.operator_type, OperatorType.NOT)
        self.assertIsInstance(result.left, TagLiteral)
        self.assertEqual(result.left.tag, "area:home")
        self.assertIsInstance(result.right, TagLiteral)
        self.assertEqual(result.right.tag, "area:bedroom")
    
    def test_parse_complex_expression(self):
        """Test parsing a complex expression with multiple operators."""
        expression = "user:john+device:mobile|user:jane+device:speaker"
        result = self.parser.parse(expression)
        
        self.assertIsInstance(result, TagOperator)
        self.assertEqual(result.operator_type, OperatorType.OR)
        
        # Left side of OR should be "user:john+device:mobile"
        self.assertIsInstance(result.left, TagOperator)
        self.assertEqual(result.left.operator_type, OperatorType.AND)
        self.assertIsInstance(result.left.left, TagLiteral)
        self.assertEqual(result.left.left.tag, "user:john")
        self.assertIsInstance(result.left.right, TagLiteral)
        self.assertEqual(result.left.right.tag, "device:mobile")
        
        # Right side of OR should be "user:jane+device:speaker"
        self.assertIsInstance(result.right, TagOperator)
        self.assertEqual(result.right.operator_type, OperatorType.AND)
        self.assertIsInstance(result.right.left, TagLiteral)
        self.assertEqual(result.right.left.tag, "user:jane")
        self.assertIsInstance(result.right.right, TagLiteral)
        self.assertEqual(result.right.right.tag, "device:speaker")
    
    def test_parse_with_precedence(self):
        """Test that operators are evaluated with the correct precedence."""
        # NOT has highest precedence, then AND, then OR
        expression = "user:john+device:mobile-device:watch|user:jane"
        result = self.parser.parse(expression)
        
        # Root should be OR
        self.assertIsInstance(result, TagOperator)
        self.assertEqual(result.operator_type, OperatorType.OR)
        
        # Left side of OR should be "user:john+device:mobile-device:watch"
        self.assertIsInstance(result.left, TagOperator)
        self.assertEqual(result.left.operator_type, OperatorType.AND)
        
        # Left side of AND is "user:john"
        self.assertIsInstance(result.left.left, TagLiteral)
        self.assertEqual(result.left.left.tag, "user:john")
        
        # Right side of AND is "device:mobile-device:watch" (itself a NOT operation)
        self.assertIsInstance(result.left.right, TagOperator)
        self.assertEqual(result.left.right.operator_type, OperatorType.NOT)
        
        # Right side of OR should be "user:jane"
        self.assertIsInstance(result.right, TagLiteral)
        self.assertEqual(result.right.tag, "user:jane")
    
    def test_invalid_expression(self):
        """Test that invalid expressions raise appropriate errors."""
        # Empty expression
        with self.assertRaises(ValueError):
            self.parser.parse("")
        
        # Invalid tag format
        with self.assertRaises(ValueError):
            self.parser.parse("user")
        
        # Invalid operator usage
        with self.assertRaises(ValueError):
            self.parser.parse("user:john+")
        
        with self.assertRaises(ValueError):
            self.parser.parse("+user:john")
    
    def test_evaluate_single_tag(self):
        """Test evaluating a single tag expression."""
        expression = "user:john"
        entity_tags = ["user:john", "device:mobile"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        entity_tags = ["user:jane", "device:mobile"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
    
    def test_evaluate_and_expression(self):
        """Test evaluating an AND expression."""
        expression = "user:john+device:mobile"
        
        # Entity has both tags
        entity_tags = ["user:john", "device:mobile", "area:home"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity has only one tag
        entity_tags = ["user:john", "area:home"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
        
        # Entity has none of the tags
        entity_tags = ["user:jane", "device:speaker"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
    
    def test_evaluate_or_expression(self):
        """Test evaluating an OR expression."""
        expression = "user:john|user:jane"
        
        # Entity has first tag
        entity_tags = ["user:john", "device:mobile"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity has second tag
        entity_tags = ["user:jane", "device:speaker"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity has both tags
        entity_tags = ["user:john", "user:jane"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity has none of the tags
        entity_tags = ["user:bob", "device:tv"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
    
    def test_evaluate_not_expression(self):
        """Test evaluating a NOT expression."""
        expression = "area:home-area:bedroom"
        
        # Entity has first tag but not second
        entity_tags = ["area:home", "area:kitchen"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity has both tags
        entity_tags = ["area:home", "area:bedroom"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
        
        # Entity has neither tag
        entity_tags = ["area:office", "area:bathroom"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
    
    def test_evaluate_complex_expression(self):
        """Test evaluating a complex expression."""
        expression = "user:john+device:mobile|user:jane+device:speaker"
        
        # Entity matches first condition
        entity_tags = ["user:john", "device:mobile"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity matches second condition
        entity_tags = ["user:jane", "device:speaker"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity matches both conditions
        entity_tags = ["user:john", "device:mobile", "user:jane", "device:speaker"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertTrue(result)
        
        # Entity doesn't match either condition
        entity_tags = ["user:john", "device:speaker"]
        result = self.parser.evaluate(expression, entity_tags)
        self.assertFalse(result)
    
    def test_to_dict(self):
        """Test converting parse tree to dictionary representation."""
        expression = "user:john+device:mobile"
        result = self.parser.parse(expression)
        dict_repr = result.to_dict()
        
        self.assertEqual(dict_repr["type"], "operator")
        self.assertEqual(dict_repr["operator"], "AND")
        self.assertEqual(dict_repr["left"]["type"], "literal")
        self.assertEqual(dict_repr["left"]["value"], "user:john")
        self.assertEqual(dict_repr["right"]["type"], "literal")
        self.assertEqual(dict_repr["right"]["value"], "device:mobile")


if __name__ == "__main__":
    unittest.main()