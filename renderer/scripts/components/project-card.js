/**
 * DevVault V2 — Project Card Component
 * Renders a single project as a card in the grid.
 */

// @ts-nocheck
const ProjectCard = (() => {
  function render(project) {
    const card = DOM.create('div', {
      className: `project-card${project.isFavorite ? ' project-card--favorite' : ''}`,
      attrs: { 'data-project-id': project.id },
    });

    // Screenshot
    let screenshotHTML = '';
    if (project.screenshotPath) {
      screenshotHTML = `<img class="project-card__screenshot" src="file://${project.screenshotPath}" alt="${project.folderName} preview" loading="lazy">`;
    }

    // Tech badges
    const techBadges = (project.techStack || [])
      .map(t => `<span class="badge badge--tech">${t}</span>`)
      .join('');

    // Activity badge class
    const activityClass = {
      'Updated Today': 'badge--activity-today',
      'Updated This Week': 'badge--activity-week',
      'Updated This Month': 'badge--activity-month',
      'Inactive > 30 Days': 'badge--activity-inactive',
    }[project.activityCategory] || '';

    // Git & Vercel badges
    const statusBadges = [
      project.hasGit ? '<span class="badge badge--git">Git</span>' : '',
      project.hasVercel ? '<span class="badge badge--vercel">Vercel</span>' : '',
    ].filter(Boolean).join('');

    card.innerHTML = `
      ${screenshotHTML}
      <div class="project-card__header">
        <span class="project-card__title">${project.folderName}</span>
        <span class="project-card__favorite ${project.isFavorite ? 'project-card__favorite--active' : ''}">${project.isFavorite ? '★' : '☆'}</span>
      </div>
      <div class="project-card__path">${project.absolutePath}</div>
      <div class="project-card__meta">
        ${techBadges}
        ${statusBadges}
        <span class="badge ${activityClass}">${project.activityCategory}</span>
      </div>
      <div class="project-card__stats">
        <span>${Format.number(project.fileCount)} files</span>
        <span>${Format.bytes(project.totalSizeBytes)}</span>
        <span>${Format.relativeTime(project.lastModified)}</span>
      </div>
    `;

    // Click opens full Workspace page
    card.addEventListener('click', () => Workspace.open(project));

    return card;
  }

  return { render };
})();
