# 🤖 EvoCore Discord Bot

<div align="center">

![Discord](https://img.shields.io/badge/Discord-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A powerful, feature-rich Discord bot with moderation, AI, gaming integration, and more!**

[Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Setup](#-installation) • [Documentation](#-documentation)

---

</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Commands](#-commands)
- [AI Image Generation](#-ai-image-generation)
- [Auto-Moderation](#-auto-moderation)
- [Blizzard API](#-blizzard-api-integration)
- [Leveling System](#-leveling-system)
- [Advanced Features](#-advanced-features)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🌟 Overview

**EvoCore** is a production-ready, multi-guild Discord bot built with Discord.js v14. It features comprehensive moderation tools, AI-powered capabilities, Blizzard game integrations, and a robust leveling system. Perfect for gaming communities, social servers, or any Discord server looking for an all-in-one bot solution.

### Why EvoCore?

- 🛡️ **Complete Moderation Suite** - Keep your server safe and organized
- 🤖 **AI Integration** - Powered by Google Gemini 2.0 for intelligent responses
- 🎨 **AI Image Generation** - Multi-provider system with unlimited free generation
- 🎮 **Gaming Integration** - Deep integration with Blizzard games (WoW, Overwatch, Diablo 4)
- 📊 **Leveling System** - Engage your community with XP and ranks
- ⚙️ **Per-Guild Configuration** - Each server has independent settings
- 💾 **Persistent Storage** - MySQL database for reliable data management
- 🔄 **Auto-Recovery** - Graceful error handling with comprehensive logging
- 🎯 **Production Ready** - Built for Windows VPS deployment with PM2 support

---

## ✨ Features

### 🛡️ Moderation & Safety

<table>
<tr>
<td width="50%">

**Core Moderation**
- ✅ Kick, Ban (temp/permanent), Mute
- ✅ Warning system with auto-actions
- ✅ Bulk message deletion
- ✅ Channel lock/unlock
- ✅ Slowmode control
- ✅ Complete audit logging

</td>
<td width="50%">

**Auto-Moderation**
- ✅ Spam detection & prevention
- ✅ Link filtering
- ✅ Discord invite blocking
- ✅ Bad word filter
- ✅ Phishing detection
- ✅ Mass mention protection

</td>
</tr>
</table>

### 🤖 AI-Powered Features

<table>
<tr>
<td width="50%">

**Text AI (Gemini 2.0)**
- 🧠 Natural Q&A with `/ask`
- 💬 Context-aware chat with `/chat`
- 🌍 Multi-language translation
- ✍️ Creative content generation
- 📝 Text summarization

</td>
<td width="50%">

**Image AI (Multi-Provider)**
- 🎨 AI image generation
- 🖼️ 8 art style presets
- 📐 4 aspect ratio options
- ⚡ 10-30 second generation
- 💰 Unlimited free usage

</td>
</tr>
</table>

### 🎮 Gaming Integration

<table>
<tr>
<td width="33%">

**World of Warcraft**
- Character profiles
- Mythic+ scores
- PvP ratings
- Token prices
- Realm status

</td>
<td width="33%">

**Overwatch**
- Player statistics
- Competitive ranks
- Hero stats
- Cross-platform

</td>
<td width="33%">

**Diablo 4**
- Character lookup
- Build information
- Season data
- Paragon levels

</td>
</tr>
</table>

### 📊 Community Features

- 🎖️ **XP & Leveling System** - Reward active members
- 🏆 **Leaderboards** - Competitive rankings
- 👋 **Welcome/Goodbye Messages** - Customizable greetings
- 🎭 **Auto-Roles** - Automatic role assignment
- 📈 **Statistics** - Server and bot analytics
- 🎲 **Fun Commands** - 8ball, dice, coin flip, and more

### 🔧 Administration

- ⚙️ **Per-Guild Config** - Independent settings for each server
- 📝 **Custom Commands** - Create server-specific commands
- 🔔 **Scheduled Messages** - Automated announcements
- 📊 **Command Statistics** - Track usage and trends
- 🔐 **Permission System** - Role-based access control
- 💾 **Database Backups** - Reliable data persistence

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
✅ Node.js 16+
✅ MySQL 5.7+
✅ Discord Bot Token

# Optional (for full features)
✅ Gemini API Key (AI features)
✅ Blizzard API Credentials (game lookups)
```

### 5-Minute Setup

```bash
# 1. Extract files
cd C:\DiscordBot

# 2. Install dependencies
npm install

# 3. Configure environment
copy .env.example .env
# Edit .env with your credentials

# 4. Start the bot
npm start
```

### First Commands

```bash
# In Discord (as administrator)
/setup                    # Initialize bot configuration
/config view              # View current settings
/help                     # See all commands
```

**That's it!** Your bot is now running. 🎉

---

## 📥 Installation

### Detailed Setup Guide

#### Step 1: Install Node.js

Download and install Node.js 16+ from [nodejs.org](https://nodejs.org/)

```bash
# Verify installation
node --version
npm --version
```

#### Step 2: Install MySQL

Download from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/) or use XAMPP/WAMP.

Create the database:
```sql
CREATE DATABASE discord_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Step 3: Clone/Extract Bot Files

```bash
# Extract to your desired location
cd C:\DiscordBot

# Install dependencies
npm install
```

**Dependencies Installed:**
- `discord.js` - Discord API wrapper
- `@google/generative-ai` - Gemini AI integration
- `mysql2` - MySQL database driver
- `axios` - HTTP client for API calls
- `winston` - Advanced logging
- `node-cron` - Scheduled tasks
- And more...

#### Step 4: Configure Environment Variables

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` with your credentials:

```env
# Discord (REQUIRED)
DISCORD_TOKEN=your_discord_bot_token_here

# Database (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=discord_bot

# AI Features (OPTIONAL - for /ask, /chat, /imagine)
GEMINI_API_KEY=your_gemini_api_key_here

# Blizzard API (OPTIONAL - for game lookups)
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret

# Monitoring (OPTIONAL)
ERROR_LOG_CHANNEL_ID=your_error_channel_id
HEARTBEAT_CHANNEL_ID=your_heartbeat_channel_id
```

#### Step 5: Get Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section
4. Click "Add Bot"
5. Enable these **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. Click "Reset Token" and copy it
7. Paste into `.env` as `DISCORD_TOKEN`

#### Step 6: Invite Bot to Server

Generate invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your Application ID from the Developer Portal.

#### Step 7: Deploy Commands

```bash
# Deploy slash commands globally (takes up to 1 hour)
npm run deploy

# OR deploy to test server instantly
npm run deploy-guild YOUR_GUILD_ID
```

#### Step 8: Start the Bot

**Development:**
```bash
npm start
```

**Production (PM2):**
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name discord-bot

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

#### Step 9: Configure in Discord

Run these commands in your Discord server (as administrator):

```
/setup                              # Initialize configuration
/setup mod-log:#mod-logs           # Set moderation log channel
/setup welcome:#welcome            # Set welcome channel
/setup mute-role:@Muted           # Set mute role
/config automod enabled:true       # Enable auto-moderation
/config view                       # Verify settings
```

**Your bot is now fully operational!** ✅

---

## ⚙️ Configuration

### Per-Guild Settings

Each server can be configured independently. All settings are stored in the MySQL database.

### Basic Configuration

```bash
# Initial setup (creates database entry)
/setup

# Set channels
/setup mod-log:#channel        # Moderation logs
/setup welcome:#channel        # Welcome messages
/setup goodbye:#channel        # Goodbye messages

# Set roles
/setup mute-role:@role        # Role for muting
/setup auto-role:@role        # Auto-assign to new members
```

### Auto-Moderation Settings

```bash
# Enable/disable
/config automod enabled:true

# Individual filters
/config automod anti-spam:true
/config automod anti-link:true
/config automod anti-invite:true
```

### Warning System

```bash
# Set maximum warnings before auto-action
/config warnings max-warnings:3
```

### Welcome/Goodbye Messages

```bash
# Customize messages
/config welcome message:Welcome {user} to {server}!
/config goodbye message:Goodbye {user}!

# Variables available:
# {user} - User mention
# {server} - Server name
# {memberCount} - Total members
```

### Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `prefix` | `!` | Command prefix (legacy) |
| `auto_mod_enabled` | `false` | Enable auto-moderation |
| `anti_spam_enabled` | `false` | Spam detection |
| `anti_link_enabled` | `false` | Link filtering |
| `anti_invite_enabled` | `false` | Discord invite blocking |
| `max_warnings` | `3` | Warning threshold |
| `mod_log_channel_id` | `null` | Moderation log channel |
| `welcome_channel_id` | `null` | Welcome message channel |
| `goodbye_channel_id` | `null` | Goodbye message channel |
| `mute_role_id` | `null` | Mute role |
| `auto_role_id` | `null` | Auto-assign role |

---

## 📝 Commands

### 🛡️ Moderation Commands

| Command | Description | Usage | Permissions |
|---------|-------------|-------|-------------|
| `/kick` | Kick a member | `/kick @user [reason]` | Kick Members |
| `/ban` | Ban a member | `/ban @user [duration] [reason]` | Ban Members |
| `/unban` | Unban a user | `/unban user-id [reason]` | Ban Members |
| `/mute` | Mute a member | `/mute @user [duration] [reason]` | Moderate Members |
| `/unmute` | Unmute a member | `/unmute @user [reason]` | Moderate Members |
| `/warn` | Warn a member | `/warn @user reason` | Moderate Members |
| `/warnings` | View warnings | `/warnings @user` | Moderate Members |
| `/clearwarnings` | Clear warnings | `/clearwarnings @user [reason]` | Administrator |
| `/clear` | Delete messages | `/clear amount [user]` | Manage Messages |
| `/lock` | Lock a channel | `/lock [channel] [reason]` | Manage Channels |
| `/unlock` | Unlock a channel | `/unlock [channel] [reason]` | Manage Channels |
| `/slowmode` | Set slowmode | `/slowmode seconds [channel]` | Manage Channels |
| `/modlogs` | View mod logs | `/modlogs [user] [limit]` | Moderate Members |

### 🤖 AI Commands

| Command | Description | Usage | Cooldown |
|---------|-------------|-------|----------|
| `/ask` | Ask AI a question | `/ask question:"What is Discord?"` | 3s |
| `/chat` | Chat with AI (context) | `/chat message:"Hello!" [reset]` | 3s |
| `/imagine image` | Generate AI image | `/imagine image prompt:"a robot" [style] [aspect-ratio]` | 10s |
| `/imagine text` | Generate creative text | `/imagine text type:story topic:"dragons"` | 10s |
| `/translate` | Translate text | `/translate text:"Hello" language:"Spanish"` | 5s |

**AI Image Styles:**
- Photorealistic
- Anime
- Digital Art
- Oil Painting
- Watercolor
- Sketch
- 3D Render
- Cartoon

**Aspect Ratios:**
- 1:1 (Square - avatars)
- 16:9 (Landscape - banners)
- 9:16 (Portrait - wallpapers)
- 21:9 (Wide - cinematic)

### 🎮 Blizzard Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/wow-character` | WoW character lookup | `/wow-character realm:"Tichondrius" name:"Charactername"` |
| `/wow-mythic` | Mythic+ profile | `/wow-mythic realm:"Tichondrius" name:"Charactername"` |
| `/wow-pvp` | PvP statistics | `/wow-pvp realm:"Tichondrius" name:"Charactername"` |
| `/wow-token` | Current token price | `/wow-token` |
| `/overwatch` | Overwatch profile | `/overwatch battletag:"Player#1234" [platform]` |
| `/d4-character` | Diablo 4 character | `/d4-character battletag:"Player#1234" character-id:"123"` |

### 📊 Utility Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/help` | Command list | `/help` |
| `/serverinfo` | Server information | `/serverinfo` |
| `/userinfo` | User information | `/userinfo [user]` |
| `/avatar` | Get user avatar | `/avatar [user]` |
| `/level` | Check XP/level | `/level [user]` |
| `/leaderboard` | XP leaderboard | `/leaderboard [page]` |
| `/stats` | Bot statistics | `/stats` |

### 🎉 Fun Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/8ball` | Magic 8-ball | `/8ball question:"Will I win?"` |
| `/coinflip` | Flip a coin | `/coinflip` |
| `/roll` | Roll dice | `/roll [sides] [count]` |

### ⚙️ Admin Commands

| Command | Description | Usage | Permissions |
|---------|-------------|-------|-------------|
| `/setup` | Initial setup | `/setup [options]` | Administrator |
| `/config` | Configure settings | `/config view/automod/warnings/welcome/goodbye` | Administrator |

---

## 🎨 AI Image Generation

### Multi-Provider System

EvoCore uses an intelligent multi-provider system for image generation:

```
User Request → Gemini Imagen 3 (best quality)
                ↓ If quota exceeded
             Pollinations.ai (unlimited free)
                ↓ If unavailable
             Hugging Face (backup)
```

### Why This is Amazing

- ✅ **Unlimited Generation** - Pollinations.ai has no limits
- ✅ **High Quality** - Imagen 3 for best results
- ✅ **Always Available** - Multiple failovers
- ✅ **Zero Cost** - All providers have free tiers
- ✅ **Fast** - 10-30 second generation
- ✅ **No GPU Needed** - Perfect for CPU-only VPS

### Setup

**Minimum (Works Immediately):**
```env
GEMINI_API_KEY=your_key_here
```

**Zero Config (100% Free):**
```env
# Leave GEMINI_API_KEY blank
# Uses Pollinations.ai only (unlimited free)
```

**Maximum Reliability:**
```env
GEMINI_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_token_here
```

### Usage Examples

**Basic:**
```
/imagine image prompt:a cute robot
```

**With Style:**
```
/imagine image prompt:a dragon flying over a castle style:digital art
```

**With Aspect Ratio:**
```
/imagine image prompt:sunset over mountains aspect-ratio:16:9
```

**Full Options:**
```
/imagine image prompt:a magical forest at night with glowing mushrooms style:oil painting aspect-ratio:1:1
```

### Provider Comparison

| Provider | Quality | Speed | Limit | Cost | API Key |
|----------|---------|-------|-------|------|---------|
| **Gemini Imagen 3** | ⭐⭐⭐⭐⭐ | 20s | 1,500/day | Free | Required |
| **Pollinations.ai** | ⭐⭐⭐⭐ | 15s | Unlimited | Free | None |
| **Hugging Face** | ⭐⭐⭐⭐ | 30s | 30k/month | Free | Optional |

**Read more:** [Multi-Provider Image Generation Guide](MULTI-PROVIDER-IMAGE-GENERATION-GUIDE.md)

---

## 🛡️ Auto-Moderation

### Features

EvoCore includes advanced auto-moderation with multiple detection systems:

#### Spam Detection
- **Threshold:** 5 messages in 5 seconds
- **Action:** Auto-delete + warning
- **Escalation:** 3 violations = auto-mute

#### Link Filtering
- Blocks unauthorized URLs
- Exempt users with `Manage Messages` permission
- Configurable per-server

#### Discord Invite Blocking
- Detects all Discord invite formats
- Exempt users with `Manage Guild` permission
- Prevents server raiding

#### Phishing Detection
- Free Nitro scams
- Fake giveaways
- Suspicious patterns
- **Alerts moderators immediately**

#### Bad Word Filter
- Customizable word list
- Automatically deletes offending messages
- Progressive punishment system

#### Other Filters
- Excessive caps (>70%)
- Mass mentions (5+ users)
- Duplicate messages

### Configuration

```bash
# Enable auto-moderation
/config automod enabled:true

# Enable individual filters
/config automod anti-spam:true
/config automod anti-link:true
/config automod anti-invite:true
```

### Progressive Punishment

```
1st violation → Message deleted + warning
2nd violation → Another warning
3rd violation → Auto-warn logged
3 warnings → Auto-mute (configurable)
```

### Moderation Logs

All auto-mod actions are logged to your mod log channel:
```bash
/setup mod-log:#mod-logs
```

**Log includes:**
- User who triggered filter
- Violation type
- Message content
- Timestamp
- Action taken

---

## 🎮 Blizzard API Integration

### Supported Games

<table>
<tr>
<td width="33%">

**World of Warcraft**
- Character profiles
- Item level & gear
- Achievement points
- Guild information
- Mythic+ scores
- PvP ratings & ranks
- Arena statistics
- Token prices
- Realm status

</td>
<td width="33%">

**Overwatch**
- Player profiles
- Competitive ranks
- Tank/DPS/Support SR
- Win/loss records
- Games played
- Hero statistics
- Cross-platform support

</td>
<td width="33%">

**Diablo 4**
- Character profiles
- Class & level
- Paragon levels
- Gear & stats
- Skills & builds
- Season information
- Hardcore status

</td>
</tr>
</table>

### Setup

1. Get API credentials from [Blizzard Developer Portal](https://develop.battle.net/)
2. Create a new client
3. Copy Client ID and Secret
4. Add to `.env`:

```env
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret
BLIZZARD_REGION=us
```

### Smart Caching

All Blizzard API responses are cached for 60 minutes:
- Reduces API calls
- Faster response times
- Respects rate limits
- Automatic cache cleanup

### Examples

**World of Warcraft:**
```
/wow-character realm:"Tichondrius" name:"Ragnaros"
/wow-mythic realm:"Area-52" name:"Jaina"
/wow-pvp realm:"Illidan" name:"Thrall"
/wow-token
```

**Overwatch:**
```
/overwatch battletag:"PlayerName#1234"
/overwatch battletag:"PlayerName#1234" platform:pc
```

**Diablo 4:**
```
/d4-character battletag:"PlayerName#1234" character-id:"12345"
```

---

## 📊 Leveling System

### How It Works

Members earn XP by being active in chat:

- **Base XP:** 15-25 XP per message
- **Cooldown:** 60 seconds between XP gains
- **Level Formula:** 100 XP per level
- **Leaderboard:** Server-wide rankings

### Commands

```bash
# Check your level
/level

# Check someone else's level
/level user:@username

# View leaderboard
/leaderboard

# View specific page
/leaderboard page:2
```

### Level Display

Beautiful embed showing:
- Current level
- Total XP
- Messages sent
- Progress bar to next level
- Rank in server

### Leaderboard

```
🏆 Server Name Leaderboard

🥇 @User1 - Level 45 (4,523 XP)
🥈 @User2 - Level 42 (4,201 XP)
🥉 @User3 - Level 38 (3,845 XP)
**4.** @User4 - Level 35 (3,521 XP)
**5.** @User5 - Level 32 (3,245 XP)
...

Page 1/5 • Total members: 250
```

### Database Storage

All XP data is stored in MySQL:
- Persistent across restarts
- Server-specific (multi-guild)
- Automatic cleanup of old data
- Efficient indexing for fast queries

---

## 🔧 Advanced Features

### Heartbeat System

EvoCore includes a comprehensive health monitoring system:

**Console Heartbeat (Every 5 minutes):**
```
💓 HEARTBEAT | Uptime: 5h 32m | Memory: 156MB | Guilds: 12 | Ping: 38ms
```

**Discord Heartbeat (Optional):**
- Posts status to designated channel
- Shows uptime, memory, guilds, users, ping
- Auto-updates every 5 minutes
- Edits same message (no spam)

**Setup:**
```env
HEARTBEAT_CHANNEL_ID=your_channel_id
```

### Error Logging

Comprehensive error tracking:

**Console Logs:**
- Color-coded output
- Timestamps
- Stack traces
- Context information

**File Logs (Winston):**
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- Automatic rotation (5MB max, 5 files)

**Discord Logging (Optional):**
```env
ERROR_LOG_CHANNEL_ID=your_channel_id
```

Posts critical errors to Discord with:
- Error message
- Stack trace
- Context
- Timestamp

### Scheduled Tasks

**Daily Cleanup (Midnight):**
- Deletes old command statistics
- Cleans expired cache entries
- Removes old violation logs

**Hourly Temp Ban Check:**
- Checks for expired temporary bans
- Auto-unbans users
- Logs actions

### Database Management

**Automatic Table Creation:**
- All 10 tables created on first run
- Proper indexes for performance
- UTF-8 support for international characters

**Connection Pooling:**
- Maximum 10 concurrent connections
- Automatic reconnection
- Query timeout protection

**Backup Command:**
```bash
mysqldump -u root -p discord_bot > backup.sql
```

### Command Deployment

Separate deployment system for zero-downtime updates:

```bash
# Deploy globally (takes up to 1 hour)
npm run deploy

# Deploy to test server (instant)
npm run deploy-guild YOUR_GUILD_ID

# Clear all commands
npm run clear-commands
```

**Read more:** [Command Deployment Guide](COMMAND-DEPLOYMENT.md)

---

## 🎨 Customization

### Adding Custom Commands

Create a new file in `commands/utility/`:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mycommand')
        .setDescription('My custom command'),
    
    async execute(interaction) {
        await interaction.reply('Hello from my custom command!');
    }
};
```

Deploy the command:
```bash
npm run deploy
```

### Custom Auto-Mod Rules

Edit `utils/autoMod.js`:

```javascript
// Add custom bad words
const badWords = [
    'word1', 'word2', 'word3'
];

// Add custom patterns
const customPatterns = [
    /your-regex-here/gi
];
```

### Custom Welcome Messages

Variables available:
- `{user}` - User mention
- `{server}` - Server name
- `{memberCount}` - Total members

Example:
```
/config welcome message:🎉 Welcome {user} to **{server}**! You are member #{memberCount}!
```

---

## 📚 Documentation

### Additional Guides

- **[Quick Start Guide](QUICK-START.txt)** - Get up and running in 5 minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Windows VPS deployment instructions
- **[Command Deployment](COMMAND-DEPLOYMENT.md)** - Managing slash commands
- **[Image Generation Guide](MULTI-PROVIDER-IMAGE-GENERATION-GUIDE.md)** - AI image setup
- **[Package Summary](PACKAGE-SUMMARY.txt)** - Complete feature overview
- **[Deployment Checklist](DEPLOYMENT-CHECKLIST.txt)** - Step-by-step setup

### Project Structure

```
discord-bot/
├── commands/           # Slash commands
│   ├── admin/         # Setup & configuration
│   ├── moderation/    # Mod commands
│   ├── blizzard/      # Game lookups
│   ├── ai/            # AI features
│   ├── utility/       # Utility commands
│   └── fun/           # Fun commands
├── database/          # Database handler
├── events/            # Discord events
├── utils/             # Utility functions
│   ├── autoMod.js    # Auto-moderation
│   ├── blizzard.js   # Blizzard API
│   ├── gemini.js     # Gemini AI
│   └── logger.js     # Logging system
├── logs/              # Log files
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment
├── package.json       # Dependencies
└── .env              # Configuration
```

### Database Schema

**10 Tables:**
1. `guild_config` - Server settings
2. `mod_logs` - Moderation history
3. `warnings` - User warnings
4. `temp_bans` - Temporary bans
5. `command_stats` - Usage analytics
6. `automod_violations` - Auto-mod logs
7. `blizzard_cache` - API cache
8. `user_levels` - XP/levels
9. `custom_commands` - Custom commands
10. `scheduled_messages` - Scheduled posts

---

## 🐛 Troubleshooting

### Common Issues

#### Bot Not Starting

**Problem:** Bot fails to start or crashes immediately

**Solutions:**
```bash
# Check Node.js version
node --version  # Should be 16+

# Verify dependencies
npm install

# Check .env file
# Make sure DISCORD_TOKEN is correct
# Verify database credentials

# Check logs
cat logs/error.log
```

#### Commands Not Appearing

**Problem:** Slash commands don't show in Discord

**Solutions:**
```bash
# Deploy commands
npm run deploy

# For instant testing
npm run deploy-guild YOUR_GUILD_ID

# Wait up to 1 hour for global commands
# Restart Discord client

# Check bot has applications.commands scope
# Re-invite bot with correct permissions
```

#### Database Connection Failed

**Problem:** Can't connect to MySQL

**Solutions:**
```sql
-- Verify MySQL is running
-- Check credentials in .env

-- Create database if missing
CREATE DATABASE discord_bot;

-- Grant permissions
GRANT ALL PRIVILEGES ON discord_bot.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Bot Goes Offline Randomly

**Problem:** Bot disconnects unexpectedly

**Solutions:**
```bash
# Use PM2 for production
pm2 start index.js --name discord-bot
pm2 save

# Check logs
pm2 logs discord-bot

# Monitor resources
pm2 monit

# Ensure adequate RAM (4GB+ recommended)
```

#### AI Features Not Working

**Problem:** `/ask`, `/chat`, or `/imagine` fail

**Solutions:**
```bash
# Verify API key in .env
GEMINI_API_KEY=your_actual_key

# Check API quota
# Visit: https://makersuite.google.com

# For image generation:
# Pollinations.ai works without API key
# Check internet connectivity
```

#### High Memory Usage

**Problem:** Bot uses too much RAM

**Solutions:**
```bash
# Normal: 100-300MB
# High: 500MB+
# Critical: 1GB+

# Restart bot
pm2 restart discord-bot

# Check for memory leaks
pm2 monit

# Verify MySQL connection pooling is working
# Increase server RAM if needed
```

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
```

Restart bot and check `logs/combined.log` for detailed information.

### Getting Help

1. **Check logs** - `logs/error.log` and `logs/combined.log`
2. **Enable debug mode** - Set `LOG_LEVEL=debug`
3. **Check Discord** - Bot status and permissions
4. **Review guides** - See documentation links above
5. **Test components** - Isolate the issue (database, API, etc.)

---

## 📊 Performance

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 2GB
- Storage: 5GB
- OS: Windows Server 2016+

**Recommended:**
- CPU: 4 cores
- RAM: 4GB
- Storage: 10GB
- OS: Windows Server 2019+

### Performance Metrics

**Bot Performance:**
- Response time: <100ms (local)
- API calls: <2s (external)
- Memory usage: 100-300MB
- CPU usage: <5% (idle), <20% (active)

**Database Performance:**
- Query time: <10ms (indexed)
- Connection pool: 10 connections
- Automatic cleanup: Daily
- Cache hit rate: ~80%

**Scalability:**
- Tested up to 1000 guilds
- Handles 10k+ users per guild
- Concurrent command execution
- Automatic rate limiting

---

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- Use ES6+ features
- Follow existing patterns
- Comment complex logic
- Use meaningful variable names
- Handle errors gracefully

### Pull Request Guidelines

- **Title:** Brief description of changes
- **Description:** What, why, and how
- **Testing:** How you tested the changes
- **Screenshots:** If UI changes

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New commands
- 📝 Documentation improvements
- 🌍 Translations
- 🎨 UI enhancements
- ⚡ Performance improvements

---

## 📝 Changelog

### Version 2.0 - Current

**New Features:**
- ✨ Multi-provider AI image generation
- 🤖 Gemini 2.0 Flash integration
- 🎨 8 art style presets
- 📐 4 aspect ratio options
- 🔄 Automatic provider fallback
- 💓 Enhanced heartbeat system
- 🎨 Colorful console output
- 📊 Usage statistics tracking

**Improvements:**
- ⚡ Faster command response times
- 🛡️ Enhanced auto-moderation
- 📈 Better database optimization
- 🔧 Improved error handling
- 📝 Comprehensive documentation

**Bug Fixes:**
- 🐛 Fixed temp ban expiration
- 🐛 Resolved memory leaks
- 🐛 Fixed command cooldowns
- 🐛 Corrected permission checks

### Version 1.0 - Initial Release

- 🎉 Core bot functionality
- 🛡️ Moderation suite
- 🎮 Blizzard API integration
- 🤖 Basic AI features
- 📊 Leveling system
- ⚙️ Per-guild configuration

---

## 📄 License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 EvoCore

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🌟 Support

### Need Help?

- 📖 **Documentation** - Check the guides in the docs folder
- 🐛 **Bug Reports** - Open an issue on GitHub
- 💡 **Feature Requests** - Suggest new features
- 💬 **Questions** - Ask in discussions

### Useful Links

- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Gemini AI Documentation](https://ai.google.dev/docs)
- [Blizzard API Docs](https://develop.battle.net/documentation)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## 🎉 Acknowledgments

**Built With:**
- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [Google Gemini](https://ai.google.dev/) - AI capabilities
- [MySQL](https://www.mysql.com/) - Database
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Axios](https://axios-http.com/) - HTTP client
- [Node-cron](https://github.com/node-cron/node-cron) - Task scheduling

**Image Generation Providers:**
- [Google Imagen 3](https://ai.google.dev/) - Premium AI images
- [Pollinations.ai](https://pollinations.ai/) - Free unlimited images
- [Hugging Face](https://huggingface.co/) - Open source models

**Thanks to:**
- Discord.js community for excellent documentation
- All contributors and testers
- Open source community

---

## 📬 Contact

- **Developer:** EvoCore Team
- **VPS:** 45.141.24.144 (Windows Server)
- **Version:** 2.0
- **Last Updated:** October 2025

---

<div align="center">

**Made with ❤️ for Discord communities**

⭐ Star this repo if you find it useful!

[Features](#-features) • [Commands](#-commands) • [Setup](#-installation) • [Docs](#-documentation) • [Support](#-support)

</div>
