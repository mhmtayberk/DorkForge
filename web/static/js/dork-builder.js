/**
 * Dork Builder - Interactive Google Dork Creation Tool
 * Modern wizard interface with live preview
 */

class DorkBuilder {
    constructor() {
        this.currentStep = 1;
        this.selectedIntent = null;
        this.contextFilters = [];
        this.scope = 'domain';
        this.targetDomain = '';

        // Intent templates mapped from DorkForge categories
        this.intentTemplates = {
            login: {
                label: 'Login Pages',
                description: 'Find authentication and login pages',
                icon: 'M12 11c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-10C6.5 1 2 5.5 2 11c0 5.5 4.5 10 10 10s10-4.5 10-10c0-5.5-4.5-10-10-10z',
                dork: 'inurl:login | inurl:signin | inurl:auth',
                contexts: [
                    { label: 'Admin panels', value: 'intext:"admin" | intitle:"admin"' },
                    { label: 'VPN/Remote access', value: 'intext:"vpn" | intext:"remote"' },
                    { label: 'Webmail', value: 'intext:"webmail" | intext:"email"' }
                ]
            },
            files: {
                label: 'Documents & Files',
                description: 'Search for exposed documents and files',
                icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
                dork: 'ext:pdf | ext:doc | ext:docx | ext:xls | ext:xlsx',
                contexts: [
                    { label: 'Confidential', value: 'intext:"confidential" | intext:"not for distribution"' },
                    { label: 'Internal only', value: 'intext:"internal" | intext:"private"' },
                    { label: 'Sensitive', value: 'intext:"sensitive" | intext:"restricted"' }
                ]
            },
            admin: {
                label: 'Admin Panels',
                description: 'Locate administrative interfaces',
                icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
                dork: 'inurl:admin | intitle:admin | intext:"admin panel"',
                contexts: [
                    { label: 'CMS (WordPress, Joomla)', value: 'inurl:wp-admin | inurl:administrator' },
                    { label: 'Database admin', value: 'inurl:phpmyadmin | inurl:adminer' },
                    { label: 'Control panels', value: 'inurl:cpanel | inurl:plesk' }
                ]
            },
            config: {
                label: 'Config Files',
                description: 'Find configuration and settings files',
                icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
                dork: 'ext:conf | ext:config | ext:cfg | ext:ini | ext:env',
                contexts: [
                    { label: 'Database connection', value: 'intext:"database" | intext:"DB_PASSWORD"' },
                    { label: 'API keys', value: 'intext:"api_key" | intext:"secret"' },
                    { label: 'Credentials', value: 'intext:"password" | intext:"username"' }
                ]
            },
            logs: {
                label: 'Log Files',
                description: 'Access server and application logs',
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                dork: 'ext:log | ext:logs | intext:"error log"',
                contexts: [
                    { label: 'Access logs', value: 'intext:"access_log" | intitle:"access.log"' },
                    { label: 'Error logs', value: 'intext:"error_log" | intitle:"error.log"' },
                    { label: 'Debug logs', value: 'intext:"debug" | intitle:"debug.log"' }
                ]
            },
            sql: {
                label: 'SQL Files & DBs',
                description: 'Find SQL dumps and database files',
                icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
                dork: 'ext:sql | ext:db | ext:dump | inurl:backup',
                contexts: [
                    { label: 'Database dumps', value: 'intext:"mysqldump" | intext:"dump"' },
                    { label: 'Backups', value: 'intext:"backup" | inurl:bak' },
                    { label: 'SQL queries', value: 'intext:"SELECT" | intext:"INSERT"' }
                ]
            },
            api: {
                label: 'API Endpoints',
                description: 'Discover API documentation and endpoints',
                icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                dork: 'inurl:api | intitle:api | intext:"api documentation"',
                contexts: [
                    { label: 'Swagger/OpenAPI', value: 'inurl:swagger | inurl:api-docs' },
                    { label: 'GraphQL', value: 'inurl:graphql | intext:"graphiql"' },
                    { label: 'REST endpoints', value: 'inurl:/v1/ | inurl:/api/v2/' }
                ]
            },
            directories: {
                label: 'Open Directories',
                description: 'Find unprotected directory listings',
                icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
                dork: 'intitle:"index of /" | intitle:"directory listing"',
                contexts: [
                    { label: 'Apache', value: 'intext:"Apache" | intext:"Directory Listing"' },
                    { label: 'Parent directory', value: 'intext:"Parent Directory" | intext:"[To Parent Directory]"' },
                    { label: 'Media files', value: 'ext:mp4 | ext:mp3 | ext:avi' }
                ]
            },
            cameras: {
                label: 'Web Cameras',
                description: 'Locate unsecured network cameras',
                icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
                dork: 'inurl:view/index.shtml | inurl:ViewerFrame | intitle:"Live View"',
                contexts: [
                    { label: 'IP cameras', value: 'intext:"Network Camera" | intext:"IP Camera"' },
                    { label: 'Webcams', value: 'inurl:webcam | intitle:"webcam"' },
                    { label: 'CCTV', value: 'intext:"CCTV" | intext:"surveillance"' }
                ]
            },
            source: {
                label: 'Source Code',
                description: 'Find exposed source code repositories',
                icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                dork: 'ext:git | inurl:.git | inurl:GitHub | inurl:gitlab',
                contexts: [
                    { label: '.git folders', value: 'inurl:/.git/ | intitle:"Index of /.git"' },
                    { label: 'Repositories', value: 'inurl:repository | inurl:repo' },
                    { label: 'Code hosting', value: 'site:github.com | site:gitlab.com' }
                ]
            },
            social: {
                label: 'Social Media',
                description: 'Search across major social platforms',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
                dork: 'site:linkedin.com | site:twitter.com | site:facebook.com | site:instagram.com',
                contexts: [
                    { label: 'Employees', value: 'intext:"at company" | intext:"works at"' },
                    { label: 'Leaked Credentials', value: 'intext:"password" | intext:"login"' },
                    { label: 'Company Pages', value: 'intitle:"Company Page" | inurl:company' }
                ]
            },
            cloud: {
                label: 'Cloud Buckets',
                description: 'Find exposed cloud storage buckets',
                icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
                dork: 'site:s3.amazonaws.com | site:blob.core.windows.net | site:googleapis.com',
                contexts: [
                    { label: 'Public Buckets', value: 'intext:"ListBucketResult" | intext:"Contents"' },
                    { label: 'Config Files', value: 'ext:json | ext:xml | ext:yaml' },
                    { label: 'Backups', value: 'ext:bak | ext:dump | ext:sql' }
                ]
            },
            financial: {
                label: 'Financial Data',
                description: 'Locate sensitive financial documents',
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                dork: 'ext:xls | ext:xlsx | ext:csv | ext:pdf',
                contexts: [
                    { label: 'Salaries', value: 'intext:"salary" | intext:"payroll" | intext:"bonus"' },
                    { label: 'Budgets', value: 'intext:"budget" | intext:"finance report"' },
                    { label: 'Credit Cards', value: 'intext:"card number" | intext:"cvv" | intext:"expiration"' }
                ]
            },
            server: {
                label: 'Server Info',
                description: 'Exposed server status and info pages',
                icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
                dork: 'inurl:phpinfo | inurl:server-status | inurl:server-info',
                contexts: [
                    { label: 'PHP Info', value: 'intitle:"phpinfo()" | intext:"PHP Version"' },
                    { label: 'Apache Status', value: 'intitle:"Apache Status" | intext:"Apache Server Status"' },
                    { label: 'Environment', value: 'intext:"DOCUMENT_ROOT" | intext:"SERVER_ADDR"' }
                ]
            },
            error: {
                label: 'Error Messages',
                description: 'Find stack traces and error dumps',
                icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                dork: 'intext:"SQL syntax" | intext:"Fatal error" | intext:"Warning"',
                contexts: [
                    { label: 'SQL Errors', value: 'intext:"MySQL Error" | intext:"syntax error"' },
                    { label: 'PHP Errors', value: 'intext:"PHP Warning" | intext:"PHP Notice"' },
                    { label: 'Stack Traces', value: 'intext:"Stack trace:" | intext:"Call Stack"' }
                ]
            },
            saas: {
                label: 'SaaS Leaks',
                description: 'Exposed data on Trello, Notion, Jira',
                icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                dork: 'site:trello.com | site:notion.so | site:atlassian.net',
                contexts: [
                    { label: 'Trello Boards', value: 'intext:"password" | intext:"credentials"' },
                    { label: 'Notion', value: 'intext:"internal" | -inurl:template' },
                    { label: 'Jira/Confluence', value: 'inurl:dashboard | intext:"Atlassian"' }
                ]
            },
            devops: {
                label: 'DevOps Tools',
                description: 'Jenkins, Kubernetes, Docker exposures',
                icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
                dork: 'intitle:"Jenkins" | intitle:"Kubernetes Dashboard"',
                contexts: [
                    { label: 'CI/CD', value: 'inurl:jenkins | inurl:gitlab' },
                    { label: 'K8s', value: 'inurl:api/v1 | inurl:dashboard' },
                    { label: 'Monitoring', value: 'intitle:"Grafana" | intitle:"Kibana"' }
                ]
            },
            frameworks: {
                label: 'Modern Frameworks',
                description: 'React, Next.js, Django debug pages',
                icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
                dork: 'intext:"Powered by Next.js" | intext:"DisallowedHost"',
                contexts: [
                    { label: 'Django Debug', value: 'intext:"Django" "DisallowedHost"' },
                    { label: 'Laravel', value: 'intext:"Laravel" "Whoops, looks like something went wrong"' },
                    { label: 'Spring Boot', value: 'inurl:env | inurl:actuator' }
                ]
            },
            plugins: {
                label: 'Vulnerable Plugins',
                description: 'Known risky WordPress plugins',
                icon: 'M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 00-1.447.894L14 7.236 15.211 6.276zM6 8a2 2 0 11-4 0 2 2 0 014 0zM6 12a2 2 0 11-4 0 2 2 0 014 0zM6 16a2 2 0 11-4 0 2 2 0 014 0z',
                dork: 'inurl:wp-content/plugins/ | inurl:wp-content/themes/',
                contexts: [
                    { label: 'Uploads', value: 'inurl:uploads | inurl:files' },
                    { label: 'Log files', value: 'ext:log | inurl:debug.log' },
                    { label: 'Readme/License', value: 'inurl:readme.txt | inurl:license.txt' }
                ]
            }
        };
    }

