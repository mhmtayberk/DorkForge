/**
 * Dork Trainer - Claymorphism Edition
 * 7 Levels, 28 Challenges
 */

const DORK_CHALLENGES = [
    // LEVEL 1: Absolute Basics (4 challenges)
    {
        level: 1,
        levelName: "🌱 Newbie",
        operator: "site:",
        explanation: "Limits search to a specific website or domain",
        example: "site:github.com",
        challenge: "Find pages only on example.com",
        answer: "site:example.com"
    },
    {
        level: 1,
        operator: "filetype:",
        explanation: "Searches for specific file extensions",
        example: "filetype:pdf",
        challenge: "Find PDF documents",
        answer: "filetype:pdf"
    },
    {
        level: 1,
        operator: "ext:",
        explanation: "Alternative to filetype: (works the same way)",
        example: "ext:sql",
        challenge: "Find SQL database files",
        answer: "ext:sql"
    },
    {
        level: 1,
        operator: "Combination",
        explanation: "Combine multiple operators with spaces",
        example: "site:example.com filetype:pdf",
        challenge: "Find PDFs on example.com",
        answer: "site:example.com filetype:pdf"
    },

    // LEVEL 2: Text Search (4 challenges)
    {
        level: 2,
        levelName: "📝 Word Hunter",
        operator: "intext:",
        explanation: "Searches for text within page content",
        example: "intext:password",
        challenge: "Find pages containing 'admin'",
        answer: "intext:admin"
    },
    {
        level: 2,
        operator: "intitle:",
        explanation: "Searches text in page titles",
        example: "intitle:login",
        challenge: "Find pages with 'index of' in title",
        answer: "intitle:index of"
    },
    {
        level: 2,
        operator: "inurl:",
        explanation: "Searches text in URLs",
        example: "inurl:admin",
        challenge: "Find URLs containing 'config'",
        answer: "inurl:config"
    },
    {
        level: 2,
        operator: "Quotes",
        explanation: "Use quotes for exact phrases",
        example: 'intext:"admin panel"',
        challenge: 'Find exact phrase "database backup"',
        answer: 'intext:"database backup"'
    },

    // LEVEL 3: Combine & Conquer (4 challenges)
    {
        level: 3,
        levelName: "🎯 Combo Master",
        operator: "OR",
        explanation: "Searches for either condition (must be uppercase)",
        example: "ext:sql OR ext:db",
        challenge: "Find PDF or DOC files",
        answer: "filetype:pdf OR filetype:doc"
    },
    {
        level: 3,
        operator: "( )",
        explanation: "Groups conditions together",
        example: "site:x.com (ext:sql OR ext:db)",
        challenge: "Find SQL or TXT files on example.com",
        answer: "site:example.com (ext:sql OR ext:txt)"
    },
    {
        level: 3,
        operator: "Minus Sign",
        explanation: "Excludes terms from search",
        example: "site:example.com -www",
        challenge: "Search example.com but exclude 'blog'",
        answer: "site:example.com -blog"
    },
    {
        level: 3,
        operator: "Mixed",
        explanation: "Combine site + intext + file type",
        example: "site:x.com intext:api ext:json",
        challenge: "Find 'password' in PDFs on example.com",
        answer: "site:example.com intext:password ext:pdf"
    },

    // LEVEL 4: Real Recon (4 challenges)
    {
        level: 4,
        levelName: "🔍 Recon Ranger",
        operator: "Login Pages",
        explanation: "Find authentication pages",
        example: "intitle:login OR inurl:admin",
        challenge: "Find login or admin pages on target.com",
        answer: "site:target.com (intitle:login OR inurl:admin)"
    },
    {
        level: 4,
        operator: "Directory Listings",
        explanation: "Exposed file/folder listings",
        example: 'intitle:"index of"',
        challenge: "Find directory listings on example.com",
        answer: 'site:example.com intitle:"index of"'
    },
    {
        level: 4,
        operator: "Config Files",
        explanation: "Configuration file extensions",
        example: "ext:conf OR ext:cfg",
        challenge: "Find .conf or .ini files on site.com",
        answer: "site:site.com (ext:conf OR ext:ini)"
    },
    {
        level: 4,
        operator: "Error Messages",
        explanation: "Find error pages revealing info",
        example: 'intext:"SQL syntax error"',
        challenge: "Find MySQL errors containing 'syntax'",
        answer: 'intext:"mysql" intext:"syntax"'
    },

    // LEVEL 5: Sensitive Hunt (4 challenges)
    {
        level: 5,
        levelName: "🕵️ Secret Seeker",
        operator: ".env Files",
        explanation: "Environment files with secrets",
        example: 'inurl:".env"',
        challenge: "Find .env files on production.com",
        answer: 'site:production.com inurl:".env"'
    },
    {
        level: 5,
        operator: "API Keys",
        explanation: "Exposed API credentials",
        example: 'intext:"api_key" ext:json',
        challenge: "Find JSON files with 'apiKey'",
        answer: 'intext:"apiKey" ext:json'
    },
    {
        level: 5,
        operator: "Database Dumps",
        explanation: "SQL dump/backup files",
        example: "ext:sql OR ext:dump",
        challenge: "Find .sql or .backup files",
        answer: "ext:sql OR ext:backup"
    },
    {
        level: 5,
        operator: "phpinfo()",
        explanation: "PHP info pages revealing server details",
        example: 'intitle:"phpinfo()"',
        challenge: "Find phpinfo pages on app.com",
        answer: 'site:app.com intitle:"phpinfo()"'
    },

    // LEVEL 6: Advanced Ops (4 challenges)
    {
        level: 6,
        levelName: "⚔️ Elite Dorker",
        operator: "SSH Keys",
        explanation: "Find exposed SSH private keys",
        example: 'intitle:"index of" "id_rsa"',
        challenge: "Find directories with SSH keys",
        answer: 'intitle:"index of" "id_rsa"'
    },
    {
        level: 6,
        operator: "Git Exposure",
        explanation: "Exposed .git folders",
        example: 'inurl:"/.git"',
        challenge: "Find .git folders on webapp.com",
        answer: 'site:webapp.com inurl:"/.git"'
    },
    {
        level: 6,
        operator: "Backup Files",
        explanation: "Common backup file patterns",
        example: 'ext:bak OR ext:old OR inurl:backup',
        challenge: "Find .bak or .old files on site.com",
        answer: "site:site.com (ext:bak OR ext:old)"
    },
    {
        level: 6,
        operator: "Cloud Storage",
        explanation: "Public cloud buckets/containers",
        example: 'site:s3.amazonaws.com "company"',
        challenge: "Find S3 buckets containing 'backup'",
        answer: 'site:s3.amazonaws.com "backup"'
    },

    // LEVEL 7: Master Class (4 challenges)
    {
        level: 7,
        levelName: "💎 Dork Master",
        operator: "Admin Panels",
        explanation: "Full admin page discovery",
        example: '(inurl:admin OR inurl:wp-admin) intitle:dashboard',
        challenge: "Find admin dashboards on corp.com",
        answer: 'site:corp.com (inurl:admin OR inurl:wp-admin) intitle:dashboard'
    },
    {
        level: 7,
        operator: "Multi-Extension Hunt",
        explanation: "Complex file type searches",
        example: 'site:x.com (ext:xls OR ext:xlsx OR ext:csv) intext:password',
        challenge: "Find Excel/CSV with 'confidential' on data.com",
        answer: 'site:data.com (ext:xls OR ext:xlsx OR ext:csv) intext:confidential'
    },
    {
        level: 7,
        operator: "Injection Testing",
        explanation: "Find potential SQLi vulnerable pages",
        example: 'inurl:id= site:site.com -inurl:https',
        challenge: "Find pages with id= parameter on test.com",
        answer: "inurl:id= site:test.com"
    },
    {
        level: 7,
        operator: "Ultimate Challenge",
        explanation: "Complex real-world scenario",
        example: 'site:target.com (ext:sql OR ext:db OR intext:"password") -inurl:https',
        challenge: "Find non-HTTPS pages with DB files or 'credentials' on secure.com",
        answer: 'site:secure.com (ext:sql OR ext:db OR intext:"credentials") -inurl:https'
    }
];

