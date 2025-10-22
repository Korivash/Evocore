# Discord Bot - Multi-Purpose Bot with Blizzard API & AI Integration

A comprehensive Discord bot featuring full moderation capabilities, Blizzard API integration for game lookups, Gemini AI support, and much more!

## 🌟 Features

### 🛡️ Moderation
- Complete moderation suite (kick, ban, mute, warn)
- Temporary bans with automatic unbanning
- Warning system with automatic actions
- Message purging and bulk deletion
- Channel management (lock/unlock, slowmode)
- Comprehensive moderation logging

### 🤖 Auto-Moderation
- Anti-spam detection
- Link filtering
- Discord invite filtering
- Bad word filtering
- Excessive caps detection
- Mass mention protection
- Automatic warning and muting for violations

### 🎮 Blizzard API Integration
- **World of Warcraft**: Character profiles, Mythic+ stats, PvP ratings, realm status, token prices
- **Diablo 4**: Character lookups
- **Overwatch**: Player profiles and statistics
- **Hearthstone**: Card searches
- **StarCraft 2**: Player profiles
- Intelligent caching system for faster responses

### 🤖 Gemini AI Integration
- Natural language Q&A
- Conversational AI chat
- Image analysis
- Content moderation using AI
- Text summarization
- Language translation
- Creative content generation

### 📊 Leveling & XP System
- Automatic XP gain from messages
- Level progression
- Server leaderboards
- Rank cards

### ⚙️ Customization
- Custom commands per guild
- Configurable welcome/goodbye messages
- Auto-roles for new members
- Per-guild settings and preferences

### 📈 Statistics & Analytics
- Command usage tracking
- User activity monitoring
- Server statistics
- Detailed logging system

## 🚀 Installation

### Prerequisites
- Node.js 16.x or higher
- MySQL 5.7 or higher
- Discord Bot Token
- (Optional) Blizzard API credentials
- (Optional) Google Gemini API key

### Step 1: Clone and Install

```bash
# Extract the zip file to your desired location
cd discord-bot

# Install dependencies
npm install
```

### Step 2: Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE discord_bot;
```

2. The bot will automatically create all necessary tables on first run.

### Step 3: Configuration

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` and fill in your credentials:

```env
# Required
DISCORD_TOKEN=your_discord_bot_token_here
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=discord_bot

# Optional (for Blizzard features)
BLIZZARD_CLIENT_ID=your_blizzard_client_id
BLIZZARD_CLIENT_SECRET=your_blizzard_client_secret
BLIZZARD_REGION=us
BLIZZARD_LOCALE=en_US

# Optional (for AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
LOG_LEVEL=info
BOT_PREFIX=!
```

### Step 4: Getting API Keys

#### Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token
5. Enable "Message Content Intent", "Server Members Intent", and "Presence Intent"

