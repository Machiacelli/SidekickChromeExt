const CrimesModule = (() => {
    const DISPOSAL_STORAGE_KEY = 'crime-disposal';
    const SCAMMING_STORAGE_KEY = 'crime-scamming';
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

    function isScammingPage() {
        return isCrimesPage() && window.location.hash.includes('/scamming');
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

    const STORAGE_PREFIX = 'sidekick_crime_scamming_';

    function getLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (_err) {
            return null;
        }
    }

    function setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (_err) {
            // ignore storage failures
        }
    }

    class ScammingStore {
        constructor() {
            this.targets = {};
        }

        getSavedTargets() {
            const raw = getLocalStorage(`${STORAGE_PREFIX}targets`);
            if (!raw) return {};
            try {
                return JSON.parse(raw);
            } catch (_err) {
                return {};
            }
        }

        saveTargets() {
            setLocalStorage(`${STORAGE_PREFIX}targets`, JSON.stringify(this.targets));
        }

        updateFromData(data) {
            const targets = data?.DB?.crimesByType?.targets;
            if (!Array.isArray(targets)) return;

            this.targets = targets.reduce((memo, target) => {
                const id = target?.relevantItemKey || target?.id || null;
                if (!id) return memo;
                memo[id] = target;
                return memo;
            }, {});

            this.saveTargets();
        }

        getTarget(id) {
            return this.targets[id] || this.getSavedTargets()[id] || null;
        }
    }

    class ScammingSolver {
        constructor() {
            this.SAFE_CELL_SET = [0, 1, 2, 3, 4, 5, 12, 13, 16, 20, 28, 29, 30, 31, 32, 33, 36, 37, 38, 44, 45, 46, 49, 52, 53, 54, 55, 56, 57, 60, 61, 62, 63, 64, 65, 68, 76, 77, 78, 79, 80, 81, 84];
            this.CONCERN_SUCCESS_RATE_MAP = { 4: 0.85, 3: 0.8, 2: 0.75, 1: 0.65, 0: 0.5 };
            this.BASE_ACTION_COST = { soft: 1, strong: 2, back: 1 };
            this.FAILURE_COST_MAP = { 4: 6, 3: 5, 2: 4, 1: 3, 0: 2 };
            this.MERIT_MASK_MAP = { soft: 4, strong: 2, back: 1 };
            this.MERIT_REQUIREMENT_MASK = { soft: 1, strong: 2, back: 4 };
        }

        getActionCost(action, concern, isSafeCell) {
            const base = this.BASE_ACTION_COST[action] || 0;
            const failurePenalty = this.FAILURE_COST_MAP[concern] || 0;
            const safePenalty = isSafeCell ? 0 : 1;
            return base + failurePenalty + safePenalty;
        }

        getBestAction(target) {
            if (!target) return null;
            const concern = Number(target.concern) || 0;
            const currentCell = Number(target.currentCell) || 0;
            const isSafeCell = this.SAFE_CELL_SET.includes(currentCell);

            const actions = ['soft', 'strong', 'back'];
            let best = { action: null, cost: Infinity, score: -Infinity };

            actions.forEach(action => {
                const cost = this.getActionCost(action, concern, isSafeCell);
                const successRate = this.CONCERN_SUCCESS_RATE_MAP[concern] || 0.5;
                const score = (successRate * 100) - cost * 2;
                if (score > best.score) {
                    best = { action, cost, score };
                }
            });

            return best.action;
        }

        formatAction(action) {
            if (action === 'soft') return 'Soft cell';
            if (action === 'strong') return 'Strong cell';
            if (action === 'back') return 'Back out';
            return 'Choose carefully';
        }
    }

    class ScammingObserver {
        constructor(store, solver) {
            this.store = store;
            this.solver = solver;
            this.needsRender = false;
            this.intervalId = null;
        }

        renderStyle() {
            const styleId = 'sidekick-crime-scamming-style';
            if (document.getElementById(styleId)) return;

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .sidekick-scamming-hint { font-size: 0.9rem; color: #fff; margin-top: 6px; }
                .sidekick-scamming-hint span { display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.35); }
                .sidekick-scamming-hint .sidekick-action-soft { color: #85c254; }
                .sidekick-scamming-hint .sidekick-action-strong { color: #f6d35a; }
                .sidekick-scamming-hint .sidekick-action-back { color: #dc7474; }
            `;
            document.head.appendChild(style);
        }

        buildHintNode(action) {
            const hint = document.createElement('div');
            hint.className = 'sidekick-scamming-hint';
            const actionLabel = this.solver.formatAction(action);
            const actionClass = action === 'soft' ? 'sidekick-action-soft' : action === 'strong' ? 'sidekick-action-strong' : 'sidekick-action-back';
            hint.innerHTML = `<span class="${actionClass}">${actionLabel}</span>`;
            return hint;
        }

        updateCrimeOptions() {
            const items = document.querySelectorAll('[class*="crimeOptionWrapper"]');
            items.forEach(item => {
                const targetId = item.getAttribute('data-target-id') || item.dataset?.targetId;
                if (!targetId) return;

                const target = this.store.getTarget(targetId);
                if (!target) return;

                const existingHint = item.querySelector('.sidekick-scamming-hint');
                if (existingHint) existingHint.remove();

                const action = this.solver.getBestAction(target);
                if (!action) return;

                const hintNode = this.buildHintNode(action);
                const textContainer = item.querySelector('[class*="optionText"]') || item;
                textContainer.appendChild(hintNode);
            });
        }

        start() {
            this.renderStyle();
            this.updateCrimeOptions();
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = window.setInterval(() => this.updateCrimeOptions(), 1200);
        }
    }

    function interceptCrimesData() {
        const originalFetch = window.fetch;
        window.fetch = function (resource, init) {
            let url = typeof resource === 'string' ? resource : resource?.url;
            if (url && url.includes('page.php') && url.includes('sid=crimesData')) {
                return originalFetch.apply(this, arguments).then(async response => {
                    try {
                        const cloned = response.clone();
                        const data = await cloned.json();
                        if (data?.DB?.crimesByType?.typeID === 12) {
                            ScammingModule.store.updateFromData(data);
                            ScammingModule.observer.updateCrimeOptions();
                        }
                    } catch (_err) {
                        // ignore invalid JSON
                    }
                    return response;
                });
            }
            return originalFetch.apply(this, arguments);
        };
    }

    const ScammingModule = {
        store: new ScammingStore(),
        solver: new ScammingSolver(),
        observer: null,
        initialize() {
            this.observer = new ScammingObserver(this.store, this.solver);
            this.observer.start();
            interceptCrimesData();
        }
    };

    async function initDisposal(settings) {
        if (!isDisposalPage()) return;
        if (!shouldRun(DISPOSAL_STORAGE_KEY, settings)) return;

        processDisposalItems();
        startDisposalObserver();
        console.log('[Crimes] Disposal helper initialized');
    }

    async function initScamming(settings) {
        if (!isScammingPage()) return;
        if (!shouldRun(SCAMMING_STORAGE_KEY, settings)) return;

        if (!window.jQuery && !window.$) {
            console.warn('[Crimes] Scamming helper requires jQuery and will run only when available');
            return;
        }

        ScammingModule.initialize();
        console.log('[Crimes] Scamming helper initialized');
    }

    return {
        async init() {
            if (!isCrimesPage()) return;
            const settings = await getSettings();
            if (!settings) return;

            await initDisposal(settings);
            await initScamming(settings);
        }
    };
})();

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}

window.SidekickModules.Crimes = CrimesModule;
console.log('[Crimes] Registered');
