/**
 * Runs Filter & Sort JavaScript v2
 * 
 * Unified filter UI with typeahead inputs matching the Games page.
 * - Text inputs with placeholders (not dropdowns)
 * - Selected items shown as chips with × close button
 * - Consistent UI across all filter types
 * 
 * Used by _layouts/game-runs.html
 */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // ============================================================
  // DOM Elements
  // ============================================================
  const qInput = document.getElementById('q');
  const filterToggle = document.getElementById('filter-toggle');
  const advancedFilters = document.getElementById('advanced-filters');
  const activeFiltersDiv = document.getElementById('active-filters');
  const runsBody = document.getElementById('runs-body');
  const rows = runsBody ? Array.from(runsBody.querySelectorAll('.run-row')) : [];
  const totalRuns = rows.length;

  // Filter containers (we'll convert these to typeahead)
  const fChallengeContainer = document.getElementById('f-challenge-container');
  const fRestrictionsContainer = document.getElementById('f-restrictions-container');
  const fGlitchContainer = document.getElementById('f-glitch-container');
  const fCharacterContainer = document.getElementById('f-character-container');
  
  // Legacy select elements (fallback if containers don't exist)
  const fChallenge = document.getElementById('f-challenge');
  const fRestrictions = document.getElementById('f-restrictions');
  const fGlitch = document.getElementById('f-glitch');
  const fCharacter = document.getElementById('f-character');
  
  const resetBtn = document.getElementById('reset-filters');
  const resultsText = document.getElementById('results-text');

  // Sort buttons
  const sortDateAsc = document.getElementById('th-sort-asc');
  const sortDateDesc = document.getElementById('th-sort-desc');
  const sortTimeAsc = document.getElementById('th-time-asc');
  const sortTimeDesc = document.getElementById('th-time-desc');

  // Selected items (multi-select)
  let selectedChallenges = new Set();
  let selectedRestrictions = new Set();
  let selectedCharacters = new Set();
  let selectedGlitch = '';

  // Available options (built from data)
  let availableChallenges = [];
  let availableRestrictions = [];
  let availableCharacters = [];
  let availableGlitches = [];

  // ============================================================
  // Utility Functions
  // ============================================================
  function norm(s) {
    return (s || '').toString().trim().toLowerCase();
  }

  function debounce(fn, ms) {
    let timer;
    return function() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ============================================================
  // Chip Component
  // ============================================================
  function createChip(label, onRemove) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.innerHTML = `
      <span class="filter-chip__text">${escapeHtml(label)}</span>
      <span class="filter-chip__close" aria-label="Remove ${escapeHtml(label)}">×</span>
    `;
    
    const handleRemove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRemove) onRemove();
    };
    
    chip.addEventListener('click', handleRemove);
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
        handleRemove(e);
      }
    });
    
    return chip;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ============================================================
  // Typeahead Filter Component (uses existing HTML structure)
  // ============================================================
  function createTypeaheadFilter(config) {
    const { container, placeholder, items, selectedSet, onFilter, labelKey = 'label', idKey = 'id' } = config;
    
    if (!container) return null;

    // Find existing elements in the container
    const pickedEl = container.querySelector('.filter-input__picked');
    const inputWrap = container.querySelector('.filter-input__wrap');
    const input = container.querySelector('input[type="text"]');
    const sugEl = container.querySelector('.filter-input__suggestions');

    if (!input || !sugEl) {
      console.warn('Typeahead filter missing required elements:', container.id);
      return null;
    }

    let isOpen = false;

    function renderPicked() {
      if (!pickedEl) return;
      pickedEl.innerHTML = '';
      selectedSet.forEach(id => {
        const item = items.find(x => norm(x[idKey] || x) === norm(id));
        const label = item ? (item[labelKey] || item) : id;
        const chip = createChip(label, () => {
          selectedSet.delete(norm(id));
          renderPicked();
          onFilter();
        });
        pickedEl.appendChild(chip);
      });
    }

    function renderSuggestions(query) {
      const q = norm(query);
      sugEl.innerHTML = '';

      const available = items.filter(x => {
        const id = x[idKey] || x;
        return !selectedSet.has(norm(id));
      });

      const filtered = q 
        ? available.filter(x => {
            const label = x[labelKey] || x;
            const id = x[idKey] || x;
            return norm(label).includes(q) || norm(id).includes(q);
          })
        : available;

      const show = filtered.slice(0, 20);

      if (!show.length) {
        const empty = document.createElement('div');
        empty.className = 'filter-suggestion filter-suggestion--empty';
        empty.textContent = available.length ? 'No matches.' : 'All options selected.';
        sugEl.appendChild(empty);
        sugEl.hidden = false;
        return;
      }

      show.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-suggestion';
        btn.textContent = item[labelKey] || item;
        btn.dataset.id = item[idKey] || item;
        
        btn.addEventListener('click', () => {
          selectedSet.add(norm(btn.dataset.id));
          input.value = '';
          renderPicked();
          renderSuggestions('');
          onFilter();
        });
        
        sugEl.appendChild(btn);
      });

      sugEl.hidden = false;
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      renderSuggestions(input.value);
    }

    function close() {
      isOpen = false;
      sugEl.hidden = true;
    }

    // Events
    input.addEventListener('focus', open);
    input.addEventListener('input', debounce(() => renderSuggestions(input.value), 100));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (!container.contains(e.target)) close();
    }, true);

    // Initial render
    renderPicked();

    return {
      refresh: renderPicked,
      clear: () => {
        selectedSet.clear();
        input.value = '';
        renderPicked();
      }
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ============================================================
  // Build Options from Row Data
  // ============================================================
  function buildFilterOptions() {
    const challenges = new Map();
    const restrictions = new Set();
    const characters = new Set();
    const glitches = new Map();

    rows.forEach(row => {
      // Challenges
      const chLabel = row.dataset.challengeLabel;
      const chId = row.dataset.challengeId;
      if (chLabel && chId) {
        challenges.set(chId, { id: chId, label: chLabel });
      }

      // Restrictions
      const res = row.dataset.restrictions;
      if (res) {
        res.split('||').forEach(r => {
          const trimmed = r.trim();
          if (trimmed) restrictions.add(trimmed);
        });
      }

      // Characters
      const char = row.dataset.character;
      if (char) characters.add(char);

      // Glitches
      const glitch = row.dataset.glitch;
      if (glitch) {
        glitches.set(glitch, { id: glitch, label: glitch });
      }
    });

    availableChallenges = Array.from(challenges.values()).sort((a, b) => a.label.localeCompare(b.label));
    availableRestrictions = Array.from(restrictions).sort().map(r => ({ id: r, label: r }));
    availableCharacters = Array.from(characters).sort().map(c => ({ id: c, label: c }));
    availableGlitches = Array.from(glitches.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  // ============================================================
  // Initialize Typeahead Filters
  // ============================================================
  let challengeFilter, restrictionsFilter, characterFilter, glitchFilter;

  function initTypeaheadFilters() {
    // Challenge filter
    if (fChallengeContainer && availableChallenges.length > 0) {
      challengeFilter = createTypeaheadFilter({
        container: fChallengeContainer,
        placeholder: 'Type a challenge...',
        items: availableChallenges,
        selectedSet: selectedChallenges,
        onFilter: filterRows
      });
    } else if (fChallenge && availableChallenges.length > 0) {
      // Populate legacy select element
      populateSelect(fChallenge, availableChallenges);
      fChallenge.addEventListener('change', () => {
        selectedChallenges.clear();
        if (fChallenge.value) selectedChallenges.add(norm(fChallenge.value));
        filterRows();
      });
    }

    // Restrictions filter
    if (fRestrictionsContainer && availableRestrictions.length > 0) {
      restrictionsFilter = createTypeaheadFilter({
        container: fRestrictionsContainer,
        placeholder: 'Type a restriction...',
        items: availableRestrictions,
        selectedSet: selectedRestrictions,
        onFilter: filterRows
      });
    } else if (fRestrictions && availableRestrictions.length > 0) {
      // Populate legacy select element
      populateSelect(fRestrictions, availableRestrictions);
      fRestrictions.addEventListener('change', () => {
        selectedRestrictions.clear();
        if (fRestrictions.value) selectedRestrictions.add(norm(fRestrictions.value));
        filterRows();
      });
    }

    // Character filter
    if (fCharacterContainer && availableCharacters.length > 0) {
      characterFilter = createTypeaheadFilter({
        container: fCharacterContainer,
        placeholder: 'Type a weapon/aspect...',
        items: availableCharacters,
        selectedSet: selectedCharacters,
        onFilter: filterRows
      });
    } else if (fCharacter && availableCharacters.length > 0) {
      // Populate legacy select element
      populateSelect(fCharacter, availableCharacters);
      fCharacter.addEventListener('change', () => {
        selectedCharacters.clear();
        if (fCharacter.value) selectedCharacters.add(norm(fCharacter.value));
        filterRows();
      });
    }

    // Glitch filter (single select, keep as dropdown for now or convert)
    // For consistency, we could make this typeahead too but single-select
    if (fGlitch) {
      // Keep legacy dropdown behavior
      fGlitch.addEventListener('change', () => {
        selectedGlitch = fGlitch.value;
        filterRows();
      });
    }
  }

  // Helper to populate a select element with options
  function populateSelect(selectEl, items) {
    // Keep the first "All" option
    const firstOption = selectEl.querySelector('option');
    selectEl.innerHTML = '';
    if (firstOption) selectEl.appendChild(firstOption);
    
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id || item;
      opt.textContent = item.label || item;
      selectEl.appendChild(opt);
    });
  }

  // ============================================================
  // Toggle Advanced Filters
  // ============================================================
  if (filterToggle && advancedFilters) {
    filterToggle.addEventListener('click', function() {
      const isHidden = advancedFilters.hidden;
      advancedFilters.hidden = !isHidden;
      filterToggle.setAttribute('aria-expanded', isHidden);
      filterToggle.classList.toggle('is-active', isHidden);
    });
  }

  // ============================================================
  // Reset All Filters
  // ============================================================
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (qInput) qInput.value = '';
      
      selectedChallenges.clear();
      selectedRestrictions.clear();
      selectedCharacters.clear();
      selectedGlitch = '';
      
      // Reset legacy selects
      if (fChallenge) fChallenge.value = '';
      if (fRestrictions) fRestrictions.value = '';
      if (fCharacter) fCharacter.value = '';
      if (fGlitch) fGlitch.value = '';
      
      // Refresh typeahead displays (if they exist)
      if (challengeFilter) challengeFilter.refresh();
      if (restrictionsFilter) restrictionsFilter.refresh();
      if (characterFilter) characterFilter.refresh();
      
      filterRows();
    });
  }

  // ============================================================
  // Subcategory Filter (for parent categories with children)
  // ============================================================
  const subcategoryFilter = document.getElementById('subcategory-filter');
  let selectedSubcategory = '';

  if (subcategoryFilter) {
    const subcatButtons = subcategoryFilter.querySelectorAll('.category-pill--sub');
    
    subcatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        subcatButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        
        // Set selected subcategory
        selectedSubcategory = btn.dataset.subcat || '';
        
        // Re-filter rows
        filterRows();
      });
    });
  }

  // ============================================================
  // Filter Logic
  // ============================================================
  function filterRows() {
    const q = qInput ? norm(qInput.value) : '';
    let visibleCount = 0;

    rows.forEach(row => {
      let show = true;

      // Text search
      if (q) {
        const searchable = [
          row.dataset.runnerName,
          row.dataset.challengeLabel,
          row.dataset.challengeAliases,
          row.dataset.restrictions,
          row.dataset.character
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) show = false;
      }

      // Subcategory filter
      if (show && selectedSubcategory) {
        const rowCategory = row.dataset.categorySlug || '';
        if (rowCategory !== selectedSubcategory) show = false;
      }

      // Challenge filter (any match)
      if (show && selectedChallenges.size > 0) {
        const rowChallenge = norm(row.dataset.challengeId);
        if (!selectedChallenges.has(rowChallenge)) show = false;
      }

      // Restriction filter (must have all selected)
      if (show && selectedRestrictions.size > 0) {
        const rowRes = (row.dataset.restrictions || '').split('||').map(norm);
        const hasAll = Array.from(selectedRestrictions).every(r => rowRes.includes(r));
        if (!hasAll) show = false;
      }

      // Character filter (any match)
      if (show && selectedCharacters.size > 0) {
        const rowChar = norm(row.dataset.character);
        if (!selectedCharacters.has(rowChar)) show = false;
      }

      // Glitch filter
      if (show && selectedGlitch && row.dataset.glitch !== selectedGlitch) {
        show = false;
      }

      row.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    updateActiveFilters();
    updateResultsStatus(visibleCount);
  }

  // ============================================================
  // Results Status
  // ============================================================
  function updateResultsStatus(visibleCount) {
    if (!resultsText) return;
    const count = visibleCount !== undefined ? visibleCount : totalRuns;
    if (count === totalRuns) {
      resultsText.textContent = `Showing all ${totalRuns} runs`;
    } else {
      resultsText.textContent = `Found ${count} of ${totalRuns} runs`;
    }
  }

  // ============================================================
  // Active Filters Display (chips below filters row)
  // ============================================================
  function updateActiveFilters() {
    if (!activeFiltersDiv) return;
    activeFiltersDiv.innerHTML = '';

    // Don't duplicate - chips are shown in the typeahead containers
    // This area can show a summary or be removed
  }

  // ============================================================
  // Sorting
  // ============================================================
  function parseTime(t) {
    if (!t || t === '—') return Infinity;
    const parts = t.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseFloat(t) || Infinity;
  }

  function sortRows(key, asc) {
    const sorted = [...rows].sort((a, b) => {
      let va, vb;
      if (key === 'time') {
        va = parseTime(a.dataset.time);
        vb = parseTime(b.dataset.time);
      } else {
        va = a.dataset.date || '';
        vb = b.dataset.date || '';
      }
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    sorted.forEach(r => runsBody.appendChild(r));
  }

  // ============================================================
  // Event Listeners
  // ============================================================
  if (qInput) qInput.addEventListener('input', debounce(filterRows, 150));
  
  if (sortDateAsc) sortDateAsc.addEventListener('click', () => sortRows('date', true));
  if (sortDateDesc) sortDateDesc.addEventListener('click', () => sortRows('date', false));
  if (sortTimeAsc) sortTimeAsc.addEventListener('click', () => sortRows('time', true));
  if (sortTimeDesc) sortTimeDesc.addEventListener('click', () => sortRows('time', false));

  // ============================================================
  // URL Hash Filter Support (for Rule Builder links)
  // ============================================================
  function applyFiltersFromHash() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('filters=')) return;
    
    try {
      const filtersParam = hash.split('filters=')[1];
      const filterData = JSON.parse(decodeURIComponent(filtersParam));
      
      if (filterData.challenges) {
        filterData.challenges.forEach(id => selectedChallenges.add(norm(id)));
      }
      
      if (filterData.restrictions) {
        filterData.restrictions.forEach(id => selectedRestrictions.add(norm(id)));
      }
      
      if (filterData.character) {
        filterData.character.forEach(id => selectedCharacters.add(norm(id)));
      }
      
      if (filterData.glitch) {
        selectedGlitch = filterData.glitch;
        if (fGlitch) fGlitch.value = filterData.glitch;
      }
      
      // Open advanced filters if we have any
      if (selectedChallenges.size > 0 || selectedRestrictions.size > 0 || 
          selectedCharacters.size > 0 || selectedGlitch) {
        if (advancedFilters && filterToggle) {
          advancedFilters.hidden = false;
          filterToggle.setAttribute('aria-expanded', 'true');
          filterToggle.classList.add('is-active');
        }
      }
      
      // Refresh typeahead displays
      if (challengeFilter) challengeFilter.refresh();
      if (restrictionsFilter) restrictionsFilter.refresh();
      if (characterFilter) characterFilter.refresh();
      
      filterRows();
      
      // Clear hash after applying
      history.replaceState(null, '', window.location.pathname + window.location.search);
      
    } catch (e) {
      console.error('Error parsing filter hash:', e);
    }
  }

  // ============================================================
  // Initialize
  // ============================================================
  buildFilterOptions();
  initTypeaheadFilters();
  applyFiltersFromHash();
  updateResultsStatus();
});
