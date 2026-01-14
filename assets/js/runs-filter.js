/**
 * Runs Filter & Sort JavaScript
 * 
 * Handles filtering, sorting, and search functionality for the runs table.
 * Used by _layouts/game-runs.html
 */

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const qInput = document.getElementById('q');
  const filterToggle = document.getElementById('filter-toggle');
  const advancedFilters = document.getElementById('advanced-filters');
  const activeFiltersDiv = document.getElementById('active-filters');
  const runsBody = document.getElementById('runs-body');
  const rows = runsBody ? Array.from(runsBody.querySelectorAll('.run-row')) : [];
  const totalRuns = rows.length;

  // Filter dropdowns
  const fChallenge = document.getElementById('f-challenge');
  const fRestrictions = document.getElementById('f-restrictions');
  const fGlitch = document.getElementById('f-glitch');
  const fCharacter = document.getElementById('f-character');
  const resetBtn = document.getElementById('reset-filters');

  // Results status
  const resultsText = document.getElementById('results-text');

  // Sort buttons
  const sortDateAsc = document.getElementById('th-sort-asc');
  const sortDateDesc = document.getElementById('th-sort-desc');
  const sortTimeAsc = document.getElementById('th-time-asc');
  const sortTimeDesc = document.getElementById('th-time-desc');

  // Track selected items (multi-select style)
  let selectedChallenges = [];
  let selectedRestrictions = [];
  let selectedCharacters = [];

  // Store original options for each dropdown
  const originalOptions = {
    challenge: fChallenge ? Array.from(fChallenge.options).map(o => ({ value: o.value, text: o.textContent })) : [],
    restrictions: fRestrictions ? Array.from(fRestrictions.options).map(o => ({ value: o.value, text: o.textContent })) : [],
    character: fCharacter ? Array.from(fCharacter.options).map(o => ({ value: o.value, text: o.textContent })) : []
  };

  // ============================================================
  // Populate Filters
  // ============================================================
  function populateFilters() {
    const challenges = new Set();
    const restrictions = new Set();
    const characters = new Set();

    rows.forEach(row => {
      const ch = row.dataset.challengeLabel;
      if (ch) challenges.add(ch);

      const res = row.dataset.restrictions;
      if (res) res.split('||').forEach(r => { if (r.trim()) restrictions.add(r.trim()); });

      const char = row.dataset.character;
      if (char) characters.add(char);
    });

    if (fChallenge) {
      [...challenges].sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        fChallenge.appendChild(opt);
      });
      originalOptions.challenge = Array.from(fChallenge.options).map(o => ({ value: o.value, text: o.textContent }));
    }

    if (fRestrictions) {
      [...restrictions].sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        fRestrictions.appendChild(opt);
      });
      originalOptions.restrictions = Array.from(fRestrictions.options).map(o => ({ value: o.value, text: o.textContent }));
    }

    if (fCharacter) {
      [...characters].sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        fCharacter.appendChild(opt);
      });
      originalOptions.character = Array.from(fCharacter.options).map(o => ({ value: o.value, text: o.textContent }));
    }

    updateResultsStatus();
  }

  // ============================================================
  // Dropdown Options Management
  // ============================================================
  function updateDropdownOptions(select, selectedItems, originalOpts) {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    originalOpts.forEach(opt => {
      if (opt.value === '' || !selectedItems.includes(opt.value)) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
      }
    });
    // Restore selection if still valid
    if (currentValue && !selectedItems.includes(currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
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
  // Multi-Select Handlers
  // ============================================================
  if (fChallenge) {
    fChallenge.addEventListener('change', function() {
      if (this.value && !selectedChallenges.includes(this.value)) {
        selectedChallenges.push(this.value);
        this.value = '';
        updateDropdownOptions(fChallenge, selectedChallenges, originalOptions.challenge);
        filterRows();
      }
    });
  }

  if (fRestrictions) {
    fRestrictions.addEventListener('change', function() {
      if (this.value && !selectedRestrictions.includes(this.value)) {
        selectedRestrictions.push(this.value);
        this.value = '';
        updateDropdownOptions(fRestrictions, selectedRestrictions, originalOptions.restrictions);
        filterRows();
      }
    });
  }

  if (fCharacter) {
    fCharacter.addEventListener('change', function() {
      if (this.value && !selectedCharacters.includes(this.value)) {
        selectedCharacters.push(this.value);
        this.value = '';
        updateDropdownOptions(fCharacter, selectedCharacters, originalOptions.character);
        filterRows();
      }
    });
  }

  // ============================================================
  // Reset All Filters
  // ============================================================
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (qInput) qInput.value = '';
      selectedChallenges = [];
      selectedRestrictions = [];
      selectedCharacters = [];
      if (fGlitch) fGlitch.value = '';
      updateDropdownOptions(fChallenge, selectedChallenges, originalOptions.challenge);
      updateDropdownOptions(fRestrictions, selectedRestrictions, originalOptions.restrictions);
      updateDropdownOptions(fCharacter, selectedCharacters, originalOptions.character);
      filterRows();
    });
  }

  // ============================================================
  // Filter Logic
  // ============================================================
  function filterRows() {
    const q = qInput ? qInput.value.toLowerCase().trim() : '';
    const glitch = fGlitch ? fGlitch.value : '';

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

      // Challenge filter (multi-select - any match)
      if (show && selectedChallenges.length > 0) {
        if (!selectedChallenges.includes(row.dataset.challengeLabel)) show = false;
      }

      // Restriction filter (multi-select - must have all selected)
      if (show && selectedRestrictions.length > 0) {
        const rowRes = (row.dataset.restrictions || '').split('||');
        const hasAll = selectedRestrictions.every(r => rowRes.includes(r));
        if (!hasAll) show = false;
      }

      // Character filter (multi-select - any match)
      if (show && selectedCharacters.length > 0) {
        if (!selectedCharacters.includes(row.dataset.character)) show = false;
      }

      // Glitch filter
      if (show && glitch && row.dataset.glitch !== glitch) show = false;

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
  // Active Filters Display
  // ============================================================
  function updateActiveFilters() {
    if (!activeFiltersDiv) return;
    const tags = [];

    // Challenge tags
    selectedChallenges.forEach(c => {
      tags.push({
        label: c,
        clear: () => {
          selectedChallenges = selectedChallenges.filter(x => x !== c);
          updateDropdownOptions(fChallenge, selectedChallenges, originalOptions.challenge);
          filterRows();
        }
      });
    });

    // Restriction tags
    selectedRestrictions.forEach(r => {
      tags.push({
        label: r,
        clear: () => {
          selectedRestrictions = selectedRestrictions.filter(x => x !== r);
          updateDropdownOptions(fRestrictions, selectedRestrictions, originalOptions.restrictions);
          filterRows();
        }
      });
    });

    // Character tags
    selectedCharacters.forEach(c => {
      tags.push({
        label: c,
        clear: () => {
          selectedCharacters = selectedCharacters.filter(x => x !== c);
          updateDropdownOptions(fCharacter, selectedCharacters, originalOptions.character);
          filterRows();
        }
      });
    });

    // Glitch tag
    if (fGlitch && fGlitch.value) {
      tags.push({
        label: fGlitch.options[fGlitch.selectedIndex].text,
        clear: () => { fGlitch.value = ''; filterRows(); }
      });
    }

    activeFiltersDiv.innerHTML = tags.map((t, i) => 
      `<span class="tag tag--removable" data-idx="${i}" role="button" tabindex="0" title="Click to remove">${t.label}</span>`
    ).join('');

    activeFiltersDiv.querySelectorAll('.tag--removable').forEach((tag, i) => {
      tag.addEventListener('click', () => tags[i].clear());
      tag.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tags[i].clear();
        }
      });
    });
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
  if (qInput) qInput.addEventListener('input', filterRows);
  if (fGlitch) fGlitch.addEventListener('change', filterRows);

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
      
      // Apply challenges
      if (filterData.challenges && filterData.challenges.length > 0) {
        filterData.challenges.forEach(label => {
          if (!selectedChallenges.includes(label)) {
            selectedChallenges.push(label);
          }
        });
        updateDropdownOptions(fChallenge, selectedChallenges, originalOptions.challenge);
      }
      
      // Apply restrictions
      if (filterData.restrictions && filterData.restrictions.length > 0) {
        filterData.restrictions.forEach(label => {
          if (!selectedRestrictions.includes(label)) {
            selectedRestrictions.push(label);
          }
        });
        updateDropdownOptions(fRestrictions, selectedRestrictions, originalOptions.restrictions);
      }
      
      // Apply glitch
      if (filterData.glitch && fGlitch) {
        fGlitch.value = filterData.glitch;
      }
      
      // Apply character
      if (filterData.character && filterData.character.length > 0) {
        filterData.character.forEach(label => {
          if (!selectedCharacters.includes(label)) {
            selectedCharacters.push(label);
          }
        });
        updateDropdownOptions(fCharacter, selectedCharacters, originalOptions.character);
      }
      
      // Open advanced filters if we have any
      if (selectedChallenges.length > 0 || selectedRestrictions.length > 0 || 
          selectedCharacters.length > 0 || (filterData.glitch && filterData.glitch !== '')) {
        if (advancedFilters && filterToggle) {
          advancedFilters.hidden = false;
          filterToggle.setAttribute('aria-expanded', 'true');
          filterToggle.classList.add('is-active');
        }
      }
      
      // Apply filters
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
  populateFilters();
  applyFiltersFromHash();
});
