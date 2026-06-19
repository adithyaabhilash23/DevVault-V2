/**
 * DevVault V3.1A — Dashboard View
 * Main project grid with grid-density toggle.
 * Stats now written to sidebar elements.
 */

// @ts-nocheck
const DashboardView = (() => {
  // ── Grid Density ────────────────────────────────────────
  const DENSITY_KEY = 'devvault_grid_cols';
  const DEFAULT_COLS = 4;

  function getSavedCols() {
    try {
      const v = parseInt(localStorage.getItem(DENSITY_KEY));
      return [3, 4, 5].includes(v) ? v : DEFAULT_COLS;
    } catch { return DEFAULT_COLS; }
  }

  function setCols(n, triggerRender = false) {
    try { localStorage.setItem(DENSITY_KEY, String(n)); } catch {}
    document.documentElement.style.setProperty('--grid-cols', String(n));
    // Update toggle button active state
    DOM.qsa('.density-toggle__btn').forEach(btn => {
      btn.classList.toggle('density-toggle__btn--active', parseInt(btn.dataset.cols) === n);
    });
    // Rebuild cards when user switches density.
    // Guard: boot passes false — projects not loaded yet.
    if (triggerRender) render();
  }

  function initDensityToggle() {
    const cols = getSavedCols();
    setCols(cols, false); // boot: CSS/toggle only, no render
    DOM.qsa('.density-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => setCols(parseInt(btn.dataset.cols), true));
    });
  }

  // ── Render ──────────────────────────────────────────────
  function render() {
    const grid = DOM.id('project-grid');
    DOM.clear(grid);

    // Apply persisted density
    const cols = getSavedCols();
    document.documentElement.style.setProperty('--grid-cols', String(cols));

    const projects = State.getFilteredProjects();

    if (projects.length === 0) {
      const tmpl = DOM.id('template-empty-state');
      if (tmpl) {
        const clone = tmpl.content.cloneNode(true);
        grid.appendChild(clone);
        const goBtn = DOM.id('btn-empty-goto-settings');
        if (goBtn) goBtn.addEventListener('click', () => {
          document.querySelector('[data-view="settings"]').click();
        });
      }
      updateStats([]);
      return;
    }

    // Sort: favorites first, then by lastModified desc
    projects.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      return new Date(b.lastModified) - new Date(a.lastModified);
    });

    projects.forEach(p => {
      grid.appendChild(ProjectCard.render(p));
    });

    updateStats(projects);
  }

  // ── Stats → Sidebar ─────────────────────────────────────
  function updateStats(projects) {
    const total     = projects.length;
    const favorites = projects.filter(p => p.isFavorite).length;
    const withGit   = projects.filter(p => p.hasGit).length;

    // Write to sidebar stat elements
    const elProjects  = DOM.id('stat-projects');
    const elFavorites = DOM.id('stat-favorites');
    const elGit       = DOM.id('stat-git');
    if (elProjects)  elProjects.textContent  = total;
    if (elFavorites) elFavorites.textContent = favorites;
    if (elGit)       elGit.textContent       = withGit;

    // Keep legacy content-stats hidden but populated (for external compat)
    const statsEl = DOM.id('content-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <span class="stat-card__value">${total}</span>
          <span class="stat-card__label">Projects</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">${favorites}</span>
          <span class="stat-card__label">Favorites</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">${withGit}</span>
          <span class="stat-card__label">Git Repos</span>
        </div>
      `;
    }
  }

  // Expose initDensityToggle so app.js can call it once at boot
  // Expose getCols so ProjectCard.render() can read density at render-time
  return { render, initDensityToggle, getCols: getSavedCols };
})();
