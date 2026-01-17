import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import path from 'path';
import fs from 'fs';

const router: RouterType = Router();

// Serve admin UI HTML
router.get('/', (req: Request, res: Response) => {
  const adminHtmlPath = path.join(__dirname, '../../public/index.html');
  
  // Check if file exists, otherwise return a simple HTML template
  if (fs.existsSync(adminHtmlPath)) {
    res.sendFile(adminHtmlPath);
  } else {
    // Fallback: Return inline HTML if file doesn't exist
    res.send(getAdminHtml());
  }
});

function getAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mandate Service Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; margin-bottom: 5px; }
    .subtitle { color: #6b7280; font-size: 14px; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; background: white; padding: 10px; border-radius: 8px; }
    .tab { padding: 10px 20px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; }
    .tab.active { background: #2563eb; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-danger { background: #dc2626; color: white; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .status { padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .status.active { background: #d1fae5; color: #065f46; }
    .status.inactive { background: #fee2e2; color: #991b1b; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 8px; padding: 30px; max-width: 500px; width: 90%; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input, textarea, select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Mandate Service Admin</h1>
      <p class="subtitle">Manage Merchants and AI Agent Applications</p>
    </header>
    <div class="tabs">
      <button class="tab active" onclick="switchTab('merchants')">Merchants</button>
      <button class="tab" onclick="switchTab('agent-apps')">AI Agent Apps</button>
    </div>
    <div id="merchants" class="tab-content active">
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <h2>Merchants</h2>
          <button class="btn btn-primary" onclick="openMerchantModal()">+ Add Merchant</button>
        </div>
        <div id="merchants-list">Loading...</div>
      </div>
    </div>
    <div id="agent-apps" class="tab-content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <h2>AI Agent Applications</h2>
          <button class="btn btn-primary" onclick="openAgentAppModal()">+ Add Agent App</button>
        </div>
        <div id="agent-apps-list">Loading...</div>
      </div>
    </div>
  </div>
  <script>
    const API_URL = window.location.origin;
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tab).classList.add('active');
      if (tab === 'merchants') loadMerchants(); else loadAgentApps();
    }
    async function loadMerchants() {
      try {
        const res = await fetch(API_URL + '/api/merchants');
        const result = await res.json();
        const merchants = result.data || [];
        document.getElementById('merchants-list').innerHTML = merchants.length === 0 
          ? '<div style="text-align:center;padding:40px;">No merchants found.</div>'
          : '<table><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
            merchants.map(m => '<tr><td>' + m.name + '</td><td>' + m.slug + '</td><td><span class="status ' + m.status + '">' + m.status + '</span></td><td><button class="btn btn-danger btn-small" onclick="deleteMerchant(\\'' + m.id + '\\')">Delete</button></td></tr>').join('') +
            '</tbody></table>';
      } catch (e) {
        document.getElementById('merchants-list').innerHTML = '<div style="color:red;">Error: ' + e.message + '</div>';
      }
    }
    async function loadAgentApps() {
      try {
        const res = await fetch(API_URL + '/api/ai-agent-apps');
        const result = await res.json();
        const apps = result.data || [];
        document.getElementById('agent-apps-list').innerHTML = apps.length === 0
          ? '<div style="text-align:center;padding:40px;">No agent apps found.</div>'
          : '<table><thead><tr><th>Name</th><th>Agent ID</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
            apps.map(a => '<tr><td>' + a.name + '</td><td>' + a.agent_id + '</td><td><span class="status ' + a.status + '">' + a.status + '</span></td><td><button class="btn btn-danger btn-small" onclick="deleteAgentApp(\\'' + a.id + '\\')">Delete</button></td></tr>').join('') +
            '</tbody></table>';
      } catch (e) {
        document.getElementById('agent-apps-list').innerHTML = '<div style="color:red;">Error: ' + e.message + '</div>';
      }
    }
    function openMerchantModal() { alert('Merchant form would open here. See full implementation in src/public/index.html'); }
    function openAgentAppModal() { alert('Agent app form would open here. See full implementation in src/public/index.html'); }
    function deleteMerchant(id) { if (confirm('Delete merchant?')) fetch(API_URL + '/api/merchants/' + id, {method:'DELETE'}).then(() => loadMerchants()); }
    function deleteAgentApp(id) { if (confirm('Delete agent app?')) fetch(API_URL + '/api/ai-agent-apps/' + id, {method:'DELETE'}).then(() => loadAgentApps()); }
    loadMerchants();
  </script>
</body>
</html>`;
}

export default router;
