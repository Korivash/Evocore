const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Prevent database initialization during deployment
process.env.SKIP_DB_INIT = 'true';

// ANSI Color Codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bright: '\x1b[1m',
};

// Validation
if (!process.env.DISCORD_TOKEN) {
    console.error(`${colors.red}❌ Error: DISCORD_TOKEN not found in .env file${colors.reset}`);
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error(`${colors.red}❌ Error: CLIENT_ID not found in .env file${colors.reset}`);
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}║    GLOBAL DEPLOYMENT (SINGLE OPERATION)        ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.cyan}🔧 Loading commands for deployment...${colors.reset}`);

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
                    console.log(`${colors.green}  ✓ Loaded: ${command.data.name}${colors.reset}`);
                } else {
                    console.log(`${colors.yellow}  ⚠ Skipped ${file}: missing "data" or "execute"${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.red}  ✗ Failed to load ${file}:${colors.reset}`, error.message);
            }
        }
    }
}

console.log(`\n${colors.cyan}📊 Total commands loaded: ${colors.bright}${commands.length}${colors.reset}`);

// Construct REST module with extended timeout
const rest = new REST({ timeout: 60000 }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n${colors.cyan}🔍 Checking current deployment status...${colors.reset}`);
        const currentCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.yellow}ℹ️  Currently deployed: ${currentCommands.length} global commands${colors.reset}`);
        
        console.log(`\n${colors.cyan}🌍 Deploying all ${commands.length} commands in a single operation...${colors.reset}`);
        console.log(`${colors.yellow}⚠️  This may take 30-60 seconds, please be patient...${colors.reset}\n`);
        
        const startTime = Date.now();
        
        // Deploy all commands at once with PUT (replaces all existing)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`${colors.green}${colors.bright}✅ SUCCESS!${colors.reset}`);
        console.log(`${colors.green}Deployed ${data.length} commands globally in ${duration}s${colors.reset}`);
        console.log(`${colors.yellow}⏱️  Commands may take up to 1 hour to appear everywhere${colors.reset}`);
        console.log(`${colors.cyan}🎖️  You should now qualify for the Slash Commands badge!${colors.reset}\n`);
        
        // List deployed commands
        console.log(`${colors.cyan}📋 Deployed Commands:${colors.reset}`);
        data.forEach((cmd, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, '0')}. /${cmd.name.padEnd(20)} ${cmd.description ? `- ${cmd.description.substring(0, 50)}` : ''}`);
        });
        
        console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}║                 NEXT STEPS                     ║${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}`);
        console.log(`${colors.green}1.${colors.reset} Wait 10-60 minutes for propagation`);
        console.log(`${colors.green}2.${colors.reset} Test in any server by typing /`);
        console.log(`${colors.green}3.${colors.reset} Visit Discord Developer Portal for your badge!`);
        console.log(`${colors.green}4.${colors.reset} Run node test-discord-connection.js to verify\n`);
        
        process.exit(0);
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Deployment failed:${colors.reset}`, error.message);
        
        if (error.code === 50001) {
            console.error(`\n${colors.red}⚠️  Missing Access${colors.reset}`);
            console.error(`   • The bot is missing required permissions`);
            console.error(`   • Or CLIENT_ID is incorrect`);
        } else if (error.code === 10002) {
            console.error(`\n${colors.red}⚠️  Unknown Application${colors.reset}`);
            console.error(`   • Check that CLIENT_ID in .env is correct`);
        } else if (error.code === 'TOKEN_INVALID') {
            console.error(`\n${colors.red}⚠️  Invalid Token${colors.reset}`);
            console.error(`   • Check that DISCORD_TOKEN in .env is correct`);
        } else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.error(`\n${colors.yellow}⚠️  Request Timeout${colors.reset}`);
            console.error(`   • The deployment took longer than 60 seconds`);
            console.error(`   • This is a network/connectivity issue`);
            console.error(`\n${colors.cyan}💡 Solutions:${colors.reset}`);
            console.error(`   1. Your VPS might have network restrictions`);
            console.error(`   2. Try deploying from your local machine instead`);
            console.error(`   3. Contact your VPS provider about Discord API access`);
            console.error(`   4. Use guild commands only (they work fine): node deploy-guild-commands.js`);
            console.error(`\n${colors.yellow}Note: Guild commands give you the same functionality${colors.reset}`);
            console.error(`${colors.yellow}and update instantly. Global commands just make them${colors.reset}`);
            console.error(`${colors.yellow}available in all servers, but take 1 hour to propagate.${colors.reset}`);
        } else {
            console.error(`\n${colors.red}⚠️  Unexpected Error${colors.reset}`);
            console.error(`   • Error: ${error.message}`);
            console.error(`   • Code: ${error.code || 'N/A'}`);
        }
        
        console.error(`\n${colors.yellow}Full error:${colors.reset}`, error);
        process.exit(1);
    }
})();
