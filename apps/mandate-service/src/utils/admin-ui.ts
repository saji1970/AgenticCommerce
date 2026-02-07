export function getAdminHtml(backendApiUrl: string = '', adminToken: string = ''): string {
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
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .tab { padding: 10px 20px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .tab:hover { background: #e5e7eb; }
    .tab.active { background: #2563eb; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-small { padding: 5px 10px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    tr:hover { background: #f9fafb; }
    .status { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; display: inline-block; }
    .status.active { background: #d1fae5; color: #065f46; }
    .status.inactive { background: #fee2e2; color: #991b1b; }
    .status.suspended { background: #fef3c7; color: #92400e; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 8px; padding: 30px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; color: #374151; }
    input, textarea, select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
    textarea { min-height: 80px; resize: vertical; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .btn-secondary { background: #6b7280; color: white; }
    .btn-secondary:hover { background: #4b5563; }
    .loading { text-align: center; padding: 40px; color: #6b7280; }
    .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
    .success { background: #d1fae5; color: #065f46; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
    .empty { text-align: center; padding: 40px; color: #6b7280; }
    .actions { display: flex; gap: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Mandate Service Admin</h1>
      <p class="subtitle">Manage Merchants, AI Agents, Mandates, Intents, Users & Transactions</p>
    </header>
    <div class="tabs">
      <button class="tab active" onclick="switchTab('dashboard')">Dashboard</button>
      <button class="tab" onclick="switchTab('merchants')">Merchants</button>
      <button class="tab" onclick="switchTab('agent-apps')">AI Agent Apps</button>
      <button class="tab" onclick="switchTab('mandates')">Mandates</button>
      <button class="tab" onclick="switchTab('intents')">Intents</button>
      <button class="tab" onclick="switchTab('actions')">Action Logs</button>
      <button class="tab" onclick="switchTab('users')">Users</button>
      <button class="tab" onclick="switchTab('ap2')">AP2 Transactions</button>
    </div>
    <div id="dashboard" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <h2>Dashboard Statistics</h2>
        </div>
        <div id="dashboard-stats" class="loading">Loading...</div>
      </div>
    </div>
    <div id="merchants" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <h2>Merchants</h2>
          <button class="btn btn-primary" onclick="openMerchantModal()">+ Add Merchant</button>
        </div>
        <div id="merchants-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="agent-apps" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>AI Agent Applications</h2>
          <button class="btn btn-primary" onclick="openAgentAppModal()">+ Add Agent App</button>
        </div>
        <div id="agent-apps-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="mandates" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>All Mandates</h2>
        </div>
        <div id="mandates-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="intents" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>Purchase Intents</h2>
        </div>
        <div id="intents-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="actions" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>Agent Action Logs</h2>
        </div>
        <div id="actions-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="users" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>Users</h2>
        </div>
        <div id="users-list" class="loading">Loading...</div>
      </div>
    </div>
    <div id="ap2" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h2>AP2 Transactions</h2>
        </div>
        <div id="ap2-list" class="loading">Loading...</div>
      </div>
    </div>
  </div>
  <div id="merchant-modal" class="modal">
    <div class="modal-content">
      <h2 id="merchant-modal-title">Add Merchant</h2>
      <div id="merchant-error"></div>
      <form id="merchant-form">
        <input type="hidden" id="merchant-id">
        <div class="form-group"><label>Name *</label><input type="text" id="merchant-name" required></div>
        <div class="form-group"><label>Slug *</label><input type="text" id="merchant-slug" required></div>
        <div class="form-group"><label>Description</label><textarea id="merchant-description"></textarea></div>
        <div class="form-group"><label>API Key</label><input type="text" id="merchant-api-key"></div>
        <div class="form-group"><label>API Secret</label><input type="password" id="merchant-api-secret"></div>
        <div class="form-group"><label>Webhook URL</label><input type="url" id="merchant-webhook-url"></div>
        <div class="form-group"><label>Status</label><select id="merchant-status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeMerchantModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  <div id="agent-app-modal" class="modal">
    <div class="modal-content">
      <h2 id="agent-app-modal-title">Add AI Agent App</h2>
      <div id="agent-app-error"></div>
      <form id="agent-app-form">
        <input type="hidden" id="agent-app-id">
        <div class="form-group"><label>Name *</label><input type="text" id="agent-app-name" required></div>
        <div class="form-group"><label>Slug *</label><input type="text" id="agent-app-slug" required></div>
        <div class="form-group"><label>Agent ID *</label><input type="text" id="agent-app-agent-id" required></div>
        <div class="form-group"><label>Agent Name *</label><input type="text" id="agent-app-agent-name" required></div>
        <div class="form-group"><label>Description</label><textarea id="agent-app-description"></textarea></div>
        <div class="form-group"><label>API Endpoint</label><input type="url" id="agent-app-api-endpoint"></div>
        <div class="form-group"><label>API Key</label><input type="text" id="agent-app-api-key"></div>
        <div class="form-group"><label>Status</label><select id="agent-app-status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeAgentAppModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    const API_URL = window.location.origin;
    const BACKEND_API_URL = '${backendApiUrl}';
    const ADMIN_TOKEN = '${adminToken}';
    const headers = ADMIN_TOKEN ? { 'Authorization': 'Bearer ' + ADMIN_TOKEN } : {};
    
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tab).classList.add('active');
      if (tab === 'dashboard') loadDashboard(); 
      else if (tab === 'merchants') loadMerchants(); 
      else if (tab === 'agent-apps') loadAgentApps();
      else if (tab === 'mandates') loadMandates();
      else if (tab === 'intents') loadIntents();
      else if (tab === 'actions') loadActions();
      else if (tab === 'users') loadUsers();
      else if (tab === 'ap2') loadAP2();
    }
    async function loadMerchants() {
      const c = document.getElementById('merchants-list');
      try {
        const r = await fetch(API_URL + '/api/merchants');
        const d = await r.json();
        const m = d.data || [];
        c.innerHTML = m.length === 0 ? '<div class="empty">No merchants found.</div>' :
          '<table><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
          m.map(x => '<tr><td>' + x.name + '</td><td>' + x.slug + '</td><td><span class="status ' + x.status + '">' + x.status + '</span></td><td>' + new Date(x.created_at).toLocaleDateString() + '</td><td class="actions"><button class="btn btn-primary btn-small" onclick="editMerchant(\\'' + x.id + '\\')">Edit</button> <button class="btn btn-danger btn-small" onclick="deleteMerchant(\\'' + x.id + '\\')">Delete</button></td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    async function loadAgentApps() {
      const c = document.getElementById('agent-apps-list');
      try {
        const r = await fetch(API_URL + '/api/ai-agent-apps');
        const d = await r.json();
        const a = d.data || [];
        c.innerHTML = a.length === 0 ? '<div class="empty">No agent apps found.</div>' :
          '<table><thead><tr><th>Name</th><th>Agent ID</th><th>Status</th><th>Capabilities</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
          a.map(x => '<tr><td>' + x.name + '</td><td>' + x.agent_id + '</td><td><span class="status ' + x.status + '">' + x.status + '</span></td><td>' + (x.capabilities || []).join(', ') + '</td><td>' + new Date(x.created_at).toLocaleDateString() + '</td><td class="actions"><button class="btn btn-primary btn-small" onclick="editAgentApp(\\'' + x.id + '\\')">Edit</button> <button class="btn btn-danger btn-small" onclick="deleteAgentApp(\\'' + x.id + '\\')">Delete</button></td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    function openMerchantModal(id) {
      const m = document.getElementById('merchant-modal');
      const t = document.getElementById('merchant-modal-title');
      if (id) { t.textContent = 'Edit Merchant'; loadMerchant(id); } else { t.textContent = 'Add Merchant'; document.getElementById('merchant-form').reset(); document.getElementById('merchant-id').value = ''; }
      m.classList.add('active');
    }
    function closeMerchantModal() { document.getElementById('merchant-modal').classList.remove('active'); }
    function openAgentAppModal(id) {
      const m = document.getElementById('agent-app-modal');
      const t = document.getElementById('agent-app-modal-title');
      if (id) { t.textContent = 'Edit AI Agent App'; loadAgentApp(id); } else { t.textContent = 'Add AI Agent App'; document.getElementById('agent-app-form').reset(); document.getElementById('agent-app-id').value = ''; }
      m.classList.add('active');
    }
    function closeAgentAppModal() { document.getElementById('agent-app-modal').classList.remove('active'); }
    async function loadMerchant(id) {
      try {
        const r = await fetch(API_URL + '/api/merchants/' + id);
        const d = await r.json();
        if (d.success) {
          const m = d.data;
          document.getElementById('merchant-id').value = m.id;
          document.getElementById('merchant-name').value = m.name || '';
          document.getElementById('merchant-slug').value = m.slug || '';
          document.getElementById('merchant-description').value = m.description || '';
          document.getElementById('merchant-api-key').value = m.api_key || '';
          document.getElementById('merchant-api-secret').value = m.api_secret || '';
          document.getElementById('merchant-webhook-url').value = m.webhook_url || '';
          document.getElementById('merchant-status').value = m.status || 'active';
        }
      } catch (e) {
        document.getElementById('merchant-error').innerHTML = '<div class="error">' + e.message + '</div>';
      }
    }
    async function loadAgentApp(id) {
      try {
        const r = await fetch(API_URL + '/api/ai-agent-apps/' + id);
        const d = await r.json();
        if (d.success) {
          const a = d.data;
          document.getElementById('agent-app-id').value = a.id;
          document.getElementById('agent-app-name').value = a.name || '';
          document.getElementById('agent-app-slug').value = a.slug || '';
          document.getElementById('agent-app-agent-id').value = a.agent_id || '';
          document.getElementById('agent-app-agent-name').value = a.agent_name || '';
          document.getElementById('agent-app-description').value = a.description || '';
          document.getElementById('agent-app-api-endpoint').value = a.api_endpoint || '';
          document.getElementById('agent-app-api-key').value = a.api_key || '';
          document.getElementById('agent-app-status').value = a.status || 'active';
        }
      } catch (e) {
        document.getElementById('agent-app-error').innerHTML = '<div class="error">' + e.message + '</div>';
      }
    }
    document.getElementById('merchant-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('merchant-id').value;
      const data = {
        name: document.getElementById('merchant-name').value,
        slug: document.getElementById('merchant-slug').value,
        description: document.getElementById('merchant-description').value,
        api_key: document.getElementById('merchant-api-key').value,
        api_secret: document.getElementById('merchant-api-secret').value,
        webhook_url: document.getElementById('merchant-webhook-url').value,
        status: document.getElementById('merchant-status').value,
      };
      try {
        const r = await fetch(id ? API_URL + '/api/merchants/' + id : API_URL + '/api/merchants', {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to save merchant');
        closeMerchantModal();
        loadMerchants();
      } catch (e) {
        document.getElementById('merchant-error').innerHTML = '<div class="error">' + e.message + '</div>';
      }
    });
    document.getElementById('agent-app-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('agent-app-id').value;
      const data = {
        name: document.getElementById('agent-app-name').value,
        slug: document.getElementById('agent-app-slug').value,
        agent_id: document.getElementById('agent-app-agent-id').value,
        agent_name: document.getElementById('agent-app-agent-name').value,
        description: document.getElementById('agent-app-description').value,
        api_endpoint: document.getElementById('agent-app-api-endpoint').value,
        api_key: document.getElementById('agent-app-api-key').value,
        status: document.getElementById('agent-app-status').value,
      };
      try {
        const r = await fetch(id ? API_URL + '/api/ai-agent-apps/' + id : API_URL + '/api/ai-agent-apps', {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to save agent app');
        closeAgentAppModal();
        loadAgentApps();
      } catch (e) {
        document.getElementById('agent-app-error').innerHTML = '<div class="error">' + e.message + '</div>';
      }
    });
    async function deleteMerchant(id) {
      if (!confirm('Delete merchant?')) return;
      try {
        const r = await fetch(API_URL + '/api/merchants/' + id, { method: 'DELETE' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to delete');
        loadMerchants();
      } catch (e) { alert('Error: ' + e.message); }
    }
    async function deleteAgentApp(id) {
      if (!confirm('Delete agent app?')) return;
      try {
        const r = await fetch(API_URL + '/api/ai-agent-apps/' + id, { method: 'DELETE' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to delete');
        loadAgentApps();
      } catch (e) { alert('Error: ' + e.message); }
    }
    function editMerchant(id) { openMerchantModal(id); }
    function editAgentApp(id) { openAgentAppModal(id); }
    
    async function loadDashboard() {
      const c = document.getElementById('dashboard-stats');
      if (!BACKEND_API_URL) {
        c.innerHTML = '<div class="error">Backend API URL not configured. Set BACKEND_API_URL environment variable.</div>';
        return;
      }
      try {
        const r = await fetch(BACKEND_API_URL + '/api/admin/dashboard/stats', { headers });
        if (!r.ok) throw new Error('Failed to load dashboard stats');
        const d = await r.json();
        const s = d.stats || {};
        c.innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">' +
          '<div class="card"><h3>Users</h3><p style="font-size: 32px; margin: 10px 0;">' + (s.totalUsers || 0) + '</p></div>' +
          '<div class="card"><h3>Mandates</h3><p style="font-size: 32px; margin: 10px 0;">' + (s.mandates?.total || 0) + '</p><small>Active: ' + (s.mandates?.byStatus?.active || 0) + '</small></div>' +
          '<div class="card"><h3>Intents</h3><p style="font-size: 32px; margin: 10px 0;">' + (s.intents?.total || 0) + '</p><small>Pending: ' + (s.intents?.byStatus?.pending || 0) + '</small></div>' +
          '<div class="card"><h3>Total Spent</h3><p style="font-size: 32px; margin: 10px 0;">$' + (s.spending?.totalSpent?.toFixed(2) || '0.00') + '</p></div>' +
          '<div class="card"><h3>AP2 Transactions</h3><p style="font-size: 32px; margin: 10px 0;">' + (s.ap2?.totalTransactions || 0) + '</p><small>Volume: $' + (s.ap2?.totalVolume?.toFixed(2) || '0.00') + '</small></div>' +
          '</div>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + (BACKEND_API_URL ? '' : ' (Backend API not configured)') + '</div>';
      }
    }
    
    async function loadMandates() {
      const c = document.getElementById('mandates-list');
      try {
        const r = await fetch(API_URL + '/api/mandates?limit=50');
        if (!r.ok) throw new Error('Failed to load mandates');
        const d = await r.json();
        const m = d.data || [];
        c.innerHTML = m.length === 0 ? '<div class="empty">No mandates found.</div>' :
          '<table><thead><tr><th>ID</th><th>Agent</th><th>Type</th><th>Status</th><th>User ID</th><th>Constraints</th><th>Created</th></tr></thead><tbody>' +
          m.map(x => '<tr><td title="' + x.id + '">' + x.id.substring(0, 8) + '...</td><td>' + (x.agentName || x.agent_name || 'N/A') + '</td><td>' + x.type + '</td><td><span class="status ' + x.status + '">' + x.status + '</span></td><td title="' + (x.userId || x.user_id || '') + '">' + (x.userId || x.user_id || 'N/A').substring(0, 12) + '...</td><td><small>' + JSON.stringify(x.constraints || {}).substring(0, 60) + '...</small></td><td>' + new Date(x.createdAt || x.created_at).toLocaleString() + '</td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    
    async function loadIntents() {
      const c = document.getElementById('intents-list');
      if (!BACKEND_API_URL) {
        c.innerHTML = '<div class="error">Backend API URL not configured. Set BACKEND_API_URL environment variable.</div>';
        return;
      }
      try {
        const r = await fetch(BACKEND_API_URL + '/api/admin/intents?limit=50', { headers });
        if (!r.ok) throw new Error('Failed to load intents');
        const d = await r.json();
        const i = d.intents || [];
        c.innerHTML = i.length === 0 ? '<div class="empty">No intents found.</div>' :
          '<table><thead><tr><th>Agent</th><th>Total</th><th>Status</th><th>User</th><th>Created</th></tr></thead><tbody>' +
          i.map(x => '<tr><td>' + x.agent_id + '</td><td>$' + parseFloat(x.total).toFixed(2) + '</td><td><span class="status ' + x.status + '">' + x.status + '</span></td><td>' + (x.user_email || 'N/A') + '</td><td>' + new Date(x.created_at).toLocaleDateString() + '</td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    
    async function loadActions() {
      const c = document.getElementById('actions-list');
      if (!BACKEND_API_URL) {
        c.innerHTML = '<div class="error">Backend API URL not configured. Set BACKEND_API_URL environment variable.</div>';
        return;
      }
      try {
        const r = await fetch(BACKEND_API_URL + '/api/admin/actions?limit=100', { headers });
        if (!r.ok) throw new Error('Failed to load actions');
        const d = await r.json();
        const a = d.actions || [];
        c.innerHTML = a.length === 0 ? '<div class="empty">No actions found.</div>' :
          '<table><thead><tr><th>Agent</th><th>Action</th><th>Type</th><th>Success</th><th>User</th><th>Time</th></tr></thead><tbody>' +
          a.map(x => '<tr><td>' + x.agent_id + '</td><td>' + x.action + '</td><td>' + x.resource_type + '</td><td><span class="status ' + (x.success ? 'active' : 'inactive') + '">' + (x.success ? 'Yes' : 'No') + '</span></td><td>' + (x.user_email || 'N/A') + '</td><td>' + new Date(x.timestamp).toLocaleString() + '</td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    
    async function loadUsers() {
      const c = document.getElementById('users-list');
      if (!BACKEND_API_URL) {
        c.innerHTML = '<div class="error">Backend API URL not configured. Set BACKEND_API_URL environment variable.</div>';
        return;
      }
      try {
        const r = await fetch(BACKEND_API_URL + '/api/admin/users?limit=50', { headers });
        if (!r.ok) throw new Error('Failed to load users');
        const d = await r.json();
        const u = d.users || [];
        c.innerHTML = u.length === 0 ? '<div class="empty">No users found.</div>' :
          '<table><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Created</th></tr></thead><tbody>' +
          u.map(x => '<tr><td>' + x.email + '</td><td>' + (x.first_name || '') + ' ' + (x.last_name || '') + '</td><td>' + (x.role || 'user') + '</td><td>' + new Date(x.created_at).toLocaleDateString() + '</td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    
    async function loadAP2() {
      const c = document.getElementById('ap2-list');
      if (!BACKEND_API_URL) {
        c.innerHTML = '<div class="error">Backend API URL not configured. Set BACKEND_API_URL environment variable.</div>';
        return;
      }
      try {
        const r = await fetch(BACKEND_API_URL + '/api/admin/ap2/transactions?limit=50', { headers });
        if (!r.ok) throw new Error('Failed to load AP2 transactions');
        const d = await r.json();
        const t = d.transactions || [];
        c.innerHTML = t.length === 0 ? '<div class="empty">No AP2 transactions found.</div>' :
          '<table><thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Merchant</th><th>User</th><th>Created</th></tr></thead><tbody>' +
          t.map(x => '<tr><td>' + x.type + '</td><td>$' + parseFloat(x.amount || 0).toFixed(2) + '</td><td><span class="status ' + x.status + '">' + x.status + '</span></td><td>' + (x.merchant_name || 'N/A') + '</td><td>' + (x.user_email || 'N/A') + '</td><td>' + new Date(x.requested_at).toLocaleDateString() + '</td></tr>').join('') +
          '</tbody></table>';
      } catch (e) {
        c.innerHTML = '<div class="error">Error: ' + e.message + '</div>';
      }
    }
    
    loadDashboard();
  </script>
</body>
</html>`;
}
