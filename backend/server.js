const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static('uploads'));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// SQLite Database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, './data/credits.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    // Users table for web app auth
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Weavy accounts with session storage
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT,
        password TEXT,
        session_cookie TEXT,
        credit INTEGER DEFAULT 0,
        status TEXT DEFAULT 'inactive',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_sync DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        node_type TEXT,
        config TEXT,
        credits_cost INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        model TEXT,
        credits_used INTEGER,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
    )`);

    // Insert default Kling workflow
    db.run(`INSERT OR REPLACE INTO workflows (name, node_type, config, credits_cost) VALUES (
        'Kling Motion Control',
        'kling_motion',
        '{"input": "image", "output": "video", "motion_strength": 5, "duration": 5}',
        123
    )`, (err) => {
        if (err) console.log('Workflow exists:', err.message);
    });
});

// Weavy API Configuration
const WEAVY_BASE_URL = 'https://api.weavy.ai';

// ─── USER AUTH ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
    
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], function(err) {
        if (err) return res.status(400).json({ error: 'Email already exists' });
        res.json({ success: true, userId: this.lastID });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ success: true, userId: user.id, email: user.email });
    });
});

// ─── WEAVY OAUTH FLOW ─────────────────────────────────────────────────────────
app.post('/api/accounts/connect', async (req, res) => {
    const { userId, email, password } = req.body;
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
        });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();
        
        // Navigate to Weavy
        await page.goto('https://app.weavy.ai/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Click "Log in with Google"
        await page.click('button:has-text("Log in with Google")', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        // Check if already logged in (dashboard) or need to login
        const isDashboard = await page.url().includes('/dashboard');
        
        if (!isDashboard) {
            // Google login page - wait for user to complete manually
            console.log('Waiting for manual Google login...');
            
            // Wait for navigation after login (max 5 minutes)
            await page.waitForFunction(() => window.location.href.includes('app.weavy.ai'), { timeout: 300000 });
            await page.waitForTimeout(5000);
        }
        
        // Extract session cookies
        const cookies = await context.cookies();
        const sessionCookie = JSON.stringify(cookies);
        
        // Get credits from onboarding endpoint
        let credits = 0;
        try {
            const creditsRes = await page.evaluate(async () => {
                const res = await fetch('https://api.weavy.ai/users/onboarding-credits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: true })
                });
                const data = await res.json();
                return data.credits || 0;
            });
            credits = creditsRes;
        } catch (e) {
            console.log('Credits fetch failed:', e.message);
        }
        
        await browser.close();
        
        // Save account
        db.run(`
            INSERT INTO accounts (user_id, email, password, session_cookie, credit, status, last_sync)
            VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `, [userId, email, password, sessionCookie, credits], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to save account' });
            res.json({ 
                success: true, 
                accountId: this.lastID,
                email,
                credits
            });
        });
        
    } catch (error) {
        if (browser) await browser.close();
        console.error('OAuth error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/accounts/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Navigate to Weavy login
        await page.goto('https://app.weavy.ai/', { waitUntil: 'networkidle', timeout: 30000 });
        
        // Click "Log in with Google"
        await page.click('button:has-text("Log in with Google")', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        // Google login page
        await page.fill('input[type="email"]', email, { timeout: 10000 });
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(2000);
        
        await page.fill('input[type="password"]', password, { timeout: 10000 });
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(5000);
        
        // Handle "Welcome" page - click "I understand"
        try {
            await page.click('button:has-text("I understand")', { timeout: 5000 });
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No welcome popup');
        }
        
        // Wait for dashboard
        await page.waitForSelector('button:has-text("Create New File")', { timeout: 15000 });
        
        // Get cookies
        const cookies = await context.cookies();
        const sessionCookie = JSON.stringify(cookies);
        
        // Get initial credits
        let credits = 0;
        try {
            const creditsRes = await axios.post(`${WEAVY_BASE_URL}/users/onboarding-credits`,
                { force: true },
                {
                    headers: {
                        'Authorization': `Bearer ${cookies.find(c => c.name === 'token')?.value || ''}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            credits = creditsRes.data.credits || 0;
        } catch (e) {
            console.log('Credits check failed:', e.message);
        }
        
        await browser.close();
        
        // Save to database
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO accounts (email, password, session_cookie, credit, status, last_sync)
            VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `);
        stmt.run(email, password, sessionCookie, credits);
        stmt.finalize();
        
        res.json({
            success: true,
            email,
            credits,
            message: 'Login successful'
        });
        
    } catch (error) {
        if (browser) await browser.close();
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add account manually (after manual login)
app.post('/api/accounts/add', async (req, res) => {
    const { email, password, sessionCookie } = req.body;
    
    try {
        // Verify session by fetching credits
        let credits = 0;
        if (sessionCookie) {
            try {
                const creditsRes = await axios.post(`${WEAVY_BASE_URL}/users/onboarding-credits`,
                    { force: true },
                    {
                        headers: {
                            'Cookie': sessionCookie,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                credits = creditsRes.data.credits || 0;
            } catch (e) {
                console.log('Credits check failed:', e.message);
            }
        }

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO accounts (email, password, session_cookie, credit, status, last_sync)
            VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `);
        
        stmt.run(email, password, sessionCookie, credits);
        stmt.finalize();

        res.json({
            success: true,
            email,
            credits,
            message: 'Account added successfully'
        });

    } catch (error) {
        console.error('Add account error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all accounts
app.get('/api/accounts', (req, res) => {
    db.all(`SELECT * FROM accounts ORDER BY credit DESC`, (err, rows) => {
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

// Get workflows
app.get('/api/workflows', (req, res) => {
    db.all(`SELECT * FROM workflows`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ workflows: rows });
    });
});

// Kling Motion Control - Generate Video
app.post('/api/workflows/kling/generate', upload.single('image'), async (req, res) => {
    const { accountId, motionStrength = 5, duration = 5 } = req.body;
    
    try {
        // Get account with session
        db.get('SELECT * FROM accounts WHERE id = ?', [accountId], async (err, account) => {
            if (err || !account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            if (account.credit < 123) {
                return res.status(400).json({ error: 'Insufficient credits (need 123)' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Image file required' });
            }

            // Read uploaded image
            const imageData = fs.readFileSync(req.file.path);
            const base64Image = imageData.toString('base64');

            try {
                // Use Playwright to automate Weavy workflow
                const browser = await chromium.launch({ 
                    headless: true,
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                });
                const context = await browser.newContext({
                    cookies: account.session_cookie ? JSON.parse(account.session_cookie) : []
                });
                const page = await context.newPage();

                // Navigate to Weavy
                await page.goto('https://app.weavy.ai/', { waitUntil: 'networkidle', timeout: 30000 });
                
                // Check if logged in
                const isLoggedIn = await page.isVisible('button:has-text("Create New File")').catch(() => false);
                
                if (!isLoggedIn) {
                    await browser.close();
                    fs.unlinkSync(req.file.path);
                    return res.status(401).json({ error: 'Session expired. Please re-login.' });
                }

                // Click Create New File
                await page.click('button:has-text("Create New File")', { timeout: 10000 });
                await page.waitForTimeout(2000);

                // Search for Kling node
                await page.fill('input[placeholder*="Search"]', 'Kling Motion Control');
                await page.waitForTimeout(1000);
                
                // Click Kling node
                await page.click('text=Kling', { timeout: 10000 });
                await page.waitForTimeout(2000);

                // Upload image to input node
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                    await fileInput.setInputFiles(req.file.path);
                    await page.waitForTimeout(2000);
                }

                // Set motion strength
                await page.fill('input[type="range"]', String(motionStrength));
                
                // Set duration
                await page.fill('input[type="number"]', String(duration));

                // Run workflow
                await page.click('button:has-text("Run")', { timeout: 10000 });
                
                // Wait for completion
                await page.waitForTimeout(30000);

                // Get result video URL
                const videoUrl = await page.$eval('video[src]', el => el.src).catch(() => null);

                await browser.close();
                fs.unlinkSync(req.file.path);

                if (!videoUrl) {
                    return res.status(500).json({ error: 'Failed to get video result' });
                }

                // Deduct credits
                const newCredit = account.credit - 123;
                db.run(`UPDATE accounts SET credit = ? WHERE id = ?`, [newCredit, accountId]);

                // Log usage
                db.run(`INSERT INTO usage_log (account_id, model, credits_used, result) VALUES (?, ?, ?, ?)`,
                    [accountId, 'kling_motion', 123, videoUrl]);

                res.json({
                    success: true,
                    videoUrl,
                    creditsUsed: 123,
                    remainingCredits: newCredit
                });

            } catch (error) {
                console.error('Workflow execution error:', error);
                fs.unlinkSync(req.file.path);
                res.status(500).json({ error: error.message });
            }
        });

    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync credits
app.post('/api/accounts/sync', async (req, res) => {
    try {
        db.all('SELECT * FROM accounts WHERE status = "active"', async (err, accounts) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const results = [];
            for (const account of accounts) {
                try {
                    const response = await axios.post(`${WEAVY_BASE_URL}/users/onboarding-credits`,
                        { force: true },
                        {
                            headers: {
                                'Cookie': account.session_cookie || '',
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        }
                    );
                    const credits = response.data.credits || 0;
                    db.run(`UPDATE accounts SET credit = ?, last_sync = CURRENT_TIMESTAMP WHERE email = ?`, [credits, account.email]);
                    results.push({ email: account.email, credits, status: 'synced' });
                } catch (error) {
                    results.push({ email: account.email, error: error.message, status: 'failed' });
                }
            }
            res.json({ success: true, results });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get usage history
app.get('/api/usage', (req, res) => {
    const { limit = 50 } = req.query;
    db.all(`SELECT ul.*, a.email FROM usage_log ul JOIN accounts a ON ul.account_id = a.id ORDER BY ul.created_at DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ usage: rows });
    });
});

// Delete account
app.delete('/api/accounts/:id', (req, res) => {
    db.run('DELETE FROM accounts WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});