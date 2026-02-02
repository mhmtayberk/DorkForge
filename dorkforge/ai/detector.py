"""Hallucination detection for AI-generated dorks."""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


def detect_hallucination(dork: str, valid_operators: set) -> Tuple[bool, list[str]]:
    """Detect if AI hallucinated invalid dork syntax.
    
    Checks for:
    - Invalid operators (not in Google's operator set)
    - Invalid spacing (operator: value)
    - Unmatched quotes
    - Empty operators
    - Impossible operator combinations
    
    Args:
        dork: Generated dork query
        valid_operators: Set of valid Google operators
        
    Returns:
        Tuple of (is_valid, list_of_issues)
        If valid: (True, [])
        If invalid: (False, ["issue1", "issue2"])
        
    Example:
        >>> from dorkforge.core.validator import DorkValidator
        >>> validator = DorkValidator()
        >>> is_valid, issues = detect_hallucination(
        ...     "site:example.com badop:value",
        ...     validator.VALID_OPERATORS
        ... )
        >>> print(is_valid)
        False
        >>> print(issues)
        ['Unknown operator: badop']
    """
    issues = []
    
    # Check for invalid spacing
    if re.search(r'\w+:\s+', dork):
        issues.append("Invalid spacing after operator (should be operator:value not operator: value)")
    
    # Check for unmatched quotes
    if dork.count('"') % 2 != 0:
        issues.append("Unmatched quotes in query")
    
    # Extract operators
    operators = re.findall(r'(\w+):', dork)
    
    # Check for unknown operators
    for op in operators:
        if op.lower() not in valid_operators:
            issues.append(f"Unknown operator: {op}")
    
    # Check for empty operator values
    empty_ops = re.findall(r'(\w+):\s*(?:\s|$|OR|AND)', dork)
    if empty_ops:
        for op in empty_ops:
            issues.append(f'Empty value for operator: {op}')
    
    # Check for incompatible operator combinations
    operator_set = set(op.lower() for op in operators)
    
    if 'allintext' in operator_set and 'intext' in operator_set:
        issues.append("Cannot combine 'allintext' and 'intext'")
    
    if 'allintitle' in operator_set and 'intitle' in operator_set:
        issues.append("Cannot combine 'allintitle' and 'intitle'")
    
    if 'allinurl' in operator_set and 'inurl' in operator_set:
        issues.append("Cannot combine 'allinurl' and 'inurl'")
    
    # Check for multiple 'allin' operators
    allin_ops = [op for op in operator_set if op.startswith('allin')]
    if len(allin_ops) > 1:
        issues.append(f"Multiple 'allin' operators found: {allin_ops}. Use only one.")
    
    is_valid = len(issues) == 0
    
    if not is_valid:
        logger.warning(f"Hallucination detected in dork: {dork}")
        logger.warning(f"Issues: {issues}")
    
    return is_valid, issues


def auto_fix_common_issues(dork: str) -> str:
    """Attempt to auto-fix common AI hallucination issues.
    
    Fixes:
    - Remove extra spaces after operators
    - Remove markdown formatting (```, `)
    - Remove common prefixes (Dork:, Query:)
    
    Args:
        dork: Potentially malformed dork
        
    Returns:
        Fixed dork query
        
    Example:
        >>> fixed = auto_fix_common_issues("```site: example.com```")
        >>> print(fixed)
        site:example.com
    """
    # Remove markdown
    dork = dork.replace('```', '').replace('`', '').strip()
    
    # Remove common prefixes
    for prefix in ['Dork:', 'Query:', 'Google Dork:', 'Search:']:
        if dork.startswith(prefix):
            dork = dork[len(prefix):].strip()
    
    # Fix spacing after operators (operator: value -> operator:value)
    dork = re.sub(r'(\w+):\s+', r'\1:', dork)
    
    # Remove trailing/leading whitespace
    dork = dork.strip()
    
    logger.debug(f"Auto-fixed dork: {dork}")
    return dork
