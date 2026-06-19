/**
 * DevVault V3.2 — App Boot Sequence
 * Initializes the application, wires up navigation, and subscribes to state.
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

  // ── Refresh Vault Button ─────────────────────────────────
  // V3.2: Spinner state. IPC/API completely unchanged.
  const REFRESH_IDLE_HTML = `
    <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
    Refresh Vault`;

  const REFRESH_BUSY_HTML = `
    <svg class="btn__icon btn__icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
    Refreshing…`;

  DOM.id('btn-refresh-vault').addEventListener('click', async () => {
    const btn = DOM.id('btn-refresh-vault');
    if (btn) { btn.innerHTML = REFRESH_BUSY_HTML; btn.disabled = true; }
    State.set({ isScanning: true });

    // Progress events consumed (IPC clean), not shown in UI
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
      if (btn) { btn.innerHTML = REFRESH_IDLE_HTML; btn.disabled = false; }
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
