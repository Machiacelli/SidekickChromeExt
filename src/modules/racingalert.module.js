/**
 * Racing Alert Module
 * Keeps a red racing icon visible when not in a race to alert the user
 * Converted from xedx's Torn Racing Alert userscript
 */

const RacingAlertModule = (() => {
    // Module state
    let isEnabled = false;
    let checkInterval = null;
    let animatedIcons = true;

    // Icon HTML templates
    const raceIconRed = `<li id="sidekick-race-icon" class="icon18___wusPZ"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;

    return {
        name: 'RacingAlert',

        async initialize() {
            console.log('[Sidekick] Initializing Racing Alert...');

            // Check if Core module is available
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.warn('[Sidekick] Core module not available, Racing Alert disabled');
                return;
            }

            // Check if module is enabled
            const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_racing_alert');
            isEnabled = settings?.isEnabled !== false;
            animatedIcons = settings?.animatedIcons !== false;

            if (!isEnabled) {
                console.log('[Sidekick] Racing Alert is disabled');
                return;
            }

            // Add CSS styles
            this.addStyles();

            // Start checking for racing status
            this.startMonitoring();

            console.log('[Sidekick] Racing Alert initialized');
        },

        addStyles() {
            // Add animation style if not already present
            if (!document.getElementById('sidekick-racing-alert-styles')) {
                const style = document.createElement('style');
                style.id = 'sidekick-racing-alert-styles';
                style.textContent = `
                    .highlight-active {
                        -webkit-animation: highlight-active 2s linear 0s infinite normal;
                        animation: highlight-active 2s linear 0s infinite normal;
                    }
                    
                    @keyframes highlight-active {
                        0%, 49% { opacity: 1; }
                        50%, 100% { opacity: 0.3; }
                    }
                    
                    @-webkit-keyframes highlight-active {
                        0%, 49% { opacity: 1; }
                        50%, 100% { opacity: 0.3; }
                    }
                `;
                document.head.appendChild(style);
            }
        },

        hasStockRaceIcons() {
            // Check for Torn's default racing icons
            const redIcon = document.querySelector("[class^='icon18_']");
            const greenIcon = document.querySelector("[class^='icon17_']");
            return redIcon !== null || greenIcon !== null;
        },

        isAbroad() {
            // Check if player is abroad (flying)
            const abroadIcon = document.querySelector("[class^='icon71_']");
            return abroadIcon !== null;
        },

        handleCheck() {
            const existingRaceIcon = document.getElementById('sidekick-race-icon');
            const redIcon = document.querySelector("[class^='icon18_']");

            // Animate stock red icon if it exists
            if (redIcon && animatedIcons) {
                const parent = redIcon.closest('li');
                if (parent && !parent.classList.contains('highlight-active')) {
                    parent.classList.add('highlight-active');
                }
            }

            // Remove custom icon if abroad or stock icons exist
            if (this.isAbroad() || this.hasStockRaceIcons()) {
                if (existingRaceIcon) {
                    existingRaceIcon.remove();
                }
                return;
            }

            // Icon already exists
            if (existingRaceIcon) {
                if (animatedIcons && !existingRaceIcon.classList.contains('highlight-active')) {
                    existingRaceIcon.classList.add('highlight-active');
                }
                return;
            }

            // Add custom red racing icon
            const statusIcons = document.querySelector('[class^="status-icons"]');
            if (statusIcons) {
                statusIcons.insertAdjacentHTML('beforeend', raceIconRed);
                const newIcon = document.getElementById('sidekick-race-icon');

                // Try to match Torn's red icon class
                const tornRedIcon = document.querySelector("[class^='icon18_']");
                if (tornRedIcon) {
                    const iconClass = tornRedIcon.closest('li')?.className;
                    if (iconClass) {
                        newIcon.className = iconClass;
                    }
                }

                // Add animation
                if (animatedIcons) {
                    newIcon.classList.add('highlight-active');
                }

                console.log('[Sidekick] Racing Alert: Added custom race icon');
            }
        },

        startMonitoring() {
            // Initial check
            if (document.readyState === 'complete') {
                this.handleCheck();
            } else {
                window.addEventListener('load', () => this.handleCheck());
            }

            // Check every 5 seconds
            checkInterval = setInterval(() => this.handleCheck(), 5000);
        },

        stopMonitoring() {
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }

            // Remove custom icon
            const existingRaceIcon = document.getElementById('sidekick-race-icon');
            if (existingRaceIcon) {
                existingRaceIcon.remove();
            }

            // Remove animation from stock icons
            const redIcon = document.querySelector("[class^='icon18_']");
            if (redIcon) {
                const parent = redIcon.closest('li');
                if (parent) {
                    parent.classList.remove('highlight-active');
                }
            }
        },

        async destroy() {
            this.stopMonitoring();

            // Remove styles
            const styleEl = document.getElementById('sidekick-racing-alert-styles');
            if (styleEl) {
                styleEl.remove();
            }

            console.log('[Sidekick] Racing Alert destroyed');
        }
    };
})();

// Register module
if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.RacingAlert = RacingAlertModule;

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RacingAlertModule;
}
