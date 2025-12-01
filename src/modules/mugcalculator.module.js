/**
 * Mug Calculator Module
 * Calculates potential mug value from Item Market and Bazaar listings
 * 100% client-side - uses only Torn's official API, no third-party backends
 * Version: 2.0.0 - Fully Local Implementation
 */

const MugCalculatorModule = (() => {
    const CACHE_DURATION = 5000; // Cache player data for 5 seconds
    const dataCache = {};
    let currentPopups = [];
    const processedRows = new Set();
    let isEnabled = false;

    // Module API
    return {
        name: 'MugCalculator',
        
        async initialize() {
            console.log('[Sidekick] Initializing Mug Calculator Module...');
            
            // Check if Core module is available
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.warn('[Sidekick] Core module not available, Mug Calculator disabled');
                return;
            }
            
            // Check if module is enabled
            const storageKey = 'sidekick_mug_calculator';
            const settings = await window.SidekickModules.Core.ChromeStorage.get(storageKey) || {};
            isEnabled = settings.isEnabled !== false;
            
            if (!isEnabled) {
                console.log('[Sidekick] Mug Calculator is disabled');
                return;
            }

            this.addGlobalStyles();
            this.setupURLChangeListener();
            
            // Wait for page load and setup
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }

            console.log('[Sidekick] Mug Calculator Module initialized');
        },

        setup() {
            setTimeout(() => {
                this.waitForElements('.rowWrapper___me3Ox, .sellerRow___Ca2pK', () => {
                    this.processAllMarketRows();
                    this.observeMarketRows();
                });
                this.waitForElements('#fullListingsView, #topCheapestView', () => {
                    this.processAllBazaarRows();
                    this.observeBazaarRows();
                });
                setInterval(() => this.processAllMarketRows(), 2000);
            }, 1000);

            // Close popups when clicking outside
            document.addEventListener('click', (e) => {
                if (!currentPopups.some(popup => popup.contains(e.target))) {
                    this.closeAllPopups();
                }
            });
        },

        addGlobalStyles() {
            const css = `
            .infoIcon {
                margin-left: 5px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: #007bff;
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 12px;
                text-align: center;
                line-height: 16px;
                z-index: 1000 !important;
            }
            .infoPopup {
                position: absolute;
                color: black;
                border: 1px solid #ccc;
                padding: 10px;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                font-size: 12px;
                z-index: 2000;
                display: none;
                background-color: white;
            }
            .infoPopup.visible {
                display: block !important;
            }
            .popupCloseButton {
                position: absolute;
                top: 5px;
                right: 5px;
                background: #d9534f;
                color: white;
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 14px;
                line-height: 20px;
                text-align: center;
                cursor: pointer;
            }
            .popupCloseButton:hover {
                background: #c9302c;
            }
            `;
            const styleElement = document.createElement('style');
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
        },

        waitForElements(selector, callback, maxAttempts = 10, interval = 500) {
            let attempts = 0;
            const check = () => {
                attempts++;
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    callback(elements);
                } else if (attempts < maxAttempts) {
                    setTimeout(check, interval);
                }
            };
            check();
        },

        extractUserId(href) {
            const match = href.match(/XID=(\d+)/);
            return match ? match[1] : null;
        },

        // Calculate mug amount based on merits and plunder percentage
        calculateMugAmount(totalMoney, mugMerits, plunderPercent) {
            // Base plunder percentage
            const basePlunder = plunderPercent / 100;
            
            // Each mug merit adds 25% to the plunder
            const meritBonus = 1 + (mugMerits * 0.25);
            
            // Final mug amount
            const mugAmount = Math.floor(totalMoney * basePlunder * meritBonus);
            
            return mugAmount;
        },

        // Determine background color based on status
        getStatusColor(status) {
            const statusLower = status.toLowerCase();
            if (statusLower.includes('hospital')) return '#ffcccc'; // Light red
            if (statusLower.includes('jail')) return '#ffe6cc'; // Light orange
            if (statusLower.includes('okay') || statusLower.includes('idle')) return '#ccffcc'; // Light green
            if (statusLower.includes('traveling') || statusLower.includes('abroad')) return '#cce6ff'; // Light blue
            return '#f0f0f0'; // Light gray default
        },

        // Format status text
        formatStatus(statusObj) {
            if (!statusObj) return 'Unknown';
            
            const { state, description, until } = statusObj;
            
            if (state === 'Okay' || state === 'Idle') {
                return 'Online';
            }
            
            if (state === 'Hospital') {
                const timeLeft = until ? Math.max(0, until - Date.now() / 1000) : 0;
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                if (hours > 0) {
                    return `Hospital (${hours}h ${minutes}m)`;
                } else if (minutes > 0) {
                    return `Hospital (${minutes}m)`;
                }
                return 'Hospital';
            }
            
            return description || state || 'Unknown';
        },

        createInfoPopup(playerData, mugAmount, newCostPerItem, totalMoney) {
            const popup = document.createElement("div");
            popup.className = "infoPopup";
            
            const status = this.formatStatus(playerData.status);
            const backgroundColor = this.getStatusColor(status);
            const mugPercentage = totalMoney > 0 ? (mugAmount / totalMoney * 100) : 0;
            
            popup.innerHTML = `
                <button class="popupCloseButton">×</button>
                <strong>Level:</strong> ${playerData.level || 'Unknown'}<br>
                <strong>Status:</strong> ${status}<br>
                <strong>Total Money:</strong> $${totalMoney.toLocaleString()}<br>
                <strong>Potential Mug:</strong> ~${mugPercentage.toFixed(2)}% ≈ $${mugAmount.toLocaleString()}<br>
                <strong>New Cost Per Item:</strong> $${newCostPerItem.toLocaleString()}
            `;
            popup.style.backgroundColor = backgroundColor;
            
            const closeButton = popup.querySelector(".popupCloseButton");
            closeButton.addEventListener("click", () => {
                popup.remove();
                const index = currentPopups.indexOf(popup);
                if (index > -1) {
                    currentPopups.splice(index, 1);
                }
            });
            return popup;
        },

        positionPopup(icon, popup) {
            const rect = icon.getBoundingClientRect();
            let top = rect.bottom + window.scrollY + 5;
            let left = rect.left + window.scrollX;

            popup.style.visibility = 'hidden';
            popup.style.display = 'block';
            const popupHeight = popup.offsetHeight;
            const popupWidth = popup.offsetWidth;
            popup.style.display = '';
            popup.style.visibility = '';

            if (rect.bottom + popupHeight + 5 > window.innerHeight) {
                top = rect.top + window.scrollY - popupHeight - 5;
            }
            if (left + popupWidth > window.innerWidth) {
                left = window.innerWidth - popupWidth - 5;
            }
            popup.style.top = `${top}px`;
            popup.style.left = `${left}px`;
        },

        closeAllPopups() {
            currentPopups.forEach(popup => popup.remove());
            currentPopups = [];
        },

        // Fetch player data from Torn API (client-side, no third-party backend)
        async fetchPlayerData(playerId) {
            // Get API key from Chrome storage
            const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            if (!apiKey) {
                console.error('[Sidekick] Mug Calculator: No API key found');
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show('Mug Calculator', 'Please set your API key in settings', 'error', 3000);
                }
                return null;
            }

            // Check cache first
            const cacheKey = `player_${playerId}`;
            const now = Date.now();
            
            if (dataCache[cacheKey] && (now - dataCache[cacheKey].timestamp < CACHE_DURATION)) {
                console.log('[Sidekick] Mug Calculator: Using cached data for player', playerId);
                return dataCache[cacheKey].data;
            }

            try {
                console.log('[Sidekick] Mug Calculator: Fetching player data from Torn API...', playerId);
                
                // Use background script to fetch from Torn API (avoids CORS)
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'fetchTornApi',
                        apiKey: apiKey,
                        selections: ['profile'],
                        userId: playerId
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });

                console.log('[Sidekick] Mug Calculator: Torn API response:', response);

                if (!response.success) {
                    throw new Error(response.error || 'Failed to fetch player data');
                }

                // Extract relevant data from Torn API response
                const playerData = {
                    level: response.level,
                    status: response.status,
                    name: response.name,
                    player_id: response.player_id
                };
                
                // Cache the result
                dataCache[cacheKey] = { data: playerData, timestamp: now };
                
                return playerData;
                
            } catch (error) {
                console.error("[Sidekick] Mug Calculator: Error fetching player data:", error);
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show('Mug Calculator', `Failed to fetch data: ${error.message}`, 'error', 3000);
                }
                return null;
            }
        },

        async handleMugIconClick(totalMoney, quantity, threshold, sellerLink, icon) {
            try {
                // Get settings from Chrome storage
                const mugMerits = parseInt(await window.SidekickModules.Core.ChromeStorage.get('mugMerits') || 0, 10);
                const plunderPercent = parseFloat(await window.SidekickModules.Core.ChromeStorage.get('mugPlunder') || 0);
                
                console.log('[Sidekick] Mug Calculator: Settings loaded:', { mugMerits, plunderPercent, threshold });
                
                const playerId = this.extractUserId(sellerLink.href);
                if (!playerId) {
                    console.error('[Sidekick] Mug Calculator: Could not extract player ID from link');
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show('Mug Calculator', 'Could not find player ID', 'error', 3000);
                    }
                    return;
                }
                
                console.log('[Sidekick] Mug Calculator: Fetching data for player:', playerId);
                
                // Fetch player data from Torn API
                const playerData = await this.fetchPlayerData(playerId);
                
                if (playerData) {
                    // Calculate mug amount client-side
                    const mugAmount = this.calculateMugAmount(totalMoney, mugMerits, plunderPercent);
                    const newCostPerItem = Math.floor((totalMoney - mugAmount) / quantity);
                    
                    // Create and display popup
                    const popup = this.createInfoPopup(playerData, mugAmount, newCostPerItem, totalMoney);
                    document.body.appendChild(popup);
                    this.positionPopup(icon, popup);
                    popup.classList.add("visible");
                    currentPopups.push(popup);
                    console.log('[Sidekick] Mug Calculator: Popup displayed successfully');
                } else {
                    console.error('[Sidekick] Mug Calculator: No data returned from fetchUserData');
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show('Mug Calculator', 'Failed to fetch user data', 'error', 3000);
                    }
                }
            } catch (error) {
                console.error('[Sidekick] Mug Calculator: Error in handleMugIconClick:', error);
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show('Mug Calculator', `Error: ${error.message}`, 'error', 3000);
                }
            }
        },

        async attachInfoIconForMarketRow(row) {
            if (processedRows.has(row) && row.querySelector(".infoIcon")) return;
            if (processedRows.has(row) && !row.querySelector(".infoIcon")) {
                processedRows.delete(row);
            }
            
            const honorElem = row.querySelector('.honorWrap___BHau4 a.linkWrap___ZS6r9');
            const priceElement = row.querySelector(".price___Uwiv2") || row.querySelector(".price___v8rRx");
            if (!honorElem || !priceElement) return;
            
            const price = parseInt(priceElement.textContent.replace("$", "").replace(/,/g, ""), 10);
            const availableText = row.querySelector(".available___xegv_")?.textContent.replace(/ available|,/g, "") ||
                                  row.querySelector(".available___jtANf")?.textContent.replace(/ available|,/g, "") || "0";
            const available = parseInt(availableText, 10);
            const totalMoney = price * available;
            
            const threshold = parseInt(await window.SidekickModules.Core.ChromeStorage.get('mugThreshold') || 0, 10);
            
            if (totalMoney < threshold) return;
            if (row.querySelector(".infoIcon")) {
                processedRows.add(row);
                return;
            }
            
            const infoIcon = document.createElement("div");
            infoIcon.className = "infoIcon";
            infoIcon.textContent = "i";
            priceElement.parentNode.insertBefore(infoIcon, priceElement.nextSibling);
            
            infoIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                this.closeAllPopups();
                this.handleMugIconClick(totalMoney, available, threshold, honorElem, infoIcon);
            });
            
            processedRows.add(row);
        },

        async attachInfoIconForBazaarRow(row) {
            if (processedRows.has(row) && row.querySelector(".infoIcon")) return;
            if (processedRows.has(row) && !row.querySelector(".infoIcon")) {
                processedRows.delete(row);
            }
            
            const cells = row.querySelectorAll("td");
            if (cells.length < 4) return;
            
            const priceText = cells[0].innerText;
            const quantityText = cells[1].innerText;
            const price = parseInt(priceText.replace("$", "").replace(/,/g, ""), 10);
            const quantity = parseInt(quantityText.replace(/,/g, ""), 10);
            const totalMoney = price * quantity;
            
            const threshold = parseInt(await window.SidekickModules.Core.ChromeStorage.get('mugThreshold') || 0, 10);
            
            if (totalMoney < threshold) return;
            
            const sellerLink = cells[3].querySelector("a[href*='profiles.php?XID=']");
            if (!sellerLink) return;
            
            if (row.querySelector(".infoIcon")) {
                processedRows.add(row);
                return;
            }
            
            const infoIcon = document.createElement("div");
            infoIcon.className = "infoIcon";
            infoIcon.textContent = "i";
            cells[3].appendChild(infoIcon);
            
            infoIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                this.closeAllPopups();
                this.handleMugIconClick(totalMoney, quantity, threshold, sellerLink, infoIcon);
            });
            
            processedRows.add(row);
        },

        processAllMarketRows() {
            const allRows = document.querySelectorAll('.rowWrapper___me3Ox, .sellerRow___Ca2pK');
            allRows.forEach(row => this.attachInfoIconForMarketRow(row));
        },

        observeMarketRows() {
            const container = document.querySelector('.sellerListWrapper___PN32N');
            if (!container) return;
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.matches('.rowWrapper___me3Ox, .sellerRow___Ca2pK')) {
                                this.attachInfoIconForMarketRow(node);
                            } else {
                                const newRows = node.querySelectorAll?.('.rowWrapper___me3Ox, .sellerRow___Ca2pK');
                                newRows?.forEach(row => this.attachInfoIconForMarketRow(row));
                            }
                        }
                    });
                });
            });
            observer.observe(container, { childList: true, subtree: true });
        },

        processAllBazaarRows() {
            const bazaarRows = document.querySelectorAll('#fullListingsView table tbody tr, #topCheapestView table tbody tr');
            bazaarRows.forEach(row => this.attachInfoIconForBazaarRow(row));
        },

        observeBazaarRows() {
            const bazaarContainers = document.querySelectorAll('#fullListingsView, #topCheapestView');
            bazaarContainers.forEach(container => {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.matches("table tbody tr")) {
                                this.attachInfoIconForBazaarRow(node);
                            } else if (node.nodeType === 1) {
                                const newRows = node.querySelectorAll?.("table tbody tr");
                                newRows?.forEach(row => this.attachInfoIconForBazaarRow(row));
                            }
                        });
                    });
                });
                observer.observe(container, { childList: true, subtree: true });
            });
        },

        setupURLChangeListener() {
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(history, arguments);
                window.dispatchEvent(new Event('locationchange'));
            };
            
            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('locationchange'));
            });
            
            window.addEventListener('hashchange', () => {
                window.dispatchEvent(new Event('locationchange'));
            });
            
            window.addEventListener('locationchange', () => {
                processedRows.clear();
                this.processAllMarketRows();
            });
        },

        async destroy() {
            this.closeAllPopups();
            processedRows.clear();
            console.log('[Sidekick] Mug Calculator Module destroyed');
        }
    };
})();

// Register module
if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.MugCalculator = MugCalculatorModule;

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MugCalculatorModule;
}
