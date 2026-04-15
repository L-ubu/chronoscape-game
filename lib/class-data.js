// Shared class data for character creation
// Used by server, CLI, and AI character creator
// Contains starting gear, abilities, spells, skills, AC, and spell slots for all classes

export const HIT_DICE = {
  'glitch knight': 10,
  'neon assassin': 8,
  'wyrmcaller': 8,
  'techshaman': 8,
  'codec mage': 6,
  'fighter': 10,
  'rogue': 8,
  'wizard': 6,
  'barbarian': 12,
  'cleric': 8,
};

export const CLASS_DATA = {
  'glitch knight': {
    gear: ['Corrupted Greatsword', 'Heavy Glitch Plate', 'Shield Core', "Explorer's Pack"],
    abilities: [
      'Reality Anchor — Advantage on saves vs teleportation/banishment. Sense Glitch zones within 60ft',
      'Fighting Style: Great Weapon Fighting — Reroll 1s and 2s on damage with two-handed weapons',
      'Second Wind — Regain 1d10+level HP as a bonus action. Once per short rest',
    ],
    spells: [],
    skills: ['Athletics', 'Intimidation'],
    ac: 18,
    spellSlots: {},
  },
  'neon assassin': {
    gear: ['Twin Neon Daggers', 'Shadow Suit', 'Grappling Wire', "Thieves' Tools", 'Smoke Pellets (3)'],
    abilities: [
      'Syndicate Rating — Reputation score (1-5 stars) affects underworld interactions',
      'Sneak Attack — +1d6 damage when attacking with advantage or ally adjacent to target',
      "Expertise — Double proficiency on two skills (Stealth and Thieves' Tools)",
      "Thieves' Cant (Digital) — Read/leave coded messages in digital spaces and neon signs",
    ],
    spells: [],
    skills: ['Stealth', 'Acrobatics', 'Deception', 'Sleight of Hand'],
    ac: 14,
    spellSlots: {},
  },
  'wyrmcaller': {
    gear: ['Dragon-bonded Staff', 'Scale Mail', 'Wyrmholt Herbs', 'Component Pouch'],
    abilities: [
      'Dragon Bond — Bonded to a dragon patron. Resistance to patron damage type. Telepathic link within 1 mile',
      'Wyrm Pact Magic — Cast spells using pact slots that recharge on short rest',
    ],
    spells: ['Wyrm Bolt', 'Spectral Claw', 'Burning Hands', 'Shield'],
    skills: ['Arcana', 'Intimidation'],
    ac: 14,
    spellSlots: { '1': 1 },
  },
  'techshaman': {
    gear: ['Tech-Nature Focus', 'Hide Armor', "Healer's Kit", 'Datastream Lens', 'Shield'],
    abilities: [
      'Machine Speech — Communicate with constructs and mana-tech. Advantage on repair/tech checks',
      'Spellcasting — Prepare spells from Techshaman list. WIS-based casting',
    ],
    spells: ['Mending', 'Spare the Dying', 'Cure Wounds', 'Detect Magic', 'Goodberry'],
    skills: ['Medicine', 'Nature', 'Perception'],
    ac: 14,
    spellSlots: { '1': 2 },
  },
  'codec mage': {
    gear: ['Codec Wand', 'Digital Robes', 'Spellbook Drive', 'Arcane Focus'],
    abilities: [
      'Reality Compiler — Digital spellbook. Can copy spells from the Datastream',
      'Arcane Recovery — Recover spell slots on short rest (half level, rounded up, once/day)',
      'Code Sight — Read any written language. Detect illusions within 15ft',
    ],
    spells: ['Data Bolt', 'Minor Glitch', 'Mage Hand', 'Magic Missile', 'Compile Shield', 'Data Scrub'],
    skills: ['Arcana', 'Investigation'],
    ac: 12,
    spellSlots: { '1': 2 },
  },
  'fighter': {
    gear: ['Longsword', 'Chain Mail', 'Shield', "Explorer's Pack", 'Handaxe (2)'],
    abilities: [
      'Second Wind — Regain 1d10+level HP as a bonus action. Once per short rest',
      'Fighting Style: Defense — +1 AC while wearing armor',
    ],
    spells: [],
    skills: ['Athletics', 'Perception'],
    ac: 18,
    spellSlots: {},
  },
  'rogue': {
    gear: ['Shortsword', 'Leather Armor', "Thieves' Tools", "Burglar's Pack", 'Dagger (2)'],
    abilities: [
      'Sneak Attack — +1d6 damage when you have advantage or an ally is adjacent to target',
      "Expertise — Double proficiency on Stealth and Thieves' Tools",
      'Thieves\' Cant — Secret language of thieves',
    ],
    spells: [],
    skills: ['Stealth', 'Acrobatics', 'Sleight of Hand', 'Perception'],
    ac: 13,
    spellSlots: {},
  },
  'wizard': {
    gear: ['Quarterstaff', 'Arcane Focus', 'Spellbook', "Scholar's Pack", 'Component Pouch'],
    abilities: [
      'Arcane Recovery — Recover one 1st-level spell slot on a short rest once per day',
      'Ritual Casting — Cast known ritual spells without expending a slot',
    ],
    spells: ['Fire Bolt', 'Mage Hand', 'Light', 'Magic Missile', 'Shield', 'Sleep'],
    skills: ['Arcana', 'Investigation'],
    ac: 10,
    spellSlots: { '1': 2 },
  },
  'barbarian': {
    gear: ['Greataxe', 'Hide Armor', 'Javelins (4)', "Explorer's Pack"],
    abilities: [
      'Rage — 2/long rest: advantage on STR checks, +2 melee damage, resistance to bludgeoning/piercing/slashing for 1 min',
      'Unarmored Defense — AC = 10 + DEX + CON when not wearing armor',
    ],
    spells: [],
    skills: ['Athletics', 'Intimidation'],
    ac: null, // calculated from unarmored defense
    spellSlots: {},
  },
  'cleric': {
    gear: ['Mace', 'Scale Mail', 'Shield', 'Holy Symbol', "Priest's Pack"],
    abilities: [
      'Turn Undead — Force undead within 30ft to flee for 1 min (WIS save). Once per short rest',
      'Divine Domain: Life — Bonus healing on cure spells',
    ],
    spells: ['Sacred Flame', 'Guidance', 'Cure Wounds', 'Bless', 'Shield of Faith'],
    skills: ['Medicine', 'Religion'],
    ac: 16,
    spellSlots: { '1': 2 },
  },
};

