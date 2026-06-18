/**
 * DevVault V2 — Project Workspace View
 *
 * Full-page 3-column layout opened when a project card is clicked.
 * Replaces the drawer slide-in interaction.
 *
 * Column 1 — Folder tree (static, Phase 1)
 * Column 2 — File list  (static, Phase 1)
 * Column 3 — Project detail panel (reuses all drawer logic)
 */

// @ts-nocheck
const Workspace = (() => {
  let currentProject = null;

  // ─── Static placeholder data (Phase 1) ─────────────────────────────────────

  const TREE_DATA = [
    {
      name: 'main', open: true,
      children: [
        { name: 'models',   open: false, children: [] },
        { name: 'services', open: false, children: [] },
        { name: 'utils',    open: false, children: [] },
      ],
    },
    {
      name: 'renderer', open: true,
      children: [
        {
          name: 'assets', open: true,
          children: [
            { name: 'icons', open: false, children: [] },
          ],
        },
        { name: 'scripts', open: false, children: [] },
        { name: 'styles',  open: false, children: [] },
      ],
    },
    { name: 'dist',    open: false, children: [] },
    { name: 'release', open: false, children: [] },
  ];

  const FILES_DATA = [
    { name: 'package.json',          size: '1.2 KB',  mod: '2 hours ago',   active: true },
    { name: 'tsconfig.json',         size: '0.4 KB',  mod: '3 days ago',    active: false },
    { name: 'electron-builder.json', size: '0.3 KB',  mod: '3 days ago',    active: false },
    { name: 'README.md',             size: '2.1 KB',  mod: '1 week ago',    active: false },
    { name: 'project-info.json',     size: '0.6 KB',  mod: '1 hour ago',    active: false },
  ];

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  function renderTreeNode(node, depth = 0) {
    const indent = depth * 16;
    const hasChildren = node.children && node.children.length > 0;
    const icon = !hasChildren
      ? '▶'
      : node.open ? '▼' : '▶';

    let html = `
      <div class="ws-tree__node" style="padding-left:${indent + 8}px;">
        <span class="ws-tree__arrow" style="opacity:${hasChildren ? 1 : 0.3};">${icon}</span>
        <svg class="ws-tree__icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3A1.5 1.5 0 003 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/>
        </svg>
        <span class="ws-tree__label">${node.name}</span>
      </div>`;

    if (node.open && node.children) {
      html += node.children.map(child => renderTreeNode(child, depth + 1)).join('');
    }
    return html;
  }

  function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const colors = { json: '#f0c674', ts: '#4e94d0', js: '#f7df1e', md: '#a0c0a0', txt: '#999' };
    const color = colors[ext] || '#888';
    return `<span class="ws-file__icon" style="color:${color};">●</span>`;
  }

  // ─── Detail Panel (Column 3) — mirrors drawer.js renderDetail ──────────────

  function renderDetailPanel(p) {
    const aiOptions = ['Gemini', 'ChatGPT', 'Claude', 'Cursor', 'Codex', 'Manual'];
    const aiCheckboxes = aiOptions.map(ai =>
      `<label class="ws-detail__ai-label">
        <input type="checkbox" value="${ai}" ${(p.aiUsed || []).includes(ai) ? 'checked' : ''} class="ws-ai-checkbox"> ${ai}
      </label>`
    ).join('');

    const ratingStars = [1, 2, 3, 4, 5].map(n =>
      `<span class="ws-rating-star" data-rating="${n}" style="cursor:pointer;font-size:1.3rem;color:${n <= (p.rating || 0) ? 'hsl(45,95%,55%)' : 'var(--text-tertiary)'}">${n <= (p.rating || 0) ? '★' : '☆'}</span>`
    ).join('');

    return `
      <!-- Screenshot -->
      ${p.screenshotPath ? `<img src="file://${p.screenshotPath}" class="ws-detail__screenshot" alt="Preview">` : ''}

      <!-- Location -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Location</div>
        <p class="ws-detail__path">${p.absolutePath}</p>
        <div class="ws-detail__actions">
          <button class="btn btn--sm btn--secondary" id="ws-open-folder">${Icons.folder} Open Folder</button>
          <button class="btn btn--sm btn--secondary" id="ws-open-terminal">${Icons.terminal} Terminal</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Stats</div>
        <div class="ws-detail__stats-grid">
          <span>Files: <strong>${Format.number(p.fileCount)}</strong></span>
          <span>Size: <strong>${Format.bytes(p.totalSizeBytes)}</strong></span>
          <span>Modified: <strong>${Format.relativeTime(p.lastModified)}</strong></span>
          <span>Found: <strong>${Format.shortDate(p.firstDiscovered)}</strong></span>
        </div>
      </div>

      <!-- Tech Stack -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Tech Stack</div>
        <div class="ws-detail__badges">
          ${(p.techStack || []).map(t => `<span class="badge badge--tech">${t}</span>`).join('') || '<span class="ws-detail__empty">None detected</span>'}
        </div>
      </div>

      <!-- Git -->
      ${p.hasGit && p.gitInfo ? `
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Git</div>
        <div class="ws-detail__git">
          <span>Branch: <strong>${p.gitInfo.branch}</strong></span>
          ${p.gitInfo.hasRemote ? `<span>Remote: <strong>${p.gitInfo.remoteUrl || 'Yes'}</strong></span>` : ''}
          <span>Status: <strong style="color:${p.gitInfo.isDirty ? 'var(--color-warning)' : 'var(--color-success)'}">${p.gitInfo.isDirty ? 'Uncommitted changes' : 'Clean'}</strong></span>
        </div>
      </div>` : ''}

      <!-- Rating -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Rating</div>
        <div id="ws-rating">${ratingStars}</div>
      </div>

      <!-- AI Used -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">AI Used</div>
        <div class="ws-detail__ai-grid">${aiCheckboxes}</div>
      </div>

      <!-- Tags -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Tags</div>
        <div id="ws-tags-container"></div>
      </div>

      <!-- Notes -->
      <div class="ws-detail__section">
        <div class="ws-detail__section-title">Notes</div>
        <textarea class="input" id="ws-notes" rows="5" placeholder="Add notes about this project...">${p.notes || ''}</textarea>
      </div>

      <!-- Save / Cancel -->
      <div class="ws-detail__footer">
        <button class="btn btn--primary" id="ws-save-btn">Save Changes</button>
        <button class="btn btn--secondary" id="ws-cancel-btn">Cancel</button>
      </div>
    `;
  }

  // ─── Wire Detail Events ─────────────────────────────────────────────────────

  function wireDetailEvents(p) {
    DOM.id('ws-open-folder').addEventListener('click', () => API.openFolder(p.absolutePath));
    DOM.id('ws-open-terminal').addEventListener('click', () => API.openTerminal(p.absolutePath));

    // Rating stars
    DOM.qsa('.ws-rating-star').forEach(star => {
      star.addEventListener('click', () => {
        const r = parseInt(star.dataset.rating);
        DOM.qsa('.ws-rating-star').forEach((s, i) => {
          s.textContent = i < r ? '★' : '☆';
          s.style.color = i < r ? 'hsl(45,95%,55%)' : 'var(--text-tertiary)';
        });
      });
    });

    // Tag input
    TagInput.init('ws-tags-container', p.tags || []);

    // Save
    DOM.id('ws-save-btn').addEventListener('click', async () => {
      const aiUsed = DOM.qsa('.ws-ai-checkbox')
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      let rating = 0;
      DOM.qsa('.ws-rating-star').forEach((s, i) => { if (s.textContent === '★') rating = i + 1; });

      const meta = {
        aiUsed,
        notes: DOM.id('ws-notes').value,
        tags: TagInput.getTags(),
        isFavorite: p.isFavorite,
        rating,
        plannedPlatforms: p.plannedPlatforms || [],
        customStatus: p.customStatus || 'active',
      };

      try {
        await API.saveProjectMeta(p.id, meta);
        Toast.success('Project saved!');
        const projects = await API.getProjects();
        State.set({ projects });
      } catch (err) {
        Toast.error('Failed to save: ' + err.message);
      }
    });

    // Cancel
    DOM.id('ws-cancel-btn').addEventListener('click', close);
  }

  // ─── Open ───────────────────────────────────────────────────────────────────

  function open(project) {
    currentProject = project;
    State.set({ currentView: 'workspace', workspaceProject: project });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  function render() {
    const p = currentProject || State.get('workspaceProject');
    if (!p) return;
    currentProject = p;

    const container = DOM.id('workspace-container');
    if (!container) return;

    // Build tech badges inline string for header
    const techInline = (p.techStack || []).join(' • ') || 'No tech detected';

    container.innerHTML = `
      <!-- Header -->
      <div class="ws-header">
        <div class="ws-header__left">
          <div class="ws-breadcrumb">
            <button class="ws-breadcrumb__back" id="ws-back-btn">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="10 12 6 8 10 4"/></svg>
              Dashboard
            </button>
            <span class="ws-breadcrumb__sep">›</span>
            <span class="ws-breadcrumb__current">${p.folderName}</span>
          </div>
          <h1 class="ws-title">${p.folderName}</h1>
          <div class="ws-tech-inline">${techInline}</div>
          <div class="ws-path">${p.absolutePath}</div>
        </div>
        <div class="ws-header__badges">
          ${p.hasGit ? '<span class="badge badge--git">Git</span>' : ''}
          ${p.hasVercel ? '<span class="badge badge--vercel">Vercel</span>' : ''}
          ${p.isFavorite ? '<span style="color:hsl(45,95%,55%);font-size:1.2rem;">★</span>' : ''}
        </div>
      </div>

      <!-- 3-Column Body -->
      <div class="ws-body">

        <!-- Column 1: Folder Tree -->
        <aside class="ws-col ws-col--tree">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" style="color:var(--accent)"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>
            <span>Explorer</span>
          </div>
          <div class="ws-tree">
            ${TREE_DATA.map(n => renderTreeNode(n)).join('')}
          </div>
        </aside>

        <!-- Column 2: File List -->
        <aside class="ws-col ws-col--files">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" style="color:var(--accent)"><path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h8V6H9V2H4zm6 0v3h3L10 2z"/></svg>
            <span>Files</span>
          </div>
          <div class="ws-file-list">
            ${FILES_DATA.map(f => `
              <div class="ws-file-row${f.active ? ' ws-file-row--active' : ''}">
                ${fileIcon(f.name)}
                <span class="ws-file__name">${f.name}</span>
                <span class="ws-file__size">${f.size}</span>
                <span class="ws-file__mod">${f.mod}</span>
              </div>
            `).join('')}
          </div>
        </aside>

        <!-- Column 3: Detail Panel -->
        <section class="ws-col ws-col--detail">
          <div class="ws-panel-header ws-panel-header--detail">
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" style="color:var(--accent)"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4m0-6v.5"/></svg>
            <span>Project Info</span>
          </div>
          <div class="ws-detail" id="ws-detail-content">
            ${renderDetailPanel(p)}
          </div>
        </section>

      </div>
    `;

    // Wire back button
    DOM.id('ws-back-btn').addEventListener('click', close);

    // Wire detail panel events
    wireDetailEvents(p);
  }

  // ─── Close / Back ───────────────────────────────────────────────────────────

  function close() {
    State.set({ currentView: 'dashboard' });
  }

  return { open, close, render };
})();