    init() {
        this.reset(); // Clear state on init
        this.renderIntents();
        this.updatePreview();
    }

    // Reset builder state
    reset() {
        this.currentStep = 1;
        this.selectedIntent = null;
        this.contextFilters = [];
        this.scope = 'domain';
        this.targetDomain = '';

        // Clear all visual states
        document.querySelectorAll('.intent-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelectorAll('.context-pill').forEach(pill => {
            pill.classList.remove('active');
        });

        // Hide Step 1 Continue button
        const step1NextBtn = document.getElementById('step1NextBtn');
        if (step1NextBtn) {
            step1NextBtn.style.display = 'none';
        }
    }

    // Render intent cards in Bento Grid
    renderIntents() {
        const grid = document.querySelector('.intent-grid');
        if (!grid) return;

        grid.innerHTML = Object.entries(this.intentTemplates).map(([key, intent]) => `
            <div class="intent-card" onclick="dorkBuilder.selectIntent(event, '${key}')">
                <svg class="intent-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${intent.icon}"></path>
                </svg>
                <h4 class="intent-label">${intent.label}</h4>
                <p class="intent-description">${intent.description}</p>
            </div>
        `).join('');
    }

    selectIntent(event, intentKey) {
        this.selectedIntent = this.intentTemplates[intentKey];
        this.contextFilters = [];

        // Highlight selected card
        document.querySelectorAll('.intent-card').forEach(card => card.classList.remove('selected'));
        event.target.closest('.intent-card').classList.add('selected');

        // Render context filters and update preview
        this.renderContextFilters();
        this.updatePreview();

        // Show Continue button in Step 1
        const step1NextBtn = document.getElementById('step1NextBtn');
        if (step1NextBtn) {
            step1NextBtn.style.display = 'inline-flex';
        }

        // NO auto-navigation - user must click Continue
        // (Removed automatic nextStep() for better UX)
    }

    renderContextFilters() {
        const container = document.getElementById('contextFilters');
        if (!container || !this.selectedIntent) return;

        container.innerHTML = this.selectedIntent.contexts.map(ctx => `
            <button class="context-pill">
                ${ctx.label}
            </button>
        `).join('');

        // Attach event listeners to avoid HTML escaping issues
        container.querySelectorAll('.context-pill').forEach((pill, idx) => {
            pill.addEventListener('click', (e) => {
                this.toggleContext(e, this.selectedIntent.contexts[idx].value);
            });
        });
    }

    toggleContext(event, value) {
        const index = this.contextFilters.indexOf(value);
        if (index === -1) {
            this.contextFilters.push(value);
            event.target.classList.add('active');
        } else {
            this.contextFilters.splice(index, 1);
            event.target.classList.remove('active');
        }
        this.updatePreview();
    }

    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateSteps();
            this.updatePreview();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            // Clear intent selection when going back to Step 1
            if (this.currentStep === 1) {
                this.selectedIntent = null;
                this.contextFilters = [];
            }
            this.updateSteps();
            this.updatePreview(); // Update preview after navigation
        }
    }

    updateSteps() {
        // Update step visibility
        document.querySelectorAll('.builder-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
            step.classList.toggle('hidden', index + 1 !== this.currentStep);
        });

        // Update progress bar
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNum = index + 1;
            if (stepNum < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNum === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }

    updateScope(scope) {
        this.scope = scope;
        const domainInput = document.getElementById('domainInput');
        if (domainInput) {
            domainInput.style.display = scope === 'domain' || scope === 'subdomain' ? 'block' : 'none';
        }
        this.updatePreview();
    }

    updatePreview() {
        const dork = this.buildDork();
        const explanation = this.buildExplanation();

        document.getElementById('generatedDork').textContent = dork;
        document.getElementById('dorkExplanation').textContent = explanation;

        // Show/hide copy button
        const copyBtn = document.getElementById('copyDorkBtn');
        if (dork !== 'Select an intent to begin') {
            copyBtn.classList.remove('hidden');
        } else {
            copyBtn.classList.add('hidden');
        }
    }

    buildDork() {
        if (!this.selectedIntent) return 'Select an intent to begin';

        let parts = [];

        // Add domain/scope
        this.targetDomain = document.getElementById('targetDomain')?.value || '';
        if (this.scope === 'domain' && this.targetDomain) {
            parts.push(`site:${this.targetDomain}`);
        } else if (this.scope === 'subdomain' && this.targetDomain) {
            parts.push(`site:*.${this.targetDomain}`);
        }

        // Add intent dork
        parts.push(`(${this.selectedIntent.dork})`);

        // Add context filters
        if (this.contextFilters.length > 0) {
            this.contextFilters.forEach(filter => {
                parts.push(`(${filter})`);
            });
        }

        return parts.join(' ');
    }

    buildExplanation() {
        if (!this.selectedIntent) {
            return 'We\'ll help you build a Google dork step by step.';
        }

        let explanation = `We will ask Google to find ${this.selectedIntent.label.toLowerCase()}`;

        if (this.scope === 'domain' && this.targetDomain) {
            explanation += ` on the domain ${this.targetDomain}`;
        } else if (this.scope === 'subdomain' && this.targetDomain) {
            explanation += ` on ${this.targetDomain} and all its subdomains`;
        } else if (this.scope === 'global') {
            explanation += ` across the entire web`;
        }

        if (this.contextFilters.length > 0) {
            explanation += `, specifically looking for content matching ${this.contextFilters.length} additional filter${this.contextFilters.length > 1 ? 's' : ''}`;
        }

        explanation += '.';

        return explanation;
    }

    copyDork() {
        const dork = this.buildDork();
        navigator.clipboard.writeText(dork).then(() => {
            // Visual feedback
            const btn = event.target.closest('.copy-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);

            // Show toast if available
            if (typeof showToast === 'function') {
                showToast('Dork copied to clipboard!', 'success');
            }
        });
    }

    useDork() {
        const dork = this.buildDork();

        // Populate validator input in main UI
        const validateInput = document.getElementById('validateInput');
        if (validateInput) {
            validateInput.value = dork;
        }

        // Copy to clipboard as requested (Issue 7)
        if (navigator.clipboard) {
            navigator.clipboard.writeText(dork).catch(err => console.error('Clipboard write failed', err));
        }

        // Close modal
        closeDorkBuilder();

        // Show toast
        if (typeof showToast === 'function') {
            showToast('Dork added to validator!', 'success');
        }

        // Track achievement
        if (window.achievementManager) {
            window.achievementManager.track('builder');
        }

        // Auto-scroll to validator section
        setTimeout(() => {
            validateInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            validateInput?.focus();
        }, 400);
    }
}

// Modal control functions
function openDorkBuilder() {
    const modal = document.getElementById('dorkBuilderModal');
    if (modal) {
        modal.classList.remove('hidden');

        // Initialize if not already done
        if (!window.dorkBuilder) {
            window.dorkBuilder = new DorkBuilder();
            window.dorkBuilder.init();
        } else {
            // Reset state when reopening (fixes preview reset bug)
            window.dorkBuilder.reset();
            window.dorkBuilder.updateSteps();
            window.dorkBuilder.updatePreview();
        }

        // Pre-fill domain from main input
        const mainDomain = document.getElementById('domain')?.value;
        const targetDomain = document.getElementById('targetDomain');
        if (mainDomain && targetDomain) {
            targetDomain.value = mainDomain;
        }
    }
}

function closeDorkBuilder() {
    const modal = document.getElementById('dorkBuilderModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Close on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('dorkBuilderModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeDorkBuilder();
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.dorkBuilder = new DorkBuilder();
    window.dorkBuilder.init();
});
