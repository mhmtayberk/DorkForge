"""Plain text exporter."""

from pathlib import Path
from typing import Optional
from datetime import datetime

from dorkforge.core.dork import Dork
from dorkforge.export.base import BaseExporter


class TXTExporter(BaseExporter):
    """Export dorks to plain text format.
    
    Output format:
        # Header (optional)
        # Generated: YYYY-MM-DD HH:MM:SS
        # Domain: example.com
        # Categories: sensitive_files, api_endpoints
        # Total: 18 dorks
        
        # === CATEGORY NAME (10 dorks) ===
        
        # Description of dork 1
        site:example.com filetype:env
        
        # Description of dork 2
        site:example.com filetype:env intext:"DB_PASSWORD"
        ...
    
    Example:
        >>> exporter = TXTExporter()
        >>> output = exporter.export(dorks, {'domain': 'example.com'})
        >>> print(output)
    """
    
    def __init__(self, include_header: bool = True, include_descriptions: bool = True):
        """Initialize TXT exporter.
        
        Args:
            include_header: Whether to include metadata header
            include_descriptions: Whether to include dork descriptions as comments
        """
        self.include_header = include_header
        self.include_descriptions = include_descriptions
    
    def export(self, dorks: list[Dork], metadata: Optional[dict] = None) -> str:
        """Export dorks to plain text.
        
        Args:
            dorks: List of Dork objects
            metadata: Optional dict with keys: domain, category, categories, timestamp
            
        Returns:
            Formatted text string
        """
        lines = []
        metadata = metadata or {}
        
        # Header
        if self.include_header:
            lines.append("# DorkForge Export")
            lines.append(f"# Generated: {metadata.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}")
            
            if 'domain' in metadata:
                lines.append(f"# Domain: {metadata['domain']}")
            
            if 'categories' in metadata:
                cats = metadata['categories']
                if isinstance(cats, list):
                    lines.append(f"# Categories: {', '.join(cats)}")
            elif 'category' in metadata:
                lines.append(f"# Category: {metadata['category']}")
            
            lines.append(f"# Total: {len(dorks)} dorks")
            lines.append("")
        
        # Group by category
        grouped = {}
        for dork in dorks:
            category = dork.category or 'uncategorized'
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(dork)
        
        # Export each category
        for category, category_dorks in grouped.items():
            # Category header
            category_name = category.replace('_', ' ').title()
            lines.append(f"# === {category_name.upper()} ({len(category_dorks)} dorks) ===")
            lines.append("")
            
            # Dorks
            for dork in category_dorks:
                if self.include_descriptions and dork.description:
                    lines.append(f"# {dork.description}")
                lines.append(dork.query)
                lines.append("")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def export_to_file(
        self, 
        dorks: list[Dork], 
        filepath: str, 
        metadata: Optional[dict] = None
    ) -> None:
        """Export dorks to text file.
        
        Args:
            dorks: List of Dork objects
            filepath: Path to output file
            metadata: Optional metadata dict
            
        Raises:
            IOError: If file cannot be written
        """
        output = self.export(dorks, metadata)
        Path(filepath).write_text(output, encoding='utf-8')
    
    def get_file_extension(self) -> str:
        """Get file extension."""
        return "txt"
