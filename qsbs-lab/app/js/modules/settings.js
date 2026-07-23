// js/modules/settings.js — M17
import storage from '../core/storage.js';
import state from '../core/state.js';

export function renderSettings(container) {
  container.innerHTML = buildUI();
  bindEvents(container);
}

function buildUI() {
  return '<div class="page-header"><h1>Settings</h1></div>' +
    '<div class="settings-sections">' +
    '<div class="card"><h3>Data Management</h3>' +
    '<div class="form-actions">' +
    '<button class="btn btn-secondary" id="btn-export">Export All Data (JSON)</button> ' +
    '<button class="btn btn-danger" id="btn-clear">Clear All Local Data</button>' +
    '</div>' +
    '<div class="form-field" style="margin-top:16px;"><label>Import Data (JSON file)</label><input type="file" id="import-file" accept=".json"></div>' +
    '</div>' +
    '<div class="card"><h3>Theme</h3>' +
    '<div class="form-actions">' +
    '<button class="btn btn-secondary" id="btn-light">Light Theme</button> ' +
    '<button class="btn btn-secondary" id="btn-dark">Dark Theme</button>' +
    '</div></div>' +
    '<div class="card"><h3>About</h3>' +
    '<p>BrightPath QSBS &amp; Business Strategy Lab v1.0</p>' +
    '<p>For planning purposes only. Not legal or tax advice. Consult a qualified tax attorney.</p>' +
    '<p>All tax law constants as of June 2026. Verify current law before relying on any analysis.</p>' +
    '</div>' +
    '<div id="settings-message"></div>' +
    '</div>';
}

function msg(container, text, type) {
  const m = container.querySelector('#settings-message');
  if (m) { m.innerHTML = '<div class="alert alert-' + (type||'info') + '">' + text + '</div>'; setTimeout(function(){ m.innerHTML=''; }, 3000); }
}

function bindEvents(container) {
  container.querySelector('#btn-export').addEventListener('click', function() {
    storage.exportAll().then(function(data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'qsbs-lab-export.json'; a.click();
      URL.revokeObjectURL(url);
    });
  });

  container.querySelector('#btn-clear').addEventListener('click', function() {
    if (!confirm('This will delete all local data. This cannot be undone. Export first?')) return;
    storage.clearAll().then(function() { msg(container, 'All local data cleared.', 'warn'); state.emit('data:cleared', {}); });
  });

  const importFile = container.querySelector('#import-file');
  importFile.addEventListener('change', function() {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const json = JSON.parse(e.target.result);
        storage.importAll(json).then(function() { msg(container, 'Data imported successfully.', 'success'); });
      } catch(err) { msg(container, 'Invalid JSON file: ' + err.message, 'warn'); }
    };
    reader.readAsText(file);
  });

  container.querySelector('#btn-light').addEventListener('click', function() {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('qsbs-theme', 'light');
  });
  container.querySelector('#btn-dark').addEventListener('click', function() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('qsbs-theme', 'dark');
  });
}
