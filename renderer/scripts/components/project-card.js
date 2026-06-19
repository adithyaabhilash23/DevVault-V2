/**
 * DevVault V3.1A — Project Card Component
 * 4-zone card: Header | Tech | Status | Footer
 * No project path shown (paths visible in Workspace only).
 * All zones fixed-height for perfect grid alignment.
 */

// @ts-nocheck
const ProjectCard = (() => {
  function render(project) {
    const card = DOM.create('div', {
      className: `project-card${project.isFavorite ? ' project-card--favorite' : ''}`,
      attrs: { 'data-project-id': project.id },
    });

    // ── Screenshot (optional, above zones) ──
    let screenshotHTML = '';
    if (project.screenshotPath) {
      screenshotHTML = `<img class="project-card__screenshot" src="file://${project.screenshotPath}" alt="${project.folderName} preview" loading="lazy">`;
    }

    // ── Zone 2: Tech Stack ──
    const techBadges = (project.techStack || [])
      .map(t => `<span class="badge badge--tech">${t}</span>`)
      .join('') || '';

    // ── Zone 3: Status Badges ──
    const activityClass = {
      'Updated Today':    'badge--activity-today',
      'Updated This Week':  'badge--activity-week',
      'Updated This Month': 'badge--activity-month',
      'Inactive > 30 Days': 'badge--activity-inactive',
    }[project.activityCategory] || '';

    const statusBadges = [
      project.hasGit    ? '<span class="badge badge--git">Git</span>' : '',
      project.hasVercel ? '<span class="badge badge--vercel">Vercel</span>' : '',
      project.activityCategory
        ? `<span class="badge ${activityClass}">${project.activityCategory}</span>`
        : '',
    ].filter(Boolean).join('');

    card.innerHTML = `
      ${screenshotHTML}

      <!-- Zone 1: Header -->
      <div class="project-card__header">
        <span class="project-card__title">${project.folderName}</span>
        <span class="project-card__favorite ${project.isFavorite ? 'project-card__favorite--active' : ''}">${project.isFavorite ? '★' : '☆'}</span>
      </div>

      <!-- Zone 2: Tech Stack -->
      <div class="project-card__tech">
        ${techBadges}
      </div>

      <!-- Zone 3: Status Badges -->
      <div class="project-card__status">
        ${statusBadges}
      </div>

      <!-- Zone 4: Footer -->
      <div class="project-card__footer">
        <span>${Format.number(project.fileCount)} files</span>
        <span>${Format.bytes(project.totalSizeBytes)}</span>
        <span>${Format.relativeTime(project.lastModified)}</span>
      </div>
    `;

    // Click opens full Workspace page — unchanged
    card.addEventListener('click', () => Workspace.open(project));

    return card;
  }

  return { render };
})();
