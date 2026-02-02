"""Template data models."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Template:
    """Represents a dork template.
    
    A template defines a pattern for generating Google dorks with
    placeholder substitution.
    
    Attributes:
        pattern: Dork pattern with placeholders (e.g., "site:{domain} filetype:pdf")
        description: What this template finds
        category: Category this template belongs to
        params: Required parameters for substitution
        examples: Optional example outputs
    
    Example:
        >>> template = Template(
        ...     pattern="site:{domain} filetype:{ext}",
        ...     description="Find files of specific type",
        ...     category="documents",
        ...     params=["domain", "ext"],
        ...     examples=["site:example.com filetype:pdf"]
        ... )
    """

    pattern: str
    description: str
    category: str
    params: List[str] = field(default_factory=list)
    examples: Optional[List[str]] = None

    def __post_init__(self) -> None:
        """Validate template after initialization."""
        if not self.pattern:
            raise ValueError("Template pattern cannot be empty")
        if not self.category:
            raise ValueError("Template category cannot be empty")

    def render(self, parameters: dict) -> str:
        """Render template with provided parameters.
        
        Args:
            parameters: Dictionary of parameter values
            
        Returns:
            Rendered dork query string
            
        Raises:
            KeyError: If required parameter is missing
            
        Example:
            >>> template = Template(
            ...     pattern="site:{domain} filetype:pdf",
            ...     description="Find PDFs",
            ...     category="documents",
            ...     params=["domain"]
            ... )
            >>> dork = template.render({"domain": "example.com"})
            >>> print(dork)
            site:example.com filetype:pdf
        """
        try:
            return self.pattern.format(**parameters)
        except KeyError as e:
            raise KeyError(f"Missing required parameter: {e}")


@dataclass
class TemplateCategory:
    """Represents a category of templates.
    
    Categories group related templates together for organization
    and easy access.
    
    Attributes:
        name: Category name (e.g., "sensitive_files")
        description: Category description
        templates: List of templates in this category
    
    Example:
        >>> category = TemplateCategory(
        ...     name="sensitive_files",
        ...     description="Find sensitive files",
        ...     templates=[template1, template2]
        ... )
        >>> print(category.template_count)
        2
    """

    name: str
    description: str
    templates: List[Template] = field(default_factory=list)
    filters: Optional[List[dict]] = None

    @property
    def template_count(self) -> int:
        """Get number of templates in this category."""
        return len(self.templates)

    def add_template(self, template: Template) -> None:
        """Add a template to this category.
        
        Args:
            template: Template to add
        """
        self.templates.append(template)

    def get_templates(self) -> List[Template]:
        """Get all templates in this category.
        
        Returns:
            List of Template objects
        """
        return self.templates
