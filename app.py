"""DorkForge Flask Web Application."""

import logging
import os
import re
from pathlib import Path
from flask import Flask, render_template, request, jsonify

# Load environment variables from .env file
from dotenv import load_dotenv, dotenv_values
load_dotenv()  # This must be before other imports that use env vars

from dorkforge.core.engine import DorkEngine
from dorkforge.core.validator import DorkValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
            template_folder='web/templates',
            static_folder='web/static')

# Initialize DorkForge components
engine = DorkEngine()
validator = DorkValidator()

logger.info("DorkForge Web App initialized")


def format_category_name(category_id):
    """Convert category_id to human-readable format.
    
    Example: api_endpoints -> API Endpoints
    """
    return ' '.join(word.capitalize() for word in category_id.split('_'))


from functools import wraps
from flask import abort

def require_local(f):
    """Decorator to require request from localhost."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check remote address
        # 127.0.0.1 for IPv4, ::1 for IPv6
        if request.remote_addr not in ['127.0.0.1', '::1']:
            logger.warning(f"Blocked remote access to sensitive endpoint from {request.remote_addr}")
            return jsonify({
                'success': False,
                'error': 'This action is restricted to local access only for security reasons.'
            }), 403
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def index():
    """Render main page."""
    return render_template('index.html')


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all available template categories."""
    try:
        categories = engine.list_categories()
        
        # Get category info for each
        category_info = []
        for cat in categories:
            info = engine.get_category_info(cat)
            category_info.append({
                'id': cat,
                'name': format_category_name(cat),
                'description': info['description'],
                'template_count': info['template_count'],
                'filters': info.get('filters', []) # Pass filters to frontend
            })
        
        return jsonify({
            'success': True,
            'categories': category_info
        })
    
    except Exception as e:
        logger.exception("Error getting categories")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/generate', methods=['POST'])
def generate_dorks():
    """Generate dorks from templates."""
    try:
        data = request.get_json()
        
        category = data.get('category')
        domain = data.get('domain', '')
        keyword = data.get('keyword', '')
        
        # New: Category-specific settings
        max_dorks = data.get('maxDorks', 0)  # 0 = all
        include_operators = data.get('includeOperators', [])
        exclude_patterns = data.get('excludePatterns', [])
        custom_keywords = data.get('customKeywords', [])
        https_only = data.get('httpsOnly', False)
        
        if not category:
            return jsonify({
                'success': False,
                'error': 'Category is required'
            }), 400
        
        # Build parameters
        params = {}
        if domain:
            params['domain'] = domain
            params['domain_name'] = domain  # Alias for templates using {domain_name}
        if keyword:
            params['keyword'] = keyword
        

        
        # Generate dorks
        dorks = engine.generate_from_template(
            category=category,
            params=params
        )
        
        # Apply filters using shared logic
        filters = {
            'include_operators': include_operators,
            'exclude_patterns': exclude_patterns,
            'custom_keywords': custom_keywords,
            'https_only': https_only,
            'query_contains': data.get('query_contains', []),
            'description_contains': data.get('description_contains', []),
            'max_dorks': max_dorks
        }
        
        filtered_dorks = _filter_dorks(dorks, filters)
        
        # Convert to dict
        dorks_data = [
            {
                'query': dork.query,
                'description': dork.description,
                'category': dork.category,
                'source': dork.source
            }
            for dork in filtered_dorks
        ]
        
        # Create concatenated dork (all queries with OR)
        concat_dork = None
        if len(filtered_dorks) > 1:
            queries = [f'({dork.query})' for dork in filtered_dorks]
            concat_dork = ' OR '.join(queries)
        
        return jsonify({
            'success': True,
            'count': len(dorks_data),
            'dorks': dorks_data,
            'concat_dork': concat_dork
        })
    
    except Exception as e:
        logger.exception("Error generating dorks")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/generate/batch', methods=['POST'])
