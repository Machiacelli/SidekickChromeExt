/**
 * Weapon Experience Tracker Module
 * Displays weapon experience percentages on the Items page
 * Adapted from xedx's Weapon Experience Tracker userscript
 */

const WeaponExpModule = (() => {
    // Module state
    let isEnabled = false;
    let weArray = null;
    let pageName = '';
    let pageDiv = null;
    let pageObserver = null;
    let observing = false;

    // Selectors
    const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
    const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
    const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };

    // Module API
    return {
        name: 'WeaponExpTracker',

        async initialize() {
            console.log('[Sidekick] Initializing Weapon Experience Tracker...');

            // Check if Core module is available
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.warn('[Sidekick] Core module not available, Weapon XP Tracker disabled');
                return;
            }

            // Check if module is enabled
            const enabled = await window.SidekickModules.Core.ChromeStorage.get('weapon-xp-tracker');
            isEnabled = enabled !== false;

            if (!isEnabled) {
                console.log('[Sidekick] Weapon XP Tracker is disabled');
                return;
            }

            // Only run on item.php pages
            if (!window.location.href.includes('item.php')) {
                return;
            }

            // Check for API key
            const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            if (!apiKey) {
                console.warn('[Sidekick] No API key found, Weapon XP Tracker disabled');
                return;
            }

            // Wait for full page load
            if (document.readyState === 'complete') {
                this.handlePageLoad();
            } else {
                window.addEventListener('load', () => this.handlePageLoad());
            }

            console.log('[Sidekick] Weapon Experience Tracker initialized');
        },

        async handlePageLoad() {
            console.log('[Sidekick] Weapon XP: Page loaded, fetching weapon experience data...');

            // Fetch weapon experience data from API
            const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            if (!apiKey) return;

            try {
                const response = await fetch(`https://api.torn.com/user/?selections=weaponexp&key=${apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.error('[Sidekick] Weapon XP API Error:', data.error);
                    return;
                }

                weArray = data.weaponexp;
                console.log('[Sidekick] Weapon XP: Data loaded, found', weArray?.length || 0, 'weapons');
                this.modifyPage(weArray);
            } catch (error) {
                console.error('[Sidekick] Weapon XP: Failed to fetch data:', error);
            }
        },

        modifyPage(array, pageChange = false) {
            // Setup observer if not already done
            if (pageObserver == null) {
                pageDiv = document.querySelector(pageDivSelector);
                if (!pageDiv) return;

                const callback = (mutationsList, observer) => {
                    console.log('[Sidekick] Weapon XP: Page change detected');
                    this.modifyPage(weArray, true);
                };
                pageObserver = new MutationObserver(callback);
            }

            let lastPage = pageName;
            pageName = this.getPageName();

            if (!pageName) {
                this.observeOn();
                return;
            }

            console.log('[Sidekick] Weapon XP: modifyPage - pageName:', pageName, 'pageChange:', pageChange);

            if (array == null) {
                array = weArray;
            }

            let itemUL = null;

            // Find the appropriate weapon category list
            if (pageName === 'Primary') {
                itemUL = document.getElementById('primary-items');
            } else if (pageName === 'Secondary') {
                itemUL = document.getElementById('secondary-items');
            } else if (pageName === 'Melee') {
                itemUL = document.getElementById('melee-items');
            } else if (pageName === 'Temporary') {
                itemUL = document.getElementById('temporary-items');
            } else {
                this.observeOn();
                return; // Not on a weapons page
            }

            if (!itemUL) {
                this.observeOn();
                return;
            }

            const items = itemUL.getElementsByTagName('li');
            const itemLen = items.length;

            console.log('[Sidekick] Weapon XP:', pageName, 'items found:', itemLen);

            if (itemLen <= 1) {
                // Not fully loaded, try again
                setTimeout(() => this.modifyPage(null, true), 500);
                return;
            }

            this.observeOff(); // Don't call ourselves while editing

            // Process each weapon item
            for (let i = 0; i < items.length; i++) {
                const itemLi = items[i];
                const itemID = itemLi.getAttribute('data-item');
                if (!itemID) continue;

                const category = itemLi.getAttribute('data-category');
                if (!category) continue;

                const nameSel = itemLi.querySelector('div.title-wrap > div > span.name-wrap > span.name');
                if (!nameSel) continue;

                const name = nameSel.innerHTML;
                const item = this.getItemByItemID(array, Number(itemID));
                let WE = 0;

                if (item) {
                    WE = item.exp;
                    console.log('[Sidekick] Weapon XP:', name, '-', WE + '%');
                }

                const bonusUL = itemLi.querySelector('div.cont-wrap > div.bonuses.left > ul');
                if (!bonusUL) continue;

                // Remove old WE display if exists
                const oldWeSel = bonusUL.querySelector('li.left.we');
                if (oldWeSel) oldWeSel.remove();

                // Remove Item Market tooltip to prevent duplication
                const ttPriceSel = bonusUL.querySelector('li.bonus.left.tt-item-price');
                if (ttPriceSel) ttPriceSel.remove();

                // Add new WE display
                bonusUL.prepend(this.buildExpLi(WE));
            }

            this.observeOn();
        },

        // Get item by ID from weapon experience array
        getItemByItemID(data, itemID) {
            if (!data) return null;
            return data.find(item => item.itemID == itemID);
        },

        // Build an <li> element to display the WE percentage
        buildExpLi(WE) {
            const newLi = document.createElement('li');
            newLi.className = 'left we';
            newLi.style.cssText = 'background: linear-gradient(135deg, #66BB6A, #ffad5a); padding: 2px 6px; border-radius: 3px; color: white; font-weight: bold;';
            const weSpan = document.createElement('span');
            weSpan.innerHTML = WE + '%';
            newLi.appendChild(weSpan);
            return newLi;
        },

        // Get the current page name
        getPageName() {
            const pageSpan = document.querySelector(pageSpanSelector);
            if (!pageSpan) return '';
            const name = pageSpan.innerText;
            return name;
        },

        // Observer helpers
        observeOff() {
            if (observing && pageObserver) {
                pageObserver.disconnect();
                observing = false;
            }
        },

        observeOn() {
            if (pageObserver && pageDiv) {
                pageObserver.observe(pageDiv, observerConfig);
                observing = true;
            }
        },

        async destroy() {
            this.observeOff();
            weArray = null;
            pageName = '';
            pageDiv = null;
            pageObserver = null;
            console.log('[Sidekick] Weapon Experience Tracker destroyed');
        }
    };
})();

// Register module
if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.WeaponExpTracker = WeaponExpModule;

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeaponExpModule;
}
