"""
DorkForge - Google Dork Generator for Penetration Testers

A production-quality tool for generating accurate, reliable, and real-world
usable Google Dorks for security professionals.
"""

__version__ = "0.1.0"
__author__ = "Ayberk"
__license__ = "MIT"

from dorkforge.core.dork import Dork
from dorkforge.core.exceptions import (
    DorkForgeException,
    ValidationError,
    TemplateNotFoundError,
    AIProviderError,
    ConfigurationError,
    ExportError,
)

__all__ = [
    "Dork",
    "DorkForgeException",
    "ValidationError",
    "TemplateNotFoundError",
    "AIProviderError",
    "ConfigurationError",
    "ExportError",
    "__version__",
]
