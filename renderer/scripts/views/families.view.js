/**
 * DevVault V2 — Families View
 * Grouped version family explorer.
 */

// @ts-nocheck
const FamiliesView = (() => {
  async function render() {
    const container = DOM.id('families-container');
    DOM.clear(container);

    try {
      const families = await API.getFamilies();
      if (!families || families.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">◆</div><h2 class="empty-state__title">No Version Families</h2><p class="empty-state__text">Version families are detected when multiple projects share a base name (e.g., "Weather Dashboard" and "Weather Dashboard 2.0").</p></div>';
        return;
      }

      families.forEach(family => {
        const group = DOM.create('div', { className: 'family-group' });
        group.innerHTML = `
          <div class="family-group__header">
            <span class="family-group__name">${family.baseName}</span>
            <span class="family-group__count">${family.memberCount} versions</span>
            ${family.latestVersion ? `<span class="badge">Latest: v${family.latestVersion}</span>` : ''}
          </div>
          <div class="family-group__grid"></div>
        `;
        const grid = group.querySelector('.family-group__grid');
        family.members.forEach(p => grid.appendChild(ProjectCard.render(p)));
        container.appendChild(group);
      });
    } catch (err) {
      container.innerHTML = `<p style="color:var(--color-danger)">Error: ${err.message}</p>`;
    }
  }

  return { render };
})();
