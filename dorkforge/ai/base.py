"""Base AI adapter interface."""

from abc import ABC, abstractmethod
from typing import Optional


class AIAdapter(ABC):
    """Abstract base class for AI providers.
    
    This interface ensures all AI providers (OpenAI, Ollama, etc.)
    implement the same methods for consistent usage.
    
    Example:
        >>> class MyAIProvider(AIAdapter):
        ...     def generate_dork(self, prompt, context):
        ...         return "generated dork"
        ...     
        ...     def is_available(self):
        ...         return True
    """
    
    @abstractmethod
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate a Google dork from natural language prompt.
        
        Args:
            prompt: Natural language description (e.g., "Find exposed .env files")
            context: Optional context dict with keys:
                - domain: Target domain
                - keyword: Additional keyword
                - category: Suggested category
                
        Returns:
            Google dork query string
            
        Raises:
            NotImplementedError: If subclass doesn't implement
            
        Example:
            >>> adapter.generate_dork(
            ...     "Find database backups",
            ...     {'domain': 'example.com'}
            ... )
            'site:example.com ext:sql OR ext:dump intext:backup'
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if AI provider is available and configured.
        
        Returns:
            True if provider can be used, False otherwise
            
        Example:
            >>> if adapter.is_available():
            ...     dork = adapter.generate_dork(prompt)
        """
        pass
    
    def get_provider_name(self) -> str:
        """Get human-readable provider name.
        
        Returns:
            Provider name (e.g., "OpenAI GPT-4o-mini", "Ollama Llama3.2")
        """
        return self.__class__.__name__
