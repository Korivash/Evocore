#  Cryptic Net World of Warcraft Discord Bot  

![Custom World of Warcraft Discord Bot](https://i.imgur.com/cre9ooV.gif)  

<p align="center">
 <a href="https://discord.gg/sAC9F3Qnvk">
  <img src="https://img.shields.io/badge/Join%20Our%20Discord-5865F2?logo=discord&logoColor=white&style=for-the-badge" alt="Discord">
</a>
  <a href="https://github.com/Korivash/World-of-Warcraft-Discord-Bot/stargazers"><img src="https://img.shields.io/github/stars/Korivash/World-of-Warcraft-Discord-Bot?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/Korivash/World-of-Warcraft-Discord-Bot/network/members"><img src="https://img.shields.io/github/forks/Korivash/World-of-Warcraft-Discord-Bot?style=for-the-badge" alt="Forks"></a>
  <a href="https://github.com/Korivash/World-of-Warcraft-Discord-Bot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Korivash/World-of-Warcraft-Discord-Bot?style=for-the-badge" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E=18-green?style=for-the-badge&logo=node.js" alt="Node.js"></a>
</p>

*A powerful and advanced Discord bot built for World of Warcraft communities. Provides role management, guild integration, keystone tracking, trivia, SimulationCraft integration, Gemini-powered AI explanations, and automated guild status updates.*


💬 **Need help or have questions?**  
Join our [Support Discord](https://discord.gg/sAC9F3Qnvk)

---

## ✨ Features  

- ✅ **Self-Roles** – Assign WoW class/role with interactive buttons.  
- ✅ **Trivia Game** – Compete in trivia, earn XP, and climb the leaderboard.  
- ✅ **Guild Integration** – Sync with Raider.IO to track guild members’ Mythic+ scores.  
- ✅ **Dynamic Status** – Rotates bot status to showcase top guild members and M+ scores.  
- ✅ **SimulationCraft Support** – Run `/sim` to generate full HTML sim reports hosted on your bot.  
- ✅ **Gemini API** – AI-generated trivia questions and explanations for raid bosses/dungeons.  
- ✅ **Keystone Tracker** *(WIP)* – Auto-posts keystone updates to a channel.  
- ✅ **Error Logging** – All crashes and errors logged to a set channel.  
- ✅ **MongoDB Atlas** – Cloud-powered persistent storage.  

---

## 📦 Installation  

1. **Clone the repository**
   ```bash
   git clone https://github.com/Korivash/World-of-Warcraft-Discord-Bot.git
   cd World-of-Warcraft-Discord-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup `.env` file**
   Create a `.env` in the project root with the following:
   ```ini
   DISCORD_TOKEN=your_discord_bot_token
   MONGO_URI=your_mongo_connection_string

   # Guild settings
   GUILD_NAME=Cryptic Net
   GUILD_REALM=area-52
   GUILD_REGION=us

   # Error logs
   ERROR_CHANNEL_ID=123456789012345678

   # Keystone updates
   KEYSTONE_CHANNEL_ID=123456789012345678

   # Blizzard API (for keystone features)
   BLIZZARD_CLIENT_ID=your_blizzard_client_id
   BLIZZARD_CLIENT_SECRET=your_blizzard_client_secret

   # Gemini API
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the bot**
   ```bash
   npm run start
   ```

   For development (auto-reload on changes):
   ```bash
   npm run dev
   ```

---

## 🔧 Commands  

### 📜 General  
- `/register` → Register your main character (name, realm, region).  
- `/sim` → Run a SimulationCraft sim for your character.  

### 🎲 Trivia & AI (Gemini)  
- `/trivia` → Start a trivia question (Gemini-powered).  
- `/leaderboard` → View the XP leaderboard.  
- `/explainboss` → Get AI-generated explanations of raid/dungeon bosses.  

### 🏰 Guild & Keystone (WIP)  
- `/guildstatus` → Show current guild M+ leaderboard.  
- `/keystone` → Post/update keystone info in the designated channel.  

---

## 🖼️ Screenshots  

### Role Selector
![Role Selector](https://i.imgur.com/ncmICkS.png)  

### SimulationCraft Report
![Simulation Report](https://imgur.com/32FsTtX.png)  

### Trivia System
![Trivia](https://i.imgur.com/NGI6HgZ.png)  

### Custom Rotating Status For All Guild Members
![Rotating Mythic Status Between The Whole Guild](https://i.imgur.com/cWlgrF5.png)  
![Rotating Mythic Status Between The Whole Guild](https://i.imgur.com/gybhcQb.png)  

---

## 🛡️ Reliability & Safety  

- **Anti-crash handling** – Bot auto-recovers from most errors.  
- **Error reporting** – All errors sent to your error log channel.  
- **Gemini AI Integration** – Trivia and boss explanations are generated dynamically.  
- **Secure storage** – Sensitive data is hidden in `.env` (ignored by Git).  

.gitignore includes:  
```
.env
node_modules/
```

---

## 📊 Example Simulation Report  

When using `/sim`, you’ll receive results like:  
- Spec: Protection Paladin  
- DPS: 2,655,787  
- Iterations: 5000  
- Full HTML report link generated and hosted automatically  

---

## 🤝 Contributing  

Contributions are welcome! Please fork the repo and submit a PR with improvements.  

---

## 📜 License  

MIT License. Free to use and modify with credit.  

---




