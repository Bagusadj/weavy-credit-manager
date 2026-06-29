const API_BASE = window.location.origin + '/api';

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.dataset.section;
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) section.classList.add('active');
        });
        loadSectionData(sectionId);
    });
});

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard': loadDashboardData(); break;
        case 'accounts': loadAccounts(); break;
        case 'kling': loadKlingData(); break;
        case 'history': loadHistory(); break;
    }
}

// Dashboard
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        document.getElementById('totalCredits').textContent = data.totalCredits;
        document.getElementById('activeAccounts').textContent = data.activeAccounts;
        document.getElementById('totalAccounts').textContent = data.totalAccounts;
        document.getElementById('klingCredits').textContent = data.totalCredits;

        const recentAccounts = data.accounts.slice(0, 5);
        const tbody = document.getElementById('recentAccountsTable');
        tbody.innerHTML = recentAccounts.map(account => `
            <tr>
                <td>${account.email}</td>
                <td>💰 ${account.credit}</td>
                <td><span class="badge ${account.status}">${account.status}</span></td>
                <td>${formatDate(account.last_sync)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// Accounts
async function loadAccounts() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        const tbody = document.getElementById('accountsTable');
        tbody.innerHTML = data.accounts.map(account => `
            <tr>
                <td>${account.email}</td>
                <td>💰 ${account.credit}</td>
                <td><span class="badge ${account.status}">${account.status}</span></td>
                <td>${formatDate(account.last_sync)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="deleteAccount(${account.id})">
                        🗑️ Hapus
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Accounts error:', error);
    }
}

async function deleteAccount(accountId) {
    if (!confirm('Yakin ingin menghapus akun ini?')) return;
    try {
        await fetch(`${API_BASE}/accounts/${accountId}`, { method: 'DELETE' });
        loadAccounts();
        loadDashboardData();
    } catch (error) {
        alert('Gagal menghapus akun');
    }
}

// Add Account
document.getElementById('addAccountBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('addEmail').value.trim();
    const password = document.getElementById('addPassword').value;
    const sessionCookie = document.getElementById('addSessionCookie').value.trim();
    const resultDiv = document.getElementById('addResult');

    if (!email) {
        resultDiv.innerHTML = '<div class="result error">❌ Email wajib diisi!</div>';
        return;
    }

    resultDiv.innerHTML = '<div class="result">⏳ Menyimpan...</div>';

    try {
        const response = await fetch(`${API_BASE}/accounts/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, sessionCookie })
        });
        const result = await response.json();

        if (result.success) {
            resultDiv.innerHTML = `<div class="result success">✅ Akun berhasil! Email: ${email}, Credits: ${result.credits}</div>`;
            document.getElementById('addEmail').value = '';
            document.getElementById('addPassword').value = '';
            document.getElementById('addSessionCookie').value = '';
            loadDashboardData();
        } else {
            resultDiv.innerHTML = `<div class="result error">❌ Gagal: ${result.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="result error">❌ Error: ${error.message}</div>`;
    }
});

// Kling AI
async function loadKlingData() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        const select = document.getElementById('klingAccount');
        select.innerHTML = '<option value="">-- Pilih Akun --</option>' +
            data.accounts.filter(a => a.credit >= 123).map(account => 
                `<option value="${account.id}">${account.email} (💰 ${account.credit})</option>`
            ).join('');
        document.getElementById('klingCredits').textContent = data.totalCredits;
    } catch (error) {
        console.error('Kling data error:', error);
    }
}

// Motion strength slider
document.getElementById('motionStrength')?.addEventListener('input', (e) => {
    document.getElementById('motionValue').textContent = e.target.value;
});

// Generate Video
document.getElementById('klingGenerateBtn')?.addEventListener('click', async () => {
    const accountId = document.getElementById('klingAccount').value;
    const motionStrength = document.getElementById('motionStrength').value;
    const duration = document.getElementById('duration').value;
    const imageFile = document.getElementById('klingImage').files[0];

    if (!accountId) { alert('Pilih akun dulu!'); return; }
    if (!imageFile) { alert('Upload image dulu!'); return; }

    const btn = document.getElementById('klingGenerateBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Generating...';

    const formData = new FormData();
    formData.append('accountId', accountId);
    formData.append('motionStrength', motionStrength);
    formData.append('duration', duration);
    formData.append('image', imageFile);

    try {
        const response = await fetch(`${API_BASE}/workflows/kling/generate`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('klingResultCard').style.display = 'block';
            document.getElementById('resultVideo').src = result.videoUrl;
            document.getElementById('remainingCredits').textContent = result.remainingCredits;
            loadDashboardData();
            loadKlingData();
        } else {
            alert('Generate gagal: ' + result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Generate Video (123 Credits)';
    }
});

// Sync All
document.getElementById('syncAllBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('syncAllBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Syncing...';
    try {
        const response = await fetch(`${API_BASE}/accounts/sync`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            alert(`Sync selesai!`);
            loadDashboardData();
        }
    } catch (error) {
        alert('Error sync: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Sync Semua Akun';
    }
});

// Refresh Accounts
document.getElementById('refreshAccountsBtn')?.addEventListener('click', loadAccounts);

// History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/usage`);
        const data = await response.json();
        const tbody = document.getElementById('historyTable');
        tbody.innerHTML = data.usage.map(log => `
            <tr>
                <td>${log.email}</td>
                <td>${log.model}</td>
                <td>💰 ${log.credits_used}</td>
                <td>${formatDate(log.created_at)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('History error:', error);
    }
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}


// Login with Google OAuth
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            alert('Masukkan email dan password!');
            return;
        }
        
        const btn = document.getElementById('loginBtn');
        const progress = document.getElementById('loginProgress');
        const result = document.getElementById('loginResult');
        
        btn.disabled = true;
        progress.style.display = 'block';
        result.innerHTML = '';
        
        try {
            const response = await fetch(`${API_BASE}/accounts/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            progress.style.display = 'none';
            
            if (data.success) {
                result.innerHTML = `<div class="result success"><h3>✅ Login Berhasil!</h3><p>Email: ${data.email}</p><p>Credits: 💰 ${data.credits}</p></div>`;
                loadDashboardData();
            } else {
                result.innerHTML = `<div class="result error"><h3>❌ Login Gagal!</h3><p>${data.error}</p></div>`;
            }
        } catch (error) {
            progress.style.display = 'none';
            result.innerHTML = `<div class="result error"><h3>❌ Login Error!</h3><p>${error.message}</p></div>`;
        } finally {
            btn.disabled = false;
        }
    });
}

// Initial load
loadDashboardData();