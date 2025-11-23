/**
 * Sidekick Chrome Extension - Inventory Sorter Module
 * Allows sorting inventory by market value in ascending/descending order
 * Version: 1.0.0
 * Author: Machiacelli
 * Based on: Inventory Sorter userscript by Machiacelli
 */

(function() {
    'use strict';

    console.log("📦 Loading Sidekick Inventory Sorter Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Inventory Sorter Module Implementation
    const InventorySorterModule = {
        isInitialized: false,
        tabs: {},
        itemValues: {},
        sortState: 'default',
        posBeforeScroll: null,
        currentTab: null,
        currentTabIndex: null,
        itemObserver: null,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("📦 Inventory Sorter Module already initialized");
                return;
            }

            console.log("📦 Initializing Inventory Sorter Module...");

            try {
                await waitForCore();
                
                // Only initialize on inventory page
                if (!window.location.href.includes('/item.php')) {
                    console.log("📦 Not on inventory page, skipping initialization");
                    return;
                }

                await this.loadApiKey();
                await this.fetchItemValues();
                this.setupUI();
                this.setupObservers();
                this.setupEventListeners();
                
                this.isInitialized = true;
                console.log("✅ Inventory Sorter Module initialized successfully");
            } catch (error) {
                console.error("❌ Inventory Sorter Module initialization failed:", error);
            }
        },

        // Load API key from storage
        async loadApiKey() {
            try {
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                this.apiKey = apiKey || null;
                console.log('📦 API key loaded:', !!this.apiKey);
            } catch (error) {
                console.error('Failed to load API key:', error);
                this.apiKey = null;
            }
        },

        // Fetch item values from Torn API
        async fetchItemValues() {
            if (!this.apiKey) {
                console.warn('📦 No API key available, inventory sorter will be limited');
                return;
            }

            try {
                // Check if extension context is valid first
                if (!window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid()) {
                    console.warn('📦 Extension context invalidated, cannot fetch item values');
                    return;
                }

                const response = await window.SidekickModules.Core.SafeMessageSender.sendToBackground({
                    action: 'fetchTornApi',
                    apiKey: this.apiKey,
                    selections: ['items'],
                    endpoint: 'torn'
                });

                if (!response.success) {
                    console.error("❌ Inventory Sorter API Error:", response.error);
                    return;
                }

                const items = response.items;
                for (const [id, item] of Object.entries(items)) {
                    this.itemValues[id] = { name: item.name, value: item.market_value };
                }

                console.log(`✅ Loaded ${Object.keys(this.itemValues).length} item values`);
            } catch (error) {
                console.error("❌ Failed to fetch item values:", error);
            }
        },

        // Setup UI elements
        setupUI() {
            const titleEl = document.querySelector('.title-black');
            if (!titleEl) return;

            // Add styles
            this.addStyles();

            // Create sort button container
            const container = document.createElement('span');
            container.classList.add('is-container', 'right');

            const btn = document.createElement('button');
            btn.classList.add('is-btn', 'torn-btn', 'dark-mode');
            btn.textContent = 'SORT';
            btn.title = 'Click to sort inventory by value (Descending → Ascending → Default)';

            container.appendChild(btn);
            titleEl.appendChild(container);

            this.sortButton = btn;
        },

        // Add CSS styles
        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .is-container {
                    height: 100%;
                    margin-right: 2px;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .is-btn {
                    height: 22px !important;
                    padding: 0 8px !important;
                    line-height: 0 !important;
                    font-size: 11px !important;
                    font-weight: bold !important;
                }

                .is-item-value {
                    width: 100% !important;
                    padding: 4px 10px !important;
                    font-size: 11px !important;
                    display: block !important;
                }

                .is-item-value-color {
                    color: var(--default-green-color) !important;
                    font-weight: 600 !important;
                }

                .is-item-qty {
                    color: rgba(255,255,255,0.7) !important;
                }

                li:has(.group-arrow) .is-item-value {
                    width: auto !important;
                    padding: 0 30px 0 10px !important;
                }
            `;
            document.head.appendChild(style);
        },

        // Setup mutation observers
        setupObservers() {
            this.currentTab = this.getCurrentTabElement();
            this.currentTabIndex = this.getCurrentTabIndex();
            this.recordTab();

            this.itemObserver = new MutationObserver((mutationList) => {
                mutationList.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        this.recordTab();
                    }
                });
            });

            const tabContent = this.getCurrentTabContent();
            if (tabContent) {
                this.itemObserver.observe(tabContent, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                });
            }
        },

        // Setup event listeners
        setupEventListeners() {
            const titleEl = document.querySelector('.title-black');
            
            // Sort button click
            if (this.sortButton) {
                this.sortButton.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.handleSort();
                });
            }

            // Title click for loading all items
            titleEl?.addEventListener('click', async (e) => {
                if (e.target !== titleEl) return;
                
                if (!this.apiKey) {
                    this.showNotification('Please set your API key in the extension settings to use Inventory Sorter', 'warning');
                    return;
                }

                if (!this.posBeforeScroll && !this.tabs[this.currentTabIndex]?.isFullyLoaded) {
                    this.posBeforeScroll = window.scrollY;
                    await this.loadTabItems();
                }

                if (this.tabs[this.currentTabIndex]?.isFullyLoaded) {
                    await this.sortTab();
                }
            });

            // Category tab clicks
            const categoryElements = document.querySelectorAll('#categoriesList')[0]?.children;
            if (categoryElements) {
                Array.from(categoryElements).forEach((el) => {
                    if (el.classList.contains('no-items')) return;

                    el.addEventListener('click', () => {
                        this.posBeforeScroll = null;
                        this.currentTab = this.getCurrentTabElement();
                        this.currentTabIndex = this.getCurrentTabIndex();
                        this.sortState = 'default';

                        this.itemObserver?.disconnect();
                        const tabContent = this.getCurrentTabContent();
                        if (tabContent) {
                            this.itemObserver.observe(tabContent, {
                                attributes: true,
                                childList: true,
                                subtree: true,
                            });
                        }

                        this.recordTab();
                    });
                });
            }
        },

        // Handle sort button click
        async handleSort() {
            if (!this.apiKey) {
                this.showNotification('Please set your API key in the extension settings', 'warning');
                return;
            }

            if (!this.posBeforeScroll && !this.tabs[this.currentTabIndex]?.isFullyLoaded) {
                this.posBeforeScroll = window.scrollY;
                await this.loadTabItems();
            }

            if (this.tabs[this.currentTabIndex]?.isFullyLoaded) {
                await this.sortTab();
            }
        },

        // Record current tab state
        recordTab() {
            if (this.tabs[this.currentTabIndex]?.isFullyLoaded) return;

            const tabContent = this.getCurrentTabContent();
            if (!tabContent) return;

            if (this.tabs[this.currentTabIndex]) {
                this.tabs[this.currentTabIndex].defaultOrder = [...tabContent.children];
                if (Object.keys(this.itemValues).length) {
                    this.appendItemValues(this.tabs[this.currentTabIndex].defaultOrder);
                }
                return;
            }

            const newTab = {
                [this.currentTabIndex]: {
                    isFullyLoaded: false,
                    defaultOrder: [...tabContent.children],
                },
            };

            if (Object.keys(this.itemValues).length) {
                this.appendItemValues(newTab[this.currentTabIndex].defaultOrder);
            }

            this.tabs = { ...this.tabs, ...newTab };
        },

        // Append item values to inventory items
        appendItemValues(defaultElements) {
            Array.from(defaultElements).forEach((el) => {
                const itemId = el.getAttribute('data-item');
                if (!itemId) return;

                // Check if value is already appended by ANY extension to prevent duplication
                // Check for our class, TornTools classes, or any element containing price/value text
                const existingValue = el.querySelector('.is-item-value') || 
                                     el.querySelector('[class*="price"]') || 
                                     el.querySelector('[class*="value"]') ||
                                     el.querySelector('[class*="market"]');
                
                // Also check if there's already text content that looks like a price
                const nameWrap = el.querySelector('.name-wrap');
                if (nameWrap && nameWrap.textContent.match(/\$[\d,]+/)) {
                    return; // Already has price displayed, skip
                }
                
                if (existingValue && existingValue.textContent.match(/\$[\d,]+/)) {
                    return; // Already has value appended, skip
                }
                const itemValue = this.itemValues[itemId]?.value;
                if (!itemValue) return;

                // Create value container that won't overlap with existing prices
                const valueContainer = document.createElement('div');
                valueContainer.classList.add('is-item-value');
                valueContainer.style.cssText = 'clear: both; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1);';
                
                const qtyEl = el.querySelector('.item-amount');
                const itemQty = qtyEl?.textContent?.trim() || '1';
                
                // Create value display
                const valueText = document.createElement('span');
                valueText.classList.add('is-item-value-color');
                
                if (itemQty === '' || itemQty === '1') {
                    // Single item
                    valueText.textContent = `Market Value: ${this.getUsdFormat(itemValue)}`;
                    valueContainer.appendChild(valueText);
                } else {
                    // Multiple items - show unit price and total
                    const unitPrice = document.createElement('span');
                    unitPrice.classList.add('is-item-value-color');
                    unitPrice.textContent = `${this.getUsdFormat(itemValue)} each`;
                    
                    const multiply = document.createElement('span');
                    multiply.classList.add('is-item-qty');
                    multiply.style.cssText = 'margin: 0 5px; opacity: 0.7;';
                    multiply.textContent = ' × ' + itemQty + ' = ';
                    
                    const totalPrice = document.createElement('span');
                    totalPrice.classList.add('is-item-value-color');
                    totalPrice.style.fontWeight = 'bold';
                    totalPrice.textContent = this.getUsdFormat(itemQty * itemValue);

                    valueContainer.appendChild(unitPrice);
                    valueContainer.appendChild(multiply);
                    valueContainer.appendChild(totalPrice);
                }
                
                // Append to the item - prefer bonuses-wrap for better positioning
                const bonusesEl = el.querySelector('.bonuses-wrap');
                if (bonusesEl) {
                    const listItem = document.createElement('li');
                    listItem.appendChild(valueContainer);
                    bonusesEl.appendChild(listItem);
                } else if (nameWrap) {
                    nameWrap.appendChild(valueContainer);
                }
            });
        },

        // Sort current tab
        async sortTab() {
            const defaultOrderCopy = [...this.tabs[this.currentTabIndex].defaultOrder];
            const tabItems = [];

            for (const item of defaultOrderCopy) {
                if (item.classList.contains('ajax-item-loader')) continue;

                const itemId = item.getAttribute('data-item');
                let itemQty = item.getAttribute('data-qty');

                if (itemQty === '' || !itemQty) {
                    itemQty = 1;
                }

                const itemValue = this.itemValues[itemId]?.value || 0;
                tabItems.push({ el: item, value: itemValue * itemQty });
            }

            const tabContent = this.getCurrentTabContent();
            if (!tabContent) return;

            if (this.sortState === 'default') {
                this.sortState = 'descending';
                tabItems.sort((a, b) => b.value - a.value);
                tabItems.forEach((item) => tabContent.appendChild(item.el));
                this.showNotification('Sorted: Highest to Lowest', 'success');
            } else if (this.sortState === 'descending') {
                this.sortState = 'ascending';
                tabItems.sort((a, b) => a.value - b.value);
                tabItems.forEach((item) => tabContent.appendChild(item.el));
                this.showNotification('Sorted: Lowest to Highest', 'success');
            } else if (this.sortState === 'ascending') {
                this.sortState = 'default';
                defaultOrderCopy.forEach((item) => {
                    if (!item.classList.contains('ajax-item-loader')) {
                        tabContent.appendChild(item);
                    }
                });
                this.showNotification('Sorted: Default Order', 'info');
            }
        },

        // Load all items in current tab
        async loadTabItems() {
            const loadMoreDesc = document.querySelector('#load-more-items-desc');
            if (!loadMoreDesc) return;

            const text = loadMoreDesc.textContent;

            if (text.toLowerCase().includes('full')) {
                window.scroll(0, this.posBeforeScroll);
                this.tabs[this.currentTabIndex].isFullyLoaded = true;
                this.showNotification('All items loaded!', 'success');
                return;
            }

            if (text.toLowerCase().includes('load more')) {
                const itemsWrap = document.querySelector('.items-wrap');
                itemsWrap?.lastElementChild?.scrollIntoView();
                await new Promise((resolve) => setTimeout(resolve, 500));
                return this.loadTabItems();
            }
        },

        // Get current active tab element
        getCurrentTabElement() {
            return document.querySelector('.ui-tabs-active');
        },

        // Get current tab content area
        getCurrentTabContent() {
            return document.querySelector('[aria-hidden="false"]');
        },

        // Get current tab index
        getCurrentTabIndex() {
            const currentTab = this.getCurrentTabElement();
            if (!currentTab) return 0;
            return Array.prototype.indexOf.call(currentTab.parentNode.children, currentTab);
        },

        // Format number as USD currency
        getUsdFormat(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
            }).format(amount);
        },

        // Show notification
        showNotification(message, type = 'info') {
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification('Inventory Sorter', message, type);
            } else {
                console.log(`📦 ${message}`);
            }
        },
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Inventory Sorter module to global namespace
    window.SidekickModules.InventorySorter = InventorySorterModule;
    console.log("✅ Inventory Sorter Module loaded and ready");

})();
