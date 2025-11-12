/**
 * Sidekick Chrome Extension - Link Group Module
 * Handles custom link collections with drag-and-drop windows
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("🔗 Loading Sidekick Link Group Module...");

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

    // Link Group Module Implementation
    const LinkGroupModule = {
        isInitialized: false,
        linkGroups: [],

        // Initialize the link group module
        async init() {
            if (this.isInitialized) {
                console.log("🔗 Link Group Module already initialized");
                return;
            }

            console.log("🔗 Initializing Link Group Module...");

            try {
                await waitForCore();
                
                // Additional check to ensure we have access to Chrome storage
                if (!window.SidekickModules?.Core?.ChromeStorage) {
                    throw new Error("Chrome storage not available");
                }
                
                await this.loadLinkGroups();
                
                // Clear any existing link groups from previous initialization attempts
                this.clearExistingLinkGroups();
                
                // Render all existing link groups
                this.renderAllLinkGroups();
                
                this.isInitialized = true;
                console.log("✅ Link Group Module initialized successfully");
            } catch (error) {
                console.error("❌ Link Group Module initialization failed:", error);
                
                // Try again after a delay
                setTimeout(() => {
                    console.log("🔄 Retrying Link Group Module initialization...");
                    this.isInitialized = false;
                    this.init();
                }, 2000);
            }
        },

        // Load link groups from storage
        async loadLinkGroups() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_linkgroups');
                if (saved && Array.isArray(saved)) {
                    this.linkGroups = saved;
                    console.log("✅ Loaded", this.linkGroups.length, "link groups from Chrome storage");
                } else {
                    this.linkGroups = [];
                    console.log("📭 No saved link groups found in Chrome storage");
                }
            } catch (error) {
                console.error('Failed to load link groups from Chrome storage:', error);
                
                // Fallback to localStorage for migration
                try {
                    const localSaved = localStorage.getItem('sidekick_linkgroups');
                    if (localSaved) {
                        this.linkGroups = JSON.parse(localSaved);
                        console.log("🔄 Migrated", this.linkGroups.length, "link groups from localStorage");
                        
                        // Save to Chrome storage and remove from localStorage
                        await this.saveLinkGroups();
                        localStorage.removeItem('sidekick_linkgroups');
                    } else {
                        this.linkGroups = [];
                    }
                } catch (migrationError) {
                    console.error('Failed to migrate from localStorage:', migrationError);
                    this.linkGroups = [];
                }
            }
        },

        // Save link groups to storage
        async saveLinkGroups() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_linkgroups', this.linkGroups);
                console.log('💾 Link groups saved successfully to Chrome storage');
            } catch (error) {
                console.error('Failed to save link groups to Chrome storage:', error);
            }
        },

        // Create a new link group window
        createLinkGroup(name = 'Links') {
            console.log('🔗 Creating new link group:', name);

            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error('❌ Content area not found');
                return;
            }

            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;
            
            // Calculate position for stacking
            const linkGroupWidth = Math.min(300, contentWidth - 40);
            const linkGroupHeight = Math.min(250, contentHeight - 60);
            const padding = 10;
            const stackOffset = 30;
            
            const linkGroupCount = this.linkGroups.length;
            const x = padding + (linkGroupCount * stackOffset) % (contentWidth - linkGroupWidth);
            const y = padding + Math.floor((linkGroupCount * stackOffset) / (contentWidth - linkGroupWidth)) * stackOffset;

            const linkGroup = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                links: [],
                x: x,
                y: y,
                width: linkGroupWidth,
                height: linkGroupHeight,
                pinned: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };

            this.linkGroups.push(linkGroup);
            this.saveLinkGroups();
            this.renderLinkGroup(linkGroup);
            
            console.log('🔗 Link group created successfully, total groups:', this.linkGroups.length);
            return linkGroup;
        },

        // Render a link group window
        renderLinkGroup(linkGroup) {
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Remove existing element if it exists
            const existingElement = document.getElementById(`sidekick-linkgroup-${linkGroup.id}`);
            if (existingElement) {
                existingElement.remove();
            }

            const linkGroupElement = document.createElement('div');
            linkGroupElement.className = 'movable-linkgroup';
            linkGroupElement.id = `sidekick-linkgroup-${linkGroup.id}`;
            linkGroupElement.dataset.linkgroupId = linkGroup.id;
            
            const width = Math.max(linkGroup.width || 300, 200);
            const height = Math.max(linkGroup.height || 250, 150);
            const x = Math.max(linkGroup.x || 10, 0);
            const y = Math.max(linkGroup.y || 10, 0);

            linkGroupElement.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: linear-gradient(145deg, #37474F, #263238);
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 200px;
                min-height: 150px;
                z-index: 1000;
                resize: ${linkGroup.pinned ? 'none' : 'both'};
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;
            
            linkGroupElement.innerHTML = `
                <div class="linkgroup-header" style="
                    background: linear-gradient(135deg, #607D8B, #455A64);
                    border-bottom: 1px solid #555;
                    padding: 4px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: ${linkGroup.pinned ? 'default' : 'move'};
                    height: 24px;
                    flex-shrink: 0;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <input class="linkgroup-name" value="${this.escapeHtml(linkGroup.name)}" style="
                        background: none;
                        border: none;
                        color: #fff;
                        font-weight: 600;
                        font-size: 11px;
                        flex: 1;
                        min-width: 0;
                    " title="Edit name">
                    
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <div class="linkgroup-dropdown" style="position: relative;">
                            <button class="linkgroup-dropdown-btn" style="
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
                            <div class="linkgroup-dropdown-content" style="
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
                                <button class="add-link-btn" style="
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
                                    ➕ Add Link
                                </button>
                                <button class="pin-linkgroup-btn" style="
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
                                    ${linkGroup.pinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                            </div>
                        </div>
                        
                        <button class="linkgroup-close" style="
                            background: #f44336;
                            border: none;
                            color: white;
                            cursor: pointer;
                            width: 16px;
                            height: 14px;
                            border-radius: 3px;
                            font-size: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                        " title="Close">×</button>
                    </div>
                </div>
                
                <div class="linkgroup-content" style="
                    flex: 1;
                    padding: 8px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                ">
                    ${linkGroup.links.length === 0 ? 
                        `<div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
                            Click the + button to add links
                        </div>` : 
                        linkGroup.links.map(link => this.renderLink(link)).join('')
                    }
                </div>
            `;

            contentArea.appendChild(linkGroupElement);
            this.setupLinkGroupEventListeners(linkGroup, linkGroupElement);
            
            console.log('🔗 Link group rendered:', linkGroup.name);
        },

        // Render individual link
        renderLink(link) {
            return `
                <div class="link-item" data-link-id="${link.id}" style="
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 6px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.2s;
                ">
                    <a href="${this.escapeHtml(link.url)}" target="_blank" style="
                        color: #4CAF50;
                        text-decoration: none;
                        font-size: 12px;
                        flex: 1;
                        min-width: 0;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${this.escapeHtml(link.name)}</a>
                    
                    <button class="remove-link-btn" data-link-id="${link.id}" style="
                        background: #f44336;
                        border: none;
                        color: white;
                        cursor: pointer;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        font-size: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                        margin-left: 8px;
                    " title="Remove link">×</button>
                </div>
            `;
        },

        // Set up event listeners for link group
        setupLinkGroupEventListeners(linkGroup, element) {
            // Name editing
            const nameInput = element.querySelector('.linkgroup-name');
            nameInput.addEventListener('blur', () => {
                linkGroup.name = nameInput.value.trim() || 'Links';
                linkGroup.modified = new Date().toISOString();
                this.saveLinkGroups();
            });

            // Dropdown functionality
            const dropdownBtn = element.querySelector('.linkgroup-dropdown-btn');
            const dropdownContent = element.querySelector('.linkgroup-dropdown-content');
            
            if (dropdownBtn && dropdownContent) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = dropdownContent.style.display === 'block';
                    
                    // Close all other dropdowns first
                    document.querySelectorAll('.linkgroup-dropdown-content').forEach(dropdown => {
                        dropdown.style.display = 'none';
                    });
                    
                    dropdownContent.style.display = isVisible ? 'none' : 'block';
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    dropdownContent.style.display = 'none';
                });
            }

            // Add link button (now inside dropdown)
            const addLinkBtn = element.querySelector('.add-link-btn');
            addLinkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.style.display = 'none';
                this.showAddLinkDialog(linkGroup);
            });

            // Pin button
            const pinBtn = element.querySelector('.pin-linkgroup-btn');
            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                linkGroup.pinned = !linkGroup.pinned;
                dropdownContent.style.display = 'none';
                this.saveLinkGroups();
                this.renderLinkGroup(linkGroup);
            });

            // Close button
            const closeBtn = element.querySelector('.linkgroup-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${linkGroup.name}" link group?`)) {
                    this.deleteLinkGroup(linkGroup.id);
                }
            });

            // Remove link buttons
            element.querySelectorAll('.remove-link-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const linkId = btn.dataset.linkId;
                    this.removeLink(linkGroup.id, linkId);
                });
            });

            // Make draggable
            this.makeDraggable(element, linkGroup);
        },

        // Show add link dialog
        showAddLinkDialog(linkGroup) {
            const name = prompt('Link name:');
            if (!name || !name.trim()) return;

            const url = prompt('Link URL (include https://):');
            if (!url || !url.trim()) return;

            const link = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: name.trim(),
                url: url.trim()
            };

            linkGroup.links.push(link);
            linkGroup.modified = new Date().toISOString();
            this.saveLinkGroups();
            this.renderLinkGroup(linkGroup);
        },

        // Remove link from group
        removeLink(linkGroupId, linkId) {
            const linkGroup = this.linkGroups.find(lg => lg.id === linkGroupId);
            if (!linkGroup) return;

            linkGroup.links = linkGroup.links.filter(link => link.id !== linkId);
            linkGroup.modified = new Date().toISOString();
            this.saveLinkGroups();
            this.renderLinkGroup(linkGroup);
        },

        // Delete entire link group
        deleteLinkGroup(id) {
            const element = document.getElementById(`sidekick-linkgroup-${id}`);
            if (element) {
                element.remove();
            }

            this.linkGroups = this.linkGroups.filter(lg => lg.id !== id);
            this.saveLinkGroups();
            
            console.log('🔗 Link group deleted');
        },

        // Make element draggable
        makeDraggable(element, linkGroup) {
            const header = element.querySelector('.linkgroup-header');
            if (!header) return;

            let isDragging = false;
            let isResizing = false;
            let currentX = linkGroup.x || 0;
            let currentY = linkGroup.y || 0;
            let initialX;
            let initialY;
            let xOffset = currentX;
            let yOffset = currentY;

            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            // Add resize observer to save dimensions when changed
            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        if (entry.target === element && !isResizing) {
                            const rect = entry.contentRect;
                            linkGroup.width = Math.max(rect.width, 200);
                            linkGroup.height = Math.max(rect.height, 150);
                            linkGroup.modified = new Date().toISOString();
                            
                            // Save dimensions after a short delay to avoid excessive saves during resize
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveLinkGroups();
                                console.log(`📐 Link group size saved: ${linkGroup.width}x${linkGroup.height}`);
                            }, 500);
                        }
                    }
                });
                resizeObserver.observe(element);
            }

            function dragStart(e) {
                if (e.target.closest('input') || e.target.closest('button') || linkGroup.pinned) return;
                
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

                    // Save position to linkGroup object
                    linkGroup.x = currentX;
                    linkGroup.y = currentY;
                    linkGroup.modified = new Date().toISOString();
                    
                    // Save to storage
                    if (window.SidekickModules?.LinkGroup?.saveLinkGroups) {
                        window.SidekickModules.LinkGroup.saveLinkGroups();
                    }
                    
                    console.log(`🔗 Link group position saved: x=${currentX}, y=${currentY}`);
                }
            }
        },

        // Render all link groups
        renderAllLinkGroups() {
            console.log('🔗 Rendering all link groups:', this.linkGroups.length);
            this.linkGroups.forEach(linkGroup => this.renderLinkGroup(linkGroup));
        },

        // Clear all existing link group elements
        clearExistingLinkGroups() {
            const existingLinkGroups = document.querySelectorAll('[id^="sidekick-linkgroup-"]');
            existingLinkGroups.forEach(element => element.remove());
        },

        // Refresh link groups (useful for when sidebar is reopened)
        refresh() {
            console.log('🔗 Refreshing link groups...');
            this.clearExistingLinkGroups();
            this.renderAllLinkGroups();
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

    // Export Link Group module to global namespace
    window.SidekickModules.LinkGroup = LinkGroupModule;
    console.log("✅ Link Group Module loaded and ready");

})();