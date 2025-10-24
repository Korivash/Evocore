const https = require('https');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bright: '\x1b[1m',
};

console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}║        DISCORD API CONNECTIVITY TEST           ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

// Test 1: Basic Discord API connectivity
console.log(`${colors.cyan}Test 1: Checking Discord API Gateway...${colors.reset}`);
const testApiGateway = new Promise((resolve, reject) => {
    const req = https.get('https://discord.com/api/v10/gateway', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`${colors.green}✅ Discord API Gateway is reachable${colors.reset}`);
                console.log(`   Status: ${res.statusCode}`);
                resolve(true);
            } else {
                console.log(`${colors.yellow}⚠️  Unexpected status code: ${res.statusCode}${colors.reset}`);
                resolve(false);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`${colors.red}❌ Failed to reach Discord API Gateway${colors.reset}`);
        console.log(`   Error: ${error.message}`);
        reject(error);
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        console.log(`${colors.red}❌ Request timed out after 10 seconds${colors.reset}`);
        reject(new Error('Timeout'));
    });
});

// Test 2: Test authentication
console.log(`\n${colors.cyan}Test 2: Testing bot authentication...${colors.reset}`);
const testAuth = new Promise((resolve, reject) => {
    if (!process.env.DISCORD_TOKEN) {
        console.log(`${colors.red}❌ DISCORD_TOKEN not found in .env${colors.reset}`);
        resolve(false);
        return;
    }
    
    if (!process.env.CLIENT_ID) {
        console.log(`${colors.red}❌ CLIENT_ID not found in .env${colors.reset}`);
        resolve(false);
        return;
    }
    
    const options = {
        hostname: 'discord.com',
        path: `/api/v10/applications/${process.env.CLIENT_ID}`,
        method: 'GET',
        headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`${colors.green}✅ Bot authentication successful${colors.reset}`);
                const appData = JSON.parse(data);
                console.log(`   Bot Name: ${appData.name}`);
                console.log(`   Bot ID: ${appData.id}`);
                resolve(true);
            } else if (res.statusCode === 401) {
                console.log(`${colors.red}❌ Authentication failed - Invalid token${colors.reset}`);
                console.log(`   Check your DISCORD_TOKEN in .env`);
                resolve(false);
            } else if (res.statusCode === 404) {
                console.log(`${colors.red}❌ Application not found${colors.reset}`);
                console.log(`   Check your CLIENT_ID in .env`);
                resolve(false);
            } else {
                console.log(`${colors.yellow}⚠️  Unexpected status: ${res.statusCode}${colors.reset}`);
                resolve(false);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`${colors.red}❌ Authentication test failed${colors.reset}`);
        console.log(`   Error: ${error.message}`);
        reject(error);
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        console.log(`${colors.red}❌ Authentication request timed out${colors.reset}`);
        reject(new Error('Timeout'));
    });
    
    req.end();
});

// Test 3: Check command registration endpoint
console.log(`\n${colors.cyan}Test 3: Testing command registration endpoint...${colors.reset}`);
const testCommandEndpoint = new Promise((resolve, reject) => {
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        console.log(`${colors.yellow}⚠️  Skipping (missing credentials)${colors.reset}`);
        resolve(false);
        return;
    }
    
    const options = {
        hostname: 'discord.com',
        path: `/api/v10/applications/${process.env.CLIENT_ID}/commands`,
        method: 'GET',
        headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                const commands = JSON.parse(data);
                console.log(`${colors.green}✅ Command endpoint is accessible${colors.reset}`);
                console.log(`   Currently registered global commands: ${commands.length}`);
                resolve(true);
            } else {
                console.log(`${colors.yellow}⚠️  Unexpected status: ${res.statusCode}${colors.reset}`);
                resolve(false);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`${colors.red}❌ Command endpoint test failed${colors.reset}`);
        console.log(`   Error: ${error.message}`);
        reject(error);
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        console.log(`${colors.red}❌ Request timed out${colors.reset}`);
        reject(new Error('Timeout'));
    });
    
    req.end();
});

// Run all tests
(async () => {
    try {
        await testApiGateway;
        await testAuth;
        await testCommandEndpoint;
        
        console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}║              DIAGNOSTIC SUMMARY                ║${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
        console.log(`${colors.green}All tests passed! Your connection to Discord API is working.${colors.reset}`);
        console.log(`${colors.yellow}If command deployment still fails, try:${colors.reset}`);
        console.log(`  1. Using the guild-specific deployment script`);
        console.log(`  2. Waiting a few minutes and trying again`);
        console.log(`  3. Checking if your hosting provider blocks Discord\n`);
        
    } catch (error) {
        console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}║              DIAGNOSTIC SUMMARY                ║${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
        console.log(`${colors.red}❌ Connection issues detected!${colors.reset}\n`);
        console.log(`${colors.yellow}Possible causes:${colors.reset}`);
        console.log(`  • Firewall blocking Discord API`);
        console.log(`  • Network connectivity issues`);
        console.log(`  • Hosting provider restrictions`);
        console.log(`  • Discord API outage\n`);
        console.log(`${colors.yellow}Recommended actions:${colors.reset}`);
        console.log(`  1. Check https://discordstatus.com`);
        console.log(`  2. Contact your hosting provider about Discord API access`);
        console.log(`  3. Try from a different network\n`);
    }
    
    process.exit(0);
})();
