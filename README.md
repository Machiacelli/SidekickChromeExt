# Sidekick - Chrome Extension

Enhanced sidebar and tools for Torn.com with modular features including todo lists, timers, attack lists, and more.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.1.1 (2025-12-01)
- **Training Blocker Improvements**:
  - Moved training blocker toggle to extension popup for easier access
  - Added continuous gym detection with 1-second interval checks
  - Fixed overlay not appearing by adding periodic checks for gym element
  - Enhanced overlay click-blocking to prevent any interaction with gym
  - Improved visual feedback with clearer message
- **Bug Fixes**:
  - Fixed syntax error in popup.js showMessage function
  - Fixed report bugs button not working in popup
  - Training blocker now properly detects gym on all Torn.com pages
  - Added interval cleanup when blocker is disabled
- **UX Enhancements**:
  - Added toggle switch UI in popup for training blocker
  - Better status persistence for training blocker setting
  - More informative overlay message directing users to toggle

### v1.0.9 (2025-12-01)
- **Bug Fixes**:
  - Removed yellow outline/border when cooldown timer windows are pinned
  - Fixed training blocker overlay not displaying properly - now shows full-screen image
  - Inventory sorter no longer adds duplicate price text, provides pure sorting functionality
- **Improvements**:
  - Pinned timers now have cleaner appearance without visual indicators
  - Training blocker overlay properly covers entire screen with DOMS image
  - Inventory sorter works seamlessly with existing Torn/TornTools market values

### v1.1.0 (2025-11-10)
- **UI Improvements**: 
  - Increased sidebar width from 320px to 400px for better content display
  - Moved settings access to extension popup menu for better organization
  - Removed settings tab from sidebar navigation
- **New Features**:
  - Added transparent "Add Module" button in bottom-left corner of sidebar
  - Interactive module selection menu with options for notepad, timer, todo list, and stock ticker
  - Enhanced dashboard with updated feature descriptions
- **Documentation**:
  - Created comprehensive INSTRUCTIONS.md file
  - Streamlined README.md to focus on essential information
  - Updated feature descriptions and usage instructions

### v1.0.0 (2025-11-10)
- Initial Chrome extension release
- Converted from Tampermonkey userscript
- Modular architecture implementation
- Chrome storage API integration
- Enhanced popup interface
- Improved notification system

## Acknowledgments

- Original Tampermonkey script development
- Torn.com community for feedback and suggestions
- Chrome extension APIs and documentation

---

**Note**: This extension is not affiliated with Torn.com. It's a community-created tool to enhance the gaming experience.