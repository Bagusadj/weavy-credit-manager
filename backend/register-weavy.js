const axios = require('axios');
const fs = require('fs');
const path = require('path');

const WEAVY_BASE = 'https://api.weavy.ai';

// Read accounts from file
const accountsFile = process.argv[2] || './accounts_converted.txt';
const content = fs.readFileSync(accountsFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

const results = {
    success: [],
    failed: []
};

(async () => {
    for (const line of lines) {
        const parts = line.split(':');
        if (parts.length < 2) continue;
        
        const email = parts[0].trim();
        const password = parts[1].trim();
        
        console.log(`\n📧 Registering: ${email}`);
        
        try {
            // Step 1: Signup
            const signupRes = await axios.post(`${WEAVY_BASE}/auth/signup`, {
                email,
                password,
                name: email.split('@')[0]
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            
            console.log(`✅ Signup success`);
            
            // Step 2: Get token from response or login
            const token = signupRes.data.token || signupRes.data.apiKey;
            
            if (!token) {
                // Login to get token
                const loginRes = await axios.post(`${WEAVY_BASE}/auth/login`, {
                    email,
                    password
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                });
                
                const authToken = loginRes.data.token || loginRes.data.apiKey;
                
                // Step 3: Get credits
                const creditsRes = await axios.post(`${WEAVY_BASE}/users/onboarding-credits`,
                    { force: true },
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                
                const credits = creditsRes.data.credits || 0;
                console.log(`💰 Credits: ${credits}`);
                
                results.success.push({
                    email,
                    password,
                    api_key: authToken,
                    credits
                });
            } else {
                // Got token from signup, get credits
                const creditsRes = await axios.post(`${WEAVY_BASE}/users/onboarding-credits`,
                    { force: true },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                
                const credits = creditsRes.data.credits || 0;
                console.log(`💰 Credits: ${credits}`);
                
                results.success.push({
                    email,
                    password,
                    api_key: token,
                    credits
                });
            }
            
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
            results.failed.push({
                email,
                error: error.message
            });
        }
        
        // Delay between requests
        await new Promise(r => setTimeout(r, 1000));
    }
    
    // Save results
    fs.writeFileSync('./register_results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Success: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('Results saved to register_results.json');
})();