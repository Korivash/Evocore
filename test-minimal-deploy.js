const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Prevent database initialization
process.env.SKIP_DB_INIT = 'true';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

console.log(`${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║       MINIMAL DEPLOYMENT TEST (NO FILES)       ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}\n`);

// Create a simple test command manually
const testCommand = {
    name: 'test-deployment',
    description: 'Test command to verify deployment works',
    type: 1 // CHAT_INPUT
};

console.log(`${colors.cyan}📦 Creating test command: /test-deployment${colors.reset}`);
console.log(`${colors.yellow}This will REPLACE all existing commands with just this one test command!${colors.reset}`);
console.log(`${colors.yellow}Press Ctrl+C now if you don't want to proceed...${colors.reset}\n`);

// Wait 3 seconds
setTimeout(async () => {
    const rest = new REST({ timeout: 30000 }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log(`${colors.cyan}🚀 Deploying test command globally...${colors.reset}`);
        const startTime = Date.now();
        
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [testCommand] },
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`${colors.green}✅ SUCCESS! Deployed in ${duration}s${colors.reset}`);
        console.log(`${colors.green}Global deployment endpoint is working!${colors.reset}\n`);
        console.log(`${colors.yellow}The issue is with loading your command files, not the API.${colors.reset}\n`);
        
        console.log(`${colors.cyan}Next steps:${colors.reset}`);
        console.log(`1. One of your command files is blocking the event loop`);
        console.log(`2. Check your exp.js command for async initialization`);
        console.log(`3. Check any Gemini AI initialization in your commands`);
        console.log(`4. After fixing, run deploy-global-commands.js again\n`);
        
        process.exit(0);
    } catch (error) {
        console.log(`${colors.red}❌ Failed: ${error.message}${colors.reset}`);
        
        if (error.message.includes('TIMEOUT') || error.code === 'ETIMEDOUT') {
            console.log(`${colors.yellow}\nThe timeout happened even without loading commands.${colors.reset}`);
            console.log(`${colors.yellow}This IS a network/API issue after all.${colors.reset}\n`);
        }
        
        process.exit(1);
    }
}, 3000);
