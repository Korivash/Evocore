const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Load all command files
function loadCommands(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            loadCommands(itemPath);
        } else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if ('data' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Loaded: ${command.data.name}`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${item}:`, error.message);
            }
        }
    }
}

// Main deployment function with timeout handling
async function deployCommands() {
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ Error: DISCORD_TOKEN not found in .env file');
        process.exit(1);
    }

    console.log('🔄 Loading commands...\n');
    loadCommands(commandsPath);
    console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

    // Validate commands before deployment
    console.log('🔍 Validating command data...');
    for (const command of commands) {
        if (!command.name || !command.description) {
            console.error(`❌ Invalid command found: ${JSON.stringify(command).substring(0, 100)}`);
            process.exit(1);
        }
        // Check for oversized options
        if (command.options && JSON.stringify(command.options).length > 4000) {
            console.warn(`⚠️  Warning: ${command.name} has very large options data`);
        }
    }
    console.log('✅ All commands validated\n');

    const rest = new REST({ 
        version: '10',
        timeout: 60000 // 60 second timeout
    }).setToken(process.env.DISCORD_TOKEN);

    try {
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        console.log(`📝 Client ID: ${clientId}\n`);
        
        // Step 1: Clear existing commands with timeout
        console.log('🗑️  Clearing all existing global commands...');
        await Promise.race([
            rest.put(Routes.applicationCommands(clientId), { body: [] }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
            )
        ]);
        console.log('✅ Successfully cleared all global commands\n');

        // Step 2: Register new commands with timeout and progress
        console.log('📤 Registering commands globally...');
        console.log('⏳ This may take 30-60 seconds, please wait...\n');
        
        const startTime = Date.now();
        const data = await Promise.race([
            rest.put(Routes.applicationCommands(clientId), { body: commands }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout after 90 seconds')), 90000)
            )
        ]);
        const endTime = Date.now();

        console.log(`✅ Successfully registered ${data.length} global slash commands!`);
        console.log(`⏱️  Registration took ${Math.round((endTime - startTime) / 1000)} seconds\n`);
        
        console.log('📋 Registered commands:');
        data.forEach((cmd, index) => {
            console.log(`   ${index + 1}. /${cmd.name} - ${cmd.description}`);
        });

        console.log('\n🎉 Command deployment complete!');
        console.log('⏱️  Commands may take up to 1 hour to appear in all servers');
        console.log('💡 Tip: Use guild commands for instant updates during development\n');
        
    } catch (error) {
        console.error('\n❌ Error deploying commands:', error.message);
        
        if (error.message.includes('Timeout')) {
            console.error('\n⚠️  The request timed out. This could mean:');
            console.error('   1. Discord API is slow/down');
            console.error('   2. Your internet connection is unstable');
            console.error('   3. One of your commands has invalid data');
            console.error('\n💡 Try deploying to a test guild instead:');
            console.error('   node deploy-commands.js --guild YOUR_GUILD_ID');
        } else if (error.code === 50001) {
            console.error('\n⚠️  Missing Access: Make sure your bot has the applications.commands scope');
        } else if (error.code === 401) {
            console.error('\n⚠️  Invalid Token: Check your DISCORD_TOKEN in .env file');
        } else if (error.rawError?.message) {
            console.error('\n⚠️  Error details:', error.rawError.message);
        }
        
        console.error('\n📝 Debug info:');
        console.error(`   Commands to deploy: ${commands.length}`);
        console.error(`   Total size: ${JSON.stringify(commands).length} bytes`);
        
        process.exit(1);
    }
}

// Guild-specific deployment (faster, for testing)
async function deployToGuild(guildId) {
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ Error: DISCORD_TOKEN not found in .env file');
        process.exit(1);
    }

    console.log('🔄 Loading commands...\n');
    loadCommands(commandsPath);
    console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

    const rest = new REST({ 
        version: '10',
        timeout: 60000 
    }).setToken(process.env.DISCORD_TOKEN);

    try {
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        console.log(`🗑️  Clearing existing commands in guild ${guildId}...`);
        await Promise.race([
            rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);
        console.log('✅ Successfully cleared guild commands\n');

        console.log(`📤 Registering commands to guild ${guildId}...`);
        const data = await Promise.race([
            rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
        ]);

        console.log(`✅ Successfully registered ${data.length} guild commands!`);
        console.log('⚡ Commands are available immediately in the guild\n');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error.message);
        
        if (error.code === 50001) {
            console.error('\n⚠️  Bot is not in this guild or lacks permissions');
        }
        
        process.exit(1);
    }
}

// CLI interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Discord Bot Command Deployment Tool

Usage:
  node deploy-commands.js              Deploy commands globally
  node deploy-commands.js --guild ID   Deploy to specific guild (faster for testing)
  node deploy-commands.js --clear      Clear all global commands
  node deploy-commands.js --help       Show this help message

Examples:
  node deploy-commands.js
  node deploy-commands.js --guild 123456789012345678
  node deploy-commands.js --clear

Notes:
  - Global deployment takes up to 1 hour to propagate
  - Guild deployment is instant (recommended for testing)
  - Requires DISCORD_TOKEN in .env file
  - Bot must have applications.commands scope

Troubleshooting:
  If deployment times out:
  1. Try guild deployment instead (much faster)
  2. Check your internet connection
  3. Verify Discord API status
  4. Check for invalid command data
    `);
    process.exit(0);
}

if (args.includes('--clear')) {
    (async () => {
        const rest = new REST({ version: '10', timeout: 30000 }).setToken(process.env.DISCORD_TOKEN);
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        console.log('🗑️  Clearing all global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✅ All global commands cleared\n');
    })().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
} else if (args.includes('--guild')) {
    const guildIndex = args.indexOf('--guild');
    const guildId = args[guildIndex + 1];
    
    if (!guildId) {
        console.error('❌ Error: Please provide a guild ID');
        console.log('Usage: node deploy-commands.js --guild YOUR_GUILD_ID');
        process.exit(1);
    }
    
    deployToGuild(guildId);
} else {
    deployCommands();
}
