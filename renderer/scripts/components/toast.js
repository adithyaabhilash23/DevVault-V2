/**
 * DevVault V2 — Toast Component
 * Temporary notification messages.
 */

// @ts-nocheck
const Toast = (() => {
  const container = () => DOM.id('toast-container');

  function show(message, type = 'info', duration = 3000) {
    const toast = DOM.create('div', {
      className: `toast toast--${type}`,
      html: `<span class="toast__message">${message}</span>`,
    });

    // Add inline styles for the toast
    Object.assign(toast.style, {
      padding: 'var(--space-3) var(--space-5)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-primary)',
      fontSize: 'var(--font-sm)',
      boxShadow: 'var(--shadow-lg)',
      marginTop: 'var(--space-2)',
      maxWidth: '400px',
    });

    container().appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--leaving');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return {
    info: (msg) => show(msg, 'info'),
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    warning: (msg) => show(msg, 'warning'),
  };
})();
