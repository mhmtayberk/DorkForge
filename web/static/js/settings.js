/**
 * Settings Panel - API Key Management
 * Manages API keys by writing to .env file securely
 */

const API_PROVIDERS = [
    { key: 'OPENAI_API_KEY', label: 'OpenAI', value: 'openai', placeholder: 'sk-...' },
    { key: 'GOOGLE_API_KEY', label: 'Google Gemini', value: 'gemini', placeholder: 'AIza...' },
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic Claude', value: 'claude', placeholder: 'sk-ant-...' },
    { key: 'GROQ_API_KEY', label: 'Groq', value: 'groq', placeholder: 'gsk_...' },
    { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek', value: 'deepseek', placeholder: 'ds-...' },
    { key: 'XAI_API_KEY', label: 'xAI Grok', value: 'grok', placeholder: 'xai-...' },
    { key: 'HUGGINGFACE_API_KEY', label: 'Hugging Face', value: 'huggingface', placeholder: 'hf_...' },
    { key: 'OLLAMA_BASE_URL', label: 'Ollama', value: 'ollama', placeholder: 'http://localhost:11434' }
];

/**
 * Open settings panel and load current values
 */
function openSettings() {
    const overlay = document.getElementById('settings-overlay');
    const panel = document.getElementById('settings-panel');
    const messageContainer = document.getElementById('settings-message-container');

    // Reset message
    if (messageContainer) messageContainer.innerHTML = '';
    if (messageContainer) messageContainer.className = '';

    if (overlay) overlay.classList.add('active');
    if (panel) panel.classList.add('active');

    loadCurrentSettings(); // Refresh status on open
}

/**
 * Close settings panel
 */
function closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    const panel = document.getElementById('settings-panel');

    if (overlay) overlay.classList.remove('active');
    if (panel) panel.classList.remove('active');
}

/**
 * Load current API keys from backend (masked)
 */
