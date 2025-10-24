const { REST, Routes } = require('discord.js');
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
console.log(`${colors.cyan}${colors.bright}║        DISCORD API ENDPOINT DIAGNOSTICS        ║${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);

const rest = new REST({ timeout: 15000 }).setToken(process.env.DISCORD_TOKEN);

// Simple test command
const testCommand = {
    name: 'ping',
    description: 'Test command for diagnostics',
    type: 1
};

(async () => {
    console.log(`${colors.cyan}Test 1: GET application info${colors.reset}`);
    try {
        const startTime = Date.now();
        const app = await rest.get(`/applications/${process.env.CLIENT_ID}`);
        const duration = Date.now() - startTime;
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        console.log(`  App: ${app.name}`);
        console.log(`  ID: ${app.id}`);
        console.log(`  Bot public: ${app.bot_public}`);
        console.log(`  Bot require code grant: ${app.bot_require_code_grant}\n`);
    } catch (error) {
        console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}\n`);
    }

    console.log(`${colors.cyan}Test 2: GET global commands${colors.reset}`);
    try {
        const startTime = Date.now();
        const commands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        const duration = Date.now() - startTime;
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        console.log(`  Current commands: ${commands.length}\n`);
    } catch (error) {
        console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}\n`);
    }

    console.log(`${colors.cyan}Test 3: GET guild commands (${process.env.GUILD_ID})${colors.reset}`);
    try {
        const startTime = Date.now();
        const commands = await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID));
        const duration = Date.now() - startTime;
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        console.log(`  Guild commands: ${commands.length}\n`);
    } catch (error) {
        console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}\n`);
    }

    console.log(`${colors.cyan}Test 4: POST to guild (should work)${colors.reset}`);
    try {
        const startTime = Date.now();
        const result = await rest.post(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: testCommand }
        );
        const duration = Date.now() - startTime;
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        console.log(`  Created: ${result.name} (ID: ${result.id})\n`);
        
        // Clean up
        console.log(`${colors.yellow}  Cleaning up test command...${colors.reset}`);
        await rest.delete(Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, result.id));
        console.log(`${colors.green}  ✓ Deleted\n${colors.reset}`);
    } catch (error) {
        console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
        console.log(`  Code: ${error.code}`);
        console.log(`  Status: ${error.status}\n`);
    }

    console.log(`${colors.cyan}Test 5: POST to global (this is what's failing)${colors.reset}`);
    console.log(`${colors.yellow}Testing with 15 second timeout...${colors.reset}`);
    try {
        const startTime = Date.now();
        
        // Add a visual countdown
        const countdown = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(`\r${colors.yellow}  Waiting... ${elapsed}s${colors.reset}`);
        }, 100);
        
        const result = await rest.post(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: testCommand }
        );
        
        clearInterval(countdown);
        const duration = Date.now() - startTime;
        process.stdout.write(`\r${colors.green}✓ Success (${duration}ms)${colors.reset}\n`);
        console.log(`  Created: ${result.name} (ID: ${result.id})\n`);
        
        // Clean up
        console.log(`${colors.yellow}  Cleaning up test command...${colors.reset}`);
        await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, result.id));
        console.log(`${colors.green}  ✓ Deleted\n${colors.reset}`);
    } catch (error) {
        console.log(`\r${colors.red}✗ Failed: ${error.message}${colors.reset}`);
        console.log(`  Code: ${error.code || 'N/A'}`);
        console.log(`  Status: ${error.status || 'N/A'}`);
        console.log(`  Request method: ${error.method || 'N/A'}`);
        console.log(`  URL: ${error.url || 'N/A'}\n`);
    }

    console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}║                  CONCLUSION                    ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════╝${colors.reset}\n`);
    
    console.log(`${colors.yellow}If Test 4 succeeded but Test 5 failed/timed out:${colors.reset}`);
    console.log(`  • Guild endpoint works fine ✓`);
    console.log(`  • Global POST endpoint is blocked/rate-limited ✗`);
    console.log(`  • This affects your bot specifically, not just network\n`);
    
    console.log(`${colors.cyan}Possible causes:${colors.reset}`);
    console.log(`  1. Discord rate-limited your application due to too many failed attempts`);
    console.log(`  2. Bot lacks specific OAuth2 scopes for global commands`);
    console.log(`  3. Discord API is experiencing issues (check discordstatus.com)`);
    console.log(`  4. Application-level restriction from Discord\n`);
    
    console.log(`${colors.green}Recommended action:${colors.reset}`);
    console.log(`  Wait 1 hour and try again - rate limits usually reset`);
    console.log(`  In the meantime, use guild commands which work perfectly!\n`);

    process.exit(0);
})();
