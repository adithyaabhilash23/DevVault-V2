/**
 * DevVault V2 — Modal Component
 * Confirmation dialogs.
 */

// @ts-nocheck
const Modal = (() => {
  const overlay = () => DOM.id('modal-overlay');
  const modal = () => DOM.id('modal');

  function show({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, danger = false }) {
    const m = modal();
    m.innerHTML = `
      <h3 class="modal__title">${title}</h3>
      <p class="modal__text">${message}</p>
      <div class="modal__actions">
        <button class="btn btn--secondary" id="modal-cancel">${cancelText}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" id="modal-confirm">${confirmText}</button>
      </div>
    `;

    DOM.show(overlay());

    DOM.id('modal-cancel').addEventListener('click', hide);
    DOM.id('modal-confirm').addEventListener('click', () => {
      if (onConfirm) onConfirm();
      hide();
    });
  }

  function hide() {
    DOM.hide(overlay());
  }

  return { show, hide };
})();
