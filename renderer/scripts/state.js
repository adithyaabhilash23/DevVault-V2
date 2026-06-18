/**
 * DevVault V2 — State Management
 * In-memory reactive state store for the renderer.
 * Views subscribe to state changes and re-render when data updates.
 */

// @ts-nocheck
const State = (() => {
  let _state = {
    projects: [],
    config: null,
    currentView: 'dashboard',
    searchQuery: '',
    filterTech: '',
    filterAI: '',
    filterActivity: '',
    isScanning: false,
  };

  const _listeners = new Map();

  return {
    /** Get current state or a specific key */
    get(key) {
      return key ? _state[key] : { ..._state };
    },

    /** Update state and notify listeners */
    set(updates) {
      const changedKeys = [];
      for (const [key, value] of Object.entries(updates)) {
        if (_state[key] !== value) {
          _state[key] = value;
          changedKeys.push(key);
        }
      }
      // Notify listeners for changed keys
      changedKeys.forEach(key => {
        const fns = _listeners.get(key) || [];
        fns.forEach(fn => fn(_state[key], _state));
      });
    },

    /** Subscribe to changes on a specific key */
    on(key, callback) {
      if (!_listeners.has(key)) _listeners.set(key, []);
      _listeners.get(key).push(callback);
    },

    /** Get filtered & sorted projects based on current filters */
    getFilteredProjects() {
      let projects = [..._state.projects];
      const q = _state.searchQuery.toLowerCase();

      if (q) {
        projects = projects.filter(p =>
          p.folderName.toLowerCase().includes(q) ||
          p.absolutePath.toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (p.notes || '').toLowerCase().includes(q)
        );
      }
      if (_state.filterTech) {
        projects = projects.filter(p => (p.techStack || []).includes(_state.filterTech));
      }
      if (_state.filterAI) {
        projects = projects.filter(p => (p.aiUsed || []).includes(_state.filterAI));
      }
      if (_state.filterActivity) {
        projects = projects.filter(p => p.activityCategory === _state.filterActivity);
      }
      return projects;
    },
  };
})();
