// DorkForge Standalone Extension Logic

let dorkGenerator;
let dorkValidator;
let dorkPermutator;
let templatesData;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI
    setupTabs();
    setupSettings();

    // Load Core Logic
    try {
        dorkValidator = new DorkValidator();
        dorkPermutator = new DorkPermutator();
    } catch (e) {
        console.error("Core init failed:", e);
        updateStatus("Core Error", "error");
    }

    // Load Templates & Generator
    try {
        const response = await fetch('./data/templates.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        templatesData = await response.json();

        dorkGenerator = new DorkGenerator(templatesData);

        populateCategories();
        await updateProviderList();

        // Pre-fill Domain
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs && tabs[0] && tabs[0].url) {
                try {
                    const url = new URL(tabs[0].url);
                    if (url.protocol.startsWith('http')) {
                        const domain = url.hostname;
                        document.getElementById('classicDomain').value = domain;
                        document.getElementById('aiDomain').value = domain;
                    }
                } catch (e) { }
            }
        });

        console.log("DorkForge Core initialized");
        updateStatus("Ready (Standalone)");
    } catch (e) {
        console.error("Failed to load templates:", e);
        updateStatus(`Error: ${e.message}`, "error");
    }

    // Event Listeners
    document.getElementById('classicGenerateBtn').addEventListener('click', handleClassicGenerate);
    document.getElementById('aiGenerateBtn').addEventListener('click', handleAiGenerate);

    document.getElementById('clearResults').addEventListener('click', () => {
        const resultsArea = document.getElementById('resultsArea');
        resultsArea.classList.add('hidden');
        document.getElementById('resultsContent').innerHTML = '';
    });

    document.getElementById('aiProvider').addEventListener('change', async (e) => {
        const provider = e.target.value;
        const modelGroup = document.getElementById('modelSelectGroup');
        if (provider === 'ollama') {
            modelGroup.classList.remove('hidden');
            await fetchOllamaModels();
        } else {
            modelGroup.classList.add('hidden');
        }
    });

    document.getElementById('validateBtn').addEventListener('click', () => handleToolRun('validate'));
    document.getElementById('variationsBtn').addEventListener('click', () => handleToolRun('permute'));

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tool-section').forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden');
            });

            btn.classList.add('active');
            const tool = btn.dataset.tool;

            const valInput = document.getElementById('validateInput');
            const varInput = document.getElementById('variationsInput');

            let activeSection;
            if (tool === 'validate') {
                activeSection = document.getElementById('validateTool');
                if (varInput.value) valInput.value = varInput.value;
            } else {
                activeSection = document.getElementById('variationsTool');
                if (valInput.value) varInput.value = valInput.value;
            }

            if (activeSection) {
                activeSection.classList.remove('hidden');
                activeSection.classList.add('active');
            }
        });
    });
});

// --- UI Helpers ---
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
            });
            tab.classList.add('active');
            const target = tab.dataset.tab;
            const content = document.getElementById(target);
            if (content) {
                content.classList.remove('hidden');
                content.classList.add('active');
            }
        });
    });
}

function updateStatus(msg, type = 'info') {
    const statusEl = document.getElementById('serverStatus');
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.className = `server-status ${type === 'error' ? 'error' : 'connected'}`;
    }
}

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}

