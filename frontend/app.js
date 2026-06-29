// Auto-detect API base - works on localhost and production
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
        document.getElementById('generateCredits').textContent = data.totalCredits;

        // Load recent accounts (top 5)
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
        console.error('Error loading dashboard:', error);
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

// File Upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('accountsFile');
const uploadProgress = document.getElementById('uploadProgress');
const uploadResult = document.getElementById('uploadResult');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--primary)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--border)';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border)';
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
});

async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('accounts', file);

    uploadProgress.style.display = 'block';
    uploadResult.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/accounts/bulk-upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        uploadProgress.style.display = 'none';

        if (result.success) {
            uploadResult.innerHTML = `
                <div class="result success">
                    <h3>✅ Upload Berhasil!</h3>
                    <p>${result.message}</p>
                    <p>Berhasil: ${result.results.success.length} akun</p>
                    <p>Gagal: ${result.results.failed.length} akun</p>
                </div>
            `;

            loadDashboardData();
        } else {
            uploadResult.innerHTML = `
                <div class="result error">
                    <h3>❌ Upload Gagal!</h3>
                    <p>${result.error}</p>
                </div>
            `;
        }

    } catch (error) {
        uploadProgress.style.display = 'none';
        uploadResult.innerHTML = `
            <div class="result error">
                <h3>❌ Upload Gagal!</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Sync All Accounts
document.getElementById('syncAllBtn').addEventListener('click', async () => {
    const btn = document.getElementById('syncAllBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Syncing...';

    try {
        const response = await fetch(`${API_BASE}/accounts/sync`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            alert(`Sync berhasil: ${result.message}`);
            loadDashboardData();
        } else {
            alert('Sync gagal');
        }

    } catch (error) {
        alert('Error sync: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Sync Semua Akun';
    }
});

// Models
let selectedModel = null;
let selectedAccountId = null;

async function loadModels() {
    try {
        const response = await fetch(`${API_BASE}/models`);
        const data = await response.json();

        const modelsGrid = document.getElementById('modelsGrid');
        modelsGrid.innerHTML = data.models.map(model => `
            <div class="model-card ${selectedModel === model.id ? 'selected' : ''}" 
                 onclick="selectModel('${model.id}', ${model.credits})">
                <h3>${model.name}</h3>
                <p class="cost">💰 ${model.credits} Kredit</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading models:', error);
    }
}

function selectModel(modelId, cost) {
    selectedModel = modelId;
    document.getElementById('costDisplay').textContent = cost;
    loadModels(); // Refresh to show selected state

    // Auto-select account with highest credits
    selectBestAccount();
}

async function selectBestAccount() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();

        // Find active account with highest credits
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

// Generate Image
document.getElementById('generateBtn').addEventListener('click', async () => {
    const prompt = document.getElementById('promptInput').value.trim();

    if (!prompt) {
        alert('Masukkan prompt!');
        return;
    }

    if (!selectedModel) {
        alert('Pilih model dulu!');
        return;
    }

    if (!selectedAccountId) {
        alert('Tidak ada akun dengan cukup kredit!');
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Generating...';

    try {
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                accountId: selectedAccountId
            })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('resultCard').style.display = 'block';
            document.getElementById('resultImage').src = result.imageUrl;
            document.getElementById('usedCredits').textContent = result.creditsUsed;
            document.getElementById('remainingCredits').textContent = result.remainingCredits;

            // Update dashboard credits
            loadDashboardData();
        } else {
            alert('Generate gagal: ' + result.error);
        }

    } catch (error) {
        alert('Error generate: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Generate';
    }
});

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
        console.error('Error loading history:', error);
    }
}

// Refresh Accounts
document.getElementById('refreshAccountsBtn').addEventListener('click', loadAccounts);

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
loadDashboardData();// Force redeploy Mon Jun 29 13:41:31 UTC 2026
