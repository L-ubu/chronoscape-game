// Class progression tables for Chronoscape
// Each class defines what is gained at each level (2-9 for now).
// Level 1 is handled by character creation.

export const CLASS_PROGRESSION = {
  'glitch knight': {
    2: {
      abilities: ['Action Surge — Once per short rest, take an additional action on your turn'],
      spells: [],
    },
    3: {
      abilities: ['Corrupted Surge — When you use Virus Strike, the target must also make a CON save or be stunned until end of its next turn'],
      spells: [],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Extra Attack — You can attack twice when you take the Attack action', 'Digital Corruption damage increases to 2d6'],
      spells: [],
    },
    6: {
      abilities: ['Glitch Phase — Once per long rest, phase through a solid object or wall up to 10ft thick'],
      spells: [],
    },
    7: {
      abilities: ['Virus Strike recharges on short rest and deals 2d4 recurring damage'],
      spells: [],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Indomitable — Once per long rest, reroll a failed saving throw'],
      spells: [],
    },
  },

  'neon assassin': {
    2: {
      abilities: ['Cunning Action — Dash, Disengage, or Hide as a bonus action'],
      spells: [],
    },
    3: {
      abilities: ['Neon Strike damage increases to 3d6', 'Holographic Decoy — Create an illusory copy of yourself as a bonus action. Lasts 1 round. Once per short rest'],
      spells: [],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Uncanny Dodge — When hit by an attack you can see, use your reaction to halve the damage', 'Neon Strike damage increases to 4d6'],
      spells: [],
    },
    6: {
      abilities: ['Expertise — Double proficiency bonus on two more skills of your choice'],
      spells: [],
    },
    7: {
      abilities: ['Evasion — On a DEX save for half damage, take no damage on success and half on failure', 'Lightbend can now be used twice per short rest'],
      spells: [],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Shadow Step can now teleport up to 60ft', 'Neon Strike damage increases to 5d6'],
      spells: [],
    },
  },

  'wyrmcaller': {
    2: {
      abilities: ['Dragon Spirit can now make a spectral bite attack: +4 to hit, 1d8+2 fire damage'],
      spells: ['Chromatic Orb'],
    },
    3: {
      abilities: ['Wyrmfire damage increases to 3d6 and range to 40ft'],
      spells: ['Scorching Ray'],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Dragon Wings — Your spirit can carry you: gain 30ft fly speed for 1 minute, once per long rest'],
      spells: ['Fireball', 'Counterspell'],
    },
    6: {
      abilities: ['Draconic Resilience extends to cold and lightning damage'],
      spells: ['Dragon\'s Breath'],
    },
    7: {
      abilities: ['Wyrmfire recharges on short rest and can be shaped as 30ft cone or 60ft line'],
      spells: ['Wall of Fire'],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Ancient Bond — Your dragon spirit grows larger and more powerful. Its bite deals 2d8+4 fire damage'],
      spells: ['Cone of Cold', 'Dominate Person'],
    },
  },

  'techshaman': {
    2: {
      abilities: ['Wild Shape: Digital — Transform into a digital beast (wolf, hawk, spider) for 1 hour. Twice per short rest'],
      spells: ['Healing Word'],
    },
    3: {
      abilities: ['Nanite Healing heals 2d8+WIS HP'],
      spells: ['Lesser Restoration', 'Moonbeam'],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Datastream Sight range extends to 60ft and can detect hidden creatures'],
      spells: ['Mass Healing Word', 'Plant Growth'],
    },
    6: {
      abilities: ['Nature-Tech Interface can now hack simple electronic locks and systems'],
      spells: ['Protection from Energy'],
    },
    7: {
      abilities: ['Nanite Cloud — Once per long rest, create a 20ft radius healing cloud: allies regain 2d6 HP at start of their turn for 3 rounds'],
      spells: ['Guardian of Nature'],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Wild Shape: Digital can now take the form of large digital beasts (bear, dire wolf, giant eagle)'],
      spells: ['Mass Cure Wounds', 'Greater Restoration'],
    },
  },

  'codec mage': {
    2: {
      abilities: ['Arcane Recovery — Recover spell slots totaling half your level (rounded up) on a short rest once per day'],
      spells: ['Misty Step'],
    },
    3: {
      abilities: ['Code Sight can now see through illusions within 30ft'],
      spells: ['Shatter', 'Hold Person'],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Reality Rewrite can now be used twice per long rest', 'Buffer Overflow grants temp HP equal to INT mod + level'],
      spells: ['Fireball', 'Counterspell', 'Haste'],
    },
    6: {
      abilities: ['Syntax Error — Once per short rest, as a reaction when a creature within 60ft casts a spell, force a spellcasting check (DC 10 + spell level) or the spell fails'],
      spells: ['Dispel Magic'],
    },
    7: {
      abilities: ['Recursive Loop — When you cast a spell of 3rd level or lower, you can immediately cast it again at one level lower as a bonus action. Once per long rest'],
      spells: ['Banishment', 'Polymorph'],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Kernel Panic — Once per long rest, all enemies within 30ft must make an INT save or be stunned for 1 round and take 6d6 psychic damage (half on save)'],
      spells: ['Wall of Force', 'Telekinesis'],
    },
  },

  'fighter': {
    2: {
      abilities: ['Action Surge — Once per short rest, take an additional action on your turn'],
      spells: [],
    },
    3: {
      abilities: ['Martial Archetype: Champion — Improved Critical: your attacks score a critical hit on 19-20'],
      spells: [],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Extra Attack — You can attack twice when you take the Attack action'],
      spells: [],
    },
    6: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    7: {
      abilities: ['Remarkable Athlete — Add half your proficiency bonus to STR/DEX/CON checks that don\'t already use proficiency'],
      spells: [],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Indomitable — Once per long rest, reroll a failed saving throw'],
      spells: [],
    },
  },

  'rogue': {
    2: {
      abilities: ['Cunning Action — Dash, Disengage, or Hide as a bonus action'],
      spells: [],
    },
    3: {
      abilities: ['Roguish Archetype: Thief — Fast Hands: use Sleight of Hand, thieves\' tools, or Use Object as a bonus action', 'Sneak Attack increases to 2d6'],
      spells: [],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Uncanny Dodge — When hit by an attack you can see, use your reaction to halve the damage', 'Sneak Attack increases to 3d6'],
      spells: [],
    },
    6: {
      abilities: ['Expertise — Double proficiency bonus on two more skills of your choice'],
      spells: [],
    },
    7: {
      abilities: ['Evasion — On a DEX save for half damage, take no damage on success and half on failure', 'Sneak Attack increases to 4d6'],
      spells: [],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Supreme Sneak — Advantage on Stealth checks if you move no more than half your speed', 'Sneak Attack increases to 5d6'],
      spells: [],
    },
  },

  'wizard': {
    2: {
      abilities: ['Arcane Tradition: Evocation — Sculpt Spells: create pockets of safety in your evocation spells for allies'],
      spells: ['Burning Hands', 'Thunderwave'],
    },
    3: {
      abilities: [],
      spells: ['Misty Step', 'Shatter'],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Potent Cantrip — When a creature saves against your cantrip, they still take half damage'],
      spells: ['Fireball', 'Counterspell', 'Fly'],
    },
    6: {
      abilities: ['Sculpt Spells improves: up to 1+spell level creatures are automatically safe'],
      spells: ['Dispel Magic'],
    },
    7: {
      abilities: [],
      spells: ['Banishment', 'Polymorph', 'Greater Invisibility'],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Empowered Evocation — Add INT modifier to damage of evocation spells'],
      spells: ['Wall of Force', 'Cone of Cold', 'Telekinesis'],
    },
  },

  'barbarian': {
    2: {
      abilities: ['Reckless Attack — Advantage on STR melee attacks this turn, but attacks against you have advantage until your next turn', 'Danger Sense — Advantage on DEX saves against effects you can see'],
      spells: [],
    },
    3: {
      abilities: ['Primal Path: Berserker — Frenzy: while raging, you can make a bonus action melee attack each turn (1 level of exhaustion when rage ends)'],
      spells: [],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Extra Attack — You can attack twice when you take the Attack action', 'Fast Movement — +10ft speed when not wearing heavy armor'],
      spells: [],
    },
    6: {
      abilities: ['Mindless Rage — Can\'t be charmed or frightened while raging'],
      spells: [],
    },
    7: {
      abilities: ['Feral Instinct — Advantage on initiative rolls. If surprised, you can act normally if you rage first'],
      spells: [],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: ['Brutal Critical — Roll one additional damage die on a critical hit with a melee attack'],
      spells: [],
    },
  },

  'cleric': {
    2: {
      abilities: ['Channel Divinity — Once per short rest, invoke divine energy for a powerful effect', 'Channel Divinity: Turn Undead improves'],
      spells: ['Spiritual Weapon'],
    },
    3: {
      abilities: [],
      spells: ['Spirit Guardians', 'Revivify'],
    },
    4: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1'],
      spells: [],
      feat: true,
    },
    5: {
      abilities: ['Destroy Undead — Undead of CR 1/2 or lower are instantly destroyed by Turn Undead'],
      spells: ['Guardian of Faith', 'Banishment'],
    },
    6: {
      abilities: ['Channel Divinity can now be used twice per short rest'],
      spells: ['Heal'],
    },
    7: {
      abilities: ['Divine Strike — Once per turn, deal an extra 1d8 radiant damage with a weapon attack'],
      spells: ['Death Ward'],
    },
    8: {
      abilities: ['Ability Score Improvement — Increase one ability score by 2, or two ability scores by 1', 'Divine Strike damage increases to 2d8'],
      spells: [],
      feat: true,
    },
    9: {
      abilities: [],
      spells: ['Mass Cure Wounds', 'Flame Strike', 'Raise Dead'],
    },
  },
};