function displayResults(content, isHtml = false) {
    const resultsDiv = document.getElementById('resultsArea');
    const resultsContent = document.getElementById('resultsContent');

    if (isHtml) resultsContent.innerHTML = content;
    else resultsContent.textContent = content;

    if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- AI Configuration Helpers ---
// NOTE: chrome.storage.local stores data unencrypted. While common for extensions,
// sensitive keys should only be stored on trusted/encrypted local disks.
async function updateProviderList() {
    const keys = await chrome.storage.local.get(['openaiKey', 'geminiKey', 'claudeKey', 'ollamaUrl', 'groqKey', 'mistralKey', 'deepseekKey']);
    const select = document.getElementById('aiProvider');
    select.innerHTML = '<option value="">Select a provider...</option>';

    let count = 0;
    if (keys.openaiKey) { select.innerHTML += '<option value="openai">OpenAI</option>'; count++; }
    if (keys.geminiKey) { select.innerHTML += '<option value="gemini">Gemini</option>'; count++; }
    if (keys.claudeKey) { select.innerHTML += '<option value="claude">Claude</option>'; count++; }
    if (keys.groqKey) { select.innerHTML += '<option value="groq">Groq</option>'; count++; }
    if (keys.mistralKey) { select.innerHTML += '<option value="mistral">Mistral</option>'; count++; }
    if (keys.deepseekKey) { select.innerHTML += '<option value="deepseek">DeepSeek</option>'; count++; }

    if (keys.ollamaUrl) {
        select.innerHTML += '<option value="ollama">Ollama (Local)</option>';
        count++;
    } else {
        if (count === 0) {
            select.innerHTML = '<option value="" disabled>Please configure AI in Settings</option>';
        }
    }
}

async function fetchOllamaModels() {
    const select = document.getElementById('ollamaModel');
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;

    try {
        const keys = await chrome.storage.local.get(['ollamaUrl']);
        const url = keys.ollamaUrl || 'http://localhost:11434';
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
        clearTimeout(id);

        if (!res.ok) throw new Error("Unreachable");
        const data = await res.json();

        select.innerHTML = '';
        if (data.models && data.models.length > 0) {
            data.models.forEach(m => {
                select.innerHTML += `<option value="${m.name}">${m.name}</option>`;
            });
            select.disabled = false;
        } else {
            select.innerHTML = '<option value="">No models found</option>';
        }
    } catch (e) {
        console.error("Ollama fetch failed", e);
        let msg = "Connection Failed";
        if (e.name === 'AbortError') msg = "Timeout (Is Ollama running?)";
        else if (e.message) msg = `Error: ${e.message}`;
        select.innerHTML = `<option value="">${msg}</option>`;
    }
}

// --- Classic Generator ---
function populateCategories() {
    const select = document.getElementById('classicCategory');
    if (!dorkGenerator) return;

    select.disabled = false;
    document.getElementById('classicGenerateBtn').disabled = false;

    let categories = dorkGenerator.getCategories();
    categories.sort((a, b) => a.name.localeCompare(b.name));

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Categories';
    select.appendChild(allOption);

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });

    select.addEventListener('change', () => {
        renderFilters(select.value);
    });
}

function renderFilters(categoryId) {
    const container = document.getElementById('classicFilters');
    container.innerHTML = '';
    container.classList.add('hidden');

    if (!templatesData || !categoryId || categoryId === 'all') return;

    const category = templatesData.categories.find(c => (c.category || c.name) === categoryId);
    if (!category || !category.filters || category.filters.length === 0) return;

    container.classList.remove('hidden');

    category.filters.forEach(filter => {
        const group = document.createElement('div');
        group.className = 'filter-group';

        const label = document.createElement('span');
        label.className = 'filter-label';
        label.textContent = filter.label;
        group.appendChild(label);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'filter-options';

        filter.options.forEach(opt => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.textContent = opt.label;
            chip.dataset.value = opt.value;
            chip.dataset.key = filter.key;
            chip.addEventListener('click', () => chip.classList.toggle('selected'));
            optionsDiv.appendChild(chip);
        });
        group.appendChild(optionsDiv);
        container.appendChild(group);
    });
}

function handleClassicGenerate() {
    const categoryId = document.getElementById('classicCategory').value;
    const domain = document.getElementById('classicDomain').value.trim();

    if (!domain) {
        displayResults("Please enter a domain.", false);
        return;
    }

    const activeFilters = [];
    document.querySelectorAll('.filter-chip.selected').forEach(chip => {
        activeFilters.push({
            key: chip.dataset.key,
            value: chip.dataset.value
        });
    });

    let dorks = [];
    if (categoryId === 'all') {
        const categories = dorkGenerator.getCategories();
        categories.forEach(cat => {
            dorks = dorks.concat(dorkGenerator.generate(cat.id, { domain: domain }));
        });
    } else {
        dorks = dorkGenerator.generate(categoryId, { domain: domain });
    }

    if (activeFilters.length > 0) {
        dorks = dorks.filter(dork => {
            const groups = {};
            activeFilters.forEach(f => {
                if (!groups[f.key]) groups[f.key] = [];
                groups[f.key].push(f.value);
            });
            for (const key in groups) {
                const values = groups[key];
                const targetText = key === 'description_contains' ? dork.description : dork.query;
                const match = values.some(v => targetText.toLowerCase().includes(v.toLowerCase()));
                if (!match) return false;
            }
            return true;
        });
    }

    if (dorks.length === 0) {
        displayResults("No dorks generated. Check filters or category.", false);
        return;
    }

    let html = '<ul class="dork-list">';
    dorks.forEach(d => {
        const link = `https://www.google.com/search?q=${encodeURIComponent(d.query)}`;
        html += `
            <li>
                <div class="dork-item">
                    <div class="dork-text">
                        <span class="dork-desc">${d.description}</span>
                        <a href="${link}" target="_blank" class="dork-link">${escapeHtml(d.query)}</a>
                    </div>
                    <button class="copy-btn" title="Copy to clipboard">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </li>`;
    });
    html += '</ul>';
    displayResults(html, true);
}

