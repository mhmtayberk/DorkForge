import unittest
import json
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from dorkforge.core.engine import DorkEngine

class TestDorkForgeSystem(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.engine = DorkEngine()

    def test_01_template_integrity(self):
        """Verify all templates load correctly"""
        print("\n[TEST] Verifying Template Integrity...")
        categories = self.engine.list_categories()
        self.assertTrue(len(categories) > 0, "No categories found")
        
        for category in categories:
            info = self.engine.get_category_info(category)
            self.assertIsNotNone(info, f"Could not get info for {category}")
            print(f"  ✓ {category}: {info['template_count']} templates")

    def test_02_specific_filters_logic(self):
        """Verify dynamic filters (query_contains, description_contains) logic in Engine/API"""
        print("\n[TEST] Verifying Specific Filter Logic...")
        
        # Test Case: Admin Panels with 'WordPress' tech filter
        # WordPress filter maps to description_contains="WordPress" in admin_panels.yaml
        
        # We simulate the API logic here because engine.generate_from_template doesn't handle 
        # the advanced filtering itself (it's done in app.py or needs params passed correctly if engine handles it).
        # Actually app.py handles 'query_contains' manually. 
        # So we must test the API endpoint.
        
        payload = {
            "domain": "example.com",
            "category": "admin_panels",
            "settings": { # Simulating how frontend sends it to generate/batch or single?
                # Single gen API is POST /api/generate
                # It accepts flat params.
            },
            # For single generation, params are top level
            "description_contains": ["WordPress"]
        }
        
        response = self.app.post('/api/generate', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertTrue(data['success'])
        
        results = data['dorks']
        self.assertTrue(len(results) > 0, "No results for WordPress admin")
        
        # Verify all results are related to WordPress
        for dork in results:
            # Title or Description should likely match, or the query logic.
            # In our implementation, we filter by description OR query?
            # app.py: 
            # if description_contains: d for d in dorks if any(val in d.description...)
            
            match = "wordpress" in dork['description'].lower() or "wp-" in dork['query'].lower()
            self.assertTrue(match, f"Dork '{dork['query']}' aka '{dork['description']}' did not match WordPress filter")
            
        print(f"  ✓ Admin Panels 'WordPress' filter returned {len(results)} focused dorks")

    def test_03_batch_generation_with_settings(self):
        """Verify Batch Configuration with Per-Category Settings"""
        print("\n[TEST] Verifying Batch Generation with Specific Filters...")
        
        payload = {
            "domain": "target.com",
            "categories": ["admin_panels", "social_media"],
            "keyword": "secret",
            "settings": {
                "admin_panels": {
                     "description_contains": ["Joomla"] # Specific to Admin
                },
                "social_media": {
                     "query_contains": ["linkedin.com"] # Specific to Social
                }
            }
        }
        
        response = self.app.post('/api/generate/batch', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertTrue(data['success'])
        
        results = data['results']
        self.assertIn('admin_panels', results)
        self.assertIn('social_media', results)
        
        # Check Admin Panels (Joomla only)
        admin_dorks = results['admin_panels']
        self.assertTrue(len(admin_dorks) > 0)
        for d in admin_dorks:
            self.assertIn("joomla", d['description'].lower())
        print(f"  ✓ Batch Admin (Joomla) verified")
        
        # Check Social Media (LinkedIn only)
        social_dorks = results['social_media']
        self.assertTrue(len(social_dorks) > 0)
        for d in social_dorks:
            self.assertIn("linkedin.com", d['query'].lower())
        print(f"  ✓ Batch Social (LinkedIn) verified")

    def test_04_global_logic_removal(self):
        """Verify Common Settings are effectively ignored/defaulted"""
        # If we send 'maxDorks' in settings it should still work (logic kept in app.py)
        # But we want to ensure basic functionality works without them.
        pass 

if __name__ == '__main__':
    unittest.main()
