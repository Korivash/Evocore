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
console.log(`${colors.cyan}${colors.bright}║   INCREMENTAL GLOBAL DEPLOYMENT (ONE BY ONE)   ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log(`${colors.cyan}📦 Loading commands...${colors.reset}`);

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

const rest = new REST({ timeout: 15000 }).setToken(process.env.DISCORD_TOKEN);

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log(`${colors.cyan}🔍 Step 1: Getting current global commands...${colors.reset}`);
        const currentCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.yellow}Currently registered: ${currentCommands.length} command(s)${colors.reset}\n`);
        
        // Delete all existing commands first
        if (currentCommands.length > 0) {
            console.log(`${colors.yellow}🗑️  Step 2: Clearing existing commands...${colors.reset}`);
            for (const cmd of currentCommands) {
                try {
                    await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, cmd.id));
                    console.log(`${colors.green}  ✓ Deleted: ${cmd.name}${colors.reset}`);
                    await wait(100); // Small delay between deletions
                } catch (error) {
                    console.log(`${colors.red}  ✗ Failed to delete ${cmd.name}: ${error.message}${colors.reset}`);
                }
            }
            console.log(`${colors.green}✓ Cleared all existing commands${colors.reset}\n`);
        }
        
        // Now register commands one by one
        console.log(`${colors.cyan}📤 Step 3: Registering ${commands.length} commands (one at a time)...${colors.reset}`);
        console.log(`${colors.yellow}This will take about ${Math.ceil(commands.length * 0.5)} seconds...${colors.reset}\n`);
        
        let successCount = 0;
        let failCount = 0;
        const startTime = Date.now();
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            const progress = `[${i + 1}/${commands.length}]`;
            
            try {
                await rest.post(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: command }
                );
                console.log(`${colors.green}${progress} ✓ ${command.name}${colors.reset}`);
                successCount++;
                
                // Wait 500ms between commands to avoid rate limits
                if (i < commands.length - 1) {
                    await wait(500);
                }
            } catch (error) {
                console.log(`${colors.red}${progress} ✗ ${command.name}: ${error.message}${colors.reset}`);
                failCount++;
                
                // If we hit rate limit, wait longer
                if (error.code === 429) {
                    const retryAfter = error.retryAfter || 5000;
                    console.log(`${colors.yellow}  ⏳ Rate limited, waiting ${retryAfter}ms...${colors.reset}`);
                    await wait(retryAfter);
                    
                    // Retry this command
                    try {
                        await rest.post(
                            Routes.applicationCommands(process.env.CLIENT_ID),
                            { body: command }
                        );
                        console.log(`${colors.green}  ✓ Retry successful: ${command.name}${colors.reset}`);
                        successCount++;
                        failCount--;
                    } catch (retryError) {
                        console.log(`${colors.red}  ✗ Retry failed: ${retryError.message}${colors.reset}`);
                    }
                }
            }
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n${colors.cyan}📊 Deployment Summary:${colors.reset}`);
        console.log(`${colors.green}  ✓ Successful: ${successCount}${colors.reset}`);
        if (failCount > 0) {
            console.log(`${colors.red}  ✗ Failed: ${failCount}${colors.reset}`);
        }
        console.log(`${colors.cyan}  ⏱️  Time: ${duration}s${colors.reset}\n`);
        
        // Verify final state
        console.log(`${colors.cyan}🔍 Step 4: Verifying deployment...${colors.reset}`);
        await wait(2000); // Wait for Discord to process
        const finalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.green}✓ Verified: ${finalCommands.length} global commands registered${colors.reset}\n`);
        
        if (finalCommands.length === commands.length) {
            console.log(`${colors.green}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.green}${colors.bright}║          ✅ DEPLOYMENT SUCCESSFUL! ✅          ║${colors.reset}`);
            console.log(`${colors.green}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
            console.log(`${colors.green}All ${finalCommands.length} commands deployed globally!${colors.reset}`);
            console.log(`${colors.yellow}⏱️  Allow 10-60 minutes for propagation${colors.reset}`);
            console.log(`${colors.cyan}🎖️  Badge: Active${colors.reset}\n`);
        } else {
            console.log(`${colors.yellow}⚠️  Warning: Expected ${commands.length} but got ${finalCommands.length}${colors.reset}`);
            console.log(`${colors.yellow}Some commands may have failed to register.${colors.reset}\n`);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, error.message);
        console.error(error);
        process.exit(1);
    }
})();
