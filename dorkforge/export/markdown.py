"""Markdown exporter."""

from pathlib import Path
from typing import Optional
from datetime import datetime

from dorkforge.core.dork import Dork
from dorkforge.export.base import BaseExporter
from dorkforge.core.optimizer import DorkOptimizer


class MarkdownExporter(BaseExporter):
    """Export dorks to Markdown format.
    
    Perfect for pentest reports and documentation.
    
    Output format:
        # DorkForge Report
        
        **Generated:** 2026-01-27 22:52:00
        **Domain:** example.com
        **Categories:** 2
        **Total Dorks:** 18
        
        ---
        
        ## Sensitive Files (10 dorks)
        
        | # | Description | Dork Query |
        |---|-------------|------------|
        | 1 | Find .env files | `site:example.com filetype:env` |
        | 2 | Find DB passwords | `site:example.com filetype:env intext:"DB_PASSWORD"` |
        
        ### Combined Query
        ```
        (site:example.com filetype:env) OR (site:example.com filetype:env intext:"DB_PASSWORD") OR ...
        ```
    
    Example:
        >>> exporter = MarkdownExporter()
        >>> output = exporter.export(dorks, {'domain': 'example.com'})
    """
    
    def __init__(self, include_toc: bool = True, include_concat: bool = True):
        """Initialize Markdown exporter.
        
        Args:
            include_toc: Whether to include table of contents
            include_concat: Whether to include combined queries
        """
        self.include_toc = include_toc
        self.include_concat = include_concat
        self.optimizer = DorkOptimizer()
    
    def export(self, dorks: list[Dork], metadata: Optional[dict] = None) -> str:
        """Export dorks to Markdown.
        
        Args:
            dorks: List of Dork objects
            metadata: Optional metadata dict
            
        Returns:
            Markdown string
        """
        metadata = metadata or {}
        lines = []
        
        # Title
        lines.append("# DorkForge Report")
        lines.append("")
        
        # Metadata
        timestamp = metadata.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        lines.append(f"**Generated:** {timestamp}")
        
        if 'domain' in metadata:
            lines.append(f"**Domain:** {metadata['domain']}")
        
        # Group by category
        grouped = {}
        for dork in dorks:
            category = dork.category or 'uncategorized'
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(dork)
        
        lines.append(f"**Categories:** {len(grouped)}")
        lines.append(f"**Total Dorks:** {len(dorks)}")
        lines.append("")
        
        # TOC
        if self.include_toc and len(grouped) > 1:
            lines.append("## Table of Contents")
            lines.append("")
            for category in grouped.keys():
                category_name = category.replace('_', ' ').title()
                anchor = category.lower().replace('_', '-')
                lines.append(f"- [{category_name}](#{anchor}) ({len(grouped[category])} dorks)")
            lines.append("")
        
        lines.append("---")
        lines.append("")
        
        # Categories
        for category, category_dorks in grouped.items():
            category_name = category.replace('_', ' ').title()
            
            # Category header
            lines.append(f"## {category_name} ({len(category_dorks)} dorks)")
            lines.append("")
            
            # Table
            lines.append("| # | Description | Dork Query |")
            lines.append("|---|-------------|------------|")
            
            for idx, dork in enumerate(category_dorks, 1):
                desc = dork.description or "N/A"
                query = dork.query.replace("|", "\\|")  # Escape pipes
                lines.append(f"| {idx} | {desc} | `{query}` |")
            
            lines.append("")
            
            # Combined query
            if self.include_concat and len(category_dorks) > 1:
                # Check if concat_dork provided in metadata
                concat_dorks = metadata.get('concat_dorks', {})
                
                if category in concat_dorks:
                    chunks = [concat_dorks[category]]
                else:
                    # Generate optimized chunks
                    chunks = self.optimizer.optimize(category_dorks)
                
                if chunks:
                    lines.append("### Combined Query")
                    lines.append("")
                    if len(chunks) > 1:
                        lines.append(f"> [!NOTE]")
                        lines.append(f"> Split into {len(chunks)} parts to respect Google Search limits (safe 32-term limit).")
                        lines.append("")
                    
                    for i, chunk in enumerate(chunks, 1):
                        if len(chunks) > 1:
                            lines.append(f"**Part {i}**")
                        lines.append("```")
                        lines.append(chunk)
                        lines.append("```")
                        lines.append("")
            
            lines.append("---")
            lines.append("")
        
        # Footer
        lines.append("*Generated by DorkForge - Google Dork Generator for Pentesting*")
        lines.append("")
        lines.append("⚠️ **Disclaimer:** These dorks are for authorized security testing only.")
        lines.append("")
        
        return "\n".join(lines)
    
    def export_to_file(
        self, 
        dorks: list[Dork], 
        filepath: str, 
        metadata: Optional[dict] = None
    ) -> None:
        """Export dorks to Markdown file.
        
        Args:
            dorks: List of Dork objects
            filepath: Path to output file
            metadata: Optional metadata dict
        """
        output = self.export(dorks, metadata)
        Path(filepath).write_text(output, encoding='utf-8')
    
    def get_file_extension(self) -> str:
        """Get file extension."""
        return "md"
