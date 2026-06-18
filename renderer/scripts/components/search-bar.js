/**
 * DevVault V2 — Search Bar Component
 * Wires up search input and filter dropdowns to state.
 */

// @ts-nocheck
const SearchBar = (() => {
  function init() {
    const input = DOM.id('search-input');
    const filterTech = DOM.id('filter-tech');
    const filterAI = DOM.id('filter-ai');
    const filterActivity = DOM.id('filter-activity');

    // Populate filter options
    populateTechFilter(filterTech);
    populateAIFilter(filterAI);
    populateActivityFilter(filterActivity);

    // Debounced search
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => State.set({ searchQuery: input.value }), 200);
    });

    filterTech.addEventListener('change', () => State.set({ filterTech: filterTech.value }));
    filterAI.addEventListener('change', () => State.set({ filterAI: filterAI.value }));
    filterActivity.addEventListener('change', () => State.set({ filterActivity: filterActivity.value }));
  }

  function populateTechFilter(select) {
    const techs = ['HTML/CSS/JS','React','Next.js','Node.js','Flutter','Python','Unity','Java','C#','Electron','Vite','TypeScript'];
    techs.forEach(t => {
      const opt = DOM.create('option', { text: t, attrs: { value: t } });
      select.appendChild(opt);
    });
  }

  function populateAIFilter(select) {
    const ais = ['Gemini','ChatGPT','Claude','Cursor','Codex','Manual'];
    ais.forEach(a => {
      const opt = DOM.create('option', { text: a, attrs: { value: a } });
      select.appendChild(opt);
    });
  }

  function populateActivityFilter(select) {
    const acts = ['Updated Today','Updated This Week','Updated This Month','Inactive > 30 Days'];
    acts.forEach(a => {
      const opt = DOM.create('option', { text: a, attrs: { value: a } });
      select.appendChild(opt);
    });
  }

  return { init };
})();