async function loadCurrentSettings() {
    try {
        const response = await fetch('/api/settings/load');
        const data = await response.json();

        if (data.success) {
            // Populate inputs with masked values
            const keys = data.keys;

            API_PROVIDERS.forEach(provider => {
                const input = document.getElementById(provider.key);
                if (input && keys[provider.key]) {
                    input.value = keys[provider.key];
                    input.dataset.masked = 'true';
                }

                // Update status indicator
                updateKeyStatus(provider.key, !!keys[provider.key]);
            });

            // Update AI Provider Dropdown options based on set keys
            updateAIProviderDropdown(keys);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showSettingsMessage('Failed to load current settings', 'error');
    }
}

/**
 * Filter AI Provider dropdown options based on available API keys
 */
function updateAIProviderDropdown(keysObj) {
    const aiProviderSelect = document.getElementById('aiProvider');
    if (!aiProviderSelect) return;

    // Use passed keysObj if available, otherwise derive from DOM
    let availableKeys = {};

    if (keysObj) {
        // If keysObj is provided, use it directly to determine availability
        API_PROVIDERS.forEach(p => {
            if (keysObj[p.key]) { // Check if the key has a value
                availableKeys[p.key] = true;
            }
        });
    } else {
        // Fallback to DOM check
        API_PROVIDERS.forEach(p => {
            const statusEl = document.querySelector(`[data-status-for="${p.key}"]`);
            if (statusEl && statusEl.classList.contains('active')) {
                availableKeys[p.key] = true;
            }
        });
    }

    // Rebuild the select options
    const currentValue = aiProviderSelect.value;
    aiProviderSelect.innerHTML = '';

    // Create Cloud group
    const cloudGroup = document.createElement('optgroup');
    cloudGroup.label = 'Cloud Providers';
    let hasCloud = false;

    // Create Local group
    const localGroup = document.createElement('optgroup');
    localGroup.label = 'Local';
    let hasLocal = false;

    API_PROVIDERS.forEach(p => {
        // Decide if we should show this provider
        // Ollama is always visible, others depend on keys
        const shouldShow = p.value === 'ollama' || availableKeys[p.key];

        if (shouldShow) {
            const option = document.createElement('option');
            option.value = p.value;
            option.textContent = p.label;

            // Categorize into groups
            if (p.value === 'ollama') {
                localGroup.appendChild(option);
                hasLocal = true;
            } else {
                cloudGroup.appendChild(option);
                hasCloud = true;
            }
        }
    });

    // Append groups if they have children
    if (hasCloud) aiProviderSelect.appendChild(cloudGroup);
    if (hasLocal) aiProviderSelect.appendChild(localGroup);

    // If no keys are set, show placeholder
    if (!hasCloud && !hasLocal) {
        const placeholder = document.createElement('option');
        placeholder.textContent = 'No AI Providers Configured (Check Settings)';
        placeholder.disabled = true;
        placeholder.selected = true;
        aiProviderSelect.appendChild(placeholder);
    } else {
        // Restore previous value if it still exists in the list
        if (currentValue && Array.from(aiProviderSelect.options).some(opt => opt.value === currentValue)) {
            aiProviderSelect.value = currentValue;
        }
    }

    // CRITICAL: Dispatch change event so app.js listeners can update UI (like Ollama model container)
    aiProviderSelect.dispatchEvent(new Event('change'));
}

/**
 * Save API keys to .env file
 */
async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');

    if (btn.classList.contains('saving')) {
        return; // Already saving
    }

    btn.classList.add('saving');
    btn.textContent = 'Saving...';
    clearSettingsMessage();

    // Collect all API keys
    const keys = {};
    let hasChanges = false;

    API_PROVIDERS.forEach(provider => {
        const input = document.getElementById(provider.key);
        if (input) {
            const value = input.value.trim();

            // Sadece maskelenmemiş (yani kullanıcının dokunduğu/değiştirdiği) alanları gönder
            if (input.dataset.masked !== 'true') {
                keys[provider.key] = value; // value boş olsa bile gönder (silme işlemi için)
                hasChanges = true;
            }
        }
    });

    if (!hasChanges) {
        showSettingsMessage('No changes to save', 'error');
        btn.classList.remove('saving');
        btn.textContent = 'Save Settings';
        return;
    }

    try {
        const response = await fetch('/api/settings/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(keys)
        });

        const data = await response.json();

        if (data.success) {
            showSettingsMessage('✅ Saved!', 'success');

            // Reload current settings to show masked values
            setTimeout(() => {
                loadCurrentSettings();
            }, 1000);
        } else {
            const errorMsg = data.details
                ? `Validation errors: ${Object.entries(data.details).map(([k, v]) => `${k} - ${v}`).join(', ')}`
                : data.error || 'Failed to save settings';

            showSettingsMessage(`❌ ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showSettingsMessage('❌ Network error: Could not save settings', 'error');
    } finally {
        btn.classList.remove('saving');
        btn.textContent = 'Save Settings';
    }
}

/**
 * Toggle API key visibility (password <-> text)
 */
/**
 * Toggle API key visibility (password <-> text)
 */
function toggleApiKeyVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    const btn = input.parentElement.querySelector('.toggle-visibility');

    // If key is masked (loaded from server), prevent showing it for security
    if (input.dataset.masked === 'true') {
        showSettingsMessage('⚠️ Saved keys are masked for security. Clear the field to enter a new key.', 'error');
        return;
    }

    if (input.type === 'password') {
        input.type = 'text';
        // Eye Open icon
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        `;
    } else {
        input.type = 'password';
        // Eye Closed icon
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        `;
    }
}

/**
 * Update key status indicator
 */
function updateKeyStatus(fieldId, hasKey) {
    const statusEl = document.querySelector(`[data-status-for="${fieldId}"]`);
    if (statusEl) {
        if (hasKey) {
            statusEl.textContent = 'Set';
            statusEl.classList.remove('empty');
            statusEl.classList.add('active');
        } else {
            statusEl.textContent = 'Not set';
            statusEl.classList.remove('active');
            statusEl.classList.add('empty');
        }
    }
}

/**
 * Show settings message (success/error)
 */
function showSettingsMessage(message, type) {
    clearSettingsMessage();

    const container = document.getElementById('settings-message-container');
    if (container) {
        const messageEl = document.createElement('div');
        messageEl.className = `settings-message ${type}`;
        messageEl.textContent = message;
        container.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }
}

/**
 * Clear settings message
 */
function clearSettingsMessage() {
    const container = document.getElementById('settings-message-container');
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Handle input focus - clear masked value
 */
// Handle API key input focus and changes
window.handleApiKeyFocus = function (input) {
    if (input.dataset.masked === 'true') {
        input.value = ''; // Clear mask on focus
        input.dataset.masked = 'false';
    }
};

// Add global listener for inputs to clear mask status on any change
document.addEventListener('input', function (e) {
    if (e.target && e.target.classList.contains('input-field')) {
        if (e.target.dataset.masked === 'true') {
            e.target.dataset.masked = 'false';
        }
    }
});

// Initial Setup on Load
document.addEventListener('DOMContentLoaded', () => {
    // Load settings (API keys) to filter dropdowns immediately
    loadCurrentSettings();

    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeSettings();
            }
        });
    }

    // Add focus handlers to all API key inputs
    API_PROVIDERS.forEach(provider => {
        const input = document.getElementById(provider.key);
        if (input) {
            input.addEventListener('focus', handleApiKeyFocus);
        }
    });
});
