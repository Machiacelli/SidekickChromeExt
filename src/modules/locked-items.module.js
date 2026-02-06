// Locked Items Manager Module
// Lock inventory items to prevent accidental trading/selling
const LockedItemsManagerModule = {
    isEnabled: false,
    lockedItems: {},
    observer: null,
    STORAGE_KEY: 'locked-items',

    // Initialize module
    async init() {
        console.log('🔒 Locked Items Manager initializing...');

        await this.loadSettings();
        await this.loadLockedItems();

        if (this.isEnabled) {
            this.enable();
        }

        // Listen for storage changes from popup
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.sidekick_settings) {
                this.loadSettings();
            }
        });

        console.log('🔒 Locked Items Manager initialized');
    },

    // Load settings from Chrome storage
    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            if (data && data[this.STORAGE_KEY]) {
                const moduleSettings = data[this.STORAGE_KEY];
                this.isEnabled = moduleSettings.isEnabled || false;
                console.log('🔒 Settings loaded:', { isEnabled: this.isEnabled });
            }
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
            const items = await window.SidekickModules.Core.ChromeStorage.get('sidekick_locked_items') || {};

            // Clean up corrupted data - remove non-item properties
            const cleanedItems = {};
            for (const key in items) {
                // Skip properties that aren't item IDs
                if (key === 'isEnabled' || key === 'settings' || typeof items[key] !== 'boolean') {
                    console.warn(`🔒 Removing invalid property from locked items: ${key}`);
                    continue;
                }
                cleanedItems[key] = items[key];
            }

            this.lockedItems = cleanedItems;
            console.log('🔒 Loaded locked items:', Object.keys(this.lockedItems));

            // Save cleaned data if we removed anything
            if (Object.keys(items).length !== Object.keys(cleanedItems).length) {
                console.log('🔒 Cleaned corrupted storage, saving...');
                await this.saveLockedItems();
            }
        } catch (error) {
            console.error('🔒 Failed to load locked items:', error);
        }
    },

    // Save locked items
    async saveLockedItems() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_locked_items', this.lockedItems);
        } catch (error) {
            console.error('🔒 Failed to save locked items:', error);
        }
    },

    // Enable module
    enable() {
        console.log('🔒 Enabling Locked Items Manager');
        this.isEnabled = true;
        this.saveSettings();

        this.addStyles();
        this.processPage();
        this.startObserver();

        // Listen for hash changes (SPA navigation on bazaar/Item Market)
        window.addEventListener('hashchange', () => {
            console.log('🔒 Hash changed, reprocessing page');
            setTimeout(() => this.processPage(), 200);
        });

        console.log('🔒 Locked Items Manager enabled');
    },

    // Disable module
    disable() {
        console.log('🔒 Disabling Locked Items Manager');
        this.isEnabled = false;
        this.saveSettings();

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        console.log('🔒 Locked Items Manager disabled');
    },

    // Add styles
    addStyles() {
        if (document.getElementById('sidekick-locked-items-styles')) return;

        const style = document.createElement('style');
        style.id = 'sidekick-locked-items-styles';
        style.textContent = `
            /* Padlock icons */
            .sidekick-padlock {
                cursor: pointer;
                margin-right: 8px;
                font-size: 16px;
                opacity: 0.2;
                transition: opacity 0.2s;
                user-select: none;
            }
            .sidekick-padlock.is-locked {
                opacity: 1 !important;
            }
            .sidekick-padlock:hover {
                opacity: 0.8 !important;
            }

            /* Locked item styling */
            .sidekick-item-locked {
                opacity: 0.6;
            }

            /* Unlock all button */
            .sidekick-unlock-all-btn {
                padding: 8px 14px;
                background: #1a1a1a;
                color: #fff;
                border: 1px solid #cf4444;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                margin-top: 10px;
                transition: all 0.2s;
            }
            .sidekick-unlock-all-btn:hover {
                background: #cf4444;
                border-color: #fff;
                color: #fff;
            }

            /* Hide locked items on bazaar add, trade, market */
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

    // Get unique ID for item (matches original Greasemonkey script)
    getItemID(element) {
        // Priority 1: Base item ID from image (for stackable items like Blood Bags)
        // We want to lock by ITEM TYPE, not specific instance
        const img = element.querySelector('img[src*="/items/"]');
        if (img) {
            const src = img.getAttribute('src');
            const match = src.match(/\/items\/(\d+)\//);
            if (match) {
                const baseItemId = match[1];
                console.log(`🔒 getItemID: Found base item ID from image: ${baseItemId}`);
                return baseItemId;
            }
        }

        // Priority 2: Data attributes (fallback for items without images)
        const itemId = element.getAttribute('data-id') || element.getAttribute('data-item');
        if (itemId) {
            console.log(`🔒 getItemID: Using data attribute ID: ${itemId}`);
            return itemId;
        }

        // Priority 3: Armory IDs for weapons/armor (instance-specific)
        const armory = element.getAttribute('data-armoryid') || element.getAttribute('data-armory');
        if (armory) {
            console.log(`🔒 getItemID: Found armory ID: ${armory}`);
            return armory;
        }

        // Priority 4: Child armory IDs
        const armoryChild = element.querySelector('[data-armory], [data-armoryid]');
        if (armoryChild) {
            const childArmory = armoryChild.getAttribute('data-armory') || armoryChild.getAttribute('data-armoryid');
            if (childArmory) {
                console.log(`🔒 getItemID: Found child armory ID: ${childArmory}`);
                return childArmory;
            }
        }

        // Priority 5: Armory input
        const armoryInput = element.querySelector('input[name="armoryID"]');
        if (armoryInput?.value) {
            console.log(`🔒 getItemID: Found armory input ID: ${armoryInput.value}`);
            return armoryInput.value;
        }

        // Priority 6: ID input
        const idInput = element.querySelector('input[name="ID"]');
        if (idInput?.value) {
            console.log(`🔒 getItemID: Found ID input: ${idInput.value}`);
            return idInput.value;
        }

        console.warn('🔒 getItemID: No ID found for element:', element);
        return null;
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
                // Mark that we've processed this element
                if (el.hasAttribute('data-sidekick-processed')) return;
                el.setAttribute('data-sidekick-processed', 'true');

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
            window.SidekickModules?.UI?.showNotification('Item Unlocked', `${itemName} unlocked`, 'success');
        } else {
            this.lockedItems[itemId] = true;
            window.SidekickModules?.UI?.showNotification('Item Locked', `${itemName} locked`, 'info');
        }

        await this.saveLockedItems();
        this.processPage();
    },

    // Add unlock all button for current category
    addUnlockAllButton() {
        const sortButton = document.querySelector('[class*="sort"] button');
        if (!sortButton || sortButton.nextElementSibling?.classList.contains('sidekick-unlock-all-btn')) return;

        const unlockBtn = document.createElement('button');
        unlockBtn.className = 'sidekick-unlock-all-btn';
        unlockBtn.textContent = 'Unlock All (Category)';
        unlockBtn.onclick = async () => {
            if (!confirm('Unlock all items in this category?')) return;

            const items = document.querySelectorAll('li[data-id], li[data-item]');
            let unlockedCount = 0;

            items.forEach(el => {
                if (el.getAttribute('data-group') === 'parent') return;
                const itemId = this.getItemID(el);
                if (itemId && this.lockedItems[itemId]) {
                    delete this.lockedItems[itemId];
                    unlockedCount++;
                }
            });

            await this.saveLockedItems();
            this.processPage();

            if (unlockedCount > 0) {
                window.SidekickModules?.UI?.showNotification('Items Unlocked', `Unlocked ${unlockedCount} items`, 'success');
            } else {
                window.SidekickModules?.UI?.showNotification('No Locked Items', 'No locked items in this category', 'info');
            }
        };

        sortButton.parentNode.insertBefore(unlockBtn, sortButton.nextSibling);
    },

    // Process current page
    processPage() {
        if (!this.isEnabled) return;

        const url = window.location.href;
        console.log('🔒 Processing page:', url);

        if (url.includes('item.php')) {
            this.processInventoryPage();
        } else if (url.includes('bazaar.php')) {
            // Bazaar: only hide on add/manage pages, not browse
            const hash = window.location.hash;
            if (hash.includes('/add') || hash.includes('/manage') || url.includes('bazaar.php#/')) {
                console.log('🔒 Bazaar add/manage detected, will process in 100ms');
                setTimeout(() => this.processBazaarPage(), 100);
            }
        } else if (url.includes('page.php') && url.includes('sid=ItemMarket')) {
            // Item Market: only hide on add listing, not browse/search
            const hash = window.location.hash;
            if (hash.includes('/addListing')) {
                console.log('🔒 Item Market add listing detected, will process in 100ms');
                setTimeout(() => this.processBazaarPage(), 100);
            }
        }
    },

    // Process bazaar and Item Market add/manage pages
    processBazaarPage() {
        let items = [];

        // Priority 1: Bazaar-specific selectors
        items = document.querySelectorAll('li[data-group="child"]');

        // Priority 2: Item Market - find ALL item images and work up to their clickable parents
        if (items.length === 0) {
            // Find ALL item images on the page (Add Listing doesn't use li elements)
            const allImages = document.querySelectorAll('img.torn-item, img[src*="/items/"]');
            console.log(`🔒 Found ${allImages.length} item images on page`);

            const parentSet = new Set();

            allImages.forEach(img => {
                // Skip if it's in a dropdown or menu
                const dropdown = img.closest('[role="option"], .menu-item-link, [data-testid^="option-"]');
                if (dropdown) {
                    return;
                }

                // Find the full item container
                // For Add Listing: virtualListing container is ~5 levels up from image
                // For Bazaar: li element
                let parent = img.closest('[class*="virtualListing"], li');

                // If no virtualListing found yet, walk up 5 levels for Item Market structure
                if (!parent) {
                    const level5 = img.parentElement?.parentElement?.parentElement?.parentElement?.parentElement;
                    if (level5) {
                        parent = level5;
                    }
                }

                if (parent) {
                    parentSet.add(parent);
                }
            });

            items = Array.from(parentSet);
        }

        // Priority 3: Fallback selectors for manage page
        if (items.length === 0) {
            items = document.querySelectorAll('ul.items-cont > li, .items-list li');
        }

        console.log(`🔒 Bazaar: Found ${items.length} items, checking against locked:`, Object.keys(this.lockedItems));

        if (items.length === 0) return;

        let hiddenCount = 0;
        items.forEach(item => {
            const itemId = this.getItemID(item);

            if (itemId && this.lockedItems[itemId]) {
                item.classList.add('sidekick-hide-locked');
                item.style.display = 'none !important';
                hiddenCount++;
                console.log(`🔒 Hiding item ID: ${itemId}`);
            } else {
                item.classList.remove('sidekick-hide-locked');
                item.style.display = '';
            }
        });

        console.log(`🔒 Hidden ${hiddenCount}/${items.length} items on bazaar`);
    },

    // Hide locked items on trade/market pages
    hideLockedItems() {
        // This would hide locked items on trade, market, etc.
        // Implementation would be similar to bazaar
    },

    // Start observer
    startObserver() {
        if (this.observer) return;

        let debounceTimer = null;
        this.observer = new MutationObserver(() => {
            // Debounce to prevent infinite loops
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                requestAnimationFrame(() => this.processPage());
            }, 300);
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    }
};

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.LockedItems = LockedItemsManagerModule;

console.log('🔒 Locked Items Manager module registered');
