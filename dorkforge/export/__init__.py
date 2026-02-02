"""Export package initialization."""

from dorkforge.export.base import BaseExporter
from dorkforge.export.txt import TXTExporter
from dorkforge.export.json_exporter import JSONExporter
from dorkforge.export.markdown import MarkdownExporter
from dorkforge.export.csv_exporter import CSVExporter


def get_exporter(format_type: str) -> BaseExporter:
    """Get exporter instance by format type.
    
    Args:
        format_type: Format name ('txt', 'json', 'md', 'markdown', 'csv')
        
    Returns:
        Exporter instance
        
    Raises:
        ValueError: If format type is unknown
        
    Example:
        >>> exporter = get_exporter('csv')
        >>> output = exporter.export(dorks, metadata)
    """
    exporters = {
        'txt': TXTExporter,
        'json': JSONExporter,
        'md': MarkdownExporter,
        'markdown': MarkdownExporter,
        'csv': CSVExporter,
    }
    
    format_lower = format_type.lower()
    
    if format_lower not in exporters:
        raise ValueError(
            f"Unknown export format: {format_type}. "
            f"Supported formats: {', '.join(exporters.keys())}"
        )
    
    return exporters[format_lower]()


__all__ = [
    'BaseExporter',
    'TXTExporter',
    'JSONExporter',
    'MarkdownExporter',
    'CSVExporter',
    'get_exporter',
]

