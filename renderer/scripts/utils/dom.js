/**
 * DevVault V2 — DOM Utilities
 * Shortcuts for common DOM operations.
 */

// @ts-nocheck
const DOM = {
  /** Get element by ID */
  id(id) { return document.getElementById(id); },

  /** Query selector */
  qs(selector, parent = document) { return parent.querySelector(selector); },

  /** Query selector all */
  qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; },

  /** Create element with optional classes and attributes */
  create(tag, { className, id, text, html, attrs } = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (id) el.id = id;
    if (text) el.textContent = text;
    if (html) el.innerHTML = html;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  },

  /** Show element */
  show(el) { if (el) el.hidden = false; },

  /** Hide element */
  hide(el) { if (el) el.hidden = true; },

  /** Toggle hidden */
  toggle(el) { if (el) el.hidden = !el.hidden; },

  /** Clear all children */
  clear(el) { if (el) el.innerHTML = ''; },

  /** Delegate event listener */
  on(parent, event, selector, handler) {
    parent.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) handler(e, target);
    });
  },
};
