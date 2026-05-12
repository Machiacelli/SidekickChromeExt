/**
 * Disposal JARVIS Module
 * Color-codes disposal method buttons by safety level.
 * Selector approach adapted from Taznister's Disposal crime helper (MIT).
 *
 * Navigation detection: Torn's React Router uses history.pushState, not
 * hashchange, so we poll the URL every 300 ms to detect page transitions.
 */
const DisposalModule = (() => {
    const STORAGE_KEY = 'crime-disposal';
    const DISPOSAL_HASH = '/disposal';
    let observer = null;
    let pollInterval = null;
    let navWatcher = null;
    let lastUrl = '';
    let enabled = true;

    const STYLES = {
        safe: 'border: 4px solid #5fbb83 !important;',
        caut: 'border: 2px solid #e4e460 !important;',
        risk: 'border: 2px solid #d29b5d !important;',
        fail: 'border: 2px solid #d25858 !important;',
        none: ''
    };

    const DISPOSAL_METHODS = {
        'Biological Waste': { Abandon: 'risk', Bury: 'caut', Burn: 'risk',  Sink: 'safe', Dissolve: 'none' },
        'Body Part':        { Abandon: 'risk', Bury: 'caut', Burn: 'caut',  Sink: 'caut', Dissolve: 'safe' },
        'Broken Appliance': { Abandon: 'risk', Bury: 'risk', Burn: 'none',  Sink: 'safe', Dissolve: 'fail' },
        'Building Debris':  { Abandon: 'caut', Bury: 'risk', Burn: 'none',  Sink: 'safe', Dissolve: 'none' },
        'Dead Body':        { Abandon: 'caut', Bury: 'safe', Burn: 'risk',  Sink: 'risk', Dissolve: 'safe' },
        'Documents':        { Abandon: 'risk', Bury: 'caut', Burn: 'safe',  Sink: 'fail', Dissolve: 'fail' },
        'Firearm':          { Abandon: 'risk', Bury: 'caut', Burn: 'none',  Sink: 'safe', Dissolve: 'fail' },
        'General Waste':    { Abandon: 'caut', Bury: 'safe', Burn: 'safe',  Sink: 'risk', Dissolve: 'fail' },
        'Industrial Waste': { Abandon: 'risk', Bury: 'caut', Burn: 'none',  Sink: 'safe', Dissolve: 'none' },
        'Murder Weapon':    { Abandon: 'risk', Bury: 'caut', Burn: 'none',  Sink: 'safe', Dissolve: 'fail' },
        'Old Furniture':    { Abandon: 'caut', Bury: 'risk', Burn: 'safe',  Sink: 'caut', Dissolve: 'fail' },
        'Vehicle':          { Abandon: 'risk', Bury: 'none', Burn: 'safe',  Sink: 'safe', Dissolve: 'none' }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    function isCrimesPage() {
        const url = new URL(window.location.href);
        return (url.pathname.endsWith('/page.php') || url.pathname.endsWith('/loader.php'))
            && url.searchParams.get('sid') === 'crimes';
    }

    function isDisposalPage() {
        return isCrimesPage() && window.location.hash.includes(DISPOSAL_HASH);
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    // Idempotent — always re-applies so React-recreated DOM nodes get colored
    function processAll() {
        if (!enabled) return 0;
        const sections = document.querySelectorAll("div[class*='crimeOptionSection']");
        let processed = 0;
        sections.forEach(section => {
            const itemName = section.innerHTML.trim();
            const methods = DISPOSAL_METHODS[itemName];
            if (!methods) return;
            const parent = section.parentElement;
            if (!parent) return;
            Object.entries(methods).forEach(([method, safety]) => {
                const style = STYLES[safety];
                if (!style) return;
                const btn = parent.querySelector(
                    `button[class*='methodButton'][aria-label='${method}']`
                );
                if (btn) {
                    btn.style.cssText = (btn.style.cssText || '') + style;
                    processed++;
                }
            });
        });
        if (processed > 0) console.log(`[Disposal] Colorized ${processed} buttons`);
        return processed;
    }

    function stopPoll() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    // Poll the page for up to 15 s after activation, covering slow React renders
    function startPolling() {
        stopPoll();
        let attempts = 0;
        pollInterval = setInterval(() => {
            processAll();
            if (++attempts >= 60) stopPoll(); // 60 × 250ms = 15s
        }, 250);
    }

    function startObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(processAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopAll() {
        if (observer) { observer.disconnect(); observer = null; }
        stopPoll();
    }

    async function activate() {
        // Check settings (default enabled if key absent)
        const settings = await window.SidekickModules?.Core?.ChromeStorage?.get('sidekick_settings');
        const moduleEntry = settings?.[STORAGE_KEY];
        enabled = moduleEntry === undefined ? true : moduleEntry.isEnabled === true;

        if (!enabled) {
            console.log('[Disposal] Disabled in settings');
            stopAll();
            return;
        }

        startObserver();
        startPolling();
        console.log('[Disposal] Active on disposal page');
    }

    function deactivate() {
        stopAll();
    }

    // ── URL watchdog ─────────────────────────────────────────────────────────
    // Torn uses React Router (history.pushState) — hashchange does NOT fire.
    // Poll the href every 300 ms to detect navigation into/out of disposal.

    function startNavWatcher() {
        if (navWatcher) return;
        lastUrl = window.location.href;
        navWatcher = setInterval(() => {
            const current = window.location.href;
            if (current === lastUrl) return;
            lastUrl = current;

            if (isDisposalPage()) {
                console.log('[Disposal] Navigated to disposal page');
                stopAll();
                activate();
            } else {
                deactivate();
            }
        }, 300);
    }

    // ── Module API ────────────────────────────────────────────────────────────

    return {
        async init() {
            startNavWatcher();

            // Also keep hashchange as a fallback for direct-link navigation
            window.addEventListener('hashchange', () => {
                if (isDisposalPage()) { stopAll(); activate(); }
                else deactivate();
            });

            if (isDisposalPage()) await activate();
        }
    };
})();

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.Disposal = DisposalModule;
console.log('[Disposal] Registered');
