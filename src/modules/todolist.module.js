/**
 * Sidekick Chrome Extension - Todo List Module
 * Enhanced todo list with API integration for automatic task completion tracking
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("📋 Loading Sidekick Todo List Module...");

    const TodoListModule = {
        isInitialized: false,
        todoLists: [],
        lastResetDate: null,
        dailyResetInterval: null,
        apiCheckInterval: null,

        // Daily task tracking with API integration
        dailyTasks: {
            energyRefill: {
                name: 'Energy Refill',
                icon: '⚡',
                color: '#4ECDC4',
                description: 'Daily energy refill',
                detectFromLogs: true,
                logPatterns: [
                    /energy.*?(refill|drink|can)/i,
                    /(refill|drink|can).*?energy/i,
                    /you.*?(used|consumed|drank).*?energy/i,
                    /energy.*?(used|consumed|active)/i,
                    /\benergy\s*(drink|refill|can)\b/i,
                    /\benergy\s*drink\b/i,
                    /\brefill\s*energy\b/i,
                    /consumed.*?energy/i,
                    /drank.*?energy/i,
                    /used.*?energy.*?(can|drink|refill)/i,
                    /gained.*?energy/i
                ],
                completed: false,
                resetDaily: true // Ensure this always resets at midnight UTC
            },
            nerveRefill: {
                name: 'Nerve Refill',
                icon: '🧠',
                color: '#45B7D1',
                description: 'Daily nerve refill',
                detectFromLogs: true,
                logPatterns: [
                    /nerve.*?(refill|pill)/i,
                    /(refill|pill).*?nerve/i,
                    /you.*?(used|consumed|took).*?nerve/i,
                    /nerve.*?(used|consumed|active)/i,
                    /\bnerve\s*(refill|pill)\b/i,
                    /\bnerve\s*pill\b/i,
                    /\brefill\s*nerve\b/i,
                    /consumed.*?nerve/i,
                    /took.*?nerve/i,
                    /used.*?nerve.*?(pill|refill)/i,
                    /gained.*?nerve/i
                ],
                completed: false,
                resetDaily: true // Ensure this always resets at midnight UTC
            },
            xanaxDose: {
                name: 'Xanax Dose',
                icon: '💊',
                color: '#E74C3C',
                description: 'Daily Xanax dose (up to 3)',
                apiField: 'xantaken',  // Use personalstats.xantaken for instant updates
                maxCount: 3,
                currentCount: 0,
                completed: false,
                resetDaily: true  // Reset baseline at midnight UTC
            }
        },

        // API baseline values for daily progress tracking
        apiBaselines: {},

        // Initialize the todo list module
        async init() {
            if (this.isInitialized) {
                console.log("📋 Todo List Module already initialized");
                return;
            }

            console.log("📋 Initializing Todo List Module...");

            try {
                await this.loadTodoLists();
                await this.loadDailyTasks();

                // ALWAYS check for reset on initialization - this handles reconnection scenarios
                console.log("📋 Checking for daily reset on initialization...");
                this.checkForDailyReset();

                this.startDailyResetTimer();
                this.startApiCheckInterval();
                this.isInitialized = true;
                console.log("✅ Todo List Module initialized successfully");
            } catch (error) {
                console.error("❌ Todo List Module initialization failed:", error);
            }
        },

        // Load todo lists from Chrome storage
        async loadTodoLists() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_todolists');
                if (saved && Array.isArray(saved)) {
                    this.todoLists = saved;
                    console.log("✅ Loaded", this.todoLists.length, "todo lists from Chrome storage");
                } else {
                    this.todoLists = [];
                    console.log("📭 No saved todo lists found in Chrome storage");
                }
            } catch (error) {
                console.error('Failed to load todo lists from Chrome storage:', error);
                this.todoLists = [];
            }
        },

        // Load daily tasks state
        async loadDailyTasks() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_dailytasks');
                const lastReset = await window.SidekickModules.Core.ChromeStorage.get('sidekick_dailytasks_reset');

                console.log("📋 Loading daily tasks...");
                console.log("📋 Saved data:", saved);
                console.log("📋 Last reset:", lastReset);

                const now = new Date();
                console.log("📋 Current time:", now.toISOString());

                if (saved && lastReset) {
                    const lastResetDate = new Date(lastReset);

                    // Calculate today's UTC date (00:00:00)
                    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

                    // Calculate last reset's UTC date (00:00:00)
                    const lastResetUTC = new Date(Date.UTC(lastResetDate.getUTCFullYear(), lastResetDate.getUTCMonth(), lastResetDate.getUTCDate()));

                    console.log("📋 Today UTC midnight:", todayUTC.toISOString());
                    console.log("📋 Last reset UTC midnight:", lastResetUTC.toISOString());
                    console.log("📋 Same day?", todayUTC.getTime() === lastResetUTC.getTime());

                    if (todayUTC.getTime() !== lastResetUTC.getTime()) {
                        console.log("🔄 Daily reset needed - clearing daily tasks (different day detected)");
                        console.log("🔄 Time difference:", (todayUTC.getTime() - lastResetUTC.getTime()) / (1000 * 60 * 60), "hours");

                        // Force reset immediately and save the reset state
                        this.resetDailyTasksData();
                        await this.saveDailyTasks();

                        console.log("📋 Reset applied and saved - all tasks are now incomplete");
                    } else {
                        // Same day - load saved data and preserve state
                        for (const taskKey in this.dailyTasks) {
                            if (saved[taskKey]) {
                                // Preserve the saved state while keeping the task structure
                                Object.assign(this.dailyTasks[taskKey], saved[taskKey]);

                                // Validate completed state for tasks with maxCount (like xanax)
                                const task = this.dailyTasks[taskKey];
                                if (task.maxCount !== undefined) {
                                    const currentCount = task.currentCount || 0;
                                    const shouldBeCompleted = currentCount >= task.maxCount;
                                    if (task.completed !== shouldBeCompleted) {
                                        console.log(`🔧 Fixing ${task.name}: completed=${task.completed} but count is ${currentCount}/${task.maxCount}, setting to ${shouldBeCompleted}`);
                                        task.completed = shouldBeCompleted;
                                    }
                                }
                            }
                        }
                        this.lastResetDate = lastResetDate;

                        // Load API baselines for daily progress tracking
                        const savedBaselines = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_baselines');
                        if (savedBaselines) {
                            this.apiBaselines = savedBaselines;
                            console.log('💊 Loaded API baselines from storage:', this.apiBaselines);
                        } else {
                            console.log('💊 No saved API baselines found');
                        }

                        console.log("✅ Loaded daily tasks from Chrome storage (same day):", this.dailyTasks);

                        // Log the current completion state for debugging
                        for (const [taskKey, task] of Object.entries(this.dailyTasks)) {
                            const countInfo = task.maxCount ? ` (${task.currentCount || 0}/${task.maxCount})` : '';
                            console.log(`📋 ${task.name}: completed=${task.completed}${countInfo}`);
                        }
                    }
                } else {
                    console.log("📭 No saved daily tasks found, using defaults");
                    this.lastResetDate = null; // This will trigger a reset check
                }
            } catch (error) {
                console.error('Failed to load daily tasks from Chrome storage:', error);
            }
        },

        // Save todo lists to Chrome storage
        async saveTodoLists() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_todolists', this.todoLists);
                console.log('💾 Todo lists saved successfully to Chrome storage');
            } catch (error) {
                console.error('Failed to save todo lists to Chrome storage:', error);
            }
        },

        // Save daily tasks state
        async saveDailyTasks() {
            try {
                // Create a clean copy of daily tasks to save
                const dataToSave = {};
                for (const [taskKey, task] of Object.entries(this.dailyTasks)) {
                    dataToSave[taskKey] = {
                        ...task,
                        // Ensure boolean values are properly saved
                        completed: Boolean(task.completed),
                        currentCount: task.currentCount || 0
                    };
                }

                await window.SidekickModules.Core.ChromeStorage.set('sidekick_dailytasks', dataToSave);
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_dailytasks_reset', this.lastResetDate?.toISOString() || new Date().toISOString());
                // Save API baselines for daily progress tracking
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_baselines', this.apiBaselines);

                console.log('💾 Daily tasks saved successfully to Chrome storage');
                console.log('💾 Saved data:', dataToSave);

                // Verify the save worked by reading it back
                setTimeout(async () => {
                    const verification = await window.SidekickModules.Core.ChromeStorage.get('sidekick_dailytasks');
                    console.log('🔍 Verification - saved daily tasks:', verification);
                }, 100);

            } catch (error) {
                console.error('Failed to save daily tasks to Chrome storage:', error);
            }
        },

        // Reset daily tasks data only (no UI refresh)
        async resetDailyTasksData() {
            console.log("🔄 Resetting daily tasks data");

            // Force reset ALL tasks to incomplete state
            for (const taskKey in this.dailyTasks) {
                const task = this.dailyTasks[taskKey];

                console.log(`🔄 Resetting task: ${task.name} (was completed: ${task.completed})`);
                task.completed = false;

                if (task.currentCount !== undefined) {
                    task.currentCount = 0;
                }
                if (task.baseline !== undefined) {
                    task.baseline = 0;
                }
            }

            // Clear ALL API baselines - will be re-established on next API check
            this.apiBaselines = {};
            console.log("🧹 Cleared all API baselines - will be re-established on next API check");

            // Set last reset date to current UTC date (not time)
            const now = new Date();
            this.lastResetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

            console.log("✅ Daily tasks data reset complete for:", this.lastResetDate.toISOString());
            console.log("🔄 All daily tasks reset to incomplete state (0/max)");

            await this.saveDailyTasks();
        },


        // Reset daily tasks at UTC midnight
        async resetDailyTasks() {
            await this.resetDailyTasksData();
            await this.saveDailyTasks();

            // Force immediate UI refresh for all open todo lists
            console.log('🔄 Refreshing todo list UI after reset');
            setTimeout(() => {
                this.renderAllTodoLists();
                // Force refresh of all todo list windows
                this.todoLists.forEach(todoList => {
                    const element = document.getElementById(`sidekick-todolist-${todoList.id}`);
                    if (element) {
                        const content = element.querySelector('.tasks-container');
                        if (content) {
                            content.innerHTML = this.renderTasksContent(todoList);
                            this.setupTaskEventListeners(element, todoList);
                        }
                    }
                });
            }, 100);

            console.log('✅ Daily tasks reset complete for:', this.lastResetDate.toISOString());
            console.log('🔄 All daily tasks reset to incomplete state');
        },

        // Start daily reset timer to check for UTC midnight
        startDailyResetTimer() {
            // Check every minute for daily reset and custom task resets
            this.dailyResetInterval = setInterval(() => {
                this.checkForDailyReset();
                this.checkCustomTaskResets();
            }, 60000); // Check every minute

            console.log('⏰ Daily reset timer started');
        },

        // Check if daily reset is needed (proper UTC midnight detection)
        checkForDailyReset() {
            const now = new Date();
            const currentUTCDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

            console.log("🔄 Checking for daily reset...");
            console.log("🔄 Current time:", now.toISOString());
            console.log("🔄 Current UTC date:", currentUTCDate.toISOString());
            console.log("🔄 Last reset date:", this.lastResetDate ? new Date(this.lastResetDate).toISOString() : 'null');

            if (this.lastResetDate) {
                const lastReset = new Date(this.lastResetDate);
                const lastResetUTCDate = new Date(Date.UTC(lastReset.getUTCFullYear(), lastReset.getUTCMonth(), lastReset.getUTCDate()));

                console.log("🔄 Last reset UTC date:", lastResetUTCDate.toISOString());
                console.log("🔄 Time comparison:", {
                    currentUTCTime: currentUTCDate.getTime(),
                    lastResetUTCTime: lastResetUTCDate.getTime(),
                    difference: currentUTCDate.getTime() - lastResetUTCDate.getTime(),
                    differenceHours: (currentUTCDate.getTime() - lastResetUTCDate.getTime()) / (1000 * 60 * 60)
                });

                // Compare UTC dates - if current UTC date is different from last reset UTC date, we need to reset
                if (currentUTCDate.getTime() !== lastResetUTCDate.getTime()) {
                    console.log('🔄 UTC midnight passed - resetting daily tasks');
                    console.log(`🔄 Last reset: ${lastResetUTCDate.toISOString()}`);
                    console.log(`🔄 Current UTC: ${currentUTCDate.toISOString()}`);
                    console.log(`🔄 Hours since last reset: ${(currentUTCDate.getTime() - lastResetUTCDate.getTime()) / (1000 * 60 * 60)}`);

                    this.resetDailyTasks();

                    // Show notification to user
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification(
                            'INFO',
                            'Daily tasks have been reset for the new day!'
                        );
                    }
                } else {
                    console.log('✅ No daily reset needed - same UTC day');
                }
            } else {
                // First time - set the reset date to current UTC date
                console.log('⏰ First time setup - setting initial daily reset date');
                this.lastResetDate = currentUTCDate;
                this.saveDailyTasks();
                console.log('⏰ Initial daily reset date set:', currentUTCDate.toISOString());
            }
        },

        // Check and reset custom tasks based on their reset duration
        checkCustomTaskResets() {
            let hasUpdates = false;
            const now = new Date();

            for (const todoList of this.todoLists) {
                for (const task of todoList.tasks) {
                    if (task.completed && task.completedAt && task.resetDuration && task.resetDuration !== 'never') {
                        const completedTime = new Date(task.completedAt);
                        const resetMs = this.parseResetDuration(task.resetDuration);

                        if (resetMs > 0 && (now.getTime() - completedTime.getTime()) >= resetMs) {
                            task.completed = false;
                            task.completedAt = null;
                            todoList.modified = new Date().toISOString();
                            hasUpdates = true;
                            console.log(`🔄 Auto-reset task "${task.name}" after ${task.resetDuration}`);
                        }
                    }
                }
            }

            if (hasUpdates) {
                this.saveTodoLists();
                this.renderAllTodoLists();
            }
        },

        // Parse reset duration string to milliseconds
        parseResetDuration(duration) {
            const match = duration.match(/^(\d+)([hd])$/);
            if (!match) return 0;

            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 'h': return value * 60 * 60 * 1000; // hours to ms
                case 'd': return value * 24 * 60 * 60 * 1000; // days to ms
                default: return 0;
            }
        },

        // Start API check interval for automatic task completion
        startApiCheckInterval() {
            // Initialize failure counter
            this.apiCheckFailureCount = 0;

            // Do an immediate check
            setTimeout(() => {
                this.checkApiForCompletedTasks();
            }, 2000); // Wait 2 seconds for initialization to complete

            // Check API with adaptive interval based on failures
            this.apiCheckInterval = setInterval(async () => {
                // Adaptive interval: increase delay after failures
                const baseInterval = 60000; // 1 minute
                const failureMultiplier = Math.min(this.apiCheckFailureCount || 0, 5); // Max 5x delay
                const actualInterval = baseInterval * (1 + failureMultiplier);

                if (failureMultiplier > 0) {
                    console.log(`⚠️ Using longer interval due to failures: ${actualInterval / 1000}s`);
                }

                await this.checkApiForCompletedTasks();

                // Reset failure count on successful check (will be reset in success case)
                if (this.apiCheckFailureCount > 0) {
                    // This will be decremented in the success case
                    this.apiCheckFailureCount = Math.max(0, this.apiCheckFailureCount - 0.5);
                }
            }, 60000); // Base interval of 1 minute

            console.log('🔍 API check interval started (adaptive timing based on success rate)');
        },

        // Check Torn API for completed daily tasks
        async checkApiForCompletedTasks() {
            try {
                // Get API key using Settings module
                let apiKey;
                let attempts = 0;
                while (attempts < 10 && !apiKey) {
                    try {
                        if (window.SidekickModules?.Settings?.getApiKey) {
                            apiKey = await window.SidekickModules.Settings.getApiKey();
                        }
                    } catch (error) {
                        console.log('⚠️ Waiting for Settings module...');
                    }
                    if (!apiKey) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    }
                }

                if (!apiKey) {
                    console.log('⚠️ No API key available for daily task checking');
                    return;
                }

                console.log('🔍 Checking Torn API for daily task updates...');

                // Try background script approach first (better for CORS issues)
                if (window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid()) {
                    try {
                        console.log('📡 Attempting API call via background script...');
                        const backgroundResult = await this.makeApiCallViaBackground(apiKey);
                        if (backgroundResult.success) {
                            console.log('✅ Background API call successful');
                            this.updateTasksFromApi(
                                backgroundResult.personalstats,
                                backgroundResult.logs,
                                backgroundResult.bars,
                                backgroundResult.cooldowns,
                                backgroundResult.refills  // Pass refills data from background
                            );
                            this.apiCheckFailureCount = 0;
                            return;
                        }
                    } catch (bgError) {
                        if (bgError.message.includes('Extension context invalidated')) {
                            console.warn('📋 Extension context invalidated, showing notification');
                            window.SidekickModules?.Core?.SafeMessageSender?.showExtensionReloadNotification();
                            return;
                        } else {
                            console.log('⚠️ Background script API failed, trying direct fetch...', bgError.message);
                        }
                    }
                }

                // Fallback to direct fetch with better error handling
                await this.makeDirectApiCall(apiKey);

            } catch (error) {
                console.error('❌ Error checking API for daily tasks:', error);
                this.handleApiError(error);
            }
        },

        // Make API call via background script (avoids CORS issues)
        async makeApiCallViaBackground(apiKey) {
            try {
                // Check if extension context is valid first
                if (!window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid()) {
                    throw new Error('Extension context invalidated - please refresh page');
                }

                const response = await window.SidekickModules.Core.SafeMessageSender.sendToBackground({
                    action: 'fetchTornApi',
                    apiKey: apiKey,
                    selections: ['personalstats', 'logs', 'bars', 'cooldowns', 'refills']
                });

                return response;

            } catch (error) {
                if (error.message.includes('Extension context invalidated')) {
                    console.warn('📋 Extension context lost during API call');
                    window.SidekickModules?.Core?.SafeMessageSender?.showExtensionReloadNotification();
                }
                throw error;
            }
        },

        // Make direct API call (fallback method)
        async makeDirectApiCall(apiKey) {
            // Add timeout and better error handling for API calls
            const fetchWithTimeout = async (url, timeout = 10000) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                try {
                    const response = await fetch(url, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Sidekick Chrome Extension'
                        }
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    return response;
                } catch (error) {
                    clearTimeout(timeoutId);
                    throw error;
                }
            };

            // Get user data with personalstats for daily tracking
            let personalStatsData = null;
            let logData = null;
            let barsData = null;
            let cooldownsData = null;

            try {
                console.log('📊 Fetching personal stats...');
                const personalStatsResponse = await fetchWithTimeout(`https://api.torn.com/user?selections=personalstats&key=${apiKey}`);
                personalStatsData = await personalStatsResponse.json();
                console.log('✅ Personal stats received');
            } catch (error) {
                console.error('❌ Failed to fetch personal stats:', error.message);
                throw error; // Re-throw to be handled by main error handler
            }

            try {
                console.log('📊 Fetching bars data...');
                const barsResponse = await fetchWithTimeout(`https://api.torn.com/user?selections=bars&key=${apiKey}`);
                barsData = await barsResponse.json();
                console.log('✅ Bars data received');
            } catch (error) {
                console.error('❌ Failed to fetch bars data:', error.message);
                // Don't throw here, continue with other data
            }

            try {
                console.log('📊 Fetching cooldowns data...');
                const cooldownsResponse = await fetchWithTimeout(`https://api.torn.com/user?selections=cooldowns&key=${apiKey}`);
                cooldownsData = await cooldownsResponse.json();
                console.log('✅ Cooldowns data received');
            } catch (error) {
                console.error('❌ Failed to fetch cooldowns data:', error.message);
                // Don't throw here, continue with other data
            }

            try {
                console.log('📋 Fetching log data...');
                const logResponse = await fetchWithTimeout(`https://api.torn.com/user?selections=log&key=${apiKey}`);
                logData = await logResponse.json();
                console.log('✅ Log data received');
            } catch (error) {
                console.error('❌ Failed to fetch log data:', error.message);
                // Don't throw here, continue with other data
            }

            // NEW: Fetch refills data (most important for daily tasks!)
            let refillsData = null;
            try {
                console.log('💊 Fetching refills data...');
                const refillsResponse = await fetchWithTimeout(`https://api.torn.com/user?selections=refills&key=${apiKey}`);
                refillsData = await refillsResponse.json();
                console.log('✅ Refills data received:', refillsData);
            } catch (error) {
                console.error('❌ Failed to fetch refills data:', error.message);
                // Don't throw here, continue with other data
            }

            // Process data if we got anything
            if (personalStatsData && !personalStatsData.error && personalStatsData.personalstats) {
                console.log('📊 Processing personal stats data');
                this.updateTasksFromApi(
                    personalStatsData.personalstats,
                    logData?.log,
                    barsData?.bars,
                    cooldownsData?.cooldowns,
                    refillsData?.refills  // Pass refills data
                );

                // Reset failure count on successful API call
                this.apiCheckFailureCount = 0;
            } else if (personalStatsData && personalStatsData.error) {
                console.error('❌ API Error in personal stats:', personalStatsData.error);

                // Handle specific API errors
                if (personalStatsData.error.code === 2) {
                    console.error('🔑 Invalid API key - please check your settings');
                } else if (personalStatsData.error.code === 5) {
                    console.error('⏱️ API rate limit exceeded - will retry later');
                }

                throw new Error(`API Error ${personalStatsData.error.code}: ${personalStatsData.error.error}`);
            } else {
                console.log('ℹ️ No valid personal stats data received - skipping update');
            }
        },

        // Check if refills are actually available and override completed state if needed
        checkRefillAvailability(barsData, cooldownsData) {
            console.log('🔍 Checking refill availability...');

            // Note: Energy and nerve refills are DAILY POINT PURCHASES (30 points each)
            // that reset at midnight UTC regardless of current levels or cooldowns

            if (!barsData) {
                console.log('⚠️ Missing bars data for refill availability check');
                return false;
            }

            let hasAvailabilityChanges = false;

            // Removed automatic completion state overrides
            // Daily tasks should only be marked complete through:
            // 1. Manual user interaction (checking the box)
            // 2. Log detection (when the action is actually performed)
            // 3. Daily reset at midnight UTC (which clears all completed states)

            console.log('📊 Bars data received - daily tasks rely on manual completion and daily reset');
            return false; // No automatic changes needed
        },

        // Check if energy refill can be purchased (daily 30-point purchase)
        canPurchaseEnergyRefill(barsData) {
            try {
                console.log('⚡ DEBUG: Full barsData structure:', JSON.stringify(barsData, null, 2));

                // Energy refill is a daily purchase with points (30 points)
                // It's available once per day regardless of current energy level or cooldowns
                // We need to check if the purchase has been made today

                // The only way to know if it's been purchased is through the refill counter
                // If the bars data includes refill information, use that
                if (barsData?.refill) {
                    const energyRefillsUsed = barsData.refill.energy || 0;
                    console.log(`⚡ Energy refills used today: ${energyRefillsUsed}/1`);

                    // Can purchase if we haven't used our daily refill yet
                    return energyRefillsUsed < 1;
                }

                // Check for other possible refill indicators in the API data
                if (barsData?.energy?.refill_used !== undefined) {
                    console.log(`⚡ Alternative: energy.refill_used = ${barsData.energy.refill_used}`);
                    return !barsData.energy.refill_used;
                }

                // If we don't have refill data, we need to rely on other methods
                // Check if there's any indication in the bars data about available refills
                console.log('⚡ No refill counter data available - checking other indicators');
                console.log('⚡ Available energy properties:', Object.keys(barsData?.energy || {}));

                // For now, since we can't definitively determine, let the reset system handle it
                // The daily reset should clear these tasks at midnight UTC
                console.log('⚡ Cannot determine purchase status - relying on daily reset system');
                return false; // Don't override completed state if we can't determine

            } catch (error) {
                console.error('⚡ Error checking energy refill purchase availability:', error);
                return false; // Don't override on error
            }
        },

        // Check if nerve refill can be purchased (daily 30-point purchase)
        canPurchaseNerveRefill(barsData) {
            try {
                console.log('🧠 DEBUG: Full barsData structure:', JSON.stringify(barsData, null, 2));

                // Nerve refill is a daily purchase with points (30 points)
                // It's available once per day regardless of current nerve level or cooldowns
                // We need to check if the purchase has been made today

                // The only way to know if it's been purchased is through the refill counter
                // If the bars data includes refill information, use that
                if (barsData?.refill) {
                    const nerveRefillsUsed = barsData.refill.nerve || 0;
                    console.log(`🧠 Nerve refills used today: ${nerveRefillsUsed}/1`);

                    // Can purchase if we haven't used our daily refill yet
                    return nerveRefillsUsed < 1;
                }

                // Check for other possible refill indicators in the API data
                if (barsData?.nerve?.refill_used !== undefined) {
                    console.log(`🧠 Alternative: nerve.refill_used = ${barsData.nerve.refill_used}`);
                    return !barsData.nerve.refill_used;
                }

                // If we don't have refill data, we need to rely on other methods
                // Check if there's any indication in the bars data about available refills
                console.log('🧠 No refill counter data available - checking other indicators');
                console.log('🧠 Available nerve properties:', Object.keys(barsData?.nerve || {}));

                // For now, since we can't definitively determine, let the reset system handle it
                // The daily reset should clear these tasks at midnight UTC
                console.log('🧠 Cannot determine purchase status - relying on daily reset system');
                return false; // Don't override completed state if we can't determine

            } catch (error) {
                console.error('🧠 Error checking nerve refill purchase availability:', error);
                return false; // Don't override on error
            }
        },

        // Handle API errors consistently
        handleApiError(error) {
            // Check if it's a network error
            if (error.name === 'AbortError') {
                console.error('🕐 API request timed out');
            } else if (error.message.includes('Failed to fetch')) {
                console.error('🌐 Network error - check internet connection or API permissions');
            } else if (error.message.includes('CORS')) {
                console.error('🚫 CORS error - browser blocking request');
            }

            // Increment failure counter
            if (this.apiCheckFailureCount) {
                this.apiCheckFailureCount++;
            } else {
                this.apiCheckFailureCount = 1;
            }

            // If we've had multiple failures, increase retry interval
            if (this.apiCheckFailureCount > 3) {
                console.log('⚠️ Multiple API failures detected - reducing check frequency');
            }
        },

        // Update daily task completion based on API data
        updateTasksFromApi(personalstats, logData = null, barsData = null, cooldownsData = null, refillsData = null) {
            let hasUpdates = false;

            // Store API data for debugging
            this.lastApiData = {
                personalstats,
                logs: logData,
                bars: barsData,
                cooldowns: cooldownsData,
                refills: refillsData
            };

            console.log('📋 Updating tasks from API data...');
            console.log('📋 Available data:', {
                personalstats: !!personalstats,
                logData: !!logData,
                barsData: !!barsData,
                cooldownsData: !!cooldownsData,
                refillsData: !!refillsData
            });

            // 🆕 PRIORITY: Initialize xantaken baseline if not set
            // 🆕 CRITICAL: Xanax tracking via lifetime xantaken stat
            // xantaken is a CUMULATIVE stat that never resets in Torn
            // We track daily usage by comparing current value to baseline (set at midnight)
            if (typeof personalstats?.xantaken === 'number') {
                const currentXan = personalstats.xantaken;

                // If no baseline exists (after reset), establish it now
                if (this.apiBaselines.xantaken === undefined) {
                    console.log('💊 Establishing new xantaken baseline:', currentXan);
                    this.apiBaselines.xantaken = currentXan;
                    this.saveDailyTasks();
                }

                const baselineXan = this.apiBaselines.xantaken;
                const xanUsedToday = Math.max(0, currentXan - baselineXan);
                const xanClamped = Math.min(3, xanUsedToday);

                const xanTask = this.dailyTasks.xanaxDose;

                console.log(`💊 Xanax calculation: current=${currentXan}, baseline=${baselineXan}, used today=${xanUsedToday}, clamped=${xanClamped}`);

                if (xanTask.currentCount !== xanClamped || xanTask.completed !== (xanClamped >= 3)) {
                    xanTask.currentCount = xanClamped;
                    xanTask.completed = xanClamped >= 3;
                    hasUpdates = true;
                    console.log(`💊 Updated Xanax: ${xanClamped}/3 (total lifetime: ${currentXan}, baseline: ${baselineXan}, used today: ${xanUsedToday})`);
                } else {
                    console.log(`💊 Xanax status confirmed: ${xanClamped}/3 (lifetime: ${currentXan}, baseline: ${baselineXan})`);
                }
            }

            // 🆕 PRIORITY: Check refills data first (most reliable method)
            if (refillsData) {
                console.log('💊 Processing refills data from API:', refillsData);

                // Energy Refill - Direct from API
                if (typeof refillsData.energy_refill_used === 'boolean') {
                    const energyTask = this.dailyTasks.energyRefill;
                    const wasCompleted = energyTask.completed;
                    energyTask.completed = refillsData.energy_refill_used;

                    if (wasCompleted !== energyTask.completed) {
                        hasUpdates = true;
                        console.log(`⚡ Updated Energy Refill from API: ${energyTask.completed ? '✅ USED' : '❌ NOT USED'}`);
                    } else {
                        console.log(`⚡ Energy Refill status confirmed: ${energyTask.completed ? '✅ USED' : '❌ NOT USED'}`);
                    }
                }

                // Nerve Refill - Direct from API
                if (typeof refillsData.nerve_refill_used === 'boolean') {
                    const nerveTask = this.dailyTasks.nerveRefill;
                    const wasCompleted = nerveTask.completed;
                    nerveTask.completed = refillsData.nerve_refill_used;

                    if (wasCompleted !== nerveTask.completed) {
                        hasUpdates = true;
                        console.log(`🧠 Updated Nerve Refill from API: ${nerveTask.completed ? '✅ USED' : '❌ NOT USED'}`);
                    } else {
                        console.log(`🧠 Nerve Refill status confirmed: ${nerveTask.completed ? '✅ USED' : '❌ NOT USED'}`);
                    }
                }

                console.log('✅ Refills data processed successfully from dedicated API endpoint');
            } else {
                console.log('⚠️ No refills data available - falling back to log detection');
            }

            // Add debug function to global console for easy access
            // Debug functions are now handled by injection method above
            if (typeof window !== 'undefined') {
                console.log('💊 Debug functions available via injection: debugXanaxLogs(), debugNerveRefillLogs(), debugEnergyRefillLogs()');
            }

            // First, check for actual refill availability to override completed state if needed
            this.checkRefillAvailability(barsData);

            // Get today's UTC start time for log filtering
            const todayUTCStart = new Date();
            todayUTCStart.setUTCHours(0, 0, 0, 0);
            const todayUTCStartTimestamp = Math.floor(todayUTCStart.getTime() / 1000);

            // Alternative calculation - try Torn's timezone (assuming Torn uses UTC)
            const alternativeStart = new Date();
            alternativeStart.setHours(0, 0, 0, 0); // Local timezone start
            const alternativeTimestamp = Math.floor(alternativeStart.getTime() / 1000);

            console.log(`🕐 UTC timestamp calculation:`);
            console.log(`🕐 Current time: ${new Date().toISOString()}`);
            console.log(`🕐 Today UTC start: ${todayUTCStart.toISOString()}`);
            console.log(`🕐 UTC start timestamp: ${todayUTCStartTimestamp}`);
            console.log(`🕐 Local start timestamp: ${alternativeTimestamp}`);
            console.log(`🕐 Your xanax time (19:39:17 18/11/25) would be timestamp: ${Math.floor(new Date('2025-11-18T19:39:17Z').getTime() / 1000)}`);

            for (const taskKey in this.dailyTasks) {
                const task = this.dailyTasks[taskKey];

                // Skip Energy and Nerve refills if we already processed them from refills API
                if (refillsData && (taskKey === 'energyRefill' || taskKey === 'nerveRefill')) {
                    console.log(`✅ Skipping ${task.name} - already processed from refills API endpoint`);
                    continue;
                }

                // Check if this task should be detected from logs
                if (task.detectFromLogs && task.logPatterns) {
                    console.log(`🔍 Starting ${task.name} detection from logs...`);

                    // Try both UTC and local timezone calculations
                    const countUTC = this.countItemUsageFromLogs(logData, todayUTCStartTimestamp, task.logPatterns, task.name, 'UTC');
                    const countLocal = this.countItemUsageFromLogs(logData, alternativeTimestamp, task.logPatterns, task.name, 'LOCAL');

                    // Use the higher count (in case timezone calculation is wrong)
                    const itemCount = Math.max(countUTC, countLocal);
                    console.log(`${task.icon} Final ${task.name} count: UTC=${countUTC}, Local=${countLocal}, Using=${itemCount}`);

                    if (task.maxCount) {
                        // Multi-completion task (like xanax)
                        if (itemCount !== task.currentCount) {
                            task.currentCount = itemCount;
                            task.completed = itemCount >= task.maxCount;
                            hasUpdates = true;
                            console.log(`${task.icon} Updated ${task.name}: ${itemCount}/${task.maxCount} from logs`);
                        }
                    } else {
                        // Single completion task (like refills)
                        const isCompleted = itemCount > 0;
                        if (isCompleted !== task.completed) {
                            task.completed = isCompleted;
                            hasUpdates = true;
                            console.log(`${task.icon} Updated ${task.name}: ${isCompleted ? 'completed' : 'pending'} (count: ${itemCount})`);
                        }
                    }
                    continue;
                }

                // Skip API-based tracking for tasks using log detection
                if (task.detectFromLogs) {
                    console.log(`🔍 Skipping API tracking for ${task.name} - uses log detection`);
                    continue;
                }

                // Skip xanax - it's now handled at the top with baseline system (lines 783-798)
                if (taskKey === 'xanaxDose') {
                    continue;
                }

                // Legacy handling for tasks not using log detection (kept for backward compatibility)
                let apiValue = undefined;
                let usedField = task.apiField;

                if (task.apiField && personalstats[task.apiField] !== undefined) {
                    apiValue = personalstats[task.apiField];
                } else if (task.alternativeFields) {
                    // Try alternative field names
                    for (const altField of task.alternativeFields) {
                        if (personalstats[altField] !== undefined) {
                            apiValue = personalstats[altField];
                            usedField = altField;
                            break;
                        }
                    }
                }

                if (apiValue !== undefined) {
                    console.log(`🔍 Checking ${task.name} (${usedField}): API value = ${apiValue}, current completed = ${task.completed}`);

                    // Set baseline if not already set (for cumulative fields)
                    if (task.baseline !== undefined && this.apiBaselines[usedField] === undefined) {
                        this.apiBaselines[usedField] = apiValue;
                        task.baseline = apiValue;
                        console.log(`📊 Set baseline for ${task.name} (${usedField}): ${apiValue}`);
                    }

                    if (task.maxCount) {
                        // Multi-completion task - use daily progress from baseline
                        const dailyProgress = task.baseline !== undefined ?
                            Math.max(0, apiValue - task.baseline) : apiValue;
                        const newCount = Math.min(dailyProgress, task.maxCount);
                        if (newCount !== task.currentCount) {
                            task.currentCount = newCount;
                            task.completed = newCount >= task.maxCount;
                            hasUpdates = true;
                            console.log(`📋 Updated ${task.name}: ${newCount}/${task.maxCount} (daily progress: ${dailyProgress})`);
                        }
                    } else {
                        // Single completion task - use daily progress from baseline if available
                        const dailyProgress = task.baseline !== undefined ?
                            Math.max(0, apiValue - task.baseline) : apiValue;
                        const isCompleted = dailyProgress > 0;
                        if (isCompleted !== task.completed) {
                            task.completed = isCompleted;
                            hasUpdates = true;
                            console.log(`📋 Updated ${task.name}: ${isCompleted ? 'completed' : 'pending'} (API value: ${apiValue})`);
                        }
                    }
                } else {
                    console.log(`⚠️ No valid API field found for ${task.name}. Tried: ${task.apiField}${task.alternativeFields ? ', ' + task.alternativeFields.join(', ') : ''}`);
                }
            }

            if (hasUpdates) {
                this.saveDailyTasks();
                this.renderAllTodoLists();
                console.log('✅ Daily tasks updated and saved');

                // Log current completion status for debugging
                console.log('📋 Current Daily Task Status:');
                for (const [taskKey, task] of Object.entries(this.dailyTasks)) {
                    const status = task.completed ? '✅ COMPLETED' : '❌ PENDING';
                    const count = task.maxCount ? ` (${task.currentCount || 0}/${task.maxCount})` : '';
                    console.log(`  ${task.icon} ${task.name}: ${status}${count}`);
                }
            } else {
                console.log('ℹ️ No updates needed for daily tasks');

                // Still log current status for debugging
                console.log('📋 Current Daily Task Status (no changes):');
                for (const [taskKey, task] of Object.entries(this.dailyTasks)) {
                    const status = task.completed ? '✅ COMPLETED' : '❌ PENDING';
                    const count = task.maxCount ? ` (${task.currentCount || 0}/${task.maxCount})` : '';
                    console.log(`  ${task.icon} ${task.name}: ${status}${count}`);
                }
            }
        },

        // Count item usage from logs since 00:00 UTC (generic version)
        countItemUsageFromLogs(logData, sinceTimestamp, logPatterns, itemName, timezone = 'UTC') {
            console.log(`🔍 [${timezone}] Raw logData received for ${itemName}:`, logData);
            console.log(`🔍 [${timezone}] logData type:`, typeof logData);
            console.log(`🔍 [${timezone}] logData keys:`, logData ? Object.keys(logData) : 'null');

            // Handle different log data formats from Torn API
            let logsArray = [];

            if (!logData) {
                console.log(`⚠️ [${timezone}] No log data provided for ${itemName}`);
                return 0;
            }

            if (Array.isArray(logData)) {
                // Direct array format
                logsArray = logData;
                console.log(`📊 [${timezone}] Using direct array format for ${itemName}: ${logsArray.length} entries`);
            } else if (logData.log && Array.isArray(logData.log)) {
                // Nested under 'log' property
                logsArray = logData.log;
                console.log(`📊 [${timezone}] Using nested log array for ${itemName}: ${logsArray.length} entries`);
            } else if (typeof logData === 'object') {
                // Object format - convert values to array
                logsArray = Object.values(logData);
                console.log(`📊 [${timezone}] Converting object to array for ${itemName}: ${logsArray.length} entries`);
            } else {
                console.log(`⚠️ [${timezone}] Unknown log data format for ${itemName}:`, logData);
                return 0;
            }

            if (!Array.isArray(logsArray) || logsArray.length === 0) {
                console.log(`⚠️ [${timezone}] No valid log entries found for ${itemName}`);
                return 0;
            }

            console.log(`🔍 [${timezone}] Searching logs for ${itemName} usage since timestamp: ${sinceTimestamp} (${new Date(sinceTimestamp * 1000).toISOString()})`);
            console.log(`📊 [${timezone}] Total log entries to check: ${logsArray.length}`);

            let itemCount = 0;
            let checkedEntries = 0;
            let recentEntries = [];

            // Search for item usage in logs
            for (const entry of logsArray) {
                // Ensure entry has required properties
                if (!entry || !entry.timestamp || !entry.log) {
                    continue;
                }

                // Check if log entry is from today (after cutoff timestamp)
                if (entry.timestamp < sinceTimestamp) {
                    continue; // Skip older entries
                }

                checkedEntries++;
                recentEntries.push({
                    time: new Date(entry.timestamp * 1000).toISOString(),
                    log: entry.log
                });

                console.log(`🔍 [${timezone}] Entry ${checkedEntries}: ${new Date(entry.timestamp * 1000).toISOString()} - "${entry.log}"`);

                // Look for item usage patterns in log text
                if (entry.log && typeof entry.log === 'string') {
                    const logText = entry.log;

                    // Check for numeric log codes first (new format)
                    const numericCode = parseInt(logText.trim());
                    let foundItem = false;
                    let matchedPattern = '';

                    if (!isNaN(numericCode)) {
                        // Known Torn log codes for different items
                        const itemCodes = this.getLogCodesForItem(itemName);

                        if (itemCodes.includes(numericCode)) {
                            foundItem = true;
                            matchedPattern = `Numeric Code: ${numericCode} (${itemName} usage)`;
                        }
                    }

                    // Fallback to text patterns if no numeric match (legacy format)
                    if (!foundItem && logPatterns) {
                        for (let i = 0; i < logPatterns.length; i++) {
                            const pattern = logPatterns[i];
                            if (pattern.test(logText)) {
                                foundItem = true;
                                matchedPattern = `Text Pattern ${i + 1}: ${pattern.toString()}`;
                                break;
                            }
                        }
                    }

                    if (foundItem) {
                        itemCount++;
                        console.log(`✅ [${timezone}] Found ${itemName} usage #${itemCount} - Matched: ${matchedPattern}`);
                        console.log(`✅ [${timezone}] Full log text: "${entry.log}"`);
                    }
                }
            }

            console.log(`📊 [${timezone}] ${itemName} search complete:`);
            console.log(`📊 [${timezone}] - Checked ${checkedEntries} entries since ${new Date(sinceTimestamp * 1000).toISOString()}`);
            console.log(`📊 [${timezone}] - Found ${itemCount} ${itemName} usages`);
            console.log(`📊 [${timezone}] Recent entries (last 5):`, recentEntries.slice(-5));

            if (itemCount === 0 && checkedEntries > 0) {
                console.log(`⚠️ [${timezone}] No ${itemName} found but entries exist. Sample log entries:`);
                recentEntries.slice(0, 3).forEach((entry, i) => {
                    console.log(`Sample ${i + 1}: ${entry.time} - "${entry.log}"`);
                });
            }

            return itemCount;
        },

        // Get known log codes for specific items
        getLogCodesForItem(itemName) {
            const logCodes = {
                'Xanax Dose': [
                    // Xanax usage log codes (Drug category)
                    // These are the numeric codes Torn uses for xanax consumption
                    2290, 2291, 2292  // Drug usage codes
                ],
                'Energy Refill': [
                    // Energy refill log codes (Points usage category)
                    // Based on log pattern: "You used X points on an Energy Refill gaining Y energy"
                    // These codes represent points spent on energy refills
                    181,  // Points usage - Energy Refill
                    182,  // Alternative energy refill code
                    190,  // Energy refill (alternative format)
                    // Add more as discovered through testing
                ],
                'Nerve Refill': [
                    // Nerve refill log codes (Points usage category) 
                    // Based on log pattern: "You used X points on a Nerve Refill gaining Y nerve"
                    // These codes represent points spent on nerve refills
                    183,  // Points usage - Nerve Refill
                    184,  // Alternative nerve refill code
                    191,  // Nerve refill (alternative format)
                    // Add more as discovered through testing
                ]
            };

            return logCodes[itemName] || [];
        },

        // Debug function to analyze recent logs for xanax detection
        debugXanaxLogs() {
            console.log('🔍 === XANAX DEBUG ANALYSIS ===');

            if (!this.lastApiData || !this.lastApiData.logs) {
                console.log('❌ No log data available for debugging');
                return;
            }

            const logs = this.lastApiData.logs;
            let logsArray = [];

            if (Array.isArray(logs)) {
                logsArray = logs;
            } else if (logs.log && Array.isArray(logs.log)) {
                logsArray = logs.log;
            } else if (typeof logs === 'object') {
                logsArray = Object.values(logs);
            }

            console.log(`📊 Total log entries: ${logsArray.length}`);

            // Get today's start time
            const todayUTCStart = new Date();
            todayUTCStart.setUTCHours(0, 0, 0, 0);
            const todayTimestamp = Math.floor(todayUTCStart.getTime() / 1000);

            console.log(`📅 Today UTC start: ${todayUTCStart.toISOString()} (${todayTimestamp})`);

            let recentLogs = [];
            let xanaxRelated = [];

            for (let i = 0; i < Math.min(50, logsArray.length); i++) {
                const entry = logsArray[i];
                if (!entry || !entry.timestamp || !entry.log) continue;

                const entryDate = new Date(entry.timestamp * 1000);
                const logText = entry.log.toString();
                const numericCode = parseInt(logText.trim());

                // Collect recent logs
                if (entry.timestamp >= todayTimestamp) {
                    recentLogs.push({
                        time: entryDate.toISOString(),
                        timestamp: entry.timestamp,
                        log: logText,
                        numericCode: !isNaN(numericCode) ? numericCode : null
                    });
                }

                // Look for anything xanax-related
                if (logText.toLowerCase().includes('xanax') || [2290, 2291, 2292].includes(numericCode)) {
                    xanaxRelated.push({
                        time: entryDate.toISOString(),
                        timestamp: entry.timestamp,
                        log: logText,
                        numericCode: !isNaN(numericCode) ? numericCode : null,
                        isToday: entry.timestamp >= todayTimestamp
                    });
                }
            }

            console.log(`📋 Recent logs since today (${recentLogs.length}):`);
            recentLogs.slice(0, 10).forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - Code:${log.numericCode || 'text'} - "${log.log}"`);
            });

            console.log(`💊 Xanax-related logs found (${xanaxRelated.length}):`);
            xanaxRelated.forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - ${log.isToday ? 'TODAY' : 'OLD'} - Code:${log.numericCode || 'text'} - "${log.log}"`);
            });

            console.log('🔍 === END XANAX DEBUG ===');
        },

        // Debug function to analyze recent logs for nerve refill detection
        debugNerveRefillLogs() {
            console.log('🧠 === NERVE REFILL DEBUG ANALYSIS ===');

            if (!this.lastApiData || !this.lastApiData.logs) {
                console.log('❌ No log data available for debugging');
                return;
            }

            const logData = this.lastApiData.logs;
            console.log('🧠 Raw log data:', logData);

            // Get today's timestamp
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);
            const todayTimestamp = Math.floor(todayUTC.getTime() / 1000);

            // Handle different log formats
            let logsArray = [];
            if (Array.isArray(logData)) {
                logsArray = logData;
            } else if (logData.log && Array.isArray(logData.log)) {
                logsArray = logData.log;
            } else if (typeof logData === 'object') {
                logsArray = Object.values(logData);
            }

            console.log(`🧠 Total logs: ${logsArray.length}`);
            console.log(`🧠 Looking for entries since: ${new Date(todayTimestamp * 1000).toISOString()}`);

            // Recent logs
            const recentLogs = [];
            const nerveRelated = [];

            // Nerve refill patterns from dailyTasks
            const nervePatterns = [
                /nerve.*?(refill|pill)/i,
                /(refill|pill).*?nerve/i,
                /you.*?(used|consumed|took).*?nerve/i,
                /nerve.*?(used|consumed|active)/i,
                /\bnerve\s*(refill|pill)\b/i,
                /\bnerve\s*pill\b/i,
                /\brefill\s*nerve\b/i,
                /consumed.*?nerve/i,
                /took.*?nerve/i,
                /used.*?nerve.*?(pill|refill)/i,
                /gained.*?nerve/i
            ];

            for (const entry of logsArray) {
                if (!entry || !entry.timestamp || !entry.log) continue;

                const numericCode = parseInt(entry.log.trim());

                recentLogs.push({
                    time: new Date(entry.timestamp * 1000).toISOString(),
                    log: entry.log,
                    numericCode: !isNaN(numericCode) ? numericCode : null,
                    isToday: entry.timestamp >= todayTimestamp
                });

                // Check for nerve-related patterns
                for (const pattern of nervePatterns) {
                    if (pattern.test(entry.log)) {
                        nerveRelated.push({
                            time: new Date(entry.timestamp * 1000).toISOString(),
                            log: entry.log,
                            numericCode: !isNaN(numericCode) ? numericCode : null,
                            pattern: pattern.toString(),
                            isToday: entry.timestamp >= todayTimestamp
                        });
                        break;
                    }
                }

                // Check for specific nerve refill log IDs
                if (!isNaN(numericCode) && nerveRefillLogIds.includes(numericCode)) {
                    nerveRelated.push({
                        time: new Date(entry.timestamp * 1000).toISOString(),
                        log: entry.log,
                        numericCode: numericCode,
                        pattern: 'Log ID match',
                        isToday: entry.timestamp >= todayTimestamp
                    });
                    console.log(`🧠 Found nerve refill by log ID ${numericCode}: ${new Date(entry.timestamp * 1000).toISOString()}`);
                }

                // Also check for "nerve" keyword in any form
                if (entry.log.toString().toLowerCase().includes('nerve')) {
                    console.log(`🧠 Found "nerve" keyword: ${new Date(entry.timestamp * 1000).toISOString()} - "${entry.log}"`);
                }

                // Check if this might be a Torn log with title field
                if (entry.title && entry.title.toLowerCase().includes('nerve')) {
                    console.log(`🧠 Found "nerve" in title: ${new Date(entry.timestamp * 1000).toISOString()} - "${entry.title}"`);
                    nerveRelated.push({
                        time: new Date(entry.timestamp * 1000).toISOString(),
                        log: entry.title,
                        numericCode: numericCode,
                        pattern: 'Title match',
                        isToday: entry.timestamp >= todayTimestamp
                    });
                }
            }

            console.log(`🧠 Recent logs since today (${recentLogs.length}):`);
            recentLogs.slice(0, 10).forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - Code:${log.numericCode || 'text'} - "${log.log}"`);
            });

            console.log(`🧠 Nerve-related logs found (${nerveRelated.length}):`);
            nerveRelated.forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - ${log.isToday ? 'TODAY' : 'OLD'} - Code:${log.numericCode || 'text'} - "${log.log}"`);
                console.log(`      Pattern: ${log.pattern}`);
            });

            console.log('🧠 === END NERVE REFILL DEBUG ===');
        },

        // Debug function to analyze recent logs for energy refill detection
        debugEnergyRefillLogs() {
            console.log('⚡ === ENERGY REFILL DEBUG ANALYSIS ===');

            if (!this.lastApiData || !this.lastApiData.logs) {
                console.log('❌ No log data available for debugging');
                return;
            }

            const logData = this.lastApiData.logs;
            console.log('⚡ Raw log data:', logData);

            // Get today's timestamp
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);
            const todayTimestamp = Math.floor(todayUTC.getTime() / 1000);

            // Handle different log formats
            let logsArray = [];
            if (Array.isArray(logData)) {
                logsArray = logData;
            } else if (logData.log && Array.isArray(logData.log)) {
                logsArray = logData.log;
            } else if (typeof logData === 'object') {
                logsArray = Object.values(logData);
            }

            console.log(`⚡ Total logs: ${logsArray.length}`);
            console.log(`⚡ Looking for entries since: ${new Date(todayTimestamp * 1000).toISOString()}`);

            // Recent logs
            const recentLogs = [];
            const energyRelated = [];

            // Energy refill patterns from dailyTasks
            const energyPatterns = [
                /energy.*?(refill|drink|can)/i,
                /(refill|drink|can).*?energy/i,
                /you.*?(used|consumed|drank).*?energy/i,
                /energy.*?(used|consumed|active)/i,
                /\benergy\s*(drink|refill|can)\b/i,
                /\benergy\s*drink\b/i,
                /\brefill\s*energy\b/i,
                /consumed.*?energy/i,
                /drank.*?energy/i,
                /used.*?energy.*?(can|drink|refill)/i,
                /gained.*?energy/i
            ];

            for (const entry of logsArray) {
                if (!entry || !entry.timestamp || !entry.log) continue;

                const numericCode = parseInt(entry.log.trim());

                recentLogs.push({
                    time: new Date(entry.timestamp * 1000).toISOString(),
                    log: entry.log,
                    numericCode: !isNaN(numericCode) ? numericCode : null,
                    isToday: entry.timestamp >= todayTimestamp
                });

                // Check for energy-related patterns
                for (const pattern of energyPatterns) {
                    if (pattern.test(entry.log)) {
                        energyRelated.push({
                            time: new Date(entry.timestamp * 1000).toISOString(),
                            log: entry.log,
                            numericCode: !isNaN(numericCode) ? numericCode : null,
                            pattern: pattern.toString(),
                            isToday: entry.timestamp >= todayTimestamp
                        });
                        break;
                    }
                }

                // Also check for "energy" keyword
                if (entry.log.toLowerCase().includes('energy')) {
                    console.log(`⚡ Found "energy" keyword: ${new Date(entry.timestamp * 1000).toISOString()} - "${entry.log}"`);
                }
            }

            console.log(`⚡ Recent logs since today (${recentLogs.length}):`);
            recentLogs.slice(0, 10).forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - Code:${log.numericCode || 'text'} - "${log.log}"`);
            });

            console.log(`⚡ Energy-related logs found (${energyRelated.length}):`);
            energyRelated.forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time} - ${log.isToday ? 'TODAY' : 'OLD'} - Code:${log.numericCode || 'text'} - "${log.log}"`);
                console.log(`      Pattern: ${log.pattern}`);
            });

            console.log('⚡ === END ENERGY REFILL DEBUG ===');
        },

        // Debug function to find refill log codes by searching for "points" keywords
        debugRefillLogCodes() {
            console.log('🔍 === REFILL LOG CODE DISCOVERY ===');

            if (!this.lastApiData || !this.lastApiData.logs) {
                console.log('❌ No log data available for debugging');
                console.log('💡 Use the API to fetch logs first by waiting for automatic update or manually refreshing');
                return;
            }

            const logs = this.lastApiData.logs;
            let logsArray = [];

            if (Array.isArray(logs)) {
                logsArray = logs;
            } else if (logs.log && Array.isArray(logs.log)) {
                logsArray = logs.log;
            } else if (typeof logs === 'object') {
                logsArray = Object.values(logs);
            }

            console.log(`📊 Total log entries: ${logsArray.length}`);

            // Get today's start time
            const todayUTCStart = new Date();
            todayUTCStart.setUTCHours(0, 0, 0, 0);
            const todayTimestamp = Math.floor(todayUTCStart.getTime() / 1000);

            console.log(`📅 Today UTC start: ${todayUTCStart.toISOString()} (${todayTimestamp})`);

            const refillKeywords = ['refill', 'points', 'energy', 'nerve', 'used.*points', 'gaining'];
            const potentialRefills = [];

            for (const entry of logsArray) {
                if (!entry || !entry.timestamp || !entry.log) continue;

                const logText = entry.log.toString().toLowerCase();
                const numericCode = parseInt(entry.log.toString().trim());
                const entryDate = new Date(entry.timestamp * 1000);

                // Look for logs containing refill-related keywords
                let matchedKeywords = [];
                for (const keyword of refillKeywords) {
                    if (new RegExp(keyword, 'i').test(logText)) {
                        matchedKeywords.push(keyword);
                    }
                }

                if (matchedKeywords.length > 0) {
                    potentialRefills.push({
                        time: entryDate.toISOString(),
                        timestamp: entry.timestamp,
                        log: entry.log,
                        logText: logText,
                        numericCode: !isNaN(numericCode) ? numericCode : null,
                        matchedKeywords: matchedKeywords,
                        isToday: entry.timestamp >= todayTimestamp,
                        fullEntry: entry
                    });
                }
            }

            console.log(`🔍 Found ${potentialRefills.length} potential refill-related logs:`);
            potentialRefills.forEach((log, i) => {
                console.log(`\n  ${i + 1}. ${log.time} - ${log.isToday ? '✅ TODAY' : '❌ OLD'}`);
                console.log(`     Log: "${log.log}"`);
                console.log(`     Numeric Code: ${log.numericCode || 'N/A (text log)'}`);
                console.log(`     Matched Keywords: ${log.matchedKeywords.join(', ')}`);
                console.log(`     Full entry:`, log.fullEntry);
            });

            // Look specifically for today's refills
            const todayRefills = potentialRefills.filter(log => log.isToday);
            console.log(`\n🎯 Today's potential refills (${todayRefills.length}):`);
            todayRefills.forEach((log, i) => {
                console.log(`  ${i + 1}. ${log.time}`);
                console.log(`     "${log.log}"`);
                if (log.numericCode) {
                    console.log(`     ⚠️ NUMERIC CODE: ${log.numericCode} - ADD THIS TO getLogCodesForItem!`);
                }
            });

            console.log('\n💡 INSTRUCTIONS:');
            console.log('   1. Look at the logs above from today when you used refills');
            console.log('   2. Find the numeric codes for Energy Refill and Nerve Refill');
            console.log('   3. These codes need to be added to getLogCodesForItem() function');
            console.log('   4. Let me know the codes and I will update the detection system');
            console.log('🔍 === END REFILL LOG CODE DISCOVERY ===');

            return todayRefills;
        },

        // Count xanax usage from logs since 00:00 UTC (legacy - now uses generic function)
        countXanaxFromLogs(logData, sinceTimestamp, timezone = 'UTC') {
            // Use the generic function with xanax patterns
            const xanaxPatterns = [
                /xanax.*?(used|took|consumed|taken)/i,
                /(used|took|consumed|taken).*?xanax/i,
                /you.*?(used|took|consumed).*?xanax/i,
                /xanax.*?effect/i,
                /took.*?xanax/i,
                /used.*?xanax/i,
                /consume.*?xanax/i,
                /xanax.*?active/i,
                /\bxanax\b/i  // Just the word xanax anywhere
            ];

            const count = this.countItemUsageFromLogs(logData, sinceTimestamp, xanaxPatterns, 'Xanax Dose', timezone);
            return Math.min(count, 3); // Cap at 3 per day
        },

        // Create a new todo list
        createNewTodoList() {
            console.log('📋 Creating new todo list...');

            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error('❌ Content area not found');
                return;
            }

            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;

            const todoListWidth = Math.min(320, contentWidth - 40);
            const todoListHeight = Math.min(400, contentHeight - 60);
            const padding = 10;
            const stackOffset = 30;

            const todoListCount = this.todoLists.length;
            const x = padding + (todoListCount * stackOffset) % (contentWidth - todoListWidth);
            const y = padding + Math.floor((todoListCount * stackOffset) / (contentWidth - todoListWidth)) * stackOffset;

            const todoList = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: 'New Todo List',
                tasks: [],
                x: x,
                y: y,
                width: todoListWidth,
                height: todoListHeight,
                pinned: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                showDailyTasks: true // Include daily tasks by default
            };

            this.todoLists.push(todoList);
            this.saveTodoLists();
            this.renderTodoList(todoList);

            console.log('📋 Todo list created successfully, total lists:', this.todoLists.length);
            return todoList;
        },

        // Render a todo list window
        renderTodoList(todoList) {
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Remove existing element if it exists
            const existingElement = document.getElementById(`sidekick-todolist-${todoList.id}`);
            if (existingElement) {
                existingElement.remove();
            }

            const todoListElement = document.createElement('div');
            todoListElement.className = 'movable-todolist';
            todoListElement.id = `sidekick-todolist-${todoList.id}`;
            todoListElement.dataset.todolistId = todoList.id;

            const width = Math.max(todoList.width || 320, 200);
            const height = Math.max(todoList.height || 400, 200);
            const x = Math.max(todoList.x || 10, 0);
            const y = Math.max(todoList.y || 10, 0);

            todoListElement.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: linear-gradient(145deg, #37474F, #263238);
                border: 1px solid #666;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 200px;
                min-height: 200px;
                z-index: 1000;
                resize: ${todoList.pinned ? 'none' : 'both'};
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;

            todoListElement.innerHTML = `
                <div class="todolist-header" style="
                    background: linear-gradient(135deg, #4CAF50, #388E3C);
                    border-bottom: 1px solid #555;
                    padding: 6px 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: ${todoList.pinned ? 'default' : 'move'};
                    height: 28px;
                    flex-shrink: 0;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <input class="todolist-name" value="${this.escapeHtml(todoList.name)}" style="
                        background: none;
                        border: none;
                        color: #fff;
                        font-weight: 600;
                        font-size: 12px;
                        flex: 1;
                        min-width: 0;
                    " title="Edit name">
                    
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="todolist-dropdown" style="position: relative;">
                            <button class="todolist-dropdown-btn" style="
                                background: rgba(255,255,255,0.2);
                                border: none;
                                color: #fff;
                                cursor: pointer;
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                font-size: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: all 0.2s;
                                z-index: 1001;
                                position: relative;
                                outline: none;
                                box-shadow: none;
                            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                               onmouseout="this.style.background='rgba(255,255,255,0.2)'" 
                               onfocus="this.style.outline='none'" 
                               title="Todo list options">⚙️</button>
                            
                            <div class="todolist-dropdown-content" style="
                                display: none;
                                position: absolute;
                                right: 0;
                                top: 100%;
                                background: #2a2a2a;
                                border: 1px solid #555;
                                border-radius: 6px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                z-index: 10000;
                                min-width: 160px;
                                margin-top: 4px;
                            ">
                                <div class="todolist-option" data-action="pin" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">${todoList.pinned ? '🗋 Unpin' : '📌 Pin'}</div>
                                
                                <div class="todolist-option" data-action="refresh" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">🔄 Refresh API</div>
                                
                                <div class="todolist-option" data-action="reset-daily" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">♻️ Reset Daily Tasks</div>
                                
                                <div class="todolist-option" data-action="add" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">➕ Add Task</div>
                                
                                <div class="todolist-option" data-action="delete" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #ff6b6b;
                                    font-size: 12px;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">🗑️ Delete List</div>
                            </div>
                        </div>
                        
                        <button class="todolist-close" style="
                            background: #dc3545;
                            border: none;
                            color: white;
                            cursor: pointer;
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            font-size: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                            transition: all 0.2s;
                            font-weight: bold;
                        " onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'" 
                           onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'" 
                           title="Close">×</button>
                    </div>
                </div>
                
                <div class="todolist-content" style="
                    flex: 1;
                    padding: 10px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                ">
                    <style>
                        .todolist-content::-webkit-scrollbar {
                            width: 0px;
                            background: transparent;
                        }
                    </style>
                    <div class="tasks-container">
                        ${this.renderTasksContent(todoList)}
                    </div>
                </div>
            `;

            contentArea.appendChild(todoListElement);
            this.setupTodoListEventListeners(todoList, todoListElement);

            console.log('📋 Todo list rendered:', todoList.name);
        },

        // Render tasks content (daily + custom tasks)
        renderTasksContent(todoList) {
            let content = '';

            // Daily tasks section
            if (todoList.showDailyTasks) {
                content += '<div style="margin-bottom: 10px;"><h4 style="color: #ccc; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Daily Tasks</h4>';

                for (const taskKey in this.dailyTasks) {
                    const task = this.dailyTasks[taskKey];
                    content += this.renderDailyTask(task);
                }

                content += '</div>';
            }

            // Custom tasks section
            if (todoList.tasks.length > 0) {
                content += '<div><h4 style="color: #ccc; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Custom Tasks</h4>';

                todoList.tasks.forEach(task => {
                    content += this.renderCustomTask(task, todoList.id);
                });

                content += '</div>';
            }

            if (todoList.tasks.length === 0 && !todoList.showDailyTasks) {
                content = '<div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">Click + to add tasks</div>';
            }

            return content;
        },

        // Render daily task item
        renderDailyTask(task) {
            const isCompleted = task.completed;
            const progressText = task.maxCount ? ` (${task.currentCount || 0}/${task.maxCount})` : '';

            return `
                <div class="task-item daily-task" style="
                    background: ${isCompleted ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.1)'};
                    border: 1px solid ${isCompleted ? '#4CAF50' : '#555'};
                    border-radius: 4px;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                ">
                    <span style="font-size: 14px;">${task.icon}</span>
                    <div style="flex: 1;">
                        <div style="color: #fff; font-size: 12px; font-weight: 500;">
                            ${task.name}${progressText}
                        </div>
                        <div style="color: #aaa; font-size: 10px;">
                            ${task.description}
                        </div>
                    </div>
                    <div style="
                        width: 16px;
                        height: 16px;
                        border: 2px solid ${isCompleted ? '#4CAF50' : '#666'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: ${isCompleted ? '#4CAF50' : 'transparent'};
                        transition: all 0.2s;
                    ">
                        ${isCompleted ? '<span style="color: white; font-size: 10px;">✓</span>' : ''}
                    </div>
                </div>
            `;
        },

        // Render custom task item
        // Render custom task item
        renderCustomTask(task, todoListId) {
            // Calculate reset info
            let resetInfo = '';
            if (task.resetDuration && task.resetDuration !== 'never') {
                if (task.completed && task.completedAt) {
                    const completedTime = new Date(task.completedAt);
                    const resetMs = this.parseResetDuration(task.resetDuration);
                    const now = new Date();
                    const timeElapsed = now.getTime() - completedTime.getTime();
                    const timeRemaining = resetMs - timeElapsed;

                    if (timeRemaining > 0) {
                        const remainingText = this.formatDuration(timeRemaining);
                        resetInfo = ` (resets in ${remainingText})`;
                    }
                } else {
                    resetInfo = ` (auto-resets: ${this.formatResetDuration(task.resetDuration)})`;
                }
            }

            return `
                <div class="task-item custom-task" style="
                    background: ${task.completed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.1)'};
                    border: 1px solid ${task.completed ? '#4CAF50' : '#555'};
                    border-radius: 4px;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                ">
                    <div style="flex: 1;">
                        <div style="color: #fff; font-size: 12px; font-weight: 500;">
                            ${this.escapeHtml(task.name)}
                        </div>
                        ${resetInfo ? `<div style="color: #aaa; font-size: 10px;">${resetInfo}</div>` : ''}
                    </div>
                    <button class="toggle-task-btn" data-task-id="${task.id}" style="
                        width: 16px;
                        height: 16px;
                        border: 2px solid ${task.completed ? '#4CAF50' : '#666'};
                        border-radius: 50%;
                        background: ${task.completed ? '#4CAF50' : 'transparent'};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    " title="Toggle completion">
                        ${task.completed ? '<span style="color: white; font-size: 10px;">✓</span>' : ''}
                    </button>
                    <button class="remove-task-btn" data-task-id="${task.id}" style="
                        background: rgba(220, 53, 69, 0.8);
                        border: none;
                        color: white;
                        cursor: pointer;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        font-size: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                        transition: all 0.2s;
                        opacity: 0.7;
                    " onmouseover="this.style.opacity='1'; this.style.background='rgba(200, 35, 51, 1)'" 
                       onmouseout="this.style.opacity='0.7'; this.style.background='rgba(220, 53, 69, 0.8)'" 
                       title="Remove task">×</button>
                </div>
            `;
        },

        // Set up event listeners for todo list
        setupTodoListEventListeners(todoList, element) {
            // Name editing
            const nameInput = element.querySelector('.todolist-name');
            nameInput.addEventListener('blur', () => {
                todoList.name = nameInput.value.trim() || 'Todo List';
                todoList.modified = new Date().toISOString();
                this.saveTodoLists();
            });

            // Todo list dropdown menu - using working pattern from timer module
            const dropdownBtn = element.querySelector('.todolist-dropdown-btn');
            const dropdownContent = element.querySelector('.todolist-dropdown-content');

            if (dropdownBtn && dropdownContent) {
                console.log('🔧 Setting up dropdown for todolist:', todoList.id);

                dropdownBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    console.log('🔧 Dropdown button clicked');

                    // Close all other dropdowns first
                    document.querySelectorAll('.todolist-dropdown .todolist-dropdown-content').forEach(dropdown => {
                        if (dropdown !== dropdownContent) {
                            dropdown.style.display = 'none';
                        }
                    });

                    // Toggle this dropdown
                    const isVisible = dropdownContent.style.display === 'block';
                    dropdownContent.style.display = isVisible ? 'none' : 'block';

                    console.log('🔧 Dropdown toggled to:', dropdownContent.style.display);

                    // Smart positioning: prevent clipping at edges
                    if (!isVisible) {
                        setTimeout(() => {
                            const dropdownRect = dropdownContent.getBoundingClientRect();
                            const todoRect = element.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;

                            // Check if dropdown clips on the right
                            if (dropdownRect.right > viewportWidth) {
                                dropdownContent.style.right = '0';
                                dropdownContent.style.left = 'auto';
                            }

                            // Check if dropdown clips on the left
                            if (dropdownRect.left < 0) {
                                dropdownContent.style.left = '0';
                                dropdownContent.style.right = 'auto';
                            }
                        }, 0);
                    }
                });

                // Handle option clicks
                const options = dropdownContent.querySelectorAll('.todolist-option');
                options.forEach(option => {
                    option.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const action = option.getAttribute('data-action');
                        console.log('🔧 Option clicked:', action);

                        dropdownContent.style.display = 'none';

                        switch (action) {
                            case 'refresh':
                                window.SidekickModules.TodoList.checkApiForCompletedTasks();
                                break;
                            case 'reset-daily':
                                if (confirm('Reset all daily tasks? This will mark them as incomplete.')) {
                                    window.SidekickModules.TodoList.resetDailyTasks();
                                }
                                break;
                            case 'pin':
                                todoList.pinned = !todoList.pinned;
                                window.SidekickModules.TodoList.saveTodoLists();
                                window.SidekickModules.TodoList.renderAllTodoLists();
                                break;
                            case 'add':
                                window.SidekickModules.TodoList.showAddTaskDialog(todoList);
                                break;
                            case 'delete':
                                if (confirm(`Delete "${todoList.name}" todo list?`)) {
                                    window.SidekickModules.TodoList.deleteTodoList(todoList.id);
                                }
                                break;
                        }
                    });
                });

                console.log('✅ Dropdown menu setup complete with', options.length, 'options');
            } else {
                console.error('❌ Dropdown elements not found. Btn:', !!dropdownBtn, 'Content:', !!dropdownContent);
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', function (e) {
                if (!element.contains(e.target)) {
                    dropdownContent.style.display = 'none';
                }
            });

            // Close button
            const closeBtn = element.querySelector('.todolist-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${todoList.name}" todo list?`)) {
                    this.deleteTodoList(todoList.id);
                }
            });

            // Task action buttons
            this.setupTaskEventListeners(element, todoList);

            // Resizing functionality
            this.setupResizeObserver(element, todoList);

            // Make draggable
            this.makeDraggable(element, todoList);
        },

        // Show todo list options menu
        showTodoListOptionsMenu(todoListId, cogButton) {
            console.log('🔧 showTodoListOptionsMenu called with:', todoListId, 'button:', !!cogButton);

            const existingMenu = document.querySelector('.todolist-options-menu');
            if (existingMenu) {
                console.log('🔧 Removing existing menu');
                existingMenu.remove();
                return;
            }

            const todoList = this.todoLists.find(t => t.id === todoListId);
            if (!todoList) return;

            const menu = document.createElement('div');
            menu.className = 'todolist-options-menu';
            menu.style.cssText = `
                position: absolute;
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                z-index: 10000;
                min-width: 150px;
                font-size: 12px;
            `;

            menu.innerHTML = `
                <div class="menu-item add-task-menu" style="
                    padding: 8px 12px;
                    color: #fff;
                    cursor: pointer;
                    border-bottom: 1px solid #555;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#444'" onmouseout="this.style.background='transparent'">
                    ➕ Add Task
                </div>
                <div class="menu-item refresh-api-menu" style="
                    padding: 8px 12px;
                    color: #fff;
                    cursor: pointer;
                    border-bottom: 1px solid #555;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#444'" onmouseout="this.style.background='transparent'">
                    🔄 Check API Now
                </div>
                <div class="menu-item pin-todolist-menu" style="
                    padding: 8px 12px;
                    color: #fff;
                    cursor: pointer;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#444'" onmouseout="this.style.background='transparent'">
                    ${todoList.pinned ? '📌 Unpin' : '📌 Pin'}
                </div>
            `;

            // Position menu
            const rect = cogButton.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 5) + 'px';

            document.body.appendChild(menu);

            // Event handlers
            menu.querySelector('.add-task-menu').addEventListener('click', () => {
                this.showAddTaskDialog(todoList);
                menu.remove();
            });

            menu.querySelector('.refresh-api-menu').addEventListener('click', async () => {
                console.log('🔄 Manual API check triggered');
                await this.checkApiForCompletedTasks();
                window.SidekickModules.UI?.showNotification('Todo List', 'Checking API for completed tasks...', 'info');
                menu.remove();
            });

            menu.querySelector('.pin-todolist-menu').addEventListener('click', () => {
                todoList.pinned = !todoList.pinned;
                this.saveTodoLists();
                this.renderTodoList(todoList);
                menu.remove();
            });

            // Close menu when clicking outside
            setTimeout(() => {
                const closeHandler = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 10);
        },

        // Set up task event listeners
        setupTaskEventListeners(element, todoList) {
            // Toggle task completion buttons
            element.querySelectorAll('.toggle-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = btn.dataset.taskId;
                    this.toggleTaskCompletion(todoList.id, taskId);
                });
            });

            // Remove task buttons
            element.querySelectorAll('.remove-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = btn.dataset.taskId;
                    this.removeTask(todoList.id, taskId);
                });
            });
        },

        // Set up resize observer for todo list
        setupResizeObserver(element, todoList) {
            let resizeTimeout;
            const resizeObserver = new ResizeObserver(entries => {
                if (todoList.pinned) return;

                for (let entry of entries) {
                    if (entry.target === element) {
                        todoList.width = entry.contentRect.width;
                        todoList.height = entry.contentRect.height;

                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            this.saveTodoLists();
                            console.log(`📏 Saved todo list '${todoList.name}' size: ${todoList.width}x${todoList.height}`);
                        }, 500);
                    }
                }
            });
            resizeObserver.observe(element);
        },

        // Show add task dialog
        // Show add task dialog with reset options
        showAddTaskDialog(todoList) {
            this.createTaskDialog(todoList);
        },

        // Create advanced task dialog
        createTaskDialog(todoList) {
            // Remove existing dialog if present
            const existingDialog = document.getElementById('sidekick-task-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // Create dialog overlay
            const dialogOverlay = document.createElement('div');
            dialogOverlay.id = 'sidekick-task-dialog';
            dialogOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(3px);
            `;

            // Create dialog box
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: linear-gradient(145deg, #37474F, #263238);
                border: 1px solid #666;
                border-radius: 8px;
                padding: 20px;
                min-width: 320px;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;

            dialog.innerHTML = `
                <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 16px;">Add New Task</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 5px;">Task Name:</label>
                    <input type="text" id="task-name-input" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #2a2a2a;
                        color: #fff;
                        font-size: 14px;
                        box-sizing: border-box;
                    " placeholder="Enter task name..." maxlength="50">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 5px;">Auto-reset after completion:</label>
                    <select id="reset-duration" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #2a2a2a;
                        color: #fff;
                        font-size: 14px;
                    ">
                        <option value="never">Never (manual reset only)</option>
                        <option value="1h">1 Hour</option>
                        <option value="2h">2 Hours</option>
                        <option value="4h">4 Hours</option>
                        <option value="8h">8 Hours</option>
                        <option value="12h">12 Hours</option>
                        <option value="1d" selected>1 Day (24 hours)</option>
                        <option value="2d">2 Days</option>
                        <option value="3d">3 Days</option>
                        <option value="7d">1 Week</option>
                        <option value="30d">1 Month</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-task" style="
                        padding: 8px 16px;
                        border: 1px solid #666;
                        border-radius: 4px;
                        background: #444;
                        color: #ccc;
                        cursor: pointer;
                        font-size: 12px;
                    ">Cancel</button>
                    <button id="create-task" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        background: linear-gradient(135deg, #4CAF50, #388E3C);
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                    ">Create Task</button>
                </div>
            `;

            dialogOverlay.appendChild(dialog);
            document.body.appendChild(dialogOverlay);

            // Focus on input
            const nameInput = dialog.querySelector('#task-name-input');
            nameInput.focus();

            // Add event listeners
            const cancelBtn = dialog.querySelector('#cancel-task');
            const createBtn = dialog.querySelector('#create-task');
            const resetSelect = dialog.querySelector('#reset-duration');

            cancelBtn.addEventListener('click', () => {
                dialogOverlay.remove();
            });

            createBtn.addEventListener('click', () => {
                const taskName = nameInput.value.trim();
                if (!taskName) {
                    nameInput.style.borderColor = '#f44336';
                    nameInput.focus();
                    return;
                }

                const resetDuration = resetSelect.value;
                this.createTaskWithReset(todoList, taskName, resetDuration);
                dialogOverlay.remove();
            });

            // Enter key to create
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    createBtn.click();
                }
            });

            // Escape key to cancel
            dialogOverlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dialogOverlay.remove();
                }
            });

            // Click outside to cancel
            dialogOverlay.addEventListener('click', (e) => {
                if (e.target === dialogOverlay) {
                    dialogOverlay.remove();
                }
            });
        },

        // Create task with reset duration
        createTaskWithReset(todoList, taskName, resetDuration) {
            const task = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: taskName,
                completed: false,
                created: new Date().toISOString(),
                resetDuration: resetDuration,
                completedAt: null // Track when task was completed for auto-reset
            };

            todoList.tasks.push(task);
            todoList.modified = new Date().toISOString();
            this.saveTodoLists();
            this.renderTodoList(todoList);

            console.log(`📋 Created task "${taskName}" with reset: ${resetDuration}`);
        },

        // Add custom task (simple version without reset)
        addCustomTask(todoListId, taskName) {
            const todoList = this.todoLists.find(tl => tl.id === todoListId);
            if (!todoList) {
                console.error('❌ Todo list not found:', todoListId);
                return;
            }

            const task = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: taskName,
                completed: false,
                created: new Date().toISOString()
            };

            todoList.tasks.push(task);
            todoList.modified = new Date().toISOString();
            this.saveTodoLists();
            this.renderTodoList(todoList);

            console.log(`📋 Added custom task "${taskName}" to "${todoList.name}"`);
        },

        // Toggle task completion
        toggleTaskCompletion(todoListId, taskId) {
            const todoList = this.todoLists.find(tl => tl.id === todoListId);
            if (!todoList) return;

            const task = todoList.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.completed = !task.completed;

            if (task.completed) {
                // Mark completion time for auto-reset functionality
                task.completedAt = new Date().toISOString();
                console.log(`✅ Task "${task.name}" completed at ${task.completedAt}`);
            } else {
                // Clear completion time if unchecked
                task.completedAt = null;
                console.log(`❌ Task "${task.name}" marked as incomplete`);
            }

            todoList.modified = new Date().toISOString();
            this.saveTodoLists();
            this.renderTodoList(todoList);
        },

        // Remove task from todo list
        removeTask(todoListId, taskId) {
            const todoList = this.todoLists.find(tl => tl.id === todoListId);
            if (!todoList) return;

            todoList.tasks = todoList.tasks.filter(task => task.id !== taskId);
            todoList.modified = new Date().toISOString();
            this.saveTodoLists();
            this.renderTodoList(todoList);
        },

        // Delete entire todo list
        deleteTodoList(id) {
            const element = document.getElementById(`sidekick-todolist-${id}`);
            if (element) {
                element.remove();
            }

            this.todoLists = this.todoLists.filter(tl => tl.id !== id);
            this.saveTodoLists();

            console.log('📋 Todo list deleted');
        },

        // Make element draggable
        makeDraggable(element, todoList) {
            const header = element.querySelector('.todolist-header');
            if (!header) return;

            let isDragging = false;
            let currentX = todoList.x || 0;
            let currentY = todoList.y || 0;
            let initialX;
            let initialY;
            let xOffset = currentX;
            let yOffset = currentY;

            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
                if (e.target.closest('input') || e.target.closest('button') || todoList.pinned) return;

                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;

                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                    element.style.cursor = 'grabbing';
                }
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    xOffset = currentX;
                    yOffset = currentY;

                    const contentArea = document.getElementById('sidekick-content');
                    if (contentArea) {
                        const bounds = contentArea.getBoundingClientRect();
                        const elementBounds = element.getBoundingClientRect();

                        currentX = Math.max(0, Math.min(currentX, bounds.width - elementBounds.width));
                        currentY = Math.max(0, Math.min(currentY, bounds.height - elementBounds.height));

                        xOffset = currentX;
                        yOffset = currentY;
                    }

                    element.style.left = currentX + 'px';
                    element.style.top = currentY + 'px';
                }
            }

            function dragEnd(e) {
                if (isDragging) {
                    isDragging = false;
                    element.style.cursor = 'default';

                    todoList.x = currentX;
                    todoList.y = currentY;
                    todoList.modified = new Date().toISOString();

                    if (window.SidekickModules?.TodoList?.saveTodoLists) {
                        window.SidekickModules.TodoList.saveTodoLists();
                    }

                    console.log(`📋 Todo list position saved: x=${currentX}, y=${currentY}`);
                }
            }
        },

        // Render all todo lists
        renderAllTodoLists() {
            console.log('📋 Rendering all todo lists:', this.todoLists.length);
            this.todoLists.forEach(todoList => this.renderTodoList(todoList));
        },

        // Clear all existing todo list elements
        clearExistingTodoLists() {
            const existingTodoLists = document.querySelectorAll('[id^="sidekick-todolist-"]');
            existingTodoLists.forEach(element => element.remove());
        },

        // Helper methods
        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        },

        // Format reset duration for display
        formatResetDuration(duration) {
            const match = duration.match(/^(\d+)([hd])$/);
            if (!match) return duration;

            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 'h': return value === 1 ? '1 hour' : `${value} hours`;
                case 'd': return value === 1 ? '1 day' : `${value} days`;
                default: return duration;
            }
        },

        // Format remaining time until reset
        formatDuration(milliseconds) {
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                return days === 1 ? '1 day' : `${days} days`;
            } else if (hours > 0) {
                return hours === 1 ? '1 hour' : `${hours} hours`;
            } else if (minutes > 0) {
                return minutes === 1 ? '1 minute' : `${minutes} minutes`;
            } else {
                return 'less than a minute';
            }
        },

        // Debug function to check current reset state
        debugResetState() {
            const now = new Date();
            const currentUTCDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

            console.log('🐛 DEBUG: Current reset state:');
            console.log('🐛 Current time:', now.toISOString());
            console.log('🐛 Current UTC date:', currentUTCDate.toISOString());
            console.log('🐛 Last reset date:', this.lastResetDate ? new Date(this.lastResetDate).toISOString() : 'null');
            console.log('🐛 Daily tasks state:', this.dailyTasks);

            if (this.lastResetDate) {
                const lastReset = new Date(this.lastResetDate);
                const lastResetUTCDate = new Date(Date.UTC(lastReset.getUTCFullYear(), lastReset.getUTCMonth(), lastReset.getUTCDate()));
                console.log('🐛 Last reset UTC date:', lastResetUTCDate.toISOString());
                console.log('🐛 Need reset?', currentUTCDate.getTime() !== lastResetUTCDate.getTime());
                console.log('🐛 Hours difference:', (currentUTCDate.getTime() - lastResetUTCDate.getTime()) / (1000 * 60 * 60));
            }
        },

        // Manual refresh function for testing and debugging
        manualRefresh() {
            console.log('🔄 Manual refresh triggered');

            // Force check for daily reset
            this.checkForDailyReset();

            // Force API check
            this.checkApiForCompletedTasks();

            // Refresh all todo lists
            this.renderAllTodoLists();

            console.log('✅ Manual refresh complete');
        },

        // Force reset daily tasks (for testing)
        forceResetDailyTasks() {
            console.log('🔄 Force reset daily tasks triggered');
            this.resetDailyTasks();

            // Show notification to confirm manual reset
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification(
                    'SUCCESS',
                    'Daily tasks manually reset - all checkboxes should now be unchecked!'
                );
            }

            console.log('✅ Daily tasks force reset complete');
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Todo List module to global namespace
    window.SidekickModules.TodoList = TodoListModule;

    // Add global debugging functions for easy console access
    window.debugTodoList = function () {
        if (window.SidekickModules?.TodoList) {
            window.SidekickModules.TodoList.debugResetState();
        } else {
            console.error("❌ Todo List module not available");
        }
    };

    window.refreshTodoList = function () {
        if (window.SidekickModules?.TodoList) {
            window.SidekickModules.TodoList.manualRefresh();
        } else {
            console.error("❌ Todo List module not available");
        }
    };

    window.forceResetTodoList = function () {
        if (window.SidekickModules?.TodoList) {
            if (confirm('Are you sure you want to force reset all daily tasks?')) {
                window.SidekickModules.TodoList.forceResetDailyTasks();
            }
        } else {
            console.error("❌ Todo List module not available");
        }
    };

    window.checkRefillAvailability = function () {
        if (window.SidekickModules?.TodoList) {
            console.log('🔍 Manually checking refill availability...');
            window.SidekickModules.TodoList.checkApiForCompletedTasks();
        } else {
            console.error("❌ Todo List module not available");
        }
    };

    window.forceResetRefills = function () {
        if (window.SidekickModules?.TodoList) {
            console.log('🔄 Force resetting refill tasks...');
            const todoList = window.SidekickModules.TodoList;

            // Reset energy and nerve refill tasks
            if (todoList.dailyTasks.energyRefill) {
                todoList.dailyTasks.energyRefill.completed = false;
                console.log('⚡ Energy refill reset to incomplete');
            }

            if (todoList.dailyTasks.nerveRefill) {
                todoList.dailyTasks.nerveRefill.completed = false;
                console.log('🧠 Nerve refill reset to incomplete');
            }

            // Save and render
            todoList.saveDailyTasks();
            todoList.renderAllTodoLists();

            console.log('✅ Refill tasks force reset complete');

            // Show notification
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification(
                    'SUCCESS',
                    'Refill tasks manually reset to incomplete'
                );
            }
        } else {
            console.error("❌ Todo List module not available");
        }
    };

    // Direct Debug Function Exposure - Simple Chrome Extension Compatible
    const exposeDebugFunctions = () => {
        console.log('🔧 Exposing debug functions directly...');

        // Direct reference to this TodoList module instance
        const todoListModule = TodoListModule;

        try {
            // Method 1: Direct window assignment using module reference
            window.debugNerveRefillLogs = function () {
                if (todoListModule && typeof todoListModule.debugNerveRefillLogs === 'function') {
                    todoListModule.debugNerveRefillLogs();
                } else {
                    console.error('❌ TodoList debugNerveRefillLogs function not found');
                }
            };

            window.debugEnergyRefillLogs = function () {
                if (todoListModule && typeof todoListModule.debugEnergyRefillLogs === 'function') {
                    todoListModule.debugEnergyRefillLogs();
                } else {
                    console.error('❌ TodoList debugEnergyRefillLogs function not found');
                }
            };

            window.debugXanaxLogs = function () {
                if (todoListModule && typeof todoListModule.debugXanaxLogs === 'function') {
                    todoListModule.debugXanaxLogs();
                } else {
                    console.error('❌ TodoList debugXanaxLogs function not found');
                }
            };

            window.debugRefillLogCodes = function () {
                if (todoListModule && typeof todoListModule.debugRefillLogCodes === 'function') {
                    return todoListModule.debugRefillLogCodes();
                } else {
                    console.error('❌ TodoList debugRefillLogCodes function not found');
                    return null;
                }
            };

            console.log('✅ Debug functions exposed successfully');
            console.log('🔍 Test with: debugNerveRefillLogs(), debugEnergyRefillLogs(), debugXanaxLogs(), debugRefillLogCodes()');
        } catch (e) {
            console.error('❌ Failed to expose debug functions:', e.message);
        }
    };

    // Expose immediately since we have direct module reference
    exposeDebugFunctions();

    console.log("✅ Todo List Module loaded and ready");
    console.log("🔧 Debug functions available: debugTodoList(), refreshTodoList(), forceResetTodoList(), checkRefillAvailability(), forceResetRefills()");
    console.log("💊 Debug functions ready: debugXanaxLogs(), debugNerveRefillLogs(), debugEnergyRefillLogs()");

})();