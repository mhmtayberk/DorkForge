"""Dork optimizer for generating efficient combined queries."""

from typing import List, Dict, Set, Tuple
from collections import Counter
import re

from dorkforge.core.dork import Dork


class DorkOptimizer:
    """Optimizes list of dorks into efficient combined queries."""
    
    # Google Search Limits
    MAX_TERMS = 32  # Safe limit for strict boolean operators
    MAX_CHARS = 2048  # URL length limit
    
    def optimize(self, dorks: List[Dork]) -> List[str]:
        """Optimize a list of dorks into one or more combined queries.
        
        Techniques used:
        1. Common Operator Extraction: Pulls out global operators (e.g. site:)
        2. Grouping: Groups unique parts with OR
        3. Splitting: Splits into multiple queries if limits exceeded
        
        Args:
            dorks: List of Dork objects
            
        Returns:
            List of optimized query strings
        """
        if not dorks:
            return []
            
        # 1. Extract common operators
        common_ops, unique_parts = self._extract_common_operators(dorks)
        
        # 2. Build base prefix
        base_prefix = " ".join([f"{k}:{v}" for k, v in common_ops.items()])
        
        # 3. Chunking based on limits
        chunks = self._chunk_queries(base_prefix, unique_parts)
        
        return chunks

    def _extract_common_operators(self, dorks: List[Dork]) -> Tuple[Dict[str, str], List[str]]:
        """Identify operators common to ALL dorks."""
        if not dorks:
            return {}, []
            
        # Parse all dorks
        parsed_dorks = []
        for dork in dorks:
            ops = dork._parse_operators()
            # Get the "residue" (parts that aren't parsed key:value pairs)
            # This is a bit tricky with current dork.py, so we'll reconstruct
            # unique parts by removing common ops later.
            parsed_dorks.append((dork, ops))
            
        # Find common operators
        first_ops = parsed_dorks[0][1]
        common = {}
        
        for k, v in first_ops.items():
            is_common = True
            for _, ops in parsed_dorks[1:]:
                if ops.get(k) != v:
                    is_common = False
                    break
            if is_common:
                common[k] = v
                
        # Generate unique parts for each dork
        unique_parts = []
        for dork, ops in parsed_dorks:
            # We need to strip out the common operators from the original query
            # This simple string replacement is safer than reconstructing
            query = dork.query
            for k, v in common.items():
                # Remove "key:value" or 'key:"value"'
                # We use regex to be safe about boundaries
                pattern = f"{k}:[\"']?{re.escape(v)}[\"']?"
                query = re.sub(pattern, "", query).strip()
                
            # Clean up extra spaces
            query = re.sub(r'\s+', ' ', query).strip()
            unique_parts.append(query)
            
        return common, unique_parts

    def _chunk_queries(self, prefix: str, unique_parts: List[str]) -> List[str]:
        """Split unique parts into chunks that fit within limits."""
        chunks = []
        current_chunk = []
        current_terms_count = self._count_terms(prefix)
        current_chars_count = len(prefix)
        
        for part in unique_parts:
            # Wrap in parens only if needed (not empty)
            part_str = f"({part})" if part else ""
            if not part_str and prefix:
                 # If unique part is empty but we have prefix, it's just the prefix
                 # But usually this happens if all dorks are identical
                 continue

            part_terms = self._count_terms(part_str) + 1 # +1 for OR
            part_chars = len(part_str) + 4 # +4 for " OR "
            
            # Check limits
            # If adding this part exceeds limit, save current chunk and start new
            if (current_terms_count + part_terms > self.MAX_TERMS) or \
               (current_chars_count + part_chars > self.MAX_CHARS):
                
                if current_chunk:
                    chunks.append(self._build_query(prefix, current_chunk))
                
                # Reset for new chunk
                current_chunk = [part_str]
                current_terms_count = self._count_terms(prefix) + part_terms
                current_chars_count = len(prefix) + part_chars
            else:
                current_chunk.append(part_str)
                current_terms_count += part_terms
                current_chars_count += part_chars
                
        # Append last chunk
        if current_chunk:
            chunks.append(self._build_query(prefix, current_chunk))
            
        return chunks

    def _build_query(self, prefix: str, parts: List[str]) -> str:
        """Construct the final query string."""
        combined_parts = " OR ".join(parts)
        if prefix:
            if combined_parts:
                return f"{prefix} ({combined_parts})"
            return prefix
        return combined_parts
        
    def _count_terms(self, text: str) -> int:
        """Approximate term count (space separated)."""
        if not text:
            return 0
        return len(text.split())
