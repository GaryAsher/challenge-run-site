/**
 * Runs Filter & Sort JavaScript v3
 * 
 * Unified filter UI with typeahead inputs.
 * - Character and Glitches: single-select
 * - Challenges and Restrictions: multi-select
 * - All selections shown as chips in unified area below filters
 * - Ordered: Character → Challenge → Restrictions → Glitches
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
  const filterSelections = document.getElementById('filter-selections');
  const runsBody = document.getElementById('runs-body');
  const rows = runsBody ? Array.from(runsBody.querySelectorAll('.run-row')) : [];
  const totalRuns = rows.length;

  // Filter containers
  const fChallengeContainer = document.getElementById('f-challenge-container');
  const fRestrictionsContainer = document.getElementById('f-restrictions-container');
  const fGlitchContainer = document.getElementById('f-glitch-container');
  const fCharacterContainer = document.getElementById('f-character-container');
  
  // Legacy select elements (fallback)
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

  // Selected items
  // Multi-select: Sets
  let selectedChallenges = new Set();
  let selectedRestrictions = new Set();
  // Single-select: single value or null
  let selectedCharacter = null;
  let selectedGlitch = null;

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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
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

  // ============================================================
  // Typeahead Filter Component
  // ============================================================
  function createTypeaheadFilter(config) {
    const { 
      container, 
      placeholder, 
      items, 
      selectedSet,      // For multi-select (Set)
      getValue,         // For single-select: () => value
      setValue,         // For single-select: (value) => void
      singleSelect = false,
      onFilter,
      labelKey = 'label', 
      idKey = 'id' 
    } = config;
    
    if (!container) return null;

    const inputWrap = container.querySelector('.filter-input__wrap');
    const input = container.querySelector('input[type="text"]');
    const sugEl = container.querySelector('.filter-input__suggestions');

    if (!input || !sugEl) {
      console.warn('Typeahead filter missing required elements:', container.id);
      return null;
    }

    let isOpen = false;

    function isSelected(id) {
      if (singleSelect) {
        return norm(getValue()) === norm(id);
      }
      return selectedSet.has(norm(id));
    }

    function renderSuggestions(query) {
      const q = norm(query);
      sugEl.innerHTML = '';

      const available = items.filter(x => {
        const id = x[idKey] || x;
        return !isSelected(id);
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
          if (singleSelect) {
            setValue({ id: btn.dataset.id, label: item[labelKey] || item });
          } else {
            selectedSet.add(norm(btn.dataset.id));
          }
          input.value = '';
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

    return {
      refresh: () => renderSuggestions(input.value),
      clear: () => {
        if (singleSelect) {
          setValue(null);
        } else {
          selectedSet.clear();
        }
        input.value = '';
      }
    };
  }

  // ============================================================
  // Build Options from Row Data
  // ============================================================
  function buildFilterOptions() {
    const challenges = new Map();
    const restrictions = new Map();
    const characters = new Map();
    const glitches = new Map();
    
    // Track original order from game data for restrictions and characters
    // These should appear in the order defined in the game file, not alphabetically
    let restrictionsFromGameData = [];
    let charactersFromGameData = [];

    // First, add all options from game data (if available)
    // This ensures Advanced Search shows ALL options, not just what's in the grid
    if (window.CRC_GAME_DATA) {
      const gameData = window.CRC_GAME_DATA;
      
      if (gameData.challenges) {
        gameData.challenges.forEach(ch => {
          if (ch.id && ch.label) {
            challenges.set(ch.id, { id: ch.id, label: ch.label });
          }
        });
      }
      
      if (gameData.restrictions) {
        gameData.restrictions.forEach(res => {
          if (res.id && res.label) {
            restrictions.set(res.id, { id: res.id, label: res.label });
            restrictionsFromGameData.push({ id: res.id, label: res.label });
          }
        });
      }
      
      if (gameData.characters) {
        gameData.characters.forEach(char => {
          if (char.id && char.label) {
            characters.set(char.id, { id: char.id, label: char.label });
            charactersFromGameData.push({ id: char.id, label: char.label });
          }
        });
      }
      
      if (gameData.glitches) {
        gameData.glitches.forEach(gl => {
          if (gl.id && gl.label) {
            glitches.set(gl.id, { id: gl.id, label: gl.label });
          }
        });
      }
    }

    // Then add any additional items from rows (for backwards compatibility)
    rows.forEach(row => {
      // Challenges
      const chLabel = row.dataset.challengeLabel;
      const chId = row.dataset.challengeId;
      if (chLabel && chId && !challenges.has(chId)) {
        challenges.set(chId, { id: chId, label: chLabel });
      }

      // Restrictions - now using restriction IDs
      const resIds = row.dataset.restrictions;
      const resLabels = row.dataset.restrictionLabels;
      if (resIds) {
        const ids = resIds.split('||');
        const labels = resLabels ? resLabels.split('||') : ids;
        ids.forEach((id, i) => {
          const trimmedId = id.trim();
          if (trimmedId && !restrictions.has(trimmedId)) {
            const item = { 
              id: trimmedId, 
              label: labels[i] ? labels[i].trim() : trimmedId 
            };
            restrictions.set(trimmedId, item);
            // Only add to order list if not from game data
            if (!restrictionsFromGameData.find(r => r.id === trimmedId)) {
              restrictionsFromGameData.push(item);
            }
          }
        });
      }

      // Characters
      const char = row.dataset.character;
      if (char && !characters.has(char)) {
        const item = { id: char, label: char };
        characters.set(char, item);
        // Only add to order list if not from game data
        if (!charactersFromGameData.find(c => c.id === char)) {
          charactersFromGameData.push(item);
        }
      }

      // Glitches
      const glitch = row.dataset.glitch;
      if (glitch && !glitches.has(glitch)) {
        glitches.set(glitch, { id: glitch, label: glitch });
      }
    });

    // Challenges and Glitches: sort alphabetically
    availableChallenges = Array.from(challenges.values()).sort((a, b) => a.label.localeCompare(b.label));
    availableGlitches = Array.from(glitches.values()).sort((a, b) => a.label.localeCompare(b.label));
    
    // Restrictions and Characters: preserve original order from game data
    availableRestrictions = restrictionsFromGameData.length > 0 
      ? restrictionsFromGameData 
      : Array.from(restrictions.values());
    availableCharacters = charactersFromGameData.length > 0 
      ? charactersFromGameData 
      : Array.from(characters.values());
  }

  // ============================================================
  // Initialize Typeahead Filters
  // ============================================================
  let challengeFilter, restrictionsFilter, characterFilter, glitchFilter;

  function initTypeaheadFilters() {
    // Character filter (SINGLE-SELECT)
    if (fCharacterContainer && availableCharacters.length > 0) {
      characterFilter = createTypeaheadFilter({
        container: fCharacterContainer,
        placeholder: 'Type a weapon/aspect...',
        items: availableCharacters,
        singleSelect: true,
        getValue: () => selectedCharacter ? selectedCharacter.id : null,
        setValue: (val) => { selectedCharacter = val; },
        onFilter: filterRows
      });
    } else if (fCharacter && availableCharacters.length > 0) {
      populateSelect(fCharacter, availableCharacters);
      fCharacter.addEventListener('change', () => {
        if (fCharacter.value) {
          const item = availableCharacters.find(c => c.id === fCharacter.value);
          selectedCharacter = item || { id: fCharacter.value, label: fCharacter.value };
        } else {
          selectedCharacter = null;
        }
        filterRows();
      });
    }

    // Challenge filter (MULTI-SELECT)
    if (fChallengeContainer && availableChallenges.length > 0) {
      challengeFilter = createTypeaheadFilter({
        container: fChallengeContainer,
        placeholder: 'Type a challenge...',
        items: availableChallenges,
        selectedSet: selectedChallenges,
        singleSelect: false,
        onFilter: filterRows
      });
    } else if (fChallenge && availableChallenges.length > 0) {
      populateSelect(fChallenge, availableChallenges);
      fChallenge.addEventListener('change', () => {
        selectedChallenges.clear();
        if (fChallenge.value) selectedChallenges.add(norm(fChallenge.value));
        filterRows();
      });
    }

    // Restrictions filter (MULTI-SELECT)
    if (fRestrictionsContainer && availableRestrictions.length > 0) {
      restrictionsFilter = createTypeaheadFilter({
        container: fRestrictionsContainer,
        placeholder: 'Type a restriction...',
        items: availableRestrictions,
        selectedSet: selectedRestrictions,
        singleSelect: false,
        onFilter: filterRows
      });
    } else if (fRestrictions && availableRestrictions.length > 0) {
      populateSelect(fRestrictions, availableRestrictions);
      fRestrictions.addEventListener('change', () => {
        selectedRestrictions.clear();
        if (fRestrictions.value) selectedRestrictions.add(norm(fRestrictions.value));
        filterRows();
      });
    }

    // Glitch filter (SINGLE-SELECT)
    if (fGlitchContainer && availableGlitches.length > 0) {
      glitchFilter = createTypeaheadFilter({
        container: fGlitchContainer,
        placeholder: 'Type a glitch category...',
        items: availableGlitches,
        singleSelect: true,
        getValue: () => selectedGlitch ? selectedGlitch.id : null,
        setValue: (val) => { selectedGlitch = val; },
        onFilter: filterRows
      });
    } else if (fGlitch && availableGlitches.length > 0) {
      populateSelect(fGlitch, availableGlitches);
      fGlitch.addEventListener('change', () => {
        if (fGlitch.value) {
          const item = availableGlitches.find(g => g.id === fGlitch.value);
          selectedGlitch = item || { id: fGlitch.value, label: fGlitch.value };
        } else {
          selectedGlitch = null;
        }
        filterRows();
      });
    }
  }

  // Helper to populate a select element with options
  function populateSelect(selectEl, items) {
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
      
      // Clear multi-select
      selectedChallenges.clear();
      selectedRestrictions.clear();
      
      // Clear single-select
      selectedCharacter = null;
      selectedGlitch = null;
      
      // Reset legacy selects
      if (fChallenge) fChallenge.value = '';
      if (fRestrictions) fRestrictions.value = '';
      if (fCharacter) fCharacter.value = '';
      if (fGlitch) fGlitch.value = '';
      
      // Refresh typeahead displays (if they exist)
      if (challengeFilter) challengeFilter.refresh();
      if (restrictionsFilter) restrictionsFilter.refresh();
      if (characterFilter) characterFilter.refresh();
      if (glitchFilter) glitchFilter.refresh();
      
      filterRows();
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
          row.dataset.restrictionLabels,
          row.dataset.character
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) show = false;
      }

      // Challenge filter (any match - check all challenge IDs)
      if (show && selectedChallenges.size > 0) {
        const rowChallengeIds = (row.dataset.challengeIds || row.dataset.challengeId || '').split(',').map(norm).filter(Boolean);
        const hasMatch = rowChallengeIds.some(chId => selectedChallenges.has(chId));
        if (!hasMatch) show = false;
      }

      // Restriction filter (must have all selected)
      if (show && selectedRestrictions.size > 0) {
        const rowRes = (row.dataset.restrictions || '').split('||').map(norm);
        const hasAll = Array.from(selectedRestrictions).every(r => rowRes.includes(r));
        if (!hasAll) show = false;
      }

      // Character filter (single-select)
      if (show && selectedCharacter) {
        const rowChar = norm(row.dataset.character);
        if (rowChar !== norm(selectedCharacter.id)) show = false;
      }

      // Glitch filter (single-select)
      if (show && selectedGlitch) {
        const rowGlitch = norm(row.dataset.glitch);
        if (rowGlitch !== norm(selectedGlitch.id)) show = false;
      }

      row.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    updateSelections();
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
  // Unified Selections Display (chips below filters)
  // Order: Character → Challenges → Restrictions → Glitches
  // ============================================================
  function updateSelections() {
    if (!filterSelections) return;
    filterSelections.innerHTML = '';

    const hasSelections = selectedCharacter || selectedChallenges.size > 0 || 
                          selectedRestrictions.size > 0 || selectedGlitch;

    // Show/hide reset button
    if (resetBtn) {
      resetBtn.style.display = hasSelections ? '' : 'none';
    }

    if (!hasSelections) return;

    // Character (single-select)
    if (selectedCharacter) {
      const chip = createChip(selectedCharacter.label, () => {
        selectedCharacter = null;
        if (characterFilter) characterFilter.refresh();
        filterRows();
      });
      filterSelections.appendChild(chip);
    }

    // Challenges (multi-select)
    selectedChallenges.forEach(id => {
      const item = availableChallenges.find(x => norm(x.id) === norm(id));
      const label = item ? item.label : id;
      const chip = createChip(label, () => {
        selectedChallenges.delete(id);
        if (challengeFilter) challengeFilter.refresh();
        filterRows();
      });
      filterSelections.appendChild(chip);
    });

    // Restrictions (multi-select)
    selectedRestrictions.forEach(id => {
      const item = availableRestrictions.find(x => norm(x.id) === norm(id));
      const label = item ? item.label : id;
      const chip = createChip(label, () => {
        selectedRestrictions.delete(id);
        if (restrictionsFilter) restrictionsFilter.refresh();
        filterRows();
      });
      filterSelections.appendChild(chip);
    });

    // Glitch (single-select)
    if (selectedGlitch) {
      const chip = createChip(selectedGlitch.label, () => {
        selectedGlitch = null;
        if (glitchFilter) glitchFilter.refresh();
        filterRows();
      });
      filterSelections.appendChild(chip);
    }
  }

  // Legacy function name for compatibility
  function updateActiveFilters() {
    updateSelections();
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
      
      // Helper to find item by label or ID from available options
      function findItem(items, labelOrId) {
        const normalized = norm(labelOrId);
        return items.find(item => norm(item.label) === normalized || norm(item.id) === normalized);
      }
      
      if (filterData.challenges) {
        filterData.challenges.forEach(labelOrId => {
          const item = findItem(availableChallenges, labelOrId);
          if (item) selectedChallenges.add(norm(item.id));
        });
      }
      
      if (filterData.restrictions) {
        filterData.restrictions.forEach(labelOrId => {
          const item = findItem(availableRestrictions, labelOrId);
          if (item) selectedRestrictions.add(norm(item.id));
        });
      }
      
      // Character (single-select)
      if (filterData.character) {
        const charLabelOrId = Array.isArray(filterData.character) ? filterData.character[0] : filterData.character;
        if (charLabelOrId) {
          const item = findItem(availableCharacters, charLabelOrId);
          if (item) {
            selectedCharacter = { id: item.id, label: item.label };
          }
        }
      }
      
      // Glitch (single-select)
      if (filterData.glitch) {
        const glitchLabelOrId = Array.isArray(filterData.glitch) ? filterData.glitch[0] : filterData.glitch;
        if (glitchLabelOrId) {
          const item = findItem(availableGlitches, glitchLabelOrId);
          if (item) {
            selectedGlitch = { id: item.id, label: item.label };
          }
        }
      }
      
      // Open advanced filters if we have any
      if (selectedChallenges.size > 0 || selectedRestrictions.size > 0 || 
          selectedCharacter || selectedGlitch) {
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
      if (glitchFilter) glitchFilter.refresh();
      
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
