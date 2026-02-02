"""CSV exporter for dorks."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import csv
from io import StringIO
from pathlib import Path

from dorkforge.export.base import BaseExporter
from dorkforge.core.dork import Dork


class CSVExporter(BaseExporter):
    """Export dorks to CSV format."""
    
    def export(self, dorks: List[Dork], metadata: Dict[str, Any] = None) -> str:
        """Export dorks to CSV format with metadata.
        
        Args:
            dorks: List of Dork objects to export
            metadata: Additional metadata (domain, keyword, etc.)
            
        Returns:
            CSV string content
            
        Example:
            >>> exporter = CSVExporter()
            >>> csv_content = exporter.export(dorks, {'domain': 'example.com'})
        """
        if metadata is None:
            metadata = {}
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Category',
            'Dork',
            'Description',
            'Generated_At',
            'Domain',
            'Keyword',
            'Source'
        ])
        
        # Extract metadata
        domain = metadata.get('domain', 'N/A')
        keyword = metadata.get('keyword', 'N/A')
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Helper to sanitize CSV fields (Formula Injection Prevention)
        def sanitize(value):
            val_str = str(value) if value is not None else ''
            if val_str.startswith(('=', '+', '-', '@')):
                return f"'{val_str}"
            return val_str

        # Write rows
        for dork in dorks:
            writer.writerow([
                sanitize(dork.category or 'N/A'),
                sanitize(dork.query or ''),
                sanitize(dork.description or ''),
                sanitize(timestamp),
                sanitize(domain),
                sanitize(keyword),
                sanitize(dork.source or 'dorkforge')
            ])
        
        return output.getvalue()
    
    def export_to_file(
        self, 
        dorks: List[Dork], 
        filepath: str, 
        metadata: Dict[str, Any] = None
    ) -> None:
        """Export dorks to CSV file.
        
        Args:
            dorks: List of Dork objects
            filepath: Path to output file
            metadata: Optional metadata dict
        """
        output = self.export(dorks, metadata)
        # Use utf-8-sig for Excel compatibility (BOM)
        Path(filepath).write_text(output, encoding='utf-8-sig')

    def get_file_extension(self) -> str:
        """Get file extension for CSV files.
        
        Returns:
            'csv'
        """
        return 'csv'
