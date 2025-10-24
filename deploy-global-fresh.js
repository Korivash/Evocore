const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Prevent database initialization
process.env.SKIP_DB_INIT = 'true';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bright: '\x1b[1m',
};

console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}║    FRESH GLOBAL DEPLOYMENT (CLEAN START)       ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log(`${colors.cyan}Step 1: Loading commands...${colors.reset}`);

// Load all command files
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`${colors.green}  ✓ ${command.data.name}${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.red}  ✗ ${file}: ${error.message}${colors.reset}`);
            }
        }
    }
}

console.log(`\n${colors.cyan}📊 Loaded ${commands.length} commands${colors.reset}\n`);

const rest = new REST({ timeout: 60000 }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        // Step 1: Check what's currently deployed
        console.log(`${colors.cyan}Step 2: Checking current global commands...${colors.reset}`);
        const currentCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.yellow}Found ${currentCommands.length} existing global command(s)${colors.reset}`);
        
        if (currentCommands.length > 0) {
            console.log(`${colors.yellow}Current commands:${colors.reset}`);
            currentCommands.forEach(cmd => {
                console.log(`  • ${cmd.name}`);
            });
        }
        
        // Step 2: Deploy all commands (this REPLACES the existing ones)
        console.log(`\n${colors.cyan}Step 3: Deploying ${commands.length} commands globally...${colors.reset}`);
        console.log(`${colors.yellow}⏳ Please wait (may take 30-60 seconds)...${colors.reset}\n`);
        
        const startTime = Date.now();
        
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`${colors.green}${colors.bright}✅ SUCCESS!${colors.reset}`);
        console.log(`${colors.green}Deployed ${data.length} commands in ${duration}s${colors.reset}\n`);
        
        // Verify deployment
        console.log(`${colors.cyan}Step 4: Verifying deployment...${colors.reset}`);
        const verifyCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.green}✓ Verified: ${verifyCommands.length} global commands registered${colors.reset}\n`);
        
        // Show what was deployed
        console.log(`${colors.cyan}📋 Deployed Commands:${colors.reset}`);
        data.forEach((cmd, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, '0')}. /${cmd.name}`);
        });
        
        console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}║               DEPLOYMENT COMPLETE              ║${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
        
        console.log(`${colors.green}✅ Global commands deployed successfully!${colors.reset}`);
        console.log(`${colors.yellow}⏱️  Allow 10-60 minutes for full propagation${colors.reset}`);
        console.log(`${colors.cyan}🎖️  Badge status: Active${colors.reset}`);
        console.log(`${colors.cyan}📍 Commands will appear in ALL servers soon${colors.reset}\n`);
        
        process.exit(0);
        
    } catch (error) {
        const duration = ((Date.now() - Date.now()) / 1000).toFixed(2);
        console.error(`\n${colors.red}❌ Deployment failed after ${duration}s${colors.reset}`);
        console.error(`${colors.red}Error: ${error.message}${colors.reset}\n`);
        
        if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
            console.log(`${colors.yellow}╔════════════════════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.yellow}║          VPS NETWORK LIMITATION DETECTED       ║${colors.reset}`);
            console.log(`${colors.yellow}╚════════════════════════════════════════════════╝${colors.reset}\n`);
            
            console.log(`${colors.cyan}Your VPS has network restrictions for this endpoint.${colors.reset}\n`);
            
            console.log(`${colors.bright}SOLUTION: Deploy from your local PC${colors.reset}`);
            console.log(`${colors.cyan}─────────────────────────────────────────${colors.reset}`);
            console.log(`1. Copy this script to your local machine`);
            console.log(`2. Copy your .env file`);
            console.log(`3. Copy the commands folder`);
            console.log(`4. Run: node deploy-global-fresh.js`);
            console.log(`5. Should complete in 1-2 seconds locally\n`);
            
            console.log(`${colors.yellow}Note: Guild commands work fine on your VPS!${colors.reset}`);
            console.log(`${colors.yellow}Only the global deployment endpoint is slow.${colors.reset}\n`);
        }
        
        console.error(`Full error:`, error);
        process.exit(1);
    }
})();
