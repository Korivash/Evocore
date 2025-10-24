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
console.log(`${colors.cyan}${colors.bright}║      GLOBAL COMMAND DEPLOYMENT (RETRY)         ║${colors.reset}`);
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

// Helper function to verify deployment
async function verifyDeployment(rest, clientId) {
    try {
        const deployedCommands = await rest.get(Routes.applicationCommands(clientId));
        return deployedCommands.length;
    } catch (error) {
        console.log(`${colors.yellow}⚠️  Could not verify deployment: ${error.message}${colors.reset}`);
        return -1;
    }
}

// Helper function to deploy with retries
async function deployWithRetry(rest, clientId, commands, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`\n${colors.cyan}🌍 Deployment Attempt ${attempt}/${maxRetries}${colors.reset}`);
            console.log(`${colors.cyan}⏳ Registering ${commands.length} commands globally...${colors.reset}`);
            
            const startTime = Date.now();
            
            // Create a promise that will timeout
            const deployPromise = rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            
            // Race between deployment and timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT')), 25000)
            );
            
            const data = await Promise.race([deployPromise, timeoutPromise]);
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log(`${colors.green}✅ Deployment request sent successfully in ${duration}s${colors.reset}`);
            console.log(`${colors.cyan}🔍 Verifying deployment...${colors.reset}`);
            
            // Wait a moment for Discord to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify the deployment
            const deployedCount = await verifyDeployment(rest, clientId);
            
            if (deployedCount === commands.length) {
                console.log(`${colors.green}${colors.bright}✅ SUCCESS! Verified ${deployedCount} commands deployed globally!${colors.reset}`);
                return { success: true, data, duration };
            } else if (deployedCount > 0) {
                console.log(`${colors.yellow}⚠️  Partial deployment: ${deployedCount}/${commands.length} commands${colors.reset}`);
                if (attempt < maxRetries) {
                    console.log(`${colors.yellow}Retrying in 5 seconds...${colors.reset}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
            } else {
                console.log(`${colors.yellow}⚠️  Could not verify deployment${colors.reset}`);
                if (attempt < maxRetries) {
                    console.log(`${colors.yellow}Retrying in 5 seconds...${colors.reset}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
            }
            
            return { success: true, data, duration, verified: deployedCount };
            
        } catch (error) {
            if (error.message === 'TIMEOUT') {
                console.log(`${colors.yellow}⏱️  Deployment timed out after 25 seconds${colors.reset}`);
                
                // Still try to verify
                console.log(`${colors.cyan}🔍 Checking if commands were registered anyway...${colors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const deployedCount = await verifyDeployment(rest, clientId);
                if (deployedCount === commands.length) {
                    console.log(`${colors.green}✅ Success! Commands were registered despite timeout!${colors.reset}`);
                    return { success: true, verified: deployedCount };
                }
                
                if (attempt < maxRetries) {
                    console.log(`${colors.yellow}Retrying... (${attempt}/${maxRetries})${colors.reset}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
            } else {
                console.log(`${colors.red}❌ Error on attempt ${attempt}: ${error.message}${colors.reset}`);
                
                if (error.code === 50001) {
                    console.log(`${colors.red}⚠️  Permission error - check your CLIENT_ID and bot permissions${colors.reset}`);
                    return { success: false, error };
                } else if (error.code === 10002) {
                    console.log(`${colors.red}⚠️  Unknown application - check your CLIENT_ID in .env${colors.reset}`);
                    return { success: false, error };
                } else if (error.code === 'TOKEN_INVALID') {
                    console.log(`${colors.red}⚠️  Invalid token - check your DISCORD_TOKEN in .env${colors.reset}`);
                    return { success: false, error };
                }
                
                if (attempt < maxRetries) {
                    console.log(`${colors.yellow}Waiting 5 seconds before retry...${colors.reset}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
            }
        }
    }
    
    return { success: false, error: new Error('Max retries exceeded') };
}

// Construct REST module with longer timeout
const rest = new REST({ timeout: 30000 }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        // Check current deployment status first
        console.log(`\n${colors.cyan}🔍 Checking current deployment status...${colors.reset}`);
        const currentCount = await verifyDeployment(rest, process.env.CLIENT_ID);
        if (currentCount > 0) {
            console.log(`${colors.yellow}ℹ️  Currently deployed: ${currentCount} global commands${colors.reset}`);
        } else {
            console.log(`${colors.cyan}ℹ️  No global commands currently deployed${colors.reset}`);
        }
        
        const result = await deployWithRetry(rest, process.env.CLIENT_ID, commands);
        
        if (result.success) {
            console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.cyan}${colors.bright}║              DEPLOYMENT SUCCESS                ║${colors.reset}`);
            console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}`);
            
            if (result.data) {
                console.log(`\n${colors.green}📊 Deployed ${result.data.length} commands globally${colors.reset}`);
                console.log(`${colors.yellow}⏱️  Commands may take up to 1 hour to appear everywhere${colors.reset}`);
                console.log(`${colors.cyan}🎖️  You should now qualify for the Slash Commands badge!${colors.reset}\n`);
            } else if (result.verified > 0) {
                console.log(`\n${colors.green}📊 Verified ${result.verified} commands deployed globally${colors.reset}`);
                console.log(`${colors.yellow}⏱️  Commands may take up to 1 hour to appear everywhere${colors.reset}`);
                console.log(`${colors.cyan}🎖️  You should now qualify for the Slash Commands badge!${colors.reset}\n`);
            }
            
            console.log(`${colors.cyan}${colors.bright}NEXT STEPS:${colors.reset}`);
            console.log(`${colors.green}1.${colors.reset} Wait 10-60 minutes for full propagation`);
            console.log(`${colors.green}2.${colors.reset} Test in any server by typing /`);
            console.log(`${colors.green}3.${colors.reset} Check Discord Developer Portal for your badge\n`);
            
            process.exit(0);
        } else {
            console.log(`\n${colors.red}❌ Deployment failed after multiple attempts${colors.reset}`);
            console.log(`${colors.yellow}Please check:${colors.reset}`);
            console.log(`  • Your internet connection`);
            console.log(`  • Discord API status at https://discordstatus.com`);
            console.log(`  • Your .env file has correct DISCORD_TOKEN and CLIENT_ID`);
            console.log(`  • Your hosting provider allows Discord API access\n`);
            
            if (result.error) {
                console.log(`${colors.red}Error details:${colors.reset}`, result.error.message);
            }
            
            process.exit(1);
        }
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Unexpected error:${colors.reset}`, error);
        process.exit(1);
    }
})();
