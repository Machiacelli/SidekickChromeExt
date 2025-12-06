/**
 * Travel Times Data for Torn Countries
 * Contains travel times for all ticket types and countries
 */

const TRAVEL_TIMES = {
    'Mexico': {
        fullName: 'Ciudad Juárez',
        standard: 26 * 60,        // 26 minutes in seconds
        airstrip: 18 * 60,        // 18 minutes
        wltBenefit: 13 * 60,      // 13 minutes (WLT = Work Leadership Training)
        businessClass: 8 * 60,     // 8 minutes
        cost: 6500
    },
    'Cayman Islands': {
        fullName: 'George Town',
        standard: 35 * 60,        // 35 minutes
        airstrip: 25 * 60,        // 25 minutes
        wltBenefit: 18 * 60,      // 18 minutes
        businessClass: 11 * 60,    // 11 minutes
        cost: 10000
    },
    'Canada': {
        fullName: 'Toronto',
        standard: 41 * 60,        // 41 minutes
        airstrip: 29 * 60,        // 29 minutes
        wltBenefit: 20 * 60,      // 20 minutes
        businessClass: 12 * 60,    // 12 minutes
        cost: 9000
    },
    'Hawaii': {
        fullName: 'Honolulu',
        standard: (2 * 60 + 14) * 60,    // 2h 14min
        airstrip: (1 * 60 + 34) * 60,    // 1h 34min
        wltBenefit: (1 * 60 + 7) * 60,   // 1h 7min
        businessClass: 40 * 60,           // 40min
        cost: 11000
    },
    'United Kingdom': {
        fullName: 'London',
        standard: (2 * 60 + 39) * 60,    // 2h 39min
        airstrip: (1 * 60 + 51) * 60,    // 1h 51min
        wltBenefit: (1 * 60 + 20) * 60,  // 1h 20min
        businessClass: 48 * 60,           // 48min
        cost: 18000
    },
    'Argentina': {
        fullName: 'Buenos Aires',
        standard: (2 * 60 + 47) * 60,    // 2h 47min
        airstrip: (1 * 60 + 57) * 60,    // 1h 57min
        wltBenefit: (1 * 60 + 23) * 60,  // 1h 23min
        businessClass: 50 * 60,           // 50min
        cost: 21000
    },
    'Switzerland': {
        fullName: 'Zurich',
        standard: (2 * 60 + 55) * 60,    // 2h 55min
        airstrip: (2 * 60 + 3) * 60,     // 2h 3min
        wltBenefit: (1 * 60 + 28) * 60,  // 1h 28min
        businessClass: 53 * 60,           // 53min
        cost: 27000
    },
    'Japan': {
        fullName: 'Tokyo',
        standard: (3 * 60 + 45) * 60,    // 3h 45min
        airstrip: (2 * 60 + 38) * 60,    // 2h 38min
        wltBenefit: (1 * 60 + 53) * 60,  // 1h 53min
        businessClass: (1 * 60 + 8) * 60, // 1h 8min
        cost: 32000
    },
    'China': {
        fullName: 'Beijing',
        standard: (4 * 60 + 2) * 60,     // 4h 2min
        airstrip: (2 * 60 + 49) * 60,    // 2h 49min
        wltBenefit: (2 * 60 + 1) * 60,   // 2h 1min
        businessClass: (1 * 60 + 12) * 60, // 1h 12min
        cost: 35000
    },
    'United Arab Emirates': {
        fullName: 'Dubai',
        standard: (4 * 60 + 31) * 60,    // 4h 31min
        airstrip: (3 * 60 + 10) * 60,    // 3h 10min
        wltBenefit: (2 * 60 + 15) * 60,  // 2h 15min
        businessClass: (1 * 60 + 21) * 60, // 1h 21min
        cost: 32000
    },
    'South Africa': {
        fullName: 'Johannesburg',
        standard: (4 * 60 + 57) * 60,    // 4h 57min
        airstrip: (3 * 60 + 28) * 60,    // 3h 28min
        wltBenefit: (2 * 60 + 29) * 60,  // 2h 29min
        businessClass: (1 * 60 + 29) * 60, // 1h 29min
        cost: 40000
    }
};

/**
 * Get travel time in seconds for a specific country and ticket type
 * @param {string} country - Country name (e.g., "Mexico", "United Kingdom")
 * @param {string} ticketType - Type of ticket: 'standard', 'airstrip', 'wltBenefit', 'businessClass'
 * @returns {number|null} Travel time in seconds, or null if not found
 */
function getTravelTime(country, ticketType = 'standard') {
    // Normalize country name
    const normalizedCountry = normalizeCountryName(country);

    if (!TRAVEL_TIMES[normalizedCountry]) {
        console.warn(`Unknown country: ${country}`);
        return null;
    }

    const validTypes = ['standard', 'airstrip', 'wltBenefit', 'businessClass'];
    if (!validTypes.includes(ticketType)) {
        console.warn(`Invalid ticket type: ${ticketType}`);
        return TRAVEL_TIMES[normalizedCountry].standard;
    }

    return TRAVEL_TIMES[normalizedCountry][ticketType];
}

/**
 * Normalize country name from various formats
 * @param {string} country - Country name from status text
 * @returns {string} Normalized country name
 */
function normalizeCountryName(country) {
    // Remove city names and extra text
    const countryMap = {
        'mexico': 'Mexico',
        'ciudad juárez': 'Mexico',
        'cayman islands': 'Cayman Islands',
        'george town': 'Cayman Islands',
        'canada': 'Canada',
        'toronto': 'Canada',
        'hawaii': 'Hawaii',
        'honolulu': 'Hawaii',
        'united kingdom': 'United Kingdom',
        'uk': 'United Kingdom',
        'london': 'United Kingdom',
        'argentina': 'Argentina',
        'buenos aires': 'Argentina',
        'switzerland': 'Switzerland',
        'zurich': 'Switzerland',
        'japan': 'Japan',
        'tokyo': 'Japan',
        'china': 'China',
        'beijing': 'China',
        'united arab emirates': 'United Arab Emirates',
        'uae': 'United Arab Emirates',
        'dubai': 'United Arab Emirates',
        'south africa': 'South Africa',
        'johannesburg': 'South Africa'
    };

    const normalized = country.toLowerCase().trim();
    return countryMap[normalized] || country;
}

/**
 * Format time in seconds to human-readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "2h 39m", "45m", "30s")
 */
function formatTravelTime(seconds) {
    if (seconds <= 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else if (minutes > 0) {
        return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Get all countries list
 * @returns {Array} Array of country names
 */
function getAllCountries() {
    return Object.keys(TRAVEL_TIMES);
}

// Export for use in module
if (typeof window !== 'undefined') {
    window.TravelTimesData = {
        TRAVEL_TIMES,
        getTravelTime,
        normalizeCountryName,
        formatTravelTime,
        getAllCountries
    };
}
