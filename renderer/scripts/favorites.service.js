/**
 * DevVault V3.3A — Favorites Service
 *
 * Manages the favorites set in localStorage.
 * Completely decoupled from any view — Dashboard, FavoritesView,
 * Timeline, Compare, Families can all call this.
 *
 * Storage key: 'devvault_favorites'
 * Storage value: JSON array of project IDs (string[])
 */

// @ts-nocheck
const FavoritesService = (() => {
  const STORAGE_KEY = 'devvault_favorites';

  // In-memory Set for O(1) lookup
  let _ids = new Set();

  // ── Persistence ─────────────────────────────────────────
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([..._ids]));
    } catch (e) {
      console.warn('[FavoritesService] Save failed:', e);
    }
  }

  /** Load favorites from localStorage. Call once at boot. */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) _ids = new Set(arr);
      }
    } catch (e) {
      console.warn('[FavoritesService] Load failed:', e);
      _ids = new Set();
    }
  }

  // ── Query ────────────────────────────────────────────────
  /** Returns true if the project ID is currently favorited. */
  function isFavorite(projectId) {
    return _ids.has(String(projectId));
  }

  /** Returns all projects from the given array whose IDs are favorited. */
  function getFavoriteProjects(allProjects) {
    return allProjects.filter(p => _ids.has(String(p.id)));
  }

  /** Returns the current count of favorited projects. */
  function count() {
    return _ids.size;
  }

  // ── Mutation ─────────────────────────────────────────────
  /**
   * Toggle favorite status.
   * Returns true if the project is now favorited, false if unfavorited.
   */
  function toggle(projectId) {
    const id = String(projectId);
    if (_ids.has(id)) {
      _ids.delete(id);
    } else {
      _ids.add(id);
    }
    _save();
    return _ids.has(id); // true = now favorite
  }

  return { load, isFavorite, getFavoriteProjects, count, toggle };
})();