// --- AI Generator ---
async function handleAiGenerate() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    const domain = document.getElementById('aiDomain').value.trim();
    const provider = document.getElementById('aiProvider').value;

    if (!prompt) return;

    showLoading(true);

    try {
        const keys = await chrome.storage.local.get(['openaiKey', 'geminiKey', 'claudeKey', 'ollamaUrl', 'groqKey', 'mistralKey', 'deepseekKey']);
        let dorks = [];
        let fullPrompt = prompt;
        if (domain) fullPrompt += ` (Target domain: ${domain})`;

        switch (provider) {
            case 'openai':
                if (!keys.openaiKey) throw new Error("OpenAI Key missing in Settings");
                dorks = await callOpenAICompatible('https://api.openai.com/v1/chat/completions', keys.openaiKey, 'gpt-3.5-turbo', fullPrompt);
                break;
            case 'gemini':
                if (!keys.geminiKey) throw new Error("Gemini Key missing in Settings");
                dorks = await callGemini(keys.geminiKey, fullPrompt);
                break;
            case 'claude':
                if (!keys.claudeKey) throw new Error("Claude Key missing in Settings");
                dorks = await callClaude(keys.claudeKey, fullPrompt);
                break;
            case 'groq':
                if (!keys.groqKey) throw new Error("Groq Key missing in Settings");
                dorks = await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', keys.groqKey, 'llama3-70b-8192', fullPrompt);
                break;
            case 'mistral':
                if (!keys.mistralKey) throw new Error("Mistral Key missing in Settings");
                dorks = await callOpenAICompatible('https://api.mistral.ai/v1/chat/completions', keys.mistralKey, 'mistral-small-latest', fullPrompt);
                break;
            case 'deepseek':
                if (!keys.deepseekKey) throw new Error("DeepSeek Key missing in Settings");
                dorks = await callOpenAICompatible('https://api.deepseek.com/chat/completions', keys.deepseekKey, 'deepseek-chat', fullPrompt);
                break;
            case 'ollama':
                const url = keys.ollamaUrl || 'http://localhost:11434';
                const model = document.getElementById('ollamaModel').value;
                if (!model) throw new Error("Please select an Ollama model");
                dorks = await callOllama(url, fullPrompt, model);
                break;
            default:
                throw new Error("Invalid Provider");
        }

        let html = '<ul class="dork-list">';
        let validDorksCount = 0;
        dorks.forEach(d => {
            let clean = d.replace(/`/g, '');
            clean = clean.replace(/^\s*(\d+[\.\)]|[-*])\s*/, '').trim();
            if (!clean) return;

            const hasOperator = /[a-zA-Z0-9]+:[^ ]/.test(clean) || /".*"/.test(clean);
            const looksLikeSentence = /^[A-Z].*[.!:?]$/.test(clean) && !hasOperator;
            if (looksLikeSentence || (!hasOperator && clean.length > 30)) return;

            validDorksCount++;
            const link = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
            html += `
                <li>
                    <div class="dork-item">
                        <div class="dork-text">
                            <a href="${link}" target="_blank" class="dork-link">${escapeHtml(clean)}</a>
                        </div>
                        <button class="copy-btn" title="Copy to clipboard">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                </li>`;
        });

        if (validDorksCount === 0) {
            html = `<div class="status-message">AI Response didn't contain valid dorks. Raw output:<br>${dorks.slice(0, 3).join('<br>')}...</div>`;
        } else {
            html += '</ul>';
        }
        displayResults(html, true);
    } catch (e) {
        displayResults(`AI Error: ${e.message}`, false);
    } finally {
        showLoading(false);
    }
}

// Standard OpenAI Helper (Works for Groq, Mistral, DeepSeek)
async function callOpenAICompatible(url, key, model, prompt) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You are a Google Dork extraction tool. You MUST output ONLY raw Google Dork queries. Do not use Markdown formatting (no backticks). Do not provide explanations or introductions. One dork per line." },
                { role: "user", content: prompt }
            ]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    if (!data.choices || !data.choices[0]) throw new Error("Invalid response format from AI provider");
    return data.choices[0].message.content.split('\n').filter(l => l.trim().length > 0);
}