class DorkTrainer {
    constructor() {
        this.currentLevel = 1;
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.init();
    }

    init() {
        this.renderChallenge();
    }

    getChallengesForLevel(level) {
        return DORK_CHALLENGES.filter(c => c.level === level);
    }

    getCurrentChallenge() {
        const levelChallenges = this.getChallengesForLevel(this.currentLevel);
        return levelChallenges[this.currentChallengeIndex];
    }

    renderChallenge() {
        const challenge = this.getCurrentChallenge();
        const levelChallenges = this.getChallengesForLevel(this.currentLevel);
        const progress = this.currentChallengeIndex + 1;
        const total = levelChallenges.length;

        const container = document.getElementById('trainer-container');
        if (!container) return;

        container.innerHTML = `
            <div class="trainer-card">
                <div class="trainer-header">
                    <div class="level-badge">${levelChallenges[0].levelName}</div>
                    <div class="level-indicator">Level ${this.currentLevel} / 7</div>
                </div>

                <div class="progress-container">
                    <div class="progress-track">
                        <div class="progress-bar" style="width: ${(progress / total) * 100}%"></div>
                    </div>
                    <span class="progress-text">Challenge ${progress} of ${total}</span>
                </div>

                <div class="learn-section">
                    <div class="learn-header">
                        <svg class="learn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        <h3>Learn: ${challenge.operator}</h3>
                    </div>
                    <p class="explanation">${challenge.explanation}</p>
                    <div class="example-box">
                        <span class="example-label">Example:</span>
                        <code class="example-code">${challenge.example}</code>
                    </div>
                </div>

                <div class="challenge-section">
                    <div class="challenge-header">
                        <svg class="challenge-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3>Your Mission</h3>
                    </div>
                    <div class="mission-text">"${challenge.challenge}"</div>
                    
                    <div class="answer-area">
                        <input 
                            type="text" 
                            id="trainer-answer" 
                            class="trainer-input"
                            placeholder="Write your dork here..."
                            autocomplete="off"
                        />
                        <div class="action-buttons">
                            <button onclick="dorkTrainer.checkAnswer()" class="btn-clay btn-clay-primary">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Check
                            </button>
                            <button onclick="dorkTrainer.showHint()" class="btn-clay btn-clay-hint">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                                Hint
                            </button>
                            <button onclick="dorkTrainer.skip()" class="btn-clay btn-clay-skip">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Skip
                            </button>
                        </div>
                    </div>

                    <div id="trainer-feedback" class="feedback hidden"></div>
                    <div id="trainer-hint" class="hint-box hidden"></div>
                </div>

                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-label">Score</span>
                        <span class="stat-value">${this.score}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Hints</span>
                        <span class="stat-value">${this.hintsUsed}</span>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => document.getElementById('trainer-answer')?.focus(), 100);

        document.getElementById('trainer-answer')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
    }

    normalizeAnswer(answer) {
        return answer.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    checkAnswer() {
        const challenge = this.getCurrentChallenge();
        const userAnswer = document.getElementById('trainer-answer')?.value || '';
        const normalized = this.normalizeAnswer(userAnswer);
        const correctNormalized = this.normalizeAnswer(challenge.answer);

        const feedbackEl = document.getElementById('trainer-feedback');
        if (!feedbackEl) return;

        if (normalized === correctNormalized) {
            this.score += 10;
            feedbackEl.className = 'feedback feedback-success';
            feedbackEl.innerHTML = `
                <div class="feedback-emoji">🎉</div>
                <div>
                    <strong>Perfect!</strong>
                    <p>Your answer: <code>${userAnswer}</code></p>
                </div>
            `;
            feedbackEl.classList.remove('hidden');
            setTimeout(() => this.nextChallenge(), 1500);
        } else {
            feedbackEl.className = 'feedback feedback-error';
            feedbackEl.innerHTML = `
                <div class="feedback-emoji">❌</div>
                <div>
                    <strong>Not quite!</strong>
                    <p>Expected: <code>${challenge.answer}</code></p>
                </div>
            `;
            feedbackEl.classList.remove('hidden');
        }
    }

    showHint() {
        const challenge = this.getCurrentChallenge();
        const hintEl = document.getElementById('trainer-hint');
        if (!hintEl) return;

        hintEl.innerHTML = `
            <div class="hint-icon">💡</div>
            <div class="hint-text">Try using the <strong>${challenge.operator}</strong> operator!</div>
        `;
        hintEl.classList.remove('hidden');
        this.hintsUsed++;
    }

    skip() {
        const challenge = this.getCurrentChallenge();
        const feedbackEl = document.getElementById('trainer-feedback');
        if (!feedbackEl) return;

        feedbackEl.className = 'feedback feedback-skip';
        feedbackEl.innerHTML = `
            <div class="feedback-emoji">⏭️</div>
            <div>
                <strong>Skipped</strong>
                <p>Answer: <code>${challenge.answer}</code></p>
            </div>
        `;
        feedbackEl.classList.remove('hidden');
        setTimeout(() => this.nextChallenge(), 1500);
    }

    nextChallenge() {
        const levelChallenges = this.getChallengesForLevel(this.currentLevel);

        if (this.currentChallengeIndex < levelChallenges.length - 1) {
            this.currentChallengeIndex++;
            this.hintsUsed = 0;
            this.renderChallenge();
        } else {
            if (this.currentLevel < 7) {
                this.showLevelComplete();
            } else {
                this.showGameComplete();
            }
        }
    }

    showLevelComplete() {
        const container = document.getElementById('trainer-container');
        if (!container) return;

        // Track achievement for level completion
        if (window.achievementManager) {
            window.achievementManager.track('trainer_level', { level: this.currentLevel });
        }

        container.innerHTML = `
            <div class="completion-card">
                <div class="completion-emoji">🎊</div>
                <h2>Level ${this.currentLevel} Complete!</h2>
                <p>Nice work! Ready for the next challenge?</p>
                <div class="completion-score">
                    <div class="score-item">
                        <span class="score-label">Total Score</span>
                        <span class="score-value">${this.score}</span>
                    </div>
                </div>
                <button onclick="dorkTrainer.nextLevel()" class="btn-clay btn-clay-large btn-clay-primary">
                    Continue to Level ${this.currentLevel + 1} →
                </button>
            </div>
        `;
    }

    nextLevel() {
        this.currentLevel++;
        this.currentChallengeIndex = 0;
        this.hintsUsed = 0;
        this.renderChallenge();
    }

    showGameComplete() {
        const container = document.getElementById('trainer-container');
        if (!container) return;

        // Track achievement for completing all levels
        if (window.achievementManager) {
            window.achievementManager.track('trainer_level', { level: 7 });
        }

        container.innerHTML = `
            <div class="completion-card">
                <div class="completion-emoji celebration">💎</div>
                <h2>Congratulations!</h2>
                <h3>You're a Dork Master!</h3>
                <p>You've completed all 7 levels!</p>
                <div class="completion-score">
                    <div class="score-item">
                        <span class="score-label">Final Score</span>
                        <span class="score-value">${this.score}</span>
                    </div>
                    <div class="score-item">
                        <span class="score-label">Rank</span>
                        <span class="score-value">${this.getRank()}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button onclick="dorkTrainer.restart()" class="btn-clay btn-clay-primary">
                        🔄 Play Again
                    </button>
                    <button onclick="switchTab('classic')" class="btn-clay btn-clay-secondary">
                        🔨 Generator
                    </button>
                </div>
            </div>
        `;
    }

    getRank() {
        if (this.score >= 250) return '💎 Master';
        if (this.score >= 200) return '🥇 Expert';
        if (this.score >= 150) return '🥈 Advanced';
        if (this.score >= 100) return '🥉 Intermediate';
        return '📚 Beginner';
    }

    restart() {
        this.currentLevel = 1;
        this.currentChallengeIndex = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.renderChallenge();
    }
}

let dorkTrainer;
document.addEventListener('DOMContentLoaded', () => {
    dorkTrainer = new DorkTrainer();
});
