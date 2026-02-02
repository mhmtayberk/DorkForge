/**
 * DorkForge Core Logic - Ported from Python
 * Includes Validator, Permutator, and Generator engines.
 */

// --- Validator ---
class DorkValidator {
    constructor() {
        this.VALID_OPERATORS = new Set([
            "site", "filetype", "ext", "intext", "allintext", "inurl",
            "allinurl", "intitle", "allintitle", "link", "cache",
            "related", "info"
        ]);
    }

    validateSyntax(query) {
        if (!query || !query.trim()) return false;

        // Unmatched quotes
        const quoteCount = (query.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) return false;

        // Invalid operator spacing (operator: value) - checks for space after colon
        if (/\w+:\s+/.test(query)) return false;

        return true;
    }

    validateDork(query) {
        if (!this.validateSyntax(query)) {
            return { valid: false, error: "Invalid syntax (check quotes or spacing)" };
        }

        const operators = this._parseOperators(query);
        const compatibilityError = this._checkCompatibility(operators);

        if (compatibilityError) {
            return { valid: false, error: compatibilityError };
        }

        return { valid: true };
    }

    explainDork(query) {
        const operators = this._parseOperators(query);
        const parts = ["This dork searches for:"];

        for (const [op, val] of Object.entries(operators)) {
            switch (op) {
                case 'site': parts.push(`- Pages on domain: ${val}`); break;
                case 'filetype':
                case 'ext': parts.push(`- Files of type: ${val}`); break;
                case 'intext': parts.push(`- Text containing: ${val}`); break;
                case 'allintext': parts.push(`- Text containing all: ${val}`); break;
                case 'intitle': parts.push(`- Title containing: ${val}`); break;
                case 'allintitle': parts.push(`- Title containing all: ${val}`); break;
                case 'inurl': parts.push(`- URL containing: ${val}`); break;
                case 'allinurl': parts.push(`- URL containing all: ${val}`); break;
                default: parts.push(`- ${op}: ${val}`);
            }
        }
        return parts.length > 1 ? parts.join('\n') : "No specific operators found.";
    }

