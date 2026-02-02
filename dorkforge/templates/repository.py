"""Template repository for managing dork templates."""

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dorkforge.core.exceptions import TemplateNotFoundError
from dorkforge.templates.loader import TemplateLoader
from dorkforge.templates.models import Template, TemplateCategory

logger = logging.getLogger(__name__)


class TemplateRepository:
    """Repository for accessing dork templates.
    
    This class provides a caching layer over the TemplateLoader
    and a clean API for accessing templates by category.
    
    The repository uses LRU caching to avoid reloading templates
    from disk on every access.
    
    Attributes:
        loader: TemplateLoader instance
    
    Example:
        >>> repo = TemplateRepository()
        >>> category = repo.get_by_category("sensitive_files")
        >>> dorks = category.templates
        >>> print(len(dorks))
        10
    """

    def __init__(self, template_dir: Optional[Path] = None):
        """Initialize template repository.
        
        Args:
            template_dir: Directory containing template files.
                If None, uses default bundled templates.
        """
        self.loader = TemplateLoader(template_dir)
        logger.info("TemplateRepository initialized")

    @lru_cache(maxsize=32)
    def get_by_category(self, category: str) -> TemplateCategory:
        """Get all templates for a category (cached).
        
        Results are cached to avoid repeated file I/O. The cache
        will store up to 32 categories.
        
        Args:
            category: Category name (e.g., "sensitive_files")
            
        Returns:
            TemplateCategory object
            
        Raises:
            TemplateNotFoundError: If category doesn't exist
            
        Example:
            >>> repo = TemplateRepository()
            >>> category = repo.get_by_category("login_pages")
            >>> print(category.template_count)
            10
        """
        logger.debug(f"Loading category: {category}")
        return self.loader.load_category(category)

    def get_all_categories(self) -> list[str]:
        """List all available template categories.
        
        Returns:
            List of category names
            
        Example:
            >>> repo = TemplateRepository()
            >>> categories = repo.get_all_categories()
            >>> print(categories)
            ['api_endpoints', 'backup_files', 'cloud_buckets', ...]
        """
        return self.loader.list_available_categories()

    def add_custom_template(
        self, category: str, pattern: str, description: str, params: list[str]
    ) -> Template:
        """Add a custom template to a category (in-memory only).
        
        Note: This adds the template to the in-memory category object
        but does not persist it to disk. For persistent custom templates,
        create a YAML file in the template directory.
        
        Args:
            category: Category to add template to
            pattern: Dork pattern with placeholders
            description: Template description
            params: Required parameters
            
        Returns:
            The created Template object
            
        Raises:
            TemplateNotFoundError: If category doesn't exist
            
        Example:
            >>> repo = TemplateRepository()
            >>> template = repo.add_custom_template(
            ...     category="sensitive_files",
            ...     pattern="site:{domain} ext:secrets",
            ...     description="Find .secrets files",
            ...     params=["domain"]
            ... )
        """
        # Get category (this will raise if not found)
        category_obj = self.get_by_category(category)

        # Create new template
        template = Template(
            pattern=pattern,
            description=description,
            category=category,
            params=params,
        )

        # Add to category
        category_obj.add_template(template)

        # Clear cache for this category since we modified it
        self.clear_cache(category)

        logger.info(f"Added custom template to category '{category}': {pattern}")
        return template

    def clear_cache(self, category: Optional[str] = None) -> None:
        """Clear the template cache.
        
        Args:
            category: If provided, clear only this category.
                If None, clear entire cache.
                
        Example:
            >>> repo = TemplateRepository()
            >>> repo.clear_cache()  # Clear all
            >>> repo.clear_cache("sensitive_files")  # Clear specific
        """
        if category is None:
            self.get_by_category.cache_clear()
            logger.info("Cleared entire template cache")
        else:
            # This is a bit hacky but works for our use case
            # In production, you might want a more sophisticated caching strategy
            self.get_by_category.cache_clear()
            logger.info(f"Cleared cache for category '{category}'")

    def get_template_count(self) -> int:
        """Get total number of templates across all categories.
        
        Returns:
            Total template count
            
        Example:
            >>> repo = TemplateRepository()
            >>> count = repo.get_template_count()
            >>> print(f"Total templates: {count}")
            Total templates: 80
        """
        total = 0
        for category_name in self.get_all_categories():
            category = self.get_by_category(category_name)
            total += category.template_count

        return total

    def search_templates(self, keyword: str) -> list[Template]:
        """Search for templates by keyword in description or pattern.
        
        Args:
            keyword: Search keyword
            
        Returns:
            List of matching templates
            
        Example:
            >>> repo = TemplateRepository()
            >>> results = repo.search_templates("password")
            >>> for template in results:
            ...     print(template.description)
        """
        keyword_lower = keyword.lower()
        results = []

        for category_name in self.get_all_categories():
            category = self.get_by_category(category_name)
            for template in category.templates:
                if (
                    keyword_lower in template.description.lower()
                    or keyword_lower in template.pattern.lower()
                ):
                    results.append(template)

        logger.debug(f"Search for '{keyword}' returned {len(results)} results")
        return results
