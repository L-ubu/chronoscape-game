// Item and weapon database for Chronoscape
// Items have: name, type, subtype, damage, properties, description, weight, value

export const ITEMS = {
  // === WEAPONS — Melee ===
  'Corrupted Greatsword': {
    type: 'weapon', subtype: 'melee',
    damage: '2d6 slashing', properties: ['heavy', 'two-handed'],
    stat: 'str',
    desc: 'A massive blade wreathed in flickering digital corruption. Glitches reality on impact.',
    weight: 6, value: 50,
  },
  'Twin Neon Daggers': {
    type: 'weapon', subtype: 'melee',
    damage: '1d4 piercing (each)', properties: ['finesse', 'light', 'thrown (20/60)'],
    stat: 'dex',
    desc: 'Matched blades that trail neon light. Perfect for quick, precise strikes.',
    weight: 1, value: 40,
  },
  'Dragon-bonded Staff': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 bludgeoning', properties: ['versatile (1d8)', 'arcane focus'],
    stat: 'str',
    desc: 'Living wood wrapped in dragon scale. Warm to the touch, hums with draconic energy.',
    weight: 4, value: 35,
  },
  'Longsword': {
    type: 'weapon', subtype: 'melee',
    damage: '1d8 slashing', properties: ['versatile (1d10)'],
    stat: 'str',
    desc: 'A reliable blade. Standard issue for trained fighters.',
    weight: 3, value: 15,
  },
  'Shortsword': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 piercing', properties: ['finesse', 'light'],
    stat: 'dex',
    desc: 'Short blade favored by rogues and dual-wielders.',
    weight: 2, value: 10,
  },
  'Mace': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 bludgeoning', properties: [],
    stat: 'str',
    desc: 'A heavy flanged mace. Simple and devastating.',
    weight: 4, value: 5,
  },
  'Greataxe': {
    type: 'weapon', subtype: 'melee',
    damage: '1d12 slashing', properties: ['heavy', 'two-handed'],
    stat: 'str',
    desc: 'An enormous axe that cleaves through armor and bone alike.',
    weight: 7, value: 30,
  },
  'Quarterstaff': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 bludgeoning', properties: ['versatile (1d8)'],
    stat: 'str',
    desc: 'A simple wooden staff. Doubles as a walking stick and arcane focus.',
    weight: 4, value: 2,
  },
  'Handaxe': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 slashing', properties: ['light', 'thrown (20/60)'],
    stat: 'str',
    desc: 'Small axe suitable for melee or throwing.',
    weight: 2, value: 5,
  },
  'Dagger': {
    type: 'weapon', subtype: 'melee',
    damage: '1d4 piercing', properties: ['finesse', 'light', 'thrown (20/60)'],
    stat: 'dex',
    desc: 'A simple blade. Easy to conceal, easy to throw.',
    weight: 1, value: 2,
  },
  'Javelin': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 piercing', properties: ['thrown (30/120)'],
    stat: 'str',
    desc: 'A sturdy throwing spear.',
    weight: 2, value: 1,
  },

  // === WEAPONS — Ranged / Spell ===
  'Codec Wand': {
    type: 'weapon', subtype: 'arcane focus',
    damage: 'spell damage', properties: ['arcane focus'],
    stat: 'int',
    desc: 'A wand etched with lines of living code. Channels digital sorcery.',
    weight: 1, value: 25,
  },
  'Tech-Nature Focus': {
    type: 'weapon', subtype: 'arcane focus',
    damage: 'spell damage', properties: ['druidic focus'],
    stat: 'wis',
    desc: 'A crystal lens fused with circuit-vines. Bridges the natural and digital worlds.',
    weight: 1, value: 20,
  },
  'Arcane Focus': {
    type: 'weapon', subtype: 'arcane focus',
    damage: 'spell damage', properties: ['arcane focus'],
    stat: 'int',
    desc: 'A crystal orb that pulses with arcane energy.',
    weight: 1, value: 10,
  },
  'Holy Symbol': {
    type: 'weapon', subtype: 'holy focus',
    damage: 'spell damage', properties: ['holy focus'],
    stat: 'wis',
    desc: 'A sacred emblem of divine power.',
    weight: 0, value: 5,
  },
  'Grappling Wire': {
    type: 'weapon', subtype: 'utility',
    damage: '—', properties: ['reach 30ft', 'utility'],
    stat: 'dex',
    desc: 'High-tension wire with magnetic anchor. Hook onto ledges or bind targets.',
    weight: 1, value: 25,
  },

  // === ARMOR ===
  'Heavy Glitch Plate': {
    type: 'armor', subtype: 'heavy',
    ac: 18, properties: ['heavy', 'stealth disadvantage'],
    desc: 'Plate armor infused with glitch energy. Distorts light, making ranged attacks harder.',
    weight: 65, value: 200,
  },
  'Shadow Suit': {
    type: 'armor', subtype: 'light',
    ac: '12 + DEX', properties: ['light'],
    desc: 'Skin-tight suit that absorbs and bends light. Favored by assassins.',
    weight: 5, value: 75,
  },
  'Scale Mail': {
    type: 'armor', subtype: 'medium',
    ac: '14 + DEX (max 2)', properties: ['medium', 'stealth disadvantage'],
    desc: 'Overlapping metal scales. Solid protection with decent mobility.',
    weight: 45, value: 50,
  },
  'Hide Armor': {
    type: 'armor', subtype: 'medium',
    ac: '12 + DEX (max 2)', properties: ['medium'],
    desc: 'Thick hide and furs. Rugged and reliable.',
    weight: 12, value: 10,
  },
  'Chain Mail': {
    type: 'armor', subtype: 'heavy',
    ac: 16, properties: ['heavy', 'stealth disadvantage'],
    desc: 'Interlocking metal rings. Strong protection for frontline fighters.',
    weight: 55, value: 75,
  },
  'Leather Armor': {
    type: 'armor', subtype: 'light',
    ac: '11 + DEX', properties: ['light'],
    desc: 'Hardened leather. Light and flexible.',
    weight: 10, value: 10,
  },
  'Digital Robes': {
    type: 'armor', subtype: 'clothing',
    ac: '10 + DEX', properties: [],
    desc: 'Robes woven with data-threads. They shimmer with faint code patterns.',
    weight: 3, value: 15,
  },
  'Shield': {
    type: 'armor', subtype: 'shield',
    ac: '+2', properties: [],
    desc: 'A sturdy shield. +2 to AC.',
    weight: 6, value: 10,
  },
  'Shield Core': {
    type: 'armor', subtype: 'shield',
    ac: '+2', properties: ['glitch-infused'],
    desc: 'A shield projector powered by glitch energy. Flickers with digital static.',
    weight: 4, value: 45,
  },

  // === GEAR ===
  'Explorer\'s Pack': {
    type: 'gear', subtype: 'pack',
    desc: 'Bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, 50ft rope.',
    weight: 10, value: 10,
  },
  'Burglar\'s Pack': {
    type: 'gear', subtype: 'pack',
    desc: 'Backpack, caltrops, string, bell, candles (5), crowbar, hammer, pitons (10), lantern, oil (2), rations (5), tinderbox, waterskin.',
    weight: 11, value: 16,
  },
  'Scholar\'s Pack': {
    type: 'gear', subtype: 'pack',
    desc: 'Backpack, book of lore, ink, pen, parchment (10), little bag of sand, small knife.',
    weight: 5, value: 40,
  },
  'Priest\'s Pack': {
    type: 'gear', subtype: 'pack',
    desc: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2), censer, vestments, rations (2), waterskin.',
    weight: 6, value: 19,
  },
  'Thieves\' Tools': {
    type: 'gear', subtype: 'tools',
    desc: 'Lock picks, tiny mirror, narrow scissors, pliers. Required for picking locks and disarming traps.',
    weight: 1, value: 25,
  },
  'Healer\'s Kit': {
    type: 'gear', subtype: 'tools',
    desc: '10 uses. Stabilize a dying creature without a Medicine check.',
    weight: 3, value: 5,
  },
  'Component Pouch': {
    type: 'gear', subtype: 'tools',
    desc: 'Pouch of material components for spellcasting.',
    weight: 2, value: 25,
  },
  'Spellbook': {
    type: 'gear', subtype: 'tools',
    desc: 'A leather-bound book containing your recorded spells.',
    weight: 3, value: 50,
  },
  'Spellbook Drive': {
    type: 'gear', subtype: 'tools',
    desc: 'A crystalline data drive containing encoded spells. Glows when accessed.',
    weight: 1, value: 60,
  },
  'Wyrmholt Herbs': {
    type: 'gear', subtype: 'consumable',
    desc: 'Pouch of rare forest herbs from Wyrmholt. Used in healing and rituals.',
    weight: 1, value: 15,
  },
  'Datastream Lens': {
    type: 'gear', subtype: 'tools',
    desc: 'A monocle-like device that reveals hidden digital constructs and data trails.',
    weight: 0, value: 30,
  },
  'Smoke Pellets (3)': {
    type: 'gear', subtype: 'consumable',
    desc: '3 uses. Throw to create a 10ft cloud of smoke. Heavily obscures area for 1 round.',
    weight: 0, value: 15,
  },

  // === VAULT CUSTOM ITEMS (from Tech-Magic Items of Aethermere) ===
  'Glitch Blade': {
    type: 'weapon', subtype: 'melee',
    damage: '1d8+1 slashing', properties: ['versatile (1d10+1)', '+1 attack/damage', 'phase through armor 1/short rest'],
    stat: 'str', rarity: 'Rare', attunement: true,
    desc: 'Blade phases between solid and translucent. +1 to attack and damage. Once per short rest, ignore AC from armor/shields.',
    weight: 3, value: 500,
  },
  'Codec Wand (Hackstick)': {
    type: 'weapon', subtype: 'arcane focus',
    damage: 'spell damage', properties: ['arcane focus', 'hacking tool', '3 charges'],
    stat: 'int', rarity: 'Uncommon', attunement: true,
    desc: 'Spellcasting focus + hacking tool. Advantage on mana-tech checks. 3 charges: Detect Magic (1), Identify (1), Dispel Magic (2). Regains 1d4-1 at dawn.',
    weight: 1, value: 250,
  },
  'Boots of Phase Walking': {
    type: 'gear', subtype: 'wondrous',
    rarity: 'Rare', attunement: true,
    desc: 'Phase through up to 10ft of solid matter 1/long rest. If you end inside solid matter: 4d10 force damage.',
    weight: 2, value: 500,
  },
  'Dronekeeper\'s Orb': {
    type: 'gear', subtype: 'wondrous',
    rarity: 'Uncommon', attunement: true,
    desc: 'Floating sphere — mechanical familiar (construct). Fly 60ft, AC 13, 10 HP, audio/visual 1 mile, deliver touch spells. Rebuilds on long rest.',
    weight: 2, value: 300,
  },
  'Zhen\'s Restorative Ramen': {
    type: 'gear', subtype: 'consumable',
    rarity: 'Uncommon',
    desc: 'Restores 2d8+5 HP, removes 1 exhaustion, advantage on WIS saves for 1 hour. Always perfectly warm.',
    weight: 1, value: 50,
  },
  'Wyrmscale Jacket': {
    type: 'armor', subtype: 'light',
    ac: '14 + DEX', properties: ['light', 'spell reflection 1/long rest'],
    rarity: 'Very Rare', attunement: true,
    desc: 'Dragon-scale leather jacket. AC 14+DEX. Resistance to one dragon damage type. Reflect spells 3rd level or lower 1/long rest.',
    weight: 8, value: 1500,
  },
  'Mana Battery': {
    type: 'gear', subtype: 'wondrous',
    rarity: 'Uncommon',
    desc: 'Stores a prepared spell (up to 3rd level). Anyone can release it. Single use.',
    weight: 1, value: 100,
  },
  'Thunderclaw Gauntlets': {
    type: 'weapon', subtype: 'melee',
    damage: '1d6 bludgeoning + 1d4 lightning', properties: ['thunderclap on crit', 'charged punch 1/long rest +3d8 lightning'],
    stat: 'str', rarity: 'Rare', attunement: true,
    desc: 'Armored gloves with mana-coils. Crit: 5ft thunderclap (DC 14 CON or deafened). Charge up for +3d8 lightning 1/long rest.',
    weight: 4, value: 600,
  },
  'Voidtouched Revolver': {
    type: 'weapon', subtype: 'ranged',
    damage: '2d6 necrotic', properties: ['range 40/120', '6 shots/dawn', 'suppress magic on hit'],
    stat: 'dex', rarity: 'Very Rare', attunement: true,
    desc: 'Null Shard revolver. 6 shots, regenerates at dawn. Hit: DC 15 CHA or suppress one magical effect 1 round. Curse: 1 exhaustion if all 6 fired in a day.',
    weight: 3, value: 1200,
  },
  'Flickerstep Cloak': {
    type: 'gear', subtype: 'wondrous',
    rarity: 'Rare', attunement: true,
    desc: 'Bonus action: invisible until end of next turn (breaks on attack). 3/long rest. Can move through creatures while flickering.',
    weight: 2, value: 500,
  },
  'Null Shard': {
    type: 'gear', subtype: 'consumable',
    rarity: 'Very Rare',
    desc: 'Throw (60ft): 10ft antimagic sphere for 1 minute. Consumed on use.',
    weight: 1, value: 800,
  },
  'Holo-Shield Bracer': {
    type: 'armor', subtype: 'shield',
    ac: '+2', properties: ['free-hand', 'absorb spell 3rd or lower 1/short rest'],
    rarity: 'Rare', attunement: true,
    desc: 'Wrist-mounted hardlight shield. +2 AC, hand stays free. Overclock: absorb spell 3rd level or lower (deactivates until short rest).',
    weight: 2, value: 600,
  },
  'Echo Pendant': {
    type: 'gear', subtype: 'wondrous',
    rarity: 'Rare', attunement: true,
    desc: 'If reduced to 0 HP, time rewinds 1 round. Return to prior position and HP. Single use, then shatters.',
    weight: 0, value: 750,
  },
  'Glitch Grenade': {
    type: 'gear', subtype: 'consumable',
    rarity: 'Rare',
    desc: 'Throw (60ft): 15ft Glitch zone 1 min. Random gravity, tech malfunctions, all attacks disadvantage, movement halved, 2d6 force/round.',
    weight: 1, value: 400,
  },
};

// Look up item data by name (case-insensitive, partial match)
export function getItemData(name) {
  // Exact match first
  if (ITEMS[name]) return { name, ...ITEMS[name] };

  // Strip quantity like "Handaxe (2)" or "Javelins (4)"
  const baseName = name.replace(/\s*\(\d+\)\s*$/, '');
  if (ITEMS[baseName]) return { name, ...ITEMS[baseName] };

  // Case-insensitive search
  const lower = baseName.toLowerCase();
  for (const [key, val] of Object.entries(ITEMS)) {
    if (key.toLowerCase() === lower) return { name, ...val };
  }

  // Partial match (e.g. "Javelin" matches "Javelin")
  for (const [key, val] of Object.entries(ITEMS)) {
    if (key.toLowerCase().startsWith(lower) || lower.startsWith(key.toLowerCase())) {
      return { name, ...val };
    }
  }

  // Unknown item — return basic info
  return { name, type: 'misc', desc: '', weight: 0, value: 0 };
}
