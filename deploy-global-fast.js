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
console.log(`${colors.cyan}${colors.bright}║      FAST INCREMENTAL DEPLOYMENT (DEBUG)       ║${colors.reset}`);
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

// Shorter timeout
const rest = new REST({ timeout: 10000 }).setToken(process.env.DISCORD_TOKEN);

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to post with timeout
async function postCommandWithTimeout(command, timeoutMs = 10000) {
    return Promise.race([
        rest.post(Routes.applicationCommands(process.env.CLIENT_ID), { body: command }),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
    ]);
}

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
                    await wait(100);
                } catch (error) {
                    console.log(`${colors.red}  ✗ Failed to delete ${cmd.name}: ${error.message}${colors.reset}`);
                }
            }
            console.log(`${colors.green}✓ Cleared all existing commands${colors.reset}\n`);
        }
        
        // Now register commands one by one with progress tracking
        console.log(`${colors.cyan}📤 Step 3: Registering ${commands.length} commands...${colors.reset}`);
        console.log(`${colors.yellow}Estimated time: ${Math.ceil(commands.length * 1.5)} seconds${colors.reset}\n`);
        
        let successCount = 0;
        let failCount = 0;
        const failed = [];
        const startTime = Date.now();
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            const progress = `[${i + 1}/${commands.length}]`;
            
            process.stdout.write(`${colors.cyan}${progress} Registering ${command.name}...${colors.reset}`);
            
            try {
                await postCommandWithTimeout(command, 10000);
                process.stdout.write(`\r${colors.green}${progress} ✓ ${command.name.padEnd(30)}${colors.reset}\n`);
                successCount++;
                
                // Wait between commands to avoid rate limits
                if (i < commands.length - 1) {
                    await wait(1000); // 1 second between commands
                }
            } catch (error) {
                process.stdout.write(`\r${colors.red}${progress} ✗ ${command.name.padEnd(30)}${colors.reset}\n`);
                console.log(`${colors.red}  Error: ${error.message}${colors.reset}`);
                failCount++;
                failed.push(command.name);
                
                // If rate limited, wait longer
                if (error.code === 429 || error.message.includes('rate')) {
                    const waitTime = error.retryAfter || 10000;
                    console.log(`${colors.yellow}  ⏳ Rate limited, waiting ${waitTime}ms...${colors.reset}`);
                    await wait(waitTime);
                    
                    // Retry once
                    try {
                        process.stdout.write(`${colors.yellow}  Retrying ${command.name}...${colors.reset}`);
                        await postCommandWithTimeout(command, 10000);
                        process.stdout.write(`\r${colors.green}  ✓ Retry successful: ${command.name.padEnd(30)}${colors.reset}\n`);
                        successCount++;
                        failCount--;
                        failed.pop();
                    } catch (retryError) {
                        process.stdout.write(`\r${colors.red}  ✗ Retry failed${colors.reset}\n`);
                    }
                } else if (error.message === 'Request timeout') {
                    console.log(`${colors.yellow}  Skipping due to timeout, continuing...${colors.reset}`);
                    await wait(2000);
                }
            }
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║            DEPLOYMENT SUMMARY                  ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}`);
        console.log(`${colors.green}✓ Successful: ${successCount}/${commands.length}${colors.reset}`);
        if (failCount > 0) {
            console.log(`${colors.red}✗ Failed: ${failCount}${colors.reset}`);
            console.log(`${colors.red}  Failed commands: ${failed.join(', ')}${colors.reset}`);
        }
        console.log(`${colors.cyan}⏱️  Time: ${duration}s${colors.reset}\n`);
        
        // Verify final state
        console.log(`${colors.cyan}🔍 Verifying deployment...${colors.reset}`);
        await wait(3000);
        const finalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.green}✓ Verified: ${finalCommands.length} global commands registered${colors.reset}\n`);
        
        if (finalCommands.length >= commands.length - failCount) {
            console.log(`${colors.green}${colors.bright}✅ DEPLOYMENT COMPLETE!${colors.reset}`);
            console.log(`${colors.yellow}⏱️  Commands will propagate globally in 10-60 minutes${colors.reset}`);
            console.log(`${colors.cyan}🎖️  Badge: Active${colors.reset}\n`);
        } else {
            console.log(`${colors.yellow}⚠️  Partial deployment: ${finalCommands.length}/${commands.length} commands${colors.reset}\n`);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, error.message);
        console.error(error);
        process.exit(1);
    }
})();
