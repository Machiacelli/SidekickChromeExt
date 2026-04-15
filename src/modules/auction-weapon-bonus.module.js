const AuctionWeaponBonusModule = (() => {
    const STORAGE_KEY = 'auction-weapon-bonus';
    const STYLE_ID = 'sidekick-auction-weapon-bonus-styles';
    const PROCESSED_ATTR = 'data-ska-auction-weapon-bonus';
    let observer = null;
    let debounceTimer = null;

    function isAuctionPage() {
        return window.location.href.includes('amarket.php');
    }

    function isItemMarketPage() {
        const url = window.location.href;
        return url.includes('imarket.php') || url.includes('page.php?sid=ItemMarket');
    }

    function isBazaarPage() {
        return window.location.href.includes('bazaar.php');
    }

    function isMarketOrBazaarPage() {
        return isItemMarketPage() || isBazaarPage();
    }

    async function getSettings() {
        return window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
    }

    function shouldRun(settings) {
        return settings?.[STORAGE_KEY]?.isEnabled === true;
    }

    function injectStylesheet() {
        if (document.head.querySelector(`#${STYLE_ID}`)) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = STYLE_ID;
        styles.textContent = `
            .sidekick-auction-bonus-item {
                transition: background-color 0.2s ease, outline 0.2s ease;
            }

            .sidekick-auction-bonus-container {
                display: flex;
                flex-wrap: wrap;
                gap: 6px 10px;
                margin-top: 6px;
            }

            .sidekick-auction-bonus-text {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 11px;
                line-height: 1.2;
                color: #fff;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
            }

            .sidekick-auction-bonus--red .sidekick-auction-bonus-text {
                background: rgba(230, 77, 25, 0.22);
                border-color: rgba(230, 77, 25, 0.55);
            }

            .sidekick-auction-bonus--orange .sidekick-auction-bonus-text {
                background: rgba(209, 129, 0, 0.18);
                border-color: rgba(209, 129, 0, 0.65);
            }

            .sidekick-auction-bonus--yellow .sidekick-auction-bonus-text {
                background: rgba(252, 247, 94, 0.16);
                border-color: rgba(255, 255, 0, 0.6);
                color: #1c1c1c;
            }

            .sidekick-auction-bonus-icon-enhanced,
            .sidekick-auction-bonus-icon-enhanced i {
                transform: scale(1.18);
                display: inline-flex;
                transition: transform 0.2s ease;
            }

            .sidekick-auction-bonus-container + .item-bonuses {
                margin-top: 4px;
            }
        `;

        document.head.appendChild(styles);
    }

    function getAuctionItems() {
        const listItems = [...document.querySelectorAll('ul.items-list li')];
        return listItems.filter((li) => !li.classList.contains('last') && !li.classList.contains('clear'));
    }

    function extractBonusText(span) {
        const raw = span.title || span.getAttribute('title') || '';
        const nameMatch = raw.match(/<b>([^<]+)<\/b>/i);
        const bonusMatch = raw.match(/(\d+%|\d+\s*turns?)/i);
        const name = nameMatch?.[1] ? nameMatch[1].trim() : raw.replace(/<[^>]*>/g, '').trim();
        const bonus = bonusMatch?.[1] ? bonusMatch[1].trim() : '';
        return name ? `${name}${bonus ? ` ${bonus}` : ''}` : '';
    }

    function getBonusStrings(item) {
        const tooltipSpans = [...item.querySelectorAll('.item-bonuses .iconsbonuses span')];
        if (!tooltipSpans.length) {
            return [];
        }

        return tooltipSpans
            .map(extractBonusText)
            .filter(Boolean);
    }

    function getMarketBonusSpans() {
        return [...document.querySelectorAll('.item-bonuses .iconsbonuses span')];
    }

    function enhanceBonusIconSpan(span) {
        if (span.dataset.skaAuctionIconEnhanced === 'true') {
            return;
        }

        const icon = span.querySelector('i');
        if (icon) {
            icon.classList.add('sidekick-auction-bonus-icon-enhanced');
        } else {
            span.classList.add('sidekick-auction-bonus-icon-enhanced');
        }

        span.dataset.skaAuctionIconEnhanced = 'true';
    }

    function updateMarketBonusIcons() {
        if (!isMarketOrBazaarPage()) {
            return;
        }

        getMarketBonusSpans().forEach(enhanceBonusIconSpan);
    }

    function getGlowType(item) {
        const classMatch = item.className.match(/glow-([a-zA-Z0-9_-]+)/);
        if (classMatch) {
            return classMatch[1];
        }

        const outerMatch = item.outerHTML.match(/glow-([a-zA-Z0-9_-]+)/);
        return outerMatch ? outerMatch[1] : null;
    }

    function renderItem(item) {
        if (item.getAttribute(PROCESSED_ATTR) === 'true') {
            return;
        }

        const bonuses = getBonusStrings(item);
        const titleElement = item.querySelector('span.title');

        if (!titleElement) {
            item.setAttribute(PROCESSED_ATTR, 'true');
            return;
        }

        if (!bonuses.length) {
            item.setAttribute(PROCESSED_ATTR, 'true');
            return;
        }

        let bonusContainer = titleElement.querySelector('.sidekick-auction-bonus-container');
        if (!bonusContainer) {
            bonusContainer = document.createElement('div');
            bonusContainer.className = 'sidekick-auction-bonus-container';
            titleElement.appendChild(bonusContainer);
        }

        bonusContainer.innerHTML = bonuses
            .map((bonus) => `<p class="sidekick-auction-bonus-text">${bonus}</p>`)
            .join('');

        const colorType = getGlowType(item);
        if (colorType) {
            item.classList.add('sidekick-auction-bonus-item', `sidekick-auction-bonus--${colorType}`);
        }

        item.setAttribute(PROCESSED_ATTR, 'true');
    }

    function updateAuctionItems() {
        getAuctionItems().forEach(renderItem);
    }

    function handleMutations() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateAuctionItems();
            updateMarketBonusIcons();
        }, 150);
    }

    function observePageChanges(targetElement) {
        if (!targetElement) {
            return;
        }

        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(handleMutations);
        observer.observe(targetElement, {
            childList: true,
            subtree: true
        });
    }

    function waitForPageReady() {
        return new Promise((resolve) => {
            if (document.body) {
                resolve(document.body);
                return;
            }

            const listener = () => {
                document.removeEventListener('DOMContentLoaded', listener);
                resolve(document.body);
            };

            document.addEventListener('DOMContentLoaded', listener);
        });
    }

    return {
        async init() {
            const auctionPage = isAuctionPage();
            const marketPage = isMarketOrBazaarPage();

            if (!auctionPage && !marketPage) {
                return;
            }

            const settings = await getSettings();
            if (auctionPage && !shouldRun(settings)) {
                return;
            }

            injectStylesheet();

            if (auctionPage) {
                updateAuctionItems();
            }

            if (marketPage) {
                updateMarketBonusIcons();
            }

            const root = await waitForPageReady();
            observePageChanges(root);

            console.log('[AuctionWeaponBonus] Module initialized');
        }
    };
})();

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}

window.SidekickModules.AuctionWeaponBonus = AuctionWeaponBonusModule;
console.log('[AuctionWeaponBonus] Registered');
