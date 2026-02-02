"""Ollama local LLM provider for dork generation."""

import logging
import requests
from typing import Optional

from dorkforge.ai.base import AIAdapter

logger = logging.getLogger(__name__)


class OllamaProvider(AIAdapter):
    """Ollama local LLM provider for generating Google dorks.
    
    Uses local Ollama installation (llama3.2, mistral, etc.).
    Privacy-focused - no API keys,no cloud calls.
    
    Requires Ollama to be running locally (ollama serve).
    
    Example:
        >>> provider = OllamaProvider(model='llama3.2')
        >>> if provider.is_available():
        ...     dork = provider.generate_dork(
        ...         "Find backup files",
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
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        """Initialize Ollama provider.
        
        Args:
            base_url: Ollama API base URL
            model: Model name (llama3.2, mistral, etc.)
        """
        self.base_url = base_url.rstrip('/')
        self.model = model
        logger.info(f"Ollama provider initialized: {base_url}, model: {model}")
    
    def generate_dork(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate dork using Ollama.
        
        Args:
            prompt: Natural language description
            context: Optional context dict
            
        Returns:
            Generated Google dork query
            
        Raises:
            RuntimeError: If Ollama is not available
            Exception: If API call fails
        """
        if not self.is_available():
            raise RuntimeError(
                f"Ollama is not available at {self.base_url}. "
                "Please start Ollama with 'ollama serve'"
            )
        
        context = context or {}
        user_prompt = self._build_user_prompt(prompt, context)
        
        try:
            # Strategy: 
            # 1. Try /api/chat (Modern, standard for most models)
            # 2. If 404, fallback to /api/generate (Legacy or specific models)
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "num_predict": 150
                        }
                    },
                    timeout=300 # Increased to 5 minutes to handle slow cold starts
                )
                
                # Check specifically for 404 to trigger fallback
                if response.status_code == 404:
                    raise requests.exceptions.HTTPError("404 Not Found", response=response)
                    
                response.raise_for_status()
                data = response.json()
                
                dork = ""
                if 'message' in data and 'content' in data['message']:
                     dork = data['message']['content'].strip()
                elif 'response' in data:
                     dork = data['response'].strip()
                     
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    logger.warning(f"/api/chat returned 404, falling back to /api/generate")
                    # Fallback to /api/generate
                    response = requests.post(
                        f"{self.base_url}/api/generate",
                        json={
                            "model": self.model,
                            "prompt": f"{self.SYSTEM_PROMPT}\n\n{user_prompt}",
                            "stream": False,
                            "options": {
                                "temperature": 0.3,
                                "num_predict": 150
                            }
                        },
                        timeout=300
                    )
                    response.raise_for_status()
                    data = response.json()
                    dork = data.get('response', '').strip()
                else:
                    raise
            
            if not dork:
                logger.error("Ollama returned empty content.")
                raise RuntimeError("Ollama returned empty response.")

            # Clean up
            dork = dork.replace('```', '').replace('`', '').strip()
            if dork.startswith('Dork:') or dork.startswith('Query:'):
                dork = dork.split(':', 1)[1].strip()
            
            logger.info(f"Generated dork: {dork}")
            return dork
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama API error: {e}")
            raise RuntimeError(f"Ollama API request failed: {e}")
    
    def is_available(self) -> bool:
        """Check if Ollama is running."""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=2
            )
            return response.status_code == 200
        except:
            return False
    
    def get_provider_name(self) -> str:
        """Get provider name."""
        return f"Ollama ({self.model})"
    
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
