/**
 * DevVault V2 — Drawer Component
 * Slide-in panel for project detail view and editing.
 */

// @ts-nocheck
const Drawer = (() => {
  let currentProject = null;
  const overlay = () => DOM.id('drawer-overlay');
  const drawer = () => DOM.id('drawer');
  const content = () => DOM.id('drawer-content');

  function open(project) {
    currentProject = project;
    renderDetail(project);
    DOM.show(overlay());
    DOM.show(drawer());
    setTimeout(() => drawer().classList.add('drawer--open'), 10);
    overlay().addEventListener('click', close, { once: true });
  }

  function close() {
    drawer().classList.remove('drawer--open');
    drawer().classList.add('drawer--closing');
    setTimeout(() => {
      drawer().classList.remove('drawer--closing');
      DOM.hide(drawer());
      DOM.hide(overlay());
    }, 250);
  }

  function renderDetail(p) {
    const aiOptions = ['Gemini', 'ChatGPT', 'Claude', 'Cursor', 'Codex', 'Manual'];
    const aiCheckboxes = aiOptions.map(ai =>
      `<label style="display:flex;align-items:center;gap:6px;font-size:var(--font-sm);color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" value="${ai}" ${(p.aiUsed || []).includes(ai) ? 'checked' : ''} class="drawer-ai-checkbox"> ${ai}
      </label>`
    ).join('');

    const ratingStars = [1, 2, 3, 4, 5].map(n =>
      `<span class="drawer-rating-star" data-rating="${n}" style="cursor:pointer;font-size:1.2rem;color:${n <= (p.rating || 0) ? 'hsl(45,95%,55%)' : 'var(--text-tertiary)'}">${n <= (p.rating || 0) ? '★' : '☆'}</span>`
    ).join('');

    content().innerHTML = `
      <div class="drawer__header">
        <h2 class="drawer__title">${p.folderName}</h2>
        <button class="drawer__close" id="drawer-close-btn">${Icons.close}</button>
      </div>

      ${p.screenshotPath ? `<img src="file://${p.screenshotPath}" style="width:100%;border-radius:var(--radius-md);margin-bottom:var(--space-4);" alt="Preview">` : ''}

      <div class="drawer__section">
        <div class="drawer__section-title">Location</div>
        <p style="font-size:var(--font-sm);color:var(--text-secondary);word-break:break-all;">${p.absolutePath}</p>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
          <button class="btn btn--sm btn--secondary" id="drawer-open-folder">${Icons.folder} Open Folder</button>
          <button class="btn btn--sm btn--secondary" id="drawer-open-terminal">${Icons.terminal} Terminal</button>
        </div>
      </div>

      <div class="drawer__section">
        <div class="drawer__section-title">Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);font-size:var(--font-sm);color:var(--text-secondary);">
          <span>Files: <strong style="color:var(--text-primary)">${Format.number(p.fileCount)}</strong></span>
          <span>Size: <strong style="color:var(--text-primary)">${Format.bytes(p.totalSizeBytes)}</strong></span>
          <span>Modified: <strong style="color:var(--text-primary)">${Format.relativeTime(p.lastModified)}</strong></span>
          <span>Found: <strong style="color:var(--text-primary)">${Format.shortDate(p.firstDiscovered)}</strong></span>
        </div>
      </div>

      <div class="drawer__section">
        <div class="drawer__section-title">Tech Stack</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">
          ${(p.techStack || []).map(t => `<span class="badge badge--tech">${t}</span>`).join('') || '<span style="color:var(--text-tertiary);font-size:var(--font-sm)">None detected</span>'}
        </div>
      </div>

      ${p.hasGit && p.gitInfo ? `
      <div class="drawer__section">
        <div class="drawer__section-title">Git</div>
        <div style="font-size:var(--font-sm);color:var(--text-secondary);display:flex;flex-direction:column;gap:var(--space-1);">
          <span>Branch: <strong style="color:var(--text-primary)">${p.gitInfo.branch}</strong></span>
          ${p.gitInfo.hasRemote ? `<span>Remote: <strong style="color:var(--text-primary)">${p.gitInfo.remoteUrl || 'Yes'}</strong></span>` : ''}
          <span>Status: <strong style="color:${p.gitInfo.isDirty ? 'var(--color-warning)' : 'var(--color-success)'}">${p.gitInfo.isDirty ? 'Uncommitted changes' : 'Clean'}</strong></span>
        </div>
      </div>` : ''}

      <div class="drawer__section">
        <div class="drawer__section-title">Rating</div>
        <div id="drawer-rating">${ratingStars}</div>
      </div>

      <div class="drawer__section">
        <div class="drawer__section-title">AI Used</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">${aiCheckboxes}</div>
      </div>

      <div class="drawer__section">
        <div class="drawer__section-title">Tags</div>
        <div id="drawer-tags-container"></div>
      </div>

      <div class="drawer__section">
        <div class="drawer__section-title">Notes</div>
        <textarea class="input" id="drawer-notes" rows="4" placeholder="Add notes about this project...">${p.notes || ''}</textarea>
      </div>

      <div class="drawer__actions">
        <button class="btn btn--primary" id="drawer-save-btn">Save Changes</button>
        <button class="btn btn--secondary" id="drawer-cancel-btn">Cancel</button>
      </div>
    `;

    // Wire up events
    DOM.id('drawer-close-btn').addEventListener('click', close);
    DOM.id('drawer-cancel-btn').addEventListener('click', close);
    DOM.id('drawer-open-folder').addEventListener('click', () => API.openFolder(p.absolutePath));
    DOM.id('drawer-open-terminal').addEventListener('click', () => API.openTerminal(p.absolutePath));

    // Rating stars
    DOM.qsa('.drawer-rating-star').forEach(star => {
      star.addEventListener('click', () => {
        const r = parseInt(star.dataset.rating);
        DOM.qsa('.drawer-rating-star').forEach((s, i) => {
          s.textContent = i < r ? '★' : '☆';
          s.style.color = i < r ? 'hsl(45,95%,55%)' : 'var(--text-tertiary)';
        });
      });
    });

    // Tag input
    TagInput.init('drawer-tags-container', p.tags || []);

    // Save
    DOM.id('drawer-save-btn').addEventListener('click', async () => {
      const aiUsed = DOM.qsa('.drawer-ai-checkbox')
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      const ratingStars = DOM.qsa('.drawer-rating-star');
      let rating = 0;
      ratingStars.forEach((s, i) => { if (s.textContent === '★') rating = i + 1; });

      const meta = {
        aiUsed,
        notes: DOM.id('drawer-notes').value,
        tags: TagInput.getTags(),
        isFavorite: p.isFavorite,
        rating,
        plannedPlatforms: p.plannedPlatforms || [],
        customStatus: p.customStatus || 'active',
      };

      try {
        await API.saveProjectMeta(p.id, meta);
        Toast.success('Project saved!');
        // Refresh projects in state
        const projects = await API.getProjects();
        State.set({ projects });
        close();
      } catch (err) {
        Toast.error('Failed to save: ' + err.message);
      }
    });
  }

  return { open, close };
})();
