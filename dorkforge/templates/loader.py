"""Template loader for YAML files."""

import logging
from pathlib import Path
from typing import Optional
import yaml

from dorkforge.core.exceptions import TemplateNotFoundError, ConfigurationError
from dorkforge.templates.models import Template, TemplateCategory

logger = logging.getLogger(__name__)


class TemplateLoader:
    """Loads dork templates from YAML files.
    
    This class handles reading and parsing YAML files containing
    dork templates, converting them into Template objects.
    
    Attributes:
        template_dir: Directory containing template YAML files
    
    Example:
        >>> loader = TemplateLoader()
        >>> category = loader.load_category("sensitive_files")
        >>> print(len(category.templates))
        10
    """

    def __init__(self, template_dir: Optional[Path] = None):
        """Initialize template loader.
        
        Args:
            template_dir: Directory containing template files.
                If None, uses default bundled templates.
        """
        if template_dir is None:
            # Default to bundled templates
            self.template_dir = Path(__file__).parent / "data"
        else:
            self.template_dir = template_dir

        if not self.template_dir.exists():
            raise ConfigurationError(f"Template directory not found: {self.template_dir}")

        logger.info(f"TemplateLoader initialized with directory: {self.template_dir}")

    def load_category(self, category_name: str) -> TemplateCategory:
        """Load all templates for a category from YAML file.
        
        Args:
            category_name: Name of the category (e.g., "sensitive_files")
            
        Returns:
            TemplateCategory object with loaded templates
            
        Raises:
            TemplateNotFoundError: If category file doesn't exist
            ConfigurationError: If YAML is malformed
            
        Example:
            >>> loader = TemplateLoader()
            >>> category = loader.load_category("login_pages")
            >>> for template in category.templates:
            ...     print(template.description)
        """
        yaml_file = self.template_dir / f"{category_name}.yaml"

        if not yaml_file.exists():
            logger.error(f"Template file not found: {yaml_file}")
            raise TemplateNotFoundError(
                f"Category '{category_name}' not found. "
                f"Expected file: {yaml_file}"
            )

        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            logger.exception(f"YAML parsing error in {yaml_file}: {e}")
            raise ConfigurationError(f"Invalid YAML in {category_name}: {e}") from e
        except Exception as e:
            logger.exception(f"Error reading template file {yaml_file}: {e}")
            raise ConfigurationError(f"Failed to load category {category_name}: {e}") from e

        # Parse YAML data
        try:
            category_obj = TemplateCategory(
                name=data.get("category", category_name),
                description=data.get("description", ""),
                filters=data.get("filters", []),
                templates=[],
            )

            templates_data = data.get("templates", [])
            for template_data in templates_data:
                template = Template(
                    pattern=template_data["pattern"],
                    description=template_data["description"],
                    category=category_obj.name,
                    params=template_data.get("params", []),
                    examples=template_data.get("examples"),
                )
                category_obj.add_template(template)

            logger.info(
                f"Loaded {len(category_obj.templates)} templates "
                f"for category '{category_name}'"
            )
            return category_obj

        except KeyError as e:
            logger.exception(f"Missing required field in template YAML: {e}")
            raise ConfigurationError(
                f"Invalid template format in {category_name}: missing field {e}"
            ) from e

    def list_available_categories(self) -> list[str]:
        """List all available template categories.
        
        Returns:
            List of category names (without .yaml extension)
            
        Example:
            >>> loader = TemplateLoader()
            >>> categories = loader.list_available_categories()
            >>> print(categories)
            ['sensitive_files', 'login_pages', 'open_directories', ...]
        """
        yaml_files = self.template_dir.glob("*.yaml")
        categories = [f.stem for f in yaml_files]
        logger.debug(f"Found {len(categories)} categories: {categories}")
        return sorted(categories)
