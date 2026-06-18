/**
 * DevVault V2 — App Boot Sequence
 * Initializes the application, wires up navigation, and subscribes to state.
 */

// @ts-nocheck
(async function boot() {
  'use strict';

  // ── View Map ──────────────────────────
  const VIEWS = {
    dashboard: { el: 'view-dashboard',  render: () => DashboardView.render() },
    timeline:  { el: 'view-timeline',   render: () => TimelineView.render() },
    families:  { el: 'view-families',   render: () => FamiliesView.render() },
    compare:   { el: 'view-compare',    render: () => CompareView.render() },
    settings:  { el: 'view-settings',   render: () => SettingsView.render() },
    workspace: { el: 'view-workspace',  render: () => Workspace.render() },
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
    // Hide the top search/filter header in workspace — workspace has its own header
    const contentHeader = DOM.id('content-header');
    const scanProgress  = DOM.id('scan-progress');
    if (contentHeader) contentHeader.hidden = view === 'workspace';
    if (scanProgress && view === 'workspace') scanProgress.hidden = true;
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

  // ── Refresh Vault Button ──────────────
  DOM.id('btn-refresh-vault').addEventListener('click', async () => {
    State.set({ isScanning: true });
    const progress = DOM.id('scan-progress');
    const progressFill = DOM.id('scan-progress-fill');
    const progressText = DOM.id('scan-progress-text');
    DOM.show(progress);

    // Listen for progress updates
    API.onScanProgress(({ current, total, folder }) => {
      const pct = Math.round((current / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `Scanning ${folder}... (${current}/${total})`;
    });

    try {
      const projects = await API.refreshVault();
      State.set({ projects, isScanning: false });
      Toast.success(`Found ${projects.length} projects`);
    } catch (err) {
      Toast.error('Scan failed: ' + err.message);
      State.set({ isScanning: false });
    } finally {
      API.offScanProgress();
      DOM.hide(progress);
      progressFill.style.width = '0%';
    }
  });

  // ── Initialize ────────────────────────
  SearchBar.init();

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
