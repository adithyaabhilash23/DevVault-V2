/**
 * DevVault V2 — Timeline View
 * Chronological project history.
 */

// @ts-nocheck
const TimelineView = (() => {
  async function render() {
    const container = DOM.id('timeline-container');
    DOM.clear(container);

    try {
      const events = await API.getTimeline();
      if (!events || events.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">◆</div><h2 class="empty-state__title">No Timeline Events</h2><p class="empty-state__text">Refresh your vault to see project activity.</p></div>';
        return;
      }

      // Group by date
      const grouped = {};
      events.forEach(e => {
        const dateKey = Format.shortDate(e.date);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(e);
      });

      Object.entries(grouped).forEach(([date, items]) => {
        const dateHeader = DOM.create('div', {
          className: 'timeline__date-header',
          html: `<strong style="color:var(--text-primary);font-size:var(--font-md);">${date}</strong>`,
        });
        dateHeader.style.cssText = 'margin:var(--space-6) 0 var(--space-3) 0;';
        container.appendChild(dateHeader);

        items.forEach(event => {
          const item = DOM.create('div', { className: 'timeline__item' });
          const typeIcon = event.type === 'discovered' ? '🔍' : '✏️';
          item.innerHTML = `
            <div class="timeline__body">
              <div class="timeline__title">${typeIcon} ${event.projectName}</div>
              <div class="timeline__desc">${event.description}</div>
            </div>
          `;
          container.appendChild(item);
        });
      });
    } catch (err) {
      container.innerHTML = `<p style="color:var(--color-danger)">Error loading timeline: ${err.message}</p>`;
    }
  }

  return { render };
})();
