# 🎨 AI Image Generation Guide

## Overview

Your Discord bot now includes **AI-powered image generation** using Google's **Imagen 3** - the newest and most advanced image generation model from Google. This feature is integrated into the `/imagine` command.

## ✨ What's New

### Updated `/imagine` Command

The `/imagine` command now has **two subcommands**:

1. **`/imagine image`** - Generate images from text descriptions (NEW!)
2. **`/imagine text`** - Generate creative text content (existing)

## 🖼️ Image Generation Features

### Basic Usage

```
/imagine image prompt:a beautiful sunset over mountains
```

### Advanced Options

#### Style Presets
Choose from 8 professional art styles:
- **Photorealistic** - Realistic photography-style images
- **Anime** - Japanese animation style
- **Digital Art** - Modern digital artwork
- **Oil Painting** - Classic oil painting style
- **Watercolor** - Soft watercolor painting
- **Sketch** - Pencil sketch drawing
- **3D Render** - 3D computer graphics
- **Cartoon** - Cartoon/comic style

#### Aspect Ratios
Generate images in different formats:
- **Square (1:1)** - Perfect for avatars and social media
- **Landscape (16:9)** - Great for banners and wide displays
- **Portrait (9:16)** - Ideal for phone wallpapers
- **Wide (21:9)** - Ultra-wide cinematic format

### Example Commands

**Simple generation:**
```
/imagine image prompt:a cute cat wearing a wizard hat
```

**With style:**
```
/imagine image prompt:a futuristic city style:digital art
```

**With aspect ratio:**
```
/imagine image prompt:mountain landscape aspect-ratio:16:9
```

**Full options:**
```
/imagine image prompt:a dragon in a fantasy castle style:oil painting aspect-ratio:1:1
```

## 🎯 Best Practices

### Writing Good Prompts

**Be Specific:**
- ❌ "a dog"
- ✅ "a golden retriever puppy playing in a sunny park"

**Include Details:**
- ❌ "a house"
- ✅ "a modern two-story house with large windows and a garden"

**Add Mood/Atmosphere:**
- ❌ "a forest"
- ✅ "a mystical forest at dawn with rays of sunlight filtering through trees"

**Use Style Descriptors:**
- ❌ "a portrait"
- ✅ "a portrait in the style of renaissance art with dramatic lighting"

### Example Quality Prompts

**Fantasy:**
```
/imagine image prompt:an ancient wizard's tower perched on a cliff overlooking stormy seas, magical energy swirling around it style:digital art
```

**Nature:**
```
/imagine image prompt:a serene japanese zen garden with cherry blossoms, koi pond, and stone lanterns during golden hour style:photorealistic aspect-ratio:16:9
```

**Character:**
```
/imagine image prompt:a brave female knight in ornate silver armor, holding a glowing sword, heroic pose style:anime
```

**Abstract:**
```
/imagine image prompt:flowing liquid colors mixing together, cosmic nebula patterns, vibrant purples and blues style:digital art aspect-ratio:1:1
```

## ⚙️ Technical Details

### Generation Time
- Typical: **10-30 seconds** per image
- The bot shows a status message while generating
- Complex prompts may take longer

### Image Quality
- **Resolution:** High quality PNG images
- **Model:** Google Imagen 3 (latest version)
- **Safety:** Built-in content filters

### Cooldown
- **10 seconds** between uses per user
- Prevents spam and manages API costs

## 🛡️ Safety & Moderation

### Content Filters
The image generation includes automatic safety filters that block:
- Explicit or adult content
- Violence and gore
- Hate speech imagery
- Dangerous activities
- Copyrighted character reproductions

### Blocked Content Response
If a prompt triggers safety filters:
```
❌ Image generation blocked due to safety filters. 
Please try a different prompt.
```

## 🔧 Setup Requirements

### 1. API Key Configuration

Add to your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### 3. API Quota

**Free Tier:**
- 15 requests per minute
- 1,500 requests per day

**Paid Tier:**
- Higher limits available
- Pay per request

Check current pricing at: https://ai.google.dev/pricing

## 📊 Command Structure

### `/imagine image`

**Options:**
- `prompt` (required) - Text description of the image
- `style` (optional) - Art style preset
- `aspect-ratio` (optional) - Image dimensions

### `/imagine text`

**Options:**
- `type` (required) - story, poem, joke, or fact
- `topic` (required) - Subject matter
- `style` (optional) - Writing style or mood

## 🎨 Use Cases

### Server Branding
Generate custom images for:
- Server icons and banners
- Channel headers
- Role icons
- Welcome messages

### Entertainment
Create fun content:
- Memes and jokes
- Character designs
- Fantasy scenes
- Abstract art

### Events & Contests
Host creative events:
- AI art competitions
- Prompt challenges
- Creative showcases
- Theme contests

