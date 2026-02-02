"""Anthropic Claude provider for dork generation."""

import logging
import os
from typing import Optional

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class ClaudeProvider(AIAdapter):
    """Anthropic Claude provider for generating Google dorks.
    
    Uses Claude 3 Haiku (fast, cost-effective).
    Requires ANTHROPIC_API_KEY environment variable.
    
    Example:
        >>> provider = ClaudeProvider()
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find sensitive documents",
        ...         {'domain': 'example.com'}
        ...     )
    """
    
    SYSTEM_PROMPT = """You are an elite Cyber-Intelligence Expert and Google Dorking Grandmaster.
Your mission is to generate surgical-grade Google Dorks with 100% syntactical perfection.

CRITICAL DISCIPLINE:
1. IGNORE FILLER WORDS: Disregard grammatical filler, polite phrases, or conversational noise in non-English prompts (e.g., Turkish "Bana...", "Dork oluşturur musun?"). Focus ONLY on the technical intent.
2. NO PREAMBLE. NO MARKDOWN. NO EXPLANATIONS.
3. NO SPACE after colons (e.g., `site:example.com` is CORRECT, `site: example.com` is WRONG).
4. ADVANCED GROUPING: Use parentheses for OR logic (e.g., `ext:(doc|pdf|xls)` or `site:(gov|mil|edu)`).
5. OPERATOR EFFICIENCY: Do NOT repeat the same operator. Use grouping.
6. MANDATORY INTEGRATION: If a 'domain' or 'keyword' is provided, it MUST be integrated as the primary filter.
7. Return ONLY the final dork query string.

Example Output:
site:example.com ext:(sql|db|backup) intext:"password"
"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-haiku-20240307"):
        """Initialize Claude provider.
        
        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: Model to use (default: claude-3-haiku)
        """
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.model = model
        self.client = None
        self._init_error = None
        
        if not self.api_key:
            self._init_error = "ANTHROPIC_API_KEY not found in environment"
            logger.warning(self._init_error)
            return

        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key)
            logger.info(f"Claude provider initialized with model: {self.model}")
        except ImportError:
            self._init_error = "anthropic package not installed"
            logger.warning(self._init_error)
        except Exception as e:
            self._init_error = f"Claude init error: {str(e)}"
            logger.error(self._init_error)
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using Anthropic Claude.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If Claude is not available
        """
        if not self.is_available():
            raise RuntimeError("Claude provider is not available. Check API key.")
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=150,
                temperature=0.3,
                system=self.SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            dork = response.content[0].text.strip()
            
            # Clean up
            dork = dork.replace('```', '').replace('`', '').strip()
            if dork.startswith('Dork:') or dork.startswith('Query:'):
                dork = dork.split(':', 1)[1].strip()
            
            logger.info(f"Generated dork: {dork}")
            return dork
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise RuntimeError(f"Claude generation failed: {e}")
    
    def is_available(self) -> bool:
        """Check if Claude is configured."""
        return self.client is not None and self.api_key is not None

    def get_error(self) -> Optional[str]:
        """Get the initialization error message if any."""
        return self._init_error
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return f"Anthropic Claude ({self.model.split('-')[2]})"
    
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
