# Sidekick Chrome Extension - Instructions

## Installation

### Manual Installation (Development)
1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

## Usage

### Getting Started
1. Navigate to [Torn.com](https://www.torn.com)
2. The Sidekick hamburger button (☰) will appear in the top-left corner
3. Click the hamburger button to open/close the sidebar
4. Use the navigation tabs to switch between modules

### Setting Up Your API Key
1. Get your API key from [Torn.com API page](https://www.torn.com/api.html)
2. Click the extension icon in Chrome toolbar to open popup
3. Enter your API key and click "Save Settings"
4. Or access Settings through the sidebar navigation

### Available Modules

#### Dashboard
- Welcome screen with feature overview
- Extension status and information

#### Notes
- Create and manage multiple notepads
- Auto-save functionality (saves as you type)
- Edit and delete notes
- Timestamps for tracking

#### Settings
- Configure your Torn.com API key
- Test API connection
- Manage extension preferences

### Navigation
- **Sidebar Toggle**: Click hamburger button (☰) in top-left
- **Module Switching**: Use Dashboard/Notes/Settings tabs in sidebar
- **Auto-hide**: Sidebar automatically hides when clicking outside

## Features

### Storage
- All data is stored locally using Chrome's storage API
- Notes and settings persist across browser sessions
- Data is automatically synced across tabs

### API Integration
- Secure API key storage
- Connection testing with Torn.com API
- Error handling for API failures

### User Interface
- Left-positioned sidebar for easy access
- Responsive design that adapts to content
- Clean, modern styling
- Smooth animations and transitions

## Troubleshooting

### Extension Not Loading
1. Check that Developer mode is enabled in Chrome extensions
2. Verify all files are present in the extension folder
3. Check console for JavaScript errors

### API Key Issues
1. Ensure your API key is valid and active
2. Test the connection using the Settings module
3. Check that you have proper permissions on Torn.com

### Sidebar Not Appearing
1. Refresh the Torn.com page
2. Check that the extension is enabled in Chrome
3. Look for the hamburger button in the top-left corner

## Development

### File Structure
```
src/
├── modules/
│   ├── core.module.js      # Storage & notifications
│   ├── settings.module.js  # API key management  
│   ├── notepad.module.js   # Note-taking functionality
│   └── ui.module.js        # Interface & navigation
├── styles/main.css         # Sidebar styling
├── main.js                 # Initialization
└── background.js           # Service worker
```

### Adding New Modules
1. Create a new module file in `src/modules/`
2. Follow the existing module pattern
3. Add to manifest.json content scripts
4. Register in the UI navigation system

### Contributing
- Follow the established code structure
- Test all changes thoroughly
- Update documentation as needed
- Use meaningful commit messages

## Support

For issues, questions, or feature requests, please visit the GitHub repository.