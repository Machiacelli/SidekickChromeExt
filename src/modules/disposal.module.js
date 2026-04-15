const DisposalModule = (() => {
    const DISPOSAL_STORAGE_KEY = 'crime-disposal';
    const DISPOSAL_HASH = '/disposal';
    let disposalObserver = null;

    const COLORS = {
        safe: '#40Ab24',
        moderatelySafe: '#A4D497',
        caution: '#D6BBA2',
        unsafe: '#B51B1B'
    };

    const NERVE_COSTS = {
        abandon: 6,
        bury: 8,
        burn: 10,
        sink: 12,
        dissolve: 14
    };

    const DISPOSAL_METHODS = {
        'Biological Waste': { safe: ['sink'], moderatelySafe: [], caution: ['burn'], unsafe: ['bury'] },
        'Body Part': { safe: ['dissolve'], moderatelySafe: [], caution: [], unsafe: [] },
        'Broken Appliance': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: ['dissolve'] },
        'Building Debris': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: [] },
        'Dead Body': { safe: ['dissolve'], moderatelySafe: [], caution: [], unsafe: [] },
        Documents: { safe: ['burn'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: ['dissolve', 'sink'] },
        Firearm: { safe: ['sink'], moderatelySafe: ['bury'], caution: [], unsafe: ['dissolve'] },
        'General Waste': { safe: ['burn'], moderatelySafe: ['bury'], caution: ['abandon', 'sink'], unsafe: ['dissolve'] },
        'Industrial Waste': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: [] },
        'Murder Weapon': { safe: ['sink'], moderatelySafe: [], caution: [], unsafe: ['dissolve'] },
        'Old Furniture': { safe: ['burn'], moderatelySafe: [], caution: ['abandon', 'bury', 'sink'], unsafe: ['dissolve'] },
        Vehicle: { safe: ['sink'], moderatelySafe: ['burn'], caution: ['abandon'], unsafe: [] }
    };

    function isCrimesPage() {
        const url = new URL(window.location.href);
        return (
            (url.pathname.endsWith('/page.php') || url.pathname.endsWith('/loader.php')) &&
            url.searchParams.get('sid') === 'crimes'
        );
    }

    function isDisposalPage() {
        return isCrimesPage() && window.location.hash.endsWith(DISPOSAL_HASH);
    }

    async function getSettings() {
        return window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
    }

    function shouldRun(settings) {
        return settings?.[DISPOSAL_STORAGE_KEY]?.isEnabled === true;
    }

    function findElementByClassStartingWith(prefix, parent) {
        if (!parent || !parent.getElementsByTagName) return null;

        for (const element of parent.getElementsByTagName('*')) {
            for (const className of element.classList) {
                if (className.startsWith(prefix)) {
                    return element;
                }
            }
        }
        return null;
    }

    function getDisposalItemName(jobNode) {
        const sections = findElementByClassStartingWith('sections', jobNode);
        if (!sections || sections.children.length < 2) return null;

        const nameElement = sections.children[1];
        return nameElement ? nameElement.textContent.trim() : null;
    }

    function getMethodsContainer(jobNode) {
        const sections = findElementByClassStartingWith('sections', jobNode);
        if (!sections) return null;

        let container = findElementByClassStartingWith('desktopMethodsSection', sections) ||
                        findElementByClassStartingWith('tabletMethodsSection', sections);

        if (container) {
            const picker = findElementByClassStartingWith('methodPicker', container);
            return picker || container;
        }

        return null;
    }

    function calculateMaxNerve(itemName) {
        const methods = DISPOSAL_METHODS[itemName];
        if (!methods) return 0;

        let maxNerve = 0;
        for (const method of methods.safe) {
            const nerveCost = NERVE_COSTS[method];
            if (nerveCost > maxNerve) maxNerve = nerveCost;
        }
        return maxNerve;
    }

    function colorizeDisposalMethods(jobNode) {
        const itemName = getDisposalItemName(jobNode);
        if (!itemName || !DISPOSAL_METHODS[itemName]) return;

        const methodsContainer = getMethodsContainer(jobNode);
        if (!methodsContainer) return;

        const methods = DISPOSAL_METHODS[itemName];
        const safetyBuckets = {
            safe: methods.safe,
            moderatelySafe: methods.moderatelySafe,
            caution: methods.caution,
            unsafe: methods.unsafe
        };

        for (const [safety, methodList] of Object.entries(safetyBuckets)) {
            for (const method of methodList) {
                const button = findElementByClassStartingWith(method, methodsContainer);
                if (button) {
                    const borderWidth = (safety === 'safe' || safety === 'unsafe') ? '3px' : '2px';
                    button.style.border = `${borderWidth} solid ${COLORS[safety]}`;
                }
            }
        }
    }

    function updateDisposalHeader() {
        const currentCrime = document.querySelector('[class^="currentCrime"]');
        if (!currentCrime) return;

        const container = currentCrime.querySelector('[class^="virtualList"]');
        if (!container) return;

        let totalNerve = 0;
        let jobCount = 0;

        const jobWrappers = [...container.getElementsByClassName('crimeOptionWrapper___IOnLO')];
        for (const jobNode of jobWrappers) {
            const itemName = getDisposalItemName(jobNode);
            if (itemName) {
                totalNerve += calculateMaxNerve(itemName);
                jobCount++;
            }
        }

        const titleDiv = document.querySelector('[class^="titleBar"]');
        if (titleDiv && titleDiv.children.length > 0) {
            const title = titleDiv.children[0];
            title.textContent = `Disposal ... Max Nerve needed: ${totalNerve} ... ${jobCount} jobs remaining`;
        }
    }

    function processDisposalItems() {
        const disposalItems = [...document.getElementsByClassName('crimeOptionWrapper___IOnLO')];
        if (!disposalItems.length) return;

        disposalItems.forEach(colorizeDisposalMethods);
        updateDisposalHeader();
    }

    function startDisposalObserver() {
        if (disposalObserver) {
            disposalObserver.disconnect();
        }

        disposalObserver = new MutationObserver(() => processDisposalItems());
        disposalObserver.observe(document.body, { childList: true, subtree: true });
    }

    return {
        async init() {
            if (!isDisposalPage()) {
                return;
            }

            const settings = await getSettings();
            if (!shouldRun(settings)) {
                return;
            }

            processDisposalItems();
            startDisposalObserver();
            console.log('[Disposal] Module initialized');
        }
    };
})();

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}

