// Bunker Bucks Calculator Module - Shows bunker buck values on item market
const BunkerBucksMarketModule = {
    isEnabled: false,
    STORAGE_KEY: 'bunker-bucks-market',
    
    // Bunker Buck values
    bunkerBuckTable: {
        'Yellow': {
            'Pistol / SMG': 4,
            'Melee': 6,
            'Shotgun/rifle': 10,
            'Armour': 12,
            'Heavies': 14
        },
        'Orange': {
            1: { 'Pistol / SMG': 12, 'Melee': 18, 'Shotgun/rifle': 30, 'Armour': 26, 'Heavies': 42 },
            2: { 'Pistol / SMG': 18, 'Melee': 27, 'Shotgun/rifle': 45, 'Armour': 26, 'Heavies': 63 }
        },
        'Red': {
            1: { 'Pistol / SMG': 36, 'Melee': 54, 'Shotgun/rifle': 90, 'Armour': 108, 'Heavies': 126 },
            2: { 'Pistol / SMG': 54, 'Melee': 81, 'Shotgun/rifle': 135, 'Armour': 108, 'Heavies': 189 }
        }
    },
    
    // Weapon classification lists
    weaponLists: {
        'Armour': [
            'EOD Boots', 'EOD Gloves', 'EOD Helmet', 'EOD Pants', 'EOD Apron',
            'Sentinel Helmet', 'Sentinel Apron', 'Sentinel Pants', 'Sentinel Gloves', 'Sentinel Boots',
            'Marauder Boots', 'Marauder Gloves', 'Marauder Pants', 'Marauder Body',
            'Delta Boots', 'Delta Gloves', 'Delta Gas Mask', 'Delta Pants', 'Delta Body',
            'Vanguard Respirator', 'Vanguard Body', 'Vanguard Pants', 'Vanguard Gloves', 'Vanguard Boots',
            'Assault Boots', 'Assault Gloves', 'Assault Helmet', 'Assault Pants', 'Assault Body',
            'Riot Boots', 'Riot Gloves', 'Riot Pants', 'Riot Body',
            'Dune Boots', 'Dune Gloves', 'Dune Helmet', 'Dune Pants', 'Dune Vest'
        ],
        'Heavies': [
            'China Lake', 'Egg Propelled Launcher', 'Flamethrower', 'Milkor MGL', '73 Neutrilux',
            'RPG Launcher', 'SMAW Launcher', 'Type 98 Anti Tank', 'Negev NG-5', 'M249 SAW',
            'Minigun', 'PKM', 'Rheinmetall MG 3', 'Stoner 96'
        ],
        'Shotgun/rifle': [
            'Benelli M1 Tactical', 'Benelli M4 Super', 'Blunderbuss', 'Homemade Pocket Shotgun',
            'Ithaca 37', 'Jackhammer', 'Mag 7', 'Nock Gun', 'Sawed-Off Shotgun',
            'AK-47', 'ArmaLite M-15A4', 'Enfield SA-80', 'Heckler & Koch SL8', 'M16 A2 Rifle',
            'M4A1 Colt Carbine', 'SIG 550', 'SIG 552', 'Steyr AUG', 'Tavor TAR-21',
            'Vektor CR-21', 'XM8 Rifle', 'SKS Carbine'
        ],
        'Melee': [
            'Axe', 'Baseball Bat', 'Bo Staff', 'Bread Knife', 'Butterfly Knife', 'Chain Whip',
            'Chainsaw', 'Claymore Sword', 'Cleaver', 'Cricket Bat', 'Crowbar', 'Dagger',
            'Diamond Bladed Knife', 'Fine Chisel', 'Flail', 'Frying Pan', 'Golf Club',
            'Guandao', 'Hammer', 'Ice Pick', 'Kama', 'Katana', 'Kitchen Knife',
            'Knuckle Dusters', 'Kodachi', 'Lead Pipe', 'Leather Bullwhip', 'Macana',
            'Metal Nunchakus', 'Naval Cutlass', 'Ninja Claws', 'Pen Knife', 'Poison Umbrella',
            'Riding Crop', 'Sai', 'Samurai Sword', 'Scalpel', 'Scimitar', 'Sledgehammer',
            'Spear', 'Swiss Army Knife', 'Wooden Nunchaku', 'Yasukuni Sword'
        ],
        'Pistol / SMG': [
            'Beretta 92FS', 'Beretta M9', 'Beretta Pico', 'Desert Eagle', 'Fiveseven',
            'Glock 17', 'Luger', 'Magnum', 'Qsz-92', 'Raven MP25', 'Ruger 57',
            'S&W M29', 'S&W Revolver', 'Springfield 1911', 'Taurus', 'USP 9mm',
            'Uzi', 'AK74U', 'BT MP9', 'MP5 Navy', 'MP5k', 'P90', 'Skorpion', 'TMP', 'Thompson', 'MP 40'
        ]
    },
    
    async init() {
        console.log('💰 Bunker Bucks Market initializing...');
        await this.loadSettings();
        
        if (this.isEnabled) {
            this.enable();
        }
        
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[this.STORAGE_KEY]) {
                this.loadSettings();
            }
        });
        
        console.log('💰 Bunker Bucks Market initialized');
    },
    
    async loadSettings() {
        try {
            const settings = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY) || {};
            this.isEnabled = settings.enabled || false;
        } catch (error) {
            console.error('💰 Failed to load settings:', error);
        }
    },
    
    async saveSettings() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, {
                enabled: this.isEnabled
            });
        } catch (error) {
            console.error('💰 Failed to save settings:', error);
        }
    },
    
    enable() {
        this.isEnabled = true;
        this.saveSettings();
        this.startMonitoring();
        console.log('💰 Bunker Bucks Market enabled');
    },
    
    disable() {
        this.isEnabled = false;
        this.saveSettings();
        console.log('💰 Bunker Bucks Market disabled');
    },
    
    startMonitoring() {
        if (!this.isEnabled) return;
        if (!/ItemMarket/.test(location.href)) return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList) {
                        if (node.classList.contains('itemInfoWrapper___nA_eu') || node.classList.contains('itemInfo___mNZ5j')) {
                            const popup = node.classList.contains('itemInfo___mNZ5j') ? node : node.querySelector('.itemInfo___mNZ5j');
                            if (popup) {
                                setTimeout(() => this.addBunkerBucks(popup), 100);
                                setTimeout(() => this.addBunkerBucks(popup), 500);
                            }
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    getItemName(itemInfo) {
        const descriptionElement = itemInfo.querySelector('.description___xJ1N5');
        if (descriptionElement) {
            const boldElement = descriptionElement.querySelector('.bold');
            if (boldElement) return boldElement.textContent.trim();
        }
        return '';
    },
    
    getWeaponType(itemName) {
        if (!itemName) return null;
        const name = itemName.trim();
        
        for (const [category, weapons] of Object.entries(this.weaponLists)) {
            if (weapons.includes(name) || weapons.some(weapon => name.includes(weapon) || weapon.includes(name))) {
                return category;
            }
        }
        
        const text = itemName.toLowerCase();
        if (text.includes('pistol') || text.includes('smg') || text.includes('uzi') || text.includes('glock') || text.includes('beretta')) return 'Pistol / SMG';
        if (text.includes('shotgun') || text.includes('rifle') || text.includes('ak-') || text.includes('m4')) return 'Shotgun/rifle';
        if (text.includes('armor') || text.includes('armour') || text.includes('vest')) return 'Armour';
        if (text.includes('heavy') || text.includes('minigun') || text.includes('flamethrower')) return 'Heavies';
        if (text.includes('melee') || text.includes('knife') || text.includes('sword') || text.includes('bat')) return 'Melee';
        return null;
    },
    
    getRarity(itemInfo) {
        let qualityElement = itemInfo.querySelector('.rarity___bDCDD');
        if (!qualityElement) qualityElement = itemInfo.querySelector('[class*="rarity"]');
        
        if (qualityElement) {
            if (qualityElement.className.includes('yellow')) return 'Yellow';
            if (qualityElement.className.includes('red')) return 'Red';
            if (qualityElement.className.includes('orange')) return 'Orange';
        }
        return null;
    },
    
    countBonuses(itemInfo) {
        let bonusCount = 0;
        itemInfo.querySelectorAll('.title___DbORn').forEach(element => {
            if (element.textContent.trim() === 'Bonus:') bonusCount++;
        });
        return bonusCount;
    },
    
    calculateBunkerBucks(rarity, weaponType, bonusCount) {
        if (rarity === 'Yellow') {
            return this.bunkerBuckTable['Yellow'][weaponType] || null;
        } else if (rarity === 'Orange' || rarity === 'Red') {
            if (bonusCount === 0) return null;
            const bonusKey = bonusCount >= 2 ? 2 : 1;
            if (this.bunkerBuckTable[rarity][bonusKey] && this.bunkerBuckTable[rarity][bonusKey][weaponType]) {
                return this.bunkerBuckTable[rarity][bonusKey][weaponType];
            }
        }
        return null;
    },
    
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    addBunkerBucks(itemInfo) {
        if (itemInfo.dataset.bunkerBucksAdded) return;
        itemInfo.dataset.bunkerBucksAdded = 'true';
        
        const itemName = this.getItemName(itemInfo);
        const weaponType = this.getWeaponType(itemName);
        const rarity = this.getRarity(itemInfo);
        const bonusCount = this.countBonuses(itemInfo);
        
        if (!weaponType || !rarity) return;
        
        const bunkerBucks = this.calculateBunkerBucks(rarity, weaponType, bonusCount);
        if (bunkerBucks === null) return;
        
        const propertiesList = itemInfo.querySelector('.properties___pva_l');
        if (!propertiesList) return;
        
        const previewWrapper = itemInfo.querySelector('.previewAndPropertiesWrapper___hqsZP');
        if (previewWrapper) {
            const currentHeight = parseInt(previewWrapper.style.height) || 203;
            previewWrapper.style.height = (currentHeight + 40) + 'px';
        }
        
        const allWrappers = propertiesList.querySelectorAll('.propertyWrapper___xSOH1');
        let emptyRow = null;
        
        for (let wrapper of allWrappers) {
            const propertyDiv = wrapper.querySelector('.property___hqXXN');
            if (propertyDiv && propertyDiv.children.length === 0) {
                emptyRow = wrapper;
                break;
            }
        }
        
        if (emptyRow) {
            const propertyDiv = emptyRow.querySelector('.property___hqXXN');
            propertyDiv.innerHTML = `
                <span class="title___DbORn">Bunker Bucks:</span>
                <div class="valueWrapper___vVHLn t-overflow" data-is-tooltip-opened="false">
                    <span class="t-overflow">${this.formatNumber(bunkerBucks)} BB</span>
                </div>
            `;
        } else {
            const bunkerRow = document.createElement('li');
            bunkerRow.className = 'propertyWrapper___xSOH1 property___vsfqU';
            bunkerRow.innerHTML = `
                <div class="property___hqXXN">
                    <span class="title___DbORn">Bunker Bucks:</span>
                    <div class="valueWrapper___vVHLn t-overflow" data-is-tooltip-opened="false">
                        <span class="t-overflow">${this.formatNumber(bunkerBucks)} BB</span>
                    </div>
                </div>
            `;
            propertiesList.appendChild(bunkerRow);
        }
    }
};

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.BunkerBucksMarket = BunkerBucksMarketModule;

console.log('💰 Bunker Bucks Market module registered');
