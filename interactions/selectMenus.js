// ./interactions/selectMenus.js
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const colors = require('colors/safe');

const cache = new NodeCache({ stdTTL: 3600 });

const dungeons = [
  { name: 'Eco-Dome Al\'dani', slug: 'eco-dome-al-dani' },
  { name: 'Operation: Floodgate', slug: 'operation-floodgate' },
  { name: 'Priory of the Sacred Flame', slug: 'priory-of-the-sacred-flame' },
  { name: 'The Dawnbreaker', slug: 'the-dawnbreaker' },
  { name: 'Ara-Kara, City of Echoes', slug: 'ara-kara-city-of-echoes' },
  { name: 'Halls of Atonement', slug: 'halls-of-atonement' },
  { name: 'Tazavesh: Streets of Wonder', slug: 'tazavesh-streets-of-wonder' },
  { name: 'Tazavesh: So\'leah\'s Gambit', slug: 'tazavesh-so-leahs-gambit' },
];

const bosses = [
  { name: 'Plexus Sentinel', slug: 'plexus-sentinel' },
  { name: 'Loom\'ithar', slug: 'loom-ithar' },
  { name: 'Soulbinder Naazindhri', slug: 'soulbinder-naazindhri' },
  { name: 'Forgeweaver Araz', slug: 'forgeweaver-araz' },
  { name: 'The Soul Hunters', slug: 'the-soul-hunters' },
  { name: 'Fractillus', slug: 'fractillus' },
  { name: 'Nexus-King Salhadaar', slug: 'nexus-king-salhadaar' },
  { name: 'Dimensius the All-Devouring', slug: 'dimensius-the-all-devouring' },
];

