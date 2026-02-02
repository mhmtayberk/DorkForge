"""Groq provider for ultra-fast dork generation."""

import logging
import os
from typing import Optional

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class GroqProvider(AIAdapter):
    """Groq LPU provider for ultra-fast Google dork generation.
    
    Uses Llama 3 70B on Groq's LPU (Lightning Processing Unit).
    Extremely fast inference (~500 tokens/sec).
    Requires GROQ_API_KEY environment variable.
    
    Example:
        >>> provider = GroqProvider()
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find login panels",
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
    
    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.1-70b-versatile"):
        """Initialize Groq provider.
        
        Args:
            api_key: Groq API key (defaults to GROQ_API_KEY env var)
            model: Model to use (default: llama-3.1-70b-versatile)
        """
        self.api_key = api_key or os.getenv('GROQ_API_KEY')
        self.model = model
        self.client = None
        self._init_error = None
        
        if not self.api_key:
            self._init_error = "GROQ_API_KEY not found in environment"
            logger.warning(self._init_error)
            return

        try:
            from groq import Groq
            self.client = Groq(api_key=self.api_key)
            logger.info(f"Groq provider initialized with model: {self.model}")
        except ImportError:
            self._init_error = "groq package not installed"
            logger.warning(self._init_error)
        except Exception as e:
            self._init_error = f"Groq init error: {str(e)}"
            logger.error(self._init_error)
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using Groq LPU.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If Groq is not available
        """
        if not self.is_available():
            raise RuntimeError("Groq provider is not available. Check API key.")
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            dork = response.choices[0].message.content.strip()
            
            # Clean up
            dork = dork.replace('```', '').replace('`', '').strip()
            if dork.startswith('Dork:') or dork.startswith('Query:'):
                dork = dork.split(':', 1)[1].strip()
            
            logger.info(f"Generated dork (Groq): {dork}")
            return dork
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise RuntimeError(f"Groq generation failed: {e}")
    
    def is_available(self) -> bool:
        """Check if Groq is configured."""
        return self.client is not None and self.api_key is not None

    def get_error(self) -> Optional[str]:
        """Get the initialization error message if any."""
        return self._init_error
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return f"Groq ({self.model})"
    
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
