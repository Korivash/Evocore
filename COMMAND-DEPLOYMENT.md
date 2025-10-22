# Command Deployment Guide

## Overview

The `deploy-commands.js` script is a standalone tool for managing your bot's slash commands. It allows you to register, update, and clear commands without restarting your bot.

## Why Separate Deployment?

- **Faster Updates**: Update commands instantly without bot restart
- **Control**: Deploy globally or to specific guilds for testing
- **Clean Management**: Clear all commands when needed
- **Independent**: Run whenever you add/modify commands

## Usage

### 1. Deploy Commands Globally (Recommended for Production)

```bash
node deploy-commands.js
```

or

```bash
npm run deploy
```

**What it does:**
- Clears all existing global commands
- Registers all commands from the `/commands` folder
- Makes commands available in ALL servers

**Note:** Global commands take up to 1 hour to propagate across Discord.

### 2. Deploy to Specific Guild (Recommended for Testing)

```bash
node deploy-commands.js --guild YOUR_GUILD_ID
```

or

```bash
npm run deploy-guild YOUR_GUILD_ID
```

**What it does:**
- Clears guild-specific commands
- Registers commands instantly to that guild
- Perfect for testing new commands

**Advantage:** Commands appear immediately (no 1-hour wait)!

**Example:**
```bash
node deploy-commands.js --guild 123456789012345678
```

### 3. Clear All Commands

```bash
node deploy-commands.js --clear
```

or

```bash
npm run clear-commands
```

**What it does:**
- Removes ALL global commands
- Useful when troubleshooting or decommissioning

### 4. Get Help

```bash
node deploy-commands.js --help
```

Shows all available options and examples.

## When to Deploy Commands

### You SHOULD deploy when:
- ✅ Adding new commands
- ✅ Modifying command options (name, description, parameters)
- ✅ Changing command permissions
- ✅ First-time bot setup
- ✅ After updating command files

### You DON'T need to deploy when:
- ❌ Changing command logic/functionality (execute function)
- ❌ Fixing bugs in command code
- ❌ Updating command responses
- ❌ Modifying database queries

## Typical Workflow

### Development/Testing:
```bash
# 1. Make changes to a command
# 2. Deploy to your test server
node deploy-commands.js --guild 123456789012345678

# 3. Test immediately in Discord
# 4. Once satisfied, deploy globally
node deploy-commands.js
```

### Production Updates:
```bash
# 1. Test changes in development
# 2. Deploy globally when ready
node deploy-commands.js

# 3. Wait up to 1 hour for propagation
```

## Output Examples

### Successful Deployment:
```
🔄 Loading commands...

✅ Loaded: setup
✅ Loaded: config
✅ Loaded: kick
✅ Loaded: ban
... (more commands)

📊 Total commands loaded: 28

🗑️  Clearing all existing global commands...
✅ Successfully cleared all global commands

📤 Registering commands globally...
✅ Successfully registered 28 global slash commands!

📋 Registered commands:
   1. /setup - Initial setup for the bot in this server
   2. /config - Configure bot settings for your server
   3. /kick - Kick a member from the server
   ... (more commands)

🎉 Command deployment complete!
⏱️  Commands may take up to 1 hour to appear in all servers
```

### Guild Deployment:
```
📤 Registering commands to guild 123456789012345678...
✅ Successfully registered 28 guild commands!
⚡ Commands are available immediately in the guild
```

## Troubleshooting

### Error: "DISCORD_TOKEN not found"
**Problem:** Missing or incorrect .env file

**Solution:**
```bash
# Make sure .env exists and contains:
DISCORD_TOKEN=your_actual_bot_token
```

### Error: "Missing Access"
**Problem:** Bot doesn't have applications.commands scope

**Solution:**
1. Go to Discord Developer Portal
2. OAuth2 → URL Generator
3. Select `applications.commands` and `bot`
4. Re-invite bot with new URL

### Error: "Invalid Token"
**Problem:** Wrong or expired bot token

**Solution:**
1. Go to Discord Developer Portal
2. Bot section
3. Reset token
4. Update .env file with new token

### Commands Not Appearing
**Problem:** Global commands take time to propagate

**Solutions:**
- Wait up to 1 hour for global commands
- Use guild deployment for instant updates
- Try clearing Discord cache (Ctrl+Shift+R)
- Restart Discord client

### Duplicate Commands
**Problem:** Both guild and global commands registered

**Solution:**
```bash
# Clear global commands
node deploy-commands.js --clear

# Re-deploy globally
node deploy-commands.js
```

## Advanced Usage

### Multiple Environments

For development/production environments:

**Development:**
```bash
# Use test guild for instant updates
node deploy-commands.js --guild 123456789012345678
```

**Production:**
```bash
# Deploy globally for all servers
node deploy-commands.js
```

### Automated Deployment

Add to your deployment pipeline:

```bash
# In your CI/CD script
npm install
npm run deploy
npm start
```

### Checking Registered Commands

You can verify commands in Discord:
1. Type `/` in any channel
2. See which commands appear
3. Check command descriptions

Or check via Discord Developer Portal:
1. Go to your application
2. General Information
3. Install Link
4. View in server

## Command Structure

The script automatically loads commands from:
```
/commands/
  /admin/
  /moderation/
  /blizzard/
  /ai/
  /utility/
  /fun/
```

**Requirements for a command to be loaded:**
- File must be in `/commands/` (any subfolder)
- File must end with `.js`
- Must export `data` property (SlashCommandBuilder)
- Must export `execute` function

**Example:**
```javascript
module.exports = {
    data: new SlashCommandBuilder()
        .setName('example')
        .setDescription('An example command'),
    
    async execute(interaction) {
        // Command logic
    }
};
```

## Best Practices

1. **Test Locally First**
   - Deploy to test guild
   - Verify functionality
   - Then deploy globally

2. **Don't Over-Deploy**
   - Only deploy when changing command structure
   - Code changes don't require deployment

3. **Use Guild Deployment for Development**
   - Instant updates
   - No waiting period
   - Easy testing

4. **Keep Track of Changes**
   - Comment your command changes
   - Note when deployment is needed
   - Version control your command files

5. **Monitor Discord API**
   - Be aware of rate limits
   - Don't deploy too frequently
   - Wait between deployments if needed

## Scripts Summary

| Command | Action | Use Case |
|---------|--------|----------|
| `npm run deploy` | Deploy globally | Production |
| `npm run deploy-guild GUILD_ID` | Deploy to guild | Testing |
| `npm run clear-commands` | Clear all commands | Cleanup |
| `npm start` | Start bot | Normal operation |

## Notes

- The script does NOT start the bot
- It only registers/updates commands
- Your bot can be offline during deployment
- Changes to command logic don't require deployment
- Only structural changes need deployment

## Support

If commands still aren't appearing after deployment:
1. Check logs for errors
2. Verify bot has correct scopes
3. Ensure Discord token is valid
4. Wait full hour for global commands
5. Try guild deployment for instant testing

---

**Remember:** This script is separate from the main bot. Run it whenever you add or modify command structure, not when changing command behavior!
