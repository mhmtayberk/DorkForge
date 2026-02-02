// DorkForge Web App - JavaScript

const API_BASE = window.location.origin;

// DOM Elements
const elements = {
    domain: document.getElementById('domain'),
    // keyword input removed
    engine: document.getElementById('engine'), // New engine selector
    category: document.getElementById('category'),
    generateBtn: document.getElementById('generateBtn'),
    batchBtn: document.getElementById('batchBtn'),
    validateInput: document.getElementById('validateInput'),
    validateBtn: document.getElementById('validateBtn'),
    stats: document.getElementById('stats'),
    totalDorks: document.getElementById('totalDorks'),
    categoriesUsed: document.getElementById('categoriesUsed'),
    results: document.getElementById('results'),
    dorksContainer: document.getElementById('dorksContainer'),

    validationResult: document.getElementById('validationResult'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast')
};

// State
let allDorks = [];

// Initialize
// Initialize functions moved to bottom


// AI Model Handling
function setupAIEventListeners() {
    const aiProvider = document.getElementById('aiProvider');
    const aiModelContainer = document.getElementById('aiModelContainer');
    const refreshModelsBtn = document.getElementById('refreshModelsBtn');

    if (aiProvider) {
        // Initial check
        if (aiProvider.value === 'ollama') {
            aiModelContainer.classList.remove('hidden');
            fetchOllamaModels();
        }

        aiProvider.addEventListener('change', () => {
            if (aiProvider.value === 'ollama') {
                aiModelContainer.classList.remove('hidden');
                fetchOllamaModels();
            } else {
                aiModelContainer.classList.add('hidden');
            }
        });
    }

    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', fetchOllamaModels);
    }

    // Add Generate Button Listener
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');
    if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', generateWithAI);
    }

    // Check initial state
    if (aiProvider && aiProvider.value === 'ollama') {
        aiModelContainer.classList.remove('hidden');
        fetchOllamaModels();
    }
}