def generate_batch():
    """Generate dorks for multiple categories."""
    try:
        data = request.json
        domain = data.get('domain')
        keyword = data.get('keyword', '')
        categories = data.get('categories', [])
        engine_type = data.get('engine', 'google') # Get engine type
        
        if not domain or not categories:
            return jsonify({'error': 'Missing domain or categories'}), 400
            

            
        base_params = {
            'domain': domain,
            'domain_name': domain
        }
        if keyword:
            base_params['keyword'] = keyword

        # Get per-category settings if available
        category_settings = data.get('settings', {})

        batch_results = {}
        total_count = 0
        concat_dorks = {}

        for category in categories:
            try:
                # Generate raw dorks
                dorks = engine.generate_from_template(category, base_params, target_engine=engine_type)
                
                # Apply filters from settings
                cat_settings = category_settings.get(category, {})

                # Prepare filters dict
                filters = {
                    'include_operators': cat_settings.get('includeOperators', []),
                    'exclude_patterns': cat_settings.get('excludePatterns', []),
                    'https_only': cat_settings.get('httpsOnly'),
                    'query_contains': cat_settings.get('query_contains', []),
                    'description_contains': cat_settings.get('description_contains', []),
                    'max_dorks': cat_settings.get('maxDorks', 0)
                }

                # Use shared helper
                filtered = _filter_dorks(dorks, filters)
                
                batch_results[category] = [
                    {
                        'query': d.query,
                        'description': d.description,
                        'category': d.category,
                        'source': d.source
                    }
                    for d in filtered
                ]
                total_count += len(filtered)
                
                if len(filtered) > 1:
                    queries = [f'({d.query})' for d in filtered]
                    concat_dorks[category] = ' OR '.join(queries)

            except Exception as e:
                logger.error(f"Error in batch category {category}: {e}")
                continue

        return jsonify({
            'success': True,
            'total_count': total_count,
            'results': batch_results,
            'concat_dorks': concat_dorks
        })
    
    except Exception as e:
        logger.exception("Error in batch generation")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/validate', methods=['POST'])
def validate_dork():
    """Validate a dork query."""
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
        
        # Validate syntax
        is_valid = validator.validate_syntax(query)
        
        # Get explanation if valid
        explanation = None
        if is_valid:
            explanation = validator.explain_dork(query)
        
        # Get errors if invalid
        errors = []
        if not is_valid:
            errors = validator.detect_common_errors(query)
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'explanation': explanation,
            'errors': errors
        })
    
    except Exception as e:
        logger.exception("Error validating dork")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/export', methods=['POST'])
def export_dorks():
    """Export dorks to file format."""
    try:
        from dorkforge.export import get_exporter
        
        data = request.get_json()
        
        dorks_data = data.get('dorks', [])
        format_type = data.get('format', 'txt')  # txt, json, md
        metadata = data.get('metadata', {})
        
        if not dorks_data:
            return jsonify({
                'success': False,
                'error': 'No dorks provided'
            }), 400
        
        # Convert dork dicts back to Dork objects
        from dorkforge.core.dork import Dork
        dorks = [
            Dork(
                query=d['query'],
                category=d.get('category', 'unknown'),
                description=d.get('description', ''),
                source=d.get('source', 'web_ui')
            )
            for d in dorks_data
        ]
        
        # Get exporter
        try:
            exporter = get_exporter(format_type)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Export to string
        output = exporter.export(dorks, metadata)
        
        return jsonify({
            'success': True,
            'content': output,
            'format': format_type,
            'filename': f'dorkforge_export.{exporter.get_file_extension()}'
        })
    
    except Exception as e:
        logger.exception("Error exporting dorks")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ai/generate', methods=['POST'])
