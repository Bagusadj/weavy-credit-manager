const API_BASE = window.location.origin + '/api';
let currentUser = null;
let isRegisterMode = false;

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleText = document.getElementById('authToggleText');
const authToggleLink = document.getElementById('authToggleLink');

// Check if user is logged in
function checkAuth() {
    const saved = localStorage.getItem('motionfly_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showDashboard();
    } else {
        if (authModal) authModal.style.display = 'flex';
    }
}

function showDashboard() {
    if (authModal) authModal.style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    loadDashboardData();
}

// Toggle login/register
if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (authTitle) authTitle.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
        if (authSubmitBtn) authSubmitBtn.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
        if (authToggleText) authToggleText.textContent = isRegisterMode ? 'Sudah punya akun?' : 'Belum punya akun?';
        authToggleLink.textContent = isRegisterMode ? 'Masuk' : 'Daftar';
    });
}

// Auth form submit
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
        
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Loading...';
        
        try {
            const res = await fetch(API_BASE + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            if (isRegisterMode) {
                alert('Registrasi berhasil! Silakan login.');
                authToggleLink.click();
            } else {
                currentUser = { id: data.userId, email: data.email };
                localStorage.setItem('motionfly_user', JSON.stringify(currentUser));
                showDashboard();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
        }
    });
}

// ─── CONNECT WEAVY ───────────────────────────────────────────────────────────
const connectBtn = document.getElementById('connectWeavyBtn');
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Please login first!');
            return;
        }
        
        const email = prompt('Masukkan email Weavy/Google kamu:');
        if (!email) return;
        
        const password = prompt('Masukkan password:');
        if (!password) return;
        
        const progress = document.getElementById('connectProgress');
        const result = document.getElementById('connectResult');
        
        if (progress) progress.style.display = 'block';
        if (result) result.innerHTML = '';
        connectBtn.disabled = true;
        
        try {
            const res = await fetch(API_BASE + '/accounts/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    email,
                    password
                })
            });
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            if (result) {
                result.innerHTML = `
                    <div class="result success">
                        <h3>✅ Connected!</h3>
                        <p>Email: ${data.email}</p>
                        <p>Credits: 💰 ${data.credits}</p>
                    </div>
                `;
            }
            loadDashboardData();
        } catch (error) {
            if (result) {
                result.innerHTML = `
                    <div class="result error">
                        <h3>❌ Failed</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } finally {
            if (progress) progress.style.display = 'none';
            connectBtn.disabled = false;
        }
    });
}

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
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });

        loadSectionData(sectionId);
    });
});

// Load section data
function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'generate':
            loadModels();
            loadDashboardData();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

// Dashboard Data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();

        document.getElementById('totalCredits').textContent = data.totalCredits;
        document.getElementById('activeAccounts').textContent = data.activeAccounts;
        document.getElementById('totalAccounts').textContent = data.totalAccounts;

        // Load recent accounts (top 5)
        const recentAccounts = data.accounts.slice(0, 5);
        const tbody = document.getElementById('recentAccountsTable');
        if (tbody) {
            tbody.innerHTML = recentAccounts.map(account => `
                <tr>
                    <td>${account.email}</td>
                    <td>💰 ${account.credit}</td>
                    <td><span class="badge ${account.status}">${account.status}</span></td>
                    <td>${formatDate(account.last_sync)}</td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Accounts
async function loadAccounts() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();

        const tbody = document.getElementById('accountsTable');
        if (tbody) {
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
        }

    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// Delete Account
async function deleteAccount(accountId) {
    if (!confirm('Yakin ingin menghapus akun ini?')) return;

    try {
        await fetch(`${API_BASE}/accounts/${accountId}`, {
            method: 'DELETE'
        });

        loadAccounts();
        loadDashboardData();

    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Gagal menghapus akun');
    }
}

// Models
let selectedModel = null;
let selectedAccountId = null;

async function loadModels() {
    try {
        const response = await fetch(`${API_BASE}/models`);
        const data = await response.json();

        const modelsGrid = document.getElementById('modelsGrid');
        if (modelsGrid) {
            modelsGrid.innerHTML = data.models.map(model => `
                <div class="model-card ${selectedModel === model.id ? 'selected' : ''}" 
                     onclick="selectModel('${model.id}', ${model.credits})">
                    <h3>${model.name}</h3>
                    <p class="cost">💰 ${model.credits} Kredit</p>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading models:', error);
    }
}

function selectModel(modelId, cost) {
    selectedModel = modelId;
    document.getElementById('costDisplay').textContent = cost;
    loadModels();
    selectBestAccount();
}

async function selectBestAccount() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();

        const activeAccounts = data.accounts
            .filter(acc => acc.status === 'active' && acc.credit > 0)
            .sort((a, b) => b.credit - a.credit);

        if (activeAccounts.length > 0) {
            selectedAccountId = activeAccounts[0].id;
        }

    } catch (error) {
        console.error('Error selecting account:', error);
    }
}

// History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/usage`);
        const data = await response.json();

        const tbody = document.getElementById('historyTable');
        if (tbody) {
            tbody.innerHTML = data.usage.map(log => `
                <tr>
                    <td>${log.email}</td>
                    <td>${log.model}</td>
                    <td>💰 ${log.credits_used}</td>
                    <td>${formatDate(log.created_at)}</td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Initial load
checkAuth();