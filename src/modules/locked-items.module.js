// Locked Items Manager Module
// Prevents accidental trading, selling, or deleting of locked items
const LockedItemsModule = {
    isEnabled: false,
    lockedItems: {},
    mutationObserver: null,
    bazaarObserver: null,
    bazaarInterval: null,

    STORAGE_KEY: 'locked-items',

    // Initialize module
    async init() {
        console.log('🔒 Locked Items Manager initializing...');

        await this.loadSettings();
        await this.loadLockedItems();

        if (this.isEnabled) {
            this.enable();
        }

        console.log('🔒 Locked Items Manager initialized');
    },

    // Load settings from Chrome storage
    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            if (data && data[this.STORAGE_KEY]) {
                this.isEnabled = data[this.STORAGE_KEY].isEnabled || false;
            }
            console.log('🔒 Settings loaded:', { isEnabled: this.isEnabled });
        } catch (error) {
            console.error('🔒 Failed to load settings:', error);
        }
    },

    // Save settings to Chrome storage
    async saveSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
            data[this.STORAGE_KEY] = {
                isEnabled: this.isEnabled
            };
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', data);
        } catch (error) {
            console.error('🔒 Failed to save settings:', error);
        }
    },

    // Load locked items
    async loadLockedItems() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY);
            this.lockedItems = data || {};
            console.log('🔒 Loaded locked items:', Object.keys(this.lockedItems).length);
        } catch (error) {
            console.error('🔒 Failed to load locked items:', error);
        }
    },

    // Save locked items
    async saveLockedItems() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, this.lockedItems);
        } catch (error) {
            console.error('🔒 Failed to save locked items:', error);
        }
    },

    // Enable module
    enable() {
        console.log('🔒 Enabling Locked Items Manager');
        this.isEnabled = true;
        this.saveSettings();

        this.injectStyles();
        this.startObserver();
        this.processPage();

        console.log('🔒 Locked Items Manager enabled');
    },

    // Disable module
    disable() {
        console.log('🔒 Disabling Locked Items Manager');
        this.isEnabled = false;
        this.saveSettings();

        this.stopObserver();
        this.removeUI();

        console.log('🔒 Locked Items Manager disabled');
    },

    // Inject CSS styles
    injectStyles() {
        if (document.getElementById('sidekick-locked-items-styles')) return;

        const style = document.createElement('style');
        style.id = 'sidekick-locked-items-styles';
        style.textContent = `
            /* Padlock icons - always semi-transparent */
            .sidekick-padlock {
                cursor: pointer;
                margin-right: 8px;
                font-size: 14px;
                opacity: 0.3;
                transition: opacity 0.2s ease;
            }
            .sidekick-padlock.is-locked {
                opacity: 1;
            }
            .sidekick-padlock:hover {
                opacity: 0.8;
            }

            /* Disable actions for locked items */
            .sidekick-item-locked li.send,
            .sidekick-item-locked li.sell,
            .sidekick-item-locked li.donate,
            .sidekick-item-locked li.dump,
            .sidekick-item-locked li.return {
                opacity: 0.1 !important;
                pointer-events: none !important;
                filter: grayscale(1) brightness(0.5) !important;
            }

            /* Unlock/Lock All button - Torn themed */
            #sidekick-unlock-all-btn {
                padding: 6px 12px;
                background: #2a2a2a;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                margin-left: 8px;
                transition: all 0.2s ease;
            }
            #sidekick-unlock-all-btn:hover {
                background: #333;
                border-color: #666;
                color: #fff;
            }

            /* Hide locked items on bazaar add page, trade, market */
            .sidekick-hide-locked {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }

            /* Toast notifications */
            .sidekick-toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .sidekick-toast {
                padding: 12px 20px;
                background: #1a1a1a;
                color: #fff;
                border-left: 3px solid #4CAF50;
                border-radius: 3px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transform: translateX(150%);
                transition: transform 0.3s ease;
                font-size: 13px;
            }
            .sidekick-toast.show {
                transform: translateX(0);
            }
            .sidekick-toast.error {
                border-left-color: #f44336;
            }
        `;
        document.head.appendChild(style);
    },

    // Get unique ID for item
    getItemID(element) {
        // Priority 1: Armory IDs for weapons/armor
        const armory = element.getAttribute('data-armoryid') || element.getAttribute('data-armory');
        if (armory) return armory;

        // Priority 2: Child armory IDs
        const armoryChild = element.querySelector('[data-armory], [data-armoryid]');
        if (armoryChild) {
            const childArmory = armoryChild.getAttribute('data-armory') || armoryChild.getAttribute('data-armoryid');
            if (childArmory) return childArmory;
        }

        // Priority 3: Armory input
        const armoryInput = element.querySelector('input[name="armoryID"]');
        if (armoryInput?.value) return armoryInput.value;

        // Priority 4: Base item ID from image
        const img = element.querySelector('img[src*="/items/"]');
        if (img) {
            const src = img.getAttribute('src');
            const match = src.match(/\/items\/(\d+)\//);
            if (match) return match[1];
        }

        // Priority 5: Data attributes
        return element.getAttribute('data-id') || element.getAttribute('data-item');
    },

    // Show toast notification
    showToast(message, isError = false) {
        let container = document.querySelector('.sidekick-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'sidekick-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `sidekick-toast ${isError ? 'error' : ''}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Process inventory page
    processInventoryPage() {
        const items = document.querySelectorAll('li[data-id], li[data-item]');

        items.forEach(el => {
            // Skip parent groups
            if (el.getAttribute('data-group') === 'parent') return;

            const itemId = this.getItemID(el);
            if (!itemId) return;

            const isLocked = !!this.lockedItems[itemId];

            // Toggle locked class
            el.classList.toggle('sidekick-item-locked', isLocked);

            // Add or update padlock icon
            let padlock = el.querySelector('.sidekick-padlock');
            if (!padlock) {
                padlock = document.createElement('span');
                padlock.className = 'sidekick-padlock';
                padlock.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleLock(itemId, el);
                };

                const nameWrap = el.querySelector('.name-wrap');
                if (nameWrap) {
                    nameWrap.insertBefore(padlock, nameWrap.firstChild);
                }
            }

            padlock.textContent = isLocked ? '🔒' : '🔓';
            padlock.classList.toggle('is-locked', isLocked);
        });

        // Add unlock all button
        this.addUnlockAllButton();
    },

    // Toggle lock/unlock for an item
    async toggleLock(itemId, element) {
        const itemName = element.querySelector('.name')?.textContent || 'Item';

        if (this.lockedItems[itemId]) {
            delete this.lockedItems[itemId];
            this.showToast(`${itemName} Unlocked`);
        } else {
            this.lockedItems[itemId] = true;
            this.showToast(`${itemName} Locked`, true);
        }

        await this.saveLockedItems();
        this.processPage();
    },

    // Add unlock/lock all button next to sort button
    addUnlockAllButton() {
        if (!window.location.href.includes('item.php')) return;
        if (document.getElementById('sidekick-unlock-all-btn')) return;

        // Find the sort button
        const sortButton = document.querySelector('[class*="sort"] button, .item-sort-button, button[aria-label*="sort"]');
        if (!sortButton) return;

        const btn = document.createElement('button');
        btn.id = 'sidekick-unlock-all-btn';
        btn.textContent = `Unlock All (${Object.keys(this.lockedItems).length})`;
        btn.onclick = () => this.unlockAllInCategory();

        sortButton.parentElement.insertBefore(btn, sortButton.nextSibling);
    },

    // Unlock all items in current category
    async unlockAllInCategory() {
        const visibleItems = document.querySelectorAll('li[data-id]:not([style*="display: none"]), li[data-item]:not([style*="display: none"])');
        let unlockedCount = 0;

        for (const item of visibleItems) {
            const itemId = this.getItemID(item);
            if (itemId && this.lockedItems[itemId]) {
                delete this.lockedItems[itemId];
                unlockedCount++;
            }
        }

        if (unlockedCount > 0) {
            await this.saveLockedItems();
            this.showToast(`Unlocked ${unlockedCount} items in this category`);
            this.processPage();
        } else {
            this.showToast('No locked items in this category');
        }
    },

    // Process current page
    processPage() {
        if (!this.isEnabled) return;

        const url = window.location.href;

        if (url.includes('item.php')) {
            this.processInventoryPage();
        } else if (url.includes('bazaar.php') && url.includes('#/add')) {
            this.processBazaarPage();
        } else {
            this.hideLockedItems();
        }
    },

    // Process bazaar add page
    processBazaarPage() {
        const items = document.querySelectorAll('li[data-group="child"]');

        items.forEach(item => {
            const itemId = this.getItemID(item);
            if (itemId && this.lockedItems[itemId]) {
                item.classList.add('sidekick-hide-locked');
            } else {
                item.classList.remove('sidekick-hide-locked');
            }
        });
    },

    // Hide locked items on trade/market pages
    hideLockedItems() {
        // This would hide locked items on trade, market, etc.
        // Implementation would be similar to bazaar
    },

    // Start mutation observer
    startObserver() {
        if (this.mutationObserver) return;

        this.mutationObserver = new MutationObserver(() => {
            setTimeout(() => this.processPage(), 100);
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Stop mutation observer
    stopObserver() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    },

    // Remove all UI elements
    removeUI() {
        document.getElementById('sidekick-locked-items-styles')?.remove();
        document.getElementById('sidekick-unlock-all-btn')?.remove();
        document.querySelectorAll('.sidekick-padlock').forEach(el => el.remove());
        document.querySelectorAll('.sidekick-item-locked').forEach(el => {
            el.classList.remove('sidekick-item-locked');
        });
        document.querySelectorAll('.sidekick-hide-locked').forEach(el => {
            el.classList.remove('sidekick-hide-locked');
        });
    }
};

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.LockedItems = LockedItemsModule;

console.log('🔒 Locked Items Manager module registered');
