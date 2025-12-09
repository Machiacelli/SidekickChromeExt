/**
 * Calendar Scraper Content Script
 * Runs only on calendar.php to extract event dates
 * Bypasses Cloudflare by running in browser context
 */

(function () {
    'use strict';

    // Only run on calendar page
    if (!window.location.pathname.includes('calendar.php')) {
        return;
    }

    console.log('📅 Calendar Scraper: Running on calendar.php');

    // Wait for page to fully load
    function scrapeCalendarEvents() {
        try {
            const events = {};
            const currentYear = new Date().getFullYear();

            // Look for event containers
            // Torn uses various selectors - we'll try multiple approaches
            const eventSelectors = [
                '.calendarEvents .event',
                '.calendar-wrap .event-item',
                '[class*="event"]',
                '.calendar-event',
                'div[class*="calendar"] div[class*="event"]'
            ];

            let eventElements = [];
            for (const selector of eventSelectors) {
                eventElements = document.querySelectorAll(selector);
                if (eventElements.length > 0) {
                    console.log(`📅 Found ${eventElements.length} events using selector: ${selector}`);
                    break;
                }
            }

            if (eventElements.length === 0) {
                console.warn('⚠️ No event elements found with standard selectors, trying full scan...');
                // Fallback: scan all divs for event-like patterns
                const allDivs = document.querySelectorAll('div');
                eventElements = Array.from(allDivs).filter(div => {
                    const text = div.textContent || '';
                    // Look for divs containing month names and numbers
                    return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i.test(text);
                });
                console.log(`📅 Fallback scan found ${eventElements.length} potential events`);
            }

            eventElements.forEach(eventEl => {
                try {
                    // Get event name
                    const nameEl = eventEl.querySelector('[class*="name"], h3, h4, strong, b') || eventEl;
                    const eventName = nameEl.textContent.trim();

                    if (!eventName) return;

                    // Get date text (could be in same or different element)
                    const dateText = eventEl.textContent;

                    // Parse date patterns: "Dec 19 - Jan 2", "Dec 15-31", "December 19-31"
                    const dateMatch = dateText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s*[-–]\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(\d{1,2}))?/i);

                    if (!dateMatch) return;

                    const [, startMonth, startDay, endMonth, endDay] = dateMatch;

                    // Month name to number mapping
                    const monthMap = {
                        'jan': 1, 'january': 1,
                        'feb': 2, 'february': 2,
                        'mar': 3, 'march': 3,
                        'apr': 4, 'april': 4,
                        'may': 5,
                        'jun': 6, 'june': 6,
                        'jul': 7, 'july': 7,
                        'aug': 8, 'august': 8,
                        'sep': 9, 'sept': 9, 'september': 9,
                        'oct': 10, 'october': 10,
                        'nov': 11, 'november': 11,
                        'dec': 12, 'december': 12
                    };

                    const startMonthNum = monthMap[startMonth.toLowerCase()];
                    const endMonthNum = endMonth ? monthMap[endMonth.toLowerCase()] : startMonthNum;

                    if (!startMonthNum) return;

                    // Normalize event name for matching
                    const normalized = eventName
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s]/g, '')
                        .replace(/\s+/g, ' ');

                    events[normalized] = {
                        startMonth: startMonthNum,
                        startDay: parseInt(startDay),
                        endMonth: endMonthNum,
                        endDay: parseInt(endDay || startDay)
                    };

                    console.log(`✅ Scraped: "${eventName}" = ${startMonthNum}/${startDay} - ${endMonthNum}/${endDay || startDay}`);

                } catch (err) {
                    console.warn('⚠️ Failed to parse event:', err);
                }
            });

            if (Object.keys(events).length > 0) {
                // Send to extension storage
                chrome.storage.local.set({
                    'event_calendar_overrides': events,
                    'calendar_last_scraped_year': currentYear
                }, () => {
                    console.log(`✅ Calendar scraped successfully! Saved ${Object.keys(events).length} events`);
                    console.log('📅 Event overrides:', events);
                });
            } else {
                console.warn('⚠️ No events were scraped from calendar page');
            }

        } catch (error) {
            console.error('❌ Calendar scraping failed:', error);
        }
    }

    // Run scraper after a delay to ensure DOM is ready
    setTimeout(scrapeCalendarEvents, 1000);

})();
