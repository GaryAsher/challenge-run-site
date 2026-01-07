/**
 * CRC Shared Utilities
 * Common functions used across multiple pages
 */

window.CRC = window.CRC || {};

/**
 * Normalize a string for comparison (lowercase, trimmed)
 * @param {string} s - Input string
 * @returns {string} - Normalized string
 */
CRC.norm = function(s) {
  return (s || '').toString().trim().toLowerCase();
};

/**
 * Convert roman numerals to arabic numbers in a string
 * Useful for searching "Hades 2" and finding "Hades II"
 * @param {string} s - Input string
 * @returns {string} - String with roman numerals converted
 */
CRC.expandRomanNumerals = function(s) {
  var str = CRC.norm(s);
  var romans = [
    ['xviii', '18'], ['xvii', '17'], ['xvi', '16'], ['xv', '15'], ['xiv', '14'],
    ['xiii', '13'], ['xii', '12'], ['xi', '11'], ['x', '10'],
    ['viii', '8'], ['vii', '7'], ['vi', '6'], ['iv', '4'], ['v', '5'],
    ['iii', '3'], ['ii', '2'], ['i', '1']
  ];
  romans.forEach(function(pair) {
    var regex = new RegExp('\\b' + pair[0] + '\\b', 'g');
    str = str.replace(regex, pair[1]);
  });
  return str;
};

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
CRC.debounce = function(fn, delay) {
  var timer = null;
  return function() {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(context, args);
    }, delay);
  };
};

/**
 * Lazy load background images using IntersectionObserver
 * Call this on page load to lazy load all [data-bg] elements
 */
CRC.lazyLoadBgs = function() {
  var lazyBgs = document.querySelectorAll('[data-bg]');
  
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.style.backgroundImage = "url('" + el.dataset.bg + "')";
          el.removeAttribute('data-bg');
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '100px' });
    
    lazyBgs.forEach(function(el) { observer.observe(el); });
  } else {
    // Fallback for older browsers
    lazyBgs.forEach(function(el) {
      el.style.backgroundImage = "url('" + el.dataset.bg + "')";
    });
  }
};

/**
 * Parse a date string to a timestamp number
 * @param {string} s - Date string (YYYY-MM-DD format)
 * @returns {number} - Timestamp or NaN if invalid
 */
CRC.parseDateToNumber = function(s) {
  var v = (s || '').trim();
  if (!v) return NaN;

  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) {
    return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  var t = Date.parse(v);
  return Number.isFinite(t) ? t : NaN;
};

/**
 * Escape HTML to prevent XSS
 * @param {string} s - String to escape
 * @returns {string} - Escaped string
 */
CRC.escapeHtml = function(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
};

/**
 * Get unique values from an array
 * @param {Array} arr - Input array
 * @returns {Array} - Array with duplicates removed
 */
CRC.uniq = function(arr) {
  return Array.from(new Set(arr));
};
