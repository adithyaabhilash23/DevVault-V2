/**
 * DevVault V3.3G — Project Card Component
 *
 * Zones:
 *   1. Header        (title + star)
 *   2. Tech Stack    (responsive badge count, +N clickable to expand)
 *   3. Infra         (Git + Vercel — ALWAYS present, green/gray state)
 *   4. Activity      (ALWAYS present, one activity badge)
 *   5. Footer        (icon + value [+ label in premium])
 *
 * Density modes (driven by DashboardView.getCols()):
 *   3 cols → "premium"  — 4 badges, 2-line title, labels shown
 *   4 cols → "medium"   — 3 badges, 2-line title, labels hidden
 *   5 cols → "compact"  — 2 badges, 1-line title, labels hidden
 *
 * Density class stamped on .project-card at render-time:
 *   .project-card--premium | .project-card--medium | .project-card--compact
 *
 * Expansion behaviour:
 *   - Only ONE card may be expanded at a time.
 *   - Clicking outside any card collapses the current expansion.
 *   - Clicking another card collapses the expansion before opening workspace.
 *
 * FIX v3.3E: `.badge--hidden { display:none !important }` replaces native
 *   `hidden` attr. `.badge { display:inline-flex }` overrides UA [hidden].
 */

// @ts-nocheck
const ProjectCard = (() => {

  // ── Density config ─────────────────────────────────────
  const DENSITY_MAP = {
    3: { maxVisible: 4, titleClamp: 2, showLabels: true,  cls: 'project-card--premium' },
    4: { maxVisible: 3, titleClamp: 2, showLabels: false, cls: 'project-card--medium'  },
    5: { maxVisible: 2, titleClamp: 1, showLabels: false, cls: 'project-card--compact' },
  };

  function _getDensity() {
    const cols = (typeof DashboardView !== 'undefined' && DashboardView.getCols)
      ? DashboardView.getCols()
      : 4; // fallback: medium
    return DENSITY_MAP[cols] || DENSITY_MAP[4];
  }

  // ── Module state ───────────────────────────────────────
  let _expandedTechZone = null;

  // Collapse whatever is currently expanded (idempotent)
  function _collapse() {
    if (!_expandedTechZone) return;

    _expandedTechZone.querySelectorAll('.badge--tech-hidden')
      .forEach(b => b.classList.add('badge--hidden'));

    const btn = _expandedTechZone.querySelector('.badge--tech-toggle');
    if (btn) btn.classList.remove('badge--hidden');

    _expandedTechZone.classList.remove('project-card__tech--expanded');

    _expandedTechZone = null;
  }

  // Global collapse when clicking anywhere outside a card
  document.addEventListener('click', _collapse);

  // ── Render ─────────────────────────────────────────────
  function render(project) {
    const density = _getDensity();

    const card = DOM.create('div', {
      className: [
        'project-card',
        density.cls,
        project.isFavorite ? 'project-card--favorite' : '',
      ].filter(Boolean).join(' '),
      attrs: { 'data-project-id': project.id },
    });

    // Optional screenshot above header
    let screenshotHTML = '';
    if (project.screenshotPath) {
      screenshotHTML = `<img class="project-card__screenshot" src="file://${project.screenshotPath}" alt="${project.folderName} preview" loading="lazy">`;
    }

    // ── Zone 2 — Tech (density-aware badge count) ───────
    const stack        = project.techStack || [];
    const visibleStack = stack.slice(0, density.maxVisible);
    const hiddenStack  = stack.slice(density.maxVisible);
    const overflowN    = hiddenStack.length;

    const visibleBadgeHTML = visibleStack
      .map(t => `<span class="badge badge--tech">${t}</span>`)
      .join('');

    // badge--hidden class (not hidden attr) — see file header for why
    const hiddenBadgeHTML = hiddenStack
      .map(t => `<span class="badge badge--tech badge--tech-hidden badge--hidden">${t}</span>`)
      .join('');

    const toggleBtnHTML = overflowN > 0
      ? `<button class="badge badge--tech-toggle" type="button">+${overflowN}</button>`
      : '';

    // ── Zone 3 — Infra (always rendered) ───────────────
    const gitClass    = project.hasGit    ? 'badge--infra-active' : 'badge--infra-inactive';
    const vercelClass = project.hasVercel ? 'badge--infra-active' : 'badge--infra-inactive';

    // ── Zone 4 — Activity (always rendered) ────────────
    const activityClass = {
      'Updated Today':      'badge--activity-today',
      'Updated This Week':  'badge--activity-week',
      'Updated This Month': 'badge--activity-month',
      'Inactive > 30 Days': 'badge--activity-inactive',
    }[project.activityCategory] || 'badge--activity-inactive';

    const activityLabel = project.activityCategory || 'No recent activity';

    // ── Zone 5 — Footer labels (density-aware) ──────────
    // Labels are rendered in DOM always; CSS hides them via .project-card--medium/compact
    const labelFilesHTML    = `<span class="project-card__footer-label">Files</span>`;
    const labelSizeHTML     = `<span class="project-card__footer-label">Size</span>`;
    const labelUpdatedHTML  = `<span class="project-card__footer-label">Updated</span>`;

    // ── Title clamp class (density-aware) ───────────────
    const titleClampClass = density.titleClamp === 1
      ? 'project-card__title--clamp1'
      : ''; // default is 2-line clamp from base CSS

    // ── Build card HTML ─────────────────────────────────
    card.innerHTML = `
      ${screenshotHTML}

      <!-- Zone 1: Header -->
      <div class="project-card__header">
        <span class="project-card__title ${titleClampClass}">${project.folderName}</span>
        <span class="project-card__favorite ${project.isFavorite ? 'project-card__favorite--active' : ''}">
          ${project.isFavorite ? '★' : '☆'}
        </span>
      </div>

      <!-- Zone 2: Tech Stack -->
      <div class="project-card__tech">
        ${visibleBadgeHTML}
        ${hiddenBadgeHTML}
        ${toggleBtnHTML}
      </div>

      <!-- Zone 3: Infra — Git + Vercel always present -->
      <div class="project-card__infra">
        <span class="badge ${gitClass}">Git</span>
        <span class="badge ${vercelClass}">Vercel</span>
      </div>

      <!-- Zone 4: Activity — always one badge -->
      <div class="project-card__activity">
        <span class="badge ${activityClass}">${activityLabel}</span>
      </div>

      <!-- Zone 5: Footer — labels hidden in medium/compact via CSS class on card -->
      <div class="project-card__footer">
        <div class="project-card__footer-item">
          <svg class="project-card__footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="project-card__footer-value">${Format.number(project.fileCount)}</span>
          ${labelFilesHTML}
        </div>
        <div class="project-card__footer-item">
          <svg class="project-card__footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          </svg>
          <span class="project-card__footer-value">${Format.bytes(project.totalSizeBytes)}</span>
          ${labelSizeHTML}
        </div>
        <div class="project-card__footer-item">
          <svg class="project-card__footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="project-card__footer-value">${Format.relativeTime(project.lastModified)}</span>
          ${labelUpdatedHTML}
        </div>
      </div>
    `;

    // ── Tech toggle interaction ─────────────────────────
    const techZone  = card.querySelector('.project-card__tech');
    const toggleBtn = card.querySelector('.badge--tech-toggle');

    if (toggleBtn && techZone) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card → Workspace.open()

        // Collapse any other card currently expanded
        if (_expandedTechZone && _expandedTechZone !== techZone) _collapse();

        // Reveal all overflow badges
        techZone.querySelectorAll('.badge--tech-hidden')
          .forEach(b => b.classList.remove('badge--hidden'));

        // Enable multi-row wrap for expanded state
        techZone.classList.add('project-card__tech--expanded');

        // Hide the +N button (all badges now visible)
        toggleBtn.classList.add('badge--hidden');

        _expandedTechZone = techZone;
      });
    }

    // ── Card click → open workspace ────────────────────
    card.addEventListener('click', () => {
      _collapse();
      Workspace.open(project);
    });

    return card;
  }

  return { render };
})();
