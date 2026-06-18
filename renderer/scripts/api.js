/**
 * DevVault V2 — API Bridge
 * All communication with the main process goes through this module.
 * Uses window.devvault (exposed by preload.ts via contextBridge).
 */

// @ts-nocheck
const API = {
  // Config
  getConfig: () => window.devvault.config.get(),
  addWatchedFolder: (path, label) => window.devvault.config.addFolder(path, label),
  removeWatchedFolder: (path) => window.devvault.config.removeFolder(path),
  updatePreferences: (prefs) => window.devvault.config.updatePrefs(prefs),

  // Vault
  refreshVault: () => window.devvault.vault.refresh(),
  getProjects: () => window.devvault.vault.getProjects(),
  getFamilies: () => window.devvault.vault.getFamilies(),
  getActivity: () => window.devvault.vault.getActivity(),
  getActivitySummary: () => window.devvault.vault.getActivitySummary(),
  getTimeline: () => window.devvault.vault.getTimeline(),
  onScanProgress: (cb) => window.devvault.vault.onScanProgress(cb),
  offScanProgress: () => window.devvault.vault.offScanProgress(),

  // Project
  saveProjectMeta: (id, meta) => window.devvault.project.saveMeta(id, meta),
  openFolder: (path) => window.devvault.project.openFolder(path),
  openTerminal: (path) => window.devvault.project.openTerminal(path),

  // Export
  exportBackup: () => window.devvault.backup.export(),
  importBackup: () => window.devvault.backup.restore(),

  // Dialogs
  selectFolder: () => window.devvault.dialog.selectFolder(),
};
