/**
 * DevVault V2 — Dashboard View
 * Main project grid/list with search, filter, sort.
 */

// @ts-nocheck
const DashboardView = (() => {
  function render() {
    const grid = DOM.id('project-grid');
    DOM.clear(grid);

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

  function updateStats(projects) {
    const statsEl = DOM.id('content-stats');
    if (!statsEl) return;

    const total = projects.length;
    const favorites = projects.filter(p => p.isFavorite).length;
    const withGit = projects.filter(p => p.hasGit).length;

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

  return { render };
})();
