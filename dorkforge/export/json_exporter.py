"""JSON exporter."""

import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from dorkforge.core.dork import Dork
from dorkforge.export.base import BaseExporter


class JSONExporter(BaseExporter):
    """Export dorks to JSON format.
    
    Output structure:
        {
            "metadata": {
                "generated_at": "2026-01-27T22:52:00Z",
                "domain": "example.com",
                "categories": ["sensitive_files"],
                "total_count": 10
            },
            "dorks": [
                {
                    "query": "site:example.com filetype:env",
                    "description": "Find .env files",
                    "category": "sensitive_files",
                    "source": "template"
                }
            ],
            "by_category": {
                "sensitive_files": [...]
            }
        }
    
    Example:
        >>> exporter = JSONExporter(pretty=True)
        >>> output = exporter.export(dorks, {'domain': 'example.com'})
        >>> data = json.loads(output)
    """
    
    def __init__(self, pretty: bool = True, include_metadata: bool = True):
        """Initialize JSON exporter.
        
        Args:
            pretty: Whether to pretty-print JSON
            include_metadata: Whether to include metadata section
        """
        self.pretty = pretty
        self.include_metadata = include_metadata
    
    def export(self, dorks: list[Dork], metadata: Optional[dict] = None) -> str:
        """Export dorks to JSON.
        
        Args:
            dorks: List of Dork objects
            metadata: Optional metadata dict
            
        Returns:
            JSON string
        """
        metadata = metadata or {}
        
        # Build output structure
        output = {}
        
        # Metadata section
        if self.include_metadata:
            output['metadata'] = {
                'generated_at': metadata.get(
                    'timestamp', 
                    datetime.now().isoformat()
                ),
                'total_count': len(dorks)
            }
            
            if 'domain' in metadata:
                output['metadata']['domain'] = metadata['domain']
            
            if 'categories' in metadata:
                output['metadata']['categories'] = metadata['categories']
            elif 'category' in metadata:
                output['metadata']['categories'] = [metadata['category']]
        
        # Dorks array
        output['dorks'] = [
            {
                'query': dork.query,
                'description': dork.description,
                'category': dork.category,
                'source': dork.source,
                'parameters': dork.parameters
            }
            for dork in dorks
        ]
        
        # Group by category
        by_category = {}
        for dork in dorks:
            category = dork.category or 'uncategorized'
            if category not in by_category:
                by_category[category] = []
            
            by_category[category].append({
                'query': dork.query,
                'description': dork.description
            })
        
        output['by_category'] = by_category
        
        # Add concat dorks if provided
        if 'concat_dorks' in metadata:
            output['concat_dorks'] = metadata['concat_dorks']
        
        # Serialize
        if self.pretty:
            return json.dumps(output, indent=2, ensure_ascii=False)
        else:
            return json.dumps(output, ensure_ascii=False)
    
    def export_to_file(
        self, 
        dorks: list[Dork], 
        filepath: str, 
        metadata: Optional[dict] = None
    ) -> None:
        """Export dorks to JSON file.
        
        Args:
            dorks: List of Dork objects
            filepath: Path to output file
            metadata: Optional metadata dict
        """
        output = self.export(dorks, metadata)
        Path(filepath).write_text(output, encoding='utf-8')
    
    def get_file_extension(self) -> str:
        """Get file extension."""
        return "json"
