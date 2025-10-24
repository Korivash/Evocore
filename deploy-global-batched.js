const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
console.log(`${colors.cyan}${colors.bright}║       BATCH GLOBAL DEPLOYMENT (5 AT A TIME)    ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log(`${colors.cyan}📦 Loading commands...${colors.reset}`);

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

const rest = new REST({ timeout: 30000 }).setToken(process.env.DISCORD_TOKEN);
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Split commands into batches of 5
const BATCH_SIZE = 5;
const batches = [];
for (let i = 0; i < commands.length; i += BATCH_SIZE) {
    batches.push(commands.slice(i, i + BATCH_SIZE));
}

console.log(`${colors.cyan}📦 Split into ${batches.length} batches of ${BATCH_SIZE} commands each${colors.reset}\n`);

(async () => {
    try {
        console.log(`${colors.cyan}🔍 Checking current status...${colors.reset}`);
        const current = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.yellow}Currently: ${current.length} global commands${colors.reset}\n`);
        
        let totalSuccess = 0;
        let totalFailed = 0;
        const allRegistered = [];
        
        for (let batchNum = 0; batchNum < batches.length; batchNum++) {
            const batch = batches[batchNum];
            console.log(`${colors.cyan}${colors.bright}Batch ${batchNum + 1}/${batches.length}${colors.reset} (${batch.length} commands)`);
            
            for (const command of batch) {
                try {
                    process.stdout.write(`  ${colors.cyan}Registering ${command.name}...${colors.reset}`);
                    
                    const result = await rest.post(
                        Routes.applicationCommands(process.env.CLIENT_ID),
                        { body: command }
                    );
                    
                    process.stdout.write(`\r  ${colors.green}✓ ${command.name.padEnd(30)}${colors.reset}\n`);
                    totalSuccess++;
                    allRegistered.push(result.name);
                    
                    // Small delay between commands in same batch
                    await wait(500);
                    
                } catch (error) {
                    process.stdout.write(`\r  ${colors.red}✗ ${command.name.padEnd(30)}${colors.reset}\n`);
                    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
                    totalFailed++;
                    
                    if (error.code === 429) {
                        const waitTime = error.retryAfter || 5000;
                        console.log(`    ${colors.yellow}Rate limited, waiting ${waitTime}ms...${colors.reset}`);
                        await wait(waitTime);
                    }
                }
            }
            
            // Longer delay between batches
            if (batchNum < batches.length - 1) {
                console.log(`  ${colors.yellow}Waiting 3 seconds before next batch...${colors.reset}\n`);
                await wait(3000);
            }
        }
        
        console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}║              DEPLOYMENT COMPLETE               ║${colors.reset}`);
        console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
        
        console.log(`${colors.green}✓ Successful: ${totalSuccess}/${commands.length}${colors.reset}`);
        if (totalFailed > 0) {
            console.log(`${colors.red}✗ Failed: ${totalFailed}${colors.reset}`);
        }
        
        // Verify
        console.log(`\n${colors.cyan}🔍 Verifying...${colors.reset}`);
        await wait(2000);
        const final = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`${colors.green}✓ Confirmed: ${final.length} global commands registered${colors.reset}\n`);
        
        if (final.length === commands.length) {
            console.log(`${colors.green}${colors.bright}🎉 ALL COMMANDS DEPLOYED SUCCESSFULLY!${colors.reset}`);
            console.log(`${colors.yellow}⏱️  Allow 10-60 minutes for propagation to all servers${colors.reset}`);
            console.log(`${colors.cyan}🎖️  Slash Commands Badge: Active${colors.reset}\n`);
        } else if (final.length > current.length) {
            console.log(`${colors.green}${colors.bright}✅ PARTIAL SUCCESS!${colors.reset}`);
            console.log(`${colors.yellow}Deployed ${final.length}/${commands.length} commands${colors.reset}\n`);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, error.message);
        process.exit(1);
    }
})();
