"""Core domain models for DorkForge."""

from dataclasses import dataclass, field
from typing import Dict, Optional
import re


@dataclass
class Dork:
    """Represents a Google dork query.
    
    A Dork encapsulates a Google search query with metadata about
    its purpose, category, and parameters used to generate it.
    
    Attributes:
        query: The actual Google dork query string
        category: Category this dork belongs to (e.g., "sensitive_files")
        description: Human-readable description of what this dork finds
        parameters: Parameters used in template substitution
        source: Source of dork generation ("template" or "ai")
    
    Example:
        >>> dork = Dork(
        ...     query="site:example.com filetype:pdf",
        ...     category="documents",
        ...     description="Find PDF files",
        ...     parameters={"domain": "example.com"}
        ... )
        >>> print(dork.query)
        site:example.com filetype:pdf
    """

    query: str
    category: str
    description: str
    parameters: Dict[str, str] = field(default_factory=dict)
    source: str = "template"

    def __post_init__(self) -> None:
        """Validate dork after initialization."""
        if not self.query:
            raise ValueError("Dork query cannot be empty")
        if not self.category:
            raise ValueError("Dork category cannot be empty")
        if self.source not in ["template", "ai"]:
            raise ValueError(f"Invalid source: {self.source}")

    def validate(self) -> bool:
        """Validate Google dork syntax.
        
        Performs basic syntax validation including:
        - Operator format (operator:value)
        - Quote matching
        - Valid operators
        
        Returns:
            True if syntax appears valid, False otherwise
            
        Note:
            This is basic validation. For comprehensive validation,
            use DorkValidator class.
        """
        # Check for basic syntax errors
        if not self.query.strip():
            return False

        # Check for unmatched quotes
        quote_count = self.query.count('"')
        if quote_count % 2 != 0:
            return False

        # Check for invalid operator spacing
        if re.search(r'\w+:\s+', self.query):
            return False

        return True

    def explain(self) -> str:
        """Generate human-readable explanation of this dork.
        
        Returns:
            Multi-line string explaining what this dork does
            
        Example:
            >>> dork = Dork(
            ...     query='site:example.com filetype:pdf intext:"password"',
            ...     category="sensitive_files",
            ...     description="Find PDFs containing passwords"
            ... )
            >>> print(dork.explain())
            Category: sensitive_files
            Description: Find PDFs containing passwords
            
            Query: site:example.com filetype:pdf intext:"password"
            
            This dork searches for:
            - Pages on domain: example.com
            - Files of type: pdf
            - Containing text: "password"
        """
        explanation_parts = [
            f"Category: {self.category}",
            f"Description: {self.description}",
            "",
            f"Query: {self.query}",
            "",
            "This dork searches for:",
        ]

        # Parse operators for explanation
        operators = self._parse_operators()
        for op, value in operators.items():
            if op == "site":
                explanation_parts.append(f"- Pages on domain: {value}")
            elif op == "filetype" or op == "ext":
                explanation_parts.append(f"- Files of type: {value}")
            elif op == "intext":
                explanation_parts.append(f"- Containing text: {value}")
            elif op == "intitle":
                explanation_parts.append(f"- With title containing: {value}")
            elif op == "inurl":
                explanation_parts.append(f"- With URL containing: {value}")

        return "\n".join(explanation_parts)

    def _parse_operators(self) -> Dict[str, str]:
        """Parse Google operators from query.
        
        Returns:
            Dictionary mapping operator names to their values
        """
        operators = {}
        # Simple regex to extract operator:value pairs
        pattern = r'(\w+):(".*?"|\S+)'
        matches = re.finditer(pattern, self.query)

        for match in matches:
            op, value = match.groups()
            # Remove quotes if present
            value = value.strip('"')
            operators[op.lower()] = value

        return operators

    def to_dict(self) -> Dict[str, any]:
        """Convert dork to dictionary for serialization.
        
        Returns:
            Dictionary representation of dork
        """
        return {
            "query": self.query,
            "category": self.category,
            "description": self.description,
            "parameters": self.parameters,
            "source": self.source,
        }

    def __str__(self) -> str:
        """String representation (just the query)."""
        return self.query

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return (
            f"Dork(query='{self.query}', category='{self.category}', "
            f"source='{self.source}')"
        )
