/**
 * CRC Filter Utilities
 * Shared filtering, tag picker, and A-Z navigation logic
 * Used by games/index.html and runners/index.html
 */

window.CRCFilters = (function() {
  'use strict';

  // =========================================================
  // Core utilities
  // =========================================================
  
  /**
   * Normalize string for comparison
   */
  function norm(s) {
    return (s || '').toString().trim().toLowerCase();
  }

  /**
   * Convert roman numerals to arabic for matching
   */
  function expandRomanNumerals(s) {
    var str = norm(s);
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
  }

  // =========================================================
  // Tag Picker: Render picked chips
  // =========================================================
  
  /**
   * Render selected tags as removable chips
   * @param {Set} set - Set of selected tag IDs
   * @param {Array} list - List of {id, label} objects
   * @param {HTMLElement} pickedEl - Container for chips
   * @param {Object} options - { onRemove: function }
   */
  function renderPicked(set, list, pickedEl, options) {
    options = options || {};
    pickedEl.innerHTML = '';

    var entries = Array.from(set);
    if (!entries.length) return;

    entries.forEach(function(id) {
      var meta = list.find(function(x) { return norm(x.id) === norm(id); });
      var label = meta ? meta.label : id;

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip';
      chip.textContent = label + ' ×';

      chip.addEventListener('click', function() {
        set.delete(norm(id));
        if (options.onRemove) options.onRemove();
      });

      pickedEl.appendChild(chip);
    });
  }

  // =========================================================
  // Tag Picker: Render suggestions dropdown
  // =========================================================
  
  /**
   * Render filtered suggestions list
   * @param {string} qRaw - Search query
   * @param {Set} set - Set of already selected IDs
   * @param {Array} list - List of {id, label, aliases?} objects
   * @param {HTMLElement} sugEl - Suggestions container
   * @param {Object} options - { onPick: function }
   */
  function renderSuggestions(qRaw, set, list, sugEl, options) {
    options = options || {};
    var q = norm(qRaw);
    sugEl.innerHTML = '';

    var available = list.filter(function(x) { return !set.has(norm(x.id)); });
    var filtered = q
      ? available.filter(function(x) {
          if (norm(x.label).includes(q) || norm(x.id).includes(q)) return true;
          if (x.aliases && x.aliases.length) {
            return x.aliases.some(function(alias) { return norm(alias).includes(q); });
          }
          return false;
        })
      : available;

    var show = filtered.slice(0, 30);

    if (!show.length) {
      var empty = document.createElement('div');
      empty.className = 'tag-suggestion is-empty';
      empty.textContent = 'No matches.';
      sugEl.appendChild(empty);
      sugEl.hidden = false;
      return;
    }

    show.forEach(function(item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-suggestion';
      btn.textContent = item.label;
      btn.dataset.id = item.id;
      sugEl.appendChild(btn);
    });

    // Use event delegation - single listener on parent
    // Remove old listener first to prevent duplicates
    if (sugEl._clickHandler) {
      sugEl.removeEventListener('click', sugEl._clickHandler);
    }
    sugEl._clickHandler = function(e) {
      var btn = e.target.closest('.tag-suggestion:not(.is-empty)');
      if (!btn || !btn.dataset.id) return;
      set.add(norm(btn.dataset.id));
      if (options.onPick) {
        var item = list.find(function(x) { return norm(x.id) === norm(btn.dataset.id); });
        options.onPick(item);
      }
    };
    sugEl.addEventListener('click', sugEl._clickHandler);

    sugEl.hidden = false;
  }

  // =========================================================
  // Tag Picker: Wire up dropdown behavior
  // =========================================================
  
  /**
   * Initialize a tag picker dropdown
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.filterEl - Container element
   * @param {HTMLElement} config.searchEl - Search input
   * @param {HTMLElement} config.sugEl - Suggestions dropdown
   * @param {Set} config.set - Selected items set
   * @param {Array} config.list - Available items list
   * @param {HTMLElement} config.pickedEl - Picked chips container
   * @param {Function} config.onFilter - Callback when filter changes
   */
  function wireDropdown(config) {
    var filterEl = config.filterEl;
    var searchEl = config.searchEl;
    var sugEl = config.sugEl;
    var set = config.set;
    var list = config.list;
    var pickedEl = config.pickedEl;
    var onFilter = config.onFilter || function() {};

    function afterPick() {
      searchEl.value = '';
      renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });
      onFilter();
      renderSuggestions('', set, list, sugEl, { onPick: afterPick });
    }

    function open() {
      renderSuggestions(searchEl.value, set, list, sugEl, { onPick: afterPick });
    }

    function close() {
      sugEl.hidden = true;
    }

    function onRemoveChip() {
      searchEl.value = '';
      renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });
      onFilter();
      close();
    }

    // Initial render
    renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });

    // Event listeners
    searchEl.addEventListener('focus', function() { if (sugEl.hidden) open(); });
    searchEl.addEventListener('pointerdown', function() { if (sugEl.hidden) open(); else close(); });
    searchEl.addEventListener('input', function() { open(); });
    searchEl.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { close(); searchEl.blur(); }
    });
    document.addEventListener('pointerdown', function(e) {
      if (!filterEl.contains(e.target)) close();
    }, true);

    // Return methods for external control
    return {
      open: open,
      close: close,
      refresh: function() {
        renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });
      }
    };
  }

  // =========================================================
  // A-Z Navigation
  // =========================================================
  
  /**
   * Initialize A-Z letter navigation
   * @param {Object} config - Configuration object
   * @param {Function} config.onHashChange - Callback when hash changes
   */
  function initAzNav(config) {
    config = config || {};
    var azLinks = document.querySelectorAll('.az a');

    function updateAzActive() {
      var hash = (location.hash || '').replace('#', '').toUpperCase();
      azLinks.forEach(function(link) {
        var linkHash = (link.getAttribute('href') || '').replace('#', '').toUpperCase();
        link.classList.toggle('is-active', linkHash === hash);
      });
    }

    window.addEventListener('hashchange', function() {
      updateAzActive();
      if (config.onHashChange) config.onHashChange();
    });

    azLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        setTimeout(updateAzActive, 0);
      });
    });

    // Initial state
    updateAzActive();

    return {
      update: updateAzActive
    };
  }

  // =========================================================
  // Hash-based letter filtering
  // =========================================================
  
  /**
   * Check if an item's letter matches the current hash filter
   * @param {string} letter - First letter of item name (uppercase)
   * @param {string} hashMode - Current hash filter (empty string for no filter)
   * @returns {boolean}
   */
  function matchesHashFilter(letter, hashMode) {
    if (!hashMode) return true;

    var startsWithDigit = letter >= '0' && letter <= '9';
    var startsWithAtoZ = letter >= 'A' && letter <= 'Z';

    if (hashMode === '0-9') return startsWithDigit;
    if (hashMode === 'OTHER') return !startsWithDigit && !startsWithAtoZ;
    if (hashMode.length === 1) return letter === hashMode;

    return true;
  }

  /**
   * Get current hash mode from URL
   * @returns {string} - Uppercase hash or empty string
   */
  function getHashMode() {
    var rawHash = (location.hash || '').replace('#', '').toUpperCase();
    return rawHash && rawHash !== 'ALL' ? rawHash : '';
  }

  // =========================================================
  // Lazy load backgrounds
  // =========================================================
  
  /**
   * Initialize lazy loading for [data-bg] elements
   */
  function lazyLoadBgs() {
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
      lazyBgs.forEach(function(el) {
        el.style.backgroundImage = "url('" + el.dataset.bg + "')";
      });
    }
  }

  // =========================================================
  // Public API
  // =========================================================
  return {
    norm: norm,
    expandRomanNumerals: expandRomanNumerals,
    renderPicked: renderPicked,
    renderSuggestions: renderSuggestions,
    wireDropdown: wireDropdown,
    initAzNav: initAzNav,
    matchesHashFilter: matchesHashFilter,
    getHashMode: getHashMode,
    lazyLoadBgs: lazyLoadBgs
  };
})();
