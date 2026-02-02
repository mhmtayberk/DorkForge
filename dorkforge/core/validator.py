"""Dork validation engine."""

import logging
import re
from typing import Optional, Tuple

from dorkforge.core.dork import Dork
from dorkforge.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class DorkValidator:
    """Validates Google dork query syntax.
    
    This class provides comprehensive validation for Google search
    operators and their combinations, detecting common syntax errors
    and invalid operator usage.
    
    Attributes:
        valid_operators: Set of supported Google operators
        operator_rules: Dict mapping operators to validation rules
    
    Example:
        >>> validator = DorkValidator()
        >>> is_valid = validator.validate_syntax("site:example.com filetype:pdf")
        >>> print(is_valid)
        True
    """

    # Supported Google operators
    VALID_OPERATORS = {
        "site",
        "filetype",
        "ext",
        "intext",
        "allintext",
        "inurl",
        "allinurl",
        "intitle",
        "allintitle",
        "link",
        "cache",
        "related",
        "info",
    }

    def __init__(self):
        """Initialize dork validator."""
        logger.debug("DorkValidator initialized")

    def validate_syntax(self, query: str) -> bool:
        """Validate Google dork syntax.
        
        Checks for:
        - Empty query
        - Unmatched quotes
        - Invalid operator spacing
        - Unknown operators
        
        Args:
            query: Dork query string to validate
            
        Returns:
            True if syntax is valid, False otherwise
            
        Example:
            >>> validator = DorkValidator()
            >>> validator.validate_syntax("site:example.com")
            True
            >>> validator.validate_syntax("site: example.com")  # Space after operator
            False
        """
        if not query or not query.strip():
            logger.warning("Empty query")
            return False

        # Check for unmatched quotes
        quote_count = query.count('"')
        if quote_count % 2 != 0:
            logger.warning(f"Unmatched quotes in query: {query}")
            return False

        # Check for invalid operator spacing (operator: value)
        if re.search(r'\w+:\s+', query):
            logger.warning(f"Invalid operator spacing in query: {query}")
            return False

        # Check for unknown operators
        operators = re.findall(r'(\w+):', query)
        unknown_operators = [op for op in operators if op.lower() not in self.VALID_OPERATORS]

        if unknown_operators:
            logger.warning(f"Unknown operators in query: {unknown_operators}")
            # Don't fail entirely, just warn
            # Some operators might be new or less common

        return True

    def validate_dork(self, dork: Dork) -> Tuple[bool, Optional[str]]:
        """Validate a Dork object.
        
        Performs comprehensive validation including syntax check
        and operator compatibility.
        
        Args:
            dork: Dork object to validate
            
        Returns:
            Tuple of (is_valid, error_message)
            If valid: (True, None)
            If invalid: (False, "error description")
            
        Example:
            >>> dork = Dork(
            ...     query="site:example.com filetype:pdf",
            ...     category="documents",
            ...     description="Test"
            ... )
            >>> is_valid, error = validator.validate_dork(dork)
            >>> print(is_valid)
            True
        """
        # Use the Dork's built-in validation first
        if not dork.validate():
            return False, "Basic dork validation failed"

        # Then use comprehensive syntax validation
        if not self.validate_syntax(dork.query):
            return False, "Invalid Google operator syntax"

        # Check operator compatibility
        operators = self._parse_operators(dork.query)
        compatibility_error = self._check_operator_compatibility(operators)

        if compatibility_error:
            return False, compatibility_error

        logger.debug(f"Dork validation passed: {dork.query}")
        return True, None

    def explain_dork(self, query: str) -> str:
        """Generate human-readable explanation of a dork query.
        
        Args:
            query: Dork query string
            
        Returns:
            Multi-line explanation
            
        Example:
            >>> explanation = validator.explain_dork("site:example.com filetype:pdf")
            >>> print(explanation)
            This dork searches for:
            - Pages on domain: example.com
            - Files of type: pdf
        """
        operators = self._parse_operators(query)

        if not operators:
            return "No operators found in query"

        explanation_parts = ["This dork searches for:"]

        for op, value in operators.items():
            if op == "site":
                explanation_parts.append(f"- Pages on domain: {value}")
            elif op == "filetype" or op == "ext":
                explanation_parts.append(f"- Files of type: {value}")
            elif op == "intext" or op == "allintext":
                text_type = "containing all text" if op == "allintext" else "containing text"
                explanation_parts.append(f"- {text_type}: {value}")
            elif op == "intitle" or op == "allintitle":
                title_type = "with all title words" if op == "allintitle" else "with title containing"
                explanation_parts.append(f"- {title_type}: {value}")
            elif op == "inurl" or op == "allinurl":
                url_type = "with all URL words" if op == "allinurl" else "with URL containing"
                explanation_parts.append(f"- {url_type}: {value}")
            elif op == "link":
                explanation_parts.append(f"- Pages linking to: {value}")
            elif op == "cache":
                explanation_parts.append(f"- Google's cached version of: {value}")
            elif op == "related":
                explanation_parts.append(f"- Sites related to: {value}")
            elif op == "info":
                explanation_parts.append(f"- Information about: {value}")

        return "\n".join(explanation_parts)

    def detect_common_errors(self, query: str) -> list[str]:
        """Detect common dork syntax errors.
        
        Args:
            query: Dork query string
            
        Returns:
            List of error descriptions (empty if no errors)
            
        Example:
            >>> errors = validator.detect_common_errors("site: example.com")
            >>> print(errors)
            ['Invalid spacing after operator "site"']
        """
        errors = []

        # Check for spacing after operator
        spacing_errors = re.findall(r'(\w+):\s+', query)
        if spacing_errors:
            for op in spacing_errors:
                errors.append(f'Invalid spacing after operator "{op}"')

        # Check for unmatched quotes
        if query.count('"') % 2 != 0:
            errors.append("Unmatched quotes")

        # Check for empty operator values
        empty_operators = re.findall(r'(\w+):\s*(?:\s|$|OR|AND)', query)
        if empty_operators:
            for op in empty_operators:
                errors.append(f'Empty value for operator "{op}"')

        # Check for multiple 'allin' operators
        allin_operators = [op for op in re.findall(r'(\w+):', query) if op.startswith('allin')]
        if len(allin_operators) > 1:
            errors.append("Multiple 'allin' operators found (use only one)")

        return errors

    def _parse_operators(self, query: str) -> dict[str, str]:
        """Parse operators from query.
        
        Args:
            query: Dork query string
            
        Returns:
            Dictionary mapping operator names to values
        """
        operators = {}
        # Pattern to match operator:value pairs
        pattern = r'(\w+):(".*?"|\S+)'
        matches = re.finditer(pattern, query)

        for match in matches:
            op, value = match.groups()
            # Remove quotes if present
            value = value.strip('"')
            operators[op.lower()] = value

        return operators

    def _check_operator_compatibility(self, operators: dict[str, str]) -> Optional[str]:
        """Check if operators are compatible with each other.
        
        Args:
            operators: Dictionary of operators
            
        Returns:
            Error message if incompatible, None if compatible
        """
        # 'allin' operators should not be combined with their 'in' equivalents
        if "allintext" in operators and "intext" in operators:
            return "Cannot combine 'allintext' and 'intext'"

        if "allintitle" in operators and "intitle" in operators:
            return "Cannot combine 'allintitle' and 'intitle'"

        if "allinurl" in operators and "inurl" in operators:
            return "Cannot combine 'allinurl' and 'inurl'"

        # Only one 'allin' operator should be used at a time
        allin_ops = [op for op in operators if op.startswith("allin")]
        if len(allin_ops) > 1:
            return f"Multiple 'allin' operators found: {allin_ops}. Use only one."

        return None
