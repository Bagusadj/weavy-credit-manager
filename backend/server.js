const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Serve frontend with proper CORS for production
app.use(express.static(path.join(__dirname, '../frontend'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));
app.use('/uploads', express.static('uploads'));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// SQLite Database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, './data/credits.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        api_key TEXT,
        credit INTEGER DEFAULT 0,
        status TEXT DEFAULT 'inactive',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_sync DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        model TEXT,
        credits_used INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
    )`);
});

// Weavy API Configuration
const WEAVY_BASE_URL = 'https://api.weavy.ai';

// Bulk login from uploaded file
app.post('/api/accounts/bulk-upload', upload.single('accounts'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());

        const results = {
            success: [],
            failed: []
        };

        // Parse accounts - support multiple formats
        const accounts = [];
        let currentEmail = null;
        let currentPassword = null;
        let currentApiKey = null;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments
            if (trimmed.startsWith('#')) continue;

            // Format 1: "Email : xxx@gmail.com" / "Password : xxx"
            const emailMatch = trimmed.match(/^Email\s*:\s*(.+)$/i);
            const passwordMatch = trimmed.match(/^Password\s*:\s*(.+)$/i);

            if (emailMatch) {
                // Save previous account if exists
                if (currentEmail && currentPassword) {
                    accounts.push({ email: currentEmail, password: currentPassword, apiKey: currentApiKey });
                }
                currentEmail = emailMatch[1].trim();
                currentPassword = null;
                currentApiKey = null;
            } else if (passwordMatch) {
                currentPassword = passwordMatch[1].trim();
            }
            // Format 2: email:password or email:password:api_key (single line)
            else if (trimmed.includes(':') && !trimmed.startsWith('Email') && !trimmed.startsWith('Password')) {
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    accounts.push({
                        email: parts[0].trim(),
                        password: parts[1].trim(),
                        apiKey: parts[2] ? parts[2].trim() : null
                    });
                }
            }
        }

        // Don't forget the last account
        if (currentEmail && currentPassword) {
            accounts.push({ email: currentEmail, password: currentPassword, apiKey: currentApiKey });
        }

        for (const account of accounts) {
            try {
                // Get Weavy token
                const auth = account.apiKey || account.password;
                const response = await axios.post(`${WEAVY_BASE_URL}/users/onboarding-credits`, 
                    { force: true },
                    {
                        headers: {
                            'Authorization': `Bearer ${auth}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const credits = response.data.credits || 0;

                // Save to database
                const stmt = db.prepare(`
                    INSERT OR REPLACE INTO accounts (email, password, api_key, credit, status, last_sync)
                    VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
                `);
                
                stmt.run(account.email, account.password, account.apiKey, credits);
                stmt.finalize();

                results.success.push({
                    email: account.email,
                    credits,
                    status: 'active'
                });

            } catch (error) {
                console.error(`Failed to login ${account.email}:`, error.message);
                results.failed.push({
                    email: account.email,
                    error: error.message
                });
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: `Processed ${lines.length} accounts`,
            results
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all accounts with total credits
app.get('/api/accounts', (req, res) => {
    db.all(`
        SELECT * FROM accounts 
        ORDER BY credit DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const totalCredits = rows.reduce((sum, acc) => sum + acc.credit, 0);
        const activeAccounts = rows.filter(acc => acc.status === 'active').length;

        res.json({
            accounts: rows,
            totalCredits,
            activeAccounts,
            totalAccounts: rows.length
        });
    });
});

// Sync credits for all accounts
app.post('/api/accounts/sync', async (req, res) => {
    try {
        db.all('SELECT * FROM accounts WHERE status = "active"', async (err, accounts) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const results = [];

            for (const account of accounts) {
                try {
                    const auth = account.api_key || account.password;
                    const response = await axios.post(`${WEAVY_BASE_URL}/users/onboarding-credits`,
                        { force: true },
                        {
                            headers: {
                                'Authorization': `Bearer ${auth}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    const credits = response.data.credits || 0;

                    db.run(`
                        UPDATE accounts 
                        SET credit = ?, last_sync = CURRENT_TIMESTAMP 
                        WHERE email = ?
                    `, [credits, account.email]);

                    results.push({
                        email: account.email,
                        credits,
                        status: 'synced'
                    });

                } catch (error) {
                    console.error(`Sync failed for ${account.email}:`, error.message);
                    results.push({
                        email: account.email,
                        error: error.message,
                        status: 'failed'
                    });
                }
            }

            res.json({
                success: true,
                message: `Synced ${accounts.length} accounts`,
                results
            });
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deduct credits
app.post('/api/accounts/deduct', (req, res) => {
    const { accountId, model, creditsUsed } = req.body;

    db.serialize(() => {
        // Get current credit
        db.get('SELECT * FROM accounts WHERE id = ?', [accountId], (err, account) => {
            if (err || !account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const newCredit = account.credit - creditsUsed;

            if (newCredit < 0) {
                return res.status(400).json({ error: 'Insufficient credits' });
            }

            // Update credit
            db.run(`
                UPDATE accounts 
                SET credit = ? 
                WHERE id = ?
            `, [newCredit, accountId]);

            // Log usage
            db.run(`
                INSERT INTO usage_log (account_id, model, credits_used)
                VALUES (?, ?, ?)
            `, [accountId, model, creditsUsed]);

            res.json({
                success: true,
                remainingCredits: newCredit,
                deductedCredits: creditsUsed
            });
        });
    });
});

// Get usage history
app.get('/api/usage', (req, res) => {
    const { limit = 50 } = req.query;

    db.all(`
        SELECT 
            ul.*,
            a.email 
        FROM usage_log ul
        JOIN accounts a ON ul.account_id = a.id
        ORDER BY ul.created_at DESC
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ usage: rows });
    });
});

// Get available models
app.get('/api/models', (req, res) => {
    const models = [
        { id: 'flux-1.1-pro', name: 'Flux 1.1 Pro', credits: 10 },
        { id: 'flux-1.1-dev', name: 'Flux 1.1 Dev', credits: 8 },
        { id: 'flux-realism', name: 'Flux Realism', credits: 12 },
        { id: 'flux-anime', name: 'Flux Anime', credits: 10 },
        { id: 'flux-3d', name: 'Flux 3D', credits: 15 },
        { id: 'turbo', name: 'Turbo', credits: 5 }
    ];

    res.json({ models });
});

// Generate image (deduct credits)
app.post('/api/generate', async (req, res) => {
    const { model, prompt, accountId } = req.body;

    try {
        // Get account info
        db.get('SELECT * FROM accounts WHERE id = ?', [accountId], async (err, account) => {
            if (err || !account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            // Get model cost
            const models = {
                'flux-1.1-pro': 10,
                'flux-1.1-dev': 8,
                'flux-realism': 12,
                'flux-anime': 10,
                'flux-3d': 15,
                'turbo': 5
            };

            const creditsNeeded = models[model] || 10;

            if (account.credit < creditsNeeded) {
                return res.status(400).json({ error: 'Insufficient credits' });
            }

            try {
                // Call Weavy API
                const auth = account.api_key || account.password;
                const response = await axios.post(`${WEAVY_BASE_URL}/images/generate`,
                    {
                        model,
                        prompt,
                        width: 1024,
                        height: 1024
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${auth}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                // Deduct credits
                const newCredit = account.credit - creditsNeeded;
                db.run(`
                    UPDATE accounts 
                    SET credit = ? 
                    WHERE id = ?
                `, [newCredit, accountId]);

                // Log usage
                db.run(`
                    INSERT INTO usage_log (account_id, model, credits_used)
                    VALUES (?, ?, ?)
                `, [accountId, model, creditsNeeded]);

                res.json({
                    success: true,
                    imageUrl: response.data.url || response.data.image_url,
                    creditsUsed: creditsNeeded,
                    remainingCredits: newCredit
                });

            } catch (error) {
                console.error('Generate error:', error);
                res.status(500).json({ error: error.message });
            }
        });

    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete account
app.delete('/api/accounts/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM accounts WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ success: true, message: 'Account deleted' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});