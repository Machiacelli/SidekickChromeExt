/**
 * Mug Calculator Module
 * Calculates potential mug value from Item Market and Bazaar listings
 * Based on the Torn Item Market Helper userscript
 */

const MugCalculatorModule = (() => {
    const BACKEND_BASE_URL = "https://torn.synclayer.dev";
    const CACHE_DURATION = 5000;
    const dataCache = {};
    let currentPopups = [];
    const processedRows = new Set();
    let isEnabled = false;
    let mugButton = null;
    let mugPanel = null;

    // Module API
    return {
        name: 'MugCalculator',
        
        async initialize() {
            console.log('[Sidekick] Initializing Mug Calculator Module...');
            
            // Check if module is enabled
            const settings = await ChromeStorage.getModuleSettings('mug-calculator');
            isEnabled = settings?.enabled ?? false;
            
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
                this.createMugButtonAndPanel();
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
            .mugButton {
                cursor: pointer;
                margin-right: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                z-index: 1500 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                position: relative;
            }
            .mugButton svg {
                width: 30px;
                height: 30px;
            }
            .mugPanel {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 300px;
                background: linear-gradient(to bottom right, #ffffff, #f7f7f7);
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                z-index: 3000;
                font-size: 14px;
                font-family: Arial, sans-serif;
                color: #333;
            }
            .mugPanel label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #222;
            }
            .mugPanel input {
                width: 100%;
                margin-bottom: 15px;
                padding: 6px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 13px;
            }
            .mugPanel .closeButton {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #d9534f;
                color: white;
                border: none;
                border-radius: 50%;
                width: 25px;
                height: 25px;
                cursor: pointer;
                font-size: 16px;
                line-height: 25px;
                text-align: center;
            }
            .mugPanel button.saveSettings {
                background: #28a745;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                font-weight: bold;
            }
            .mugPanel button.saveSettings:hover {
                background: #218838;
            }
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

        createMugButtonAndPanel() {
            if (document.querySelector('.mugButton')) return;

            mugButton = document.createElement('div');
            mugButton.className = 'mugButton';
            mugButton.innerHTML = `<svg fill="#ffffff" height="256px" width="256px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-51.2 -51.2 614.40 614.40" transform="matrix(-1, 0, 0, 1, 0, 0)">
                <g stroke="#ff0505" stroke-width="13.312">
                    <path d="M182.705,70.577c-1.157-7.628-8.271-12.872-15.91-11.717c-3.187,0.484-6.377,0.844-9.566,1.137l-3.845-33.66
                        c-0.32-2.804-2.805-4.849-5.618-4.625l-16.658,1.326c-4.652,0.37-9.326-0.326-13.668-2.036l-15.549-6.124
                        c-2.626-1.034-5.599,0.199-6.723,2.787L81.681,48.743c-2.966-1.209-5.913-2.485-8.82-3.875c-6.962-3.33-15.302-0.389-18.633,6.571
                        c-3.33,6.96-0.387,15.301,6.572,18.632c5.719,2.736,11.545,5.157,17.451,7.294c-0.463,1.6-0.836,3.245-1.09,4.937
                        c-3.109,20.68,11.135,39.963,31.815,43.071c20.68,3.109,39.963-11.135,43.071-31.815c0.264-1.751,0.392-3.49,0.413-5.212
                        c6.175-0.328,12.356-0.927,18.529-1.864C178.616,85.327,183.862,78.205,182.705,70.577z"/>
                    <path d="M293.065,163.552c-7.081-0.336-22.746-1.078-38.84-1.841v-8.307c0-2.279-1.847-4.126-4.127-4.126h-8.74
                        c-2.279,0-4.127,1.848-4.127,4.126c0,2.777,0,4.715,0,7.501c-0.061-0.002-0.122-0.006-0.184-0.009
                        c0.068-0.023-1.659-0.05-2.815,0.164c-8.75,1.382-14.32,10.182-11.813,18.777l-65.756,23.648l-39.853-38.6l29.359,16.761
                        l0.75-4.992c2.261-15.041-7.307-28.948-21.37-31.062l-33.314-5.663c-5.397-0.918-12.278-1.024-18.744,3.721L6.488,196.082
                        c-5.079,3.974-7.455,10.491-6.124,16.802l18.452,87.497c1.678,7.959,8.702,13.42,16.524,13.42c6.01,0,11.756-3.192,14.827-8.782
                        l9.589,77.436L33.05,469.738c-3.468,11.334,2.91,23.333,14.243,26.8c11.333,3.468,23.333-2.907,26.801-14.244l28.044-91.658
                        c0.882-2.884,1.147-5.921,0.777-8.916l-8.74-70.583l2.063,0.342l27.352,71.832l-4.97,91.54
                        c-0.642,11.835,8.432,21.951,20.267,22.593c11.716,0.666,21.946-8.344,22.593-20.265l5.217-96.088
                        c0.162-2.997-0.305-5.996-1.373-8.801c-25.131-65.865-34.333-89.652-34.333-89.652l4.297-28.584l-41.994-64.881l47.417,45.926
                        c4.665,4.52,11.455,5.932,17.482,3.765l84.144-30.263c6.118-2.201,10.177-7.566,11.017-13.586c2.235,2.491,5.89,3.169,8.883,1.542
                        c3.535-1.919,4.843-6.34,2.924-9.875l-3.049-5.613c2.083-0.099,4.132-0.196,6.134-0.29c10.621-0.504,19.843-0.941,24.817-1.177
                        c2.202-0.105,3.931-1.915,3.931-4.119v-7.815C296.996,165.469,295.264,163.657,293.065,163.552z M46.079,265.805l-10.458-49.587
                        l20.392-15.957L46.079,265.805z"/>
                </g>
            </svg>`;

            mugPanel = document.createElement('div');
            mugPanel.className = 'mugPanel';
            mugPanel.innerHTML = `
                <button class="closeButton">&times;</button>
                <label>Mug Merits (0-10):</label>
                <input type="number" id="mugMeritsInput" placeholder="0 to 10" min="0" max="10" />
                <label>Plunder % (20% to 49%):</label>
                <input type="number" id="plunderInput" placeholder="Plunder %" min="20" max="49" step="0.01" />
                <label>Minimum Threshold ($):</label>
                <input type="number" id="thresholdInput" placeholder="Minimum Threshold" min="0" />
                <button class="saveSettings">Save</button>
            `;

            mugPanel.querySelector('.closeButton').addEventListener('click', () => {
                mugPanel.style.display = 'none';
            });

            // Load saved settings
            ChromeStorage.get(['mugMerits', 'mugPlunder', 'mugThreshold']).then(data => {
                if (data.mugMerits) mugPanel.querySelector('#mugMeritsInput').value = data.mugMerits;
                if (data.mugPlunder) mugPanel.querySelector('#plunderInput').value = parseFloat(data.mugPlunder).toFixed(2);
                if (data.mugThreshold) mugPanel.querySelector('#thresholdInput').value = data.mugThreshold;
            });

            mugPanel.querySelector('.saveSettings').addEventListener('click', async () => {
                const mugMeritsVal = parseInt(mugPanel.querySelector('#mugMeritsInput').value.trim(), 10);
                let plunderInputVal = parseFloat(mugPanel.querySelector('#plunderInput').value.trim());
                const thresholdVal = parseInt(mugPanel.querySelector('#thresholdInput').value.trim(), 10);

                if (plunderInputVal === '' || parseFloat(plunderInputVal) === 0) {
                    plunderInputVal = 0;
                } else {
                    plunderInputVal = parseFloat(plunderInputVal);
                    if (plunderInputVal < 20 || plunderInputVal > 50) {
                        NotificationSystem.show("Plunder percentage must be between 20% and 49%", 'error');
                        return;
                    }
                }

                await ChromeStorage.set({
                    mugMerits: isNaN(mugMeritsVal) ? 0 : Math.min(Math.max(mugMeritsVal, 0), 10),
                    mugPlunder: plunderInputVal,
                    mugThreshold: isNaN(thresholdVal) ? 0 : thresholdVal
                });

                NotificationSystem.show("Mug Calculator settings saved!", 'success');
                mugPanel.style.display = 'none';
            });

            mugButton.addEventListener('click', () => {
                mugPanel.style.display = (mugPanel.style.display === 'none' || mugPanel.style.display === '') ? 'block' : 'none';
            });

            const appHeader = document.querySelector('.appHeaderWrapper___uyPti .linksContainer___LiOTN');
            if (appHeader) {
                appHeader.prepend(mugPanel);
                appHeader.prepend(mugButton);
            }
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

        createInfoPopup(data, newCostPerItem) {
            const popup = document.createElement("div");
            popup.className = "infoPopup";
            popup.innerHTML = `
                <button class="popupCloseButton">×</button>
                <strong>Level:</strong> ${data.level}<br>
                <strong>Status:</strong> ${data.status}<br>
                <strong>Hospital:</strong> ${data.hospital_time}<br>
                <strong>Total Money:</strong> $${data.total_money.toLocaleString()}<br>
                ${data.clothing_note ? `<strong>${data.clothing_note}</strong><br>` : ""}
                <strong>Potential Mug:</strong> ~${data.mug_percentage.toFixed(2)}% ≈ $${data.potential_mug.toLocaleString()}<br>
                <strong>New Cost Per Item:</strong> $${newCostPerItem.toLocaleString()}
            `;
            popup.style.backgroundColor = data.background_color;
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

        async fetchUserData(playerId, mugMerits, plunderPercent, totalMoney, threshold, available) {
            const apiKey = await ChromeStorage.get('tornApiKey');
            if (!apiKey.tornApiKey) {
                NotificationSystem.show("Please set your API key in settings", 'error');
                return null;
            }

            const requestData = {
                api_key: apiKey.tornApiKey,
                player_id: playerId,
                mug_merits: mugMerits,
                plunder_percent: plunderPercent,
                total_money: totalMoney,
                threshold: threshold,
                available: available,
            };
            
            const cacheKey = `${apiKey.tornApiKey}_${playerId}_${mugMerits}_${plunderPercent}_${totalMoney}_${threshold}_${available}`;
            const now = Date.now();
            
            if (dataCache[cacheKey] && (now - dataCache[cacheKey].timestamp < CACHE_DURATION)) {
                return dataCache[cacheKey].data;
            }

            try {
                const response = await fetch(`${BACKEND_BASE_URL}/api/torn-data`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestData)
                });

                if (response.ok) {
                    const data = await response.json();
                    dataCache[cacheKey] = { data: data, timestamp: now };
                    return data;
                } else {
                    throw new Error(`Backend error: ${response.status}`);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                return null;
            }
        },

        async handleMugIconClick(totalMoney, quantity, threshold, sellerLink, icon) {
            const settings = await ChromeStorage.get(['mugMerits', 'mugPlunder']);
            const mugMerits = parseInt(settings.mugMerits || 0, 10);
            const plunderPercent = parseFloat(settings.mugPlunder || 0);
            
            const playerId = this.extractUserId(sellerLink.href);
            const data = await this.fetchUserData(playerId, mugMerits, plunderPercent, totalMoney, threshold, quantity);
            
            if (data) {
                const newCostPerItem = Math.floor((totalMoney - data.potential_mug) / quantity);
                const popup = this.createInfoPopup(data, newCostPerItem);
                document.body.appendChild(popup);
                this.positionPopup(icon, popup);
                popup.classList.add("visible");
                currentPopups.push(popup);
            } else {
                NotificationSystem.show("Failed to fetch user data", 'error');
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
            
            const settings = await ChromeStorage.get('mugThreshold');
            const threshold = parseInt(settings.mugThreshold || 0, 10);
            
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
            
            const settings = await ChromeStorage.get('mugThreshold');
            const threshold = parseInt(settings.mugThreshold || 0, 10);
            
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
            if (mugButton) mugButton.remove();
            if (mugPanel) mugPanel.remove();
            this.closeAllPopups();
            processedRows.clear();
            console.log('[Sidekick] Mug Calculator Module destroyed');
        }
    };
})();

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MugCalculatorModule;
}
