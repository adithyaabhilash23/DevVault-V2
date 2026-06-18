/**
 * DevVault V2 — Tag Input Component
 * Chip-style tag entry with add/remove.
 */

// @ts-nocheck
const TagInput = (() => {
  let _tags = [];
  let _containerId = '';

  function init(containerId, initialTags = []) {
    _containerId = containerId;
    _tags = [...initialTags];
    render();
  }

  function render() {
    const container = DOM.id(_containerId);
    if (!container) return;
    container.innerHTML = '';

    // Existing tags
    _tags.forEach((tag, i) => {
      const chip = DOM.create('span', {
        className: 'tag',
        html: `${tag}<button class="tag__remove" data-index="${i}">×</button>`,
      });
      chip.querySelector('.tag__remove').addEventListener('click', () => {
        _tags.splice(i, 1);
        render();
      });
      container.appendChild(chip);
    });

    // Add input
    const input = DOM.create('input', {
      className: 'input',
      attrs: { type: 'text', placeholder: 'Add tag...', style: 'margin-top:var(--space-2);max-width:200px;' },
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        const val = input.value.trim();
        if (!_tags.includes(val)) {
          _tags.push(val);
          render();
        }
      }
    });
    container.appendChild(input);
  }

  function getTags() {
    return [..._tags];
  }

  return { init, getTags };
})();
