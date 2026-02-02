"""Hugging Face provider for dork generation."""

import logging
import os
import requests
from typing import Optional

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class HuggingFaceProvider(AIAdapter):
    """Hugging Face Inference API provider for generating Google dorks.
    
    Uses Hugging Face's free Inference API.
    Requires HUGGINGFACE_API_KEY environment variable.
    
    Default model: meta-llama/Meta-Llama-3-8B-Instruct
    
    Example:
        >>> provider = HuggingFaceProvider()
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find exposed database backups",
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
    
    def __init__(
        self, 
        api_key: Optional[str] = None, 
        model: str = "meta-llama/Meta-Llama-3-8B-Instruct"
    ):
        """Initialize Hugging Face provider.
        
        Args:
            api_key: HuggingFace API key (defaults to HUGGINGFACE_API_KEY env var)
            model: Model to use (default: meta-llama/Meta-Llama-3-8B-Instruct)
                   Other options:
                   - mistralai/Mistral-7B-Instruct-v0.2
                   - HuggingFaceH4/zephyr-7b-beta
                   - microsoft/Phi-3-mini-4k-instruct
        """
        self.api_key = api_key or os.getenv('HUGGINGFACE_API_KEY')
        self.model = model
        self.base_url = f"https://api-inference.huggingface.co/models/{model}"
        
        if self.api_key:
            logger.info(f"HuggingFace provider initialized with model: {self.model}")
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using Hugging Face.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If HuggingFace is not available
        """
        if not self.is_available():
            raise RuntimeError("HuggingFace provider is not available. Check API key.")
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        # Build messages in chat format
        full_prompt = f"{self.SYSTEM_PROMPT}\n\nUser: {user_prompt}\nAssistant:"
        
        try:
            response = requests.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "inputs": full_prompt,
                    "parameters": {
                        "max_new_tokens": 100,
                        "temperature": 0.3,
                        "top_p": 0.95,
                        "do_sample": True,
                        "return_full_text": False
                    }
                },
                timeout=30
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Handle different response formats
            if isinstance(data, list) and len(data) > 0:
                dork = data[0].get('generated_text', '').strip()
            elif isinstance(data, dict):
                dork = data.get('generated_text', '').strip()
            else:
                raise RuntimeError(f"Unexpected response format: {data}")
            
            # Clean up
            dork = dork.replace('```', '').replace('`', '').strip()
            
            # Remove common prefixes
            for prefix in ['Dork:', 'Query:', 'Assistant:', 'Answer:']:
                if dork.startswith(prefix):
                    dork = dork[len(prefix):].strip()
            
            # Remove any trailing explanations
            if '\n' in dork:
                dork = dork.split('\n')[0].strip()
            
            logger.info(f"Generated dork (HuggingFace): {dork}")
            return dork
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HuggingFace API error: {e}")
            
            # Check for model loading message
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    if 'estimated_time' in error_data:
                        raise RuntimeError(
                            f"Model is loading. Please wait ~{error_data['estimated_time']:.0f}s and try again."
                        )
                except:
                    pass
            
            raise RuntimeError(f"HuggingFace generation failed: {e}")
    
    def is_available(self) -> bool:
        """Check if HuggingFace is configured."""
        return self.api_key is not None
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return "Hugging Face"
    
    def _build_user_prompt(self, prompt: str, context: dict) -> str:
        """Build user prompt with context."""
        parts = [f"Generate a Google dork for: {prompt}"]
        
        if 'domain' in context and context['domain']:
            parts.append(f"Target domain: {context['domain']}")
        
        if 'keyword' in context and context['keyword']:
            parts.append(f"Additional keyword: {context['keyword']}")
        
        parts.append("\nReturn ONLY the dork query, nothing else.")
        
        return "\n".join(parts)
