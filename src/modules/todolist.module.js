/**
 * Sidekick Chrome Extension - Todo List Module
 * Enhanced todo list with API integration for automatic task completion tracking
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
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
                apiField: 'energydrinkused', // Updated to correct field name
                alternativeFields: ['refills', 'tokenrefills'],
                completed: false
            },
            nerveRefill: {
                name: 'Nerve Refill', 
                icon: '🧠',
                color: '#45B7D1',
                description: 'Daily nerve refill',
                apiField: 'nerverefills', // Updated to correct field name
                alternativeFields: ['refills', 'tokenrefills'],
                completed: false
            },
            xanaxDose: {
                name: 'Xanax Dose',
                icon: '💊',
                color: '#E74C3C', 
                description: 'Daily Xanax dose (up to 3)',
                apiField: 'xanax', // Use xanax field directly
                alternativeFields: ['xanaxtaken', 'xanaxused', 'medicalitemsused'],
                maxCount: 3,
                currentCount: 0,
                completed: false,
                baseline: 0 // Track starting value for cumulative fields
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
                
                if (saved && lastReset) {
                    const now = new Date();
                    const lastResetDate = new Date(lastReset);
                    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                    const lastResetUTC = new Date(Date.UTC(lastResetDate.getUTCFullYear(), lastResetDate.getUTCMonth(), lastResetDate.getUTCDate()));
                    
                    if (todayUTC.getTime() !== lastResetUTC.getTime()) {
                        console.log("🔄 Daily reset needed - clearing daily tasks");
                        this.resetDailyTasks();
                    } else {
                        Object.assign(this.dailyTasks, saved);
                        console.log("✅ Loaded daily tasks from Chrome storage");
                    }
                } else {
                    console.log("📭 No saved daily tasks found, using defaults");
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
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_dailytasks', this.dailyTasks);
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_dailytasks_reset', new Date().toISOString());
                console.log('💾 Daily tasks saved successfully to Chrome storage');
            } catch (error) {
                console.error('Failed to save daily tasks to Chrome storage:', error);
            }
        },

        // Reset daily tasks at UTC midnight
        resetDailyTasks() {
            console.log('🔄 Resetting daily tasks for new day');
            
            for (const taskKey in this.dailyTasks) {
                const task = this.dailyTasks[taskKey];
                task.completed = false;
                if (task.currentCount !== undefined) {
                    task.currentCount = 0;
                }
                if (task.baseline !== undefined) {
                    task.baseline = 0;
                }
            }
            
            // Clear API baselines for new day
            this.apiBaselines = {};
            
            this.lastResetDate = new Date();
            this.saveDailyTasks();
            
            // Refresh any open todo lists
            this.renderAllTodoLists();
        },

        // Start daily reset timer to check for UTC midnight
        startDailyResetTimer() {
            // Check every minute for daily reset and custom task resets
            this.dailyResetInterval = setInterval(() => {
                const now = new Date();
                const nowUTC = now.getTime();
                
                // Check for daily task reset - reset at 00:00 UTC
                if (this.lastResetDate) {
                    const lastResetTime = this.lastResetDate.getTime();
                    const currentUTCDate = Math.floor(nowUTC / (24 * 60 * 60 * 1000));
                    const lastResetUTCDate = Math.floor(lastResetTime / (24 * 60 * 60 * 1000));
                    
                    if (currentUTCDate > lastResetUTCDate) {
                        console.log('🔄 UTC midnight passed - resetting daily tasks');
                        this.resetDailyTasks();
                    }
                } else {
                    // First time - set the reset date
                    this.lastResetDate = new Date();
                    this.saveDailyTasks();
                }
                
                // Check for custom task auto-resets
                this.checkCustomTaskResets();
            }, 60000); // Check every minute
            
            console.log('⏰ Daily reset timer started');
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
            // Do an immediate check
            setTimeout(() => {
                this.checkApiForCompletedTasks();
            }, 2000); // Wait 2 seconds for initialization to complete
            
            // Check API every 1 minute for task completion (increased frequency for testing)
            this.apiCheckInterval = setInterval(async () => {
                await this.checkApiForCompletedTasks();
            }, 60000); // 1 minute instead of 5 minutes for better responsiveness
            
            console.log('🔍 API check interval started (checking every minute)');
        },

        // Check Torn API for completed daily tasks
        async checkApiForCompletedTasks() {
            try {
                // Wait for API system to be ready
                let attempts = 0;
                while (attempts < 10 && !window.SidekickModules?.Api?.makeRequest) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                
                if (!window.SidekickModules?.Api?.makeRequest) {
                    console.log('⚠️ No API system available for daily task checking');
                    return;
                }
                
                console.log('🔍 Checking Torn API for daily task updates...');
                
                // Get user data with personalstats for daily tracking
                const personalStatsData = await window.SidekickModules.Api.makeRequest('user', 'personalstats');
                
                // Get log data for xanax checking since 00:00 UTC
                const logData = await window.SidekickModules.Api.makeRequest('user', 'log');
                
                if (personalStatsData && !personalStatsData.error && personalStatsData.personalstats) {
                    console.log('📊 Personal stats received');
                    this.updateTasksFromApi(personalStatsData.personalstats, logData?.log);
                } else if (personalStatsData && personalStatsData.error) {
                    console.error('❌ API Error checking daily tasks:', personalStatsData.error);
                }
            } catch (error) {
                console.error('❌ Error checking API for daily tasks:', error);
            }
        },

        // Update daily task completion based on API data
        updateTasksFromApi(personalstats, logData = null) {
            let hasUpdates = false;
            
            console.log('📋 Updating tasks from API data...');
            
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
                
                // Special handling for xanax - check logs instead of personal stats
                if (taskKey === 'xanaxDose') {
                    console.log('💊 Starting xanax detection...');
                    // Try both UTC and local timezone calculations
                    const xanaxCountUTC = this.countXanaxFromLogs(logData, todayUTCStartTimestamp, 'UTC');
                    const xanaxCountLocal = this.countXanaxFromLogs(logData, alternativeTimestamp, 'LOCAL');
                    
                    // Use the higher count (in case timezone calculation is wrong)
                    const xanaxCount = Math.max(xanaxCountUTC, xanaxCountLocal);
                    console.log(`💊 Final xanax count: UTC=${xanaxCountUTC}, Local=${xanaxCountLocal}, Using=${xanaxCount}`);
                    if (xanaxCount !== task.currentCount) {
                        task.currentCount = xanaxCount;
                        task.completed = xanaxCount >= task.maxCount;
                        hasUpdates = true;
                        console.log(`💊 Updated ${task.name}: ${xanaxCount}/${task.maxCount} from logs`);
                    }
                    continue;
                }
                
                // Regular handling for other tasks using personal stats
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
                    
                    if (task.maxCount && taskKey !== 'xanaxDose') {
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
            } else {
                console.log('ℹ️ No updates needed for daily tasks');
            }
        },

        // Count xanax usage from logs since 00:00 UTC
        countXanaxFromLogs(logData, sinceTimestamp, timezone = 'UTC') {
            console.log(`🔍 [${timezone}] Raw logData received:`, logData);
            console.log(`🔍 [${timezone}] logData type:`, typeof logData);
            console.log(`🔍 [${timezone}] logData keys:`, logData ? Object.keys(logData) : 'null');
            
            // Handle different log data formats from Torn API
            let logsArray = [];
            
            if (!logData) {
                console.log(`⚠️ [${timezone}] No log data provided`);
                return 0;
            }
            
            if (Array.isArray(logData)) {
                // Direct array format
                logsArray = logData;
                console.log(`📊 [${timezone}] Using direct array format: ${logsArray.length} entries`);
            } else if (logData.log && Array.isArray(logData.log)) {
                // Nested under 'log' property
                logsArray = logData.log;
                console.log(`📊 [${timezone}] Using nested log array: ${logsArray.length} entries`);
            } else if (typeof logData === 'object') {
                // Object format - convert values to array
                logsArray = Object.values(logData);
                console.log(`📊 [${timezone}] Converting object to array: ${logsArray.length} entries`);
            } else {
                console.log(`⚠️ [${timezone}] Unknown log data format:`, logData);
                return 0;
            }
            
            if (!Array.isArray(logsArray) || logsArray.length === 0) {
                console.log(`⚠️ [${timezone}] No valid log entries found`);
                return 0;
            }
            
            console.log(`🔍 [${timezone}] Searching logs for xanax usage since timestamp: ${sinceTimestamp} (${new Date(sinceTimestamp * 1000).toISOString()})`);
            console.log(`📊 [${timezone}] Total log entries to check: ${logsArray.length}`);
            
            let xanaxCount = 0;
            let checkedEntries = 0;
            let recentEntries = [];
            
            // Search for xanax usage in logs
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
                
                // Look for xanax usage patterns in log text
                if (entry.log && typeof entry.log === 'string') {
                    const logText = entry.log;
                    
                    // Check for numeric log codes first (new format)
                    const numericCode = parseInt(logText.trim());
                    let foundXanax = false;
                    let matchedPattern = '';
                    
                    if (!isNaN(numericCode)) {
                        // Known Torn log codes for xanax usage (based on research)
                        const xanaxCodes = [
                            2290, // Primary xanax usage code
                            2291, // Alternative xanax code 
                            2292, // Another possible xanax variant
                            // Add more codes as discovered
                        ];
                        
                        if (xanaxCodes.includes(numericCode)) {
                            foundXanax = true;
                            matchedPattern = `Numeric Code: ${numericCode} (xanax usage)`;
                        }
                    }
                    
                    // Fallback to text patterns if no numeric match (legacy format)
                    if (!foundXanax) {
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
                        
                        for (let i = 0; i < xanaxPatterns.length; i++) {
                            const pattern = xanaxPatterns[i];
                            if (pattern.test(logText)) {
                                foundXanax = true;
                                matchedPattern = `Text Pattern ${i + 1}: ${pattern.toString()}`;
                                break;
                            }
                        }
                    }
                    
                    if (foundXanax) {
                        xanaxCount++;
                        console.log(`💊 [${timezone}] Found xanax usage #${xanaxCount} - Matched: ${matchedPattern}`);
                        console.log(`💊 [${timezone}] Full log text: "${entry.log}"`);
                    }
                }
            }
            
            console.log(`💊 [${timezone}] Search complete:`);
            console.log(`💊 [${timezone}] - Checked ${checkedEntries} entries since ${new Date(sinceTimestamp * 1000).toISOString()}`);
            console.log(`💊 [${timezone}] - Found ${xanaxCount} xanax usages`);
            console.log(`💊 [${timezone}] Recent entries (last 5):`, recentEntries.slice(-5));
            
            if (xanaxCount === 0 && checkedEntries > 0) {
                console.log(`⚠️ [${timezone}] No xanax found but entries exist. Sample log entries:`);
                recentEntries.slice(0, 3).forEach((entry, i) => {
                    console.log(`Sample ${i + 1}: ${entry.time} - "${entry.log}"`);
                });
            }
            
            return Math.min(xanaxCount, 3); // Cap at 3 per day
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
                            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                               onmouseout="this.style.background='rgba(255,255,255,0.2)'" 
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
                                <div class="todolist-option" data-action="refresh" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">♾️ Refresh Tasks</div>
                                
                                <div class="todolist-option" data-action="pin" style="
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    color: #fff;
                                    font-size: 12px;
                                    border-bottom: 1px solid #444;
                                " onmouseover="this.style.background='#3a3a3a'" 
                                   onmouseout="this.style.background='none'">${todoList.pinned ? '🗋 Unpin' : '📌 Pin'}</div>
                                
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
                
                dropdownBtn.addEventListener('click', function(e) {
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
                });
                
                // Handle option clicks
                const options = dropdownContent.querySelectorAll('.todolist-option');
                options.forEach(option => {
                    option.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const action = option.getAttribute('data-action');
                        console.log('🔧 Option clicked:', action);
                        
                        dropdownContent.style.display = 'none';
                        
                        switch(action) {
                            case 'refresh':
                                window.SidekickModules.TodoList.checkApiForCompletedTasks();
                                break;
                            case 'pin':
                                todoList.pinned = !todoList.pinned;
                                window.SidekickModules.TodoList.saveTodoLists();
                                window.SidekickModules.TodoList.renderAllTodoLists();
                                break;
                            case 'add':
                                const taskName = prompt('Enter task name:');
                                if (taskName) {
                                    window.SidekickModules.TodoList.addCustomTask(todoList.id, taskName.trim());
                                }
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
            document.addEventListener('click', function(e) {
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
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Todo List module to global namespace
    window.SidekickModules.TodoList = TodoListModule;
    console.log("✅ Todo List Module loaded and ready");

})();