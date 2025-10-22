# Windows VPS Deployment Guide

## Prerequisites on Windows VPS (45.141.24.144)

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Install LTS version (16.x or higher)
   - Verify installation: `node --version` and `npm --version`

2. **Install MySQL**
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or install XAMPP/WAMP which includes MySQL
   - Remember your root password

3. **Install Git (Optional)**
   - Download from: https://git-scm.com/download/win
   - Useful for version control

## Step-by-Step Deployment

### 1. Extract Files
Extract the bot files to a directory, e.g., `C:\DiscordBot\`

### 2. Install Dependencies
Open Command Prompt or PowerShell in the bot directory:
```cmd
cd C:\DiscordBot
npm install
```

### 3. Setup MySQL Database
Open MySQL Command Line or MySQL Workbench:
```sql
CREATE DATABASE discord_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Edit `.env` with Notepad or your preferred editor:

```env
# Discord Bot Token (REQUIRED)
# Get from: https://discord.com/developers/applications
DISCORD_TOKEN=your_discord_bot_token_here

# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=discord_bot

# Blizzard API (OPTIONAL)
# Get from: https://develop.battle.net/
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret
BLIZZARD_REGION=us
BLIZZARD_LOCALE=en_US

# Google Gemini AI (OPTIONAL)
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# Logging
LOG_LEVEL=info
```

### 5. Test Run
```cmd
node index.js
```

If everything is configured correctly, you should see:
```
Bot is ready! Logged in as YourBotName#1234
Database connected successfully
```

### 6. Setup as Windows Service (Production)

#### Option A: Using PM2 (Recommended)
```cmd
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Configure PM2 to start on Windows startup
pm2-startup install

# Start the bot
pm2 start index.js --name discord-bot

# Save the process list
pm2 save

# View bot status
pm2 status

# View logs
pm2 logs discord-bot

# Restart bot
pm2 restart discord-bot

# Stop bot
pm2 stop discord-bot
```

#### Option B: Using NSSM (Non-Sucking Service Manager)
1. Download NSSM from: https://nssm.cc/download
2. Extract nssm.exe to a folder
3. Open Command Prompt as Administrator
4. Navigate to NSSM folder and run:
```cmd
nssm install DiscordBot "C:\Program Files\nodejs\node.exe" "C:\DiscordBot\index.js"
nssm set DiscordBot AppDirectory "C:\DiscordBot"
nssm start DiscordBot
```

### 7. Firewall Configuration
If you need to open ports (not usually necessary for Discord bots):
1. Open Windows Defender Firewall
2. Click "Advanced Settings"
3. Create Inbound Rules as needed

### 8. Bot Invite
Invite your bot to servers with this URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Replace `YOUR_BOT_CLIENT_ID` with your bot's client ID from the Discord Developer Portal.

### 9. First-Time Server Setup
Once the bot is in a server:
1. Make sure you have Administrator permission
2. Run: `/setup`
3. Configure channels and roles
4. Use `/config view` to verify settings

## Maintenance

### Updating the Bot
1. Stop the bot: `pm2 stop discord-bot`
2. Update files
3. Install any new dependencies: `npm install`
4. Restart: `pm2 restart discord-bot`

### Viewing Logs
- PM2: `pm2 logs discord-bot`
- File logs are in: `C:\DiscordBot\logs\`

### Backup Database
```cmd
mysqldump -u root -p discord_bot > backup.sql
```

### Restore Database
```cmd
mysql -u root -p discord_bot < backup.sql
```

## Troubleshooting

### Bot won't start
- Check `.env` file has correct values
- Verify MySQL is running
- Check `logs/error.log` for details

### Database connection failed
- Verify MySQL service is running
- Check database credentials in `.env`
- Ensure database exists: `CREATE DATABASE discord_bot;`

### Commands not registering
- Wait 1-2 minutes for Discord to sync commands
- Try restarting the bot
- Check bot has proper permissions in server

### Bot goes offline randomly
- Check Windows Event Viewer for system errors
- Ensure VPS has adequate RAM (minimum 2GB recommended)
- Check PM2 logs: `pm2 logs discord-bot --lines 100`

## Performance Tips

1. **Memory Management**
   - Recommended: 4GB RAM minimum for VPS
   - Monitor with: `pm2 monit`

2. **Database Optimization**
   - Run cleanup regularly (automatic daily at midnight)
   - Index important columns (done automatically)

3. **Caching**
   - Blizzard API responses are cached automatically
   - Cache duration configurable in code

## Security Tips

1. Never share your `.env` file
2. Use strong MySQL password
3. Keep Node.js and dependencies updated: `npm update`
4. Regularly backup your database
5. Monitor logs for suspicious activity

## Support Resources

- Node.js Docs: https://nodejs.org/docs/
- Discord.js Guide: https://discordjs.guide/
- MySQL Docs: https://dev.mysql.com/doc/
- PM2 Docs: https://pm2.keymetrics.io/docs/

---

**Server Information**
- IP: 45.141.24.144
- OS: Windows Server
- Recommended Directory: C:\DiscordBot\