def ai_generate_dork():
    """Generate dork using AI."""
    try:
        from dorkforge.ai import get_ai_provider, detect_hallucination, auto_fix_common_issues
        from dorkforge.core.validator import DorkValidator
        
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        provider_type = data.get('provider', 'openai')  # openai or ollama
        model = data.get('model') if provider_type == 'ollama' else None
        domain = data.get('domain', '').strip()
        keyword = data.get('keyword', '').strip()
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        # Get AI provider
        try:
            # Pass model if provided (specifically for Ollama)
            kwargs = {'model': model} if model else {}
            provider = get_ai_provider(provider_type, **kwargs)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Check if provider is available
        if not provider.is_available():
            error_msg = f"AI provider '{provider_type}' is not available."
            
            # Check for specific error from provider
            detailed_error = None
            if hasattr(provider, 'get_error'):
                detailed_error = provider.get_error()
                
            if detailed_error:
                error_msg += f" Diagnostics: {detailed_error}"
            else:
                error_messages = {
                    'openai': "Please set OPENAI_API_KEY environment variable.",
                    'gemini': "Please set GOOGLE_API_KEY environment variable.",
                    'google': "Please set GOOGLE_API_KEY environment variable.",
                    'claude': "Please set ANTHROPIC_API_KEY environment variable.",
                    'anthropic': "Please set ANTHROPIC_API_KEY environment variable.",
                    'groq': "Please set GROQ_API_KEY environment variable.",
                    'deepseek': "Please set DEEPSEEK_API_KEY environment variable.",
                    'grok': "Please set XAI_API_KEY environment variable.",
                    'xai': "Please set XAI_API_KEY environment variable.",
                    'huggingface': "Please set HUGGINGFACE_API_KEY environment variable.",
                    'hf': "Please set HUGGINGFACE_API_KEY environment variable.",
                    'ollama': "Please start Ollama with 'ollama serve'."
                }
                error_msg += " " + error_messages.get(provider_type, "Please configure the provider.")
            
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Build context
        context = {}
        if domain:
            context['domain'] = domain
        
        # Generate dork
        try:
            dork_raw = provider.generate_dork(prompt, context)
            dork = auto_fix_common_issues(dork_raw)
        except Exception as e:
            error_str = str(e)
            logger.error(f"AI generation failed: {error_str}")
            
            # User-friendly error for 429/Quota
            if "429" in error_str or "Quota exceeded" in error_str:
                short_error = "⚠️ AI Provider Quota Exceeded (429). Please wait a moment or check your billing."
            else:
                short_error = f"AI generation failed: {error_str.split('[')[0].strip()}" # Strip internal details if possible
                
            return jsonify({
                'success': False,
                'error': short_error
            }), 500
        
        # Validate and check for hallucination
        validator = DorkValidator()
        is_valid_syntax = validator.validate_syntax(dork)
        is_valid_hallucination, hallucination_issues = detect_hallucination(
            dork, 
            validator.VALID_OPERATORS
        )
        
        # Get explanation
        explanation = validator.explain_dork(dork) if is_valid_syntax else None
        
        # Combined validation
        is_valid = is_valid_syntax and is_valid_hallucination
        issues = []
        
        if not is_valid_syntax:
            issues.append("Invalid Google dork syntax")
        
        if not is_valid_hallucination:
            issues.extend(hallucination_issues)
        
        return jsonify({
            'success': True,
            'dork': dork,
            'valid': is_valid,
            'issues': issues,
            'explanation': explanation,
            'provider': provider.get_provider_name()
        })
    
    except Exception as e:
        logger.exception("Error in AI generation")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/permute', methods=['POST'])
def permute_dork():
    """Generate dork variations."""
    try:
        from dorkforge.core.permutator import DorkPermutator
        
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
            
        permutator = DorkPermutator()
        variations = permutator.get_variations(query)
        
        return jsonify({
            'success': True,
            'variations': variations
        })
        
    except Exception as e:
        logger.exception("Permutation error")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/settings/load', methods=['GET'])
