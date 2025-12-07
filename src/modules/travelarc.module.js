/**
 * Sidekick Chrome Extension - Travel Arc Module
 * Displays animated flight path on Torn travel page
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("✈️ Loading Sidekick TravelArc Module...");

    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    const TravelArcModule = {
        isInitialized: false,
        isOnTravelPage: false,
        svgOverlay: null,
        pathElement: null,
        planeElement: null,
        updateInterval: null,
        apiKey: null,
        travelData: null,
        mapContainer: null,
        resizeObserver: null,

        // Travel time fallback table (in seconds) - used only if API doesn't provide duration
        // Note: API automatically accounts for ticket type (Standard/Airstrip/WLT/Business)
        travelTimes: {
            "Mexico": 18 * 60,
            "Cayman Islands": 25 * 60,
            "Canada": 29 * 60,
            "Hawaii": 94 * 60,
            "United Kingdom": 111 * 60,
            "Argentina": 117 * 60,
            "Switzerland": 123 * 60,
            "China": 169 * 60,
            "Japan": 158 * 60,
            "UAE": 190 * 60,
            "South Africa": 208 * 60
        },

        // Configuration
        config: {
            planeSize: 12,
            arcStrokeWidth: 4,
            updateFrequency: 1500 // ms
        },

        async init() {
            if (this.isInitialized) {
                console.log('⚠️ TravelArc module already initialized');
                return;
            }

            console.log('✈️ Initializing TravelArc Module...');

            // Check for Core module
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.error('❌ Core module not available for TravelArc');
                return;
            }

            // Check if on travel page
            this.isOnTravelPage = this.checkIfTravelPage();
            if (!this.isOnTravelPage) {
                console.log('ℹ️ Not on travel page, TravelArc standing by');
                this.isInitialized = true;
                return;
            }

            await this.loadSettings();
            await this.setupTravelArc();

            this.isInitialized = true;
            console.log('✅ TravelArc Module initialized successfully');
        },

        checkIfTravelPage() {
            // Check if current page is the travel page
            const url = window.location.href;
            return url.includes('page.php?sid=travel') || url.includes('page.php') && url.includes('sid=travel');
        },

        async loadSettings() {
            try {
                this.apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key') || null;
                console.log('🔑 API Key loaded:', this.apiKey ? 'SET' : 'NOT SET');
            } catch (error) {
                console.error('❌ Failed to load TravelArc settings:', error);
            }
        },

        async setupTravelArc() {
            console.log('🗺️ Setting up travel arc visualization...');

            // Wait for map to be ready
            await this.waitForMapContainer();

            if (!this.mapContainer) {
                console.debug('⚠️ Travel map container not found'); // Debug instead of warn
                return;
            }

            // Create SVG overlay
            this.createSVGOverlay();

            // Setup resize observer
            this.setupResizeObserver();

            // Start update loop
            this.startUpdateLoop();

            console.log('✅ Travel arc visualization active');
        },

        async waitForMapContainer(maxAttempts = 20) {
            for (let i = 0; i < maxAttempts; i++) {
                // Try to find map container with various selectors
                this.mapContainer = document.querySelector('fieldset[class^="worldMap"]') ||
                    document.querySelector('fieldset[legend="Destinations"]') ||
                    document.querySelector('.travel-map');

                if (this.mapContainer) {
                    console.log('✅ Map container found');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }
            console.debug('⚠️ Map container not found after waiting'); // Debug instead of warn
        },

        createSVGOverlay() {
            // Remove existing overlay if present
            const existing = document.getElementById('sidekick-travel-svg-overlay');
            if (existing) {
                existing.remove();
            }

            // Create SVG element
            this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svgOverlay.setAttribute('id', 'sidekick-travel-svg-overlay');
            this.svgOverlay.setAttribute('width', '100%');
            this.svgOverlay.setAttribute('height', '100%');
            this.svgOverlay.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                pointer-events: none;
                z-index: 9999;
            `;

            // Create Sidekick gradient definition
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            gradient.setAttribute('id', 'sidekick-arc-gradient');
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
            this.svgOverlay.appendChild(defs);

            // Ensure map container is positioned for absolute children
            const mapStyle = getComputedStyle(this.mapContainer);
            if (mapStyle.position === 'static') {
                this.mapContainer.style.position = 'relative';
            }

            this.mapContainer.appendChild(this.svgOverlay);
            console.log('✅ SVG overlay created with Sidekick gradient');
        },

        setupResizeObserver() {
            // Recreate arc on resize
            this.resizeObserver = new ResizeObserver(() => {
                console.log('📐 Map resized, updating arc...');
                this.updateArcVisualization();
            });
            this.resizeObserver.observe(this.mapContainer);
        },

        async startUpdateLoop() {
            // Initial update
            await this.updateArcVisualization();

            // Periodic updates
            this.updateInterval = setInterval(async () => {
                await this.updateArcVisualization();
            }, this.config.updateFrequency);
        },

        async updateArcVisualization() {
            // Fetch current travel status from API
            const travelInfo = await this.fetchTravelInfo();

            if (!travelInfo || !travelInfo.destination) {
                // Not traveling - clear visualization
                this.clearVisualization();
                return;
            }

            // Get map pin positions
            const positions = this.getMapPositions();
            if (!positions.origin || !positions.destination) {
                console.warn('⚠️ Could not determine pin positions');
                return;
            }

            // Calculate progress
            const progress = this.calculateProgress(travelInfo);

            // Draw or update arc
            this.drawArc(positions.origin, positions.destination);

            // Animate plane along arc
            this.animatePlane(progress);
        },

        async fetchTravelInfo() {
            if (!this.apiKey) {
                return null;
            }

            try {
                const url = `https://api.torn.com/user/?selections=travel&key=${encodeURIComponent(this.apiKey)}`;
                const response = await fetch(url);

                if (!response.ok) {
                    return null;
                }

                const data = await response.json();

                if (data.error) {
                    console.warn('⚠️ API Error:', data.error.error);
                    return null;
                }

                return data.travel || null;
            } catch (error) {
                console.error('❌ Failed to fetch travel info:', error);
                return null;
            }
        },

        getMapPositions() {
            const result = { origin: null, destination: null };

            // Find currentlyHere pin
            const currentPin = this.mapContainer.querySelector('.currentlyHere___jQuBd') ||
                this.mapContainer.querySelector('.currentlyHere') ||
                this.mapContainer.querySelector('[class*="currentlyHere"]');

            if (currentPin) {
                result.origin = this.getPinCenter(currentPin);
            }

            // Find destination pins
            const destinationLabels = Array.from(this.mapContainer.querySelectorAll('label'))
                .filter(l => l.querySelector('input.destinationRadio___KMeJf') ||
                    l.querySelector('input[name="destination"]') ||
                    l.querySelector('input[class*="destinationRadio"]'));

            // Find checked/selected destination
            const activeInput = this.mapContainer.querySelector('input[name="destination"]:checked') ||
                this.mapContainer.querySelector('input[name="destination"][checked]');

            if (activeInput) {
                const label = activeInput.closest('label');
                const pin = label.querySelector('.pin___FilUD') ||
                    label.querySelector('.pin') ||
                    label.querySelector('[class*="pin"]');

                if (pin) {
                    result.destination = this.getPinCenter(pin);
                }
            }

            return result;
        },

        getPinCenter(element) {
            const style = element.getAttribute('style') || '';
            const leftMatch = style.match(/left:\s*([0-9.+-]+)px/);
            const topMatch = style.match(/top:\s*([0-9.+-]+)px/);

            const left = leftMatch ? parseFloat(leftMatch[1]) : element.offsetLeft;
            const top = topMatch ? parseFloat(topMatch[1]) : element.offsetTop;

            return {
                x: left + (element.offsetWidth / 2 || 0),
                y: top + (element.offsetHeight / 2 || 0)
            };
        },

        calculateProgress(travelInfo) {
            // Best method: use timestamp and departed
            if (travelInfo.timestamp && travelInfo.departed) {
                const totalDuration = travelInfo.timestamp - travelInfo.departed;
                const timeLeft = Number(travelInfo.time_left || 0);
                return 1 - (timeLeft / totalDuration);
            }

            // Fallback: use stored total or lookup table
            const timeLeft = Number(travelInfo.time_left || 0);
            const destName = travelInfo.destination || '';
            const totalDuration = this.travelTimes[destName] || timeLeft * 2; // rough estimate

            return totalDuration > 0 ? 1 - (timeLeft / totalDuration) : 0;
        },

        drawArc(start, end) {
            // Clear existing path and plane
            if (this.pathElement) {
                this.pathElement.remove();
                this.pathElement = null;
            }
            if (this.planeElement) {
                this.planeElement.remove();
                this.planeElement = null;
            }

            // Create quadratic Bézier arc
            const midX = (start.x + end.x) / 2;
            const curveRise = Math.max(60, Math.abs(end.x - start.x) * 0.25);
            const midY = Math.min(start.y, end.y) - curveRise;

            const pathData = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

            // Create path element with Sidekick gradient
            this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.pathElement.setAttribute('id', 'sidekick-flight-path');
            this.pathElement.setAttribute('d', pathData);
            this.pathElement.setAttribute('stroke', 'url(#sidekick-arc-gradient)');
            this.pathElement.setAttribute('stroke-width', this.config.arcStrokeWidth);
            this.pathElement.setAttribute('fill', 'none');
            this.pathElement.setAttribute('stroke-linecap', 'round');
            this.pathElement.setAttribute('stroke-linejoin', 'round');

            this.svgOverlay.appendChild(this.pathElement);

            // Create plane marker with gradient glow
            this.planeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            this.planeElement.setAttribute('id', 'sidekick-flight-plane');
            this.planeElement.setAttribute('r', this.config.planeSize / 2);
            this.planeElement.setAttribute('fill', '#fff');
            this.planeElement.setAttribute('stroke', '#66BB6A');
            this.planeElement.setAttribute('stroke-width', '2');
            this.planeElement.style.filter = 'drop-shadow(0 0 4px rgba(102, 187, 106, 0.8))';

            this.svgOverlay.appendChild(this.planeElement);
        },

        animatePlane(progress) {
            if (!this.pathElement || !this.planeElement) {
                return;
            }

            const clampedProgress = Math.max(0, Math.min(1, progress));
            const length = this.pathElement.getTotalLength();
            const point = this.pathElement.getPointAtLength(length * clampedProgress);

            this.planeElement.setAttribute('cx', point.x);
            this.planeElement.setAttribute('cy', point.y);
        },

        clearVisualization() {
            if (this.pathElement) {
                this.pathElement.remove();
                this.pathElement = null;
            }
            if (this.planeElement) {
                this.planeElement.remove();
                this.planeElement = null;
            }
        },

        destroy() {
            console.log('🧹 Destroying TravelArc module...');

            // Clear interval
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            // Disconnect resize observer
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            // Remove SVG overlay
            if (this.svgOverlay) {
                this.svgOverlay.remove();
                this.svgOverlay = null;
            }

            // Clear visualization
            this.clearVisualization();

            // Reset state
            this.isInitialized = false;
            this.mapContainer = null;

            console.log('✅ TravelArc module destroyed');
        }
    };

    // Export to global scope
    window.SidekickModules.TravelArc = TravelArcModule;
    console.log('✅ TravelArc Module loaded and ready');

})();
