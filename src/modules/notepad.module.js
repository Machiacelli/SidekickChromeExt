/**
 * Sidekick Chrome Extension - Notepad Module
 * Handles notepad functionality for storing notes
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
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

                // Method 1: Try Chrome storage wrapper (now handles extension context internally)
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                        console.log("📝 Method 1: Using ChromeStorage wrapper");
                        stored = await window.SidekickModules.Core.ChromeStorage.get('sidekick_notepads');
                        console.log("✅ ChromeStorage wrapper succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper failed:", error.message);
                }

                // Method 2: Fallback to localStorage if wrapper failed
                if (stored === null) {
                    try {
                        console.log("📝 Method 2: Using localStorage fallback");
                        stored = JSON.parse(localStorage.getItem('sidekick_notepads') || 'null');
                        console.log("✅ localStorage fallback succeeded");
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback failed:", error);
                    }
                }

                this.notepads = stored || [];
                console.log(`📝 Loaded ${this.notepads.length} notepads`);

                // Refresh display after loading
                this.refreshDisplay();

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

                // Method 1: Try Chrome storage wrapper (now handles extension context internally)
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                        console.log("📝 Method 1: Saving via ChromeStorage wrapper");
                        await window.SidekickModules.Core.ChromeStorage.set('sidekick_notepads', this.notepads);
                        saved = true;
                        console.log("✅ ChromeStorage wrapper save succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper save failed:", error.message);
                }

                // Method 2: Fallback to localStorage if wrapper failed
                if (!saved) {
                    try {
                        console.log("📝 Method 2: Saving via localStorage fallback");
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

        // Create a new notepad window in the sidebar
        addNotepad(title = 'New Note') {
            console.log('📝 Adding new notepad:', title);

            const contentArea = document.getElementById('sidekick-content');
            const contentWidth = contentArea ? contentArea.clientWidth : 480; // Updated for wider sidebar
            const contentHeight = contentArea ? contentArea.clientHeight : 500;

            const notepad = {
                id: Date.now() + Math.random(),
                title: title,
                content: '',
                color: '#4CAF50', // Default color
                x: 10 + (this.notepads.length * 20), // Offset new notepads
                y: 10 + (this.notepads.length * 20),
                width: Math.min(320, contentWidth - 40), // Wider default for wider sidebar
                height: Math.min(200, contentHeight - 60), // Taller default
                pinned: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };

            this.notepads.push(notepad);
            this.saveNotepads();

            // Render the new notepad window
            this.renderNotepad(notepad);

            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(
                    'Notepad',
                    'New notepad created',
                    'info',
                    2000
                );
            }

            console.log('📝 Notepad added successfully, total notepads:', this.notepads.length);
            return notepad;
        },

        // Delete a notepad
        deleteNotepad(id) {
            const notepad = this.notepads.find(n => n.id === id);
            if (notepad && confirm(`Delete notepad "${notepad.title}"?`)) {
                console.log('📝 Deleting notepad:', id, notepad.title);

                // Remove from local array
                this.notepads = this.notepads.filter(n => n.id !== id);

                // Remove from DOM
                const element = document.querySelector(`[data-notepad-id="${id}"]`);
                if (element) {
                    element.remove();
                    console.log('📝 Removed notepad element from DOM');
                }

                // Save updated array
                this.saveNotepads();

                // Show placeholder if no notepads left
                if (this.notepads.length === 0) {
                    this.showPlaceholder();
                }

                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Notepad',
                        'Notepad deleted',
                        'success',
                        2000
                    );
                }

                console.log('📝 Notepad deleted successfully, remaining notepads:', this.notepads.length);
            }
        },

        // Update notepad content
        updateNotepad(id, updates) {
            const notepad = this.notepads.find(n => n.id === id);
            if (notepad) {
                Object.assign(notepad, updates, { modified: new Date().toISOString() });
                this.saveNotepads();
                console.log('📝 Updated notepad:', id);
                return notepad;
            }
            return null;
        },

        // Refresh display - render all notepads in sidebar
        refreshDisplay() {
            console.log('📝 Refreshing notepad display...');
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Clear existing notepads but keep other content
            const existingNotepads = contentArea.querySelectorAll('.movable-notepad');
            existingNotepads.forEach(np => np.remove());

            // Show placeholder if no notepads
            if (this.notepads.length === 0) {
                this.showPlaceholder();
                return;
            }

            // Remove placeholder if it exists
            const placeholder = contentArea.querySelector('.sidekick-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Render all notepads as pinnable windows
            this.notepads.forEach(notepad => {
                this.renderNotepad(notepad);
            });
        },

        // Show placeholder when no notepads exist
        showPlaceholder() {
            // No placeholder needed anymore - user requested removal
            return;
        },

        // Render a notepad as a pinnable window in the sidebar
        renderNotepad(notepad) {
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Remove placeholder if it exists
            const placeholder = contentArea.querySelector('.sidekick-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Create movable notepad window
            const notepadElement = document.createElement('div');
            notepadElement.className = 'movable-notepad';
            notepadElement.dataset.notepadId = notepad.id;

            // Use content area dimensions instead of sidebar dimensions
            const contentWidth = contentArea.clientWidth || 480; // Updated for wider sidebar
            const contentHeight = contentArea.clientHeight || 500;

            // Clamp notepad dimensions and position to content area
            console.log(`📏 Notepad '${notepad.name}' saved dimensions: ${notepad.width || 'none'}x${notepad.height || 'none'}`);

            const width = Math.min(Math.max(notepad.width || 320, 100), contentWidth - 20); // Smaller minimum width
            const height = Math.min(Math.max(notepad.height || 200, 80), contentHeight - 40); // Smaller minimum height
            const x = Math.min(Math.max(notepad.x || 10, 0), contentWidth - width);
            const y = Math.min(Math.max(notepad.y || 10, 0), contentHeight - height);

            console.log(`📏 Notepad '${notepad.name}' final dimensions: ${width}x${height}`);

            notepadElement.style.cssText = `
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
                min-width: 100px;
                min-height: 80px;
                z-index: 1000;
                resize: ${notepad.pinned ? 'none' : 'both'};
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;

            notepadElement.innerHTML = `
                <div class="notepad-header" style="
                    background: linear-gradient(135deg, ${notepad.color || '#4CAF50'}, ${this.darkenColor(notepad.color || '#4CAF50', 15)});
                    border-bottom: 1px solid #555;
                    padding: 4px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: ${notepad.pinned ? 'default' : 'move'};
                    height: 24px;
                    flex-shrink: 0;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                        <input type="text" class="notepad-title" value="${this.escapeHtml(notepad.title)}" 
                               placeholder="Title..." 
                               style="
                                   background: transparent;
                                   border: none;
                                   color: #fff;
                                   font-weight: 600;
                                   font-size: 11px;
                                   outline: none;
                                   flex: 1;
                                   cursor: text;
                                   min-width: 0;
                                   width: 100%;
                               ">
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 3px; min-width: 32px; flex-shrink: 0;">
                        <div class="pin-dropdown" style="position: relative;">
                            <button class="dropdown-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 10px;
                                padding: 1px 3px;
                                border-radius: 2px;
                                transition: background 0.2s;
                                min-width: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Options">⚙️</button>
                            <div class="dropdown-content" style="
                                display: none;
                                position: absolute;
                                background: #333;
                                min-width: 120px;
                                box-shadow: 0px 8px 16px rgba(0,0,0,0.3);
                                z-index: 1001;
                                border-radius: 4px;
                                border: 1px solid #555;
                                top: 100%;
                                right: 0;
                            ">
                                <button class="pin-btn" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    ${notepad.pinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                                <button class="color-btn" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    🎨 Change Color
                                </button>
                            </div>
                        </div>
                        <button class="close-btn" style="
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
                        " onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 0 8px rgba(220, 53, 69, 0.6)'" 
                           onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'; this.style.boxShadow='none'" 
                           title="Delete notepad">×</button>
                    </div>
                </div>
                <textarea placeholder="Write your notes here..." 
                          class="notepad-textarea" 
                          style="
                              flex: 1;
                              background: transparent;
                              border: none;
                              color: #fff;
                              padding: 8px;
                              font-size: 12px;
                              font-family: inherit;
                              resize: none;
                              outline: none;
                              line-height: 1.3;
                              width: 100%;
                              box-sizing: border-box;
                              scrollbar-width: thin;
                              scrollbar-color: rgba(255,255,255,0.3) transparent;
                          ">${this.escapeHtml(notepad.content)}</textarea>
            `;

            // Add CSS for webkit scrollbars
            if (!document.getElementById('notepad-scrollbar-style')) {
                const style = document.createElement('style');
                style.id = 'notepad-scrollbar-style';
                style.textContent = `
                    .notepad-textarea::-webkit-scrollbar {
                        width: 6px;
                    }
                    .notepad-textarea::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .notepad-textarea::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.3);
                        border-radius: 3px;
                    }
                    .notepad-textarea::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.5);
                    }
                `;
                document.head.appendChild(style);
            }

            // Setup event handlers for the notepad
            this.setupNotepadHandlers(notepadElement, notepad);

            contentArea.appendChild(notepadElement);
            console.log('📝 Rendered notepad window:', notepad.title);
        },

        // Setup event handlers for notepad window
        setupNotepadHandlers(notepadElement, notepad) {
            const titleInput = notepadElement.querySelector('.notepad-title');
            const textarea = notepadElement.querySelector('.notepad-textarea');
            const header = notepadElement.querySelector('.notepad-header');
            const closeBtn = notepadElement.querySelector('.close-btn');
            const dropdownBtn = notepadElement.querySelector('.dropdown-btn');
            const dropdownContent = notepadElement.querySelector('.dropdown-content');
            const pinBtn = notepadElement.querySelector('.pin-btn');
            const colorBtn = notepadElement.querySelector('.color-btn');

            // Title editing
            if (titleInput) {
                titleInput.addEventListener('input', () => {
                    notepad.title = titleInput.value;
                    this.saveNotepads();
                });

                titleInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        titleInput.blur();
                    }
                });

                // Prevent dragging when focusing on title
                titleInput.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
            }

            // Content editing
            if (textarea) {
                textarea.addEventListener('input', () => {
                    notepad.content = textarea.value;
                    this.saveNotepads();
                });

                // Focus effects - removed border styling per user feedback
                textarea.addEventListener('focus', () => {
                    // No visual change on focus
                });

                textarea.addEventListener('blur', () => {
                    // No visual change on blur
                });
            }

            // Close button
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteNotepad(notepad.id);
                });
            }

            // Dropdown functionality
            if (dropdownBtn && dropdownContent) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = dropdownContent.style.display === 'block';

                    // Close all other dropdowns first
                    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                        dropdown.style.display = 'none';
                    });

                    dropdownContent.style.display = isVisible ? 'none' : 'block';
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    dropdownContent.style.display = 'none';
                });
            }

            // Pin functionality
            if (pinBtn) {
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    notepad.pinned = !notepad.pinned;
                    pinBtn.textContent = notepad.pinned ? '📌 Unpin' : '📌 Pin';

                    notepadElement.style.resize = notepad.pinned ? 'none' : 'both';
                    header.style.cursor = notepad.pinned ? 'default' : 'move';

                    this.saveNotepads();
                    dropdownContent.style.display = 'none';
                });
            }

            // Color functionality
            if (colorBtn) {
                colorBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = 'none';
                    this.showColorPicker(notepadElement, notepad);
                });
            }

            // Dragging functionality (only if not pinned)
            if (header) {
                let isDragging = false;
                let dragOffset = { x: 0, y: 0 };

                header.addEventListener('mousedown', (e) => {
                    if (notepad.pinned) return;
                    if (e.target.closest('button') || e.target.closest('input')) return;

                    isDragging = true;
                    const rect = notepadElement.getBoundingClientRect();
                    const sidebarRect = document.getElementById('sidekick-content').getBoundingClientRect();

                    dragOffset.x = e.clientX - rect.left;
                    dragOffset.y = e.clientY - rect.top;

                    notepadElement.style.zIndex = '1100';
                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging || notepad.pinned) return;

                    const sidebarContent = document.getElementById('sidekick-content');
                    const sidebarRect = sidebarContent.getBoundingClientRect();

                    let newX = e.clientX - sidebarRect.left - dragOffset.x;
                    let newY = e.clientY - sidebarRect.top - dragOffset.y;

                    // Constrain to sidebar bounds
                    const notepadRect = notepadElement.getBoundingClientRect();
                    newX = Math.max(0, Math.min(newX, sidebarContent.offsetWidth - notepadRect.width));
                    newY = Math.max(0, Math.min(newY, sidebarContent.offsetHeight - notepadRect.height));

                    notepadElement.style.left = newX + 'px';
                    notepadElement.style.top = newY + 'px';

                    notepad.x = newX;
                    notepad.y = newY;
                });

                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        notepadElement.style.zIndex = '1000';
                        this.saveNotepads();
                    }
                });
            }

            // Resizing functionality (only if not pinned)
            let resizeTimeout;
            const resizeObserver = new ResizeObserver(entries => {
                if (notepad.pinned) return;

                for (let entry of entries) {
                    if (entry.target === notepadElement) {
                        notepad.width = entry.contentRect.width;
                        notepad.height = entry.contentRect.height;

                        // Debounce saves to prevent excessive saving during resize
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            this.saveNotepads();
                            console.log(`📏 Saved notepad '${notepad.name}' size: ${notepad.width}x${notepad.height}`);
                        }, 500);
                    }
                }
            });
            resizeObserver.observe(notepadElement);
        },

        // Show color picker for notepad
        showColorPicker(notepadElement, notepad) {
            // Remove any existing color picker
            const existingPicker = document.querySelector('.color-picker');
            if (existingPicker) existingPicker.remove();

            const colorPicker = document.createElement('div');
            colorPicker.className = 'color-picker';
            colorPicker.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #333;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 16px;
                z-index: 999999;
                display: grid;
                grid-template-columns: repeat(4, 30px);
                gap: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;

            const colors = [
                '#4CAF50', '#2196F3', '#FF9800', '#f44336',
                '#9C27B0', '#607D8B', '#795548', '#E91E63',
                '#00BCD4', '#8BC34A', '#FFC107', '#FFEB3B',
                '#BDBDBD', '#333', '#FFFFFF', '#000000'
            ];

            colors.forEach(color => {
                const colorBtn = document.createElement('div');
                colorBtn.style.cssText = `
                    width: 30px;
                    height: 30px;
                    background: ${color};
                    border: 2px solid ${notepad.color === color ? '#fff' : '#666'};
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;

                colorBtn.addEventListener('click', () => {
                    notepad.color = color;
                    const header = notepadElement.querySelector('.notepad-header');
                    header.style.background = `linear-gradient(135deg, ${color}, ${this.darkenColor(color, 15)})`;

                    this.saveNotepads();
                    colorPicker.remove();

                    console.log(`🎨 Notepad color changed to ${color}`);
                });

                colorBtn.addEventListener('mouseenter', () => {
                    colorBtn.style.transform = 'scale(1.1)';
                });

                colorBtn.addEventListener('mouseleave', () => {
                    colorBtn.style.transform = 'scale(1)';
                });

                colorPicker.appendChild(colorBtn);
            });

            document.body.appendChild(colorPicker);

            // Close when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeColorPicker(e) {
                    if (!colorPicker.contains(e.target)) {
                        colorPicker.remove();
                        document.removeEventListener('click', closeColorPicker);
                    }
                });
            }, 100);
        },

        // Utility functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        darkenColor(color, percent) {
            const num = parseInt(color.replace("#", ""), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        }
    };

    // Export Notepad module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Notepad = NotepadModule;
    console.log("✅ Notepad Module loaded and ready");

})();