    detectErrors(query) {
        const errors = [];

        // Spacing after colon
        const spacingMatches = query.match(/(\w+):\s+/g);
        if (spacingMatches) {
            spacingMatches.forEach(m => errors.push(`Invalid spacing in "${m.trim()}"`));
        }

        // Unmatched quotes
        if (((query.match(/"/g) || []).length) % 2 !== 0) {
            errors.push("Unmatched quotes");
        }

        // Multiple 'allin'
        const allinOps = (query.match(/\ballin\w+:/g) || []);
        if (allinOps.length > 1) {
            errors.push("Multiple 'allin' operators found (use only one)");
        }

        return errors;
    }

    _parseOperators(query) {
        const operators = {};
        // Regex to capture key:value (handles quoted values)
        const regex = /(\w+):(".*?"|\S+)/g;
        let match;
        while ((match = regex.exec(query)) !== null) {
            let [_, op, val] = match;
            val = val.replace(/^"|"$/g, ''); // Strip quotes
            operators[op.toLowerCase()] = val;
        }
        return operators;
    }

    _checkCompatibility(operators) {
        const ops = Object.keys(operators);

        if (ops.includes('allintext') && ops.includes('intext')) return "Cannot combine 'allintext' and 'intext'";
        if (ops.includes('allintitle') && ops.includes('intitle')) return "Cannot combine 'allintitle' and 'intitle'";
        if (ops.includes('allinurl') && ops.includes('inurl')) return "Cannot combine 'allinurl' and 'inurl'";

        const allins = ops.filter(o => o.startsWith('allin'));
        if (allins.length > 1) return `Multiple 'allin' operators found: ${allins.join(', ')}`;

        return null;
    }
}

// --- Permutator ---
class DorkPermutator {
    constructor() {
        this.EXTENSION_MAP = {
            "php": ["php", "php5", "phtml", "php7"],
            "asp": ["asp", "aspx", "asa"],
            "jsp": ["jsp", "jspx", "do", "action"],
            "js": ["js", "json", "map"],
            "sql": ["sql", "dump", "bak", "db"],
            "log": ["log", "txt", "out", "err"],
            "config": ["conf", "config", "cfg", "ini", "env", "xml", "yml", "yaml"],
            "doc": ["doc", "docx", "rtf", "odt"],
            "xls": ["xls", "xlsx", "csv"],
            "ppt": ["ppt", "pptx"],
            "bak": ["bak", "old", "backup", "swp", "tmp"],
            "zip": ["zip", "rar", "7z", "tar", "gz", "tgz"]
        };

        this.KEYWORD_MAP = {
            "login": ["login", "admin", "signin", "auth", "portal", "cpanel"],
            "password": ["password", "passwd", "pwd", "credentials", "secret"],
            "admin": ["admin", "root", "administrator", "manager", "dashboard"],
            "config": ["config", "configuration", "settings", "setup"],
            "backup": ["backup", "dump", "export", "archive"],
            "index": ["index", "index of", "listing", "directory"],
            "api": ["api", "graphql", "rest", "swagger", "v1", "v2"]
        };
    }

    getVariations(query) {
        const variations = new Set();
        variations.add(query);

        this._smartVariations(query).forEach(v => variations.add(v));

        // Expand Extensions
        const extRegex = /(?:ext|filetype):([a-zA-Z0-9\-\._]+)/g;
        let match;
        while ((match = extRegex.exec(query)) !== null) {
            const [full, ext] = match;
            const related = this._findRelated(ext, this.EXTENSION_MAP);
            if (related.length > 1) {
                const newGroup = `ext:(${related.join('|')})`;
                variations.add(query.replace(full, newGroup));
            }
        }

        // Expand Keywords
        const kwRegex = /(?:inurl|intitle|intext):([a-zA-Z0-9\-\._\/]+)/g;
        while ((match = kwRegex.exec(query)) !== null) {
            const [full, kw] = match;
            const operator = full.split(':')[0]; // extract 'inurl', 'intitle' etc

            let cleanKw = kw.toLowerCase();
            let prefix = "";
            let suffix = "";

            if (cleanKw.startsWith('/')) { prefix = "/"; cleanKw = cleanKw.substring(1); }
            if (cleanKw.endsWith('/')) { suffix = "/"; cleanKw = cleanKw.substring(0, cleanKw.length - 1); }

            const related = this._findRelated(cleanKw, this.KEYWORD_MAP);

            if (related.length > 1) {
                const adjustedRelated = related.map(r => {
                    let newR = r;
                    if (prefix && !newR.startsWith('/')) newR = prefix + newR;
                    if (suffix && !newR.endsWith('/')) newR = newR + suffix;
                    return newR;
                });
                const newGroup = `${operator}:(${adjustedRelated.join('|')})`;
                variations.add(query.replace(full, newGroup));
            }
        }

        return Array.from(variations).sort();
    }

    _smartVariations(query) {
        const smart = new Set();

        // Subdomain wildcard
        const siteMatch = query.match(/site:([a-zA-Z0-9\-\.]+)/);
        if (siteMatch) {
            const domain = siteMatch[1];
            if (!domain.startsWith('*.')) {
                smart.add(query.replace(`site:${domain}`, `site:*.${domain}`));
            }
            smart.add(`${query} -site:www.${domain}`);
        }

        // Path recursion
        const pathRegex = /(?:inurl|intitle):([a-zA-Z0-9\-\._\/]+)/g;
        let match;
        while ((match = pathRegex.exec(query)) !== null) {
            const val = match[1];
            if (val.includes('/') && (val.match(/\//g) || []).length > 1) {
                const parts = val.replace(/^\/|\/$/g, '').split('/'); // trim slashes and split
                if (parts.length > 1) {
                    const parent = parts.slice(0, -1).join('/');
                    if (parent) {
                        const newOp = match[0].replace(val, `/${parent}`); // naive replacement, but works for most
                        smart.add(query.replace(match[0], newOp));
                    }
                }
            }
        }

        return smart;
    }

    _findRelated(term, map) {
        if (map[term]) return map[term];
        for (const key in map) {
            if (map[key].includes(term)) return map[key];
        }
        return [term];
    }
}

// --- Generator ---
class DorkGenerator {
    constructor(templatesData) {
        this.templatesData = templatesData || { categories: [] };
    }

    getCategories() {
        return this.templatesData.categories.map(c => {
            // Handle both 'category' (standard) and 'name' (social media) keys
            const rawName = c.category || c.name || "Unknown";
            return {
                id: rawName,
                name: this._formatName(rawName),
                desc: c.description
            };
        });
    }

    generate(categoryName, params) {
        const category = this.templatesData.categories.find(c => (c.category || c.name) === categoryName);
        if (!category) return [];

        const results = [];
        for (const rawTemplate of category.templates) {
            try {
                // Determine template object structure (handle both dict and list styles if schema varies)
                // Assuming standard: { pattern: "...", description: "..." }
                // and params in pattern are {param_name}

                let query = rawTemplate.pattern;

                // Substitution
                let valid = true;
                // Find all {placeholders}
                const placeholders = query.match(/{(\w+)}/g) || [];

                for (const ph of placeholders) {
                    const key = ph.replace(/[{}]/g, '');
                    if (params[key]) {
                        query = query.replace(ph, params[key]);
                    } else {
                        // Missing param
                        valid = false;
                    }
                }

                if (valid) {
                    results.push({
                        query: query,
                        description: rawTemplate.description
                    });
                }
            } catch (e) {
                console.error("Template error", e);
            }
        }
        return results;
    }

    _formatName(name) {
        return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
}

// Export for module usage (if using modules) or global
// window.DorkForge = { DorkValidator, DorkPermutator, DorkGenerator }; 
