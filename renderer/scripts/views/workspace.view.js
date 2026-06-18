// @ts-nocheck
const Workspace = (() => {
  let currentProject = null;
  let selectedFolderPath = null;
  let selectedFilePath = null;
  let expandedFolders = new Set();

  // ── File-Type Icon ────────────────────────────────────────────────────────
  function fileTypeIcon(name, isDir) {
    if (isDir) return `<svg class="ws-tree__icon ws-tree__icon--folder" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>`;
    const ext = name.split('.').pop().toLowerCase();
    const map = {
      ts:   ['#4e94d0','TS'],  tsx: ['#4e94d0','TSX'], js: ['#f7df1e','JS'],
      jsx:  ['#f7df1e','JSX'], json:['#f0c674','{}'],  md: ['#78bf8a','MD'],
      html: ['#e34c26','HT'],  css: ['#264de4','CS'],  scss:['#c6538c','SC'],
      svg:  ['#ff9900','SV'],  png: ['#a78bfa','IMG'], jpg: ['#a78bfa','IMG'],
      jpeg: ['#a78bfa','IMG'], webp:['#a78bfa','IMG'], gif: ['#a78bfa','IMG'],
      txt:  ['#9ca3af','TX'],  env: ['#facc15','EV'],  lock:['#6b7280','LK'],
      yaml: ['#f97316','YML'],yml: ['#f97316','YML'],  sh:  ['#a3e635','SH'],
    };
    const [color, label] = map[ext] || ['#6b7280', '··'];
    return `<span class="ws-file-type-badge" style="background:${color}18;color:${color};border-color:${color}44;">${label}</span>`;
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  function updateBreadcrumb() {
    const el = DOM.id('ws-breadcrumb-row');
    if (!el || !currentProject) return;
    const root = currentProject.absolutePath;
    const cur  = selectedFolderPath || root;
    const rel  = cur.startsWith(root) ? cur.slice(root.length) : '';
    const parts = rel.split(/[\\/]/).filter(Boolean);

    let crumbPath = root;
    let html = `<button class="ws-breadcrumb__back" id="ws-back-btn">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="10 12 6 8 10 4"/></svg>
      Dashboard</button>
      <span class="ws-breadcrumb__sep">›</span>
      <span class="ws-breadcrumb__crumb" data-path="${root}">${currentProject.folderName}</span>`;

    parts.forEach((part, i) => {
      crumbPath += '\\' + part;
      const isCur = i === parts.length - 1;
      html += `<span class="ws-breadcrumb__sep">›</span>
        <span class="ws-breadcrumb__crumb${isCur ? ' ws-breadcrumb__crumb--cur':''}\" data-path="${crumbPath}">${part}</span>`;
    });

    el.innerHTML = html;

    DOM.id('ws-back-btn').addEventListener('click', close);
    el.querySelectorAll('.ws-breadcrumb__crumb').forEach(c => {
      c.addEventListener('click', () => {
        const p = c.dataset.path;
        selectedFolderPath = p;
        selectedFilePath = null;
        redrawTree();
        renderFileList(p);
        refreshDetailColumn();
      });
    });
  }

  // ── Tree ──────────────────────────────────────────────────────────────────
  function renderTreeNode(node, depth = 0) {
    const isOpen     = expandedFolders.has(node.path);
    const isSelected = selectedFolderPath === node.path && !selectedFilePath;
    const count      = node.children && node.children.length > 0
      ? `<span class="ws-tree__count">${node.children.length}</span>` : '';
    let html = `
      <div class="ws-tree__node${isSelected ? ' ws-tree__node--active' : ''}"
           data-path="${node.path}" style="padding-left:${depth * 14 + 8}px;">
        <span class="ws-tree__arrow">${isOpen ? '▾' : '▸'}</span>
        ${fileTypeIcon(node.name, true)}
        <span class="ws-tree__label">${node.name}</span>${count}
      </div>`;
    if (isOpen && node.children && node.children.length > 0)
      html += node.children.map(c => renderTreeNode(c, depth + 1)).join('');
    return html;
  }

  function redrawTree() {
    const treeEl = DOM.id('ws-tree');
    if (treeEl && treeEl._rootNode)
      treeEl.innerHTML = renderTreeNode(treeEl._rootNode, 0);
  }

  async function buildTreeNode(dirPath, name) {
    let children = [];
    try {
      const entries = await API.readDir(dirPath);
      children = entries.filter(e => e.isDir).map(s => ({
        name: s.name, path: dirPath + '\\' + s.name, children: [],
      }));
    } catch (_) {}
    return { name, path: dirPath, children };
  }

  async function renderTree(rootPath) {
    const treeEl = DOM.id('ws-tree');
    if (!treeEl) return;
    treeEl.innerHTML = '<div class="ws-loading">Loading…</div>';
    const rootNode = await buildTreeNode(rootPath, currentProject.folderName);
    expandedFolders.add(rootPath);
    treeEl._rootNode = rootNode;
    treeEl.innerHTML = renderTreeNode(rootNode, 0);
    wireTreeEvents(treeEl, rootPath);
  }

  function wireTreeEvents(treeEl, rootPath) {
    treeEl.addEventListener('click', async (e) => {
      const node = e.target.closest('.ws-tree__node');
      if (!node) return;
      const dirPath = node.dataset.path;
      if (!dirPath) return;
      selectedFolderPath = dirPath;
      selectedFilePath = null;
      if (expandedFolders.has(dirPath)) expandedFolders.delete(dirPath);
      else { expandedFolders.add(dirPath); await lazyLoadChildren(treeEl._rootNode, dirPath); }
      treeEl.innerHTML = renderTreeNode(treeEl._rootNode, 0);
      renderFileList(dirPath);
      refreshDetailColumn();
    });
  }

  async function lazyLoadChildren(rootNode, targetPath) {
    const node = findNode(rootNode, targetPath);
    if (!node || node.children.length > 0) return;
    try {
      const entries = await API.readDir(targetPath);
      node.children = entries.filter(e => e.isDir).map(s => ({
        name: s.name, path: targetPath + '\\' + s.name, children: [],
      }));
    } catch (_) { node.children = []; }
  }

  function findNode(root, targetPath) {
    if (root.path === targetPath) return root;
    for (const c of (root.children || [])) {
      const f = findNode(c, targetPath);
      if (f) return f;
    }
    return null;
  }

  // ── File List ─────────────────────────────────────────────────────────────
  async function renderFileList(dirPath) {
    const panel = DOM.id('ws-file-list');
    if (!panel) return;
    panel.innerHTML = '<div class="ws-loading">Loading…</div>';
    let entries = [];
    try { entries = await API.readDir(dirPath); } catch (_) {}
    if (entries.length === 0) {
      panel.innerHTML = '<div class="ws-empty-dir">Empty folder</div>';
      return;
    }
    panel.innerHTML = entries.map((f) => `
      <div class="ws-file-row" data-path="${dirPath}\\${f.name}" data-is-dir="${f.isDir}">
        ${fileTypeIcon(f.name, f.isDir)}
        <span class="ws-file__name">${f.name}</span>
        <span class="ws-file__size">${f.isDir ? '—' : Format.bytes(f.size)}</span>
        <span class="ws-file__mod">${Format.relativeTime(f.lastModified)}</span>
      </div>`).join('');

    const treeEl = DOM.id('ws-tree');
    panel.querySelectorAll('.ws-file-row').forEach(row => {
      row.addEventListener('click', async () => {
        panel.querySelectorAll('.ws-file-row').forEach(r => r.classList.remove('ws-file-row--active'));
        row.classList.add('ws-file-row--active');
        if (row.dataset.isDir === 'true') {
          const fp = row.dataset.path;
          selectedFolderPath = fp;
          selectedFilePath = null;
          expandedFolders.add(fp);
          if (treeEl && treeEl._rootNode) {
            await lazyLoadChildren(treeEl._rootNode, fp);
            treeEl.innerHTML = renderTreeNode(treeEl._rootNode, 0);
          }
          renderFileList(fp);
        } else {
          selectedFilePath = row.dataset.path;
        }
        refreshDetailColumn();
      });
    });
  }

  // ── Preview System ────────────────────────────────────────────────────────
  function simpleMarkdown(raw) {
    // escape HTML first so user content is safe
    let t = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // code blocks (must come before inline code)
    t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, (_,c) => `<pre class="ws-md-pre"><code>${c.trimEnd()}</code></pre>`);
    t = t.replace(/`([^`]+)`/g, '<code class="ws-md-code">$1</code>');
    t = t.replace(/^#{3} (.+)$/gm, '<h3 class="ws-md-h">$1</h3>');
    t = t.replace(/^#{2} (.+)$/gm, '<h2 class="ws-md-h">$1</h2>');
    t = t.replace(/^# (.+)$/gm, '<h1 class="ws-md-h">$1</h1>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/^\- (.+)$/gm, '<li>$1</li>');
    t = t.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul class="ws-md-ul">$1</ul>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="ws-md-link">$1</a>');
    t = t.replace(/\n\n/g, '<br><br>');
    return t;
  }

  function syntaxHighlight(code, ext) {
    const e = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (['ts','tsx','js','jsx'].includes(ext)) {
      return e
        .replace(/(\/\/[^\n]*)/g,'<i class="ws-syn-c">$1</i>')
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,'<span class="ws-syn-s">$1</span>')
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|typeof|this|true|false|null|undefined)\b/g,'<b class="ws-syn-k">$1</b>')
        .replace(/\b(\d+)\b/g,'<span class="ws-syn-n">$1</span>');
    }
    if (ext === 'json') {
      return e
        .replace(/("(?:[^"\\]|\\.)*")\s*:/g,'<span class="ws-syn-k2">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g,': <span class="ws-syn-s">$1</span>')
        .replace(/\b(true|false|null)\b/g,'<b class="ws-syn-k">$1</b>')
        .replace(/\b(\d+\.?\d*)\b/g,'<span class="ws-syn-n">$1</span>');
    }
    if (ext === 'html') return e.replace(/(&lt;\/?[\w][^&]*&gt;)/g,'<span class="ws-syn-tag">$1</span>');
    if (['css','scss'].includes(ext))
      return e.replace(/(\/\*[\s\S]*?\*\/)/g,'<i class="ws-syn-c">$1</i>');
    return e;
  }

  async function renderFilePreview(filePath) {
    const panel = DOM.id('ws-detail-content');
    if (!panel) return;
    const ext  = filePath.split('.').pop().toLowerCase();
    const imgs = ['png','jpg','jpeg','webp','svg','gif'];
    if (imgs.includes(ext)) {
      panel.innerHTML = `<div class="ws-preview ws-preview--image">
        <div class="ws-preview__label">${ext.toUpperCase()} Preview</div>
        <img src="file://${filePath}" class="ws-preview__img" alt="preview">
      </div>`;
      return;
    }
    panel.innerHTML = '<div class="ws-loading">Loading preview…</div>';
    const content = await API.readFile(filePath);
    if (content === null) {
      panel.innerHTML = `<div class="ws-preview ws-preview--na"><span class="ws-preview__icon">◻</span><div>No preview available</div><div class="ws-preview__sub">Binary or file too large</div></div>`;
      return;
    }
    const name = filePath.split(/[\\/]/).pop();
    const codeExts = ['ts','tsx','js','jsx','html','css','scss','txt','env','sh','yaml','yml','toml','gitignore'];
    if (ext === 'md') {
      panel.innerHTML = `<div class="ws-preview ws-preview--md"><div class="ws-md-body">${simpleMarkdown(content)}</div></div>`;
    } else if (codeExts.includes(ext) || ext === 'json') {
      panel.innerHTML = `<div class="ws-preview ws-preview--code">
        <div class="ws-preview__label">${name}</div>
        <pre class="ws-preview__code"><code>${syntaxHighlight(content, ext)}</code></pre>
      </div>`;
    } else {
      panel.innerHTML = `<div class="ws-preview ws-preview--na"><span class="ws-preview__icon">◻</span><div>No preview available</div><div class="ws-preview__sub">.${ext} not supported</div></div>`;
    }
  }

  function refreshDetailColumn() {
    updateBreadcrumb();
    if (selectedFilePath) {
      renderFilePreview(selectedFilePath);
    } else {
      const panel = DOM.id('ws-detail-content');
      if (panel && currentProject) {
        panel.innerHTML = renderDetailPanel(currentProject);
        wireDetailEvents(currentProject);
      }
    }
  }

  // ── Detail Panel ──────────────────────────────────────────────────────────
  function renderDetailPanel(p) {
    const aiOptions = ['Gemini','ChatGPT','Claude','Cursor','Codex','Manual'];
    const aiCheckboxes = aiOptions.map(ai =>
      `<label class="ws-detail__ai-label"><input type="checkbox" value="${ai}" ${(p.aiUsed||[]).includes(ai)?'checked':''} class="ws-ai-checkbox"> ${ai}</label>`
    ).join('');
    const stars = [1,2,3,4,5].map(n =>
      `<span class="ws-rating-star" data-rating="${n}" style="cursor:pointer;font-size:1.3rem;color:${n<=(p.rating||0)?'hsl(45,95%,55%)':'var(--text-tertiary)'}">${n<=(p.rating||0)?'★':'☆'}</span>`
    ).join('');
    return `
      ${p.screenshotPath?`<img src="file://${p.screenshotPath}" class="ws-detail__screenshot" alt="Preview">`:''}
      <div class="ws-detail__section"><div class="ws-detail__section-title">Location</div>
        <p class="ws-detail__path">${p.absolutePath}</p>
        <div class="ws-detail__actions">
          <button class="btn btn--sm btn--secondary" id="ws-open-folder">${Icons.folder} Open Folder</button>
          <button class="btn btn--sm btn--secondary" id="ws-open-terminal">${Icons.terminal} Terminal</button>
        </div></div>
      <div class="ws-detail__section"><div class="ws-detail__section-title">Stats</div>
        <div class="ws-detail__stats-grid">
          <span>Files: <strong>${Format.number(p.fileCount)}</strong></span>
          <span>Size: <strong>${Format.bytes(p.totalSizeBytes)}</strong></span>
          <span>Modified: <strong>${Format.relativeTime(p.lastModified)}</strong></span>
          <span>Found: <strong>${Format.shortDate(p.firstDiscovered)}</strong></span>
        </div></div>
      <div class="ws-detail__section"><div class="ws-detail__section-title">Tech Stack</div>
        <div class="ws-detail__badges">
          ${(p.techStack||[]).map(t=>`<span class="badge badge--tech">${t}</span>`).join('')||'<span class="ws-detail__empty">None detected</span>'}
        </div></div>
      ${p.hasGit&&p.gitInfo?`<div class="ws-detail__section"><div class="ws-detail__section-title">Git</div>
        <div class="ws-detail__git">
          <span>Branch: <strong>${p.gitInfo.branch}</strong></span>
          ${p.gitInfo.hasRemote?`<span>Remote: <strong>${p.gitInfo.remoteUrl||'Yes'}</strong></span>`:''}
          <span>Status: <strong style="color:${p.gitInfo.isDirty?'var(--color-warning)':'var(--color-success)'}">${p.gitInfo.isDirty?'Uncommitted changes':'Clean'}</strong></span>
        </div></div>`:''}
      <div class="ws-detail__section"><div class="ws-detail__section-title">Rating</div>
        <div id="ws-rating">${stars}</div></div>
      <div class="ws-detail__section"><div class="ws-detail__section-title">AI Used</div>
        <div class="ws-detail__ai-grid">${aiCheckboxes}</div></div>
      <div class="ws-detail__section"><div class="ws-detail__section-title">Tags</div>
        <div id="ws-tags-container"></div></div>
      <div class="ws-detail__section"><div class="ws-detail__section-title">Notes</div>
        <textarea class="input" id="ws-notes" rows="5" placeholder="Add notes…">${p.notes||''}</textarea></div>
      <div class="ws-detail__footer">
        <button class="btn btn--primary" id="ws-save-btn">Save Changes</button>
        <button class="btn btn--secondary" id="ws-cancel-btn">Cancel</button>
      </div>`;
  }

  function wireDetailEvents(p) {
    DOM.id('ws-open-folder').addEventListener('click', () => API.openFolder(p.absolutePath));
    DOM.id('ws-open-terminal').addEventListener('click', () => API.openTerminal(p.absolutePath));
    DOM.qsa('.ws-rating-star').forEach(star => {
      star.addEventListener('click', () => {
        const r = parseInt(star.dataset.rating);
        DOM.qsa('.ws-rating-star').forEach((s,i) => {
          s.textContent = i < r ? '★' : '☆';
          s.style.color  = i < r ? 'hsl(45,95%,55%)' : 'var(--text-tertiary)';
        });
      });
    });
    TagInput.init('ws-tags-container', p.tags || []);
    DOM.id('ws-save-btn').addEventListener('click', async () => {
      const aiUsed = DOM.qsa('.ws-ai-checkbox').filter(c=>c.checked).map(c=>c.value);
      let rating = 0;
      DOM.qsa('.ws-rating-star').forEach((s,i) => { if(s.textContent==='★') rating=i+1; });
      const meta = { aiUsed, notes:DOM.id('ws-notes').value, tags:TagInput.getTags(),
        isFavorite:p.isFavorite, rating, plannedPlatforms:p.plannedPlatforms||[], customStatus:p.customStatus||'active' };
      try {
        await API.saveProjectMeta(p.id, meta);
        Toast.success('Project saved!');
        State.set({ projects: await API.getProjects() });
      } catch(err) { Toast.error('Failed to save: ' + err.message); }
    });
    DOM.id('ws-cancel-btn').addEventListener('click', close);
  }

  // ── Open / Render / Close ─────────────────────────────────────────────────
  function open(project) {
    currentProject = project;
    selectedFolderPath = project.absolutePath;
    selectedFilePath = null;
    expandedFolders = new Set([project.absolutePath]);
    State.set({ currentView:'workspace', workspaceProject:project });
  }

  function render() {
    const p = currentProject || State.get('workspaceProject');
    if (!p) return;
    currentProject = p;
    const container = DOM.id('workspace-container');
    if (!container) return;
    const techInline = (p.techStack||[]).join(' · ') || 'No tech detected';

    container.innerHTML = `
      <div class="ws-header">
        <div class="ws-header__left">
          <div class="ws-breadcrumb" id="ws-breadcrumb-row"></div>
          <div class="ws-header__title-row">
            <h1 class="ws-title">${p.folderName}</h1>
            <div class="ws-header__badges">
              ${p.hasGit?'<span class="badge badge--git">Git</span>':''}
              ${p.hasVercel?'<span class="badge badge--vercel">Vercel</span>':''}
              ${p.isFavorite?'<span style="color:hsl(45,95%,55%);font-size:1.1rem;">★</span>':''}
            </div>
          </div>
          <div class="ws-header__meta-row">
            <span class="ws-tech-inline">${techInline}</span>
            <span class="ws-path-sep">·</span>
            <span class="ws-path">${p.absolutePath}</span>
          </div>
        </div>
      </div>
      <div class="ws-body">
        <aside class="ws-col ws-col--tree">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>
            <span>Explorer</span>
          </div>
          <div class="ws-tree" id="ws-tree"></div>
        </aside>
        <aside class="ws-col ws-col--files">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h8V6H9V2H4zm6 0v3h3L10 2z"/></svg>
            <span>Files</span>
          </div>
          <div class="ws-file-list" id="ws-file-list"><div class="ws-loading">Loading…</div></div>
        </aside>
        <section class="ws-col ws-col--detail">
          <div class="ws-panel-header ws-panel-header--detail">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" style="color:var(--accent)"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4m0-6v.5"/></svg>
            <span id="ws-detail-label">Project Info</span>
          </div>
          <div class="ws-detail" id="ws-detail-content">
            ${renderDetailPanel(p)}
          </div>
        </section>
      </div>`;

    wireDetailEvents(p);
    updateBreadcrumb();
    renderTree(p.absolutePath).then(() => renderFileList(p.absolutePath));
  }

  function close() { State.set({ currentView:'dashboard' }); }

  return { open, close, render };
})();
