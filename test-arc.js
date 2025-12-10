// Quick test console patch - run this while flying to test arc animation
// This bypasses the module and directly tests if the arc drawing works

const figure = document.querySelector('figure[class*="airspaceScene"]');
const mapImg = figure.querySelector('img[src*="map.png"]');

if (!mapImg) {
    console.error('Map not found!');
} else {
    console.log('Map found, creating arc overlay...');

    // Create SVG overlay
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${mapImg.offsetWidth} ${mapImg.offsetHeight}`);

    // Create arc path (China coords: from {38,17} to {6.1, 14.2})
    const originX = (38 / 100) * mapImg.offsetWidth;
    const originY = (17 / 100) * mapImg.offsetHeight;
    const destX = (6.1 / 100) * mapImg.offsetWidth;
    const destY = (14.2 / 100) * mapImg.offsetHeight;

    const midX = (originX + destX) / 2;
    const midY = Math.min(originY, destY) - 60;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${originX} ${originY} Q ${midX} ${midY} ${destX} ${destY}`);
    path.setAttribute('stroke', '#69c');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-dasharray', '6 6');

    svg.appendChild(path);
    wrapper.appendChild(svg);

    // Position wrapper relative to figure
    figure.style.position = 'relative';
    figure.appendChild(wrapper);

    console.log('Arc created! Check if you see a blue dashed line from Torn City to China');
}
