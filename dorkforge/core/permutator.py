"""Dork Permutation Generator."""

import re
from typing import List, Dict, Set

class DorkPermutator:
    """Generates variations of a dork query to expand search scope."""

    # Common equivalent or related extensions
    EXTENSION_MAP = {
        "php": ["php", "php5", "phtml", "php7"],
        "asp": ["asp", "aspx", "asa"],
        "jsp": ["jsp", "jspx", "do", "action"],
        "js": ["js", "json", "map"],
        "sql": ["sql", "dump", "bak", "db"],
        "log": ["log", "txt", "out", "err"],
        "config": ["conf", "config", "cfg", "ini", "env", "xml", "yml", "yaml"],
        "doc": ["doc", "docx", "rtf", "odt"],
        "xls": ["xls", "xlsx", "csv"],
        "ppt": ["ppt", "pptx"],
        "bak": ["bak", "old", "backup", "swp", "tmp"],
        "zip": ["zip", "rar", "7z", "tar", "gz", "tgz"]
    }

    # Common keyword variations
    KEYWORD_MAP = {
        "login": ["login", "admin", "signin", "auth", "portal", "cpanel"],
        "password": ["password", "passwd", "pwd", "credentials", "secret"],
        "admin": ["admin", "root", "administrator", "manager", "dashboard"],
        "config": ["config", "configuration", "settings", "setup"],
        "backup": ["backup", "dump", "export", "archive"],
        "index": ["index", "index of", "listing", "directory"],
        "api": ["api", "graphql", "rest", "swagger", "v1", "v2"],
        "v1": ["v1", "v2", "v3", "api", "mobile"]
    }



    def _smart_variations(self, query: str) -> Set[str]:
        """Generate smart context-aware variations."""
        smart_set = set()
        
        # 1. Protocol Variations (http <-> https)
        # Often implicit, but explicit site:http://... can be useful
        
        # 2. Subdomain wildcard for site:
        site_match = re.search(r'site:([a-zA-Z0-9\-\.]+)', query)
        if site_match:
            domain = site_match.group(1)
            # Add wildcard prefix if not present
            if not domain.startswith('*.'):
                smart_set.add(query.replace(f"site:{domain}", f"site:*.{domain}"))
            # Add -www exclusion
            smart_set.add(f"{query} -site:www.{domain}")

        # 3. Path expansion / recursion
        # If inurl:/admin/user/ -> suggest inurl:/admin/
        path_matches = re.finditer(r'(?:inurl|intitle):([a-zA-Z0-9\-\._\/]+)', query)
        for match in path_matches:
            val = match.group(1)
            if '/' in val and val.count('/') > 1:
                 # It's a path, try to shorten it for broader scope
                 parts = val.strip('/').split('/')
                 if len(parts) > 1:
                     parent = '/'.join(parts[:-1])
                     if parent:
                         # e.g. inurl:/v1/api -> inurl:/v1
                         op = match.group(0)
                         new_op = op.replace(val, parent)
                         smart_set.add(query.replace(op, new_op))

        return smart_set

    def get_variations(self, query: str) -> List[str]:
        """Generate variations for a given dork query.
        
        Args:
            query: The original dork string
            
        Returns:
            List of generated variation strings
        """
        variations: Set[str] = set()
        variations.add(query)

        # 0. Smart Logic
        variations.update(self._smart_variations(query))

        # 1. Expand Extensions (ext:xxx -> ext:(xxx|yyy|zzz))
        # Allow alphanumeric, dashes, dots (e.g. .tar.gz), underscores
        ext_matches = re.finditer(r'(?:ext|filetype):([a-zA-Z0-9\-\._]+)', query)
        for match in ext_matches:
            original_ext = match.group(1).lower()
            original_op = match.group(0)
            
            # Find related extensions
            related = self._find_related(original_ext, self.EXTENSION_MAP)
            if len(related) > 1:
                # Create OR grouping: ext:(php|phtml|php5)
                new_group = f"ext:({'|'.join(related)})"
                variations.add(query.replace(original_op, new_group))

        # 2. Expand Keywords (inurl:login -> inurl:(login|admin|...))
        # Matches inurl:xxx, intitle:xxx, intext:xxx
        # Allow alphanumeric, dashes, dots, slashes, underscores
        kw_matches = re.finditer(r'(?:inurl|intitle|intext):([a-zA-Z0-9\-\._\/]+)', query)
        for match in kw_matches:
            original_kw = match.group(1).lower()
            original_op = match.group(0) # e.g., inurl:login
            operator = match.group(0).split(':')[0] # e.g., inurl
            
            # Handle prefixes/suffixes (e.g. /login -> login, /v1/ -> v1)
            prefix = ""
            suffix = ""
            clean_kw = original_kw
            
            if clean_kw.startswith('/'):
                prefix = "/"
                clean_kw = clean_kw[1:]
            if clean_kw.endswith('/'):
                suffix = "/"
                clean_kw = clean_kw[:-1]
            
            # Find related keywords
            related = self._find_related(clean_kw, self.KEYWORD_MAP)
            
            if len(related) > 1:
                # Apply prefix/suffix to related terms if they were present
                adjusted_related = []
                for r in related:
                    new_r = r
                    if prefix and not new_r.startswith('/'):
                        new_r = prefix + new_r
                    if suffix and not new_r.endswith('/'):
                        new_r = new_r + suffix
                    adjusted_related.append(new_r)

                # Create OR grouping
                new_group = f"{operator}:({'|'.join(adjusted_related)})"
                variations.add(query.replace(original_op, new_group))
                
        return sorted(list(variations))

    def _find_related(self, term: str, mapping: Dict[str, List[str]]) -> List[str]:
        """Find related terms from mapping."""
        # Check if term is a key
        if term in mapping:
            return mapping[term]
        
        # Check if term is in any value list
        for key, values in mapping.items():
            if term in values:
                return values
                
        return [term]
