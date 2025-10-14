// utils/simcZones.js
const simcPath = `C:\\Users\\Administrator\\Desktop\\simc\\simc\\simc-1125.01.cd79e64-win64\\simc.exe`;

// Raid bosses (Manaforge Omega raid)
const raidBosses = {
  "plexus-sentinel": "Plexus Sentinel",
  "soulbinder-naazindhri": "Soulbinder Naazindhri",
  "the-soul-hunters": "The Soul Hunters",
  "nexus-king-salhadaar": "Nexus-King Salhadaar",
  "loomithar": "Loomithar",
  "forgeweaver-araz": "Forgeweaver Araz",
  "fractillus": "Fractillus",
  "dimensius-the-all-devouring": "Dimensius the All-Devouring",
};

// Dungeons
const dungeons = {
  "ara-kara-city-of-echoes": "Ara-Kara, City of Echoes",
  "halls-of-atonement": "Halls of Atonement",
  "priory-of-the-sacred-flame": "Priory of the Sacred Flame",
  "tazavesh-soleahs-gambit": "Tazavesh: So'leah's Gambit",
  "the-dawnbreaker": "The Dawnbreaker",
  "eco-dome-aldani": "Eco-Dome Aldani",
  "operation-floodgate": "Operation: Floodgate",
  "tazavesh-hard-mode": "Tazavesh: Hard Mode",
  "tazavesh-streets-of-wonder": "Tazavesh: Streets of Wonder",
};

// Export
const zones = { raids: raidBosses, dungeons: dungeons };
module.exports = { simcPath, zones };


