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
        case 'workflow':
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

// Auto Register
const registerArea = document.getElementById('registerArea');
const registerFile = document.getElementById('registerFile');
const registerProgress = document.getElementById('registerProgress');
const registerResult = document.getElementById('registerResult');

registerArea.addEventListener('click', () => registerFile.click());
registerArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    registerArea.style.borderColor = 'var(--primary)';
});

registerArea.addEventListener('dragleave', () => {
    registerArea.style.borderColor = 'var(--border)';
});

registerArea.addEventListener('drop', (e) => {
    e.preventDefault();
    registerArea.style.borderColor = 'var(--border)';
    const file = e.dataTransfer.files[0];
    if (file) handleRegister(file);
});

registerFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleRegister(file);
});

async function handleRegister(file) {
    const formData = new FormData();
    formData.append('accounts', file);

    registerProgress.style.display = 'block';
    registerResult.innerHTML = '<p>⏳ Registering...</p>';

    try {
        const response = await fetch(`${API_BASE}/accounts/auto-register`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        registerProgress.style.display = 'none';

        if (result.success) {
            const successCount = result.results.success?.length || 0;
            const failedCount = result.results.failed?.length || 0;
            
            registerResult.innerHTML = `
                <div class="result success">
                    <h3>✅ Register Berhasil!</h3>
                    <p>${result.message}</p>
                    <p>Registered: ${successCount} akun</p>
                    <p>Gagal: ${failedCount} akun</p>
                </div>
            `;

            loadDashboardData();
        } else {
            registerResult.innerHTML = `
                <div class="result error">
                    <h3>❌ Register Gagal!</h3>
                    <p>${result.error}</p>
                </div>
            `;
        }

    } catch (error) {
        registerProgress.style.display = 'none';
        registerResult.innerHTML = `
            <div class="result error">
                <h3>❌ Register Gagal!</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

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

// Kling Motion Strength Slider
const motionSlider = document.getElementById('motionStrength');
const motionValue = document.getElementById('motionValue');
if (motionSlider && motionValue) {
    motionSlider.addEventListener('input', () => {
        motionValue.textContent = motionSlider.value;
    });
}

// Kling Generate
const klingBtn = document.getElementById('klingGenerateBtn');
if (klingBtn) {
    klingBtn.addEventListener('click', async () => {
        const imageInput = document.getElementById('klingImage');
        const motionStrength = document.getElementById('motionStrength').value;
        const duration = document.getElementById('duration').value;
        const progress = document.getElementById('klingProgress');
        const result = document.getElementById('klingResult');
        
        if (!imageInput.files[0]) {
            alert('Pilih gambar dulu!');
            return;
        }
        
        // Get best account
        try {
            const accResponse = await fetch(`${API_BASE}/accounts`);
            const accData = await accResponse.json();
            const bestAccount = accData.accounts.find(a => a.credit >= 123 && a.status === 'active');
            
            if (!bestAccount) {
                alert('Tidak ada akun dengan kredit cukup (min 123)!');
                return;
            }
            
            progress.style.display = 'block';
            result.innerHTML = '';
            
            // Upload image first
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            
            const uploadRes = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            
            // Call Kling workflow
            const klingRes = await fetch(`${API_BASE}/workflows/kling-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: bestAccount.id,
                    imageUrl: uploadData.url,
                    motionStrength: parseInt(motionStrength),
                    duration: parseInt(duration)
                })
            });
            
            const klingData = await klingRes.json();
            
            progress.style.display = 'none';
            
            if (klingData.success) {
                result.innerHTML = `
                    <div class="result success">
                        <h3>✅ Video Generated!</h3>
                        <video controls width="100%">
                            <source src="${klingData.videoUrl}" type="video/mp4">
                        </video>
                        <p>Kredit terpakai: 123</p>
                        <p>Sisa kredit: ${klingData.remainingCredits}</p>
                    </div>
                `;
                loadDashboardData();
            } else {
                result.innerHTML = `
                    <div class="result error">
                        <h3>❌ Failed!</h3>
                        <p>${klingData.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            progress.style.display = 'none';
            result.innerHTML = `
                <div class="result error">
                    <h3>❌ Error!</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    });
}

// Initial load
loadDashboardData();
let selectedWorkflowId = 1;

// Image upload
const imageUploadArea = document.getElementById('imageUploadArea');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');

imageUploadArea.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageSelect(file);
});

function handleImageSelect(file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar! Max 5MB');
        return;
    }
    
    selectedImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
        imageUploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

document.getElementById('removeImage').addEventListener('click', () => {
    selectedImage = null;
    imagePreview.style.display = 'none';
    imageUploadArea.style.display = 'block';
    imageInput.value = '';
});

// Motion strength slider
const motionStrength = document.getElementById('motionStrength');
const motionValue = document.getElementById('motionValue');
motionStrength.addEventListener('input', () => {
    motionValue.textContent = motionStrength.value;
});

// Generate Video
document.getElementById('generateVideoBtn').addEventListener('click', async () => {
    if (!selectedImage) {
        alert('Upload gambar dulu!');
        return;
    }

    const btn = document.getElementById('generateVideoBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Processing...';

    try {
        // Get account with highest credits
        const accResponse = await fetch(`${API_BASE}/accounts`);
        const accData = await accResponse.json();
        const activeAccounts = accData.accounts
            .filter(acc => acc.status === 'active' && acc.credit >= 123)
            .sort((a, b) => b.credit - a.credit);

        if (activeAccounts.length === 0) {
            alert('Tidak ada akun dengan kredit cukup (min 123)!');
            btn.disabled = false;
            btn.textContent = '🚀 Generate Video (💰 123 Kredit)';
            return;
        }

        const accountId = activeAccounts[0].id;

        // Upload image and generate
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('accountId', accountId);
        formData.append('workflowId', selectedWorkflowId);
        formData.append('motionStrength', motionStrength.value);
        formData.append('duration', document.getElementById('duration').value);

        const response = await fetch(`${API_BASE}/generate/video`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('videoResultCard').style.display = 'block';
            document.getElementById('resultVideo').src = result.videoUrl;
            document.getElementById('downloadLink').href = result.videoUrl;
            document.getElementById('videoUsedCredits').textContent = result.creditsUsed;
            document.getElementById('videoRemainingCredits').textContent = result.remainingCredits;

            // Update credits display
            loadDashboardData();
        } else {
            alert('Generate gagal: ' + result.error);
        }

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Generate Video (💰 123 Kredit)';
    }
});

// Initial load
loadDashboardData();
