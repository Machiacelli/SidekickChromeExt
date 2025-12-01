/**
 * Sidekick Chrome Extension - Notion Bug Reporter Module
 * Simple helper to report bugs to Notion database via background script
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("🐛 Loading Sidekick Notion Bug Reporter Module...");

    // Bug Reporter Module Implementation
    const NotionBugReporter = {
        
        // Initialize the bug reporter
        init() {
            console.log('🐛 NotionBugReporter module initializing...');
            
            // Add keyboard shortcut for quick access (Ctrl+Shift+B)
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                    e.preventDefault();
                    NotionBugReporter.openReporter();
                }
            });
            
            console.log('✅ NotionBugReporter module initialized (Ctrl+Shift+B to open)');
        },
        
        // Open the bug reporter modal
        openReporter() {
            // Check if modal already exists
            if (document.getElementById('sidekick-bug-reporter')) {
                return;
            }
            
            this.createModal();
        },
        
        // Create the bug reporter modal
        createModal() {
            const modal = document.createElement('div');
            modal.id = 'sidekick-bug-reporter';
            modal.innerHTML = `
                <div class="bug-reporter-overlay">
                    <div class="bug-reporter-modal">
                        <div class="bug-reporter-header">
                            <h3>🐛 Report a Bug</h3>
                            <button class="bug-reporter-close" type="button">×</button>
                        </div>
                        <div class="bug-reporter-body">
                            <div class="form-group">
                                <label for="bug-title">Title *</label>
                                <input type="text" id="bug-title" placeholder="Brief description of the issue">
                            </div>
                            <div class="form-group">
                                <label for="bug-description">Description *</label>
                                <textarea id="bug-description" rows="4" placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="bug-priority">Priority</label>
                                <select id="bug-priority">
                                    <option value="Low">Low</option>
                                    <option value="Medium" selected>Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div class="bug-reporter-footer">
                                <button type="button" class="btn btn-cancel">Cancel</button>
                                <button type="button" class="btn btn-submit">Submit Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add styles
            modal.innerHTML += `
                <style>
                    .bug-reporter-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 99999;
                        font-family: Arial, sans-serif;
                    }
                    .bug-reporter-modal {
                        background: #1a1a1a;
                        border-radius: 8px;
                        width: 500px;
                        max-width: 90vw;
                        color: white;
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    .bug-reporter-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .bug-reporter-header h3 {
                        margin: 0;
                        font-size: 18px;
                    }
                    .bug-reporter-close {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    }
                    .bug-reporter-close:hover {
                        background-color: rgba(255,255,255,0.1);
                    }
                    .bug-reporter-body {
                        padding: 20px;
                    }
                    .form-group {
                        margin-bottom: 16px;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 6px;
                        font-weight: 500;
                        color: rgba(255,255,255,0.9);
                    }
                    .form-group input, .form-group textarea, .form-group select {
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 4px;
                        color: white;
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    .form-group select option {
                        background: #2a2a2a;
                        color: white;
                    }
                    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
                        outline: none;
                        border-color: #4CAF50;
                    }
                    .bug-reporter-footer {
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 20px;
                    }
                    .btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    }
                    .btn-cancel {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .btn-cancel:hover {
                        background: rgba(255,255,255,0.2);
                    }
                    .btn-submit {
                        background: #4CAF50;
                        color: white;
                    }
                    .btn-submit:hover {
                        background: #45a049;
                    }
                    .btn-submit:disabled {
                        background: #666;
                        cursor: not-allowed;
                    }
                </style>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            const closeButton = modal.querySelector('.bug-reporter-close');
            const cancelButton = modal.querySelector('.btn-cancel');
            const submitButton = modal.querySelector('.btn-submit');
            const overlay = modal.querySelector('.bug-reporter-overlay');
            
            const closeModal = () => modal.remove();
            
            closeButton.addEventListener('click', closeModal);
            cancelButton.addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            
            submitButton.addEventListener('click', () => this.handleSubmit(modal));
            
            // Focus the title input
            modal.querySelector('#bug-title').focus();
        },
        
        // Handle form submission
        async handleSubmit(modal) {
            const titleInput = modal.querySelector('#bug-title');
            const descriptionInput = modal.querySelector('#bug-description');
            const priorityInput = modal.querySelector('#bug-priority');
            const submitButton = modal.querySelector('.btn-submit');
            
            const title = titleInput.value.trim();
            const description = descriptionInput.value.trim();
            const priority = priorityInput.value;
            
            if (!title || !description) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Disable submit button and show loading
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            
            try {
                console.log('🐛 Starting bug report submission...');
                
                const result = await this.reportBug({
                    title,
                    description,
                    priority,
                    metadata: {
                        reportedVia: 'Popup Modal',
                        module: 'NotionBugReporter',
                        extensionVersion: '1.0.0',
                        timestamp: new Date().toISOString()
                    }
                });
                
                console.log('🐛 Bug report result:', result);
                
                if (result.success) {
                    alert('Bug report submitted successfully!');
                    modal.remove();
                } else {
                    console.error('🐛 Bug report failed:', result.error);
                    let errorMessage = 'Failed to submit bug report: ' + result.error;
                    
                    // Check for Notion not configured error
                    if (result.error === 'NOTION_NOT_CONFIGURED') {
                        errorMessage = result.message || 'Notion API not configured. Please add your Notion API key and database ID in background.js to enable bug reporting.';
                    } else if (result.error.includes('Network error') || result.error.includes('fetch')) {
                        errorMessage = 'Network error: Please check your internet connection. You may also need to reload the extension after updating permissions.';
                    } else if (result.error.includes('401') || result.error.includes('authorization')) {
                        errorMessage = 'Authorization error: The Notion API key may be invalid.';
                    } else if (result.error.includes('404')) {
                        errorMessage = 'Database not found: The Notion database ID may be incorrect.';
                    }
                    
                    alert(errorMessage);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Report';
                }
            } catch (error) {
                console.error('🐛 Bug report submission error:', error);
                alert('Unexpected error: ' + error.message + '. Please try reloading the extension.');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Report';
            }
        },
        
        // Main function to report a bug to Notion
        async reportBug({ title, description, priority = 'Medium', metadata = {} }) {
            try {
                console.log('🐛 Reporting bug:', title);
                
                // Validate required parameters
                if (!title || !description) {
                    throw new Error('Title and description are required');
                }
                
                // Prepare data for background script
                const bugData = {
                    title: title.trim(),
                    description: description.trim(),
                    priority: priority || 'Medium',
                    metadata: {
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        userAgent: navigator.userAgent,
                        ...metadata
                    }
                };
                
                // Send message to background script
                const response = await chrome.runtime.sendMessage({
                    action: 'reportBug',
                    data: bugData
                });
                
                if (response && response.success) {
                    console.log('✅ Bug reported successfully to Notion');
                    return { success: true, data: response.data };
                } else if (response) {
                    console.error('❌ Failed to report bug:', response.error);
                    return { success: false, error: response.error, message: response.message };
                } else {
                    console.error('❌ No response from background script - extension context may be invalidated');
                    return { success: false, error: 'EXTENSION_CONTEXT_INVALIDATED', message: 'Extension context invalidated. Please reload the extension and try again.' };
                }
                
            } catch (error) {
                console.error('❌ Error reporting bug:', error);
                return { success: false, error: error.message };
            }
        },

        // Quick helper for simple bug reports
        async quickReport(title, description) {
            return await this.reportBug({ title, description, priority: 'Medium' });
        },

        // Helper for high priority bugs
        async reportCritical(title, description, metadata = {}) {
            return await this.reportBug({ 
                title, 
                description, 
                priority: 'High', 
                metadata: { ...metadata, severity: 'critical' }
            });
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Bug Reporter module to global namespace
    window.SidekickModules.NotionBugReporter = NotionBugReporter;
    console.log("✅ Notion Bug Reporter Module loaded and ready");

})();