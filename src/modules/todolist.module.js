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
                apiField: 'refills_energy_used',
                completed: false
            },
            nerveRefill: {
                name: 'Nerve Refill', 
                icon: '🧠',
                color: '#45B7D1',
                description: 'Daily nerve refill',
                apiField: 'refills_nerve_used',
                completed: false
            },
            xanaxDose: {
                name: 'Xanax Dose',
                icon: '💊',
                color: '#E74C3C', 
                description: 'Daily Xanax dose (up to 3)',
                apiField: 'xanax_taken',
                maxCount: 3,
                currentCount: 0,
                completed: false
            },
            drugsUsed: {
                name: 'Drugs Used',
                icon: '💉',
                color: '#9C27B0',
                description: 'Daily drug usage',
                apiField: 'drugs_used',
                currentCount: 0,
                completed: false
            }
        },

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
            }
            
            this.lastResetDate = new Date();
            this.saveDailyTasks();
            
            // Refresh any open todo lists
            this.renderAllTodoLists();
        },

        // Start daily reset timer to check for UTC midnight
        startDailyResetTimer() {
            // Check every minute for daily reset
            this.dailyResetInterval = setInterval(() => {
                const now = new Date();
                const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                
                if (this.lastResetDate) {
                    const lastResetUTC = new Date(Date.UTC(this.lastResetDate.getUTCFullYear(), this.lastResetDate.getUTCMonth(), this.lastResetDate.getUTCDate()));
                    
                    if (todayUTC.getTime() !== lastResetUTC.getTime()) {
                        this.resetDailyTasks();
                    }
                }
            }, 60000); // Check every minute
            
            console.log('⏰ Daily reset timer started');
        },

        // Start API check interval for automatic task completion
        startApiCheckInterval() {
            // Check API every 5 minutes for task completion
            this.apiCheckInterval = setInterval(async () => {
                await this.checkApiForCompletedTasks();
            }, 300000); // 5 minutes
            
            console.log('🔍 API check interval started');
        },

        // Check Torn API for completed daily tasks
        async checkApiForCompletedTasks() {
            try {
                const apiKey = await window.SidekickModules.Settings.getApiKey();
                if (!apiKey) {
                    console.log('⚠️ No API key configured for daily task checking');
                    return;
                }
                
                // Get user data with personalstats for daily tracking
                const response = await fetch(`https://api.torn.com/user/?selections=personalstats&key=${apiKey}`);
                const data = await response.json();
                
                if (data && !data.error && data.personalstats) {
                    this.updateTasksFromApi(data.personalstats);
                } else if (data && data.error) {
                    console.error('❌ API Error checking daily tasks:', data.error);
                }
            } catch (error) {
                console.error('❌ Error checking API for daily tasks:', error);
            }
        },

        // Update daily task completion based on API data
        updateTasksFromApi(personalstats) {
            let hasUpdates = false;
            
            for (const taskKey in this.dailyTasks) {
                const task = this.dailyTasks[taskKey];
                
                if (task.apiField && personalstats[task.apiField] !== undefined) {
                    const apiValue = personalstats[task.apiField];
                    
                    if (task.maxCount) {
                        // Multi-completion task (like xanax)
                        const newCount = Math.min(apiValue, task.maxCount);
                        if (newCount !== task.currentCount) {
                            task.currentCount = newCount;
                            task.completed = newCount >= task.maxCount;
                            hasUpdates = true;
                            console.log(`📋 Updated ${task.name}: ${newCount}/${task.maxCount}`);
                        }
                    } else {
                        // Single completion task
                        const isCompleted = apiValue > 0;
                        if (isCompleted !== task.completed) {
                            task.completed = isCompleted;
                            hasUpdates = true;
                            console.log(`📋 Updated ${task.name}: ${isCompleted ? 'completed' : 'pending'}`);
                        }
                    }
                }
            }
            
            if (hasUpdates) {
                this.saveDailyTasks();
                this.renderAllTodoLists();
            }
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
                        <button class="add-task-btn" style="
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
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                           onmouseout="this.style.background='rgba(255,255,255,0.2)'" 
                           title="Add task">+</button>
                           
                        <button class="pin-todolist-btn" style="
                            background: none;
                            border: none;
                            color: rgba(255,255,255,0.8);
                            cursor: pointer;
                            font-size: 12px;
                            padding: 2px 4px;
                            border-radius: 2px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                           onmouseout="this.style.background='none'" 
                           title="${todoList.pinned ? 'Unpin' : 'Pin'}">
                            ${todoList.pinned ? '📌' : '📌'}
                        </button>
                        
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
                ">
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
        renderCustomTask(task, todoListId) {
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

            // Add task button
            const addTaskBtn = element.querySelector('.add-task-btn');
            addTaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddTaskDialog(todoList);
            });

            // Pin button
            const pinBtn = element.querySelector('.pin-todolist-btn');
            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                todoList.pinned = !todoList.pinned;
                this.saveTodoLists();
                this.renderTodoList(todoList);
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
        showAddTaskDialog(todoList) {
            const taskName = prompt('Enter task name:');
            if (!taskName || !taskName.trim()) return;

            const task = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: taskName.trim(),
                completed: false,
                created: new Date().toISOString()
            };

            todoList.tasks.push(task);
            todoList.modified = new Date().toISOString();
            this.saveTodoLists();
            this.renderTodoList(todoList);
        },

        // Toggle task completion
        toggleTaskCompletion(todoListId, taskId) {
            const todoList = this.todoLists.find(tl => tl.id === todoListId);
            if (!todoList) return;

            const task = todoList.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.completed = !task.completed;
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