async function callGemini(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate 3-5 Google Dorks for: "${prompt}". Output ONLY raw dorks, one per line. NO Markdown, NO explanations, NO intro/outro text.` }] }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.split('\n').filter(l => l.trim().length > 0);
}

async function callClaude(key, prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: [{ role: "user", content: `Generate 3-5 Google Dorks for: "${prompt}". Output ONLY raw dorks, one per line. Do not use Markdown backticks. Do not include any conversational text.` }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text.split('\n').filter(l => l.trim().length > 0);
}

async function callOllama(baseUrl, prompt, model) {
    const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, prompt: `Generate 3-5 Google Dorks for: "${prompt}". Output ONLY raw dorks, one per line. NO Markdown, NO explanations.`, stream: false })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.response.split('\n').filter(l => l.trim().length > 0);
}

// --- Tools ---
async function handleToolRun(tool) {
    showLoading(true);
    try {
        let html = '';
        switch (tool) {
            case 'validate':
                const dork = document.getElementById('validateInput').value.trim();
                const validation = dorkValidator.validateDork(dork);
                if (validation.valid) {
                    html = `<p>Dork: <code>${escapeHtml(dork)}</code></p>`;
                    html += `<p class="validation-success">✅ Valid Dork!</p>`;
                    html += `<div class="dork-explanation">${escapeHtml(dorkValidator.explainDork(dork)).replace(/\n/g, '<br>')}</div>`;
                } else {
                    html = `<p class="validation-error">❌ Invalid: ${escapeHtml(validation.error)}</p>`;
                }
                break;
            case 'permute':
                const input = document.getElementById('variationsInput').value.trim();
                const variations = dorkPermutator.getVariations(input);
                html = `<strong>Generated ${variations.length} variations:</strong><ul class="dork-list">`;
                variations.forEach(v => {
                    const link = `https://www.google.com/search?q=${encodeURIComponent(v)}`;
                    html += `<li><div class="dork-item"><div class="dork-text"><a href="${link}" target="_blank" class="dork-link">${escapeHtml(v)}</a></div></div></li>`;
                });
                html += '</ul>';
                break;
        }
        displayResults(html, true);
    } catch (e) {
        displayResults(`Tool Error: ${e.message}`, false);
    } finally {
        showLoading(false);
    }
}

// --- Settings ---
function setupSettings() {
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const openaiKey = document.getElementById('openaiKey').value.trim();
        const geminiKey = document.getElementById('geminiKey').value.trim();
        const claudeKey = document.getElementById('claudeKey').value.trim();
        const groqKey = document.getElementById('groqKey').value.trim();
        const mistralKey = document.getElementById('mistralKey').value.trim();
        const deepseekKey = document.getElementById('deepseekKey').value.trim();
        const ollamaUrl = document.getElementById('ollamaUrl').value.trim();

        chrome.storage.local.set({ openaiKey, geminiKey, claudeKey, groqKey, mistralKey, deepseekKey, ollamaUrl }, async () => {
            const status = document.getElementById('settingsStatus');
            status.textContent = "Settings Saved!";
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 2000);
            await updateProviderList();
        });
    });

    document.getElementById('resultsContent').addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (btn) {
            e.stopPropagation();
            const item = btn.closest('.dork-item');
            const textToCopy = item.querySelector('.dork-link').textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalIcon = btn.innerHTML;
                btn.classList.add('success');
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.innerHTML = originalIcon;
                }, 1500);
            });
        }
    });

    chrome.storage.local.get(['openaiKey', 'geminiKey', 'claudeKey', 'groqKey', 'mistralKey', 'deepseekKey', 'ollamaUrl'], (result) => {
        if (result.openaiKey) document.getElementById('openaiKey').value = result.openaiKey;
        if (result.geminiKey) document.getElementById('geminiKey').value = result.geminiKey;
        if (result.claudeKey) document.getElementById('claudeKey').value = result.claudeKey;
        if (result.groqKey) document.getElementById('groqKey').value = result.groqKey;
        if (result.mistralKey) document.getElementById('mistralKey').value = result.mistralKey;
        if (result.deepseekKey) document.getElementById('deepseekKey').value = result.deepseekKey;
        if (result.ollamaUrl) document.getElementById('ollamaUrl').value = result.ollamaUrl;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