async function fetchOllamaModels() {
    const aiModel = document.getElementById('aiModel');
    if (!aiModel) return;

    aiModel.disabled = true;
    aiModel.innerHTML = '<option selected>Loading models...</option>';

    try {
        const response = await fetch(`${API_BASE}/api/ai/models/ollama`);
        const data = await response.json();

        if (data.success && data.models.length > 0) {
            aiModel.innerHTML = '<option value="" disabled selected>Select a model...</option>';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                aiModel.appendChild(option);
            });
            aiModel.disabled = false;
        } else {
            aiModel.innerHTML = '<option disabled>No models found</option>';
            showToast(data.error || 'No Ollama models found', 'warning');
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        aiModel.innerHTML = '<option disabled>Connection failed</option>';
        showToast('Could not connect to Ollama', 'error');
    }
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/categories`);
        const data = await response.json();

        // Initialize CategorySearch if not already initialized
        if (!window.categorySearchInstance) {
            window.categorySearchInstance = new CategorySearch();
        }

        // Extract categories array from response
        const categories = data.success ? data.categories : [];

        // Register dynamic category filters
        if (window.categorySettingsManager) {
            window.categorySettingsManager.registerAllFilters(categories);
        }

        // Set categories in the searchable dropdown
        window.categorySearchInstance.setCategories(categories);

        // Set default placeholder
        document.getElementById('categorySearch').placeholder = `Search ${categories.length} categories...`;

    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Failed to load categories', 'error');
        document.getElementById('categorySearch').placeholder = 'Error loading categories';
    }
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    elements.generateBtn.addEventListener('click', generateDorks);
    elements.batchBtn.addEventListener('click', generateBatch);
    elements.validateBtn.addEventListener('click', validateDork);


    // Enter key listeners
    elements.validateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateDork();
    });

    // Export button toggle
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', () => {
            exportMenu.classList.toggle('hidden');
        });

        // Export options
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-format');
                exportDorks(format);
                exportMenu.classList.add('hidden');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
                exportMenu.classList.add('hidden');
            }
        });
    }


}

// Generate dorks with AI
async function generateWithAI() {
    const aiPrompt = document.getElementById('aiPrompt');
    const aiProvider = document.getElementById('aiProvider');
    const aiModel = document.getElementById('aiModel');
    const dorkCount = document.getElementById('aiDorkCount');
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');

    if (!aiPrompt || !aiPrompt.value.trim()) {
        showToast('Please describe what you are looking for', 'warning');
        return;
    }

    // UI Loading State
    const originalText = aiGenerateBtn.innerHTML;
    aiGenerateBtn.disabled = true;
    aiGenerateBtn.innerHTML = `<span class="loading-spinner"></span> Generating...`;

    const resultsContainer = document.getElementById('aiResults');
    const resultsContent = document.getElementById('aiResultsContent');
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    if (resultsContent) resultsContent.innerHTML = '<div class="text-center p-4"><div class="spinner"></div><p class="mt-2">AI is crafting your dorks...</p></div>';

    try {
        const payload = {
            prompt: aiPrompt.value.trim(),
            provider: aiProvider.value,
            count: dorkCount ? parseInt(dorkCount.value) || 5 : 5
        };

        // Add model if provider is Ollama
        if (aiProvider.value === 'ollama' && aiModel && aiModel.value) {
            payload.model = aiModel.value;
        }

        const response = await fetch(`${API_BASE}/api/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            // Handle both 'dork' (AI) and 'dorks' (Templates) fields
            displayAIResults(data.dorks || data.dork, data.explanation, 'ai');
            showToast(`Dorks generated with ${data.provider}!`, 'success');

            // Gamification tracking
            if (window.dorkTrainer) window.dorkTrainer.trackAIGeneration();
            if (window.achievementManager) window.achievementManager.track('ai_generate');
        } else {
            if (resultsContent) resultsContent.innerHTML = `<div class="error-message p-4 text-center text-red-500">${data.error || 'Generation failed'}</div>`;
            showToast(data.error || 'AI generation failed', 'error');
        }
    } catch (error) {
        console.error('AI Error:', error);
        if (resultsContent) resultsContent.innerHTML = `<div class="error-message p-4 text-center text-red-500">Network error: ${error.message}</div>`;
        showToast('Network error', 'error');
    } finally {
        aiGenerateBtn.disabled = false;
        aiGenerateBtn.innerHTML = originalText;
    }
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-selected', 'true');
    }

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Explicitly handle "Classic Generator" results persistence (Robust Fix)
    if (elements.results) {
        if (tabName === 'classic') {
            // Show only if we have content
            if (elements.dorksContainer && elements.dorksContainer.children.length > 0) {
                elements.results.style.display = 'block';
                elements.results.classList.remove('hidden');
            }
            // Show stats
            if (elements.stats) elements.stats.classList.remove('hidden');
        } else {
            // Force Hide
            elements.results.style.display = 'none !important';
            elements.results.classList.add('hidden');
            // Also inline style enforce
            elements.results.setAttribute('style', 'display: none !important');

            // Hide stats on other tabs
            if (elements.stats) elements.stats.classList.add('hidden');
        }
    }
}

