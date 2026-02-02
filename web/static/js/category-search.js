/**
 * Searchable Category Dropdown Module
 * Provides real-time filtering and keyboard navigation for category selection
 */

class CategorySearch {
    constructor() {
        this.searchInput = document.getElementById('categorySearch');
        this.dropdown = document.getElementById('categoryDropdown');
        this.hiddenInput = document.getElementById('category');
        this.tagsContainer = document.getElementById('selectedTags');
        this.categories = [];
        this.filteredCategories = [];
        this.selectedCategories = []; // Array of {label, value}
        this.focusedIndex = -1;
        this.isOpen = false;

        this.init();
    }

    init() {
        if (!this.searchInput || !this.dropdown || !this.hiddenInput) {
            console.warn('CategorySearch: Required elements not found');
            return;
        }

        // Event listeners
        this.searchInput.addEventListener('input', this.handleInput.bind(this));
        this.searchInput.addEventListener('focus', this.handleFocus.bind(this));
        this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this));

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    setCategories(categories) {
        this.categories = categories.map(cat => ({
            value: typeof cat === 'string' ? cat : (cat.value || cat.id || cat.name || cat),
            label: typeof cat === 'string' ? this.formatCategoryLabel(cat) : (cat.label || cat.name || cat)
        }));
        this.filteredCategories = [...this.categories];
    }

    formatCategoryLabel(value) {
        // Convert snake_case to Title Case
        return value
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    handleInput(e) {
        const query = e.target.value.toLowerCase().trim();

        if (query === '') {
            this.filteredCategories = [...this.categories];
        } else {
            // Fuzzy search
            this.filteredCategories = this.categories.filter(cat =>
                !this.isCategorySelected(cat.value) && (
                    cat.label.toLowerCase().includes(query) ||
                    cat.value.toLowerCase().includes(query)
                )
            );
        }

        this.focusedIndex = -1;
        this.renderDropdown();
        this.openDropdown();
    }

    handleFocus() {
        // Filter out already selected
        this.filteredCategories = this.categories.filter(cat => !this.isCategorySelected(cat.value));
        this.renderDropdown();
        this.openDropdown();
    }

    handleKeydown(e) {
        if (!this.isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                this.openDropdown();
                e.preventDefault();
            }
            // Backspace to remove last tag if input is empty
            if (e.key === 'Backspace' && this.searchInput.value === '') {
                this.removeLastTag();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredCategories.length - 1);
                this.updateFocusedItem();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
                this.updateFocusedItem();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.focusedIndex >= 0 && this.focusedIndex < this.filteredCategories.length) {
                    this.selectCategory(this.filteredCategories[this.focusedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.closeDropdown();
                break;
        }
    }

    renderDropdown() {
        if (this.filteredCategories.length === 0) {
            this.dropdown.innerHTML = '<div class="no-results">No matches found</div>';
            return;
        }

        const items = this.filteredCategories.map((cat, index) => `
            <div class="category-item" data-value="${cat.value}" data-index="${index}">
                <svg class="category-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z">
                    </path>
                </svg>
                ${cat.label}
            </div>
        `).join('');

        this.dropdown.innerHTML = items;

        this.dropdown.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document click
                const value = item.getAttribute('data-value');
                this.selectCategory(this.filteredCategories.find(c => c.value === value));
            });
        });
    }

    updateFocusedItem() {
        const items = this.dropdown.querySelectorAll('.category-item');
        items.forEach((item, index) => {
            if (index === this.focusedIndex) {
                item.classList.add('focused');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('focused');
            }
        });
    }

    selectCategory(category) {
        if (!category || this.isCategorySelected(category.value)) return;

        this.selectedCategories.push(category);
        this.updateValue();
        this.renderTags();

        // Reset input and focus
        this.searchInput.value = '';
        this.searchInput.focus(); // Keep focus for rapid selection
        this.handleFocus(); // Re-filter dropdown
    }

    removeCategory(value) {
        this.selectedCategories = this.selectedCategories.filter(c => c.value !== value);
        this.updateValue();
        this.renderTags();
    }

    removeLastTag() {
        if (this.selectedCategories.length > 0) {
            this.selectedCategories.pop();
            this.updateValue();
            this.renderTags();
        }
    }

    isCategorySelected(value) {
        return this.selectedCategories.some(c => c.value === value);
    }

    updateValue() {
        // Store as comma-separated values
        this.hiddenInput.value = this.selectedCategories.map(c => c.value).join(',');

        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        this.hiddenInput.dispatchEvent(changeEvent);
    }

    renderTags() {
        if (!this.tagsContainer) return;

        this.tagsContainer.innerHTML = this.selectedCategories.map(cat => `
            <div class="tag-item">
                ${cat.label}
                <span class="tag-remove" onclick="window.categorySearchInstance.removeCategory('${cat.value}')">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </span>
            </div>
        `).join('');
    }

    openDropdown() {
        this.dropdown.classList.remove('hidden');
        this.isOpen = true;
    }

    closeDropdown() {
        this.dropdown.classList.add('hidden');
        this.isOpen = false;
        this.focusedIndex = -1;
    }

    getValue() {
        return this.hiddenInput.value;
    }

    setValue(value) {
        // Handle comma-separated string or array
        // (Implementation for pre-filling if needed in future)
    }
}

// Initialize when DOM is ready
let categorySearchInstance;

// Export for use in app.js
window.CategorySearch = CategorySearch;
