// travelarc.module.js
// Travel Arc module - shows animated flight path while flying
// Auto-detects destination and animates plane based on flight progress

(function () {
    'use strict';

    console.log('✈️ Loading TravelArc Module...');

    // Map coordinates as percentages (x%, y%) on the map image
    // Atlantic-centred world map: x increases left→right (Americas left, Europe centre-right, Asia right)
    // Torn City = New York (approx)
    const COORDS = {
        torn:         { x: 24.0, y: 40.0 },   // New York / Torn City
        mexico:       { x: 19.0, y: 47.0 },   // Mexico City
        cayman:       { x: 23.0, y: 48.5 },   // Cayman Islands
        canada:       { x: 22.0, y: 32.0 },   // Canada (Toronto area)
        hawaii:       { x:  5.5, y: 45.0 },   // Hawaii (far left, mid-Pacific)
        uk:           { x: 46.5, y: 33.0 },   // United Kingdom
        argentina:    { x: 28.0, y: 68.0 },   // Buenos Aires
        switzerland:  { x: 49.5, y: 35.0 },   // Zurich / Switzerland
        japan:        { x: 82.5, y: 37.0 },   // Tokyo
        china:        { x: 76.0, y: 38.0 },   // Beijing
        uae:          { x: 60.5, y: 43.5 },   // Dubai / UAE
        south_africa: { x: 51.0, y: 66.0 },   // Cape Town / South Africa
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
        'england': 'uk',
        'argentina': 'argentina',
        'buenos aires': 'argentina',
        'switzerland': 'switzerland',
        'zurich': 'switzerland',
        'z\u00fcrich': 'switzerland',
        'japan': 'japan',
        'tokyo': 'japan',
        'china': 'china',
        'beijing': 'china',
        'uae': 'uae',
        'dubai': 'uae',
        'united arab emirates': 'uae',
        'south africa': 'south_africa',
        'south_africa': 'south_africa',
        'cape town': 'south_africa',
    };


    let animationFrame = null;

    function detectDestination() {
        // Try to find "Torn to Zurich" text
        const progressText = document.querySelector('.progressText___qJFfY, [class*="progressText"]');
        if (progressText) {
            const text = progressText.textContent || '';
            console.log('✈️ TravelArc: Progress text found:', text);

            // Parse "Torn to Zurich" (outbound) or "Zurich to Torn" (return)
            const toMatch = text.match(/Torn\s+to\s+([A-Za-z\s]+)/i);
            const fromMatch = text.match(/([A-Za-z\s]+)\s+to\s+Torn/i);

            if (toMatch) {
                // Outbound: "Torn to Zurich" — destination is the foreign city
                let dest = toMatch[1].toLowerCase().trim().replace(/[.,;:]$/, '');
                console.log('✈️ TravelArc: Outbound flight to:', dest);
                return { origin: 'torn', destination: dest, returning: false };
            } else if (fromMatch) {
                // Return: "Zurich to Torn" — origin is the foreign city, dest is Torn
                let city = fromMatch[1].toLowerCase().trim().replace(/[.,;:]$/, '');
                console.log('✈️ TravelArc: Return flight from:', city);
                return { origin: 'torn', destination: city, returning: true };
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
        return { origin: 'torn', destination: 'torn', returning: false }; // fallback - no arc rather than wrong arc
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
        return DEST_MAP[normalized] || 'torn'; // fallback to torn (no wrong arc drawn)
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

        // Calculate distance between points
        const distance = Math.sqrt(Math.pow(destX - originX, 2) + Math.pow(destY - originY, 2));

        // Create arc control point - offset by 20% of distance for nice curve
        // Calculate perpendicular offset for consistent arc direction
        const arcHeight = distance * 0.2;
        const midX = (originX + destX) / 2;
        const midY = (originY + destY) / 2;

        // Calculate perpendicular direction for arc (curves above/northward — Y is inverted on screen)
        // The perpendicular to (dx, dy) is (-dy, dx). Since Y increases downward,
        // we negate to get the "above" direction: (dy, -dx) normalized.
        const dx = destX - originX;
        const dy = destY - originY;
        const perpX = dy / distance;   // Perpendicular X component (negated to curve "above")
        const perpY = -dx / distance;  // Perpendicular Y component (negated to curve "above")

        // Apply arc offset perpendicular to travel direction
        const controlX = midX + perpX * arcHeight;
        const controlY = midY + perpY * arcHeight;

        // Create arc path using calculated control point
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${originX} ${originY} Q ${controlX} ${controlY} ${destX} ${destY}`);
        path.setAttribute('stroke', '#69c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '6 6');
        path.setAttribute('id', 'flight-path');

        // Create gradient definition for Sidekick colors
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'sidekick-gradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('style', 'stop-color:#66BB6A;stop-opacity:1');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('style', 'stop-color:#ffad5a;stop-opacity:1');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Create plane marker (arrow pointing in direction of travel)
        const plane = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        plane.setAttribute('id', 'flight-plane');

        // Arrow shape (pointing right by default)
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.setAttribute('d', 'M -10 -6 L 10 0 L -10 6 Z'); // Triangle pointing right
        arrow.setAttribute('fill', 'url(#sidekick-gradient)');
        arrow.setAttribute('stroke', '#fff');
        arrow.setAttribute('stroke-width', '1');
        arrow.style.filter = 'drop-shadow(0 0 4px rgba(102, 187, 106, 0.8))';

        plane.appendChild(arrow);

        svg.appendChild(path);
        svg.appendChild(plane);
        wrapper.appendChild(svg);
        figure.appendChild(wrapper);

        console.log('✅ TravelArc: Arc with gradient arrow added successfully!');

        // Start animation loop
        startAnimation(path, plane);
    }

    function startAnimation(pathEl, planeEl) {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        let lastPoint = null;

        function animate() {
            const progress = detectProgress();
            const pathLength = pathEl.getTotalLength();
            const point = pathEl.getPointAtLength(pathLength * progress);

            // Calculate rotation angle based on tangent to the path
            // Sample a point slightly ahead to get accurate direction
            const lookAheadDistance = 5; // pixels ahead
            const currentDistance = pathLength * progress;
            const nextDistance = Math.min(currentDistance + lookAheadDistance, pathLength);
            const nextPoint = pathEl.getPointAtLength(nextDistance);

            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            planeEl.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${angle})`);

            lastPoint = { x: point.x, y: point.y };

            animationFrame = requestAnimationFrame(animate);
        }

        animate();
        console.log('✅ TravelArc: Animation with rotating arrow started');
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
