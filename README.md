# Sidekick - Chrome Extension

Enhanced sidebar and tools for Torn.com with modular features including todo lists, timers, attack lists, and more.

## Features

- **Modular Sidebar**: Customizable sidebar with various tools and utilities
- **Todo Lists**: Create and manage multiple todo lists
- **Attack Lists**: Organize and track your attack targets
- **Timers**: Set multiple timers for various activities
- **Stock Ticker**: Track your stock investments with real-time data
- **Travel Tracker**: Monitor your travel status and times
- **Event Ticker**: Stay updated with Torn events and your account anniversary
- **Training Blocker**: Prevent accidental training clicks
- **Random Target**: Quick access to random attack targets
- **And much more!**

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Sidekick"
3. Click "Add to Chrome"

### Manual Installation (Development)
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

## Development

### Prerequisites
- Node.js (v14 or higher)
- Chrome browser

### Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Sidekick.git
cd Sidekick

# Install dependencies
npm install

# Build the extension
npm run build

# Start development with file watching
npm run watch
```

### Building
```bash
# Build for development
npm run dev

# Create distribution package
npm run zip
```

### Loading in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder (after running `npm run build`)

## Usage

1. Navigate to [Torn.com](https://www.torn.com)
2. The Sidekick sidebar will automatically appear on the right side
3. Click the hamburger menu (☰) in the top-right to toggle the sidebar
4. Use the extension popup to configure settings and your API key

## Configuration

### API Key Setup
1. Get your API key from [Torn.com API page](https://www.torn.com/api.html)
2. Click the Sidekick extension icon in Chrome
3. Enter your API key in the popup
4. Click "Save Settings"

### Features
- **Auto-start**: Automatically show sidebar on page load
- **Notifications**: Enable browser notifications for various events
- **Persistence**: All your data is saved locally and synced across tabs

## Modules

The extension is built with a modular architecture:

- **Core Module**: Base functionality and storage management
- **UI Module**: Sidebar interface and panel management
- **Settings Module**: Configuration and preferences
- **Content Module**: Page-specific content management
- **Feature Modules**: Individual tools (todo, timer, stock tracker, etc.)

## Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers except for Torn.com API calls
- Your API key is stored securely in Chrome's encrypted storage
- The extension only runs on Torn.com domains

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/Sidekick/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/Sidekick/discussions)
- **Email**: your-email@example.com

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

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