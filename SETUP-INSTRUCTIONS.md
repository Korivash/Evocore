# 🚀 Quick Setup Guide - Image Generation Update

## What's New

Your Discord bot can now **generate AI images** using Google's Imagen 3! The `/imagine` command has been enhanced with image generation capabilities.

## Installation Steps

### 1. Replace Files

Replace these two files in your bot directory:

**commands/ai/imagine.js**
- Location: `C:\DiscordBot\commands\ai\imagine.js`
- Replace with: `imagine.js` (from this package)

**utils/gemini.js**
- Location: `C:\DiscordBot\utils\gemini.js`
- Replace with: `gemini.js` (from this package)

### 2. Deploy Commands

Since the command structure changed (added subcommands), you MUST redeploy:

```bash
# Deploy globally (takes up to 1 hour to propagate)
npm run deploy

# OR deploy to test server (instant)
npm run deploy-guild YOUR_GUILD_ID
```

### 3. Restart Bot

```bash
# If using PM2
pm2 restart discord-bot

# Or just restart normally
npm start
```

## Verify Installation

Test the new command:

```
/imagine image prompt:a cute robot
```

You should see:
1. A "Generating Image..." status message
2. After 10-30 seconds, a generated image
3. The image displayed in Discord

## Command Changes

### Before:
```
/imagine type:story topic:dragons style:epic
```

### After:
```
# For images (NEW!)
/imagine image prompt:a dragon style:digital art aspect-ratio:16:9

# For text (same as before)
/imagine text type:story topic:dragons style:epic
```

## Requirements

- ✅ **Gemini API Key** (already configured if you had `/ask` working)
- ✅ **Node.js 16+**
- ✅ **discord.js v14**
- ✅ **@google/generative-ai package** (already installed)

## Testing Checklist

- [ ] Files replaced in correct locations
- [ ] Commands deployed (`npm run deploy`)
- [ ] Bot restarted
- [ ] `/imagine image` command appears in Discord
- [ ] Test image generation works
- [ ] `/imagine text` still works (backward compatibility)

## Common Issues

### "AI features are not available"
**Fix:** Make sure `GEMINI_API_KEY` is in your `.env` file

### Commands not showing in Discord
**Fix:** Run `npm run deploy` and wait (or use `npm run deploy-guild YOUR_GUILD_ID`)

### "Cannot find module"
**Fix:** Make sure files are in correct directories with exact filenames

### Image generation fails
**Fix:** Check API quota at https://makersuite.google.com/

## API Usage

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day

**Monitor usage at:** https://makersuite.google.com/app/apikey

## File Checklist

Make sure you have these 3 files:
- ✅ `imagine.js` (command file)
- ✅ `gemini.js` (utility file)
- ✅ `IMAGE-GENERATION-GUIDE.md` (documentation)

## Directory Structure

```
discord-bot/
├── commands/
│   └── ai/
│       └── imagine.js          ← REPLACE THIS
├── utils/
│   └── gemini.js               ← REPLACE THIS
└── .env                        ← Must have GEMINI_API_KEY
```

## Next Steps

1. ✅ Complete installation steps above
2. 📖 Read IMAGE-GENERATION-GUIDE.md for full features
3. 🎨 Share the new feature with your server
4. 🔄 Consider creating a dedicated #ai-art channel

## Support

If you encounter issues:
1. Check all files are replaced correctly
2. Verify commands are deployed
3. Check bot logs for errors: `pm2 logs discord-bot`
4. Review IMAGE-GENERATION-GUIDE.md for troubleshooting

---

**Estimated Setup Time:** 5 minutes  
**Skill Level:** Easy (just file replacement)  
**Downtime Required:** ~1 minute (bot restart)

Happy image generating! 🎨✨
