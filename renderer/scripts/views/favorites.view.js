/**
 * DevVault V3.3A — Favorites View
 *
 * Renders only favorited projects using the identical ProjectCard
 * component already used by the Dashboard. No duplicate card logic.
 *
 * Data source: FavoritesService.getFavoriteProjects(State.get('projects'))
 * Auto-refreshes when State 'favorites' key fires (set by ProjectCard toggle).
 */

// @ts-nocheck
const FavoritesView = (() => {

  function render() {
    const grid = DOM.id('favorites-grid');
    if (!grid) return;

    DOM.clear(grid);

    const allProjects = State.get('projects') || [];
    const favProjects = FavoritesService.getFavoriteProjects(allProjects);

    if (favProjects.length === 0) {
      grid.innerHTML = `
        <div class="favorites-empty">
          <div class="favorites-empty__icon">☆</div>
          <p class="favorites-empty__text">No favorites yet.<br>Click the star on any project card.</p>
        </div>
      `;
      return;
    }

    // Same sort as dashboard: favorites first (all are), then by lastModified
    favProjects.sort((a, b) =>
      new Date(b.lastModified) - new Date(a.lastModified)
    );

    // Apply current density columns (same grid variable as dashboard)
    const cols = (typeof DashboardView !== 'undefined' && DashboardView.getCols)
      ? DashboardView.getCols()
      : 4;
    document.documentElement.style.setProperty('--grid-cols', String(cols));

    favProjects.forEach(p => {
      grid.appendChild(ProjectCard.render(p));
    });
  }

  return { render };
})();
