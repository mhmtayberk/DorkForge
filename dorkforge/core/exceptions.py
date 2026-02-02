"""Custom exceptions for DorkForge."""


class DorkForgeException(Exception):
    """Base exception for all DorkForge errors."""

    pass


class ValidationError(DorkForgeException):
    """Raised when dork validation fails.
    
    This exception indicates that a dork query has invalid Google
    operator syntax or contains unsupported operator combinations.
    """

    pass


class TemplateNotFoundError(DorkForgeException):
    """Raised when a template category doesn't exist.
    
    This exception is raised when attempting to load templates
    for a category that is not defined in the template repository.
    """

    pass


class AIProviderError(DorkForgeException):
    """Raised when AI provider communication fails.
    
    This can occur due to:
    - API authentication errors
    - Network connectivity issues
    - Service unavailability
    - Invalid API responses
    """

    pass


class ConfigurationError(DorkForgeException):
    """Raised when configuration is invalid or missing.
    
    This exception indicates problems with:
    - Missing required configuration values
    - Invalid configuration format
    - Unsupported configuration options
    """

    pass


class ExportError(DorkForgeException):
    """Raised when export operation fails.
    
    This can occur due to:
    - File system permission errors
    - Invalid export format
    - Disk space issues
    """

    pass
