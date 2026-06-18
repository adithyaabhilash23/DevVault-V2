/**
 * DevVault V2 — Settings View
 * Manage watched folders, preferences, export/import.
 */

// @ts-nocheck
const SettingsView = (() => {
  async function render() {
    const container = DOM.id('settings-container');
    DOM.clear(container);

    const config = await API.getConfig();

    container.innerHTML = `
      <div class="settings__section">
        <h2 class="settings__section-title">Watched Folders</h2>
        <div class="settings__folder-list" id="settings-folder-list"></div>
        <div class="settings__actions">
          <button class="btn btn--primary" id="btn-add-folder">${Icons.plus} Add Folder</button>
        </div>
      </div>

      <div class="settings__section">
        <h2 class="settings__section-title">Preferences</h2>
        <div class="input-group" style="max-width:300px;margin-bottom:var(--space-4);">
          <label class="input-group__label">Scan Depth</label>
          <select class="input" id="pref-scan-depth">
            ${[1,2,3,4,5].map(n => `<option value="${n}" ${config.preferences.scanDepth === n ? 'selected' : ''}>Level ${n}</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="max-width:300px;">
          <label class="input-group__label">Default View</label>
          <select class="input" id="pref-default-view">
            <option value="grid" ${config.preferences.defaultView === 'grid' ? 'selected' : ''}>Grid</option>
            <option value="list" ${config.preferences.defaultView === 'list' ? 'selected' : ''}>List</option>
          </select>
        </div>
      </div>

      <div class="settings__section">
        <h2 class="settings__section-title">Data Management</h2>
        <div class="settings__actions">
          <button class="btn btn--secondary" id="btn-export">${Icons.download} Export Backup</button>
          <button class="btn btn--secondary" id="btn-import">${Icons.upload} Import Backup</button>
        </div>
        ${config.lastScanTimestamp ? `<p style="margin-top:var(--space-3);font-size:var(--font-sm);color:var(--text-tertiary)">Last scan: ${Format.shortDate(config.lastScanTimestamp)}</p>` : ''}
      </div>
    `;

    renderFolderList(config.watchedFolders);
    wireEvents(config);
  }

  function renderFolderList(folders) {
    const list = DOM.id('settings-folder-list');
    if (!list) return;
    DOM.clear(list);

    if (folders.length === 0) {
      list.innerHTML = '<p style="color:var(--text-tertiary);font-size:var(--font-sm);padding:var(--space-3)">No folders added yet. Click "Add Folder" to start tracking projects.</p>';
      return;
    }

    folders.forEach(f => {
      const item = DOM.create('div', { className: 'settings__folder-item' });
      item.innerHTML = `
        <span class="settings__folder-path">${f.label ? `${f.label} — ` : ''}${f.path}</span>
        <span class="settings__folder-date">Added ${Format.shortDate(f.addedAt)}</span>
        <button class="btn btn--ghost btn--sm settings__folder-remove" data-path="${f.path}" title="Remove">${Icons.close}</button>
      `;
      item.querySelector('.settings__folder-remove').addEventListener('click', async () => {
        Modal.show({
          title: 'Remove Watched Folder?',
          message: `This will stop tracking projects in:<br><strong>${f.path}</strong><br><br>No files will be deleted.`,
          confirmText: 'Remove',
          danger: true,
          onConfirm: async () => {
            try {
              await API.removeWatchedFolder(f.path);
              Toast.success('Folder removed');
              render();
            } catch (err) {
              Toast.error(err.message);
            }
          },
        });
      });
      list.appendChild(item);
    });
  }

  function wireEvents(config) {
    DOM.id('btn-add-folder').addEventListener('click', async () => {
      const folderPath = await API.selectFolder();
      if (!folderPath) return;
      try {
        await API.addWatchedFolder(folderPath);
        Toast.success('Folder added!');
        render();
      } catch (err) {
        Toast.error(err.message);
      }
    });

    DOM.id('pref-scan-depth').addEventListener('change', (e) => {
      API.updatePreferences({ scanDepth: parseInt(e.target.value) });
    });

    DOM.id('pref-default-view').addEventListener('change', (e) => {
      API.updatePreferences({ defaultView: e.target.value });
    });

    DOM.id('btn-export').addEventListener('click', async () => {
      const path = await API.exportBackup();
      if (path) Toast.success('Backup exported!');
    });

    DOM.id('btn-import').addEventListener('click', async () => {
      const projects = await API.importBackup();
      if (projects) {
        State.set({ projects });
        Toast.success('Backup restored!');
      }
    });
  }

  return { render };
})();
