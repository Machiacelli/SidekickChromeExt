/**
 * Quick Deposit Module
 * Adds [deposit] button next to money in sidebar for quick vault deposits
 * Supports: Faction Vault, Property Vault, Company Vault, Ghost Trade
 */

const QuickDepositModule = {
    name: 'QuickDeposit',

    // State
    settings: {
        target: 'FACTION' // Default deposit target: FACTION, PROPERTY, COMPANY, or GHOST
    },

    state: {
        ghostID: null,
        isEnabled: false,
        depositButton: null,
        observer: null
    },

    // Initialize module
    async init() {
        console.log('🏦 Quick Deposit: Initializing...');

        // Load settings from Chrome Storage
        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
            const stored = await ChromeStorage.get([
                'quickDeposit_target',
                'quickDeposit_ghostID'
            ]);

            if (stored.quickDeposit_target) {
                this.settings.target = stored.quickDeposit_target;
            }

            if (stored.quickDeposit_ghostID) {
                this.state.ghostID = stored.quickDeposit_ghostID;
            }

            console.log('🏦 Deposit Target:', this.settings.target);
            console.log('🏦 Ghost ID:', this.state.ghostID || 'None');
        } catch (err) {
            console.error('🏦 Error loading settings:', err);
        }
    },

    // Enable module
    enable() {
        if (this.state.isEnabled) return;
        this.state.isEnabled = true;

        console.log('🏦 Quick Deposit: Enabled');

        // Inject button
        this.injectButton();

        // Start observer to re-inject button on page changes
        this.startObserver();

        // Scan for ghost trades if on trade page
        if (window.location.href.includes('trade.php')) {
            this.scanTrades();
        }
    },

    // Disable module
    disable() {
        if (!this.state.isEnabled) return;
        this.state.isEnabled = false;

        console.log('🏦 Quick Deposit: Disabled');

        // Remove button
        if (this.state.depositButton && this.state.depositButton.parentNode) {
            this.state.depositButton.remove();
            this.state.depositButton = null;
        }

        // Stop observer
        if (this.state.observer) {
            this.state.observer.disconnect();
            this.state.observer = null;
        }
    },

    // Get current balance from sidebar
    getBalance() {
        const moneyEl = document.getElementById('user-money');
        if (!moneyEl) return 0;

        const balanceStr = moneyEl.getAttribute('data-money') || moneyEl.innerText.replace(/[^\d]/g, '');
        return parseInt(balanceStr) || 0;
    },

    // Get player status (faction, company, hospital, travel)
    getStatus() {
        const icons = document.querySelectorAll('ul[class*="status-icons"] > li');
        if (!icons.length) {
            return { faction: true, property: true, company: false, ghost: true, reason: "LOADING" };
        }

        let status = { faction: true, property: true, company: false, ghost: true, reason: "" };
        let isHosp = false, isTravel = false;

        icons.forEach(li => {
            // Hospital (15) or Jail (16)
            if (li.className.match(/icon1[56]/)) isHosp = true;
            // Traveling (71)
            if (li.className.includes('icon71')) isTravel = true;
            // Company (73)
            if (li.className.includes('icon73')) status.company = true;
        });

        if (isHosp) {
            status.faction = status.company = status.ghost = false;
            status.reason = "HOSP/JAIL";
        } else if (isTravel) {
            status.faction = status.property = status.company = status.ghost = false;
            status.reason = "TRAVEL";
        }

        // Check if player is in a faction
        const sidebarFaction = document.querySelector('a[href^="/factions.php"]');
        if (!sidebarFaction) status.faction = false;

        return status;
    },

    // Inject deposit button next to money
    injectButton() {
        const moneyEl = document.getElementById('user-money');
        if (!moneyEl) return;

        // Don't inject if button already exists
        if (this.state.depositButton && this.state.depositButton.parentNode) return;

        const button = document.createElement('a');
        button.id = 'sk-quick-deposit';
        button.href = '#';
        button.className = 'use___wM1PI'; // Match TORN's [use] button style
        button.style.marginLeft = '10px';
        button.style.cursor = 'pointer';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.executeDeposit('auto');
        });

        // Insert after money element
        if (moneyEl.parentNode) {
            moneyEl.parentNode.insertBefore(button, moneyEl.nextSibling);
            this.state.depositButton = button;
            this.updateButtonText();
        }
    },

    // Update button text based on current status
    updateButtonText() {
        if (!this.state.depositButton) return;

        const status = this.getStatus();
        let text = '[deposit]';
        let title = 'Quick Deposit';

        // Show target based on settings
        const target = this.settings.target;

        if (target === 'GHOST' && this.state.ghostID && status.ghost) {
            text = '[ghost]';
            title = `Ghost Trade: ${this.state.ghostID}`;
        } else if (target === 'FACTION' && status.faction) {
            title = 'Faction Vault';
        } else if (target === 'PROPERTY' && status.property) {
            title = 'Property Vault';
        } else if (target === 'COMPANY' && status.company) {
            title = 'Company Vault';
        } else {
            title = 'No vault available';
        }

        this.state.depositButton.innerText = text;
        this.state.depositButton.title = title;
    },

    // Execute deposit
    async executeDeposit(mode = 'auto') {
        const status = this.getStatus();
        const balance = this.getBalance();

        if (balance <= 0) {
            this.showToast('No cash to deposit');
            return;
        }

        // Use configured target or auto mode
        let target = mode === 'auto' ? this.settings.target : mode;

        // Validate target is available
        if (target === 'GHOST' && (!this.state.ghostID || !status.ghost)) {
            this.showToast('Ghost trade not available');
            return;
        }
        if (target === 'FACTION' && !status.faction) {
            this.showToast('Faction vault not available');
            return;
        }
        if (target === 'COMPANY' && !status.company) {
            this.showToast('Company vault not available');
            return;
        }

        // Execute deposit based on target
        if (target === 'GHOST') {
            this.depositToGhost(balance);
        } else if (target === 'FACTION') {
            this.depositToFaction(balance);
        } else if (target === 'PROPERTY') {
            this.depositToProperty(balance);
        } else if (target === 'COMPANY') {
            this.depositToCompany(balance);
        }
    },

    // Deposit to Ghost Trade
    depositToGhost(amount) {
        const url = window.location.href;
        const onPage = url.includes('trade.php') && url.includes(this.state.ghostID);
        const input = document.querySelector('.input-money[type="text"]');

        if (!onPage || !input) {
            // Navigate to ghost trade
            window.location.href = `https://www.torn.com/trade.php#step=addmoney&ID=${this.state.ghostID}`;
            return;
        }

        // Fill and submit
        this.setInputValue(input, amount);
        const btn = input.form?.querySelector('input[type="submit"], button[type="submit"]');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('disabled');
            btn.click();
        }
    },

    // Deposit to Faction Vault
    depositToFaction(amount) {
        const url = window.location.href;
        const onPage = url.includes('factions.php') && url.includes('tab=armoury');
        const form = document.querySelector('.give-money-form');

        if (!form && !onPage) {
            window.location.href = 'https://www.torn.com/factions.php?step=your&type=1#/tab=armoury';
            return;
        }

        if (!form) {
            // On page but form not loaded yet - click tab
            document.querySelector('a[href*="tab=armoury"]')?.click();
            return;
        }

        const input = form.querySelector('.input-money');
        if (!input) return;

        this.setInputValue(input, amount);
        const btn = form.querySelector('button.torn-btn');
        if (btn) {
            btn.disabled = false;
            btn.click();
        }
    },

    // Deposit to Property Vault
    depositToProperty(amount) {
        // TODO: Need to inspect property vault page for correct selectors
        const url = window.location.href;
        const onPage = url.includes('properties.php');

        if (!onPage) {
            window.location.href = 'https://www.torn.com/properties.php';
            return;
        }

        // Placeholder - need to find correct selectors
        console.log('🏦 Property vault deposit - selectors needed');
        this.showToast('Property vault support coming soon');
    },

    // Deposit to Company Vault
    depositToCompany(amount) {
        const url = window.location.href;
        const onPage = url.includes('companies.php') && url.includes('option=funds');
        const input = document.querySelector('input[aria-labelledby="deposit-label"][type="text"]');

        if (!input && !onPage) {
            window.location.href = 'https://www.torn.com/companies.php?step=your&type=1#/option=funds';
            return;
        }

        if (!input) return;

        this.setInputValue(input, amount);
        const container = input.closest('.funds-cont');
        const btn = container ? container.querySelector('.deposit.btn-wrap button') : null;

        if (btn) {
            btn.disabled = false;
            btn.click();
        }
    },

    // Set input value (React-compatible)
    setInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (setter) {
            setter.call(input, value);
        } else {
            input.value = value;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
    },

    // Scan trades for ghost trade detection
    async scanTrades() {
        if (!window.location.href.includes('trade.php')) return;

        const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search);
        const currentID = params.get('ID');

        // Check if current trade is ghost
        if (currentID) {
            const logs = document.querySelectorAll('ul.log .msg');
            const isGhost = Array.from(logs).some(msg => {
                const clone = msg.cloneNode(true);
                clone.querySelector('a')?.remove(); // Remove username
                return clone.innerText.toLowerCase().includes('ghost');
            });

            if (isGhost && !this.state.ghostID) {
                this.state.ghostID = currentID;
                await window.SidekickModules.Core.ChromeStorage.set('quickDeposit_ghostID', currentID);
                this.updateButtonText();
                this.showToast(`Ghost ID saved: ${currentID}`);
            }
        }

        // Check trade list
        if (!currentID && !this.state.ghostID) {
            document.querySelectorAll('ul.trade-list-container > li').forEach(li => {
                const clone = li.cloneNode(true);
                clone.querySelector('.user.name')?.remove();

                if (clone.innerText.toLowerCase().includes('ghost')) {
                    const match = li.querySelector('a.btn-wrap')?.href.match(/ID=(\d+)/);
                    if (match) {
                        this.state.ghostID = match[1];
                        await window.SidekickModules.Core.ChromeStorage.set('quickDeposit_ghostID', match[1]);
                        this.updateButtonText();
                        this.showToast(`Ghost ID saved: ${match[1]}`);
                    }
                }
            });
        }
    },

    // Clear ghost ID
    async clearGhostID() {
        this.state.ghostID = null;
        await window.SidekickModules.Core.ChromeStorage.remove('quickDeposit_ghostID');
        this.updateButtonText();
        this.showToast('Ghost ID cleared');
    },

    // Update settings
    async updateSettings(newSettings) {
        if (newSettings.target) {
            this.settings.target = newSettings.target;
            await window.SidekickModules.Core.ChromeStorage.set('quickDeposit_target', newSettings.target);
        }
        this.updateButtonText();
    },

    // Show toast notification
    showToast(message) {
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="font-size:11px;color:#aaa;margin-bottom:4px;text-transform:uppercase;">Quick Deposit</div>
            ${message}
        `;

        Object.assign(toast.style, {
            position: 'fixed',
            top: '15%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '2147483647',
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.3s',
            textAlign: 'center',
            border: '1px solid #ffffff33'
        });

        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.style.opacity = '1');

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    // Start mutation observer
    startObserver() {
        if (this.state.observer) return;

        this.state.observer = new MutationObserver(() => {
            if (this.state.isEnabled) {
                this.injectButton();

                // Scan trades if on trade page
                if (window.location.href.includes('trade.php')) {
                    this.scanTrades();
                }
            }
        });

        this.state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
};

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.QuickDeposit = QuickDepositModule;

// Auto-initialize when module loads
(async () => {
    await QuickDepositModule.init();
})();

console.log('🏦 Quick Deposit module registered');