#### Blizzard API (Optional)
1. Go to [Blizzard Developer Portal](https://develop.battle.net/)
2. Create a new client
3. Copy the Client ID and Client Secret

#### Google Gemini API (Optional)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy the key

### Step 5: Run the Bot

```bash
# Start the bot
node index.js
```

For production on Windows VPS:
```bash
# Install pm2 globally
npm install -g pm2

# Start with pm2
pm2 start index.js --name discord-bot

# Save the process list
pm2 save

# Setup startup script
pm2 startup
```

## 📝 First Time Setup

1. Invite the bot to your server with proper permissions
2. Run `/setup` command as an administrator
3. Configure channels and roles:
   - Mod log channel for moderation logs
   - Welcome channel for new member messages
   - Goodbye channel for member leave messages
   - Mute role for muting members
   - Auto role for new members

4. Use `/config` to fine-tune settings:
   - Enable/disable auto-moderation
   - Set warning thresholds
   - Customize welcome/goodbye messages
   - Enable Blizzard API features

## 🎮 Command List

### Admin Commands
- `/setup` - Initial bot setup for your server
- `/config view` - View current configuration
- `/config automod` - Configure auto-moderation
- `/config warnings` - Set warning thresholds
- `/config welcome` - Set welcome message
- `/config goodbye` - Set goodbye message

### Moderation Commands
- `/kick <user> [reason]` - Kick a member
- `/ban <user> [reason] [duration]` - Ban a member (with optional temp ban)
- `/unban <user>` - Unban a user
- `/warn <user> <reason>` - Warn a member
- `/warnings <user>` - View user's warnings
- `/clearwarnings <user>` - Clear user's warnings
- `/mute <user> [duration] [reason]` - Mute a member
- `/unmute <user>` - Unmute a member
- `/clear <amount>` - Delete messages
- `/slowmode <seconds>` - Set channel slowmode
- `/lock [channel]` - Lock a channel
- `/unlock [channel]` - Unlock a channel
- `/modlogs [user]` - View moderation logs

### Blizzard Commands
- `/wow-character <realm> <name>` - Look up WoW character
- `/wow-mythic <realm> <name>` - View Mythic+ profile
- `/wow-pvp <realm> <name>` - View PvP statistics
- `/wow-realm <realm>` - Check realm status
- `/wow-token` - View WoW token price
- `/d4-character <battletag> <id>` - Diablo 4 character
- `/overwatch <battletag>` - Overwatch profile

### AI Commands (Gemini)
- `/ask <question>` - Ask AI a question
- `/chat <message>` - Have a conversation with AI
- `/imagine <type> <topic>` - Generate creative content
- `/translate <language> <text>` - Translate text
- `/summarize <text>` - Summarize text

### Utility Commands
- `/help` - Show all commands
- `/serverinfo` - Display server information
- `/userinfo [user]` - Display user information
- `/avatar [user]` - Get user's avatar
- `/level [user]` - Check level and XP
- `/leaderboard` - View server leaderboard
- `/stats` - Bot statistics

### Fun Commands
- `/8ball <question>` - Ask the magic 8-ball
- `/coinflip` - Flip a coin
- `/roll [sides]` - Roll dice
- `/meme` - Get a random meme

## 🗂️ Project Structure

```
discord-bot/
├── commands/
│   ├── admin/          # Admin commands
│   ├── moderation/     # Moderation commands
│   ├── blizzard/       # Blizzard API commands
│   ├── ai/             # AI-powered commands
│   ├── utility/        # Utility commands
│   └── fun/            # Fun commands
├── database/
│   └── database.js     # Database handler
├── events/
│   ├── ready.js        # Bot ready event
│   ├── guildCreate.js  # Guild join event
│   └── guildDelete.js  # Guild leave event
├── utils/
│   ├── logger.js       # Logging utility
│   ├── autoMod.js      # Auto-moderation
│   ├── blizzard.js     # Blizzard API wrapper
│   └── gemini.js       # Gemini AI wrapper
├── logs/               # Log files
├── .env                # Configuration (create from .env.example)
├── .env.example        # Example configuration
├── index.js            # Main bot file
├── package.json        # Dependencies
└── README.md           # This file
```

## 🔒 Permissions

The bot requires the following permissions:
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- Kick Members
- Ban Members
- Manage Messages
- Manage Roles
- Manage Channels
- Moderate Members (Timeout)

## 🐛 Troubleshooting

### Bot not responding to commands
- Ensure the bot has proper permissions in the server
- Check that you've run `/setup` in the server
- Verify the bot token is correct in `.env`

### Database connection errors
- Ensure MySQL is running
- Check database credentials in `.env`
- Verify the database exists

### Blizzard API errors
- Verify your API credentials are correct
- Check that the region is set properly (`us`, `eu`, `kr`, `tw`)
- Some endpoints may require specific OAuth scopes

### AI features not working
- Ensure GEMINI_API_KEY is set in `.env`
- Check your Gemini API quota/limits
- Verify the API key is valid

## 📊 Database Schema

The bot automatically creates the following tables:
- `guild_config` - Server configurations
- `mod_logs` - Moderation action logs
- `warnings` - User warnings
- `temp_bans` - Temporary ban data
- `command_stats` - Command usage statistics
- `automod_violations` - Auto-mod violation logs
- `blizzard_cache` - Cached Blizzard API responses
- `user_levels` - User XP and levels
- `custom_commands` - Server-specific custom commands

## 🤝 Support

For issues, questions, or suggestions:
- Check the logs in the `logs/` directory
- Review the console output for errors
- Ensure all environment variables are properly set

## 📜 License

This project is provided as-is for your use.

## 🎉 Features Coming Soon

- Music playback
- Tickets system
- Reaction roles
- Giveaways
- Economy system
- More game integrations

---

**Note**: Remember to never share your `.env` file or commit it to version control!

## 🏅 Discord Auto Mod Badge Qualification

This bot is designed to qualify for Discord's Auto Moderator badge. It includes:

### Required Features:
- ✅ **Comprehensive Moderation**: Kick, ban, mute, warn, timeout
- ✅ **Auto-Moderation**: Spam, links, invites, bad words, caps, mentions
- ✅ **Phishing Protection**: Automatic detection and removal
- ✅ **Raid Protection**: Anti-spam with progressive punishment
- ✅ **Logging**: Complete audit trail of all actions
- ✅ **Customizable**: Per-server configuration
- ✅ **Reliable**: Production-tested with error handling

### Advanced Auto-Mod Features:
- Spam detection (5 messages in 5 seconds)
- Link filtering with permission bypass
- Discord invite blocking
- Phishing attempt detection (free nitro scams, etc.)
- Bad word filtering
- Excessive caps detection (70%+ threshold)
- Mass mention protection (5+ mentions)
- Progressive punishment (warn → mute → ban)
- Real-time moderator alerts for serious threats

## 🚀 Command Deployment

This bot includes a separate command deployment system (`deploy-commands.js`):

### Quick Deploy:
```bash
# Deploy all commands globally
npm run deploy

# Deploy to specific guild (instant, for testing)
npm run deploy-guild YOUR_GUILD_ID

# Clear all commands
npm run clear-commands
```

### Why Separate Deployment?
- Update commands without restarting the bot
- Test commands in specific servers instantly
- Deploy globally when ready (takes up to 1 hour)
- Clean command management

See [COMMAND-DEPLOYMENT.md](COMMAND-DEPLOYMENT.md) for detailed instructions.

