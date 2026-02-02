"""Base exporter interface."""

from abc import ABC, abstractmethod
from typing import Optional
from pathlib import Path

from dorkforge.core.dork import Dork


class BaseExporter(ABC):
    """Abstract base class for dork exporters.
    
    All exporters must implement export() and export_to_file() methods.
    This ensures consistent interface across all export formats.
    
    Example:
        >>> class MyExporter(BaseExporter):
        ...     def export(self, dorks, metadata):
        ...         return "formatted output"
        ...     
        ...     def export_to_file(self, dorks, filepath, metadata):
        ...         output = self.export(dorks, metadata)
        ...         Path(filepath).write_text(output)
    """
    
    @abstractmethod
    def export(self, dorks: list[Dork], metadata: Optional[dict] = None) -> str:
        """Export dorks to string format.
        
        Args:
            dorks: List of Dork objects to export
            metadata: Optional metadata dict (domain, category, timestamp, etc.)
            
        Returns:
            Formatted string output
            
        Raises:
            NotImplementedError: If subclass doesn't implement
        """
        pass
    
    @abstractmethod
    def export_to_file(
        self, 
        dorks: list[Dork], 
        filepath: str, 
        metadata: Optional[dict] = None
    ) -> None:
        """Export dorks to file.
        
        Args:
            dorks: List of Dork objects to export
            filepath: Path where file should be written
            metadata: Optional metadata dict
            
        Raises:
            IOError: If file cannot be written
            NotImplementedError: If subclass doesn't implement
        """
        pass
    
    def get_file_extension(self) -> str:
        """Get default file extension for this exporter.
        
        Returns:
            File extension without dot (e.g., 'txt', 'json', 'md')
        """
        return "txt"
