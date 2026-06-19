/**
 * DevVault V3.1A — App Boot Sequence
 * Initializes the application, wires up navigation, and subscribes to state.
 * Scan-progress bar is now inside the sidebar footer.
 */

// @ts-nocheck
(async function boot() {
  'use strict';

  // ── View Map ──────────────────────────
  const VIEWS = {
    dashboard: { el: 'view-dashboard',  label: 'Dashboard',  render: () => DashboardView.render() },
    timeline:  { el: 'view-timeline',   label: 'Timeline',   render: () => TimelineView.render() },
    families:  { el: 'view-families',   label: 'Families',   render: () => FamiliesView.render() },
    compare:   { el: 'view-compare',    label: 'Compare',    render: () => CompareView.render() },
    settings:  { el: 'view-settings',   label: 'Settings',   render: () => SettingsView.render() },
    workspace: { el: 'view-workspace',  label: null,         render: () => Workspace.render() },
  };

  // ── Navigation ────────────────────────
  DOM.qsa('.sidebar__nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) State.set({ currentView: view });
    });
  });

  // ── State Subscriptions ───────────────
  State.on('currentView', (view) => {
    // Update nav active state
    DOM.qsa('.sidebar__nav-item').forEach(btn => {
      btn.classList.toggle('sidebar__nav-item--active', btn.dataset.view === view);
    });
    // Show/hide view containers
    Object.entries(VIEWS).forEach(([key, cfg]) => {
      const el = DOM.id(cfg.el);
      if (el) el.hidden = key !== view;
    });
    // Hide the top content header in workspace (workspace has its own header)
    const contentHeader = DOM.id('content-header');
    if (contentHeader) contentHeader.hidden = view === 'workspace';

    // Update the view title in content header
    const titleEl = DOM.id('content-view-title');
    if (titleEl) titleEl.textContent = VIEWS[view]?.label || '';

    // Show/hide density toggle (dashboard only)
    const densityToggle = DOM.id('density-toggle');
    if (densityToggle) densityToggle.hidden = view !== 'dashboard';

    // Render active view
    const v = VIEWS[view];
    if (v) v.render();
  });

  State.on('projects', () => {
    if (State.get('currentView') === 'dashboard') DashboardView.render();
  });

  // When a project is opened in the workspace, navigate and render
  State.on('workspaceProject', () => {
    const view = State.get('currentView');
    if (view === 'workspace') Workspace.render();
  });

  State.on('searchQuery', () => DashboardView.render());
  State.on('filterTech', () => DashboardView.render());
  State.on('filterAI', () => DashboardView.render());
  State.on('filterActivity', () => DashboardView.render());

  // ── Refresh Vault Button ────────────────────
  // Scan-progress UI removed (V3.1B). Scanner IPC unchanged.
  DOM.id('btn-refresh-vault').addEventListener('click', async () => {
    State.set({ isScanning: true });
    const btn = DOM.id('btn-refresh-vault');
    if (btn) btn.disabled = true;

    // Progress events still consumed (keeps IPC clean), just not shown in UI
    API.onScanProgress(() => {});

    try {
      const projects = await API.refreshVault();
      State.set({ projects, isScanning: false });
      Toast.success(`Found ${projects.length} projects`);
    } catch (err) {
      Toast.error('Scan failed: ' + err.message);
      State.set({ isScanning: false });
    } finally {
      API.offScanProgress();
      if (btn) btn.disabled = false;
    }
  });

  // ── Initialize ────────────────────────
  SearchBar.init();

  // Initialize density toggle
  DashboardView.initDensityToggle();

  // Load initial data
  try {
    const [config, projects] = await Promise.all([
      API.getConfig(),
      API.getProjects(),
    ]);
    State.set({ config, projects });
  } catch (err) {
    console.error('Boot error:', err);
  }

  // Render initial view
  DashboardView.render();

  // Toast container positioning
  const toastContainer = DOM.id('toast-container');
  Object.assign(toastContainer.style, {
    position: 'fixed',
    bottom: 'var(--space-6)',
    right: 'var(--space-6)',
    zIndex: '300',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  });
})();
