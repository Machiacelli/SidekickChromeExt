/**
 * Sidekick Chrome Extension - Notepad Module
 * Handles notepad functionality for storing notes
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("📝 Loading Sidekick Notepad Module...");

    // Immediate test of module availability
    setTimeout(() => {
        console.log("📝 Initial module check:");
        console.log("📝 SidekickModules exists:", !!window.SidekickModules);
        console.log("📝 Core exists:", !!window.SidekickModules?.Core);
        console.log("📝 ChromeStorage exists:", !!window.SidekickModules?.Core?.ChromeStorage);
        if (window.SidekickModules?.Core) {
            console.log("📝 Core keys:", Object.keys(window.SidekickModules.Core));
        }
    }, 50);

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                console.log("🔍 Checking for Core module...");
                console.log("🔍 SidekickModules exists:", !!window.SidekickModules);
                console.log("🔍 Core exists:", !!window.SidekickModules?.Core);
                console.log("🔍 ChromeStorage exists:", !!window.SidekickModules?.Core?.ChromeStorage);
                
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    console.log("📝 Core module with ChromeStorage ready for Notepad");
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Notepad Module Implementation
    const NotepadModule = {
        isInitialized: false,
        notepads: [],

        // Initialize the notepad module
        async init() {
            if (this.isInitialized) {
                console.log("📝 Notepad Module already initialized");
                return;
            }

            console.log("📝 Initializing Notepad Module...");

            try {
                await waitForCore();
                await this.loadNotepads();
                this.isInitialized = true;
                console.log("✅ Notepad Module initialized successfully");
            } catch (error) {
                console.error("❌ Notepad Module initialization failed:", error);
            }
        },

        // Load notepads from storage
        async loadNotepads() {
            try {
                console.log("🔍 loadNotepads - Starting with robust storage access...");
                
                let stored = null;
                
                // Method 1: Try Chrome storage wrapper if available
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                        console.log("� Method 1: Using ChromeStorage wrapper");
                        stored = await window.SidekickModules.Core.ChromeStorage.get('sidekick_notepads');
                        console.log("✅ ChromeStorage wrapper succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper failed:", error);
                }
                
                // Method 2: Try direct Chrome API if Method 1 failed
                if (stored === null && chrome?.storage?.local) {
                    try {
                        console.log("📝 Method 2: Using direct Chrome storage API");
                        stored = await new Promise((resolve) => {
                            chrome.storage.local.get(['sidekick_notepads'], (result) => {
                                resolve(result.sidekick_notepads);
                            });
                        });
                        console.log("✅ Direct Chrome storage succeeded");
                    } catch (error) {
                        console.warn("⚠️ Direct Chrome storage failed:", error);
                    }
                }
                
                // Method 3: Final fallback to localStorage
                if (stored === null) {
                    try {
                        console.log("📝 Method 3: Using localStorage fallback");
                        stored = JSON.parse(localStorage.getItem('sidekick_notepads') || 'null');
                        console.log("✅ localStorage fallback succeeded");
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback failed:", error);
                    }
                }
                
                this.notepads = stored || [];
                console.log(`📝 Loaded ${this.notepads.length} notepads`);
            } catch (error) {
                console.error('Failed to load notepads:', error);
                console.error('Error stack:', error.stack);
                this.notepads = [];
                
                // Show user-friendly error
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Notepad Error', 
                        'Failed to load saved notepads: ' + error.message, 
                        'error'
                    );
                }
            }
        },

        // Save notepads to storage
        async saveNotepads() {
            try {
                console.log("💾 saveNotepads - Starting save...");
                
                let saved = false;
                
                // Method 1: Try Chrome storage wrapper
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                        console.log("📝 Method 1: Saving via ChromeStorage wrapper");
                        await window.SidekickModules.Core.ChromeStorage.set('sidekick_notepads', this.notepads);
                        saved = true;
                        console.log("✅ ChromeStorage wrapper save succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper save failed:", error);
                }
                
                // Method 2: Try direct Chrome API if Method 1 failed
                if (!saved && chrome?.storage?.local) {
                    try {
                        console.log("📝 Method 2: Saving via direct Chrome storage API");
                        await new Promise((resolve, reject) => {
                            chrome.storage.local.set({ 'sidekick_notepads': this.notepads }, () => {
                                if (chrome.runtime.lastError) {
                                    reject(chrome.runtime.lastError);
                                } else {
                                    resolve();
                                }
                            });
                        });
                        saved = true;
                        console.log("✅ Direct Chrome storage save succeeded");
                    } catch (error) {
                        console.warn("⚠️ Direct Chrome storage save failed:", error);
                    }
                }
                
                // Method 3: Final fallback to localStorage
                if (!saved) {
                    try {
                        console.log("📝 Method 3: Saving via localStorage fallback");
                        localStorage.setItem('sidekick_notepads', JSON.stringify(this.notepads));
                        saved = true;
                        console.log("✅ localStorage fallback save succeeded");
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback save failed:", error);
                        throw error;
                    }
                }
                
                console.log('📝 Notepads saved successfully');
            } catch (error) {
                console.error('Failed to save notepads:', error);
                
                // Show user-friendly error
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Save Error', 
                        'Failed to save notepad changes: ' + error.message, 
                        'error'
                    );
                }
            }
        },

        // Create a new notepad
        createNotepad(title = 'New Note') {
            const notepad = {
                id: Date.now() + Math.random(),
                title: title,
                content: '',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };
            
            this.notepads.unshift(notepad);
            this.saveNotepads();
            return notepad;
        },

        // Delete a notepad
        deleteNotepad(id) {
            this.notepads = this.notepads.filter(notepad => notepad.id !== id);
            this.saveNotepads();
        },

        // Update a notepad
        updateNotepad(id, updates) {
            const notepad = this.notepads.find(n => n.id === id);
            if (notepad) {
                Object.assign(notepad, updates, { modified: new Date().toISOString() });
                this.saveNotepads();
                return notepad;
            }
            return null;
        },

        // Create notepad panel UI
        createNotepadPanel() {
            const panel = document.createElement('div');
            panel.className = 'sidekick-notepad-panel';
            panel.style.cssText = 'height: 100%; display: flex; flex-direction: column;';
            
            this.renderNotepadList(panel);
            return panel;
        },

        // Render the notepad list
        renderNotepadList(container) {
            container.innerHTML = `
                <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #fff; font-size: 18px;">📝 Notepads</h3>
                        <button id="sidekick-add-notepad" style="padding: 8px 12px; background: #4CAF50; 
                                                              border: none; color: white; border-radius: 5px; 
                                                              font-size: 12px; cursor: pointer; font-weight: bold;">
                            ➕ New
                        </button>
                    </div>
                </div>
                <div id="sidekick-notepad-list" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
            `;

            this.renderNotepadItems(container);
            this.attachNotepadListeners(container);
        },

        // Render individual notepad items
        renderNotepadItems(container) {
            const listContainer = container.querySelector('#sidekick-notepad-list');
            
            if (this.notepads.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; color: #aaa; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                        <div>No notepads yet</div>
                        <div style="font-size: 12px; margin-top: 10px;">Click "New" to create your first notepad</div>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = this.notepads.map(notepad => `
                <div class="notepad-item" data-id="${notepad.id}" style="background: rgba(255,255,255,0.1); 
                     margin-bottom: 10px; border-radius: 8px; padding: 15px; cursor: pointer; 
                     border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: #fff; font-size: 14px; font-weight: bold; 
                                   overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                            ${this.escapeHtml(notepad.title)}
                        </h4>
                        <button class="delete-notepad" data-id="${notepad.id}" style="background: #f44336; 
                                border: none; color: white; border-radius: 3px; padding: 4px 8px; 
                                font-size: 10px; cursor: pointer; margin-left: 10px;">
                            🗑️
                        </button>
                    </div>
                    <div style="color: #ccc; font-size: 12px; margin-bottom: 8px;">
                        ${this.formatDate(notepad.modified)}
                    </div>
                    <div style="color: #ddd; font-size: 13px; line-height: 1.4; 
                                max-height: 60px; overflow: hidden;">
                        ${this.escapeHtml(notepad.content.substring(0, 100))}${notepad.content.length > 100 ? '...' : ''}
                    </div>
                </div>
            `).join('');
        },

        // Attach event listeners for notepad list
        attachNotepadListeners(container) {
            // Add new notepad
            const addBtn = container.querySelector('#sidekick-add-notepad');
            addBtn.addEventListener('click', () => {
                const title = prompt('Enter notepad title:', 'New Note');
                if (title !== null && title.trim()) {
                    const notepad = this.createNotepad(title.trim());
                    this.renderNotepadItems(container);
                    
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Notepad Created',
                            `"${title.trim()}" has been created`,
                            'success',
                            2000
                        );
                    }
                }
            });

            // Open notepad for editing
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('notepad-item') || e.target.closest('.notepad-item')) {
                    const item = e.target.classList.contains('notepad-item') ? e.target : e.target.closest('.notepad-item');
                    const id = parseFloat(item.dataset.id);
                    this.openNotepadEditor(id, container);
                }
            });

            // Delete notepad
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-notepad')) {
                    e.stopPropagation();
                    const id = parseFloat(e.target.dataset.id);
                    const notepad = this.notepads.find(n => n.id === id);
                    
                    if (confirm(`Delete "${notepad?.title || 'this notepad'}"?`)) {
                        this.deleteNotepad(id);
                        this.renderNotepadItems(container);
                        
                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Notepad Deleted',
                                'Notepad has been removed',
                                'info',
                                2000
                            );
                        }
                    }
                }
            });
        },

        // Open notepad editor in a contained modal window
        openNotepadEditor(id, container) {
            const notepad = this.notepads.find(n => n.id === id);
            if (!notepad) return;

            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'sidekick-notepad-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            // Create notepad window
            const notepadWindow = document.createElement('div');
            notepadWindow.className = 'sidekick-notepad-window';
            notepadWindow.style.cssText = `
                background: #2a2a2a;
                border: 2px solid #555;
                border-radius: 12px;
                width: 600px;
                height: 500px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                resize: both;
                overflow: hidden;
                min-width: 400px;
                min-height: 300px;
                max-width: 90vw;
                max-height: 90vh;
                position: relative;
            `;

            // Create title bar for dragging
            const titleBar = document.createElement('div');
            titleBar.className = 'sidekick-notepad-titlebar';
            titleBar.style.cssText = `
                background: #333;
                padding: 12px 20px;
                border-bottom: 1px solid #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
                border-radius: 10px 10px 0 0;
            `;

            titleBar.innerHTML = `
                <input type="text" id="notepad-title-${id}" value="${this.escapeHtml(notepad.title)}" 
                       style="background: transparent; border: none; color: #fff; font-size: 16px; 
                              font-weight: bold; flex: 1; outline: none; border-bottom: 1px solid rgba(255,255,255,0.3);
                              cursor: text; margin-right: 15px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="save-notepad-${id}" style="padding: 6px 12px; background: #4CAF50; 
                                                  border: none; color: white; border-radius: 4px; 
                                                  font-size: 12px; cursor: pointer; font-weight: bold;">
                        💾 Save
                    </button>
                    <button id="close-notepad-${id}" style="padding: 6px 10px; background: #f44336; 
                                                    border: none; color: white; border-radius: 4px; 
                                                    font-size: 12px; cursor: pointer; font-weight: bold;">
                        ✕
                    </button>
                </div>
            `;

            // Create content area
            const contentArea = document.createElement('div');
            contentArea.style.cssText = `
                flex: 1;
                padding: 20px;
                display: flex;
                flex-direction: column;
            `;

            contentArea.innerHTML = `
                <textarea id="notepad-content-${id}" 
                          style="width: 100%; height: 100%; background: #1a1a1a; border: 1px solid #555; 
                                 color: #fff; padding: 15px; border-radius: 6px; resize: none; 
                                 font-family: 'Courier New', monospace; font-size: 14px; outline: none;"
                          placeholder="Start typing your notes here...">${this.escapeHtml(notepad.content)}</textarea>
                <div style="margin-top: 10px; font-size: 12px; color: #aaa; text-align: right;">
                    Last modified: ${this.formatDate(notepad.modified)}
                </div>
            `;

            // Assemble the window
            notepadWindow.appendChild(titleBar);
            notepadWindow.appendChild(contentArea);
            modal.appendChild(notepadWindow);

            // Make window draggable
            this.makeWindowDraggable(notepadWindow, titleBar);

            // Attach event listeners
            const titleInput = titleBar.querySelector(`#notepad-title-${id}`);
            const contentTextarea = contentArea.querySelector(`#notepad-content-${id}`);
            const saveBtn = titleBar.querySelector(`#save-notepad-${id}`);
            const closeBtn = titleBar.querySelector(`#close-notepad-${id}`);

            // Prevent dragging when clicking on input fields
            titleInput.addEventListener('mousedown', (e) => e.stopPropagation());
            titleInput.addEventListener('click', (e) => e.stopPropagation());

            // Save function
            const saveNotepad = () => {
                notepad.title = titleInput.value.trim() || 'Untitled';
                notepad.content = contentTextarea.value;
                notepad.modified = new Date().toISOString();
                this.saveNotepads();
                
                if (window.SidekickModules.Core.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Notepad Saved',
                        `"${notepad.title}" has been saved`,
                        'success',
                        2000
                    );
                }
                
                // Update the list display if it's still visible
                this.renderNotepadItems(container);
            };

            // Close function
            const closeModal = () => {
                document.body.removeChild(modal);
            };

            // Event listeners
            saveBtn.addEventListener('click', saveNotepad);
            closeBtn.addEventListener('click', closeModal);
            
            // Auto-save on content change (debounced)
            let saveTimeout;
            const autoSave = () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveNotepad, 2000);
            };
            
            titleInput.addEventListener('input', autoSave);
            contentTextarea.addEventListener('input', autoSave);

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            // Keyboard shortcuts
            modal.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveNotepad();
                }
                if (e.key === 'Escape') {
                    closeModal();
                }
            });

            // Add to document
            document.body.appendChild(modal);

            // Focus the content area
            setTimeout(() => contentTextarea.focus(), 100);
        },

        // Make window draggable
        makeWindowDraggable(windowElement, titleBar) {
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            titleBar.addEventListener('mousedown', (e) => {
                // Only start dragging if clicking on the title bar itself, not inputs/buttons
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                    return;
                }
                
                isDragging = true;
                const rect = windowElement.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
                
                titleBar.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                
                windowElement.style.position = 'fixed';
                windowElement.style.left = `${Math.max(0, Math.min(newX, window.innerWidth - windowElement.offsetWidth))}px`;
                windowElement.style.top = `${Math.max(0, Math.min(newY, window.innerHeight - windowElement.offsetHeight))}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    titleBar.style.cursor = 'move';
                }
            });
        },

        // Utility functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return date.toLocaleDateString();
        }
    };

    // Export Notepad module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Notepad = NotepadModule;
    console.log("✅ Notepad Module loaded and ready");

})();