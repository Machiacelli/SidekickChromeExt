// travelarc.module.js
// Simplified Travel Arc module - shows animated flight path while flying
// Based on working console test - simplified to just what works

(function () {
    'use strict';

    console.log('✈️ Loading TravelArc Module...');

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

    function mountTravelArc() {
        console.log('✈️ TravelArc: Attempting to mount...');

        // Find the flying container
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

        // Wait for map to load, then add arc
        mapImg.onload = function () {
            console.log('✅ TravelArc: Map loaded, adding arc...');
            addArcToMap(mapImg, figure);
        };

        // If already loaded, trigger immediately
        if (mapImg.complete) {
            mapImg.onload();
        }

        return true;
    }

    function addArcToMap(mapImg, figure) {
        // Detect destination (hardcoded to China for now - you can enhance this later)
        const originPct = COORDS.torncity;
        const destPct = COORDS.china;

        console.log('✈️ TravelArc: Creating arc overlay...');

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

        svg.appendChild(path);
        wrapper.appendChild(svg);
        figure.appendChild(wrapper);

        console.log('✅ TravelArc: Arc added successfully!');
    }

    function init() {
        console.log('✈️ TravelArc: Initializing...');

        // Try to mount immediately
        setTimeout(() => {
            if (mountTravelArc()) {
                console.log('✅ TravelArc: Mounted on page load');
            }
        }, 1000);

        // Watch for flying page appearing (React SPA navigation)
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
