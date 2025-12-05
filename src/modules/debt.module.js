/**
 * Sidekick Chrome Extension - Debt Module
 * Handles loan and debt tracking with automated API integration
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("💰 Loading Sidekick Debt Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                console.log("🔍 Checking for Core module...");

                if (window.SidekickModules?.Core?.ChromeStorage) {
                    console.log("💰 Core module with ChromeStorage ready for Debt");
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Debt Module Implementation
    const DebtModule = {
        isInitialized: false,
        debtsAndLoans: [], // Combined array for all debt/loan entries
        alerts: [],
        alertCheckInterval: null,
        lastAlertCheck: Date.now(),
        processedPayments: new Set(), // Track processed payment IDs
        isDebtTrackerOpen: false,
        apiKey: null,
        apiCheckInterval: null,
        interestUpdateInterval: null,

        // Interest calculation types
        interestTypes: {
            NONE: 'none',
            DAILY: 'daily',
            WEEKLY: 'weekly',
            FLAT: 'flat',
            APR: 'apr'
        },

        // Initialize the debt module
        async init() {
            if (this.isInitialized) {
                console.log("💰 Debt Module already initialized");
                return;
            }

            try {
                await waitForCore();

                console.log("💰 Debt Module: Starting initialization...");

                await this.loadDebtsAndLoans();
                await this.loadApiKey(); // This will start API monitoring if key is available
                this.startInterestUpdates();

                // Restore window state if it was open before
                this.restoreWindowState();

                this.isInitialized = true;
                console.log("💰 Debt Module initialized successfully");

            } catch (error) {
                console.error('Failed to initialize Debt Module:', error);
            }
        },

        // Load API key from settings
        async loadApiKey() {
            try {
                // Try multiple approaches to get the API key
                let attempts = 0;
                const maxAttempts = 10;

                while (attempts < maxAttempts && !this.apiKey) {
                    if (window.SidekickModules?.Settings?.getApiKey) {
                        try {
                            this.apiKey = await window.SidekickModules.Settings.getApiKey();
                        } catch (error) {
                            console.log(`💰 Attempt ${attempts + 1} failed:`, error.message);
                        }
                    }

                    if (!this.apiKey) {
                        attempts++;
                        if (attempts < maxAttempts) {
                            console.log(`💰 Waiting for Settings module... attempt ${attempts}/${maxAttempts}`);
                            await new Promise(resolve => setTimeout(resolve, 100)); // Changed from 1000ms to 100ms
                        }
                    }
                }

                if (this.apiKey) {
                    console.log("💰 API Key loaded: ✓");

                    // Start API monitoring now that we have the key
                    this.startApiMonitoring();
                } else {
                    console.log("💰 No API key found after all attempts");
                    console.log("💰 Manual testing: You can call window.SidekickModules.Debt.testPaymentDetection() to test patterns");

                    // Show user-friendly notification about missing API key
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification(
                            'Debt Tracker - API Key Required',
                            'Automatic payment detection requires an API key. Please add your API key in Settings (⚙️ button).',
                            'warning'
                        );
                    }
                }
            } catch (error) {
                console.error("💰 Error loading API key:", error);
            }
        },

        // Manual test function for debugging payment detection
        testPaymentDetection() {
            console.log("💰 === Testing Payment Detection Patterns ===");

            // Test with your specific log format
            const testLogs = [
                { log: "You were sent $14 from cybex with the message: Loan", timestamp: Math.floor(Date.now() / 1000) },
                { log: "You sent $100 to cybex with the message: loan payment", timestamp: Math.floor(Date.now() / 1000) }
            ];

            console.log("💰 Current debts/loans:", this.debtsAndLoans);

            testLogs.forEach((log, index) => {
                console.log(`💰 Testing log ${index + 1}: ${log.log}`);
                this.handleMoneyTransfer(log);
            });
        },

        // Test background script communication
        async testBackgroundConnection() {
            console.log("💰 === Testing Background Script Communication ===");

            if (!window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid()) {
                console.error('💰 Extension context not available');
                return false;
            }

            try {
                console.log('💰 Testing simple ping to background script...');

                const response = await window.SidekickModules.Core.SafeMessageSender.sendToBackground({ action: 'ping' });
                console.log('💰 Background script ping response:', response);

                if (this.apiKey) {
                    console.log('💰 Testing API call via background script...');
                    const apiResponse = await this.makeApiCallViaBackground(this.apiKey, ['logs']);
                    console.log('💰 API call response:', apiResponse);
                    return true;
                } else {
                    console.log('💰 No API key available for testing');
                    return false;
                }

            } catch (error) {
                if (error.message.includes('Extension context invalidated')) {
                    console.warn('💰 Extension context invalidated during test');
                    window.SidekickModules?.Core?.SafeMessageSender?.showExtensionReloadNotification();
                } else {
                    console.error('💰 Background script test failed:', error);
                }
                return false;
            }
        },

        // Search ALL logs for loan payments (no time restriction)
        searchAllLogsForPayments() {
            console.log("💰 === Searching ALL logs for loan payments ===");

            if (!this.apiKey) {
                console.log("💰 No API key available");
                return;
            }

            // Force a manual search of all logs
            this.makeApiCallViaBackground(this.apiKey, ['logs']).then(result => {
                if (result.success && result.logs) {
                    console.log(`💰 Searching ${Object.keys(result.logs).length} total logs...`);

                    const logsArray = Object.values(result.logs);
                    let moneyTransferLogs = 0;
                    let loanPayments = 0;

                    for (const log of logsArray) {
                        if (log.log && typeof log.log === 'string') {
                            // Check if this looks like a money transfer
                            if (log.log.includes('sent $') || log.log.includes('received $') || log.log.includes('were sent $')) {
                                moneyTransferLogs++;

                                // Check for loan keyword
                                if (log.log.toLowerCase().includes('loan')) {
                                    loanPayments++;
                                    const logDate = new Date(log.timestamp * 1000);
                                    console.log(`💰 LOAN PAYMENT FOUND (${logDate.toLocaleString()}): ${log.log}`);
                                    // Process this payment
                                    this.handleMoneyTransfer(log);
                                }
                            }
                        }
                    }

                    console.log(`💰 Search complete: ${moneyTransferLogs} money transfers, ${loanPayments} loan payments found`);
                } else {
                    console.log("💰 Failed to fetch logs for search");
                }
            }).catch(error => {
                console.error("💰 Error searching logs:", error);
            });
        },

        // Load debts and loans from storage
        async loadDebtsAndLoans() {
            try {
                console.log("💰 Loading debts and loans from storage...");

                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const debtData = await window.SidekickModules.Core.ChromeStorage.get('sidekick_debt_data');

                    if (debtData) {
                        this.debtsAndLoans = debtData.debtsAndLoans || [];
                        this.processedPayments = new Set(debtData.processedPayments || []);
                        console.log(`💰 Loaded ${this.debtsAndLoans.length} debt/loan entries and ${this.processedPayments.size} processed payments`);

                        // Debug: Show what debts/loans we have
                        if (this.debtsAndLoans.length > 0) {
                            console.log("💰 Current debts/loans:");
                            this.debtsAndLoans.forEach(entry => {
                                const type = entry.isDebt ? 'DEBT' : 'LOAN';
                                console.log(`💰   ${type}: ${entry.playerName} (ID: ${entry.playerId}) - $${entry.currentAmount.toLocaleString()}`);
                            });
                        }

                        // Fetch real names for entries that still show as Player [ID]
                        setTimeout(() => {
                            this.debtsAndLoans.forEach(entry => {
                                if (entry.playerName && entry.playerName.startsWith('Player [') && entry.playerId) {
                                    console.log(`💰 Fetching name for existing entry: ${entry.playerName}`);
                                    this.fetchPlayerName(entry.playerId, entry.id);
                                }
                            });
                        }, 2000);

                        // Don't auto-create panels - only show when tracker window is opened
                    } else {
                        console.log("💰 No existing debt data found");
                    }
                } else {
                    console.error("💰 ChromeStorage not available");
                }

            } catch (error) {
                console.error('Failed to load debts and loans:', error);
                this.debtsAndLoans = [];
            }
        },

        // Save debts and loans to storage
        async saveDebtsAndLoans() {
            try {
                const data = {
                    debtsAndLoans: this.debtsAndLoans,
                    processedPayments: Array.from(this.processedPayments),
                    lastSaved: Date.now()
                };

                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_debt_data', data);
                    console.log("💰 Debt data saved successfully");
                }
            } catch (error) {
                console.error('Failed to save debt data:', error);
            }
        },

        // Create new debt entry (someone owes you money)
        createDebt(playerId, playerName, amount, interestType = 'none', interestRate = 0, notes = '', dueDate = null) {
            const debt = {
                id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'debt',
                isDebt: true,
                playerId: playerId,
                playerName: playerName,
                originalAmount: parseFloat(amount),
                principal: parseFloat(amount),
                currentAmount: parseFloat(amount),
                interestType: interestType,
                interestRate: parseFloat(interestRate),
                createdAt: new Date().toISOString(),
                lastInterestUpdate: new Date().toISOString(),
                dueDate: dueDate,
                notes: notes,
                repayments: [],
                frozen: false,
                lastAction: null,
                lastActionFetched: null
            };

            this.debtsAndLoans.push(debt);
            this.saveDebtsAndLoans();
            this.populateDebtTrackerWindow();

            // Immediately trigger name fetch for better UX
            if (playerId && playerName.startsWith('Player [')) {
                console.log(`💰 Starting immediate name fetch for player ${playerId}`);
                this.fetchPlayerName(playerId, debt.id);
            }

            console.log(`💰 Created new debt: ${playerName} owes $${amount.toLocaleString()}`);
            return debt;
        },

        // Create new loan entry (you owe money to someone)
        createLoan(playerId, playerName, amount, interestType = 'none', interestRate = 0, notes = '', dueDate = null) {
            const loan = {
                id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'loan',
                isDebt: false,
                playerId: playerId,
                playerName: playerName,
                originalAmount: parseFloat(amount),
                principal: parseFloat(amount),
                currentAmount: parseFloat(amount),
                interestType: interestType,
                interestRate: parseFloat(interestRate),
                createdAt: new Date().toISOString(),
                lastInterestUpdate: new Date().toISOString(),
                dueDate: dueDate,
                notes: notes,
                repayments: [],
                frozen: false,
                lastAction: null,
                lastActionFetched: null
            };

            this.debtsAndLoans.push(loan);
            this.saveDebtsAndLoans();
            this.populateDebtTrackerWindow();

            // Immediately trigger name fetch for better UX
            if (playerId && playerName.startsWith('Player [')) {
                console.log(`💰 Starting immediate name fetch for player ${playerId}`);
                this.fetchPlayerName(playerId, loan.id);
            }

            console.log(`💰 Created new loan: You owe ${playerName} $${amount.toLocaleString()}`);
            return loan;
        },

        // Fetch real player name from Torn API
        async fetchPlayerName(playerId, entryId) {
            try {
                console.log(`💰 fetchPlayerName called for player ${playerId}, entry ${entryId}`);

                // Get API key using Settings module
                let apiKey;
                let attempts = 0;
                while (attempts < 20 && !apiKey) {
                    try {
                        if (window.SidekickModules?.Settings?.getApiKey) {
                            apiKey = await window.SidekickModules.Settings.getApiKey();
                        }
                    } catch (error) {
                        console.log(`💰 Waiting for Settings module... attempt ${attempts + 1}/20`);
                    }
                    if (!apiKey) {
                        await new Promise(resolve => setTimeout(resolve, 250));
                        attempts++;
                    }
                }

                if (!apiKey) {
                    console.log(`💰 No API key available after ${attempts} attempts for player ${playerId}`);
                    return;
                }

                console.log(`💰 API key ready, fetching name for player ID: ${playerId}`);
                const response = await fetch(`https://api.torn.com/user/${playerId}?selections=basic,profile&key=${apiKey}`);
                const data = await response.json();

                console.log(`💰 API response for player ${playerId}:`, data);

                if (data && data.error) {
                    console.error(`💰 API Error fetching player ${playerId}:`, data.error);
                    return;
                }

                if (data && data.name) {
                    // Find the entry and update the name
                    const entry = this.debtsAndLoans.find(e => e.id === entryId);
                    if (entry) {
                        const oldName = entry.playerName;
                        entry.playerName = data.name;

                        console.log(`💰 Updating player name: ${oldName} → ${data.name}`);

                        // Save updated data
                        await this.saveDebtsAndLoans();

                        // Force update display immediately
                        this.populateDebtTrackerWindow();

                        console.log(`💰 Successfully updated player name: ${oldName} → ${data.name}`);
                    } else {
                        console.log(`💰 Entry ${entryId} not found when trying to update name`);
                    }
                } else {
                    console.log(`💰 No name data received for player ${playerId}`);
                }

            } catch (error) {
                console.error(`💰 Error fetching player name for ${playerId}:`, error);
            }
        },

        // Calculate interest for an entry
        calculateInterest(entry) {
            if (entry.frozen || entry.interestType === 'none' || entry.interestRate <= 0) {
                return 0;
            }

            const now = new Date();
            const lastUpdate = new Date(entry.lastInterestUpdate);
            const timeDiffMs = now.getTime() - lastUpdate.getTime();

            let interest = 0;

            switch (entry.interestType) {
                case 'daily':
                    const daysPassed = timeDiffMs / (1000 * 60 * 60 * 24);
                    interest = entry.currentAmount * (entry.interestRate / 100) * daysPassed;
                    break;

                case 'weekly':
                    const weeksPassed = timeDiffMs / (1000 * 60 * 60 * 24 * 7);
                    interest = entry.currentAmount * (entry.interestRate / 100) * weeksPassed;
                    break;

                case 'flat':
                    // Flat fee applied once per day
                    const daysForFlat = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
                    if (daysForFlat >= 1) {
                        interest = entry.interestRate * daysForFlat;
                    }
                    break;

                case 'apr':
                    const yearsPassedAPR = timeDiffMs / (1000 * 60 * 60 * 24 * 365);
                    interest = entry.currentAmount * (entry.interestRate / 100) * yearsPassedAPR;
                    break;
            }

            return Math.max(0, interest);
        },

        // Update interest for all entries
        updateAllInterest() {
            let hasUpdates = false;
            const now = new Date().toISOString();

            // Update all debt and loan entries
            for (const entry of this.debtsAndLoans) {
                const interest = this.calculateInterest(entry);
                if (interest > 0) {
                    entry.currentAmount += interest;
                    entry.lastInterestUpdate = now;
                    hasUpdates = true;
                    const type = entry.isDebt ? 'debt from' : 'loan to';
                    console.log(`💰 Applied $${interest.toFixed(2)} interest to ${type} ${entry.playerName}`);
                }
            }

            if (hasUpdates) {
                this.saveDebtsAndLoans();
                this.renderAllDebtPanels();
            }
        },

        // Start interest update intervals
        startInterestUpdates() {
            // Update interest every 10 minutes
            this.interestUpdateInterval = setInterval(() => {
                this.updateAllInterest();
            }, 10 * 60 * 1000);

            console.log("💰 Interest update interval started (every 10 minutes)");
        },

        // Start API monitoring for automatic repayment detection
        startApiMonitoring() {
            if (!this.apiKey) {
                console.log("💰 No API key available for payment monitoring");
                return;
            }

            // Check for payments every 1 minute for better responsiveness
            this.apiCheckInterval = setInterval(() => {
                this.checkForPayments();
            }, 1 * 60 * 1000);

            // Do immediate check after 2 seconds
            setTimeout(() => {
                console.log("💰 Starting immediate payment check...");
                this.checkForPayments();
            }, 2000);

            console.log("💰 API payment monitoring started (checking every minute)");
        },

        // Check for incoming/outgoing payments using background script or direct fetch
        async checkForPayments() {
            try {
                if (!this.apiKey) {
                    console.log("💰 No API key available for payment monitoring");
                    return;
                }

                console.log("💰 Checking for payment logs...");

                // Try background script approach first (better for CORS issues)
                if (chrome?.runtime?.sendMessage) {
                    try {
                        console.log('💰 Attempting background script API call...');
                        const backgroundResult = await this.makeApiCallViaBackground(this.apiKey, ['logs']);
                        console.log('💰 Background script result:', backgroundResult);

                        if (backgroundResult && backgroundResult.success && backgroundResult.logs) {
                            console.log('✅ Background script logs API call successful');
                            this.processPaymentLogs(backgroundResult.logs);
                            return;
                        } else {
                            console.log('⚠️ Background script failed or returned no logs:', backgroundResult);
                        }
                    } catch (bgError) {
                        console.error('❌ Background script logs API failed:', bgError);
                    }
                } else {
                    console.log('⚠️ Chrome runtime not available for background script calls');
                }

                // Since we're in a Chrome extension content script, direct fetch to Torn API will fail due to CORS
                // The background script approach should be the primary method
                console.log('💰 Background script approach failed, payment monitoring disabled until next check');

                // Show a user-friendly notification about the API issue
                if (window.SidekickModules?.UI?.showNotification) {
                    window.SidekickModules.UI.showNotification(
                        'WARNING',
                        'Payment monitoring temporarily unavailable - API connection issue'
                    );
                }

            } catch (error) {
                console.error("💰 Error checking payments:", error);

                // Show user-friendly error notification
                if (window.SidekickModules?.UI?.showNotification) {
                    window.SidekickModules.UI.showNotification(
                        'ERROR',
                        'Payment monitoring error - check console for details'
                    );
                }
            }
        },

        // Helper method to make API calls via background script
        async makeApiCallViaBackground(apiKey, selections) {
            try {
                // Check if extension context is valid first
                if (!window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid()) {
                    console.warn('💰 Extension context invalidated, attempting recovery...');

                    // Try to recover the connection
                    const recovered = await window.SidekickModules.Core.SafeMessageSender.attemptContextRecovery();
                    if (!recovered) {
                        window.SidekickModules?.Core?.SafeMessageSender?.showExtensionReloadNotification();
                        throw new Error('Extension context invalidated - please refresh page');
                    }

                    console.log('✅ Extension context recovered, proceeding with API call');
                }

                console.log('💰 Sending message to background script:', { action: 'fetchTornApi', selections });

                const response = await window.SidekickModules.Core.SafeMessageSender.sendToBackground({
                    action: 'fetchTornApi',
                    apiKey: apiKey,
                    selections: selections
                });

                console.log('💰 Background script response received:', response);
                return response;

            } catch (error) {
                if (error.message.includes('Extension context invalidated')) {
                    console.warn('💰 Extension context lost during API call');
                    window.SidekickModules?.Core?.SafeMessageSender?.showExtensionReloadNotification();

                    // Show user a helpful message in the debt tracker
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification(
                            'EXTENSION_ERROR',
                            '💰 Debt tracker lost connection to extension. Please refresh the page to restore auto-payment detection.'
                        );
                    }
                } else {
                    console.error('💰 Error sending message to background script:', error);

                    // Show generic error to user
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification(
                            'ERROR',
                            `💰 Failed to check payment logs: ${error.message}`
                        );
                    }
                }
                throw error;
            }
        },

        // Process payment logs for automatic tracking
        processPaymentLogs(logs) {
            const logsArray = Array.isArray(logs) ? logs : Object.values(logs);
            const now = Date.now();
            const twoHoursAgo = now - (2 * 60 * 60 * 1000); // Check last 2 hours

            console.log(`💰 Processing ${logsArray.length} logs for automatic payment detection...`);

            let recentLogs = 0;
            let moneyTransferLogs = 0;

            for (const log of logsArray) {
                if (!log.timestamp || log.timestamp * 1000 < twoHoursAgo) continue;

                recentLogs++;

                // Debug: Show ALL recent log entries to see the format
                if (recentLogs <= 5) {
                    console.log(`💰 DEBUG - Recent log ${recentLogs}:`);
                    console.log(`  timestamp: ${log.timestamp}`);
                    console.log(`  log text: "${log.log}"`);
                    console.log(`  log type: ${typeof log.log}`);
                    console.log(`  log length: ${log.log ? log.log.length : 0}`);
                    console.log(`  full object:`, JSON.stringify(log, null, 2));
                }

                // Check the log for money transfers
                if (log.category && log.category === 'Money sending') {
                    // Check if this looks like a money transfer
                    if (log.title === 'Money receive' || log.title === 'Money send') {
                        moneyTransferLogs++;
                        console.log(`💰 Found money transfer log (${log.timestamp}): ${log.title} - $${log.data?.money || 0}`);
                    }
                    this.handleMoneyTransfer(log);
                }
            }

            console.log(`💰 Processed: ${recentLogs} recent logs (last 2 hours), ${moneyTransferLogs} money transfers found`);
        },



        // Handle money transfer detection
        handleMoneyTransfer(log) {
            try {
                // The Torn API returns structured data, not text
                // Check if this is a money transfer by category and title
                if (!log.category || log.category !== 'Money sending') {
                    return;
                }

                const title = log.title || '';
                const data = log.data || {};

                console.log(`💰 Checking money transfer log: ${title}`, data);

                // Pattern 1: Money received (someone paying us)
                // Title: "Money receive", data: { sender: ID, money: amount, message: "text" }
                if (title === 'Money receive' && data.sender && data.money) {
                    const amount = parseFloat(data.money);
                    const senderId = data.sender;
                    const message = data.message || '';
                    const logTimestamp = log.timestamp;

                    // Create unique payment ID to prevent duplicates
                    const paymentId = `receive_${senderId}_${amount}_${logTimestamp}`;
                    if (this.processedPayments.has(paymentId)) {
                        console.log(`💰 Skipping duplicate received payment: ${paymentId}`);
                        return;
                    }

                    console.log(`💰 Detected RECEIVED payment: $${amount} from sender ID ${senderId} with message: "${message}" (ID: ${paymentId})`);

                    // Check if message contains "loan" (case insensitive)
                    if (message.toLowerCase().includes('loan')) {
                        console.log('💰 Received payment contains "loan" - checking for matching loan entries (money you loaned out)');

                        // Debug: Show all current loans YOU gave (others owe YOU)
                        const allLoans = this.debtsAndLoans.filter(e => !e.isDebt);
                        console.log(`💰 Current loans given: ${allLoans.map(l => `${l.playerName} (ID: ${l.playerId})`).join(', ')}`);

                        // Find loan entries where YOU loaned money to this sender (they owe YOU)
                        const matchingEntries = this.debtsAndLoans.filter(entry => {
                            const matches = !entry.isDebt && (entry.playerId == senderId);
                            if (!entry.isDebt) {
                                console.log(`💰 Checking loan given: ${entry.playerName} (ID: ${entry.playerId}) vs sender ID ${senderId} - matches: ${matches}`);
                            }
                            return matches;
                        });

                        if (matchingEntries.length > 0) {
                            const entry = matchingEntries[0];
                            console.log(`💰 Auto-applying received payment of $${amount} to debt from ${entry.playerName}`);

                            // Mark as processed ONLY after successfully applying it
                            this.processedPayments.add(paymentId);
                            this.saveDebtsAndLoans(); // Save the processed payments set

                            this.addRepayment(entry.id, amount, `Auto-detected payment: ${message}`, true);
                            return;
                        } else {
                            console.log(`💰 No matching debt entries found for received payment from sender ID ${senderId}`);
                            // Don't mark as processed if we didn't find a matching debt/loan
                        }
                    } else {
                        console.log(`💰 Payment message does not contain "loan": "${message}"`);
                    }
                }

                // Pattern 2: Money sent (we're paying someone)
                // Title: "Money send", data: { receiver: ID, money: amount, message: "text" }
                if (title === 'Money send' && data.receiver && data.money) {
                    const amount = parseFloat(data.money);
                    const receiverId = data.receiver;
                    const message = data.message || '';
                    const logTimestamp = log.timestamp;

                    // Create unique payment ID to prevent duplicates
                    const paymentId = `send_${receiverId}_${amount}_${logTimestamp}`;
                    if (this.processedPayments.has(paymentId)) {
                        console.log(`💰 Skipping duplicate sent payment: ${paymentId}`);
                        return; // Exit the function early to prevent further processing
                    }

                    console.log(`💰 Detected SENT payment: $${amount} to receiver ID ${receiverId} with message: "${message}" (ID: ${paymentId})`);

                    // Check if message contains "loan" (case insensitive)
                    if (message.toLowerCase().includes('loan')) {
                        console.log('💰 Sent payment contains "loan" - checking for matching debt entries (money you owe)');

                        // Debug: Show all current debts YOU owe
                        const allDebts = this.debtsAndLoans.filter(e => e.isDebt);
                        console.log(`💰 Current debts owed: ${allDebts.map(d => `${d.playerName} (ID: ${d.playerId})`).join(', ')}`);

                        // Find debt entries where YOU owe this person money
                        const matchingEntries = this.debtsAndLoans.filter(entry => {
                            const matches = entry.isDebt && (entry.playerId == receiverId);
                            if (entry.isDebt) {
                                console.log(`💰 Checking debt owed: ${entry.playerName} (ID: ${entry.playerId}) vs receiver ID ${receiverId} - matches: ${matches}`);
                            }
                            return matches;
                        });

                        if (matchingEntries.length > 0) {
                            const entry = matchingEntries[0];
                            console.log(`💰 Auto-applying sent payment of $${amount} to loan to ${entry.playerName}`);

                            // Mark as processed ONLY after successfully applying it
                            this.processedPayments.add(paymentId);
                            this.saveDebtsAndLoans(); // Save the processed payments set

                            this.addRepayment(entry.id, amount, `Auto-detected payment: ${message}`, true);
                            return;
                        } else {
                            console.log(`💰 No matching loan entries found for sent payment to receiver ID ${receiverId}`);
                            // Don't mark as processed if we didn't find a matching debt/loan
                        }
                    }
                }

            } catch (error) {
                console.error('💰 Error handling money transfer:', error);
            }
        },

        // Helper method to match player names flexibly
        matchesPlayer(entry, playerName) {
            if (!entry.playerName || !playerName) return false;

            const entryName = entry.playerName.toLowerCase();
            const logName = playerName.toLowerCase();

            // Direct match
            if (entryName === logName) return true;

            // Handle Player [ID] format
            if (entryName.startsWith('player [') && entry.playerId) {
                const playerId = entry.playerId.toString();
                if (logName === playerId || logName.includes(playerId)) return true;
            }

            // Partial name matching (both ways)
            if (entryName.includes(logName) || logName.includes(entryName)) return true;

            return false;
        },

        // Add repayment to debt/loan
        addRepayment(entryId, amount, message = '', automatic = false) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            const repayment = {
                amount: parseFloat(amount),
                timestamp: new Date().toISOString(),
                message: message,
                automatic: automatic
            };

            entry.repayments.push(repayment);
            entry.currentAmount = Math.max(0, entry.currentAmount - parseFloat(amount));

            // If fully paid, mark as completed
            if (entry.currentAmount <= 0.01) { // Allow for rounding errors
                entry.completed = true;
                entry.completedAt = new Date().toISOString();
            }

            this.saveDebtsAndLoans();
            this.renderAllDebtPanels();

            const type = entry.type === 'debt' ? 'debt' : 'loan';
            console.log(`💰 Added $${amount} repayment to ${type} with ${entry.playerName}`);

            // Show notification
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification(
                    'SUCCESS',
                    `${automatic ? 'Auto-detected' : 'Manual'} repayment: $${amount.toLocaleString()} from ${entry.playerName}`
                );
            }
        },

        // Render all debt panels
        renderAllDebtPanels() {
            console.log("💰 Rendering all debt panels...");

            // Remove existing panels
            const existingPanels = document.querySelectorAll('.sidekick-debt-panel');
            existingPanels.forEach(panel => panel.remove());

            // Render active debts and loans
            this.debtsAndLoans.forEach(entry => {
                if (!entry.completed) {
                    this.createDebtPanel(entry);
                }
            });
        },

        // Create debt panel (main method to create a debt/loan panel)
        createDebtPanel(entry) {
            const isDebt = entry.isDebt;
            const backgroundColor = isDebt ? '#5a2727' : '#2d5a27'; // Red for debt, green for loan

            const panel = document.createElement('div');
            panel.className = 'sidekick-debt-panel movable-panel';
            panel.id = `sidekick-debt-${entry.id}`;
            panel.setAttribute('data-entry-id', entry.id);

            // Calculate interest preview
            const pendingInterest = this.calculateInterest(entry);
            const projectedAmount = entry.currentAmount + pendingInterest;

            // Calculate days since creation
            const daysSince = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            panel.style.cssText = `
                position: absolute;
                left: ${entry.x || 20}px;
                top: ${entry.y || 20}px;
                width: ${entry.width || 300}px;
                height: ${entry.height || 200}px;
                background: ${backgroundColor};
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 250px;
                min-height: 150px;
                z-index: 1000;
                resize: both;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                font-family: Arial, sans-serif;
            `;

            panel.innerHTML = `
                <div class="debt-panel-header" style="
                    background: rgba(0,0,0,0.2);
                    padding: 8px 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    border-bottom: 1px solid #444;
                ">
                    <span style="color: #fff; font-weight: bold; font-size: 14px;">
                        ${isDebt ? 'Debt' : 'Loan'}: ${entry.playerName}
                    </span>
                    <div style="display: flex; gap: 5px;">
                        <button class="debt-settings-btn" data-entry-id="${entry.id}" style="
                            background: #666;
                            border: none;
                            color: #fff;
                            width: 20px;
                            height: 20px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                            outline: none;
                        ">⚙️</button>
                        <button class="debt-close-btn" data-entry-id="${entry.id}" style="
                            background: #dc3545;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 10px;
                            padding: 0;
                            width: 14px;
                            height: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            transition: all 0.2s;
                            font-weight: bold;
                            flex-shrink: 0;
                            min-width: 14px;
                            outline: none;
                        " onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 0 8px rgba(220, 53, 69, 0.6)'" 
                           onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'; this.style.boxShadow='none'">×</button>
                    </div>
                </div>
                
                <div class="debt-panel-content" style="
                    padding: 12px;
                    flex: 1;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    color: #fff;
                    font-size: 12px;
                ">
                <style>
                .debt-panel-content::-webkit-scrollbar {
                    display: none;
                }
                </style>
                    <div style="margin-bottom: 8px;">
                        <strong>Player ID:</strong> ${entry.playerId}
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <strong>Principal:</strong> $${entry.principal.toLocaleString()}
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <strong>Current Amount:</strong> $${entry.currentAmount.toLocaleString()}
                    </div>
                    
                    ${pendingInterest > 0.01 ? `
                        <div style="margin-bottom: 8px; color: #ffeb3b;">
                            <strong>Pending Interest:</strong> +$${pendingInterest.toFixed(2)}
                        </div>
                        <div style="margin-bottom: 8px; color: #ff9800;">
                            <strong>Projected Total:</strong> $${projectedAmount.toLocaleString()}
                        </div>
                    ` : ''}
                    
                    ${entry.interestType !== 'none' ? `
                        <div style="margin-bottom: 8px;">
                            <strong>Interest:</strong> ${entry.interestRate}% ${entry.interestType}
                            ${entry.frozen ? ' <span style="color: #03a9f4;">(FROZEN)</span>' : ''}
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 8px;">
                        <strong>Created:</strong> ${daysSince} days ago
                    </div>
                    
                    ${entry.repayments.length > 0 ? `
                        <div style="margin-bottom: 8px;">
                            <strong>Repayments:</strong> ${entry.repayments.length} 
                            (Total: $${entry.repayments.reduce((sum, r) => sum + r.amount, 0).toLocaleString()})
                        </div>
                    ` : ''}
                    
                    ${entry.notes ? `
                        <div style="margin-bottom: 8px; font-style: italic; color: #ccc;">
                            "${entry.notes}"
                        </div>
                    ` : ''}
                </div>
                
                <div class="debt-panel-actions" style="
                    padding: 8px 12px;
                    border-top: 1px solid #444;
                    display: flex;
                    gap: 8px;
                ">
                    <button class="debt-repay-btn" data-entry-id="${entry.id}" style="
                        background: #4caf50;
                        border: none;
                        color: #fff;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                        flex: 1;
                    ">Add Repayment</button>
                    
                    <button class="debt-freeze-btn" data-entry-id="${entry.id}" style="
                        background: ${entry.frozen ? '#ff9800' : '#2196f3'};
                        border: none;
                        color: #fff;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    ">${entry.frozen ? 'Unfreeze' : 'Freeze'}</button>
                </div>
            `;

            this.attachDebtPanelEvents(panel);
            return panel;
        },

        // Attach event listeners to debt panel
        attachDebtPanelEvents(panel) {
            // Repayment button
            const repayBtn = panel.querySelector('.debt-repay-btn');
            repayBtn.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                this.showRepaymentDialog(entryId);
            });

            // Freeze/unfreeze button
            const freezeBtn = panel.querySelector('.debt-freeze-btn');
            freezeBtn.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                this.toggleFreeze(entryId);
            });

            // Settings button
            const settingsBtn = panel.querySelector('.debt-settings-btn');
            settingsBtn.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                this.showSettingsDialog(entryId);
            });

            // Close button
            const closeBtn = panel.querySelector('.debt-close-btn');
            closeBtn.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                this.markAsCompleted(entryId);
            });
        },

        // Show repayment dialog
        showRepaymentDialog(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            const amount = prompt(`Enter repayment amount for ${entry.playerName}:`);
            if (amount && !isNaN(parseFloat(amount))) {
                const message = prompt('Optional message/note:', '');
                this.addRepayment(entryId, parseFloat(amount), message || '', false);
            }
        },

        // Toggle interest freeze
        toggleFreeze(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            entry.frozen = !entry.frozen;
            this.saveDebtsAndLoans();
            this.populateDebtTrackerWindow();

            console.log(`💰 ${entry.frozen ? 'Frozen' : 'Unfrozen'} interest for ${entry.playerName}`);
        },

        // Show settings dialog
        showSettingsDialog(entryId) {
            // TODO: Implement comprehensive settings dialog
            console.log("💰 Settings dialog for entry:", entryId);
        },

        // Mark debt/loan as completed
        markAsCompleted(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            if (confirm(`Mark ${entry.type} with ${entry.playerName} as completed?`)) {
                entry.completed = true;
                entry.completedAt = new Date().toISOString();
                this.saveDebtsAndLoans();

                // Refresh tracker window if open
                this.populateDebtTrackerWindow();

                console.log(`💰 Marked ${entry.type} with ${entry.playerName} as completed`);
            }
        },

        // Make debt panel draggable with debounced saving
        makeDebtPanelDraggable(panel, entry) {
            const header = panel.querySelector('.debt-panel-header');
            let isDragging = false;
            let currentX = 0;
            let currentY = 0;
            let initialX = 0;
            let initialY = 0;

            // Debounced save to prevent excessive storage writes
            let saveTimeout;
            const debouncedSave = () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveDebtsAndLoans();
                    console.log('💰 Debt panel position saved:', { x: entry.x, y: entry.y });
                }, 250);
            };

            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;

                isDragging = true;
                initialX = e.clientX - (entry.x || 0);
                initialY = e.clientY - (entry.y || 0);
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                panel.style.left = currentX + 'px';
                panel.style.top = currentY + 'px';

                // Update entry position in real-time
                entry.x = currentX;
                entry.y = currentY;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    // Final position update and save
                    entry.x = currentX;
                    entry.y = currentY;
                    debouncedSave();
                }
                isDragging = false;
            });

            // Handle resize events to save size changes
            const resizeObserver = new ResizeObserver(this.debounceResize(() => {
                const rect = panel.getBoundingClientRect();
                const newWidth = Math.max(250, rect.width);
                const newHeight = Math.max(150, rect.height);

                // Only save if size actually changed
                if (entry.width !== newWidth || entry.height !== newHeight) {
                    entry.width = newWidth;
                    entry.height = newHeight;
                    this.saveDebtsAndLoans();
                    console.log('💰 Debt panel size saved:', { width: entry.width, height: entry.height });
                }
            }, 300));

            resizeObserver.observe(panel);

            // Clean up observer when panel is removed
            const originalRemove = panel.remove;
            panel.remove = function () {
                resizeObserver.disconnect();
                clearTimeout(saveTimeout);
                originalRemove.call(this);
            };
        },

        // Debounce helper for resize events
        debounceResize(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Show unified debt tracker in sidebar
        async showDebtTrackerWindow() {
            console.log('💰 Creating debt tracker in sidebar');

            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error('💰 Sidebar content area not found');
                return;
            }

            // Remove existing debt tracker if present
            const existingTracker = contentArea.querySelector('.sidekick-debt-tracker');
            if (existingTracker) {
                existingTracker.remove();
                return; // Toggle behavior
            }

            // Load current state to get pin status
            const state = await this.loadWindowState();

            // Remove placeholder if it exists
            const placeholder = contentArea.querySelector('.sidekick-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Load saved state for position and size
            const savedState = await this.loadWindowState();

            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;

            // Use saved dimensions or defaults
            const width = savedState?.size?.width || Math.min(350, contentWidth - 30);
            const height = savedState?.size?.height || Math.min(400, contentHeight - 30);
            const x = savedState?.position?.x || 10;
            const y = savedState?.position?.y || 10;

            console.log("💰 Using window state:", { x, y, width, height, savedState });

            // Save that tracker window is open for persistence
            this.saveWindowState(true);

            const trackerElement = document.createElement('div');
            trackerElement.className = 'sidekick-debt-tracker movable-panel';
            trackerElement.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 250px;
                min-height: 200px;
                z-index: 1000;
                resize: both;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;

            trackerElement.innerHTML = `
                <div class="debt-tracker-header" style="
                    background: #4CAF50;
                    padding: 8px 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    color: #fff;
                    font-weight: bold;
                    border-radius: 6px 6px 0 0;
                    font-size: 12px;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">💰</span>
                        <span>Debt Tracker</span>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <div style="position: relative; display: inline-block;">
                            <button class="debt-cogwheel-btn" style="
                                background: none;
                                border: none;
                                color: #fff;
                                width: 20px;
                                height: 20px;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                outline: none;
                                padding: 0;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">⚙️</button>
                            <div class="debt-cogwheel-menu" style="
                                position: absolute;
                                top: 25px;
                                right: 0;
                                background: #2a2a2a;
                                border: 1px solid #444;
                                border-radius: 4px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                                display: none;
                                z-index: 10002;
                                min-width: 120px;
                            ">
                                <div class="debt-menu-option" data-action="pin" style="
                                    padding: 8px 12px;
                                    color: #fff;
                                    cursor: pointer;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    ${state.pinned ? '📌 Unpin' : '📌 Pin'}
                                </div>
                                <div class="debt-menu-option" data-action="debt" style="
                                    padding: 8px 12px;
                                    color: #fff;
                                    cursor: pointer;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                ">Add Debt</div>
                                <div class="debt-menu-option" data-action="loan" style="
                                    padding: 8px 12px;
                                    color: #fff;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">Add Loan</div>
                            </div>
                        </div>
                        <button class="debt-tracker-close" style="
                            background: #dc3545;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 10px;
                            padding: 0;
                            width: 14px;
                            height: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            transition: all 0.2s;
                            font-weight: bold;
                            flex-shrink: 0;
                            min-width: 14px;
                            outline: none;
                        " onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 0 8px rgba(220, 53, 69, 0.6)'" 
                           onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'; this.style.boxShadow='none'">×</button>
                    </div>
                </div>
                
                <div class="debt-tracker-content" style="
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #1f1f1f;
                    color: #fff;
                ">
                <style>
                .debt-tracker-content::-webkit-scrollbar {
                    display: none;
                }
                </style>
                    <div id="debt-tracker-list" style="
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    ">
                        <!-- Debt/loan entries will be populated here -->
                    </div>
                    
                    <div id="debt-tracker-summary" style="
                        border-top: 1px solid #444;
                        padding-top: 10px;
                        font-size: 12px;
                        color: #ccc;
                        border-radius: 0 0 6px 6px;
                    ">
                        <!-- Summary will be populated here -->
                    </div>
                </div>
            `;

            contentArea.appendChild(trackerElement);

            this.isDebtTrackerOpen = true;
            this.startAlertMonitoring();

            // Set up event listeners
            const closeBtn = trackerElement.querySelector('.debt-tracker-close');
            const cogwheelBtn = trackerElement.querySelector('.debt-cogwheel-btn');
            const cogwheelMenu = trackerElement.querySelector('.debt-cogwheel-menu');
            const header = trackerElement.querySelector('.debt-tracker-header');

            closeBtn?.addEventListener('click', () => {
                this.saveWindowState(false, trackerElement);
                this.isDebtTrackerOpen = false;
                this.stopAlertMonitoring();
                trackerElement.remove();
            });

            // Cogwheel menu functionality
            cogwheelBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = cogwheelMenu;
                if (menu.style.display === 'block') {
                    menu.style.display = 'none';
                } else {
                    menu.style.display = 'block';
                }
            });

            // Menu option handlers
            const menuOptions = trackerElement.querySelectorAll('.debt-menu-option');
            menuOptions.forEach(option => {
                option.addEventListener('mouseenter', () => {
                    option.style.background = 'rgba(255,255,255,0.1)';
                });
                option.addEventListener('mouseleave', () => {
                    option.style.background = 'transparent';
                });
                option.addEventListener('click', () => {
                    const action = option.dataset.action;
                    if (action === 'debt') {
                        this.showAddDebtDialog();
                    } else if (action === 'loan') {
                        this.showAddLoanDialog();
                    } else if (action === 'pin') {
                        this.toggleDebtTrackerPin();
                    }
                    cogwheelMenu.style.display = 'none';
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!cogwheelBtn.contains(e.target) && !cogwheelMenu.contains(e.target)) {
                    cogwheelMenu.style.display = 'none';
                }
            });

            // Make tracker draggable within sidebar
            this.makeSidebarElementDraggable(trackerElement, header);

            // Add resize observer to save size changes
            this.addResizeObserver(trackerElement);

            // Populate with existing entries
            this.populateDebtTrackerWindow();

            console.log('💰 Debt tracker created in sidebar');
        },

        // Populate debt tracker window with existing entries
        populateDebtTrackerWindow() {
            const listContainer = document.getElementById('debt-tracker-list');
            const summaryContainer = document.getElementById('debt-tracker-summary');

            if (!listContainer || !summaryContainer) return;

            // Clear existing content
            listContainer.innerHTML = '';

            let totalDebts = 0;
            let totalLoans = 0;
            let debtCount = 0;
            let loanCount = 0;

            if (this.debtsAndLoans.length === 0) {
                listContainer.innerHTML = `
                    <div style="
                        text-align: center;
                        color: #666;
                        font-style: italic;
                        margin: 40px 0;
                    ">
                        No debts or loans tracked yet.<br>
                        Use the dropdown above to add entries.
                    </div>
                `;
            } else {
                // Sort entries: debts first, then loans
                const sortedEntries = [...this.debtsAndLoans].sort((a, b) => {
                    if (a.isDebt && !b.isDebt) return -1;
                    if (!a.isDebt && b.isDebt) return 1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });

                sortedEntries.forEach(entry => {
                    const entryElement = this.createDebtTrackerEntry(entry);
                    listContainer.appendChild(entryElement);

                    // Calculate totals
                    if (entry.isDebt) {
                        totalDebts += entry.currentAmount;
                        debtCount++;
                    } else {
                        totalLoans += entry.currentAmount;
                        loanCount++;
                    }
                });
            }

            // Update summary
            summaryContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="background: rgba(211,47,47,0.2); padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-weight: bold; color: #ff5252;">Debts Owed</div>
                        <div style="font-size: 14px;">$${totalDebts.toLocaleString()}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${debtCount} ${debtCount === 1 ? 'debt' : 'debts'}</div>
                    </div>
                    <div style="background: rgba(56,142,60,0.2); padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-weight: bold; color: #4caf50;">Loans Given</div>
                        <div style="font-size: 14px;">$${totalLoans.toLocaleString()}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${loanCount} ${loanCount === 1 ? 'loan' : 'loans'}</div>
                    </div>
                </div>
            `;
        },

        // Create individual entry for debt tracker window
        createDebtTrackerEntry(entry) {
            const isDebt = entry.isDebt;
            const pendingInterest = this.calculateInterest(entry);
            const totalAmount = entry.currentAmount + pendingInterest;

            const entryDiv = document.createElement('div');
            entryDiv.style.cssText = `
                background: rgba(${isDebt ? '211,47,47' : '56,142,60'}, 0.15);
                border: 1px solid rgba(${isDebt ? '255,82,82' : '76,175,80'}, 0.3);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 8px;
                position: relative;
            `;

            const alerts = this.getEntryAlerts(entry);
            const alertBadge = alerts.length > 0 ? `
                <div class="entry-alert-badge" data-entry-id="${entry.id}" style="
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: ${alerts.some(a => a.severity === 'high') ? '#f44336' : alerts.some(a => a.severity === 'medium') ? '#ff9800' : '#4caf50'};
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    cursor: pointer;
                    border: 2px solid rgba(${isDebt ? '211,47,47' : '56,142,60'}, 0.8);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    z-index: 10;
                ">${alerts.length}</div>
            ` : '';

            entryDiv.innerHTML = `
                ${alertBadge}
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: ${isDebt ? '#ff5252' : '#4caf50'};">
                            <a href="https://www.torn.com/profiles.php?XID=${entry.playerId}" target="_blank" style="color: inherit; text-decoration: none; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                                ${entry.playerName}
                            </a>
                        </div>
                        ${entry.playerId ? `<div style="font-size: 11px; color: #999;">ID: ${entry.playerId}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; font-size: 14px;">$${totalAmount.toLocaleString()}</div>
                        ${pendingInterest > 0 ? `<div style="font-size: 10px; color: #ffa726;">+$${pendingInterest.toFixed(2)} interest</div>` : ''}
                    </div>
                </div>
                
                <div style="font-size: 11px; color: #ccc; margin-bottom: 6px;">
                    Original: $${entry.originalAmount.toLocaleString()} • 
                    ${entry.interestRate > 0 ? `${entry.interestRate}% ${entry.interestType}` : 'No interest'} • 
                    ${this.getTimeAgo(entry.createdAt)}
                </div>
                
                ${entry.notes ? `<div style="font-size: 11px; color: #bbb; font-style: italic; margin-bottom: 6px;">"${entry.notes}"</div>` : ''}
                
                <div style="display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px;">
                    <button class="entry-pay-btn" data-entry-id="${entry.id}" style="
                        background: #2196f3;
                        border: 1px solid #42a5f5;
                        color: #fff;
                        padding: 3px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 9px;
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">Add Payment</button>
                    ${!isDebt ? `<button class="entry-increase-btn" data-entry-id="${entry.id}" style="
                        background: #ff9800;
                        border: 1px solid #ffb74d;
                        color: #fff;
                        padding: 3px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 9px;
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">Increase Loan</button>` : ''}
                    <button class="entry-edit-btn" data-entry-id="${entry.id}" style="
                        background: #4caf50;
                        border: 1px solid #66bb6a;
                        color: #fff;
                        padding: 3px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 9px;
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">📋 Receipt</button>
                    <button class="entry-delete-btn" data-entry-id="${entry.id}" style="
                        background: #d32f2f;
                        border: 1px solid #f44336;
                        color: #fff;
                        padding: 3px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 9px;
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">Delete</button>
                </div>
            `;

            // Add event listeners for buttons
            const payBtn = entryDiv.querySelector('.entry-pay-btn');
            const editBtn = entryDiv.querySelector('.entry-edit-btn');
            const deleteBtn = entryDiv.querySelector('.entry-delete-btn');
            const increaseBtn = entryDiv.querySelector('.entry-increase-btn');
            const alertElement = entryDiv.querySelector('.entry-alert-badge');

            payBtn?.addEventListener('click', () => {
                this.showAddPaymentDialog(entry.id);
            });

            editBtn?.addEventListener('click', () => {
                this.generateReceipt(entry.id);
            });

            increaseBtn?.addEventListener('click', () => {
                this.showIncreaseLoanDialog(entry.id);
            });

            alertElement?.addEventListener('click', () => {
                this.showEntryAlertsDialog(entry.id);
            });

            deleteBtn?.addEventListener('click', () => {
                if (confirm(`Delete this ${isDebt ? 'debt' : 'loan'} entry for ${entry.playerName}?`)) {
                    this.deleteEntry(entry.id);
                    this.populateDebtTrackerWindow(); // Refresh window
                }
            });

            return entryDiv;
        },

        // Helper method to get time ago string
        getTimeAgo(dateString) {
            const now = new Date();
            const date = new Date(dateString);
            const diffMs = now - date;
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
            return `${Math.floor(days / 30)} months ago`;
        },

        // Delete entry
        deleteEntry(entryId) {
            const index = this.debtsAndLoans.findIndex(entry => entry.id === entryId);
            if (index !== -1) {
                this.debtsAndLoans.splice(index, 1);
                this.saveDebtsAndLoans();
                this.renderAllDebtPanels();
            }
        },

        // Make window draggable
        makeWindowDraggable(windowElement, headerElement) {
            let isDragging = false;
            let currentX = 0;
            let currentY = 0;
            let initialX = 0;
            let initialY = 0;

            headerElement.addEventListener('mousedown', (e) => {
                isDragging = true;
                initialX = e.clientX - currentX;
                initialY = e.clientY - currentY;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                windowElement.style.left = currentX + 'px';
                windowElement.style.top = currentY + 'px';
                windowElement.style.right = 'auto'; // Remove right positioning
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        },

        // Make sidebar element draggable (constrained to sidebar content area)
        makeSidebarElementDraggable(element, headerElement) {
            let isDragging = false;
            let currentX = parseInt(element.style.left) || 0;
            let currentY = parseInt(element.style.top) || 0;
            let initialX = 0;
            let initialY = 0;

            headerElement.addEventListener('mousedown', (e) => {
                // Prevent dragging if clicking on buttons
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }

                isDragging = true;
                initialX = e.clientX - currentX;
                initialY = e.clientY - currentY;
                element.style.zIndex = '1001'; // Bring to front
                e.preventDefault(); // Prevent text selection
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                e.preventDefault();
                const contentArea = document.getElementById('sidekick-content');
                if (!contentArea) return;

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Constrain to content area bounds
                const maxX = contentArea.clientWidth - element.offsetWidth;
                const maxY = contentArea.clientHeight - element.offsetHeight;

                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(0, Math.min(currentY, maxY));

                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';

                console.log(`💰 Dragging to: ${currentX}, ${currentY}`);
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    element.style.zIndex = '1000'; // Reset z-index
                    // Save position after dragging
                    console.log(`💰 Drag ended at: ${currentX}, ${currentY}`);
                    this.saveWindowState(true, element);
                }
                isDragging = false;
            });
        },

        // Toggle debt tracker pin state
        async toggleDebtTrackerPin() {
            const state = await this.loadWindowState();
            state.pinned = !state.pinned;

            const trackerElement = document.querySelector('.sidekick-debt-tracker');
            if (trackerElement) {
                // Update pin button text
                const pinButton = trackerElement.querySelector('[data-action="pin"]');
                if (pinButton) {
                    pinButton.textContent = state.pinned ? '📌 Unpin' : '📌 Pin';
                }

                // Update visual indication (optional - add a pinned style)
                if (state.pinned) {
                    trackerElement.style.border = '2px solid #ffd700';
                    trackerElement.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                } else {
                    trackerElement.style.border = '1px solid #444';
                    trackerElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                }

                await this.saveWindowState(true, trackerElement);
                console.log(`💰 Debt tracker ${state.pinned ? 'pinned' : 'unpinned'}`);
            }
        },

        // Show Add Debt Dialog
        showAddDebtDialog() {
            this.showAddEntryDialog(true);
        },

        // Show Add Loan Dialog
        showAddLoanDialog() {
            this.showAddEntryDialog(false);
        },

        // Show Add Entry Dialog (generic for both debt and loan)
        showAddEntryDialog(isDebt) {
            // Remove existing dialog if present
            const existingDialog = document.getElementById('sidekick-debt-dialog');
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.id = 'sidekick-debt-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                background: linear-gradient(135deg, #2a2a2a, #1f1f1f);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 0;
                z-index: 9999999;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                backdrop-filter: blur(20px);
                color: #fff;
                font-family: Arial, sans-serif;
                overflow: hidden;
            `;

            dialog.innerHTML = `
                <div style="
                    background: rgba(0,0,0,0.3);
                    padding: 15px 20px;
                    border-bottom: 1px solid #444;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; color: #FFC107; font-size: 16px;">
                        ${isDebt ? 'Add New Debt' : 'Add New Loan'}
                    </h3>
                    <button id="debt-dialog-close" style="
                        background: #d32f2f;
                        border: none;
                        color: #fff;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">×</button>
                </div>
                
                <div style="padding: 20px;">
                    <form id="debt-entry-form">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Player ID:</label>
                            <input type="number" id="player-id" required style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                font-size: 14px;
                            " placeholder="Enter player ID">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Amount ($):</label>
                            <input type="number" id="amount" required min="0" step="0.01" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                font-size: 14px;
                            " placeholder="Enter amount">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Interest Rate (%):</label>
                            <input type="number" id="interest-rate" min="0" step="0.01" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                font-size: 14px;
                            " placeholder="0.00" value="0">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Interest Type:</label>
                            <select id="interest-type" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: #fff;
                                color: #000;
                                font-size: 14px;
                            ">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="flat">Flat Fee</option>
                                <option value="apr">Annual (APR)</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Due Date:</label>
                            <input type="date" id="due-date" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                font-size: 14px;
                            ">
                            <div style="margin-top: 5px;">
                                <label style="font-size: 12px; color: #ccc;">
                                    <input type="checkbox" id="no-due-date" style="margin-right: 5px;"> No due date
                                </label>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Notes:</label>
                            <textarea id="notes" rows="3" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #666;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: #fff;
                                font-size: 14px;
                                resize: vertical;
                            " placeholder="Optional notes"></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" id="debt-dialog-cancel" style="
                                background: #666;
                                border: 1px solid #888;
                                color: #fff;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                            ">Cancel</button>
                            <button type="submit" style="
                                background: ${isDebt ? '#d32f2f' : '#388e3c'};
                                border: 1px solid ${isDebt ? '#ff5252' : '#4caf50'};
                                color: #fff;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                            ">${isDebt ? 'Add Debt' : 'Add Loan'}</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(dialog);

            // Set up event listeners
            const closeBtn = dialog.querySelector('#debt-dialog-close');
            const cancelBtn = dialog.querySelector('#debt-dialog-cancel');
            const form = dialog.querySelector('#debt-entry-form');

            const closeDialog = () => {
                dialog.remove();
            };

            closeBtn?.addEventListener('click', closeDialog);
            cancelBtn?.addEventListener('click', closeDialog);

            // Handle form submission
            form?.addEventListener('submit', (e) => {
                e.preventDefault();

                const playerId = dialog.querySelector('#player-id').value.trim();
                const amount = parseFloat(dialog.querySelector('#amount').value);
                const interestRate = parseFloat(dialog.querySelector('#interest-rate').value) || 0;
                const interestType = dialog.querySelector('#interest-type').value;
                const notes = dialog.querySelector('#notes').value.trim();
                const dueDateInput = dialog.querySelector('#due-date').value;
                const noDueDate = dialog.querySelector('#no-due-date').checked;
                const dueDate = noDueDate ? null : (dueDateInput ? new Date(dueDateInput).toISOString() : null);

                if (!playerId || isNaN(amount) || amount <= 0) {
                    alert('Please enter a valid player ID and amount.');
                    return;
                }

                const playerName = `Player [${playerId}]`; // Temporary name, will be fetched from API

                // Use the proper create methods
                if (isDebt) {
                    this.createDebt(playerId, playerName, amount, interestType, interestRate, notes, dueDate);
                } else {
                    this.createLoan(playerId, playerName, amount, interestType, interestRate, notes, dueDate);
                }

                // Close dialog
                closeDialog();

                console.log(`💰 ${isDebt ? 'Debt' : 'Loan'} added for player ${playerName}`);
            });

            // Handle due date form interactions
            const dueDateInput = dialog.querySelector('#due-date');
            const noDueDateCheckbox = dialog.querySelector('#no-due-date');

            // Disable/enable due date input based on checkbox
            noDueDateCheckbox?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    dueDateInput.disabled = true;
                    dueDateInput.value = '';
                    dueDateInput.style.opacity = '0.5';
                } else {
                    dueDateInput.disabled = false;
                    dueDateInput.style.opacity = '1';
                }
            });

            // If user selects a date, uncheck the "no due date" option
            dueDateInput?.addEventListener('change', (e) => {
                if (e.target.value) {
                    noDueDateCheckbox.checked = false;
                }
            });

            // Click outside to close - DISABLED to prevent accidental closes
            // const closeOnClickOutside = (e) => {
            //     if (!dialog.contains(e.target)) {
            //         closeDialog();
            //         document.removeEventListener('click', closeOnClickOutside);
            //     }
            // };

            // setTimeout(() => {
            //     document.addEventListener('click', closeOnClickOutside);
            // }, 100);

            // Focus on player name field
            const playerNameField = dialog.querySelector('#player-name');
            if (playerNameField) {
                setTimeout(() => playerNameField.focus(), 100);
            }
        },

        // Show add payment dialog
        showAddPaymentDialog(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            // Simple prompt for now - could be enhanced with a full dialog
            const amount = prompt(`Add payment for ${entry.playerName}:\nCurrent balance: $${entry.currentAmount.toLocaleString()}\n\nPayment amount:`);
            if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
                this.addRepayment(entryId, parseFloat(amount), 'Manual payment', false);
                this.populateDebtTrackerWindow();
            }
        },

        showIncreaseLoanDialog(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) return;

            // Only show for loans
            if (entry.type !== 'loan') {
                alert('Can only increase loan amounts, not debt amounts.');
                return;
            }

            const increaseAmount = prompt(`Increase loan amount for ${entry.playerName}:\nCurrent loan: $${entry.originalAmount.toLocaleString()}\nCurrent balance: $${entry.currentAmount.toLocaleString()}\n\nIncrease amount:`);

            if (increaseAmount && !isNaN(parseFloat(increaseAmount)) && parseFloat(increaseAmount) > 0) {
                const increase = parseFloat(increaseAmount);

                // Update the loan amounts
                entry.originalAmount += increase;
                entry.currentAmount += increase;

                // Add a payment history entry for the increase
                const timestamp = new Date().toISOString();
                if (!entry.paymentHistory) {
                    entry.paymentHistory = [];
                }

                entry.paymentHistory.push({
                    id: `increase_${Date.now()}`,
                    amount: increase,
                    type: 'increase',
                    timestamp: timestamp,
                    description: 'Loan amount increased'
                });

                // Save and update UI
                this.saveToStorage();
                this.populateDebtTrackerWindow();
                this.showNotification(`Loan to ${entry.playerName} increased by $${increase.toLocaleString()}`, 'success');

                console.log(`Increased loan to ${entry.playerName} by $${increase.toLocaleString()}`);
            }
        },

        // Generate receipt and copy to clipboard
        generateReceipt(entryId) {
            const entry = this.debtsAndLoans.find(e => e.id === entryId);
            if (!entry) {
                alert('Entry not found!');
                return;
            }

            const isDebt = entry.type === 'debt';
            const originalAmount = entry.originalAmount || 0;
            const currentAmount = entry.currentAmount || 0;
            const interestRate = entry.interestRate || 0;
            const interestType = entry.interestType || 'weekly';
            const currentDate = new Date().toLocaleDateString();
            const createdDate = new Date(entry.createdAt).toLocaleDateString();

            // Calculate total payments made - ensure all values are numbers
            const totalPaid = (entry.repayments || []).reduce((sum, payment) => {
                const paymentAmount = payment.amount || 0;
                return sum + (isNaN(paymentAmount) ? 0 : paymentAmount);
            }, 0);

            const remainingBalance = currentAmount;

            // Use stored due date or show 'No due date'
            const dueDate = entry.dueDate ? new Date(entry.dueDate) : null;

            // Generate receipt text in requested format - ensure all numbers are valid
            const receiptType = isDebt ? 'Debt Receipt' : 'Loan Receipt';
            const borrowerLabel = isDebt ? 'Debtor' : 'Borrower';
            const receipt = `${receiptType}
-------------
${borrowerLabel}: ${entry.playerName}
${isDebt ? 'Debt' : 'Loan'} Amount: $${(originalAmount || 0).toLocaleString()}
Interest: ${interestRate}% ${interestType}
Remaining Balance: $${(remainingBalance || 0).toLocaleString()}
Start Date: ${createdDate}
Due Date: ${dueDate ? dueDate.toLocaleDateString() : 'No due date'}
${entry.notes ? `Notes: ${entry.notes}` : 'Notes: None'}
${totalPaid > 0 ? `\nTotal Paid: $${(totalPaid || 0).toLocaleString()}` : ''}
${entry.frozen ? '\nStatus: FROZEN' : ''}`;

            // Copy to clipboard
            navigator.clipboard.writeText(receipt).then(() => {
                // Show success notification
                this.showToast(`📋 Receipt copied to clipboard for ${entry.playerName}!`);
            }).catch(err => {
                console.error('Failed to copy receipt:', err);
                alert('Failed to copy receipt to clipboard. Please try again.');
            });
        },

        // Show toast notification
        showToast(message) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196f3;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-size: 14px;
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            // Animate in
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            }, 100);

            // Animate out and remove
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        },

        // Save window state for persistence
        async saveWindowState(isOpen, element = null) {
            try {
                const state = { isOpen };

                if (element && isOpen) {
                    const rect = element.getBoundingClientRect();
                    const contentArea = document.getElementById('sidekick-content');
                    if (contentArea) {
                        const contentRect = contentArea.getBoundingClientRect();
                        state.position = {
                            x: parseInt(element.style.left) || 10,
                            y: parseInt(element.style.top) || 10
                        };
                        state.size = {
                            width: parseInt(element.style.width) || 350,
                            height: parseInt(element.style.height) || 400
                        };
                    }
                }

                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    await window.SidekickModules.Core.ChromeStorage.set('debt_tracker_window_state', state);
                    console.log("💰 Window state saved:", state);
                }
            } catch (error) {
                console.error('Failed to save window state:', error);
            }
        },

        // Load window state for persistence
        async loadWindowState() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const state = await window.SidekickModules.Core.ChromeStorage.get('debt_tracker_window_state');
                    console.log("💰 Loaded window state:", state);
                    return state || { isOpen: false, pinned: false };
                }
            } catch (error) {
                console.error('Failed to load window state:', error);
            }
            return { isOpen: false, pinned: false };
        },

        // Restore window state on page load
        async restoreWindowState() {
            const state = await this.loadWindowState();
            if (state.isOpen) {
                console.log("💰 Restoring debt tracker window state", state);
                // Check if sidebar is ready, if not wait briefly
                this.waitForSidebarAndShow();
            }
        },

        // Wait for sidebar to be ready and show debt tracker
        async waitForSidebarAndShow() {
            const maxAttempts = 50; // 5 seconds max
            let attempts = 0;

            const checkAndShow = () => {
                const contentArea = document.getElementById('sidekick-content');
                if (contentArea && contentArea.offsetWidth > 0) {
                    console.log("💰 Sidebar ready, showing debt tracker immediately");
                    this.showDebtTrackerWindow();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkAndShow, 100); // Check every 100ms
                } else {
                    console.warn("💰 Sidebar not ready after 5 seconds, showing anyway");
                    this.showDebtTrackerWindow();
                }
            };

            checkAndShow();
        },

        // Add resize observer for debt tracker
        addResizeObserver(element) {
            console.log("💰 Adding resize observer to debt tracker");

            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;

                    // Update the element's style to match actual size
                    element.style.width = width + 'px';
                    element.style.height = height + 'px';

                    console.log(`💰 Debt tracker resized to: ${width}x${height}`);

                    // Debounced save to avoid too frequent saves during resize
                    clearTimeout(element._resizeTimeout);
                    element._resizeTimeout = setTimeout(() => {
                        this.saveWindowState(true, element);
                        console.log(`💰 Debt tracker size saved: ${width}x${height}`);
                    }, 1000); // Increased timeout to reduce saves
                }
            });

            resizeObserver.observe(element);

            // Store observer for cleanup
            element._resizeObserver = resizeObserver;

            // Cleanup on element removal
            const originalRemove = element.remove;
            element.remove = function () {
                if (this._resizeObserver) {
                    this._resizeObserver.disconnect();
                    this._resizeObserver = null;
                }
                if (this._resizeTimeout) {
                    clearTimeout(this._resizeTimeout);
                }
                originalRemove.call(this);
            };
        },
        destroy() {
            if (this.apiCheckInterval) {
                clearInterval(this.apiCheckInterval);
                this.apiCheckInterval = null;
            }

            if (this.interestUpdateInterval) {
                clearInterval(this.interestUpdateInterval);
                this.interestUpdateInterval = null;
            }

            // Remove all panels
            const panels = document.querySelectorAll('.sidekick-debt-panel');
            panels.forEach(panel => panel.remove());

            this.isInitialized = false;
            console.log('💰 Debt Module destroyed');
        }
    };

    // Register module with SidekickModules
    if (typeof window.SidekickModules === 'undefined') {
        window.SidekickModules = {};
    }
    window.SidekickModules.Debt = DebtModule;

    // Debug: Log registration status
    console.log("✅ Debt Module loaded and ready");
    console.log("🔍 Debug: SidekickModules.Debt available:", !!window.SidekickModules.Debt);
    console.log("🔍 Debug: Available modules:", Object.keys(window.SidekickModules));

    // Alert System Methods
    DebtModule.getEntryAlerts = function (entry) {
        const alerts = [];
        const now = new Date();

        // Due date alerts
        if (entry.dueDate) {
            const dueDate = new Date(entry.dueDate);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            if (daysUntilDue < 0) {
                alerts.push({
                    type: 'overdue',
                    severity: 'high',
                    message: `${entry.isDebt ? 'Debt' : 'Loan'} is ${Math.abs(daysUntilDue)} days overdue!`,
                    icon: '🔴',
                    entry: entry
                });
            } else if (daysUntilDue <= 3) {
                alerts.push({
                    type: 'due_soon',
                    severity: 'medium',
                    message: `${entry.isDebt ? 'Debt' : 'Loan'} due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
                    icon: '🟡',
                    entry: entry
                });
            } else if (daysUntilDue <= 7) {
                alerts.push({
                    type: 'due_week',
                    severity: 'low',
                    message: `${entry.isDebt ? 'Debt' : 'Loan'} due in ${daysUntilDue} days`,
                    icon: '🟠',
                    entry: entry
                });
            }
        }

        // Player activity alert (if we have last_action data)
        if (entry.lastAction) {
            const lastSeen = new Date(entry.lastAction * 1000);
            const daysSinceLastSeen = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));

            if (daysSinceLastSeen >= 7) {
                alerts.push({
                    type: 'player_inactive',
                    severity: 'low',
                    message: `Player last seen ${daysSinceLastSeen} days ago`,
                    icon: '😴',
                    entry: entry
                });
            }
        }

        return alerts;
    };

    DebtModule.getAllAlerts = function () {
        const allAlerts = [];
        this.debtsAndLoans.forEach(entry => {
            const entryAlerts = this.getEntryAlerts(entry);
            allAlerts.push(...entryAlerts);
        });
        return allAlerts;
    };

    DebtModule.showEntryAlertsDialog = function (entryId) {
        const entry = this.debtsAndLoans.find(e => e.id === entryId);
        if (!entry) return;

        const alerts = this.getEntryAlerts(entry);

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c1810, #3d2317);
            border: 2px solid #8b4513;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            z-index: 9999999;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        dialog.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid #666;">
                <h3 style="margin: 0; color: #fff; font-size: 16px;">🚨 Alerts for ${entry.playerName}</h3>
                <button id="alert-dialog-close" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #d32f2f;
                    border: none;
                    color: #fff;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">×</button>
            </div>
            
            <div style="padding: 15px;">
                ${alerts.length > 0 ? alerts.map(alert => `
                    <div style="
                        margin-bottom: 10px;
                        padding: 10px;
                        border-radius: 5px;
                        background: ${alert.severity === 'high' ? 'rgba(244, 67, 54, 0.2)' : alert.severity === 'medium' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(76, 175, 80, 0.2)'};
                        border-left: 3px solid ${alert.severity === 'high' ? '#f44336' : alert.severity === 'medium' ? '#ff9800' : '#4caf50'};
                        color: #fff;
                    ">
                        <div style="font-size: 14px; font-weight: bold;">${alert.icon} ${alert.message}</div>
                        <div style="font-size: 11px; color: #ccc; margin-top: 5px;">${alert.type.replace('_', ' ').toUpperCase()}</div>
                    </div>
                `).join('') : '<div style="color: #ccc; text-align: center; padding: 20px;">No alerts for this entry</div>'}
            </div>
        `;

        document.body.appendChild(dialog);

        const closeBtn = dialog.querySelector('#alert-dialog-close');
        const closeDialog = () => dialog.remove();

        closeBtn?.addEventListener('click', closeDialog);

        // Close on outside click - DISABLED to prevent accidental closes
        // setTimeout(() => {
        //     const closeOnClickOutside = (e) => {
        //         if (!dialog.contains(e.target)) {
        //             closeDialog();
        //             document.removeEventListener('click', closeOnClickOutside);
        //         }
        //     };
        //     document.addEventListener('click', closeOnClickOutside);
        // }, 100);
    };

    DebtModule.startAlertMonitoring = function () {
        // Check alerts every 60 seconds
        this.alertCheckInterval = setInterval(() => {
            this.checkAndUpdateAlerts();
        }, 60000);

        // Initial check
        this.checkAndUpdateAlerts();
    };

    DebtModule.stopAlertMonitoring = function () {
        if (this.alertCheckInterval) {
            clearInterval(this.alertCheckInterval);
            this.alertCheckInterval = null;
        }
    };

    DebtModule.checkAndUpdateAlerts = async function () {
        // Update player activity data for entries that need it
        for (const entry of this.debtsAndLoans) {
            if (entry.playerId && (!entry.lastAction || (Date.now() - (entry.lastActionFetched || 0) > 24 * 60 * 60 * 1000))) {
                try {
                    await this.updatePlayerActivity(entry.playerId, entry.id);
                } catch (error) {
                    console.log(`💰 Could not update activity for player ${entry.playerId}:`, error);
                }
            }
        }

        // Refresh UI if needed
        if (this.isDebtTrackerOpen) {
            this.renderAllDebtPanels();
        }
    };

    DebtModule.updatePlayerActivity = async function (playerId, entryId) {
        try {
            // Use Core module's makeApiCall if available
            const apiMethod = window.SidekickModules?.Core?.makeApiCall || this.makeApiCall?.bind(this);
            if (!apiMethod) {
                console.log('💰 No API method available for player activity update');
                return;
            }

            const data = await apiMethod(`user/${playerId}?selections=profile`, 'GET');

            if (data && data.last_action) {
                const entryIndex = this.debtsAndLoans.findIndex(e => e.id === entryId);
                if (entryIndex !== -1) {
                    this.debtsAndLoans[entryIndex].lastAction = data.last_action.timestamp;
                    this.debtsAndLoans[entryIndex].lastActionFetched = Date.now();
                    this.saveDebtsAndLoans();
                    console.log(`💰 Updated activity for ${this.debtsAndLoans[entryIndex].playerName}: last seen ${new Date(data.last_action.timestamp * 1000).toLocaleDateString()}`);
                }
            }
        } catch (error) {
            console.log(`💰 Failed to fetch activity for player ${playerId}:`, error);
        }
    };

    // Make sure functions are accessible
    setTimeout(() => {
        console.log("🔍 Debug: Debt module functions available:");
        console.log("  - testPaymentDetection:", typeof window.SidekickModules.Debt.testPaymentDetection);
        console.log("  - searchAllLogsForPayments:", typeof window.SidekickModules.Debt.searchAllLogsForPayments);
        console.log("  - checkForPayments:", typeof window.SidekickModules.Debt.checkForPayments);
        console.log("  - debtsAndLoans:", !!window.SidekickModules.Debt.debtsAndLoans);
    }, 2000);

    // Create a global debug function for easier access
    window.debugDebtModule = function () {
        console.log("🔍 Debt Module Debug Information:");
        console.log("  SidekickModules exists:", typeof window.SidekickModules);
        console.log("  Available modules:", window.SidekickModules ? Object.keys(window.SidekickModules) : 'none');
        console.log("  Debt module exists:", !!window.SidekickModules?.Debt);

        if (window.SidekickModules?.Debt) {
            console.log("  Functions available:");
            console.log("    testPaymentDetection:", typeof window.SidekickModules.Debt.testPaymentDetection);
            console.log("    searchAllLogsForPayments:", typeof window.SidekickModules.Debt.searchAllLogsForPayments);
            console.log("    checkForPayments:", typeof window.SidekickModules.Debt.checkForPayments);
            console.log("  Current debts/loans:", window.SidekickModules.Debt.debtsAndLoans);
        }
    };

    // Create direct access functions for testing
    window.testDebtPaymentDetection = function () {
        if (window.SidekickModules?.Debt) {
            return window.SidekickModules.Debt.testPaymentDetection();
        } else {
            console.error("❌ Debt module not available");
        }
    };

    window.searchAllLogsForPayments = function () {
        if (window.SidekickModules?.Debt) {
            return window.SidekickModules.Debt.searchAllLogsForPayments();
        } else {
            console.error("❌ Debt module not available");
        }
    };

    window.checkDebtPayments = function () {
        if (window.SidekickModules?.Debt) {
            return window.SidekickModules.Debt.checkForPayments();
        } else {
            console.error("❌ Debt module not available");
        }
    };

    window.testBackgroundConnection = function () {
        if (window.SidekickModules?.Debt) {
            return window.SidekickModules.Debt.testBackgroundConnection();
        } else {
            console.error("❌ Debt module not available");
        }
    };

})();