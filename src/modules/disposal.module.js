/**
 * Disposal JARVIS Module
 * Color-codes disposal method buttons by safety level.
 * Selector approach adapted from Taznister's Disposal crime helper (MIT).
 */
const DisposalModule = (() => {
    const STORAGE_KEY = 'crime-disposal';
    const DISPOSAL_HASH = '/disposal';
    let observer = null;

    // Border styles per safety level
    const STYLES = {
        safe: 'border: 4px solid #5fbb83 !important;',
        caut: 'border: 2px solid #e4e460 !important;',
        risk: 'border: 2px solid #d29b5d !important;',
        fail: 'border: 2px solid #d25858 !important;',
        none: ''
    };

    // Keyed by item name → method (aria-label) → safety level
    // Method names must exactly match the aria-label on the buttons in Torn's DOM
    const DISPOSAL_METHODS = {
        'Biological Waste': { Abandon: 'risk', Bury: 'caut', Burn: 'risk', Sink: 'safe', Dissolve: 'none' },
        'Body Part':        { Abandon: 'risk', Bury: 'caut', Burn: 'caut', Sink: 'caut', Dissolve: 'safe' },
        'Broken Appliance': { Abandon: 'risk', Bury: 'risk', Burn: 'none', Sink: 'safe', Dissolve: 'fail' },
        'Building Debris':  { Abandon: 'caut', Bury: 'risk', Burn: 'none', Sink: 'safe', Dissolve: 'none' },
        'Dead Body':        { Abandon: 'caut', Bury: 'safe', Burn: 'risk', Sink: 'risk', Dissolve: 'safe' },
        'Documents':        { Abandon: 'risk', Bury: 'caut', Burn: 'safe', Sink: 'fail', Dissolve: 'fail' },
        'Firearm':          { Abandon: 'risk', Bury: 'caut', Burn: 'none', Sink: 'safe', Dissolve: 'fail' },
        'General Waste':    { Abandon: 'caut', Bury: 'safe', Burn: 'safe', Sink: 'risk', Dissolve: 'fail' },
        'Industrial Waste': { Abandon: 'risk', Bury: 'caut', Burn: 'none', Sink: 'safe', Dissolve: 'none' },
        'Murder Weapon':    { Abandon: 'risk', Bury: 'caut', Burn: 'none', Sink: 'safe', Dissolve: 'fail' },
        'Old Furniture':    { Abandon: 'caut', Bury: 'risk', Burn: 'safe', Sink: 'caut', Dissolve: 'fail' },
        'Vehicle':          { Abandon: 'risk', Bury: 'none', Burn: 'safe', Sink: 'safe', Dissolve: 'none' }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    function isCrimesPage() {
        const url = new URL(window.location.href);
        return (
            (url.pathname.endsWith('/page.php') || url.pathname.endsWith('/loader.php')) &&
            url.searchParams.get('sid') === 'crimes'
        );
    }

    function isDisposalPage() {
        return isCrimesPage() && window.location.hash.includes(DISPOSAL_HASH);
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    function processAll() {
        // Use stable prefix selectors — avoids hashed class names that change with every Torn deploy
        const sections = document.querySelectorAll("div[class^='crimeOptionSection']");
        if (!sections.length) return;

        let processed = 0;
        sections.forEach(section => {
            const itemName = section.textContent.trim();
            const methods = DISPOSAL_METHODS[itemName];
            if (!methods) return;

            const parent = section.parentElement;
            if (!parent) return;

            Object.entries(methods).forEach(([method, safety]) => {
                const style = STYLES[safety];
                if (style === undefined || style === '') return; // skip 'none'
                const btn = parent.querySelector(`[type='button'][class^='methodButton'][aria-label='${method}']`);
                if (btn) {
                    btn.style.cssText = (btn.style.cssText || '') + style;
                    processed++;
                }
            });
        });

        if (processed > 0) {
            console.log(`[Disposal] Colorized ${processed} buttons`);
        }
    }

    function startObserver() {
        if (observer) observer.disconnect();
        // Observe body — crimes-app is added dynamically so we must watch from above
        observer = new MutationObserver(processAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
    }

    // ── Module API ────────────────────────────────────────────────────────────

    async function tryEnable() {
        if (!isDisposalPage()) return;

        // Start observer immediately so we never miss React's first DOM mutations
        // while waiting for the async settings check.
        startObserver();
        processAll();

        const settings = await window.SidekickModules?.Core?.ChromeStorage?.get('sidekick_settings');
        // Default to ENABLED when key is absent (no toggle has ever been explicitly saved)
        const moduleEntry = settings?.[STORAGE_KEY];
        const isEnabled = moduleEntry === undefined ? true : moduleEntry.isEnabled === true;

        if (!isEnabled) {
            console.log('[Disposal] Disabled in settings');
            stopObserver();
            return;
        }

        processAll();
        console.log('[Disposal] Initialized on disposal page');
    }

    return {
        async init() {
            // Watch hash changes for SPA navigation (Torn uses hash routing)
            window.addEventListener('hashchange', () => {
                stopObserver();
                tryEnable();
            });

            // Run immediately if already on disposal page
            await tryEnable();
        }
    };
})();

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.Disposal = DisposalModule;
console.log('[Disposal] Registered');