@require_local
def load_settings():
    """Load current API keys from .env file (masked for security)."""
    try:
        env_path = Path('.env')
        
        if not env_path.exists():
            return jsonify({
                'success': False,
                'error': '.env file not found'
            }), 404
        
        # Load all env values
        env_values = dotenv_values(str(env_path))
        
        # Keys to expose (masked)
        api_keys = [
            'OPENAI_API_KEY',
            'GOOGLE_API_KEY',
            'ANTHROPIC_API_KEY',
            'GROQ_API_KEY',
            'DEEPSEEK_API_KEY',
            'XAI_API_KEY',
            'HUGGINGFACE_API_KEY',
            'OLLAMA_BASE_URL'
        ]
        
        # Build masked response
        masked = {}
        for key in api_keys:
            value = env_values.get(key, '')
            masked[key] = _mask_api_key(value) if value else ''
        
        return jsonify({
            'success': True,
            'keys': masked
        })
    
    except Exception as e:
        logger.exception("Error loading settings")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/settings/save', methods=['POST'])
@require_local
def save_settings():
    """Save API keys to .env file with validation and backup."""
    try:
        data = request.get_json()
        env_path = Path('.env')
        
        # 1. Create backup
        if env_path.exists():
            backup_path = Path('.env.backup')
            shutil.copy(env_path, backup_path)
            logger.info("Created .env backup")
        
        # 2. Validate all provided keys
        errors = {}
        for key, value in data.items():
            if value and not _validate_api_key_format(key, value):
                errors[key] = f"Invalid format for {key}"

        if errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': errors
            }), 400
        
        # 3. Save to .env
        env_content = {}
        if env_path.exists():
            env_content = dotenv_values(str(env_path))
        
        # Update values
        for key, value in data.items():
            if value is not None:  # Allow empty string to clear a key
                env_content[key] = value
        
        # Write back to file
        _save_to_env(env_path, env_content)
        
        # Reload environment variables for full synchronization
        from dotenv import load_dotenv
        load_dotenv(str(env_path), override=True)
        
        return jsonify({
            'success': True,
            'message': 'Saved'
        })
    
    except Exception as e:
        logger.exception("Error saving settings")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ai/models/ollama', methods=['GET'])
