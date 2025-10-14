const mongoose = require("mongoose");
const config = require("./config");

async function connectDB() {
  if (!config.database?.mongoUri) {
    console.error("[DB] MONGO_URI not set in environment!");
    process.exit(1);
  }

  try {
    await mongoose.connect(config.database.mongoUri);
    console.log("[DB] MongoDB connected");
  } catch (err) {
    console.error("[DB] MongoDB connection error:", err);
    process.exit(1);
  }
}

// Character subdocument schema
const characterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  realm: { type: String, required: true },
  region: { type: String, required: true },
  mythic_score: { type: Number, default: 0 },

  // Keystone tracking
  current_keystone: {
    dungeon: { type: String, default: null },
    level: { type: Number, default: null },
    completed_at: { type: Date, default: null },
  },
}, { _id: false });

// User schema
const userSchema = new mongoose.Schema({
  discordId: { type: String, unique: true, index: true },

  // Blizzard OAuth tokens for pulling player profile/keystones
  blizzardAuth: {
    region: { type: String, default: "us" },
    access_token: { type: String, default: null },
    refresh_token: { type: String, default: null },
    expires_at: { type: Number, default: null }, // epoch ms
  },

  xp: { type: Number, default: 0 },
  trivia: {
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    answeredIds: { type: [String], default: [] },
    lastWrongAt: { type: Date, default: null },
  },
  characters: { type: [characterSchema], default: [] },
}, { timestamps: true });

// Trivia questions schema
const triviaSchema = new mongoose.Schema({
  questionId: { type: String, unique: true },
  question: String,
  options: [String],
  answer: String,
  difficulty: { type: String, default: "easy" },
}, { timestamps: true });

// Guild members schema
const guildMemberSchema = new mongoose.Schema({
  name: String,
  realm: String,
  mythicScore: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const TriviaQuestion = mongoose.model("TriviaQuestion", triviaSchema);
const GuildMember = mongoose.model("GuildMember", guildMemberSchema);

const db = {
  // Guild members
  async getGuildMembers() {
    return GuildMember.find().lean();
  },
  async setGuildMembers(members) {
    await GuildMember.deleteMany({});
    if (members?.length) await GuildMember.insertMany(members);
    return true;
  },

  // Users & characters
  async getOrCreateUser(discordId) {
    let u = await User.findOne({ discordId });
    if (!u) u = await User.create({ discordId });
    return u;
  },

  async registerCharacter(discordId, character) {
    const user = await db.getOrCreateUser(discordId);

    const exists = user.characters.find(
      c =>
        c.name.toLowerCase() === character.name.toLowerCase() &&
        c.realm.toLowerCase() === character.realm.toLowerCase()
    );

    if (exists) {
      return { success: false, message: `Character ${character.name} already registered.` };
    }

    user.characters.push(character);
    await user.save();
    return { success: true, character };
  },

  async deleteCharacter(discordId, name, realm) {
    const user = await db.getOrCreateUser(discordId);
    const initialCount = user.characters.length;

    user.characters = user.characters.filter(
      c => !(c.name === name && c.realm === realm)
    );

    if (user.characters.length === initialCount) {
      return { success: false, message: "Character not found." };
    }

    await user.save();
    return { success: true };
  },

  async listCharacters(discordId) {
    const user = await db.getOrCreateUser(discordId);
    return user.characters || [];
  },

  // Trivia
  async addTriviaXP(discordId, amount = 10) {
    const u = await db.getOrCreateUser(discordId);
    u.xp += amount;
    u.trivia.correct += 1;
    await u.save();
    return u;
  },
  async recordWrong(discordId) {
    const u = await db.getOrCreateUser(discordId);
    u.trivia.wrong += 1;
    u.trivia.lastWrongAt = new Date();
    await u.save();
    return u;
  },
  async hasAnswered(discordId, qid) {
    const u = await db.getOrCreateUser(discordId);
    return u.trivia.answeredIds.includes(qid);
  },
  async markAnswered(discordId, qid) {
    const u = await db.getOrCreateUser(discordId);
    if (!u.trivia.answeredIds.includes(qid)) {
      u.trivia.answeredIds.push(qid);
      await u.save();
    }
    return true;
  },
  async leaderboard(limit = 10) {
    return User.find({ "trivia.correct": { $gt: 0 } })
      .sort({ xp: -1 })
      .limit(limit)
      .lean();
  },

  // Trivia questions
  async addQuestions(questions) {
    if (!Array.isArray(questions)) questions = [questions];
    const docs = questions.map(q => ({
      updateOne: {
        filter: { questionId: q.questionId },
        update: { $set: q },
        upsert: true,
      }
    }));
    if (docs.length) await TriviaQuestion.bulkWrite(docs);
  },
  async countQuestions() {
    return TriviaQuestion.countDocuments();
  },
  async getRandomQuestion() {
    const count = await TriviaQuestion.countDocuments();
    if (!count) return null;
    const skip = Math.floor(Math.random() * count);
    return TriviaQuestion.findOne().skip(skip).lean();
  },
  async findQuestionById(questionId) {
    return TriviaQuestion.findOne({ questionId }).lean();
  }
};

module.exports = { connectDB, db, mongoose, User, TriviaQuestion, GuildMember };