window.SidekickModules.Disposal = DisposalModule;
console.log('[Disposal] Registered');const DisposalModule = (() => {
    const DISPOSAL_STORAGE_KEY = 'crime-disposal';
    const DISPOSAL_HASH = '/disposal';
    let disposalObserver = null;

    // ===== DISPOSAL HELPER =====

    const COLORS = {
        safe: '#40Ab24',
        moderatelySafe: '#A4D497',
        caution: '#D6BBA2',
        unsafe: '#B51B1B'
    };

    const NERVE_COSTS = {
        abandon: 6,
        bury: 8,
        burn: 10,
        sink: 12,
        dissolve: 14
    };

    const DISPOSAL_METHODS = {
        'Biological Waste': { safe: ['sink'], moderatelySafe: [], caution: ['burn'], unsafe: ['bury'] },
        'Body Part': { safe: ['dissolve'], moderatelySafe: [], caution: [], unsafe: [] },
        'Broken Appliance': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: ['dissolve'] },
        'Building Debris': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: [] },
        'Dead Body': { safe: ['dissolve'], moderatelySafe: [], caution: [], unsafe: [] },
        Documents: { safe: ['burn'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: ['dissolve', 'sink'] },
        Firearm: { safe: ['sink'], moderatelySafe: ['bury'], caution: [], unsafe: ['dissolve'] },
        'General Waste': { safe: ['burn'], moderatelySafe: ['bury'], caution: ['abandon', 'sink'], unsafe: ['dissolve'] },
        'Industrial Waste': { safe: ['sink'], moderatelySafe: [], caution: ['abandon', 'bury'], unsafe: [] },
        'Murder Weapon': { safe: ['sink'], moderatelySafe: [], caution: [], unsafe: ['dissolve'] },
        'Old Furniture': { safe: ['burn'], moderatelySafe: [], caution: ['abandon', 'bury', 'sink'], unsafe: ['dissolve'] },
        Vehicle: { safe: ['sink'], moderatelySafe: ['burn'], caution: ['abandon'], unsafe: [] }
    };

    function isCrimesPage() {
        const url = new URL(window.location.href);
        return (
            (url.pathname.endsWith('/page.php') || url.pathname.endsWith('/loader.php')) &&
            url.searchParams.get('sid') === 'crimes'
        );
    }

    function isDisposalPage() {
        return isCrimesPage() && window.location.hash.endsWith(DISPOSAL_HASH);
    }

    async function getSettings() {
        return window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
    }

    function shouldRun(key, settings) {
        return settings?.[key]?.isEnabled === true;
    }

    function findElementByClassStartingWith(prefix, parent) {
        if (!parent || !parent.getElementsByTagName) return null;

        for (const element of parent.getElementsByTagName('*')) {
            for (const className of element.classList) {
                if (className.startsWith(prefix)) {
                    return element;
                }
            }
        }
        return null;
    }

    function getDisposalItemName(jobNode) {
        const sections = findElementByClassStartingWith('sections', jobNode);
        if (!sections || sections.children.length < 2) return null;

        const nameElement = sections.children[1];
        return nameElement ? nameElement.textContent.trim() : null;
    }

    function getMethodsContainer(jobNode) {
        const sections = findElementByClassStartingWith('sections', jobNode);
        if (!sections) return null;

        const container = findElementByClassStartingWith('desktopMethodsSection', sections) ||
            findElementByClassStartingWith('tabletMethodsSection', sections);

        if (container) {
            return findElementByClassStartingWith('methodPicker', container) || container;
        }

        return null;
    }

    function calculateMaxNerve(itemName) {
        const methods = DISPOSAL_METHODS[itemName];
        if (!methods) return 0;

        let maxNerve = 0;
        methods.safe.forEach(method => {
            const nerveCost = NERVE_COSTS[method];
            if (nerveCost > maxNerve) maxNerve = nerveCost;
        });
        return maxNerve;
    }

    function colorizeDisposalMethods(jobNode) {
        const itemName = getDisposalItemName(jobNode);
        if (!itemName || !DISPOSAL_METHODS[itemName]) return;

        const methodsContainer = getMethodsContainer(jobNode);
        if (!methodsContainer) return;

        const methods = DISPOSAL_METHODS[itemName];
        const safetyBuckets = {
            safe: methods.safe,
            moderatelySafe: methods.moderatelySafe,
            caution: methods.caution,
            unsafe: methods.unsafe
        };

        Object.entries(safetyBuckets).forEach(([safety, methodList]) => {
            methodList.forEach(method => {
                const button = findElementByClassStartingWith(method, methodsContainer);
                if (button) {
                    const borderWidth = safety === 'safe' || safety === 'unsafe' ? '3px' : '2px';
                    button.style.border = `${borderWidth} solid ${COLORS[safety]}`;
                }
            });
        });
    }

    function updateDisposalHeader() {
        const currentCrime = document.querySelector('[class^="currentCrime"]');
        if (!currentCrime) return;

        const container = currentCrime.querySelector('[class^="virtualList"]');
        if (!container) return;

        let totalNerve = 0;
        let jobCount = 0;

        const jobWrappers = [...container.getElementsByClassName('crimeOptionWrapper___IOnLO')];
        jobWrappers.forEach(jobNode => {
            const itemName = getDisposalItemName(jobNode);
            if (itemName) {
                totalNerve += calculateMaxNerve(itemName);
                jobCount += 1;
            }
        });

        const titleDiv = document.querySelector('[class^="titleBar"]');
        if (titleDiv && titleDiv.children.length > 0) {
            const title = titleDiv.children[0];
            title.textContent = `Disposal ... Max Nerve needed: ${totalNerve} ... ${jobCount} jobs remaining`;
        }
    }

    function processDisposalItems() {
        const disposalItems = [...document.getElementsByClassName('crimeOptionWrapper___IOnLO')];
        if (!disposalItems.length) return;

        disposalItems.forEach(colorizeDisposalMethods);
        updateDisposalHeader();
    }

    function startDisposalObserver() {
        if (disposalObserver) {
            disposalObserver.disconnect();
        }

        disposalObserver = new MutationObserver(() => processDisposalItems());
        disposalObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ===== INIT FUNCTIONS =====

    async function initDisposal(settings) {
        if (!isDisposalPage()) return;
        if (!shouldRun(DISPOSAL_STORAGE_KEY, settings)) return;

        processDisposalItems();
        startDisposalObserver();
        console.log('[Disposal] Disposal helper initialized');
    }

    return {
        async init() {
            if (!isCrimesPage()) return;
            const settings = await getSettings();
            if (!settings) return;

            await initDisposal(settings);
        }
    };
})();

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}

window.SidekickModules.Disposal = DisposalModule;
console.log('[Disposal] Registered');
