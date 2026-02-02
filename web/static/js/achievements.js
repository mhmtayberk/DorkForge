/**
 * DorkForge Achievement System
 * 14 Achievements with localStorage persistence
 */

const ACHIEVEMENTS = [
    // Generation Achievements
    {
        id: 'first_dork',
        name: 'First Blood',
        icon: '🩸',
        description: 'Generate your first dork',
        points: 10,
        category: 'generation'
    },
    {
        id: 'dorks_10',
        name: 'Getting Started',
        icon: '🚀',
        description: 'Generate 10 dorks',
        points: 25,
        category: 'generation'
    },
    {
        id: 'dorks_50',
        name: 'Dork Enthusiast',
        icon: '🔥',
        description: 'Generate 50 dorks',
        points: 50,
        category: 'generation'
    },
    {
        id: 'dorks_100',
        name: 'Century Maker',
        icon: '💯',
        description: 'Generate 100 dorks',
        points: 100,
        category: 'generation'
    },
    {
        id: 'dorks_500',
        name: 'Dork Legend',
        icon: '🏆',
        description: 'Generate 500 dorks',
        points: 250,
        category: 'generation'
    },

    // Category Achievements
    {
        id: 'all_categories',
        name: 'Category Collector',
        icon: '🎨',
        description: 'Use all 20 categories',
        points: 100,
        category: 'exploration'
    },
    {
        id: 'five_domains',
        name: 'Domain Hunter',
        icon: '🌐',
        description: 'Generate dorks for 5 different domains',
        points: 50,
        category: 'exploration'
    },

    // Feature Achievements
    {
        id: 'first_ai',
        name: 'AI Pioneer',
        icon: '🤖',
        description: 'Generate your first AI-powered dork',
        points: 25,
        category: 'features'
    },
    {
        id: 'first_export',
        name: 'Data Hoarder',
        icon: '📦',
        description: 'Export dorks for the first time',
        points: 15,
        category: 'features'
    },
    {
        id: 'builder_first',
        name: 'Architect',
        icon: '🏗️',
        description: 'Create your first dork with Dork Builder',
        points: 25,
        category: 'features'
    },

    // Trainer Achievements
    {
        id: 'trainer_lvl1',
        name: 'Newbie Graduate',
        icon: '🌱',
        description: 'Complete Dork Trainer Level 1',
        points: 20,
        category: 'trainer'
    },
    {
        id: 'trainer_lvl7',
        name: 'Dork Master',
        icon: '💎',
        description: 'Complete all 7 Trainer levels',
        points: 200,
        category: 'trainer'
    },

    // Special Achievements
    {
        id: 'night_owl',
        name: 'Night Owl',
        icon: '🦉',
        description: 'Generate a dork between 1 AM and 5 AM',
        points: 15,
        category: 'special'
    },
    {
        id: 'weekend_warrior',
        name: 'Weekend Warrior',
        icon: '📅',
        description: 'Generate dorks on a weekend',
        points: 20,
        category: 'special'
    },
    {
        id: 'combo_master',
        name: 'Combo Master',
        icon: '⚡',
        description: 'Generate dorks with 3+ ACTIVE filters',
        points: 40,
        category: 'special'
    },
    {
        id: 'speed_demon',
        name: 'Speed Demon',
        icon: '⏩',
        description: 'Generate 5 dorks in 30 seconds',
        points: 30,
        category: 'special'
    }
];

class AchievementManager {
    constructor() {
        this.storageKey = 'dorkforge_achievements';
        this.data = this.loadFromStorage();
        this.recentGenerations = []; // For speed demon tracking
        this.init();
    }

    init() {
        this.renderBadge();
        console.log('[Achievements] Initialized with', Object.keys(this.data.unlocked).length, 'unlocked');
    }