// Generate dorks for one category
async function generateDorks() {
    // Sanitize domain: strip http/s protocol
    let domainVal = elements.domain.value.trim();
    domainVal = domainVal.replace(/^https?:\/\//i, '').replace(/\/$/, '');

    // Update input value to reflect sanitization
    if (domainVal !== elements.domain.value) {
        elements.domain.value = domainVal;
    }

    const domain = domainVal;
    const keyword = ""; // Input removed
    const category = elements.category.value;

    if (!category) {
        showToast('Please select at least one category', 'error');
        return;
    }

    showLoading(true);

    // Handle Multi-Category Selection
    const selectedCategories = category.split(',').filter(c => c.trim() !== '');

    if (selectedCategories.length > 1) {
        try {
            // Collect settings for each category
            const settings = {};
            if (window.categorySettingsManager) {
                selectedCategories.forEach(catId => {
                    // Get settings via manager (will return specific filters if configured)
                    // We pass empty params because those are applied differently (domain/keyword)
                    // But applyToRequest returns everything including includeOperators etc.
                    // We need to strip domain/keyword from it? 
                    // applyToRequest merges params. If we pass empty, it returns just settings.
                    settings[catId] = window.categorySettingsManager.applyToRequest(catId);
                });
            }

            const response = await fetch(`${API_BASE}/api/generate/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categories: selectedCategories, // Send selected IDs
                    domain,
                    keyword,
                    engine: elements.engine.value, // Add engine
                    settings: settings // Send per-category settings
                })
            });
            const data = await response.json();
            if (data.success) {
                // Flatten all dorks
                allDorks = Object.values(data.results).flat();
                displayResults(data.results, data.concat_dorks || {});
                updateStats(data.total_count, Object.keys(data.results).length);
                showToast(`Generated ${data.total_count} dorks for ${Object.keys(data.results).length} categories!`, 'success');

                // Track achievements
                if (window.achievementManager) {
                    for (const [cat, dorkList] of Object.entries(data.results)) {
                        window.achievementManager.track('generate', {
                            count: dorkList.length,
                            category: cat,
                            domain: domain
                        });
                    }
                }
            } else {
                showToast(data.error || 'Failed to generate dorks', 'error');
            }
        } catch (error) {
            showToast('Network error during batch generation', 'error');
            console.error(error);
        } finally {
            showLoading(false);
        }
        return;
    }


    // Convert category to snake_case filename format expected by backend
    // e.g. "Backup Files" -> "backup_files", "IoT Cameras" -> "iot_cameras"
    const categoryFilename = category.toLowerCase().replace(/ /g, '_');

    // Apply category-specific settings if available
    let requestBody = {
        category: categoryFilename,
        domain,
        keyword,
        engine: elements.engine.value // Add engine
    };
    if (window.categorySettingsManager) {
        requestBody = window.categorySettingsManager.applyToRequest(categoryFilename, requestBody);
    }

    // Debugging: Log the request body
    console.log('[GenerateDorks] Request Body:', requestBody);

    try {
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.success) {
            allDorks = data.dorks;
            const concatDorks = data.concat_dork ? { [category]: data.concat_dork } : {};
            displayResults({ [category]: data.dorks }, concatDorks);
            updateStats(data.count, 1);
            showToast(`Generated ${data.count} dorks!`, 'success');

            // Track achievements
            if (window.achievementManager) {
                // Calculate filter count
                let filterCount = 0;
                if (window.categorySettingsManager) {
                    const settings = window.categorySettingsManager.getSettings(categoryFilename);
                    // Count dynamic filters
                    if (settings.filters) {
                        Object.values(settings.filters).forEach(vals => {
                            if (Array.isArray(vals)) filterCount += vals.length;
                        });
                    }
                    // Count others
                    if (settings.includeOperators && settings.includeOperators.length) filterCount++;
                    if (settings.excludePatterns && settings.excludePatterns.length) filterCount++;
                    if (settings.httpsOnly) filterCount++;
                }

                window.achievementManager.track('generate', {
                    count: data.count,
                    category: categoryFilename,
                    domain: domain,
                    filterCount: filterCount
                });
            }
        } else {
            showToast(data.error || 'Failed to generate dorks', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// Generate dorks for all categories
async function generateBatch() {
    const domain = elements.domain.value.trim();
    const keyword = ""; // Input removed

    if (!domain) {
        showToast('Domain is required for batch generation', 'error');
        return;
    }

    showLoading(true);

    try {
        // Get all categories
        const categoriesResponse = await fetch(`${API_BASE}/api/categories`);
        const categoriesData = await categoriesResponse.json();

        if (!categoriesData.success) {
            throw new Error('Failed to load categories');
        }

        const categories = categoriesData.categories.map(c => c.id);

        // Gather settings for all categories
        const settings = {};
        if (window.categorySettingsManager) {
            categories.forEach(catId => {
                settings[catId] = window.categorySettingsManager.applyToRequest(catId);
            });
        }

        // Generate batch
        const response = await fetch(`${API_BASE}/api/generate/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories, domain, keyword, settings })
        });

        const data = await response.json();

        if (data.success) {
            // Flatten all dorks
            allDorks = Object.values(data.results).flat();
            displayResults(data.results, data.concat_dorks || {});
            updateStats(data.total_count, Object.keys(data.results).length);
            showToast(`Generated ${data.total_count} dorks across ${Object.keys(data.results).length} categories!`, 'success');

            // Track gamification
            if (window.dorkTrainer) {
                // Track each category separately for daily challenge
                for (const [category, dorks] of Object.entries(data.results)) {
                    if (dorks.length > 0) {
                        window.dorkTrainer.trackDorkGeneration(category, dorks.length);
                    }
                }
            }
            // Track achievements
            if (window.achievementManager) {
                for (const [cat, dorkList] of Object.entries(data.results)) {
                    window.achievementManager.track('generate', {
                        count: dorkList.length,
                        category: cat,
                        domain: domain
                    });
                }
            }
        } else {
            showToast(data.error || 'Failed to generate batch', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// Helper: Get Search URL
function getSearchUrl(engine, query) {
    const q = encodeURIComponent(query);
    switch (engine) {
        case 'bing': return `https://www.bing.com/search?q=${q}`;
        case 'duckduckgo': return `https://duckduckgo.com/?q=${q}`;
        case 'yahoo': return `https://search.yahoo.com/search?p=${q}`;
        case 'yandex': return `https://yandex.com/search/?text=${q}`;
        case 'baidu': return `https://www.baidu.com/s?wd=${q}`;
        case 'brave': return `https://search.brave.com/search?q=${q}`;
        case 'startpage': return `https://www.startpage.com/do/dsearch?query=${q}`;
        case 'google': default: return `https://www.google.com/search?q=${q}`;
    }
}

// Display results
function displayResults(results, concatDorks = {}, source = 'classic') {
    elements.dorksContainer.innerHTML = '';

    for (const [category, dorks] of Object.entries(results)) {
        if (dorks.length === 0) continue;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'dork-category';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <h3 class="category-title">${category.replace(/_/g, ' ')}</h3>
            <span class="category-count">${dorks.length} dorks</span>
        `;

        categoryDiv.appendChild(header);

        // Add concat dork if available
        if (concatDorks[category]) {
            const concatDiv = document.createElement('div');
            concatDiv.className = 'dork-item concat-dork mass-hunt-dork';
            concatDiv.innerHTML = `
                <div class="dork-description">
                    <strong>🔥 Mass Hunt (Combined Query - All ${dorks.length} dorks)</strong>
                </div>
                <div class="dork-query-container">
                    <code class="dork-query">${escapeHtml(concatDorks[category])}</code>
                    <button class="copy-btn" data-query="${escapeHtml(concatDorks[category])}">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                </div>
            `;
            categoryDiv.appendChild(concatDiv);
        }

        dorks.forEach(dork => {
            const dorkItem = document.createElement('div');
            dorkItem.className = 'dork-item';
            dorkItem.innerHTML = `
                <div class="dork-description">${escapeHtml(dork.description)}</div>
                <div class="dork-query-container">
                    <code class="dork-query">${escapeHtml(dork.query)}</code>
                    
                    <div class="scan-actions">
                        <!-- Copy Button -->
                        <button class="copy-btn" data-query="${escapeHtml(dork.query)}" title="Copy to Clipboard">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>

                        <!-- Search Button (Dynamic Engine) -->
                        <a href="${getSearchUrl(elements.engine.value, dork.query)}" target="_blank" class="btn-scan google" title="Search on ${elements.engine.options[elements.engine.selectedIndex].text}">
                            ${elements.engine.value === 'google' ? `
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                            </svg>` : `
                            <!-- Generic Search Icon -->
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>`}
                        </a>

                        <!-- Shodan & Wayback (Classic Only) -->
                        ${source !== 'ai' && elements.domain.value ? `
                        <a href="https://www.shodan.io/search?query=hostname:${encodeURIComponent(elements.domain.value)}" target="_blank" class="btn-scan shodan" title="Scan on Shodan">
                            <!-- Shodan Icon (Official Favicon) -->
                            <img src="https://www.shodan.io/static/img/favicon.png" alt="Shodan" style="width: 16px; height: 16px;">
                        </a>
                        
                        <!-- Wayback Machine -->
                        <a href="https://web.archive.org/web/*/${encodeURIComponent(elements.domain.value)}/*" target="_blank" class="btn-scan wayback" title="Wayback Machine">
                            <!-- Wayback Machine (Official Temple Icon) -->
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm19-12h-2V7h2v3zm-19 0h2V7H2v3zm9-5.8L4.7 7h14.6L11 4.2zM11 2L2 7v2h20V7L11 2z"/>
                            </svg>
                        </a>
                        ` : ''}
                    </div>
                </div>
            `;

            categoryDiv.appendChild(dorkItem);
        });

        elements.dorksContainer.appendChild(categoryDiv);
    }

    // Attach copy event listeners to all copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // Fix: Get text content from sibling code element to avoid HTML entity issues
            const container = this.closest('.dork-query-container');
            if (container) {
                const codeElement = container.querySelector('.dork-query');
                if (codeElement) {
                    const query = (codeElement.textContent || codeElement.innerText).trim();
                    copyToClipboardWithAnimation(query, this);
                    return;
                }
            }
            // Fallback to data attribute if structure differs
            const query = this.getAttribute('data-query');
            copyToClipboardWithAnimation(query, this);
        });
    });

    elements.results.removeAttribute('style'); // Clear forced style
    elements.results.style.display = 'block';
    elements.results.classList.remove('hidden');
    elements.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update stats
function updateStats(total, categories) {
    elements.totalDorks.textContent = total;
    elements.categoriesUsed.textContent = categories;
    elements.stats.classList.remove('hidden');
}

// Copy helper with button animation
function copyToClipboardWithAnimation(query, button) {
    navigator.clipboard.writeText(query).then(() => {
        // Success animation
        button.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `;

        setTimeout(() => {
            button.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            `;
        }, 2000);

        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy', 'error');
    });
}

// Copy all dorks


// Copy to clipboard helper (fallback for older browsers)
function copyToClipboardHelper(text, successMessage = 'Copied to clipboard!') {
    return new Promise((resolve, reject) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast(successMessage, 'success');
                    resolve();
                })
                .catch((err) => {
                    showToast('Failed to copy', 'error');
                    reject(err);
                });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast(successMessage, 'success');
                resolve();
            } catch (err) {
                showToast('Failed to copy', 'error');
                reject(err);
            }
            document.body.removeChild(textarea);
        }
    });
}

// Copy single dork (without button animation)
function copySingleDork(dork) {
    // Decode HTML entities if present (fixes &quot; issue)
    const txt = document.createElement('textarea');
    txt.innerHTML = dork;
    const decodedDork = txt.value.trim();
    copyToClipboardHelper(decodedDork, 'Dork copied!');
}

// Copy as Google Search URL
function copyGoogleSearchURL(dork) {
    const encodedDork = encodeURIComponent(dork);
    const googleURL = `https://www.google.com/search?q=${encodedDork}`;

    navigator.clipboard.writeText(googleURL).then(() => {
        showToast('Google Search URL copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// Copy as curl command  
function copyCurlCommand(dork) {
    const encodedDork = encodeURIComponent(dork);
    const googleURL = `https://www.google.com/search?q=${encodedDork}`;
    const curlCommand = `curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${googleURL}"`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(curlCommand).then(() => {
            showToast('curl command copied!', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }
}

// Export dorks to file
async function exportDorks(format) {
    if (allDorks.length === 0) {
        showToast('No dorks to export', 'error');
        return;
    }

    showLoading(true);

    try {
        const domain = elements.domain.value.trim();
        const metadata = {
            domain: domain,
            timestamp: new Date().toISOString(),
            total_count: allDorks.length
        };

        const response = await fetch(`${API_BASE}/api/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dorks: allDorks,
                format: format,
                metadata: metadata
            })
        });

        const data = await response.json();

        if (data.success) {
            // Create download
            const blob = new Blob([data.content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast(`Exported ${allDorks.length} dorks as ${format.toUpperCase()}`, 'success');
            // Track gamification
            if (window.dorkTrainer) {
                window.dorkTrainer.trackExport();
            }
            // Track achievements
            if (window.achievementManager) {
                window.achievementManager.track('export');
            }
        } else {
            showToast(data.error || 'Export failed', 'error');
        }
    } catch (error) {
        showToast('Export error', 'error');
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// Copy from terminal helper
function copyFromTerminal(btn) {
    const card = btn.closest('.terminal-card');
    const dork = card.getAttribute('data-dork');
    if (dork) {
        copySingleDork(dork);
    }
}

// Display AI generation result
function displayAIResults(dorks, explanation) {
    const resultsContainer = document.getElementById('aiResults');
    const resultsContent = document.getElementById('aiResultsContent');

    if (!resultsContainer || !resultsContent) return;

    // Support both single dork string and array of dorks
    const dorkList = Array.isArray(dorks) ? dorks : [dorks];

    let html = '';

    // Add explanation if provided
    if (explanation) {
        html += `<div class="ai-explanation-box">
            <h4>AI Analysis</h4>
            <p>${explanation}</p>
        </div>`;
    }

    // Dork cards
    dorkList.forEach((dork, index) => {
        // If dork is an object with {query, description}, use it. If string, wrap it.
        const dorkText = typeof dork === 'string' ? dork : dork.query;
        const dorkDesc = typeof dork === 'string' ? '' : dork.description;

        html += `
            <div class="terminal-card" data-dork="${escapeHtml(dorkText)}">
                <div class="terminal-header">
                    <div class="terminal-dots">
                        <div class="terminal-dot red"></div>
                        <div class="terminal-dot yellow"></div>
                        <div class="terminal-dot green"></div>
                    </div>
                    <div class="terminal-title">Query ${index + 1}</div>
                </div>
                <div class="terminal-body">
                    ${dorkDesc ? `<div class="mb-3 text-gray-400 text-sm font-medium border-l-2 border-gray-700 pl-3 italic">${escapeHtml(dorkDesc)}</div>` : ''}
                    <div class="flex items-start gap-2">
                        <span class="terminal-prompt">$</span>
                        <code class="break-all text-green-400">${escapeHtml(dorkText)}</code>
                    </div>
                    
                    <div class="terminal-actions">
                        <button class="btn-terminal" onclick="copyFromTerminal(this)">
                            <svg class="icon-size-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            <span>Copy Dork</span>
                        </button>
                        <a href="https://www.google.com/search?q=${encodeURIComponent(dorkText)}" target="_blank" class="btn-terminal" title="Search on Google">
                            <svg class="icon-size-sm icon-fill" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    resultsContent.innerHTML = html;
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Validate dork
async function validateDork() {
    const query = elements.validateInput.value.trim();

    if (!query) {
        showToast('Please enter a dork to validate', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
            displayValidationResult(data);
        } else {
            showToast(data.error || 'Validation failed', 'error');
        }
        // Track gamification
        if (window.dorkTrainer && data.valid) {
            window.dorkTrainer.trackValidation();
        }
    } catch (error) {
        showToast('Network error', 'error');
        console.error('Error:', error);
    }
}

// Display validation result
function displayValidationResult(data) {
    const resultDiv = elements.validationResult;
    resultDiv.className = 'validation-result';

    // Format explanation: Convert newlines to breaks and styling bullets
    const formatExplanation = (text) => {
        if (!text) return '';
        // Split by newlines, wrap items starting with '-' in list items or styled divs
        return text.split('\n').map(line => {
            if (line.trim().startsWith('-')) {
                return `<div class="ml-4 text-sm">• ${escapeHtml(line.trim().substring(1))}</div>`;
            }
            if (line.trim().endsWith(':')) {
                return `<div class="font-bold mt-2 mb-1">${escapeHtml(line)}</div>`;
            }
            return `<div>${escapeHtml(line)}</div>`;
        }).join('');
    };

    if (data.valid) {
        resultDiv.classList.add('valid');
        resultDiv.innerHTML = `
            <div class="validation-status">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #10B981;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span style="color: #10B981;">Valid Dork</span>
            </div>
            <div class="validation-explanation mt-2 p-3 bg-gray-900 rounded border border-gray-700 font-mono text-gray-300">
                ${formatExplanation(data.explanation)}
            </div>
        `;
    } else {
        resultDiv.classList.add('invalid');
        // Format errors list
        const errorsHtml = data.errors.map(e => `<div class="ml-4 text-red-300">• ${escapeHtml(e)}</div>`).join('');

        resultDiv.innerHTML = `
            <div class="validation-status">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #EF4444;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span style="color: #EF4444;">Invalid Dork</span>
            </div>
            <div class="validation-explanation mt-2 text-sm">
                <div class="mb-2 font-semibold text-red-400">Errors Found:</div>
                ${errorsHtml}
            </div>
        `;
    }

    resultDiv.classList.remove('hidden');
}

// Show/hide loading overlay
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filter AI Providers based on available keys
async function filterAIProviders() {
    const aiProviderSelect = document.getElementById('aiProvider');
    if (!aiProviderSelect) return;

    try {
        const response = await fetch(`${API_BASE}/api/settings/load`);
        const data = await response.json();

        if (!data.success) return;

        const keys = data.keys;
        const providerMap = {
            'openai': 'OPENAI_API_KEY',
            'anthropic': 'ANTHROPIC_API_KEY',
            'gemini': 'GOOGLE_API_KEY',
            'google': 'GOOGLE_API_KEY',
            'groq': 'GROQ_API_KEY',
            // Add mappings as needed
            'ollama': 'OLLAMA_BASE_URL'
        };

        Array.from(aiProviderSelect.options).forEach(option => {
            const providerVal = option.value;
            const keyName = providerMap[providerVal] || providerMap[providerVal.replace('google', 'gemini')];

            if (providerVal === 'ollama') return; // Keep Ollama visible

            if (keyName && (!keys[keyName] || keys[keyName] === '')) {
                // Key is missing
                option.textContent += ' (Key Missing)';
                option.disabled = true;
            }
        });

    } catch (e) {
        console.warn("Could not filter AI providers", e);
    }
}

// Back to Top functionality
const backToTopBtn = document.createElement('button');
backToTopBtn.id = 'backToTopBtn';
backToTopBtn.className = 'back-to-top';
backToTopBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
    </svg>
`;
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

// End of main logic


// SYNTAX HIGHLIGHTING LOGIC
function setupSyntaxHighlighting(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Create wrapper and background
    const container = document.createElement('div');
    container.className = 'dork-input-container';

    // Insert wrapper before input, then move input inside
    input.parentNode.insertBefore(container, input);
    container.appendChild(input);
    input.classList.add('dork-highlight-input');

    // Create highlight layer
    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'dork-highlighter-bg';
    highlightLayer.innerHTML = '<div class="highlight-layer"></div>';
    container.insertBefore(highlightLayer, input);

    const layerContent = highlightLayer.querySelector('.highlight-layer');

    // Sync function
    const sync = () => {
        const text = input.value;
        layerContent.innerHTML = formatSyntax(text) + '<br>'; // <br> ensures height match on newlines
    };

    // Events
    input.addEventListener('input', sync);
    input.addEventListener('scroll', () => {
        highlightLayer.scrollTop = input.scrollTop;
    });

    // Fix: Handle Paste to remove rich text/HTML artifacts
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');

        // Modern replacement for execCommand
        if (input.setRangeText) {
            input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
        } else {
            // Fallback
            document.execCommand('insertText', false, text);
        }

        // Sync trigger
        sync();
    });

    // Initial sync
    sync();
}

function formatSyntax(text) {
    if (!text) return '';

    // Safety check for XSS
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Tokenize
    // Strategy: Split by space or delimiters, then analyze
    // But regex replacement is easier for simple highlighting

    let html = safeText;

    // 1. Highlight Strings ("...") - MOVED FIRST to avoid matching quotes in other tags
    html = html.replace(/\"([^\"]*)\"/g, '<span class="token-string">\"$1\"</span>');

    // 2. Highlight Operators (site:, ext:, etc.)
    html = html.replace(/\b(site|inurl|intext|filetype|ext|intitle|allinurl|allintext|allintitle|link|cache|related|info|define):/gi,
        '<span class="token-operator">$1:</span>');

    // 3. Highlight Logic (OR, |)
    html = html.replace(/\s(OR)\s/g, ' <span class="token-pipe">OR</span> ');
    html = html.replace(/\|/g, '<span class="token-pipe">|</span>');

    // 4. Highlight Parentheses
    html = html.replace(/(\(|\))/g, '<span class="token-paren">$1</span>');

    return html;
}

// PERMUTATION LOGIC
async function permuteDork() {
    const query = document.getElementById('validateInput').value.trim();
    if (!query) {
        showToast('Please enter a dork to generate variations', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/permute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
            displayPermutations(data.variations);
            showToast(`Generated ${data.variations.length - 1} variations`, 'success');
        } else {
            showToast(data.error || 'Permutation failed', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Network error', 'error');
    } finally {
        showLoading(false);
    }
}

function displayPermutations(variations) {
    // Check/Create container for permutations
    let container = document.getElementById('permutationResult');
    if (!container) {
        const validationResult = document.getElementById('validationResult');
        container = document.createElement('div');
        container.id = 'permutationResult';
        container.className = 'mt-4';
        validationResult.parentNode.insertBefore(container, validationResult.nextSibling);
    }

    const original = document.getElementById('validateInput').value.trim();
    const newVars = variations.filter(v => v !== original);

    if (newVars.length === 0) {
        container.innerHTML = `<div style="padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); color: var(--text-muted); font-style: italic; text-align: center; font-size: 0.875rem;">No variations found for this dork.</div>`;
        return;
    }

    let html = `
        <div class="card" style="padding: var(--spacing-md); margin-bottom: 0;">
            <h4 class="section-title" style="font-size: 1.1rem; margin-bottom: var(--spacing-sm); color: var(--accent-matrix);">✨ Recommended Variations</h4>
            <div style="display: grid; gap: 0.5rem;" id="variationsGrid">
    `;

    newVars.forEach(v => {
        // Use data-dork attribute instead of inline onclick to safe-guard against quotes
        // We use inline styles here to replace missing Tailwind classes
        html += `
            <div class="variation-item" data-dork="${escapeHtml(v)}" style="
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                padding: 0.5rem 0.75rem; 
                background: var(--bg-secondary); 
                border: 1px solid var(--border-default); 
                border-radius: var(--radius-sm); 
                cursor: pointer; 
                transition: all 0.2s;
            ">
                <code style="font-family: var(--font-code); font-size: 0.875rem; color: var(--text-secondary); word-break: break-all;">${escapeHtml(v)}</code>
                <div style="display: flex; gap: 0.5rem; opacity: 0.8;" class="variation-actions">
                    <button class="btn btn-sm btn-outline variation-copy-btn" title="Copy">
                        <svg class="btn-icon" style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        Copy
                    </button>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(v)}" target="_blank" class="btn btn-sm btn-outline variation-copy-btn" onclick="event.stopPropagation()" title="Search">
                        <svg class="btn-icon" style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        Search
                    </a>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Add event listeners for the new elements
    const grid = container.querySelector('#variationsGrid');
    if (grid) {
        // Item click (copy)
        grid.querySelectorAll('.variation-item').forEach(item => {
            item.addEventListener('click', function (e) {
                // Don't trigger if clicking buttons
                if (e.target.closest('button') || e.target.closest('a')) return;

                const dork = this.getAttribute('data-dork');
                // Decode HTML entities before copying
                const txt = document.createElement('textarea');
                txt.innerHTML = dork;
                copyToClipboardHelper(txt.value, 'Variation copied!');
            });

            // Hover effect via JS since we used inline styles mostly
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = 'var(--accent-matrix)';
                item.querySelector('code').style.color = '#fff';
                item.querySelector('.variation-actions').style.opacity = '1';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-default)';
                item.querySelector('code').style.color = 'var(--text-secondary)';
                item.querySelector('.variation-actions').style.opacity = '0.8';
            });
        });

        // Copy button click
        grid.querySelectorAll('button.variation-copy-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const dork = this.closest('.variation-item').getAttribute('data-dork');
                const txt = document.createElement('textarea');
                txt.innerHTML = dork;
                copyToClipboardHelper(txt.value, 'Variation copied!');
            });
        });
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupEventListeners();
    setupAIEventListeners();
    setupSyntaxHighlighting('validateInput');
    filterAIProviders();
});


