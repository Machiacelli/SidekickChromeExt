# 🔪 Sidekick

**A powerful Chrome extension for** [Torn.com](https://www.torn.com) **that enhances your gameplay with a customizable sidebar and 30+ productivity modules.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)](https://github.com/Machiacelli/SidekickChromeExt)
[![Version](https://img.shields.io/badge/version-1.2.12-blue)](https://github.com/Machiacelli/SidekickChromeExt/releases)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## ✨ Features Overview

Sidekick adds a **400px sidebar** to Torn.com with draggable, resizable windows for comprehensive game management. All data syncs via Chrome Storage API and persists across sessions.

### 🎨 Core Features
- **Customizable Windows** - 24-color palette with gradient headers
- **Drag & Drop** - Movable, resizable windows with pin functionality
- **Persistent State** - Window positions, sizes, and content saved automatically
- **Dark Theme** - Modern UI matching Torn's aesthetic

---

## 📦 Modules

### 📝 Organization & Tracking

**📋 Todo Lists**
- Create unlimited todo lists with checkboxes
- Daily task tracking with API integration
- Auto-tracks Xanax usage (0/3 → 3/3)
- Smart completion detection

**📓 Notepads**
- Multiple notepad windows
- Rich text editing
- Auto-save to Chrome storage
- Perfect for guides, notes, targets

**🎯 Attack Lists**
- Track player targets with real-time status
- Auto-updates via Torn API (Hospital/Jail/Traveling)
- Countdown timers for availability
- Color-coded status indicators

**🔗 Link Groups**
- Organize frequently visited pages
- Quick-access bookmark collections
- Custom labels and URLs

### ⏱️ Timers & Alerts

**⏰ Cooldown Timers**
- 18 preset cooldown types (Drug, Booster, Medical, Energy, Nerve, etc.)
- Custom timers with notifications
- Multiple simultaneous timers
- Desktop notifications when complete

**⛓️ Chain Timer**
- WIP - Tracks chain timeout
- Visual countdown
- Urgent warnings

**🏎️ Racing Alert**
- Notifies when Racing activity detected
- Prevents missed races
- Background monitoring

**✈️ Flight Tracker**
- Shows arrival times for traveling players
- Auto-updates from travel page
- Multiple destination tracking

### 💰 Finance & Trading

**💵 Debt Tracker**
- Track money owed (debts) and lent (loans)
- Auto-detects payments via transaction monitoring
- Send $1 with memo "Loan" → Auto-deducts balance
- Interest tracking and reminders

**💎 Stock Advisor**
- Real-time stock price tracking
- Buy/sell recommendations
- Portfolio analysis
- Historical data viewing

**⚖️ Inventory Sorter**
- Sort items by total value in inventory
- Works with Torn/TornTools market prices
- One-click sorting

**🎯 Mug Calculator**
- Calculate potential mug amounts instantly
- Click "ℹ️" on Item Market/Bazaar profiles
- Shows: Level, Status, Money on hand, Potential mug
- Accounts for: Mug merits, Plunder %, Clothing store protection (75% reduction)
- 100% local calculation (no third-party servers)

### 🛡️ Combat & PvP

**🎲 Random Target**
- Generate random attack targets
- Configurable level ranges
- Quick attack links
- Fair match finder

**🔫 Weapon XP Tracker**
- Track weapon experience gains
- Progress to mastery
- Color-coded progress bars
- All weapon types supported

**👊 Attack Button Mover**
- Relocates attack button for easier access
- Customizable positioning
- Prevents misclicks

**🔍 Extended Chain View**
- Enhanced chain information display
- Detailed member stats
- Real-time chain tracking

### 🎓 Gym & Training

**🚫 Training Blocker**
- Prevents accidental gym training
- Overlay image blocks gym section
- Toggle on/off from extension popup
- Useful for event preparation (e.g., DOMS event)

**💪 Stats Tracker**
- Monitor stat gains over time
- Session tracking
- Historical data
- Progress visualization

### 🌍 Travel & Activities

**🗺️ Travel Arc**
- Optimized travel route recommendations
- Profit calculations
- Item arbitrage opportunities

**📊 Event Ticker**
- Real-time Torn events feed
- Customizable filters
- Company, faction, territory updates

**💊 Xanax Viewer**
- Daily Xanax usage counter
- Visual progress (0/3 → 3/3)
- Midnight UTC reset
- Integrated with todo lists

### 🕐 Quality of Life

**🕐 Clock Widget**
- TCT (Torn City Time) and local time
- Always visible in sidebar
- Clean, minimal design

**⏲️ Time on Tab**
- Shows seconds on browser tab title
- Quick glance at TCT time
- No need to switch tabs

**🐛 Bug Reporter**
- Direct bug reporting to Notion database via secure Cloudflare Worker
- Priority selection (High/Medium/Low)
- Automatic metadata collection

---

## 🚀 Installation

### From Chrome Web Store (Coming Soon)
*Extension pending Chrome Web Store review*

### Manual Installation
1. Download latest release from [Releases](https://github.com/Machiacelli/SidekickChromeExt/releases)
2. Extract ZIP file
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked**
6. Select extracted folder

---

## ⚙️ Configuration

### API Key Setup
1. Get your Torn API key: [Torn Preferences](https://www.torn.com/preferences.php#tab=api)
2. Click Sidekick extension icon → **Settings**
3. Enter API key and save

### Module Customization
- **Enable/Disable Modules**: Settings → Modules
- **Color Themes**: Click 🎨 on any window header
- **Notifications**: Settings → Notifications
- **Premium Features**: Powered by Xanax donations (see popup for details)

---

## 🎨 Color Customization

All windows support **24 vibrant colors** with professional gradients:

- **Greens & Blues**: `#4CAF50`, `#2196F3`, `#00BCD4`, `#8BC34A`
- **Reds & Oranges**: `#f44336`, `#FF9800`, `#FF5722`, `#E91E63`
- **Purples**: `#9C27B0`, `#673AB7`, `#FF4081`
- **Yellows**: `#FFC107`, `#FFEB3B`, `#FFD54F`, `#FFA726`
- **Grays**: `#607D8B`, `#795548`, `#9E9E9E`, `#BDBDBD`
- **Dark & Light**: `#333`, `#424242`, `#FFFFFF`, `#E0E0E0`

**Usage**: Click ⚙️ → 🎨 Change Color on any window.

---

## 🔐 Privacy & Security

- ✅ **100% Local Data** - All settings stored in Chrome Storage API
- ✅ **No Third-Party Tracking** - Zero external analytics
- ✅ **Secure API Calls** - Background worker handles Torn API requests
- ✅ **Open Source** - Full code transparency
- ✅ **No Ads** - Completely free

### Premium System
- Premium features unlocked via **Xanax donations** to developer ([2407280])
- Secure validation via Cloudflare Worker
- Alternative: Admin-granted premium for testers
- No payment processing - donation system only

---

## 🛠️ Development

### Tech Stack
- **Manifest V3** Chrome Extension
- **Vanilla JavaScript** (no frameworks)
- **Chrome Storage API** for persistence
- **Torn API** for live data
- **WebSocket** monitoring for real-time events

### Project Structure
```
src/
├── modules/           # 30+ feature modules
├── styles/           # CSS styling
├── main.js           # Entry point
└── background.js     # Service worker

popup/
└── popup.html        # Extension popup UI
```

### Building
No build step required! Load directly as unpacked extension.

---

## 📝 Changelog

See [CHANGELOG](README.md#changelog) for detailed version history.

**Latest:** v1.4.1 - Premium Admin Panel

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- Torn.com community for feedback
- Original Tampermonkey script contributors
- Chrome Extension API documentation

---

## ⚠️ Disclaimer

**This extension is not affiliated with Torn.com.** It's a community-created tool to enhance gameplay. Use at your own risk.

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://www.torn.com/profiles.php?XID=2407280">Machiacelli [2407280]</a></strong>
</p>

<p align="center">
  <a href="https://github.com/Machiacelli/SidekickChromeExt/issues">Report Bug</a> • 
  <a href="https://github.com/Machiacelli/SidekickChromeExt/issues">Request Feature</a> •
  <a href="https://www.torn.com/profiles.php?XID=2407280">Support Developer</a>
</p>