"""OpenAI GPT provider for dork generation."""

import logging
from typing import Optional
import os

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class OpenAIProvider(AIAdapter):
    """OpenAI GPT provider for generating Google dorks.
    
    Uses GPT-4o-mini by default for cost-effectiveness and speed.
    Requires OPENAI_API_KEY environment variable.
    
    Example:
        >>> provider = OpenAIProvider()
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find exposed API keys",
        ...         {'domain': 'example.com'}
        ...     )
    """
    
    SYSTEM_PROMPT = """You are an elite Cyber-Intelligence Expert and Google Dorking Grandmaster.
Your mission is to generate surgical-grade Google Dorks with 100% syntactical perfection.

CRITICAL DISCIPLINE:
1. IGNORE FILLER: Disregard polite phrases or conversational noise. Focus ONLY on technical intent.
2. SUBDOMAINS: The operator `site:domain.com` AUTOMATICALLY covers subdomains. Do NOT use `site:*.domain.com` unless explicitly requested. If user asks for "subdomains", ensure the dork does NOT exclude them (e.g. do not add `-www`).
3. NO PREAMBLE/MARKDOWN: Return ONLY the raw dork string. No "Here is the dork:", no markdown blocks.
4. SYNTAX PERFECTION: No space after colons (e.g., `site:example.com`).
5. GROUPING: Use parentheses for OR logic: `ext:(doc|pdf)`.
6. CONSTRAINTS: If a domain/keyword is provided in context, it MUST be used.
7. COMPREHENSIVE QUERY: If user asks for "all files" or "logs", use broad extensions (e.g. `ext:(log|txt|conf|cnf|ini|env|sh|bak|backup|swp|old)`).

Example Output:
site:example.com ext:(sql|db|backup) intext:"password"
"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """Initialize OpenAI provider.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4o-mini)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.model = model
        self.client = None
        self._init_error = None
        
        if not self.api_key:
            self._init_error = "OPENAI_API_KEY not found in environment"
            logger.warning(self._init_error)
            return

        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
            logger.info(f"OpenAI provider initialized with model: {self.model}")
        except ImportError:
            self._init_error = "openai package not installed"
            logger.warning(self._init_error)
        except Exception as e:
            self._init_error = f"OpenAI init error: {str(e)}"
            logger.error(self._init_error)
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using OpenAI GPT.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If OpenAI is not available
            Exception: If API call fails
        """
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not available. Check API key.")
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Low temperature for consistency
                max_tokens=150
            )
            
            dork = response.choices[0].message.content.strip()
            
            # Clean up common issues
            dork = dork.replace('```', '').replace('`', '').strip()
            if dork.startswith('Dork:') or dork.startswith('Query:'):
                dork = dork.split(':', 1)[1].strip()
            
            logger.info(f"Generated dork: {dork}")
            return dork
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if OpenAI is configured."""
        return self.client is not None and self.api_key is not None

    def get_error(self) -> Optional[str]:
        """Get the initialization error message if any."""
        return self._init_error
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return f"OpenAI ({self.model})"
    
    def _build_user_prompt(self, prompt: str, context: dict) -> str:
        """Build structured user prompt to prevent hallucination."""
        instruction = [
            "### TASK ###",
            f"Objective: Generate a high-precision Google Dork based on the following input.",
            f"User Intent: {prompt}",
            "",
            "### PARAMETERS ###"
        ]
        
        if 'domain' in context and context['domain']:
            instruction.append(f"Target Domain (MANDATORY): {context['domain']}")
        
        if 'keyword' in context and context['keyword']:
            instruction.append(f"Primary Keyword: {context['keyword']}")
            
        instruction.append("\nStrict Result: Return ONLY the dork string.")
        
        return "\n".join(instruction)
