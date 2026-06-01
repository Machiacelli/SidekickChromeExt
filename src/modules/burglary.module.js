/**
 * Sidekick Chrome Extension - Burglary Module
 * Display burglary confidence percentage permanently next to the graphic
 */

(function() {
    'use strict';

    console.log('🏠 Loading Sidekick Burglary Module...');

    const BurglaryModule = {
        isInitialized: false,
        isEnabled: false,
        _intervalId: null,

        async init() {
            if (this.isInitialized) return;
            console.log('🏠 Initializing Burglary Module...');

            try {
                this.isEnabled = await this.loadSettings();
                if (this.isEnabled) {
                    this.enable();
                }
                this.isInitialized = true;
                console.log('✅ Burglary Module initialized');
            } catch (error) {
                console.error('❌ Failed to initialize Burglary Module:', error);
            }
        },

        async loadSettings() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
                    if (settings && settings['crime-burglary']) {
                        return settings['crime-burglary'].isEnabled !== false;
                    }
                }
                return false; // Default off
            } catch (error) {
                console.error('Error loading Burglary settings:', error);
                return false;
            }
        },

        getColorByConfidence(percentage) {
            const percent = parseInt(percentage);
            if (percent === 100) return '#4dd0e1'; // Light blue
            if (percent >= 60) return '#4caf50';   // Green
            if (percent >= 40) return '#8bc34a';   // Light green
            if (percent >= 30) return '#ff9800';   // Orange
            return '#f44336';                       // Red
        },

        addConfidencePercentages() {
            // Only run on crimes page
            if (!window.location.href.includes('crimes')) return;

            const bars = document.querySelectorAll('div[class^="progressBar"][class*="vertical"]');

            bars.forEach((bar) => {
                const confidenceMeter = bar.closest('div[class^="confidenceMeter"]');
                if (!confidenceMeter) return;

                const label = bar.getAttribute('aria-label');
                if (!label) return;

                const match = label.match(/(\d+)/);
                if (!match) return;

                const percentage = match[1];
                const statusSection = confidenceMeter.closest('div[class^="statusSection"]');
                if (!statusSection) return;

                let display = statusSection.querySelector('.conf-text-display');

                if (!display) {
                    // Add left padding to create space
                    statusSection.style.paddingLeft = '50px';

                    display = document.createElement('div');
                    display.className = 'conf-text-display';
                    display.style.position = 'absolute';
                    display.style.left = '8px';
                    display.style.top = '50%';
                    display.style.transform = 'translateY(-50%)';
                    display.style.fontSize = '15px';
                    display.style.fontWeight = '600';
                    display.style.fontFamily = 'Roboto, sans-serif';
                    display.style.letterSpacing = '0.3px';
                    display.style.zIndex = '10';
                    display.style.pointerEvents = 'none';
                    display.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';

                    statusSection.style.position = 'relative';
                    statusSection.appendChild(display);

                    new MutationObserver(() => {
                        const newLabel = bar.getAttribute('aria-label');
                        const newMatch = newLabel?.match(/(\d+)/);
                        if (newMatch) {
                            display.textContent = newMatch[1] + '%';
                            display.style.color = BurglaryModule.getColorByConfidence(newMatch[1]);
                        }
                    }).observe(bar, { attributes: true, attributeFilter: ['aria-label'] });
                }

                // Update text and color
                display.textContent = percentage + '%';
                display.style.color = BurglaryModule.getColorByConfidence(percentage);
            });
        },

        enable() {
            console.log('🏠 Enabling Burglary Module');
            this.isEnabled = true;
            this.addConfidencePercentages();
            this._intervalId = setInterval(() => this.addConfidencePercentages(), 50);
            this._watchForHeader();
        },

        // ── Header badge ──────────────────────────────────────────────────
        _injectHeaderBadge() {
            if (document.getElementById('sidekick-burglary-badge')) return;
            const h4 = document.querySelector('div.appHeader___tG_Ot h4.heading___BtymB');
            if (!h4) return;
            const badge = document.createElement('span');
            badge.id = 'sidekick-burglary-badge';
            badge.title = 'Sidekick Burglary active';
            badge.style.cssText = [
                'display:inline-flex',
                'align-items:center',
                'justify-content:center',
                'width:16px',
                'height:16px',
                'border-radius:50%',
                'background:linear-gradient(135deg,#66BB6A,#4CAF50)',
                'color:#fff',
                'font-size:10px',
                'font-weight:bold',
                'margin-left:6px',
                'vertical-align:middle',
                'flex-shrink:0',
                'box-shadow:0 0 4px rgba(102,187,106,0.6)',
            ].join(';');
            badge.textContent = '\u2713';
            h4.appendChild(badge);
        },

        _removeHeaderBadge() {
            const b = document.getElementById('sidekick-burglary-badge');
            if (b) b.remove();
        },

        // Watch for the crimes SPA rendering/re-rendering the header
        _watchForHeader() {
            this._injectHeaderBadge();
            if (this._headerObserver) return;
            this._headerObserver = new MutationObserver(() => {
                if (!document.getElementById('sidekick-burglary-badge')) {
                    this._injectHeaderBadge();
                }
            });
            this._headerObserver.observe(document.body, { childList: true, subtree: true });
        },

        disable() {
            console.log('🏠 Disabling Burglary Module');
            this.isEnabled = false;
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            if (this._headerObserver) {
                this._headerObserver.disconnect();
                this._headerObserver = null;
            }
            this._removeHeaderBadge();

            // Clean up UI
            const displays = document.querySelectorAll('.conf-text-display');
            displays.forEach(d => d.remove());
            
            const sections = document.querySelectorAll('.statusSection___esgMf');
            sections.forEach(s => {
                s.style.paddingLeft = '';
                s.style.position = '';
            });
        },

        async toggle() {
            if (this.isEnabled) {
                this.disable();
            } else {
                this.enable();
            }
        }
    };

    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Burglary = BurglaryModule;

    console.log('✅ Sidekick Burglary Module loaded and ready');
})();