### Educational
Visualize concepts:
- Historical scenes
- Scientific diagrams
- Story illustrations
- Learning materials

## ⚠️ Troubleshooting

### "AI features are not available"
**Cause:** No API key configured  
**Solution:** Add `GEMINI_API_KEY` to your `.env` file

### "API quota exceeded"
**Cause:** Daily/minute limit reached  
**Solution:** Wait for quota reset or upgrade to paid tier

### "Failed to generate image"
**Cause:** Various (network, API issues)  
**Solution:** Try again in a few moments

### "Image generation blocked by safety filters"
**Cause:** Prompt contains restricted content  
**Solution:** Rephrase prompt with appropriate content

## 💡 Pro Tips

### Combining Styles
While the bot offers style presets, you can also describe styles in your prompt:
```
/imagine image prompt:a castle in the style of Studio Ghibli animation
```

### Negative Prompting
Tell the AI what NOT to include:
```
/imagine image prompt:a peaceful meadow, no people, no buildings
```

### Iterative Refinement
If the first result isn't perfect:
1. Note what's wrong
2. Add specific details to fix it
3. Try again with refined prompt

### Aspect Ratio Selection
- **1:1** - Best for Discord avatars
- **16:9** - Best for server banners
- **9:16** - Best for mobile wallpapers

## 🔄 Updates from Previous Version

### What Changed?

**Before:**
- `/imagine` only generated text content
- No image generation capability

**After:**
- `/imagine` split into two subcommands
- **New:** `/imagine image` with Imagen 3
- **Kept:** `/imagine text` for creative writing

### Migration

No action needed! The command automatically updates when you:
1. Replace the old `imagine.js` file
2. Replace the old `gemini.js` file
3. Run the command deployment script

## 📝 Example Workflow

### For Server Admins

1. **Set up the feature:**
   ```bash
   # Add API key to .env
   GEMINI_API_KEY=your_key_here
   
   # Deploy commands
   npm run deploy
   ```

2. **Test it:**
   ```
   /imagine image prompt:test image style:digital art
   ```

3. **Share with users:**
   - Announce the new feature
   - Share example commands
   - Create a dedicated channel

### For Users

1. **Try a simple prompt:**
   ```
   /imagine image prompt:a cute robot
   ```

2. **Experiment with styles:**
   ```
   /imagine image prompt:a cute robot style:anime
   ```

3. **Fine-tune results:**
   ```
   /imagine image prompt:a friendly blue robot with glowing eyes in a futuristic lab style:digital art aspect-ratio:1:1
   ```

## 🎉 Benefits

### For Server Owners
- ✅ Unique, custom content
- ✅ Member engagement
- ✅ Entertainment value
- ✅ No external tools needed

### For Users
- ✅ Easy to use
- ✅ Fast generation
- ✅ High quality results
- ✅ Safe and moderated

## 📊 Comparison with Other Tools

### Imagen 3 vs. Other AI Image Generators

**Advantages:**
- Latest Google technology
- High quality outputs
- Fast generation
- Built-in safety
- Integrated in Discord

**Considerations:**
- Requires API key
- Subject to quotas
- Content filters active

## 🔮 Future Enhancements

Potential future additions:
- Image editing (inpainting)
- Style transfer
- Image upscaling
- Batch generation
- Custom style training

## ❓ FAQ

**Q: Is it free?**  
A: Yes, within Google's free tier limits (1,500 requests/day)

**Q: How long does generation take?**  
A: Usually 10-30 seconds per image

**Q: What image format is used?**  
A: PNG format with transparency support

**Q: Can I generate multiple images?**  
A: Yes, but respect the cooldown (10 seconds)

**Q: Are images saved?**  
A: Only temporarily for Discord display. Not stored permanently.

**Q: Can I use generated images commercially?**  
A: Check Google's terms of service for Imagen 3

**Q: What if my prompt is blocked?**  
A: Rephrase to avoid restricted content

**Q: Can I request specific artists' styles?**  
A: Avoid mentioning living artists by name; use style descriptions instead

## 📞 Support

If you encounter issues:
1. Check the error message
2. Review this guide
3. Check API key configuration
4. Verify quota hasn't been exceeded
5. Contact bot administrator

## 🎓 Learning Resources

**Prompt Engineering:**
- [Google AI Prompt Guide](https://ai.google.dev/docs/prompt_best_practices)
- [Imagen 3 Documentation](https://ai.google.dev/tutorials/imagen)

**Discord Bot Setup:**
- See README.md for full bot documentation
- See DEPLOYMENT.md for server setup

---

**Version:** 1.0 with Imagen 3  
**Last Updated:** October 2025  
**Model:** Google Imagen 3 (imagen-3.0-generate-001)

Enjoy creating amazing AI-generated images in your Discord server! 🎨✨
