// @ts-nocheck
const Workspace = (() => {
  let currentProject = null;
  let selectedFolderPath = null;
  let selectedFilePath = null;
  let expandedFolders = new Set();
  
  // ── Panel width persistence ───────────────────────────────────────────────
  const WS_STORAGE_KEY = 'devvault_ws_panels';
  const MIN_W = { tree: 180, files: 220, detail: 280 };

  function loadPanelWidths() {
    try {
      const saved = JSON.parse(localStorage.getItem(WS_STORAGE_KEY) || 'null');
      return saved || { tree: 220, files: 280 }; // detail fills remaining
    } catch { return { tree: 220, files: 280 }; }
  }

  function savePanelWidths(tree, files) {
    try { localStorage.setItem(WS_STORAGE_KEY, JSON.stringify({ tree, files })); } catch {}
  }

  function initResizablePanels() {
    const body  = DOM.id('ws-body');
    const colTree   = DOM.qs('.ws-col--tree',   body);
    const colFiles  = DOM.qs('.ws-col--files',  body);
    const colDetail = DOM.qs('.ws-col--detail', body);
    const divL  = DOM.id('ws-divider-l');
    const divR  = DOM.id('ws-divider-r');
    if (!body || !colTree || !colFiles || !colDetail || !divL || !divR) return;

    // Restore saved widths
    const saved = loadPanelWidths();
    colTree.style.width  = saved.tree  + 'px';
    colFiles.style.width = saved.files + 'px';

    function makeDragger(divider, getLeft, getRight, setWidths) {
      let startX, startL, startR;
      divider.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startL = getLeft();
        startR = getRight();
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMove(e) {
          const dx = e.clientX - startX;
          setWidths(startL + dx, startR - dx);
        }
        function onUp() {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          // Persist after drag
          savePanelWidths(
            parseInt(colTree.style.width),
            parseInt(colFiles.style.width)
          );
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    // Left divider: tree ↔ files
    makeDragger(
      divL,
      () => parseInt(colTree.style.width  || colTree.offsetWidth),
      () => parseInt(colFiles.style.width || colFiles.offsetWidth),
      (l, r) => {
        if (l < MIN_W.tree || r < MIN_W.files) return;
        colTree.style.width  = l + 'px';
        colFiles.style.width = r + 'px';
      }
    );

    // Right divider: files ↔ detail
    makeDragger(
      divR,
      () => parseInt(colFiles.style.width  || colFiles.offsetWidth),
      () => parseInt(colDetail.style.width || colDetail.offsetWidth),
      (l, r) => {
        if (l < MIN_W.files || r < MIN_W.detail) return;
        colFiles.style.width  = l + 'px';
        colDetail.style.width = r + 'px';
        savePanelWidths(
          parseInt(colTree.style.width),
          parseInt(colFiles.style.width)
        );
      }
    );
  }

  // ── File-Type Icon ─ Phase 3: VS Code-style SVG icons ────────────────────
  function fileTypeIcon(name, isDir) {
    if (isDir) return `<svg class="ws-tree__icon ws-tree__icon--folder" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>`;
    const ext = name.split('.').pop().toLowerCase();

    // SVG icon definitions: [color, svgPath]
    const icons = {
      ts:   ['#4e94d0', 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 5.5v1h2v4h1.5v-4H9v-1H4zm6.5 0c-.83 0-1.5.67-1.5 1.5v1c0 .28.22.5.5.5h1v.5c0 .28-.22.5-.5.5H9v1h.5c.83 0 1.5-.67 1.5-1.5v-1a.5.5 0 00-.5-.5h-1V9c0-.28.22-.5.5-.5h.5v-1h-.5z'],
      tsx:  ['#4e94d0', 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 5.5v1h2v4h1.5v-4H9v-1H4zm6.5 0c-.83 0-1.5.67-1.5 1.5v1c0 .28.22.5.5.5h1v.5c0 .28-.22.5-.5.5H9v1h.5c.83 0 1.5-.67 1.5-1.5v-1a.5.5 0 00-.5-.5h-1V9c0-.28.22-.5.5-.5h.5v-1h-.5z'],
      js:   ['#f0d04e', 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm4.5 5.5v4.25c0 .69-.56 1.25-1.25 1.25H5.5v-1.25H6A.25.25 0 006.25 12V7.5H7.5zM10 7.5c-.83 0-1.5.67-1.5 1.5v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V9c0-.83-.67-1.5-1.5-1.5zm0 1.25c.14 0 .25.11.25.25v1.5a.25.25 0 01-.5 0V9c0-.14.11-.25.25-.25z'],
      jsx:  ['#f0d04e', 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm4.5 5.5v4.25c0 .69-.56 1.25-1.25 1.25H5.5v-1.25H6A.25.25 0 006.25 12V7.5H7.5zM10 7.5c-.83 0-1.5.67-1.5 1.5v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V9c0-.83-.67-1.5-1.5-1.5zm0 1.25c.14 0 .25.11.25.25v1.5a.25.25 0 01-.5 0V9c0-.14.11-.25.25-.25z'],
      json: ['#f0c674', 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zM6.5 7a.5.5 0 00-.5.5v1a.5.5 0 00.5.5H7v.5a.5.5 0 001 0V9h.5a.5.5 0 000-1H8v-.5a.5.5 0 00-.5-.5h-1z'],
      md:   ['#a78bfa', 'M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm2 1v6h8V5H4zm1 1h2v1H5V6zm0 2h4v1H5V8zm0 2h3v1H5v-1z'],
      html: ['#e8714a', 'M3 2l1 10 4 2 4-2 1-10H3zm2.2 2h5.6l-.2 2H5.4l.1 1.5h4.8l-.4 3.8L8 12l-1.9-.7-.1-1.3h1.5l.1.6.4.1.4-.1.2-1.6H5.4L5.2 4z'],
      css:  ['#42a5f5', 'M3 2l1 10 4 2 4-2 1-10H3zm2.2 2h5.6l-.2 2H5.4l.1 1h4.6l-.4 4-1.7.5-1.7-.5-.1-1h1.5l.1.5h.2l.2-.1.1-1.4H5.6L5.2 4z'],
      scss: ['#f06292', 'M8 2a6 6 0 100 12A6 6 0 008 2zm-.3 3.2c.9 0 1.6.3 2 .7l-.7.8c-.3-.3-.7-.5-1.3-.5-.5 0-.8.2-.8.5 0 .9 2.8.5 2.8 2.3 0 1-.8 1.8-2.2 1.8-.9 0-1.8-.3-2.3-.9l.7-.8c.4.4.9.7 1.6.7.6 0 .9-.2.9-.6 0-.9-2.8-.5-2.8-2.3 0-1 .8-1.7 2.1-1.7z'],
      svg:  ['#ff9900', 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 2c.3 0 .5.1.7.3L11 6.5l.3.5-.3.5-2.3 2.2c-.4.4-1 .4-1.4 0L5 7.5l-.3-.5.3-.5 2.3-2.2c.2-.2.4-.3.7-.3z'],
      png:  ['#a78bfa', 'M4 3h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 1v5.5l2.5-2 2 2L11 7l1 1V4H4zm0 8h8v-1.5l-1-1-2.5 2.5-2-2L4 11.5V12z'],
      jpg:  ['#a78bfa', 'M4 3h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 1v5.5l2.5-2 2 2L11 7l1 1V4H4zm0 8h8v-1.5l-1-1-2.5 2.5-2-2L4 11.5V12z'],
      jpeg: ['#a78bfa', 'M4 3h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 1v5.5l2.5-2 2 2L11 7l1 1V4H4zm0 8h8v-1.5l-1-1-2.5 2.5-2-2L4 11.5V12z'],
      webp: ['#a78bfa', 'M4 3h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 1v5.5l2.5-2 2 2L11 7l1 1V4H4zm0 8h8v-1.5l-1-1-2.5 2.5-2-2L4 11.5V12z'],
      txt:  ['#9ca3af', 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v1h6V4H5zm0 2v1h6V6H5zm0 2v1h6V8H5zm0 2v1h4v-1H5z'],
      env:  ['#facc15', 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 3v1h2V5H5zm0 2v1h6V7H5zm0 2v1h4V9H5zm0 2v1h3v-1H5z'],
      yaml: ['#f97316', 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm3.5 3L6 7.5V12h1V8l1.5-3h-1zm1 0L10 7.5V12h-1V8L7.5 5h1z'],
      yml:  ['#f97316', 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm3.5 3L6 7.5V12h1V8l1.5-3h-1zm1 0L10 7.5V12h-1V8L7.5 5h1z'],
    };

    if (icons[ext]) {
      const [color, path] = icons[ext];
      return `<svg class="ws-file-icon" viewBox="0 0 16 16" width="15" height="15" fill="${color}"><path d="${path}"/></svg>`;
    }
    // Generic file icon for unknown types
    return `<svg class="ws-file-icon" viewBox="0 0 16 16" width="15" height="15" fill="#6b7280"><path d="M4 2h5.5L13 5.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm0 1v10h8V6H9V3H4zm6 0v2h2L10 3z"/></svg>`;
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
      ? `<span class="ws-tree__count">(${node.children.length})</span>` : '';
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
      panel.innerHTML = `<div class="ws-empty-dir">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <span>This folder is empty</span>
      </div>`;
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
    const name = filePath.split(/[\\/]/).pop();
    const imgs = ['png','jpg','jpeg','webp','svg','gif'];
    if (imgs.includes(ext)) {
      panel.innerHTML = `<div class="ws-preview ws-preview--image">
        <div class="ws-preview__label">${fileTypeIcon(name, false)} ${name} <span class="ws-preview__type-badge">${ext.toUpperCase()}</span></div>
        <img src="file://${filePath}" class="ws-preview__img" alt="preview">
      </div>`;
      return;
    }
    panel.innerHTML = '<div class="ws-loading">Loading preview…</div>';
    const content = await API.readFile(filePath);
    if (content === null) {
      panel.innerHTML = `<div class="ws-preview ws-preview--na">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <div style="font-weight:500;color:var(--text-secondary)">No preview available</div>
        <div class="ws-preview__sub">Binary or file too large</div>
      </div>`;
      return;
    }
    const codeExts = ['ts','tsx','js','jsx','html','css','scss','txt','env','sh','yaml','yml','toml','gitignore'];
    if (ext === 'md') {
      panel.innerHTML = `<div class="ws-preview ws-preview--md">
        <div class="ws-preview__label">${fileTypeIcon(name, false)} ${name} <span class="ws-preview__type-badge">Markdown</span></div>
        <div class="ws-md-body">${simpleMarkdown(content)}</div>
      </div>`;
    } else if (codeExts.includes(ext) || ext === 'json') {
      panel.innerHTML = `<div class="ws-preview ws-preview--code">
        <div class="ws-preview__label">${fileTypeIcon(name, false)} ${name} <span class="ws-preview__type-badge">${ext.toUpperCase()}</span></div>
        <pre class="ws-preview__code"><code>${syntaxHighlight(content, ext)}</code></pre>
      </div>`;
    } else {
      panel.innerHTML = `<div class="ws-preview ws-preview--na">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div style="font-weight:500;color:var(--text-secondary)">No preview available</div>
        <div class="ws-preview__sub">.${ext} files are not supported</div>
      </div>`;
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

    // Line 2: Tech badges as individual pills
    const techBadges = (p.techStack||[]).map(t => `<span class="ws-tech-badge">${t}</span>`).join('') || '<span class="ws-tech-badge" style="opacity:0.4">No tech detected</span>';

    // Line 1: Git status badge
    const gitStatus = p.hasGit && p.gitInfo
      ? `<span class="badge badge--git" style="font-size:var(--font-xs)">${Icons.git} ${p.gitInfo.branch}${p.gitInfo.isDirty ? ' •' : ''}</span>`
      : (p.hasGit ? '<span class="badge badge--git">Git</span>' : '');

    container.innerHTML = `
      <div class="ws-header">
        <div class="ws-header__left">
          <div class="ws-breadcrumb" id="ws-breadcrumb-row"></div>
          <div class="ws-header__title-row">
            <h1 class="ws-title">${p.folderName}</h1>
            <div class="ws-header__badges">
              ${gitStatus}
              ${p.hasVercel?'<span class="badge badge--vercel">Vercel</span>':''}
              ${p.isFavorite?'<span style="color:hsl(42,85%,55%);font-size:0.9rem;line-height:1">★</span>':''}
            </div>
          </div>
          <div class="ws-header__meta-row">
            ${techBadges}
          </div>
          <div class="ws-header__path-row">
            <span class="ws-path">${p.absolutePath}</span>
            <div class="ws-header__stats">
              <span>Modified <strong>${Format.relativeTime(p.lastModified)}</strong></span>
              <span>${Format.bytes(p.totalSizeBytes)}</span>
              <span>${Format.number(p.fileCount)} files</span>
            </div>
          </div>
        </div>
      </div>
      <div class="ws-body" id="ws-body">
        <aside class="ws-col ws-col--tree">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" style="color:var(--accent)"><path d="M1.5 3A1.5 1.5 0 013 4.5h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 7.5v5A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 011.5 3z"/></svg>
            <span>Explorer</span>
          </div>
          <div class="ws-tree" id="ws-tree"></div>
        </aside>
        <div class="ws-divider" id="ws-divider-l"></div>
        <aside class="ws-col ws-col--files">
          <div class="ws-panel-header">
            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" style="color:var(--accent)"><path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h8V6H9V2H4zm6 0v3h3L10 2z"/></svg>
            <span>Files</span>
          </div>
          <div class="ws-file-list" id="ws-file-list"><div class="ws-loading">Loading…</div></div>
        </aside>
        <div class="ws-divider" id="ws-divider-r"></div>
        <section class="ws-col ws-col--detail">
          <div class="ws-panel-header ws-panel-header--detail">
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style="color:var(--accent)"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="4.5" r="0.5" fill="currentColor"/></svg>
            <span id="ws-detail-label">Details</span>
          </div>
          <div class="ws-detail" id="ws-detail-content">
            ${renderDetailPanel(p)}
          </div>
        </section>
      </div>`;

    wireDetailEvents(p);
    updateBreadcrumb();
    initResizablePanels();
    renderTree(p.absolutePath).then(() => renderFileList(p.absolutePath));
  }

  function close() { State.set({ currentView:'dashboard' }); }

  return { open, close, render };
})();
