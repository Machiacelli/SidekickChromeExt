// travelarc.module.js
// Travel Arc module - shows animated flight path while flying
// Auto-detects destination and animates plane based on flight progress

(function () {
    'use strict';

    console.log('✈️ Loading TravelArc Module...');

    // Map coordinates as percentages (x%, y%) on the map image
    // All coordinates obtained by user clicking on map locations + fine-tuned
    const COORDS = {
        torn: { x: 50.4, y: 45.6 },            // ✅ User clicked
        mexico: { x: 46.0, y: 47.6 },          // ✅ User clicked
        cayman: { x: 53.1, y: 51.9 },          // ✅ Fine-tuned (up)
        canada: { x: 53.4, y: 38.0 },          // ✅ User clicked
        hawaii: { x: 32.8, y: 52.2 },          // ✅ Fine-tuned (up)
        uk: { x: 74.4, y: 35.0 },              // ✅ Fine-tuned (down)
        argentina: { x: 58.2, y: 73.5 },       // ✅ Fine-tuned (up 5cm total)
        switzerland: { x: 77.3, y: 37.0 },     // ✅ Fine-tuned (adjusted up)
        japan: { x: 15.1, y: 44.3 },           // ✅ User clicked
        china: { x: 8.4, y: 42.8 },            // ✅ Fine-tuned (down)
        uae: { x: 90.1, y: 50.9 },             // ✅ User clicked
        south_africa: { x: 82.4, y: 70.9 }     // ✅ Fine-tuned (up 3cm total)
    };

    // Map destination names to coordinate keys
    const DEST_MAP = {
        'torn': 'torn',
        'mexico': 'mexico',
        'cayman': 'cayman',
        'cayman islands': 'cayman',
        'canada': 'canada',
        'hawaii': 'hawaii',
        'uk': 'uk',
        'united kingdom': 'uk',
        'london': 'uk',
        'argentina': 'argentina',
        'switzerland': 'switzerland',
        'zurich': 'switzerland',
        'japan': 'japan',
        'tokyo': 'japan',
        'china': 'china',
        'uae': 'uae',
        'dubai': 'uae',
        'south africa': 'south_africa',
        'south_africa': 'south_africa',
        'cape town': 'south_africa'
    };

    let animationFrame = null;

    function detectDestination() {
        // Try to find "Torn to Zurich" text
        const progressText = document.querySelector('.progressText___qJFfY, [class*="progressText"]');
        if (progressText) {
            const text = progressText.textContent || '';
            console.log('✈️ TravelArc: Progress text found:', text);

            // Parse "Torn to Zurich" or "Zurich to Torn"
            const match = text.match(/(Torn|torn)\s+to\s+([A-Za-z\s]+)/i) ||
                text.match(/([A-Za-z\s]+)\s+to\s+(Torn|torn)/i);

            if (match) {
                let dest = match[2].toLowerCase().trim();
                // Remove trailing punctuation
                dest = dest.replace(/[.,;:]$/, '');
                console.log('✈️ TravelArc: Detected destination:', dest);
                return { origin: 'torn', destination: dest, returning: match[1].toLowerCase() !== 'torn' };
            }
        }

        // Fallback: look for flag images
        const flags = document.querySelectorAll('img[src*="/flags/fl_"]');
        if (flags.length >= 2) {
            const destFlag = flags[1].src;
            const match = destFlag.match(/fl_([a-z_]+)\.svg/);
            if (match) {
                const dest = match[1].replace(/_/g, ' ');
                console.log('✈️ TravelArc: Detected from flag:', dest);
                return { origin: 'torn', destination: dest, returning: false };
            }
        }

        console.warn('⚠️ TravelArc: Could not detect destination');
        return { origin: 'torn', destination: 'china', returning: false }; // fallback
    }

    function detectProgress() {
        // Try to find progress percentage from aria-valuenow
        const progressBar = document.querySelector('[role="progressbar"][aria-valuenow]');
        if (progressBar) {
            const progress = parseFloat(progressBar.getAttribute('aria-valuenow'));
            console.log('✈️ TravelArc: Progress:', progress + '%');
            return progress / 100; // 0.0 to 1.0
        }

        // Fallback: parse from style
        const fill = document.querySelector('.fill___Tn02w, [class*="fill"]');
        if (fill) {
            const style = fill.getAttribute('style') || '';
            const match = style.match(/width:\s*([\d.]+)%/);
            if (match) {
                const progress = parseFloat(match[1]);
                console.log('✈️ TravelArc: Progress from style:', progress + '%');
                return progress / 100;
            }
        }

        return 0.5; // default to 50%
    }

    function getCoordKey(destName) {
        const normalized = destName.toLowerCase().trim();
        return DEST_MAP[normalized] || 'china'; // fallback to china
    }

    function mountTravelArc() {
        console.log('✈️ TravelArc: Attempting to mount...');

        const figure = document.querySelector('figure[class*="airspaceScene"]');
        if (!figure) {
            console.log('✈️ TravelArc: No flying container found');
            return false;
        }

        console.log('✅ TravelArc: Found flying container');

        // Hide Torn's plane
        const planeImg = figure.querySelector('img[class*="planeImage"]');
        if (planeImg) {
            planeImg.style.display = 'none';
            console.log('✅ TravelArc: Hid original plane');
        }

        // Check if map already exists
        let mapImg = figure.querySelector('img[src*="map.png"]');
        if (mapImg) {
            console.log('✅ TravelArc: Map already exists, adding arc...');
            addArcToMap(mapImg, figure);
            return true;
        }

        // Create map
        mapImg = document.createElement('img');
        mapImg.src = '/images/v2/travel_agency/map.png';
        mapImg.style.cssText = 'width:100%;height:auto;max-height:420px;object-fit:contain';
        figure.insertBefore(mapImg, figure.firstChild);
        console.log('✅ TravelArc: Map inserted');

        mapImg.onload = function () {
            console.log('✅ TravelArc: Map loaded, adding arc...');
            addArcToMap(mapImg, figure);
        };

        if (mapImg.complete) {
            mapImg.onload();
        }

        return true;
    }

    function addArcToMap(mapImg, figure) {
        // Detect destination and progress
        const flightInfo = detectDestination();
        const originKey = flightInfo.returning ? getCoordKey(flightInfo.destination) : 'torn';
        const destKey = flightInfo.returning ? 'torn' : getCoordKey(flightInfo.destination);

        const originPct = COORDS[originKey] || COORDS.torn;
        const destPct = COORDS[destKey] || COORDS.china;

        console.log(`✈️ TravelArc: Creating arc from ${originKey} to ${destKey}`);

        figure.style.position = 'relative';

        // Remove old arc if exists
        const oldArc = figure.querySelector('.travelarc-overlay');
        if (oldArc) oldArc.remove();

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'travelarc-overlay';
        wrapper.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999';

        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${mapImg.offsetWidth} ${mapImg.offsetHeight}`);

        // Calculate arc path
        const originX = (originPct.x / 100) * mapImg.offsetWidth;
        const originY = (originPct.y / 100) * mapImg.offsetHeight;
        const destX = (destPct.x / 100) * mapImg.offsetWidth;
        const destY = (destPct.y / 100) * mapImg.offsetHeight;

        const midX = (originX + destX) / 2;
        const midY = Math.min(originY, destY) - 60;

        // Create arc path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${originX} ${originY} Q ${midX} ${midY} ${destX} ${destY}`);
        path.setAttribute('stroke', '#69c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '6 6');
        path.setAttribute('id', 'flight-path');

        // Create plane marker (circle with glow)
        const plane = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        plane.setAttribute('r', '6');
        plane.setAttribute('fill', '#fff');
        plane.setAttribute('stroke', '#0af');
        plane.setAttribute('stroke-width', '2');
        plane.setAttribute('id', 'flight-plane');
        plane.style.filter = 'drop-shadow(0 0 4px rgba(0, 175, 255, 0.8))';

        svg.appendChild(path);
        svg.appendChild(plane);
        wrapper.appendChild(svg);
        figure.appendChild(wrapper);

        console.log('✅ TravelArc: Arc added successfully!');

        // Start animation loop
        startAnimation(path, plane);
    }

    function startAnimation(pathEl, planeEl) {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        function animate() {
            const progress = detectProgress();
            const pathLength = pathEl.getTotalLength();
            const point = pathEl.getPointAtLength(pathLength * progress);

            planeEl.setAttribute('cx', point.x);
            planeEl.setAttribute('cy', point.y);

            animationFrame = requestAnimationFrame(animate);
        }

        animate();
        console.log('✅ TravelArc: Animation started');
    }

    function init() {
        console.log('✈️ TravelArc: Initializing...');

        // Try to mount immediately
        setTimeout(() => {
            if (mountTravelArc()) {
                console.log('✅ TravelArc: Mounted on page load');
            }
        }, 1000);

        // Watch for flying page appearing
        const observer = new MutationObserver(() => {
            const figure = document.querySelector('figure[class*="airspaceScene"]');
            if (figure && !figure.querySelector('.travelarc-overlay')) {
                console.log('✈️ TravelArc: Flying page detected via observer');
                mountTravelArc();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ TravelArc: Observer started');
    }

    // Sidekick module wrapper
    const TravelArcModule = {
        isInitialized: false,

        async init() {
            if (this.isInitialized) {
                console.log('⚠️ TravelArc already initialized');
                return;
            }

            console.log('✈️ Initializing TravelArc Module...');

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