def list_ollama_models():
    """List available Ollama models."""
    try:
        import requests
        # Default Ollama URL
        base_url = "http://localhost:11434"
        
        # Try to get custom URL from env
        env_path = Path('.env')
        if env_path.exists():
            env_values = dotenv_values(str(env_path))
            if env_values.get('OLLAMA_BASE_URL'):
                base_url = env_values.get('OLLAMA_BASE_URL').rstrip('/')

        response = requests.get(f"{base_url}/api/tags", timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            models = [model['name'] for model in data.get('models', [])]
            return jsonify({
                'success': True,
                'models': models
            })
        else:
            return jsonify({
                'success': False,
                'error': f"Ollama API returned {response.status_code}"
            }), 502

    except Exception as e:
        # Don't log full stack trace for connection errors (common if not running)
        return jsonify({
            'success': False, 
            'error': "Ollama not running or unreachable"
        }), 503




def _mask_api_key(key):
    """Mask API key for secure display.
    
    Examples:
        sk-1234567890abcdef -> sk-***cdef
        AIzaSyABC123...XYZ -> AIz...XYZ
    """
    if not key or len(key) < 8:
        return '***'
    
    return f"{key[:3]}...{key[-4:]}"


def _validate_api_key_format(key_name, value):
    """Validate API key format using regex patterns.
    
    Args:
        key_name: Environment variable name (e.g., 'OPENAI_API_KEY')
        value: API key value to validate
    
    Returns:
        bool: True if valid or no pattern defined, False otherwise
    """
    # Validation patterns for known providers
    patterns = {
        'OPENAI_API_KEY': r'^sk-[A-Za-z0-9]{48,}$',
        'ANTHROPIC_API_KEY': r'^sk-ant-',
        'GOOGLE_API_KEY': r'^AIza[A-Za-z0-9_-]+$',
        'GROQ_API_KEY': r'^gsk_',
        'XAI_API_KEY': r'^xai-',
        'OLLAMA_BASE_URL': r'^https?://',
    }
    
    pattern = patterns.get(key_name)
    if not pattern:
        # No validation pattern defined, accept any value
        return True
    
    return bool(re.match(pattern, value))


def _save_to_env(path: Path, values: dict):
    """Write key-value pairs to .env file securely.
    
    Args:
        path: Path to .env file
        values: Dictionary of environment variables
    """
    try:
        lines = []
        for key, value in values.items():
            if not value:
                # Clear from current process
                os.environ.pop(key, None)
                # Keep in file as empty if desired, or skip. Let's keep empty line.
                lines.append(f'{key}=""')
            else:
                # Basic sanitization
                clean_val = str(value).replace('"', '\\"').replace('\n', '')
                lines.append(f'{key}="{clean_val}"')
                # Update current process environment so AI providers detect changes immediately
                os.environ[key] = str(value)
            
        with open(path, 'w') as f:
            f.write('\n'.join(lines) + '\n')
            
        # Secure file permissions (readable only by current user)
        try:
            os.chmod(path, 0o600)
        except Exception:
            pass # Fallback for OS that doesn't support chmod
            
        logger.info(f"Updated {path}")
    except Exception as e:
        logger.error(f"Failed to write to .env: {e}")
        raise RuntimeError(f"File writing error: {e}")



def _filter_dorks(dorks, filters):
    """
    Centralized logic for filtering dorks.
    
    Args:
        dorks (iterable): Iterable of Dork objects
        filters (dict): Dictionary containing filter rules:
            - include_operators (list): Dorks must contain one of these
            - exclude_patterns (list): Dorks must NOT contain these
            - custom_keywords (list): Keywords to append
            - https_only (bool): If True, exclude http
            - query_contains (list): Dorks must contain one of these string values
            - description_contains (list): Description must contain one of these
            - max_dorks (int): Limit number of results
            
    Returns:
        list: Filtered list of Dork objects
    """
    filtered_dorks = list(dorks)
    
    # 1. Include Operators
    include_ops = filters.get('include_operators')
    if include_ops:
        filtered_dorks = [
            d for d in filtered_dorks 
            if any(op + ':' in d.query.lower() for op in include_ops)
        ]
    
    # 2. Exclude Patterns
    exclude_pats = filters.get('exclude_patterns')
    if exclude_pats:
        for pattern in exclude_pats:
            pattern_lower = pattern.lower()
            filtered_dorks = [
                d for d in filtered_dorks 
                if pattern_lower not in d.query.lower()
            ]
            
    # 3. Custom Keywords (Append logic - creates new Dork objects)
    custom_kws = filters.get('custom_keywords')
    if custom_kws:
        for i, dork in enumerate(filtered_dorks):
            keywords_str = ' '.join(f'"{kw}"' for kw in custom_kws)
            # Replace logic: create new object with updated query
            filtered_dorks[i] = type(dork)(
                query=f'{dork.query} {keywords_str}',
                description=dork.description,
                category=dork.category,
                source=dork.source
            )

    # 4. HTTPS Only
    if filters.get('https_only'):
        for i, dork in enumerate(filtered_dorks):
            if '-inurl:http' not in dork.query.lower():
                 filtered_dorks[i] = type(dork)(
                    query=f'{dork.query} -inurl:http',
                    description=dork.description,
                    category=dork.category,
                    source=dork.source
                )

    # 5. Dynamic Query Contains
    q_contains = filters.get('query_contains')
    if q_contains:
        filtered_dorks = [
            d for d in filtered_dorks 
            if any(val.lower() in d.query.lower() for val in q_contains)
        ]

    # 6. Dynamic Description Contains
    d_contains = filters.get('description_contains')
    if d_contains:
        filtered_dorks = [
            d for d in filtered_dorks 
            if any(val.lower() in d.description.lower() for val in d_contains)
        ]
        
    # 7. Max Dorks
    max_dorks = filters.get('max_dorks', 0)
    if max_dorks > 0:
        filtered_dorks = filtered_dorks[:max_dorks]
        
    return filtered_dorks


@app.after_request
def add_security_headers(response):
    """Add security headers to every response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Content Security Policy
    # Allow scripts/styles from self and unsafe-inline (needed for current UI architecture)
    # Allow CDN for external libs if used (e.g. Tailwind via CDN)
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    return response


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)

