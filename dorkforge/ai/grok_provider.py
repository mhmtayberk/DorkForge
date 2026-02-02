"""xAI Grok provider for dork generation."""

import logging
import os
import requests
from typing import Optional

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class GrokProvider(AIAdapter):
    """xAI Grok provider for generating Google dorks.
    
    Uses Grok Beta model (Elon Musk's AI).
    Requires XAI_API_KEY environment variable.
    
    Note: Grok API is in beta, access may be limited.
    
    Example:
        >>> provider = GrokProvider()
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find WordPress admin panels",
        ...         {'domain': 'example.com'}
        ...     )
    """
    
    SYSTEM_PROMPT = """You are a Google Dorking expert for penetration testing.
Generate ONLY the Google dork query, nothing else.

Valid operators: site, filetype, ext, intext, allintext, inurl, allinurl, intitle, allintitle, link, cache, related, info

RULES:
1. No spaces after colons (site:example.com NOT site: example.com)
2. Use quotes for multi-word searches
3. Combine operators with spaces or OR
4. Do NOT invent operators
5. Return ONLY the dork query, no explanations

Examples:
- site:example.com filetype:pdf intext:"confidential"
- site:example.com (ext:sql OR ext:dump)
"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "grok-beta"):
        """Initialize Grok provider.
        
        Args:
            api_key: xAI API key (defaults to XAI_API_KEY env var)
            model: Model to use (default: grok-beta)
        """
        self.api_key = api_key or os.getenv('XAI_API_KEY')
        self.model = model
        self.base_url = "https://api.x.ai/v1"
        
        if self.api_key:
            logger.info(f"Grok provider initialized with model: {self.model}")
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using Grok.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If Grok is not available
        """
        if not self.is_available():
            raise RuntimeError("Grok provider is not available. Check API key.")
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        try:
            # Grok uses OpenAI-compatible API
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": self.SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 150
                },
                timeout=30
            )
            
            response.raise_for_status()
            data = response.json()
            
            dork = data['choices'][0]['message']['content'].strip()
            
            # Clean up
            dork = dork.replace('```', '').replace('`', '').strip()
            if dork.startswith('Dork:') or dork.startswith('Query:'):
                dork = dork.split(':', 1)[1].strip()
            
            logger.info(f"Generated dork (Grok): {dork}")
            return dork
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Grok API error: {e}")
            raise RuntimeError(f"Grok generation failed: {e}")
    
    def is_available(self) -> bool:
        """Check if Grok is configured."""
        return self.api_key is not None
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return "xAI Grok"
    
    def _build_user_prompt(self, prompt: str, context: dict) -> str:
        """Build user prompt with context."""
        parts = [f"Generate a Google dork for: {prompt}"]
        
        if 'domain' in context and context['domain']:
            parts.append(f"Target domain: {context['domain']}")
        
        if 'keyword' in context and context['keyword']:
            parts.append(f"Additional keyword: {context['keyword']}")
        
        parts.append("\nReturn ONLY the dork query.")
        
        return "\n".join(parts)
