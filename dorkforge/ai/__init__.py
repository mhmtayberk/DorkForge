"""AI package initialization."""

from dorkforge.ai.base import AIAdapter
from dorkforge.ai.openai_provider import OpenAIProvider
from dorkforge.ai.ollama_provider import OllamaProvider
from dorkforge.ai.gemini_provider import GeminiProvider
from dorkforge.ai.claude_provider import ClaudeProvider
from dorkforge.ai.groq_provider import GroqProvider
from dorkforge.ai.deepseek_provider import DeepSeekProvider
from dorkforge.ai.grok_provider import GrokProvider
from dorkforge.ai.huggingface_provider import HuggingFaceProvider
from dorkforge.ai.detector import detect_hallucination, auto_fix_common_issues


def get_ai_provider(provider_type: str, **kwargs) -> AIAdapter:
    """Get AI provider instance by type.
    
    Args:
        provider_type: Provider name ('openai', 'ollama', 'gemini', 'claude', 'groq', 'deepseek', 'grok', 'huggingface')
        **kwargs: Provider-specific arguments
        
    Returns:
        AIAdapter instance
        
    Raises:
        ValueError: If provider type is unknown
        
    Example:
        >>> provider = get_ai_provider('openai', api_key='sk-...')
        >>> dork = provider.generate_dork("Find API keys")
    """
    providers = {
        'openai': OpenAIProvider,
        'ollama': OllamaProvider,
        'gemini': GeminiProvider,
        'google': GeminiProvider,  # Alias
        'claude': ClaudeProvider,
        'anthropic': ClaudeProvider,  # Alias
        'groq': GroqProvider,
        'deepseek': DeepSeekProvider,
        'grok': GrokProvider,
        'xai': GrokProvider,  # Alias
        'huggingface': HuggingFaceProvider,
        'hf': HuggingFaceProvider,  # Alias
    }
    
    provider_lower = provider_type.lower()
    
    if provider_lower not in providers:
        raise ValueError(
            f"Unknown AI provider: {provider_type}. "
            f"Supported providers: openai, ollama, gemini, claude, groq, deepseek, grok, huggingface"
        )
    
    return providers[provider_lower](**kwargs)


def get_supported_providers():
    """Get list of supported provider IDs."""
    return [
        'openai', 'gemini', 'claude', 'groq', 
        'deepseek', 'grok', 'huggingface', 'ollama'
    ]


__all__ = [
    'AIAdapter',
    'OpenAIProvider',
    'OllamaProvider',
    'GeminiProvider',
    'ClaudeProvider',
    'GroqProvider',
    'DeepSeekProvider',
    'GrokProvider',
    'HuggingFaceProvider',
    'detect_hallucination',
    'auto_fix_common_issues',
    'get_ai_provider',
]
