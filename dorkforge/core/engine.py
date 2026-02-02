"""Dork generation engine - core business logic."""

import logging
from typing import Dict, List

from dorkforge.core.dork import Dork
from dorkforge.core.validator import DorkValidator
from dorkforge.core.translator import DorkTranslator
from dorkforge.core.exceptions import ValidationError, TemplateNotFoundError
from dorkforge.templates.repository import TemplateRepository
from dorkforge.templates.models import Template

logger = logging.getLogger(__name__)


class DorkEngine:
    """Main dork generation engine.
    
    This class orchestrates the dork generation process using
    templates from the repository and validation through the validator.
    
    Attributes:
        repository: TemplateRepository instance
        validator: DorkValidator instance
        translator: DorkTranslator instance
    
    Example:
        >>> engine = DorkEngine()
        >>> dorks = engine.generate_from_template(
        ...     "sensitive_files",
        ...     {"domain": "example.com"}
        ... )
        >>> print(len(dorks))
        10
    """

    def __init__(self, repository: TemplateRepository = None, validator: DorkValidator = None):
        """Initialize dork engine.
        
        Args:
            repository: TemplateRepository instance (creates default if None)
            validator: DorkValidator instance (creates default if None)
        """
        self.repository = repository or TemplateRepository()
        self.validator = validator or DorkValidator()
        self.translator = DorkTranslator()
        logger.info("DorkEngine initialized")

    def generate_from_template(
        self, category: str, params: Dict[str, str], validate: bool = True, target_engine: str = "google"
    ) -> List[Dork]:
        """Generate dorks from a template category.
        
        Loads templates for the specified category, substitutes parameters,
        optionally validates, and translates to target engine.
        
        Args:
            category: Template category name (e.g., "sensitive_files")
            params: Dictionary of parameters for substitution.
            validate: Whether to validate generated dorks (default: True)
            target_engine: Target search engine (default: "google")
            
        Returns:
            List of validated Dork objects
        """
        logger.info(f"Generating dorks for category '{category}' with params: {params}")

        # Load templates
        try:
            category_obj = self.repository.get_by_category(category)
        except TemplateNotFoundError:
            logger.error(f"Category not found: {category}")
            raise

        templates = category_obj.get_templates()
        logger.debug(f"Found {len(templates)} templates in category '{category}'")

        # Filter templates based on parameters
        filtered_templates = []
        for template in templates:
            include = True
            
            # Filter: description_contains (OR logic)
            if "description_contains" in params and params["description_contains"]:
                keywords = params["description_contains"]
                # If param is provided, template description MUST contain at least one keyword
                if not any(k.lower() in template.description.lower() for k in keywords):
                    include = False
            
            # Filter: exclude_keywords (AND logic - exclude if matched)
            if "exclude_keywords" in params and params["exclude_keywords"]:
                keywords = params["exclude_keywords"]
                if any(k.lower() in template.description.lower() for k in keywords):
                    include = False

            if include:
                filtered_templates.append(template)
        
        templates = filtered_templates
        logger.debug(f"Filtered to {len(templates)} templates after applying filters")

        # Generate dorks from templates
        dorks = []
        errors = []

        for template in templates:
            try:
                dork = self._apply_template(template, params)
                
                # Translate if needed
                if target_engine != "google":
                    dork.query = self.translator.translate(dork.query, target_engine)

                # Validate if requested
                if validate:
                    is_valid, error_msg = self.validator.validate_dork(dork)
                    if not is_valid:
                        logger.warning(
                            f"Validation failed for dork '{dork.query}': {error_msg}"
                        )
                        errors.append((template, error_msg))
                        continue

                dorks.append(dork)

            except KeyError as e:
                logger.warning(f"Missing parameter for template '{template.pattern}': {e}")
                # Skip templates with missing parameters
                continue
            except Exception as e:
                logger.exception(f"Error applying template '{template.pattern}': {e}")
                continue

        logger.info(f"Generated {len(dorks)} valid dorks (skipped {len(errors)} invalid)")

        if errors and not dorks:
            # All dorks failed validation
            raise ValidationError(f"All generated dorks failed validation: {errors}")

        return dorks

    def generate_batch(
        self, categories: List[str], params: Dict[str, str], validate: bool = True, target_engine: str = "google"
    ) -> Dict[str, List[Dork]]:
        """Generate dorks for multiple categories.
        
        Args:
            categories: List of category names
            params: Parameters for substitution
            validate: Whether to validate generated dorks
            target_engine: Target search engine
            
        Returns:
            Dictionary mapping category names to lists of Dork objects
        """
        logger.info(f"Batch generating dorks for {len(categories)} categories (Engine: {target_engine})")

        results = {}
        for category in categories:
            try:
                dorks = self.generate_from_template(category, params, validate, target_engine)
                results[category] = dorks
            except TemplateNotFoundError:
                logger.warning(f"Skipping unknown category: {category}")
                continue
            except Exception as e:
                logger.exception(f"Error generating dorks for category '{category}': {e}")
                continue

        logger.info(
            f"Batch generation complete: {sum(len(d) for d in results.values())} total dorks"
        )
        return results

    def _apply_template(self, template: Template, params: Dict[str, str]) -> Dork:
        """Apply template with parameters to create a Dork.
        
        Args:
            template: Template to apply
            params: Parameters for substitution
            
        Returns:
            Dork object
            
        Raises:
            KeyError: If required parameter is missing
        """
        # Render template with parameters
        query = template.render(params)

        # Create Dork object
        dork = Dork(
            query=query,
            category=template.category,
            description=template.description,
            parameters=params.copy(),
            source="template",
        )

        logger.debug(f"Applied template: {template.pattern} -> {query}")
        return dork

    def list_categories(self) -> List[str]:
        """List all available template categories.
        
        Returns:
            List of category names
            
        Example:
            >>> engine = DorkEngine()
            >>> categories = engine.list_categories()
            >>> print(categories)
            ['api_endpoints', 'backup_files', ...]
        """
        return self.repository.get_all_categories()

    def get_category_info(self, category: str) -> Dict[str, any]:
        """Get information about a category.
        
        Args:
            category: Category name
            
        Returns:
            Dictionary with category information
            
        Raises:
            TemplateNotFoundError: If category doesn't exist
            
        Example:
            >>> engine = DorkEngine()
            >>> info = engine.get_category_info("sensitive_files")
            >>> print(info["template_count"])
            10
        """
        category_obj = self.repository.get_by_category(category)

        return {
            "name": category_obj.name,
            "description": category_obj.description,
            "template_count": category_obj.template_count,
            "filters": category_obj.filters or [],
            "templates": [
                {
                    "pattern": t.pattern,
                    "description": t.description,
                    "params": t.params,
                }
                for t in category_obj.templates
            ],
        }
