
import sys
import os
import yaml
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dorkforge.core.translator import DorkTranslator

def load_all_patterns():
    patterns = []
    base_dir = Path("dorkforge/templates/data")
    for f in base_dir.glob("*.yaml"):
        with open(f) as yaml_file:
            data = yaml.safe_load(yaml_file)
            if 'templates' in data:
                for t in data['templates']:
                    patterns.append(t['pattern'])
    return patterns

def main():
    translator = DorkTranslator()
    engines = translator.ENGINES.keys()
    patterns = load_all_patterns()

    print(f"Loaded {len(patterns)} templates.")
    print(f"Testing against engines: {list(engines)}\n")

    issues = []

    for engine in engines:
        if engine == "google": continue 
        
    for engine in engines:
        if engine == "google": continue 
        
        print(f"--- Checking {engine} ---")
        for p in patterns:
            # We use a dummy domain for cleaner output
            dork = p.replace('{domain}', 'example.com')
            translated = translator.translate(dork, engine)
            
            import re
            
            # Check for suspicious leftovers
            # Use word boundary to avoid matching "intext:" as "ext:"
            if engine == "bing":
                if re.search(r'\bext:', translated):
                    issues.append(f"[{engine}] 'ext:' not translated: {translated}")
                # Bing supports inbody, but let's check if intext remains
                if re.search(r'\bintext:', translated):
                     # Bing prefers inbody, but intext is alias? 
                     # Actually translator maps it to inbody. So intext shouldn't be tere.
                     issues.append(f"[{engine}] 'intext:' not translated: {translated}")

            if engine == "yandex":
                if re.search(r'\bext:', translated):
                    issues.append(f"[{engine}] 'ext:' not translated: {translated}")
                if re.search(r'\bintitle:', translated):
                    issues.append(f"[{engine}] 'intitle:' not translated: {translated}")

    if issues:
        print("\nFound potential issues:")
        for i in issues[:20]: # Show top 20
            print(i)
        if len(issues) > 20: print(f"... and {len(issues)-20} more.")
    else:
        print("\nNo obvious translation gaps found!")

if __name__ == "__main__":
    main()