    getDefaultData() {
        return {
            unlocked: {},
            stats: {
                total_dorks_generated: 0,
                categories_used: [],
                domains_used: [],
                ai_generations: 0,
                exports: 0,
                trainer_level_completed: 0,
                builder_uses: 0
            },
            points: 0
        };
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Achievements] Failed to load from storage:', e);
        }
        return this.getDefaultData();
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[Achievements] Failed to save to storage:', e);
        }
    }

    // Track various actions
    track(action, payload = {}) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

        // Check time-based achievements
        // Night Owl: 1 AM to 5 AM (inclusive of 1, exclusive of 5? Logic: 1 <= hour < 5)
        if (currentHour >= 1 && currentHour < 5) {
            this.checkAchievement('night_owl');
        }

        // Weekend Warrior: Saturday (6) or Sunday (0)
        if (currentDay === 0 || currentDay === 6) {
            this.checkAchievement('weekend_warrior');
        }

        switch (action) {
            case 'generate':
                this.trackGeneration(payload.count || 1, payload.category, payload.domain, payload.filterCount || 0);
                break;
            case 'ai_generate':
                this.data.stats.ai_generations++;
                this.checkAchievement('first_ai');
                break;
            case 'export':
                this.data.stats.exports++;
                this.checkAchievement('first_export');
                break;
            case 'builder':
                this.data.stats.builder_uses++;
                this.checkAchievement('builder_first');
                break;
            case 'trainer_level':
                this.trackTrainerLevel(payload.level);
                break;
        }

        this.saveToStorage();
        this.updateBadge();
    }

    trackGeneration(count, category, domain, filterCount) {
        // Update total count
        this.data.stats.total_dorks_generated += count;

        // Track category
        if (category && !this.data.stats.categories_used.includes(category)) {
            this.data.stats.categories_used.push(category);
        }

        // Track domain
        if (domain && !this.data.stats.domains_used.includes(domain)) {
            this.data.stats.domains_used.push(domain);
        }

        // Combo Master Check
        if (filterCount >= 3) {
            this.checkAchievement('combo_master');
        }

        // Speed demon tracking
        const now = Date.now();
        this.recentGenerations.push({ time: now, count });
        // Clean old entries (> 30s)
        this.recentGenerations = this.recentGenerations.filter(g => now - g.time < 30000);
        const recentTotal = this.recentGenerations.reduce((sum, g) => sum + g.count, 0);
        if (recentTotal >= 5) {
            this.checkAchievement('speed_demon');
        }

        // Check generation milestones
        const total = this.data.stats.total_dorks_generated;
        if (total >= 1) this.checkAchievement('first_dork');
        if (total >= 10) this.checkAchievement('dorks_10');
        if (total >= 50) this.checkAchievement('dorks_50');
        if (total >= 100) this.checkAchievement('dorks_100');
        if (total >= 500) this.checkAchievement('dorks_500');

        // Check category collector
        if (this.data.stats.categories_used.length >= 20) {
            this.checkAchievement('all_categories');
        }

        // Check domain hunter
        if (this.data.stats.domains_used.length >= 5) {
            this.checkAchievement('five_domains');
        }
    }

    trackTrainerLevel(level) {
        if (level > this.data.stats.trainer_level_completed) {
            this.data.stats.trainer_level_completed = level;
        }

        if (level >= 1) this.checkAchievement('trainer_lvl1');
        if (level >= 7) this.checkAchievement('trainer_lvl7');
    }

    checkAchievement(id) {
        if (this.data.unlocked[id]) {
            return false; // Already unlocked
        }

        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (!achievement) return false;

        // Unlock!
        this.data.unlocked[id] = {
            timestamp: new Date().toISOString()
        };
        this.data.points += achievement.points;

        this.showUnlockToast(achievement);
        this.saveToStorage();

        console.log('[Achievements] Unlocked:', achievement.name);
        return true;
    }

    showUnlockToast(achievement) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.achievement-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <div class="achievement-toast-icon">${achievement.icon}</div>
            <div class="achievement-toast-content">
                <div class="achievement-toast-title">Achievement Unlocked!</div>
                <div class="achievement-toast-name">${achievement.name}</div>
                <div class="achievement-toast-points">+${achievement.points} pts</div>
            </div>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    renderBadge() {
        // Create badge element if not exists
        let badge = document.getElementById('achievement-badge');
        if (!badge) {
            badge = document.createElement('button');
            badge.id = 'achievement-badge';
            badge.className = 'achievement-badge';
            badge.title = 'Achievements';
            badge.onclick = () => this.openGallery();

            // Insert into the container
            const badgeContainer = document.getElementById('achievement-badge-container');
            if (badgeContainer) {
                badgeContainer.innerHTML = '';
                badgeContainer.appendChild(badge);
            }
        }

        this.updateBadge();
    }

    updateBadge() {
        const badge = document.getElementById('achievement-badge');
        if (!badge) return;

        const unlockedCount = Object.keys(this.data.unlocked).length;
        const totalCount = ACHIEVEMENTS.length;

        badge.innerHTML = `
            <span class="badge-icon">🏅</span>
            <span class="badge-count">${unlockedCount}/${totalCount}</span>
        `;
    }

    openGallery() {
        // Close Category Settings if open
        if (window.categorySettingsManager && typeof window.categorySettingsManager.closePanel === 'function') {
            window.categorySettingsManager.closePanel();
        }

        // Remove existing modal
        const existingModal = document.querySelector('.achievement-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'achievements-modal';
        modal.className = 'achievement-modal';
        modal.innerHTML = `
            <div class="achievement-modal-backdrop" onclick="achievementManager.closeGallery()"></div>
            <div class="achievement-modal-content">
                <div class="achievement-modal-header">
                    <h2>🏆 Achievements</h2>
                    <div class="achievement-total-points">${this.data.points} pts</div>
                    <button class="achievement-modal-close" onclick="achievementManager.closeGallery()">×</button>
                </div>
                <div class="achievement-grid">
                    ${this.renderAchievementCards()}
                </div>
                <div class="achievement-stats">
                    <div class="stat-item">
                        <span class="stat-value">${this.data.stats.total_dorks_generated}</span>
                        <span class="stat-label">Dorks Generated</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.data.stats.categories_used.length}</span>
                        <span class="stat-label">Categories Used</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.data.stats.ai_generations}</span>
                        <span class="stat-label">AI Generations</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    closeGallery() {
        const modal = document.querySelector('.achievement-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }

    renderAchievementCards() {
        const categories = ['generation', 'exploration', 'features', 'trainer', 'special'];
        let html = '';

        categories.forEach(cat => {
            const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat);
            html += `<div class="achievement-category">
                <h3 class="achievement-category-title">${this.getCategoryTitle(cat)}</h3>
                <div class="achievement-category-grid">`;

            catAchievements.forEach(achievement => {
                const isUnlocked = !!this.data.unlocked[achievement.id];
                const unlockDate = isUnlocked
                    ? new Date(this.data.unlocked[achievement.id].timestamp).toLocaleDateString()
                    : null;

                html += `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-card-icon">${achievement.icon}</div>
                        <div class="achievement-card-info">
                            <div class="achievement-card-name">${achievement.name}</div>
                            <div class="achievement-card-desc">${achievement.description}</div>
                            ${isUnlocked
                        ? `<div class="achievement-card-date">${unlockDate}</div>`
                        : `<div class="achievement-card-points">+${achievement.points} pts</div>`
                    }
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        return html;
    }

    getCategoryTitle(cat) {
        const titles = {
            generation: '📊 Generation',
            exploration: '🗺️ Exploration',
            features: '⚡ Features',
            trainer: '🎓 Trainer',
            special: '✨ Special'
        };
        return titles[cat] || cat;
    }

    // Get progress for a specific achievement (for progress bars)
    getProgress(id) {
        const stats = this.data.stats;
        switch (id) {
            case 'dorks_10': return { current: stats.total_dorks_generated, target: 10 };
            case 'dorks_50': return { current: stats.total_dorks_generated, target: 50 };
            case 'dorks_100': return { current: stats.total_dorks_generated, target: 100 };
            case 'dorks_500': return { current: stats.total_dorks_generated, target: 500 };
            case 'all_categories': return { current: stats.categories_used.length, target: 20 };
            case 'five_domains': return { current: stats.domains_used.length, target: 5 };
            default: return null;
        }
    }
}

// Global instance
let achievementManager;

document.addEventListener('DOMContentLoaded', () => {
    achievementManager = new AchievementManager();
    window.achievementManager = achievementManager;
});
