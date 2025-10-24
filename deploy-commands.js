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

if (!process.env.GUILD_ID) {
    console.error(`${colors.red}❌ Error: GUILD_ID not found in .env file${colors.reset}`);
    console.error(`${colors.yellow}💡 Add your test server's ID to .env as: GUILD_ID=your_server_id${colors.reset}`);
    console.error(`${colors.yellow}   You can get this by right-clicking your server and selecting "Copy Server ID"${colors.reset}`);
    console.error(`${colors.yellow}   (Developer Mode must be enabled in Discord settings)${colors.reset}`);
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}║     GUILD COMMAND DEPLOYMENT (INSTANT)         ║${colors.reset}`);
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

// Construct REST module with timeout
const rest = new REST({ timeout: 15000 }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    const startTime = Date.now();
    
    // Safety timeout - force exit after 30 seconds
    const timeoutId = setTimeout(() => {
        console.log(`\n${colors.yellow}⏱️  Deployment timeout (30s) reached.${colors.reset}`);
        console.log(`${colors.yellow}This usually indicates a network connectivity issue.${colors.reset}\n`);
        console.log(`${colors.red}Troubleshooting steps:${colors.reset}`);
        console.log(`  1. Check your internet connection`);
        console.log(`  2. Verify Discord API status at https://discordstatus.com`);
        console.log(`  3. Check if your firewall is blocking Discord API`);
        console.log(`  4. Try running the command again\n`);
        process.exit(1);
    }, 30000);

    try {
        console.log(`\n${colors.cyan}🚀 Deploying to Guild ID: ${colors.bright}${process.env.GUILD_ID}${colors.reset}`);
        console.log(`${colors.cyan}⏳ Registering ${commands.length} commands...${colors.reset}\n`);

        // Register commands to specific guild (instant updates!)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`${colors.green}${colors.bright}✅ SUCCESS!${colors.reset}`);
        console.log(`${colors.green}Successfully deployed ${data.length} commands in ${duration}s${colors.reset}`);
        console.log(`${colors.yellow}⚡ Commands are available IMMEDIATELY in your guild!${colors.reset}\n`);
        
        // List deployed commands
        console.log(`${colors.cyan}📋 Deployed Commands:${colors.reset}`);
        data.forEach((cmd, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, '0')}. /${cmd.name.padEnd(20)} ${cmd.description ? `- ${cmd.description}` : ''}`);
        });
        
        console.log(`\n${colors.green}🎉 Deployment complete! Exiting...${colors.reset}\n`);
        clearTimeout(timeoutId);
        process.exit(0);
        
    } catch (error) {
        clearTimeout(timeoutId);
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.error(`\n${colors.red}❌ Error deploying commands (after ${duration}s):${colors.reset}`, error.message);
        
        if (error.code === 50001) {
            console.error(`\n${colors.red}⚠️  Missing Access${colors.reset}`);
            console.error(`   • The bot is missing required permissions`);
            console.error(`   • Or CLIENT_ID is incorrect`);
        } else if (error.code === 10002) {
            console.error(`\n${colors.red}⚠️  Unknown Application${colors.reset}`);
            console.error(`   • Check that CLIENT_ID in .env is correct`);
        } else if (error.code === 50001) {
            console.error(`\n${colors.red}⚠️  Unknown Guild${colors.reset}`);
            console.error(`   • Check that GUILD_ID in .env is correct`);
            console.error(`   • Make sure the bot is in this server`);
        } else if (error.code === 'TOKEN_INVALID') {
            console.error(`\n${colors.red}⚠️  Invalid Token${colors.reset}`);
            console.error(`   • Check that DISCORD_TOKEN in .env is correct`);
        } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.error(`\n${colors.red}⚠️  Network Error${colors.reset}`);
            console.error(`   • Connection to Discord API timed out or was reset`);
            console.error(`   • Check your internet connection`);
            console.error(`   • Check Discord API status at https://discordstatus.com`);
            console.error(`   • Your firewall might be blocking the connection`);
        } else if (error.name === 'AbortError') {
            console.error(`\n${colors.red}⚠️  Request Timeout${colors.reset}`);
            console.error(`   • The request took longer than 15 seconds`);
            console.error(`   • This is likely a network issue`);
            console.error(`   • Try running the command again`);
        } else {
            console.error(`\n${colors.red}⚠️  Unexpected Error${colors.reset}`);
            console.error(`   • Error code: ${error.code || 'N/A'}`);
            console.error(`   • Error name: ${error.name || 'N/A'}`);
        }
        
        console.error(`\n${colors.yellow}💡 Full error details:${colors.reset}`, error);
        process.exit(1);
    }
})();
