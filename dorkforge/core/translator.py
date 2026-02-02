"""Dork translator for multi-engine support."""

import logging
from typing import Dict, List, Optional
import re

logger = logging.getLogger(__name__)


class DorkTranslator:
    """Translates generic Google dorks to other search engine dialects.
    
    Supported engines:
    - Google (Identity, no change)
    - Bing
    - DuckDuckGo
    """

    ENGINES = {
        "google": "Google",
        "bing": "Bing",
        "duckduckgo": "DuckDuckGo",
        "yahoo": "Yahoo",
        "yandex": "Yandex",
        "baidu": "Baidu"
    }

    # Operator mappings: {source_op: {engine: target_op}}
    # If target_op is None, the operator is not supported by that engine.
    OPERATOR_MAP = {
        "filetype": {
            "bing": "filetype",
            "duckduckgo": "filetype",
            "yahoo": "filetype",
            "yandex": "mime",
            "baidu": "filetype",
        },
        "ext": {
            "bing": "filetype",
            "duckduckgo": "ext",
            "yahoo": "filetype",
            "yandex": "mime",
            "baidu": "filetype",
        },
        "inurl": {
            "bing": "instreamset:url",
            "duckduckgo": "inurl",
            "yahoo": "inurl",
            "yandex": "inurl",
            "baidu": "inurl",
        },
        "allinurl": {
            "bing": "instreamset:url", # Approximation
            "duckduckgo": "inurl",
            "yahoo": "inurl",
            "yandex": "inurl",
            "baidu": "inurl",
        },
        "intitle": {
            "bing": "intitle",
            "duckduckgo": "intitle",
            "yahoo": "intitle",
            "yandex": "title",
            "baidu": "intitle",
        },
        "allintitle": {
            "bing": "intitle",
            "duckduckgo": "intitle",
            "yahoo": "intitle",
            "yandex": "title",
            "baidu": "intitle",
        },
        "intext": {
            "bing": "inbody",
            "duckduckgo": "intext",
            "yahoo": "intext",
            "yandex": "intext",
            "baidu": "inbody", # Baidu sometimes accepts inbody or nothing
        },
        "site": {
            "bing": "site",
            "duckduckgo": "site",
            "yahoo": "site",
            "yandex": "site", # host is also valid but site is safer
            "baidu": "site",
        }
    }

    def translate(self, query: str, target_engine: str) -> str:
        """Translate a dork query to the target engine's syntax."""
        if not query:
            return ""

        target_engine = target_engine.lower()
        if target_engine == "google" or target_engine not in self.ENGINES:
            return query

        # Use a regex that captures the precedent char (or start of line)
        # matches: (stat of line OR space/paren) + (word) + (:)
        pattern = r'(^|[(\s])([a-zA-Z]+):'
        
        def replace_callback(match):
            prefix = match.group(1)
            op_part = match.group(2)
            
            clean_op = op_part.lower()
            
            if clean_op in self.OPERATOR_MAP:
                mapping = self.OPERATOR_MAP[clean_op]
                if target_engine in mapping:
                    target_op = mapping[target_engine]
                    
                    if target_op:
                        return f"{prefix}{target_op}:"
                    else:
                        # Supported engine generally, but explicitly None for this op?
                        # This would mean "remove it" or "keep it". 
                        # Based on map, if it's there it's usually mapped.
                        return f"{prefix}{op_part}:"
            
            return match.group(0)

        return re.sub(pattern, replace_callback, query)

    def get_supported_engines(self) -> Dict[str, str]:
        """Get list of supported engines."""
        return self.ENGINES
