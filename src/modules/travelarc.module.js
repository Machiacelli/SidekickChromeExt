// travelarc.module.js
// Travel Arc module for Sidekick
// - Uses Torn map image: /images/v2/travel_agency/map.png
// - Works on both travel selection page and the flying page
// - Draws arc, rotating plane, trailing dashed line, pulsing glow
// - Responsive & recalculates coordinates on resize
// - Integrated with Sidekick API for precise travel timing

(function () {
    'use strict';

    const MODULE_NAME = 'TravelArc';
    const MAP_SRC = '/images/v2/travel_agency/map.png';
    const PLANE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12 L22 12 L18 8 L18 16 Z" fill="currentColor"/>
  </svg>`; // simple plane silhouette - rotated by CSS transform

    // Map coords are percentages relative to the MAP image (left:0..100, top:0..100).
    const COORDS = {
        mexico: { x: 35.0, y: 16.7 },
        cayman_islands: { x: 40.8, y: 19.4 },
        canada: { x: 41.0, y: 13.4 },
        hawaii: { x: 24.8, y: 19.1 },
        uk: { x: 57.6, y: 11.3 },
        argentina: { x: 45.4, y: 31.1 },
        switzerland: { x: 59.7, y: 12.6 },
        japan: { x: 10.9, y: 15.4 },
        china: { x: 6.1, y: 14.2 },
        uae: { x: 69.4, y: 18.0 },
        south_africa: { x: 63.9, y: 29.3 },
        torncity: { x: 38.0, y: 17.0 }
    };

    // Build the SVG overlay (absolute positioned over the map image)
    function buildOverlay(mapImgEl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'travelarc-overlay';
        Object.assign(wrapper.style, {
            position: 'absolute',
            left: `${mapImgEl.offsetLeft}px`,
            top: `${mapImgEl.offsetTop}px`,
            width: `${mapImgEl.offsetWidth}px`,
            height: `${mapImgEl.offsetHeight}px`,
            pointerEvents: 'none',
            zIndex: 9999
        });

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${mapImgEl.offsetWidth} ${mapImgEl.offsetHeight}`);
        svg.style.display = 'block';

        // path (arc)
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#69c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-dasharray', '6 6');
        path.setAttribute('class', 'travelarc-path');

        // glowing duplicate path
        const glow = document.createElementNS(svgNS, 'path');
        glow.setAttribute('fill', 'none');
        glow.setAttribute('stroke', '#69c');
        glow.setAttribute('stroke-width', '8');
        glow.setAttribute('opacity', '0.25');
        glow.setAttribute('class', 'travelarc-path-glow');

        // moving plane group
        const planeG = document.createElementNS(svgNS, 'g');
        planeG.setAttribute('class', 'travelarc-plane');
        planeG.setAttribute('transform', 'translate(0,0) rotate(0)');

        // plane marker (SVG within foreignObject)
        const foreign = document.createElementNS(svgNS, 'foreignObject');
        foreign.setAttribute('width', '48');
        foreign.setAttribute('height', '48');
        foreign.setAttribute('x', '0');
        foreign.setAttribute('y', '0');

        const foDiv = document.createElement('div');
        foDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        foDiv.style.width = '48px';
        foDiv.style.height = '48px';
        foDiv.style.display = 'flex';
        foDiv.style.alignItems = 'center';
        foDiv.style.justifyContent = 'center';
        foDiv.style.transformOrigin = '24px 24px';
        foDiv.innerHTML = PLANE_SVG;
        foreign.appendChild(foDiv);
        planeG.appendChild(foreign);

        // position dot
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('r', '6');
        dot.setAttribute('fill', '#fff');
        dot.setAttribute('stroke', '#0af');
        dot.setAttribute('stroke-width', '2');
        dot.setAttribute('class', 'travelarc-dot');

        // pulsing circle
        const pulse = document.createElementNS(svgNS, 'circle');
        pulse.setAttribute('r', '10');
        pulse.setAttribute('fill', 'none');
        pulse.setAttribute('stroke', '#69c');
        pulse.setAttribute('stroke-width', '2');
        pulse.setAttribute('opacity', '0.6');
        pulse.setAttribute('class', 'travelarc-pulse');

        svg.appendChild(glow);
        svg.appendChild(path);
        svg.appendChild(pulse);
        svg.appendChild(dot);
        svg.appendChild(planeG);
        wrapper.appendChild(svg);

        return { wrapper, svg, path, glow, planeG, dot, pulse, foDiv };
    }

    // Quadratic Bezier path generator
    function buildArcPath(ax, ay, bx, by, curvature = 0.35, width = 800, height = 400) {
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy);
        const nx = -dy / dist;
        const ny = dx / dist;
        const offset = Math.min(dist * curvature, Math.max(width, height) * 0.25);
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
    }

    // Compute plane angle at point t along path
    function getTangentAngle(pathEl, t) {
        try {
            const len = pathEl.getTotalLength();
            const p1 = pathEl.getPointAtLength(Math.max(0, t * len - 1));
            const p2 = pathEl.getPointAtLength(Math.min(len, t * len + 1));
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            return angle * (180 / Math.PI);
        } catch (e) {
            return 0;
        }
    }

    // Try to read travel data from DOM
    function tryReadTravelFromDOM() {
        const selectors = [
            '[data-travel-start]',
            '[data-travel-end]',
            '.flight-time-left',
            '.flight_timer',
            '.travel-progress',
            '.travelTimeLeft'
        ];

        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const text = el.innerText || el.textContent;
            const parsed = parseTimeText(text);
            if (parsed && parsed.totalSeconds > 0) {
                return { timeLeft: parsed.totalSeconds, total: parsed.totalSeconds * 2 };
            }
        }
        return null;
    }

    // Parse time strings
    function parseTimeText(text) {
        if (!text) return null;
        const colonMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (colonMatch) {
            const parts = colonMatch.slice(1).filter(Boolean).map(Number);
            let secs = 0;
            if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
            return { totalSeconds: secs, raw: text };
        }
        const h = (text.match(/(\d+)\s*h/i) || [0, 0])[1] || 0;
        const m = (text.match(/(\d+)\s*m/i) || [0, 0])[1] || 0;
        const s = (text.match(/(\d+)\s*s/i) || [0, 0])[1] || 0;
        const total = Number(h) * 3600 + Number(m) * 60 + Number(s);
        if (total > 0) return { totalSeconds: total, raw: text };
        return null;
    }

    // Sidekick API integration for travel data
    async function tryReadTravelFromAPIHook() {
        try {
            if (window.SidekickModules?.Core?.ChromeStorage) {
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (!apiKey) return null;

                const response = await fetch(`https://api.torn.com/user/?selections=travel&key=${apiKey}`);
                const data = await response.json();

                if (data.error || !data.travel) return null;

                const travel = data.travel;
                if (travel.time_left && travel.timestamp && travel.departed) {
                    return {
                        timeLeft: travel.time_left,
                        total: travel.timestamp - travel.departed,
                        destination: travel.destination
                    };
                }
            }
        } catch (e) {
            console.debug('✈️ TravelArc: API fetch failed', e);
        }
        return null;
    }

    // Position plane along path
    function planeMoveToSVG(pathEl, planeG, t) {
        try {
            const len = pathEl.getTotalLength();
            const pt = pathEl.getPointAtLength(Math.max(0, Math.min(len, t * len)));
            const fo = planeG.querySelector('foreignObject');
            if (fo) {
                const w = 48, h = 48;
                fo.setAttribute('x', pt.x - w / 2);
                fo.setAttribute('y', pt.y - h / 2);
            }
            const angle = getTangentAngle(pathEl, t);
            const innerDiv = planeG.querySelector('foreignObject > div');
            if (innerDiv) {
                innerDiv.style.transform = `rotate(${angle}deg)`;
            }
        } catch (e) { }
    }

    // Animation loop for flying page
    function startFlyingAnimation(mapImgEl, originPct, destPct, travelData) {
        const overlayObj = buildOverlay(mapImgEl);
        const { wrapper, path: pathEl, glow: glowEl, planeG, dot: dotEl, pulse: pulseEl, svg: svgEl } = overlayObj;

        const mapParent = mapImgEl.parentElement || document.body;
        mapParent.style.position = mapParent.style.position || 'relative';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        mapParent.appendChild(wrapper);

        function pctToPoint(pct) {
            const rect = mapImgEl.getBoundingClientRect();
            const x = (pct.x / 100) * rect.width;
            const y = (pct.y / 100) * rect.height;
            return { x, y };
        }

        function updatePath() {
            const a = pctToPoint(originPct);
            const b = pctToPoint(destPct);
            const rect = mapImgEl.getBoundingClientRect();
            const d = buildArcPath(a.x, a.y, b.x, b.y, 0.35, rect.width, rect.height);
            pathEl.setAttribute('d', d);
            glowEl.setAttribute('d', d);
        }

        updatePath();

        let animFrame = null;

        async function tick() {
            try {
                const dom = tryReadTravelFromDOM();
                const api = await tryReadTravelFromAPIHook();
                const tData = api || dom || travelData;

                let fraction = 0;
                if (tData && tData.total > 0) {
                    fraction = 1 - Math.max(0, tData.timeLeft) / tData.total;
                }

                const len = pathEl.getTotalLength();
                const pos = pathEl.getPointAtLength(len * fraction);
                dotEl.setAttribute('cx', pos.x);
                dotEl.setAttribute('cy', pos.y);
                pulseEl.setAttribute('cx', pos.x);
                pulseEl.setAttribute('cy', pos.y);

                planeMoveToSVG(pathEl, planeG, fraction);
            } catch (err) {
            } finally {
                animFrame = window.requestAnimationFrame(tick);
            }
        }

        animFrame = window.requestAnimationFrame(tick);

        window.addEventListener('resize', () => {
            wrapper.style.width = `${mapImgEl.offsetWidth}px`;
            wrapper.style.height = `${mapImgEl.offsetHeight}px`;
            svgEl.setAttribute('viewBox', `0 0 ${mapImgEl.offsetWidth} ${mapImgEl.offsetHeight}`);
            updatePath();
        });

        return () => {
            if (animFrame) window.cancelAnimationFrame(animFrame);
            try { wrapper.remove(); } catch (e) { }
        };
    }

    // Attempt to mount on flying page
    async function mountOnFlyingPage() {
        const flyingSelectors = [
            '.flyingWrap___',
            '.flyingWrap',
            '.travelingPage',
            '.flight-wrapper',
            '#flyingPage'
        ];

        let flyingEl = null;
        for (const s of flyingSelectors) {
            flyingEl = document.querySelector(s);
            if (flyingEl) break;
        }

        if (!flyingEl) {
            const canv = document.querySelector('canvas');
            if (canv && canv.parentElement) {
                flyingEl = canv.parentElement;
            }
        }

        if (!flyingEl) return false;

        const canvas = flyingEl.querySelector('canvas');
        if (canvas) canvas.style.display = 'none';

        let mapImg = flyingEl.querySelector('.travelarc-mapimg');
        if (!mapImg) {
            mapImg = document.createElement('img');
            mapImg.className = 'travelarc-mapimg';
            mapImg.src = MAP_SRC;
            mapImg.alt = 'Torn map';
            Object.assign(mapImg.style, {
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: '420px',
                objectFit: 'contain'
            });
            flyingEl.insertBefore(mapImg, flyingEl.firstChild);
        }

        let destName = null;
        try {
            const destEl = document.querySelector('.destinationName') ||
                document.querySelector('.flight-destination') ||
                flyingEl.querySelector('h2');
            if (destEl) destName = (destEl.innerText || destEl.textContent || '').toLowerCase().trim();
        } catch (e) { }

        let isReturning = false;
        try {
            const statusEl = document.querySelector('.flight-status') || flyingEl.querySelector('.status');
            if (statusEl) {
                const s = statusEl.innerText || statusEl.textContent || '';
                if (/returning|return/i.test(s)) isReturning = true;
            }
        } catch (e) { }

        function findCoordKeyByName(name) {
            if (!name) return 'torncity';
            const n = name.replace(/[^\w\s]/gi, '').toLowerCase();
            for (const k of Object.keys(COORDS)) {
                if (k.replace(/_/g, ' ').toLowerCase().includes(n) || n.includes(k.replace(/_/g, ' '))) return k;
            }
            if (n.includes('mexico')) return 'mexico';
            if (n.includes('canada')) return 'canada';
            if (n.includes('argentina')) return 'argentina';
            if (n.includes('uk') || n.includes('london')) return 'uk';
            if (n.includes('japan') || n.includes('tokyo')) return 'japan';
            if (n.includes('china')) return 'china';
            if (n.includes('hawaii')) return 'hawaii';
            if (n.includes('uae') || n.includes('dubai')) return 'uae';
            if (n.includes('south africa')) return 'south_africa';
            return 'torncity';
        }

        const destKey = findCoordKeyByName(destName);
        const originKey = isReturning ? destKey : 'torncity';
        const originPct = COORDS[originKey] || COORDS.torncity;
        const destPct = COORDS[destKey] || COORDS.torncity;

        let travelData = tryReadTravelFromDOM();
        if (!travelData) travelData = await tryReadTravelFromAPIHook();

        const stopper = startFlyingAnimation(mapImg, originPct, destPct, travelData);

        window.addEventListener('hashchange', () => {
            try { stopper(); } catch (e) { }
        });

        return true;
    }

    // Run on selection page
    function runOnSelectionPage() {
        const fld = document.querySelector('fieldset.worldMap___SvXMZ, fieldset[class*="worldMap"]');
        if (!fld) return false;
        const mapImg = fld.querySelector('img[src*="/travel_agency/map"]') || fld.querySelector('img');
        if (!mapImg) return false;
        if (fld.querySelector('.travelarc-overlay')) return true;

        console.log('✈️ TravelArc: Enhancing selection page map');
        return true;
    }

    // Initialization
    function init() {
        try {
            console.log('✈️ TravelArc Module: Initializing...');

            const onSelection = /page\.php\?sid=travel/.test(window.location.href) ||
                document.querySelector('fieldset.worldMap___SvXMZ, fieldset[class*="worldMap"]');
            const onFlying = /page\.php.*travel|flyingWrap/.test(window.location.href) ||
                document.querySelector('.flyingWrap___, .flight-wrapper, canvas');

            if (onSelection) {
                setTimeout(runOnSelectionPage, 600);
            }

            if (onFlying) {
                console.log('✈️ TravelArc: Detected flying page, mounting arc...');
                setTimeout(() => {
                    mountOnFlyingPage().catch((e) => { console.warn('[TravelArc] mount failed', e); });
                }, 800);
            }

            const bodyObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.type === 'childList' && m.addedNodes.length) {
                        const sel = document.querySelector('fieldset.worldMap___SvXMZ, fieldset[class*="worldMap"]');
                        if (sel) runOnSelectionPage();
                        const fly = document.querySelector('.flyingWrap___, .flight-wrapper, canvas');
                        if (fly) mountOnFlyingPage();
                    }
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });

        } catch (err) {
            console.error('[TravelArc] init error', err);
        }
    }

    // Sidekick module wrapper
    const TravelArcModule = {
        isInitialized: false,

        async init() {
            if (this.isInitialized) {
                console.log('⚠️ TravelArc module already initialized');
                return;
            }

            console.log('✈️ Initializing TravelArc Module...');

            // Wait for DOM ready
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(init, 200);
            } else {
                window.addEventListener('DOMContentLoaded', init);
            }

            this.isInitialized = true;
            console.log('✅ TravelArc Module initialized successfully');
        }
    };

    // Export
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.TravelArc = TravelArcModule;
    console.log('✅ TravelArc Module loaded and ready');

})();
