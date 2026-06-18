/**
 * DevVault V2.1B — Project Workspace View
 *
 * Full-page 3-column layout opened when a project card is clicked.
 *
 * Column 1 — Real folder tree (IPC-driven via fs:readDir)
 * Column 2 — Real file list for the selected folder
 * Column 3 — Project detail panel (preserved from V2.1A)
 */

// @ts-nocheck
const Workspace = (() => {
  let currentProject = null;
  let selectedFolderPath = null;        // currently highlighted folder in tree
  let expandedFolders = new Set();      // set of absolute paths that are open

  // ─── File-Type Icon Map ──────────────────────────────────────────────────────

  /**
   * Returns an inline SVG string coloured by file extension.
   * Folders always use the folder icon from Icons.
   */
  function fileTypeIcon(name, isDir) {
    if (isDir) {
      // Folder — amber tint
      return `<svg class="ws-tree__icon ws-tree__icon--folder" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>`;
    }
    const ext = name.split('.').pop().toLowerCase();
    const map = {
      ts:   { color: '#4e94d0', label: 'TS' },
      tsx:  { color: '#4e94d0', label: 'TSX' },
      js:   { color: '#f7df1e', label: 'JS' },
      jsx:  { color: '#f7df1e', label: 'JSX' },
      json: { color: '#f0c674', label: '{}' },
      md:   { color: '#78bf8a', label: 'MD' },
      html: { color: '#e34c26', label: 'HT' },
      css:  { color: '#264de4', label: 'CS' },
      scss: { color: '#c6538c', label: 'SC' },
      svg:  { color: '#ff9900', label: 'SV' },
      png:  { color: '#a78bfa', label: 'IM' },
      jpg:  { color: '#a78bfa', label: 'IM' },
      gif:  { color: '#a78bfa', label: 'IM' },
      txt:  { color: '#9ca3af', label: 'TX' },
      env:  { color: '#facc15', label: 'EV' },
      lock: { color: '#6b7280', label: 'LK' },
    };
    const info = map[ext] || { color: '#6b7280', label: '  ' };
    return `<span class="ws-file-type-badge" style="background:${info.color}18;color:${info.color};border-color:${info.color}44;">${info.label}</span>`;
  }

  // ─── Render Helpers — Tree ───────────────────────────────────────────────────

  function renderTreeNode(node, depth = 0) {
    const isOpen = expandedFolders.has(node.path);
    const isSelected = selectedFolderPath === node.path;
    const indent = depth * 14;

    let html = `
      <div class="ws-tree__node${isSelected ? ' ws-tree__node--active' : ''}"
           data-path="${node.path}"
           data-is-dir="true"
           style="padding-left:${indent + 8}px;">
        <span class="ws-tree__arrow">${isOpen ? '▾' : '▸'}</span>
        ${fileTypeIcon(node.name, true)}
        <span class="ws-tree__label">${node.name}</span>
      </div>`;

    if (isOpen && node.children && node.children.length > 0) {
      html += node.children.map(child => renderTreeNode(child, depth + 1)).join('');
    }
    return html;
  }

  // ─── Build tree from IPC data ────────────────────────────────────────────────

  async function buildTreeNode(dirPath, name) {
    let children = [];
    try {
      const entries = await API.readDir(dirPath);
      const subdirs = entries.filter(e => e.isDir);
      // Only load top-level children now; deeper levels load on expand
      children = subdirs.map(s => ({
        name: s.name,
        path: dirPath + '\\' + s.name,
        children: [],          // lazy — populated on expand
        lastModified: s.lastModified,
      }));
    } catch (_) { /* unreadable */ }
    return { name, path: dirPath, children };
  }

  // ─── Render Tree Panel ───────────────────────────────────────────────────────

  async function renderTree(rootPath) {
    const treeEl = DOM.id('ws-tree');
    if (!treeEl) return;
    treeEl.innerHTML = '<div class="ws-loading">Loading…</div>';

    const rootNode = await buildTreeNode(rootPath, currentProject.folderName);
    expandedFolders.add(rootPath);   // root always expanded

    // Store root node on the element for re-render
    treeEl._rootNode = rootNode;
    treeEl.innerHTML = renderTreeNode(rootNode, 0);
    wireTreeEvents(treeEl, rootPath);
  }

  // ─── Wire tree click events ──────────────────────────────────────────────────

  function wireTreeEvents(treeEl, rootPath) {
    treeEl.addEventListener('click', async (e) => {
      const node = e.target.closest('.ws-tree__node');
      if (!node) return;

      const dirPath = node.dataset.path;
      if (!dirPath) return;

      // Select this folder
      selectedFolderPath = dirPath;

      // Toggle expand/collapse
      if (expandedFolders.has(dirPath)) {
        expandedFolders.delete(dirPath);
      } else {
        expandedFolders.add(dirPath);
        // Lazy-load children if not yet fetched
        await lazyLoadChildren(treeEl._rootNode, dirPath, rootPath);
      }

      // Re-render tree
      treeEl.innerHTML = renderTreeNode(treeEl._rootNode, 0);
      wireTreeEvents(treeEl, rootPath);   // re-wire after innerHTML swap

      // Update file list panel
      renderFileList(dirPath);
    });
  }

  // ─── Lazy-load children for a node ──────────────────────────────────────────

  async function lazyLoadChildren(rootNode, targetPath, _rootPath) {
    const node = findNode(rootNode, targetPath);
    if (!node) return;
    if (node.children && node.children.length > 0) return; // already loaded

    try {
      const entries = await API.readDir(targetPath);
      node.children = entries
        .filter(e => e.isDir)
        .map(s => ({
          name: s.name,
          path: targetPath + '\\' + s.name,
          children: [],
          lastModified: s.lastModified,
        }));
    } catch (_) {
      node.children = [];
    }
  }

  // ─── Find a node by path ─────────────────────────────────────────────────────

  function findNode(root, targetPath) {
    if (root.path === targetPath) return root;
    for (const child of (root.children || [])) {
      const found = findNode(child, targetPath);
      if (found) return found;
    }
    return null;
  }

  // ─── Render File List Panel ──────────────────────────────────────────────────

  async function renderFileList(dirPath) {
    const panel = DOM.id('ws-file-list');
    if (!panel) return;
    panel.innerHTML = '<div class="ws-loading">Loading…</div>';

    let entries = [];
    try {
      entries = await API.readDir(dirPath);
    } catch (_) { /* empty */ }

    if (entries.length === 0) {
      panel.innerHTML = '<div class="ws-empty-dir">No files found</div>';
      return;
    }

    panel.innerHTML = entries.map((f, i) => `
      <div class="ws-file-row${i === 0 ? ' ws-file-row--active' : ''}" data-idx="${i}">
        ${f.isDir
          ? fileTypeIcon(f.name, true)
          : fileTypeIcon(f.name, false)}
        <span class="ws-file__name">${f.name}</span>
        <span class="ws-file__size">${f.isDir ? '—' : Format.bytes(f.size)}</span>
        <span class="ws-file__mod">${Format.relativeTime(f.lastModified)}</span>
      </div>
    `).join('');

    // Wire click selection on file rows
    panel.querySelectorAll('.ws-file-row').forEach(row => {
      row.addEventListener('click', () => {
        panel.querySelectorAll('.ws-file-row').forEach(r => r.classList.remove('ws-file-row--active'));
        row.classList.add('ws-file-row--active');
      });
    });
  }

  // ─── Detail Panel (Column 3) — exactly preserved from V2.1A ────────────────

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
    selectedFolderPath = project.absolutePath;
    expandedFolders = new Set([project.absolutePath]);
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
    const techInline = (p.techStack || []).join(' · ') || 'No tech detected';

    container.innerHTML = `
      <!-- Header — compact -->
      <div class="ws-header">
        <div class="ws-header__left">
          <div class="ws-breadcrumb">
            <button class="ws-breadcrumb__back" id="ws-back-btn">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="10 12 6 8 10 4"/></svg>
              Dashboard
            </button>
            <span class="ws-breadcrumb__sep">›</span>
            <span class="ws-breadcrumb__current">${p.folderName}</span>
          </div>
          <div class="ws-header__title-row">
            <h1 class="ws-title">${p.folderName}</h1>
            <div class="ws-header__badges">
              ${p.hasGit ? '<span class="badge badge--git">Git</span>' : ''}
              ${p.hasVercel ? '<span class="badge badge--vercel">Vercel</span>' : ''}
              ${p.isFavorite ? '<span style="color:hsl(45,95%,55%);font-size:1.1rem;line-height:1;">★</span>' : ''}
            </div>
          </div>
          <div class="ws-header__meta-row">
            <span class="ws-tech-inline">${techInline}</span>
            <span class="ws-path-sep">·</span>
            <span class="ws-path">${p.absolutePath}</span>
          </div>
        </div>
      </div>

      <!-- 3-Column Body -->
      <div class="ws-body">

        <!-- Column 1: Folder Tree -->
        <aside class="ws-col ws-col--tree">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>
            <span>Explorer</span>
          </div>
          <div class="ws-tree" id="ws-tree"></div>
        </aside>

        <!-- Column 2: File List -->
        <aside class="ws-col ws-col--files">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h8V6H9V2H4zm6 0v3h3L10 2z"/></svg>
            <span>Files</span>
          </div>
          <div class="ws-file-list" id="ws-file-list">
            <div class="ws-loading">Loading…</div>
          </div>
        </aside>

        <!-- Column 3: Detail Panel -->
        <section class="ws-col ws-col--detail">
          <div class="ws-panel-header ws-panel-header--detail">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4m0-6v.5"/></svg>
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

    // Load real explorer (async — runs after render completes)
    renderTree(p.absolutePath).then(() => {
      renderFileList(p.absolutePath);
    });
  }

  // ─── Close / Back ───────────────────────────────────────────────────────────

  function close() {
    State.set({ currentView: 'dashboard' });
  }

  return { open, close, render };
})();
