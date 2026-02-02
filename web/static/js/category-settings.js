/**
 * DorkForge Category-Specific Settings
 * Per-category customization for dork generation
 */

class CategorySettingsManager {
    constructor() {
        this.storageKey = 'dorkforge_category_settings';
        this.settings = this.loadFromStorage();
        this.currentCategory = null;
        this.selectedCategories = [];
        this.panelVisible = false;
        this.remoteFilters = {}; // { catId: [filterDef, ...] }
        this.init();
    }

    getDefaultSettings() {
        return {
            maxDorks: 0, // 0 = All
            includeOperators: [], // Empty = All
            excludePatterns: [],
            customKeywords: [],
            httpsOnly: false,
            filters: {}, // New dynamic filters
            customFilters: [] // Legacy
        };
    }

    init() {
        // Bind to existing inline button
        const toggleBtn = document.getElementById('toggle-category-settings');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePanel();
            });
        }

        // Listen for category changes to update panel in real-time
        const categoryInput = document.getElementById('category');
        if (categoryInput) {
            categoryInput.addEventListener('change', () => this.handleCategoryChange());
        }

        console.log('[CategorySettings] Initialized');
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[CategorySettings] Failed to load:', e);
        }
        return {};
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('[CategorySettings] Failed to save:', e);
        }
    }

    getSettings(category) {
        if (!category) return this.getDefaultSettings();
        const key = category.toLowerCase().replace(/ /g, '_');
        return {
            ...this.getDefaultSettings(),
            ...(this.settings[key] || {})
        };
    }

    saveSettings(category, settings) {
        if (!category) return;
        const key = category.toLowerCase().replace(/ /g, '_');
        this.settings[key] = settings;
        this.saveToStorage();
    }

    resetSettings(category) {
        if (!category) return;
        const key = category.toLowerCase().replace(/ /g, '_');
        delete this.settings[key];
        this.saveToStorage();
    }

    /**
     * Receives category list from API and registers their dynamic filters
     */
    registerAllFilters(categories) {
        this.remoteFilters = {};
        categories.forEach(cat => {
            if (cat.filters && cat.filters.length > 0) {
                this.remoteFilters[cat.id] = cat.filters;
            }
        });
        console.log('[CategorySettings] Registered dynamic filters for:', Object.keys(this.remoteFilters));
    }

    // Button injection removed - using static button in HTML


    handleCategoryChange() {
        const categoryHidden = document.getElementById('category');
        const rawValue = categoryHidden ? categoryHidden.value : '';
        this.selectedCategories = rawValue ? rawValue.split(',') : [];

        // If panel is open, re-render it to show new categories
        if (this.panelVisible) {
            this.renderPanelContent();
        }
    }

    togglePanel() {
        if (this.panelVisible) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        // Update selected categories
        this.handleCategoryChange();

        // If no category selected, default to 'admin_panels' or something, or show empty state
        if (this.selectedCategories.length === 0) {
            // Try fallback to input value
            const inputVal = document.getElementById('categorySearch')?.value;
            if (inputVal) {
                // Determine ID from label (heuristic)
                // This is less reliable so we might just assume empty
                // For now, let's just warn user or show empty
            }
        }

        // Remove existing panel
        const existingPanel = document.getElementById('category-settings-panel');
        if (existingPanel) existingPanel.remove();

        const achievementsModal = document.getElementById('achievements-modal');
        if (achievementsModal) achievementsModal.remove();

        const panel = document.createElement('div');
        panel.id = 'category-settings-panel';
        panel.className = 'category-settings-panel';

        // Base Structure
        panel.innerHTML = `
            <div class="settings-panel-header">
                <h3>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                    </svg>
                    Filters & Settings
                </h3>
                <button class="settings-panel-close" onclick="categorySettingsManager.closePanel()">×</button>
            </div>
            
            <div class="settings-panel-body" id="settings-panel-content">
                <!-- Content injected by renderPanelContent -->
            </div>
            
            <div class="settings-panel-footer">
                <button class="btn-reset" onclick="categorySettingsManager.resetCurrentSettings()">
                    Reset
                </button>
                <button class="btn-save" onclick="categorySettingsManager.saveCurrentSettings()">
                    Save Settings
                </button>
            </div>
        `;

        const inlineContainer = document.getElementById('inline-settings-container');
        if (inlineContainer) {
            inlineContainer.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }

        this.renderPanelContent();

        requestAnimationFrame(() => panel.classList.add('show'));
        this.panelVisible = true;
    }

    renderPanelContent() {
        const container = document.getElementById('settings-panel-content');
        if (!container) return;

        // If no categories selected
        if (this.selectedCategories.length === 0) {
            container.innerHTML = `<div class="p-4 text-center text-gray-500 italic">Please select one or more categories to configure filters.</div>`;
            return;
        }

        // Check if any selected category has filters
        const hasAnyFilters = this.selectedCategories.some(catId => {
            const filters = this.remoteFilters[catId];
            return filters && filters.length > 0;
        });

        if (!hasAnyFilters) {
            container.innerHTML = `<div class="p-4 text-center text-gray-500 italic">No specific settings available for the selected categories.</div>`;
            return;
        }

        let html = `<div id="dynamic-filters-wrapper">`;

        // Render separate block for each selected category ONLY if they have filters
        this.selectedCategories.forEach(catId => {
            const filters = this.remoteFilters[catId];
            if (filters && filters.length > 0) {
                const catSettings = this.getSettings(catId);
                const catLabel = this.formatCategoryName(catId);

                html += `
                    <div class="category-filter-block mb-6 p-4 bg-white/5 rounded-lg border border-white/10" data-category-id="${catId}">
                        <h4 class="text-matrix font-bold mb-4 flex items-center gap-2">
                             <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                             ${catLabel} Filters
                        </h4>
                        ${this.generateFilterHTML(filters, catSettings)}
                    </div>
                `;
            }
        });

        html += `</div>`;
        container.innerHTML = html;

        this.setupTagInputs();
    }

    generateFilterHTML(filters, settings) {
        const savedFilters = settings.filters || {};

        return filters.map(filter => {
            const selectedValues = savedFilters[filter.id] || [];
            return `
                <div class="setting-group dynamic-filter-group" data-filter-id="${filter.id}">
                    <label class="setting-label">
                        ${filter.label}
                    </label>
                    <div class="operator-chips">
                        ${filter.options.map(opt => `
                            <label class="operator-chip filter-chip ${selectedValues.includes(opt.value) ? 'active' : ''}">
                                <input type="checkbox" class="dynamic-filter-input" 
                                    data-category-filter="${filter.id}" 
                                    value="${opt.value}" 
                                    ${selectedValues.includes(opt.value) ? 'checked' : ''}>
                                ${opt.label}
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    resetCurrentSettings() {
        if (confirm('Reset all settings for selected categories?')) {
            this.selectedCategories.forEach(catId => this.resetSettings(catId));
            this.togglePanel();
        }
    }

    saveCurrentSettings() {
        // Common settings defaults (removed from UI)
        const commonSettings = {
            maxDorks: 0,
            includeOperators: [],
            excludePatterns: [],
            customKeywords: [],
            httpsOnly: false
        };

        // Save for EACH selected category
        this.selectedCategories.forEach(catId => {
            // Start with common defaults
            const finalSettings = { ...commonSettings };

            // Get dynamic filters for this category
            // We look inside the specific block for this category
            const catBlock = document.querySelector(`.category-filter-block[data-category-id="${catId}"]`);
            const newFilters = {};

            if (catBlock) {
                catBlock.querySelectorAll('.dynamic-filter-input:checked').forEach(input => {
                    const filterId = input.getAttribute('data-category-filter');
                    if (!newFilters[filterId]) newFilters[filterId] = [];
                    newFilters[filterId].push(input.value);
                });
            }

            finalSettings.filters = newFilters;
            finalSettings.customFilters = [];

            this.saveSettings(catId, finalSettings);
        });

        if (typeof showToast === 'function') {
            showToast('Settings saved!', 'success');
        }
        this.closePanel();
    }

    applyToRequest(category, params = {}) {
        const settings = this.getSettings(category);
        const requestParams = {
            ...params,
            maxDorks: settings.maxDorks > 0 ? settings.maxDorks : undefined,
            includeOperators: (settings.includeOperators && settings.includeOperators.length > 0) ? settings.includeOperators : undefined,
            excludePatterns: (settings.excludePatterns && settings.excludePatterns.length > 0) ? settings.excludePatterns : undefined,
            httpsOnly: settings.httpsOnly || undefined,
        };

        // Apply Dynamic Filters
        const filtersDef = this.remoteFilters && this.remoteFilters[category];
        if (filtersDef && settings.filters) {
            filtersDef.forEach(def => {
                const values = settings.filters[def.id];
                if (values && values.length > 0) {
                    if (def.key) {
                        requestParams[def.key] = values;
                    }
                }
            });
        }

        return requestParams;
    }

    closePanel() {
        const panel = document.getElementById('category-settings-panel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => panel.remove(), 200);
        }
        this.panelVisible = false;
    }

    setupTagInputs() {
        const excludeInput = document.getElementById('exclude-pattern-input');
        if (excludeInput) {
            excludeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && excludeInput.value.trim()) {
                    this.addTag('exclude', excludeInput.value.trim());
                    excludeInput.value = '';
                    e.preventDefault();
                }
            });
        }
    }

    addTag(type, value) {
        const containerId = 'exclude-patterns-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        const input = container.querySelector('.tag-input');
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = value; // Safe insertion

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.onclick = () => this.removeTag(type, value); // Safe event binding

        tag.appendChild(removeBtn);
        container.insertBefore(tag, input);
    }

    removeTag(type, value) {
        const containerId = 'exclude-patterns-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        // Find tag with this value
        const tags = Array.from(container.querySelectorAll('.tag'));
        const tagToRemove = tags.find(t => t.textContent.includes(value));
        if (tagToRemove) {
            tagToRemove.remove();
        }
    }

    getTagsFromContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('.tag'))
            .map(t => t.innerText.replace('×', '').trim())
            .filter(t => t.length > 0);
    }

    formatCategoryName(name) {
        if (!name) return '';
        return name.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

// Initialize
window.categorySettingsManager = new CategorySettingsManager();