// Lists for character creation UI
export const RACES = [
  { name: 'Human', desc: 'Versatile and ambitious. +1 to all ability scores.' },
  { name: 'Elf', desc: 'Graceful with keen senses. Darkvision, trance instead of sleep.' },
  { name: 'Dwarf', desc: 'Tough and resilient. Poison resistance, stonecunning.' },
  { name: 'Dragonborn', desc: 'Dragon-descended warriors. Breath weapon and damage resistance.' },
  { name: 'Tiefling', desc: 'Infernal heritage. Fire resistance, innate spellcasting.' },
  { name: 'Half-Orc', desc: 'Fierce and enduring. Relentless endurance, savage attacks.' },
  { name: 'Glitchborn', desc: 'Digital-touched humans. Can briefly phase through the Datastream.' },
  { name: 'Wyrmkin', desc: 'Dragon-descended. Scales, claws, and a draconic affinity.' },
  { name: 'Shardfolk', desc: 'Crystalline beings from The Shardlands. Refract magic.' },
];

export const CLASSES = [
  { name: 'Glitch Knight', desc: 'Heavy armor + reality distortion. Tank/melee. d10 hit die.' },
  { name: 'Neon Assassin', desc: 'Tech-enhanced stealth killer. DPS. d8 hit die.' },
  { name: 'Wyrmcaller', desc: 'Dragon spirit pacts. Caster/summoner. d8 hit die.' },
  { name: 'Techshaman', desc: 'Machine-nature healer. Support. d8 hit die.' },
  { name: 'Codec Mage', desc: 'Reality-hacking digital sorcerer. Control. d6 hit die.' },
  { name: 'Fighter', desc: 'Martial combat expert. Versatile warrior. d10 hit die.' },
  { name: 'Rogue', desc: 'Cunning and stealthy. Sneak attack, expertise. d8 hit die.' },
  { name: 'Wizard', desc: 'Arcane spellcaster. Huge spell list. d6 hit die.' },
  { name: 'Barbarian', desc: 'Rage-fueled berserker. Massive HP. d12 hit die.' },
  { name: 'Cleric', desc: 'Divine caster and healer. Armor + spells. d8 hit die.' },
];

