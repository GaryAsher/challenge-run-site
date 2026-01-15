/**
 * CRC Filter Utilities v2
 * Unified filtering, tag picker, and search components
 * Used across: Games list, Runs list, Rule Builder, Global Search
 * 
 * All filters use the same UI pattern:
 * - Text input with placeholder "Type a [category]..."
 * - Dropdown suggestions on focus/type
 * - Selected items shown as chips with × button
 * - "Remove all filters" button when filters active
 */

window.CRCFilters = (function() {
  'use strict';

  // =========================================================
  // Core utilities
  // =========================================================
  
  function norm(s) {
    return (s || '').toString().trim().toLowerCase();
  }

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

  function debounce(fn, ms) {
    var timer;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(context, args); }, ms);
    };
  }

  // =========================================================
  // Tag Chip Component
  // =========================================================
  
  /**
   * Create a removable tag chip element
   * @param {string} label - Display text
   * @param {Function} onRemove - Callback when × clicked
   * @returns {HTMLElement}
   */
  function createChip(label, onRemove) {
    var chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    
    var text = document.createElement('span');
    text.className = 'filter-chip__text';
    text.textContent = label;
    
    var close = document.createElement('span');
    close.className = 'filter-chip__close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Remove ' + label);
    
    chip.appendChild(text);
    chip.appendChild(close);
    
    function handleRemove(e) {
      e.preventDefault();
      e.stopPropagation();
      if (onRemove) onRemove();
    }
    
    chip.addEventListener('click', handleRemove);
    chip.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
        handleRemove(e);
      }
    });
    
    return chip;
  }

  // =========================================================
  // Render picked chips
  // =========================================================
  
  function renderPicked(set, list, pickedEl, options) {
    options = options || {};
    pickedEl.innerHTML = '';

    var entries = Array.from(set);
    if (!entries.length) return;

    entries.forEach(function(id) {
      var meta = list.find(function(x) { return norm(x.id) === norm(id); });
      var label = meta ? meta.label : id;
      
      var chip = createChip(label, function() {
        set.delete(norm(id));
        if (options.onRemove) options.onRemove();
      });
      
      pickedEl.appendChild(chip);
    });
  }

  // =========================================================
  // Render suggestions dropdown
  // =========================================================
  
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
      empty.className = 'filter-suggestion filter-suggestion--empty';
      empty.textContent = available.length ? 'No matches.' : 'All options selected.';
      sugEl.appendChild(empty);
      sugEl.hidden = false;
      return;
    }

    show.forEach(function(item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-suggestion';
      btn.textContent = item.label;
      btn.dataset.id = item.id;
      sugEl.appendChild(btn);
    });

    if (sugEl._clickHandler) {
      sugEl.removeEventListener('click', sugEl._clickHandler);
    }
    sugEl._clickHandler = function(e) {
      var btn = e.target.closest('.filter-suggestion:not(.filter-suggestion--empty)');
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
  // Unified Filter Input Component
  // =========================================================
  
  /**
   * Create a complete filter input with typeahead
   * @param {Object} config
   * @param {string} config.placeholder - e.g., "Type a weapon..."
   * @param {Array} config.list - Array of {id, label, aliases?, description?}
   * @param {Set} config.set - Selected items Set
   * @param {Function} config.onChange - Called when selection changes
   * @param {boolean} config.multiSelect - Allow multiple selections (default true)
   * @returns {HTMLElement} - Container element
   */
  function createFilterInput(config) {
    var placeholder = config.placeholder || 'Type to search...';
    var list = config.list || [];
    var set = config.set || new Set();
    var onChange = config.onChange || function() {};
    var multiSelect = config.multiSelect !== false;

    // Container
    var container = document.createElement('div');
    container.className = 'filter-input';

    // Picked chips area
    var pickedEl = document.createElement('div');
    pickedEl.className = 'filter-input__picked';
    container.appendChild(pickedEl);

    // Input wrapper
    var inputWrap = document.createElement('div');
    inputWrap.className = 'filter-input__wrap';
    container.appendChild(inputWrap);

    // Text input
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'filter-input__field';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', placeholder);
    inputWrap.appendChild(input);

    // Suggestions dropdown
    var sugEl = document.createElement('div');
    sugEl.className = 'filter-input__suggestions';
    sugEl.hidden = true;
    inputWrap.appendChild(sugEl);

    // State
    var isOpen = false;

    function render() {
      renderPicked(set, list, pickedEl, { onRemove: function() {
        render();
        onChange();
      }});
      
      // Hide input if single-select and has value
      if (!multiSelect && set.size > 0) {
        input.style.display = 'none';
      } else {
        input.style.display = '';
      }
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      renderSuggestions(input.value, set, list, sugEl, {
        onPick: function() {
          input.value = '';
          render();
          onChange();
          if (multiSelect) {
            renderSuggestions('', set, list, sugEl, { onPick: arguments.callee });
          } else {
            close();
          }
        }
      });
    }

    function close() {
      isOpen = false;
      sugEl.hidden = true;
    }

    // Events
    input.addEventListener('focus', open);
    input.addEventListener('input', debounce(function() {
      renderSuggestions(input.value, set, list, sugEl, {
        onPick: function(item) {
          input.value = '';
          render();
          onChange();
          if (multiSelect) {
            renderSuggestions('', set, list, sugEl, { onPick: arguments.callee });
          } else {
            close();
          }
        }
      });
    }, 100));

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });

    document.addEventListener('pointerdown', function(e) {
      if (!container.contains(e.target)) {
        close();
      }
    }, true);

    // Initial render
    render();

    // Public API
    container._api = {
      getSet: function() { return set; },
      clear: function() {
        set.clear();
        input.value = '';
        render();
        onChange();
      },
      refresh: render
    };

    return container;
  }

  // =========================================================
  // Wire existing dropdown (backwards compatible)
  // =========================================================
  
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

    renderPicked(set, list, pickedEl, { onRemove: onRemoveChip });

    searchEl.addEventListener('focus', function() { if (sugEl.hidden) open(); });
    searchEl.addEventListener('pointerdown', function() { if (sugEl.hidden) open(); else close(); });
    searchEl.addEventListener('input', function() { open(); });
    searchEl.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { close(); searchEl.blur(); }
    });
    document.addEventListener('pointerdown', function(e) {
      if (!filterEl.contains(e.target)) close();
    }, true);

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

    updateAzActive();

    return { update: updateAzActive };
  }

  // =========================================================
  // Hash-based filtering
  // =========================================================
  
  function matchesHashFilter(letter, hashMode) {
    if (!hashMode) return true;
    var startsWithDigit = letter >= '0' && letter <= '9';
    var startsWithAtoZ = letter >= 'A' && letter <= 'Z';
    if (hashMode === '0-9') return startsWithDigit;
    if (hashMode === 'OTHER') return !startsWithDigit && !startsWithAtoZ;
    if (hashMode.length === 1) return letter === hashMode;
    return true;
  }

  function getHashMode() {
    var rawHash = (location.hash || '').replace('#', '').toUpperCase();
    return rawHash && rawHash !== 'ALL' ? rawHash : '';
  }

  // =========================================================
  // Lazy load backgrounds
  // =========================================================
  
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
  // Back to Top button
  // =========================================================
  
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '↑';
    btn.hidden = true;
    document.body.appendChild(btn);

    var scrollThreshold = 400;

    function checkScroll() {
      btn.hidden = window.scrollY < scrollThreshold;
    }

    window.addEventListener('scroll', debounce(checkScroll, 100));
    
    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    checkScroll();
    return btn;
  }

  // =========================================================
  // Public API
  // =========================================================
  return {
    norm: norm,
    expandRomanNumerals: expandRomanNumerals,
    debounce: debounce,
    createChip: createChip,
    createFilterInput: createFilterInput,
    renderPicked: renderPicked,
    renderSuggestions: renderSuggestions,
    wireDropdown: wireDropdown,
    initAzNav: initAzNav,
    matchesHashFilter: matchesHashFilter,
    getHashMode: getHashMode,
    lazyLoadBgs: lazyLoadBgs,
    initBackToTop: initBackToTop
  };
})();

// Auto-init back to top on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  window.CRCFilters.initBackToTop();
});
