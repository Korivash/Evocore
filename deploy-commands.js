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
            const command = require(itemPath);
            if ('data' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ Loaded: ${command.data.name}`);
            }
        }
    }
}

// Main deployment function
async function deployCommands() {
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ Error: DISCORD_TOKEN not found in .env file');
        process.exit(1);
    }

    console.log('🔄 Loading commands...\n');
    loadCommands(commandsPath);
    console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        console.log('🗑️  Clearing all existing global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✅ Successfully cleared all global commands\n');

        console.log('📤 Registering commands globally...');
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log(`✅ Successfully registered ${data.length} global slash commands!\n`);
        
        console.log('📋 Registered commands:');
        data.forEach((cmd, index) => {
            console.log(`   ${index + 1}. /${cmd.name} - ${cmd.description}`);
        });

        console.log('\n🎉 Command deployment complete!');
        console.log('⏱️  Commands may take up to 1 hour to appear in all servers');
        console.log('💡 Tip: Use guild commands for instant updates during development\n');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.error('\n⚠️  Missing Access: Make sure your bot has the applications.commands scope');
        } else if (error.code === 401) {
            console.error('\n⚠️  Invalid Token: Check your DISCORD_TOKEN in .env file');
        } else if (error.rawError?.message) {
            console.error('\n⚠️  Error details:', error.rawError.message);
        }
        
        process.exit(1);
    }
}

// Guild-specific deployment (for testing)
async function deployToGuild(guildId) {
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ Error: DISCORD_TOKEN not found in .env file');
        process.exit(1);
    }

    console.log('🔄 Loading commands...\n');
    loadCommands(commandsPath);
    console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        console.log(`🗑️  Clearing existing commands in guild ${guildId}...`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log('✅ Successfully cleared guild commands\n');

        console.log(`📤 Registering commands to guild ${guildId}...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log(`✅ Successfully registered ${data.length} guild commands!`);
        console.log('⚡ Commands are available immediately in the guild\n');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
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
  - Guild deployment is instant
  - Requires DISCORD_TOKEN in .env file
  - Bot must have applications.commands scope
    `);
    process.exit(0);
}

if (args.includes('--clear')) {
    (async () => {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        console.log('🗑️  Clearing all global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✅ All global commands cleared\n');
    })();
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
