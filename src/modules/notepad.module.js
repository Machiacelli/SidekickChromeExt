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
                console.log("🔍 loadNotepads - Checking availability...");
                console.log("🔍 SidekickModules:", !!window.SidekickModules);
                console.log("🔍 Core:", !!window.SidekickModules?.Core);
                console.log("🔍 ChromeStorage:", !!window.SidekickModules?.Core?.ChromeStorage);
                
                // Detailed debugging of ChromeStorage object
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    const chromeStorage = window.SidekickModules.Core.ChromeStorage;
                    console.log("🔍 ChromeStorage type:", typeof chromeStorage);
                    console.log("🔍 ChromeStorage keys:", Object.keys(chromeStorage));
                    console.log("🔍 ChromeStorage.get type:", typeof chromeStorage.get);
                    console.log("🔍 ChromeStorage.get exists:", !!chromeStorage.get);
                }
                
                let stored = null;
                
                // Try Chrome storage wrapper first
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    console.log("📝 Using ChromeStorage wrapper");
                    stored = await window.SidekickModules.Core.ChromeStorage.get('sidekick_notepads');
                } else {
                    console.log("📝 ChromeStorage.get not available, trying direct Chrome API");
                    // Fallback to direct Chrome API
                    if (chrome?.storage?.local) {
                        console.log("📝 Using direct Chrome storage API");
                        stored = await new Promise((resolve) => {
                            chrome.storage.local.get(['sidekick_notepads'], (result) => {
                                resolve(result.sidekick_notepads);
                            });
                        });
                    } else {
                        console.log("📝 Chrome API not available, using localStorage");
                        // Final fallback to localStorage
                        stored = JSON.parse(localStorage.getItem('sidekick_notepads') || 'null');
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
                console.log("🔍 ChromeStorage available:", !!window.SidekickModules?.Core?.ChromeStorage);
                
                // Try Chrome storage wrapper first
                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    console.log("📝 Saving via ChromeStorage wrapper");
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_notepads', this.notepads);
                } else {
                    console.log("📝 ChromeStorage.set not available, trying direct Chrome API");
                    // Fallback to direct Chrome API
                    if (chrome?.storage?.local) {
                        await new Promise((resolve, reject) => {
                            chrome.storage.local.set({ 'sidekick_notepads': this.notepads }, () => {
                                if (chrome.runtime.lastError) {
                                    reject(chrome.runtime.lastError);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    } else {
                        console.log("📝 Chrome API not available, using localStorage");
                        // Final fallback to localStorage
                        localStorage.setItem('sidekick_notepads', JSON.stringify(this.notepads));
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

        // Open notepad editor
        openNotepadEditor(id, container) {
            const notepad = this.notepads.find(n => n.id === id);
            if (!notepad) return;

            container.innerHTML = `
                <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <input type="text" id="notepad-title" value="${this.escapeHtml(notepad.title)}" 
                               style="background: transparent; border: none; color: #fff; font-size: 18px; 
                                      font-weight: bold; flex: 1; outline: none; border-bottom: 1px solid rgba(255,255,255,0.3);">
                        <div style="display: flex; gap: 10px; margin-left: 15px;">
                            <button id="save-notepad" style="padding: 8px 12px; background: #4CAF50; 
                                                          border: none; color: white; border-radius: 5px; 
                                                          font-size: 12px; cursor: pointer; font-weight: bold;">
                                💾 Save
                            </button>
                            <button id="back-to-list" style="padding: 8px 12px; background: #757575; 
                                                          border: none; color: white; border-radius: 5px; 
                                                          font-size: 12px; cursor: pointer; font-weight: bold;">
                                ← Back
                            </button>
                        </div>
                    </div>
                </div>
                <div style="flex: 1; padding: 20px;">
                    <textarea id="notepad-content" placeholder="Start writing your note..." 
                              style="width: 100%; height: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.3); 
                                     color: #fff; padding: 15px; border-radius: 8px; font-family: inherit; 
                                     font-size: 14px; line-height: 1.5; resize: none; outline: none; box-sizing: border-box;">${this.escapeHtml(notepad.content)}</textarea>
                </div>
            `;

            // Attach save and back listeners
            container.querySelector('#save-notepad').addEventListener('click', () => {
                const title = container.querySelector('#notepad-title').value.trim();
                const content = container.querySelector('#notepad-content').value;
                
                this.updateNotepad(id, { title: title || 'Untitled', content });
                
                if (window.SidekickModules.Core.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Notepad Saved',
                        `"${title || 'Untitled'}" has been saved`,
                        'success',
                        2000
                    );
                }
            });

            container.querySelector('#back-to-list').addEventListener('click', () => {
                this.renderNotepadList(container);
            });

            // Auto-save on content change
            let saveTimeout;
            const autoSave = () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    const title = container.querySelector('#notepad-title').value.trim();
                    const content = container.querySelector('#notepad-content').value;
                    this.updateNotepad(id, { title: title || 'Untitled', content });
                }, 2000);
            };

            container.querySelector('#notepad-title').addEventListener('input', autoSave);
            container.querySelector('#notepad-content').addEventListener('input', autoSave);
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