export const GAME_REGIONS = [
  { name: 'Luminara', desc: 'Neon megacity continent. Cyberpunk + wizardry. Capital: Prisma City.' },
  { name: 'Wyrmholt', desc: 'Ancient forests and dragon territory. Capital: Thornspire.' },
  { name: 'The Shardlands', desc: 'Floating islands and wild magic. Capital: Driftstone Keep.' },
  { name: 'Ferromar', desc: 'Industrial steampunk coast. Capital: Ironhaven.' },
];

export const ALIGNMENTS = [
  { name: 'Lawful Good', desc: 'Honor and compassion.' },
  { name: 'Neutral Good', desc: "Does what's right, flexible on rules." },
  { name: 'Chaotic Good', desc: 'Freedom-loving do-gooder.' },
  { name: 'Lawful Neutral', desc: 'Order above all else.' },
  { name: 'True Neutral', desc: 'Balance, pragmatism.' },
  { name: 'Chaotic Neutral', desc: 'Free spirit, unpredictable.' },
  { name: 'Lawful Evil', desc: 'Ruthless but orderly.' },
  { name: 'Neutral Evil', desc: 'Self-serving, no loyalty.' },
  { name: 'Chaotic Evil', desc: 'Destructive and selfish.' },
];

// Build a complete character from creation data, filling in class defaults
export function buildCharacter(data) {
  const cls = (data.class || 'Fighter').toLowerCase();
  const classInfo = CLASS_DATA[cls] || CLASS_DATA['fighter'];
  const stats = data.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const conMod = Math.floor((stats.con - 10) / 2);
  const dexMod = Math.floor((stats.dex - 10) / 2);
  const hd = HIT_DICE[cls] || 8;
  const hp = data.hp || (hd + conMod);

  // AC: use provided, class-specific, or calculate
  let ac;
  if (cls === 'barbarian') {
    ac = data.ac || (10 + dexMod + conMod);
  } else if (data.ac && data.ac > 10) {
    ac = data.ac;
  } else if (classInfo.ac != null) {
    ac = classInfo.ac;
  } else {
    ac = 10 + dexMod;
  }

  return {
    name: data.name || 'Unknown',
    race: data.race || 'Human',
    class: data.class || 'Fighter',
    level: data.level || 1,
    background: data.background || '',
    alignment: data.alignment || 'True Neutral',
    region: data.region || 'Luminara',
    hp,
    maxHp: data.maxHp || hp,
    ac,
    stats,
    skills: data.skills?.length > 0 ? data.skills : classInfo.skills,
    inventory: data.inventory?.length > 0 ? data.inventory : classInfo.gear,
    gold: data.gold || 15,
    spellSlots: data.spellSlots && Object.keys(data.spellSlots).length > 0 ? data.spellSlots : { ...classInfo.spellSlots },
    maxSpellSlots: data.maxSpellSlots && Object.keys(data.maxSpellSlots).length > 0 ? data.maxSpellSlots : { ...classInfo.spellSlots },
    spells: data.spells?.length > 0 ? data.spells : classInfo.spells,
    abilities: data.abilities?.length > 0 ? data.abilities : classInfo.abilities,
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    xp: 0,
    proficiencyBonus: 2,
    createdAt: new Date().toISOString(),
  };
}