module.exports = {
  type: 'selectMenus',
  async execute(interaction, client) {
    const log = {
      info: (...args) => console.log(colors.cyan('[INFO]'), ...args),
      error: (...args) => console.error(colors.red('[ERROR]'), ...args),
    };

    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return false;

    try {
      await interaction.deferUpdate();

      if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;
        const slug = interaction.values[0];
        let url, data, embedTitle, fields, footerText;

        if (customId === 'select_dungeon') {
          const dungeon = dungeons.find(d => d.slug === slug);
          if (!dungeon) throw new Error(`Dungeon not found: ${slug}`);
          url = `https://www.wowhead.com/guide/mythic-plus-dungeons/the-war-within-season-3/${slug}`;

          if (cache.has(url)) {
            data = cache.get(url);
          } else {
            // Static data (replace with axios/cheerio for production)
            data = {
              'eco-dome-al-dani': {
                overview: 'New 3-boss dungeon on K’aresh, ~32min timer, IL 684-701. Ethereal mechanics, haste buffs via banners. Waystones for respawns.',
                bosses: [
                  'Taah\'bat (Phase 1): Venn circles (avoid overlap, 10s CD); dodge Arcane Frontal. Phase 2: Surge bursts (stack for mitigation).',
                  'Soul-Scribe (Phase 1): Grab Echoes (3-5 orbs, 15s CD); interrupt Void Pulse. Phase 2: K’areshi Surge buffs (haste, grab every 30s).',
                  'Final Boss: Portal phases (enter/exit, 20s CD); prioritize adds to stop Void Collapse.',
                ],
                trash: 'Interrupt Scavenger Rage (8s cast, high priority); avoid Void Pools (5s DoT). CC Ethereal Casters. With Reckless affix, kite trash during enrage.',
                route: 'Pull 1: Left banner, 2 packs + caster. Skip via Waystone to mid. Pull 2: 3 packs, use BL. Pull 3: Boss 1. Mid banner skip to Boss 2. Final pull: 2 packs + portal adds. MDT: [Keystone.guru link].',
                roles: 'Tanks: Face Taah\'bat away; kite Scavengers on Reckless. Healers: Precast on Surge bursts; dispel Echo DoTs. DPS: Focus adds, save CDs for portals.',
                trivia: 'Which boss uses portals? Reply to guess!',
              },
              // Add other dungeons similarly
              'operation-floodgate': {
                overview: '3-boss dungeon, ~30min timer, IL 684-701. Trap-heavy, interrupt focus.',
                bosses: [
                  'Big M.O.M.M.A.: Interrupt Pulse Barrage (6s CD); kill Drone adds. Phase 2: Shockwave (dodge, 12s).',
                  'Swampface: Dodge Root Vines (8s CD); avoid Shock Water pools. Phase 2: Enrage (stun/CC).',
                  'Geezle Gigazap: Avoid Spark Barrage (10s CD); interrupt Overcharge.',
                ],
                trash: 'Interrupt Mad Scientist Overload; CC Enraged Goblins. Reckless affix: Prioritize CC on big packs.',
                route: 'Pull 1: 2 packs + trap skip. Pull 2: BL on 3 goblins. Pull 3: Boss 1. Corridor skip to Boss 2. Final: 3 packs + Boss 3. MDT: [link].',
                roles: 'Tanks: Kite goblins on Reckless. Healers: Big CDs on Shockwave. DPS: Interrupt Pulse Barrage; focus Drones.',
                trivia: 'What’s Big M.O.M.M.A.’s key interrupt? Reply!',
              },
              // Placeholder for others
            }[slug] || {
              overview: `${dungeon.name}: Data pending. Check Wowhead for now.`,
              bosses: ['Not yet implemented.'],
              trash: 'Check interrupts and CC.',
              route: 'MDT: [link]',
              roles: 'Tanks/Healers/DPS: Check Wowhead.',
              trivia: 'What’s new in S3? Reply!',
            };
            cache.set(url, data);
            /* Uncomment for production
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            data = { ... }; // Parse Wowhead HTML
            cache.set(url, data);
            */
          }

          embedTitle = `${dungeon.name} M+ Guide`;
          fields = [
            { name: 'Overview', value: data.overview, inline: false },
            { name: 'Bosses & Mechanics', value: data.bosses.join('\n'), inline: false },
            { name: 'Trash Tips', value: data.trash, inline: false },
            { name: 'PUG Route', value: data.route, inline: false },
            { name: 'Role Tips', value: data.roles, inline: false },
            { name: 'Trivia', value: data.trivia, inline: false },
          ];
          footerText = 'Data from Wowhead/Keystone.guru';
        } else if (customId === 'select_boss') {
          const boss = bosses.find(b => b.slug === slug);
          if (!boss) throw new Error(`Boss not found: ${slug}`);
          url = `https://www.wowhead.com/guide/the-war-within/raids/manaforge-omega/${slug}-boss-strategy-abilities`;

          if (cache.has(url)) {
            data = cache.get(url);
          } else {
            data = {
              'dimensius-the-all-devouring': {
                overview: 'Final boss of Manaforge Omega. Multi-phase void devourer reshaping space/gravity. Prevent full summon by breaking energy collectors. IL 701-710.',
                phases: [
                  'Phase 1 (100-70%): Devourer’s Ire (rotating black hole pulls, 15s CD); soak The Hunt or raid-wide damage.',
                  'Intermission (70%): Soul Fragments (kill adds); break Energy Collectors (3-5, 20s CD) to delay summon.',
                  'Phase 2 (70-30%): Gravity Warps (dodge lines); Void Pulse (raid-wide, 10s).',
                  'Phase 3 (30-0%): Black Hole suck-in; burn boss with CDs.',
                ],
                mechanics: '- **The Hunt**: Soak or 50k raid damage.\n- **Void Pulse**: Healer CDs.\n- **Energy Collectors**: Break to avoid summon.\n- **Mythic**: Amplified pulses, extra adds.',
                tips: 'Tanks: Face away during Ire; kite adds. Healers: Big CDs on Pulse; dispel slows. DPS: Focus Collectors; save burst for Phase 3. Coordinate soaks; use Manaforge Vandals buffs.',
                trivia: 'How does Dimensius warp reality? Reply!',
              },
              'plexus-sentinel': {
                overview: 'First boss, arcane construct. Manage Overloading Attendants and Arcane Bursts. IL 701-710.',
                phases: [
                  'Phase 1: Arcane Bursts (raid-wide, 12s CD); kill Attendants (stack DoTs).',
                  'Phase 2 (60%): Overload Surge (spread, dodge orbs).',
                ],
                mechanics: '- **Arcane Bursts**: Stack for mitigation.\n- **Attendants**: Kill fast to reduce stacks.\n- **Surge (Mythic)**: Extra orbs.',
                tips: 'Tanks: Pull Attendants to center. Healers: Precast on Bursts. DPS: Focus Attendants; interrupt casters.',
                trivia: 'What powers the Sentinel? Reply!',
              },
              // Placeholder for others
            }[slug] || {
              overview: `${boss.name}: Data pending. Check Wowhead.`,
              phases: ['Not yet implemented.'],
              mechanics: 'Check Wowhead for abilities.',
              tips: 'Tanks/Healers/DPS: Check Wowhead.',
              trivia: 'What’s new in Manaforge Omega? Reply!',
            };
            cache.set(url, data);
          }

          embedTitle = `${boss.name} Guide`;
          fields = [
            { name: 'Overview', value: data.overview, inline: false },
            { name: 'Phases', value: data.phases.join('\n'), inline: false },
            { name: 'Key Mechanics', value: data.mechanics, inline: false },
            { name: 'Tips', value: data.tips, inline: false },
            { name: 'Trivia', value: data.trivia, inline: false },
          ];
          footerText = 'From Wowhead';
        } else {
          throw new Error(`Unknown select menu: ${customId}`);
        }

        const embed = new EmbedBuilder()
          .setTitle(embedTitle)
          .setURL(url)
          .setColor(0x00FF00)
          .addFields(fields)
          .setFooter({ text: footerText });

        await interaction.editReply({ content: null, embeds: [embed], components: [] });
        log.info(`Displayed guide for ${embedTitle}`);
        return true;
      }

      if (interaction.isButton() && interaction.customId === 'random_tip') {
        await interaction.editReply({ content: 'Random Tip: Prioritize interrupts on casters to avoid wipes!', embeds: [], components: [] });
        log.info('Displayed random tip');
        return true;
      }

      return false;
    } catch (error) {
      log.error('Interaction error:', error.message);
      await interaction.editReply({ content: `Error: ${error.message}`, embeds: [], components: [] });
      return true;
    }
  },
};