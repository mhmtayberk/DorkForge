import os
import json
import yaml
from pathlib import Path

def bundle_templates():
    source_dir = Path("dorkforge/templates/data")
    output_file = Path("extension/data/templates.json")
    
    templates = []
    
    print(f"Scanning {source_dir}...")
    
    for root, _, files in os.walk(source_dir):
        for file in files:
            file_path = Path(root) / file
            
            try:
                data = None
                if file.endswith('.json'):
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                elif file.endswith('.yaml') or file.endswith('.yml'):
                    with open(file_path, 'r') as f:
                        data = yaml.safe_load(f)
                
                if data:
                    print(f"Processing {file}...")
                    # Normalize data structure if needed
                    # Assuming data is a list of templates or a category dict
                    # Based on typical dorkforge structure, let's just collect them
                    
                    # If the file represents a category with templates
                    if isinstance(data, dict) and 'templates' in data:
                        templates.append(data)
                    elif isinstance(data, list):
                        # Some files might be lists of category objects?
                        templates.extend(data)
                        
            except Exception as e:
                print(f"Error processing {file}: {e}")

    # Wrap in a consistent structure
    output_data = {
        "categories": templates,
        "meta": {
            "version": "1.0",
            "count": len(templates)
        }
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Bundled {len(templates)} categories into {output_file}")

if __name__ == "__main__":
    bundle_templates()