// Available feats when a class gets feat: true at certain levels
export const FEATS = [
  { name: 'Alert', desc: '+5 to initiative. Can\'t be surprised while conscious.' },
  { name: 'Tough', desc: 'Your HP maximum increases by 2 for every level you have.' },
  { name: 'Lucky', desc: '3 luck points per long rest. Spend one to reroll any d20.' },
  { name: 'Sharpshooter', desc: '-5 to hit for +10 damage with ranged weapons. No disadvantage at long range.' },
  { name: 'Great Weapon Master', desc: '-5 to hit for +10 damage with heavy melee weapons. Bonus action attack on crit or kill.' },
  { name: 'War Caster', desc: 'Advantage on CON saves to maintain concentration. Can cast spells as opportunity attacks.' },
  { name: 'Sentinel', desc: 'Creatures you hit with opportunity attacks have 0 speed. Can attack creatures that attack allies within 5ft.' },
  { name: 'Mobile', desc: '+10ft speed. Dash through difficult terrain. No opportunity attacks from creatures you melee.' },
  { name: 'Resilient', desc: 'Choose one ability score: +1 and proficiency in saving throws for that ability.' },
  { name: 'Observant', desc: '+5 to passive Perception and Investigation. Can read lips.' },
  { name: 'Data Jack', desc: '[Chronoscape] Interface directly with the Datastream. Advantage on hacking and digital checks.' },
  { name: 'Neon Veins', desc: '[Chronoscape] Arcane circuits glow under your skin. +1 to spell attack rolls and spell save DC.' },
  { name: 'Dragon Touched', desc: '[Chronoscape] Your proximity to dragons has changed you. Gain resistance to one elemental damage type.' },
];
