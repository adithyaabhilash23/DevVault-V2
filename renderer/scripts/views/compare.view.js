/**
 * DevVault V2 — Compare View
 * Side-by-side version family comparison table.
 */

// @ts-nocheck
const CompareView = (() => {
  async function render() {
    const container = DOM.id('compare-container');
    DOM.clear(container);

    try {
      const families = await API.getFamilies();
      if (!families || families.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">◆</div><h2 class="empty-state__title">No Families to Compare</h2><p class="empty-state__text">You need at least one version family to use the comparison view.</p></div>';
        return;
      }

      // Family selector
      const selector = DOM.create('div', { className: 'compare__selector' });
      families.forEach((f, i) => {
        const btn = DOM.create('button', {
          className: `btn btn--sm ${i === 0 ? 'btn--primary' : 'btn--secondary'}`,
          text: f.baseName,
          attrs: { 'data-family-index': String(i) },
        });
        btn.addEventListener('click', () => {
          DOM.qsa('.compare__selector .btn').forEach(b => {
            b.className = 'btn btn--sm btn--secondary';
          });
          btn.className = 'btn btn--sm btn--primary';
          renderTable(container, f);
        });
        selector.appendChild(btn);
      });

      container.appendChild(selector);
      renderTable(container, families[0]);
    } catch (err) {
      container.innerHTML = `<p style="color:var(--color-danger)">Error: ${err.message}</p>`;
    }
  }

  function renderTable(container, family) {
    let table = container.querySelector('.compare__table');
    if (table) table.remove();

    table = DOM.create('table', { className: 'compare__table' });
    table.innerHTML = `
      <thead>
        <tr>
          <th>Property</th>
          ${family.members.map(m => `<th>${m.folderName}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr><td>Tech Stack</td>${family.members.map(m => `<td>${(m.techStack||[]).join(', ') || '—'}</td>`).join('')}</tr>
        <tr><td>Files</td>${family.members.map(m => `<td>${Format.number(m.fileCount)}</td>`).join('')}</tr>
        <tr><td>Size</td>${family.members.map(m => `<td>${Format.bytes(m.totalSizeBytes)}</td>`).join('')}</tr>
        <tr><td>Last Modified</td>${family.members.map(m => `<td>${Format.relativeTime(m.lastModified)}</td>`).join('')}</tr>
        <tr><td>Git</td>${family.members.map(m => `<td>${m.hasGit ? '✓' : '—'}</td>`).join('')}</tr>
        <tr><td>Vercel</td>${family.members.map(m => `<td>${m.hasVercel ? '✓' : '—'}</td>`).join('')}</tr>
        <tr><td>AI Used</td>${family.members.map(m => `<td>${(m.aiUsed||[]).join(', ') || '—'}</td>`).join('')}</tr>
        <tr><td>Rating</td>${family.members.map(m => `<td>${'★'.repeat(m.rating||0)}${'☆'.repeat(5-(m.rating||0))}</td>`).join('')}</tr>
      </tbody>
    `;
    container.appendChild(table);
  }

  return { render };
})();
