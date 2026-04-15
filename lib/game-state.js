import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { CLASS_PROGRESSION } from './class-progression.js';

const DATA_DIR = path.join(import.meta.dirname, '..', 'data');
const CHARACTERS_DIR = path.join(DATA_DIR, 'characters');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

for (const dir of [DATA_DIR, CHARACTERS_DIR, SESSIONS_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export class GameState {
  constructor() {
    this.players = new Map();       // socketId -> { id, name, character, role }
    this.characters = new Map();    // playerName -> character object
    this.combat = null;             // active combat instance or null
    this.currentScene = {
      location: 'Prisma City',
      description: 'The neon-drenched streets of Prisma City hum with arcane energy and digital noise.',
    };
    this.quests = [];
    this.chatHistory = [];          // rolling history for AI context
    this.stickyEvents = [];         // important events that persist in context
    this.sessionName = null;
    this.dmMode = 'ai';             // 'ai' or 'human'
    this.humanDmSocketId = null;
  }

  addPlayer(socketId, name) {
    const existing = this.loadCharacter(name);
    const player = {
      id: socketId,
      name,
      character: existing,
      role: 'player',
    };
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      if (player.character) {
        this.saveCharacter(player.name, player.character);
      }
      this.players.delete(socketId);
    }
    return player;
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getPlayerByName(name) {
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) return player;
    }
    return null;
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  setCharacter(playerName, character) {
    this.characters.set(playerName, character);
    const player = this.getPlayerByName(playerName);
    if (player) player.character = character;
    this.saveCharacter(playerName, character);
    this.writeCharacterToVault(character);
  }

  // Chat history management for AI context
  addChatMessage(msg) {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 50) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }

  addStickyEvent(event) {
    this.stickyEvents.push({ ...event, timestamp: Date.now() });
    // Keep max 20 sticky events
    if (this.stickyEvents.length > 20) {
      this.stickyEvents = this.stickyEvents.slice(-20);
    }
  }

  // Character persistence
  saveCharacter(name, character) {
    const filePath = path.join(CHARACTERS_DIR, `${sanitizeFilename(name)}.json`);
    writeFileSync(filePath, JSON.stringify(character, null, 2));
  }

  // Write character to Obsidian vault as markdown
  writeCharacterToVault(character) {
    try {
      const VAULT_ROOT = path.join(import.meta.dirname, '..', '..');
      const pcDir = path.join(VAULT_ROOT, 'Characters', 'Player Characters');
      if (!existsSync(pcDir)) mkdirSync(pcDir, { recursive: true });

      const stats = character.stats || {};
      const mod = (val) => { const m = Math.floor(((val || 10) - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };

      const md = `---
type: npc
name: ${character.name}
race: ${character.race}
class: ${character.class}
alignment: ${character.alignment || 'True Neutral'}
region: ${character.region || 'Unknown'}
faction: Independent
role: player
status: alive
tags:
  - npc
  - ally
  - player-character
created: ${new Date().toISOString().slice(0, 10)}
---

# ${character.name}

> *Player character — ${character.race} ${character.class}, Level ${character.level}*

## Background

${character.background || 'Adventurer of Aethermere.'}

## Abilities & Stats

| Stat | Value | Mod |
| --- | --- | --- |
| STR | ${stats.str || 10} | ${mod(stats.str)} |
| DEX | ${stats.dex || 10} | ${mod(stats.dex)} |
| CON | ${stats.con || 10} | ${mod(stats.con)} |
| INT | ${stats.int || 10} | ${mod(stats.int)} |
| WIS | ${stats.wis || 10} | ${mod(stats.wis)} |
| CHA | ${stats.cha || 10} | ${mod(stats.cha)} |

**HP:** ${character.hp}/${character.maxHp} | **AC:** ${character.ac} | **Level:** ${character.level}

## Location

Currently found in [[${character.region || 'Luminara'}]]

## Notes

- Created via Chronoscape game server
`;
      const filePath = path.join(pcDir, `${character.name}.md`);
      writeFileSync(filePath, md);
      console.log(`[VAULT] Character written to ${filePath}`);
    } catch (err) {
      console.error('[VAULT] Failed to write character to vault:', err.message);
    }
  }

  loadCharacter(name) {
    const filePath = path.join(CHARACTERS_DIR, `${sanitizeFilename(name)}.json`);
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
    return null;
  }

  // Session persistence
  saveSession(name) {
    const sessionName = name || `session-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`;
    const data = {
      sessionName,
      savedAt: new Date().toISOString(),
      currentScene: this.currentScene,
      characters: Object.fromEntries(this.characters),
      quests: this.quests,
      stickyEvents: this.stickyEvents,
      chatHistory: this.chatHistory.slice(-20), // save last 20 messages
      combat: this.combat ? {
        round: this.combat.round,
        turnIndex: this.combat.turnIndex,
        combatants: this.combat.combatants,
      } : null,
      dmMode: this.dmMode,
    };
    const filePath = path.join(SESSIONS_DIR, `${sanitizeFilename(sessionName)}.json`);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    this.sessionName = sessionName;
    return sessionName;
  }

  loadSession(name) {
    const filePath = path.join(SESSIONS_DIR, `${sanitizeFilename(name)}.json`);
    if (!existsSync(filePath)) return null;

    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    this.currentScene = data.currentScene || this.currentScene;
    this.quests = data.quests || [];
    this.stickyEvents = data.stickyEvents || [];
    this.chatHistory = data.chatHistory || [];
    this.dmMode = data.dmMode || 'ai';
    this.sessionName = data.sessionName;

    // Restore characters
    if (data.characters) {
      for (const [name, char] of Object.entries(data.characters)) {
        this.characters.set(name, char);
      }
    }

    return data;
  }

  listSessions() {
    if (!existsSync(SESSIONS_DIR)) return [];
    return readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse();
  }

  // XP and leveling
  awardXp(playerName, amount) {
    const player = this.getPlayerByName(playerName);
    if (!player?.character) return null;
    const c = player.character;
    c.xp = (c.xp || 0) + amount;

    // Check for level up
    const levelUp = this.checkLevelUp(c);
    this.saveCharacter(playerName, c);
    return { xp: c.xp, totalXp: amount, levelUp };
  }

  checkLevelUp(character) {
    // D&D 5e XP thresholds
    const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    const currentLevel = character.level || 1;
    if (currentLevel >= 20) return null;

    const xpNeeded = XP_TABLE[currentLevel]; // index = current level = next level threshold
    if ((character.xp || 0) < xpNeeded) return null;

    // Level up!
    character.level = currentLevel + 1;

    // Hit dice by class
    const hitDice = { 'fighter': 10, 'barbarian': 12, 'rogue': 8, 'wizard': 6, 'cleric': 8, 'glitch knight': 10, 'neon assassin': 8, 'wyrmcaller': 8, 'techshaman': 8, 'codec mage': 6 };
    const hd = hitDice[(character.class || '').toLowerCase()] || 8;
    const conMod = Math.floor(((character.stats?.con || 10) - 10) / 2);
    const hpGain = Math.max(1, Math.floor(hd / 2) + 1 + conMod);
    character.maxHp += hpGain;
    character.hp += hpGain; // heal the gained amount

    // Proficiency bonus scales at levels 5, 9, 13, 17
    const profTable = { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 };
    for (const [lvl, bonus] of Object.entries(profTable).reverse()) {
      if (character.level >= parseInt(lvl)) {
        character.proficiencyBonus = bonus;
        break;
      }
    }

    // Spell slot progression for casters
    const casterClasses = ['wyrmcaller', 'techshaman', 'codec mage', 'wizard', 'cleric'];
    if (casterClasses.includes((character.class || '').toLowerCase())) {
      const slotTable = {
        1: { '1': 2 }, 2: { '1': 3 }, 3: { '1': 4, '2': 2 }, 4: { '1': 4, '2': 3 },
        5: { '1': 4, '2': 3, '3': 2 }, 6: { '1': 4, '2': 3, '3': 3 },
        7: { '1': 4, '2': 3, '3': 3, '4': 1 }, 8: { '1': 4, '2': 3, '3': 3, '4': 2 },
        9: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
      };
      const slots = slotTable[Math.min(character.level, 9)];
      if (slots) {
        character.maxSpellSlots = { ...slots };
        character.spellSlots = { ...slots };
      }
    }

    // Class progression — new abilities and spells
    const className = (character.class || '').toLowerCase();
    const progression = CLASS_PROGRESSION[className];
    const newAbilities = [];
    const newSpells = [];
    let hasFeat = false;

    if (progression && progression[character.level]) {
      const levelData = progression[character.level];
      if (levelData.abilities) {
        for (const ability of levelData.abilities) {
          if (!(character.abilities || []).includes(ability)) {
            character.abilities = character.abilities || [];
            character.abilities.push(ability);
            newAbilities.push(ability);
          }
        }
      }
      if (levelData.spells) {
        for (const spell of levelData.spells) {
          if (!(character.spells || []).includes(spell)) {
            character.spells = character.spells || [];
            character.spells.push(spell);
            newSpells.push(spell);
          }
        }
      }
      hasFeat = !!levelData.feat;
    }

    return { newLevel: character.level, hpGain, newMaxHp: character.maxHp, newAbilities, newSpells, hasFeat };
  }

  // Get a summary of game state for AI context
  getStateSummary() {
    const playersWithChars = this.getAllPlayers().filter(p => p.character);

    const partyShort = playersWithChars.map(p => {
      const c = p.character;
      return `${c.name} (${c.race} ${c.class}, HP: ${c.hp}/${c.maxHp}, Level ${c.level})`;
    });

    // Rich per-character details for the AI DM
    let partyDetails = '';
    if (playersWithChars.length > 0) {
      partyDetails = 'Party members:\n' + playersWithChars.map(p => {
        const c = p.character;
        const conds = (c.conditions || []).length > 0 ? c.conditions.join(', ') : 'none';
        const abilities = (c.abilities || []).map(a => a.split(' — ')[0]).join(', ') || 'none';
        const inv = (c.inventory || []).join(', ') || 'empty';
        const spells = (c.spells || []).join(', ') || 'none';
        return `- ${c.name} (${c.race} ${c.class}, Level ${c.level}) — HP: ${c.hp}/${c.maxHp}, AC: ${c.ac}, Prof: +${c.proficiencyBonus || 2}, Conditions: ${conds}
    Abilities: ${abilities}
    Inventory: ${inv}
    Spells: ${spells}`;
      }).join('\n');
    }

    return {
      location: this.currentScene.location,
      locationDescription: this.currentScene.description,
      party: partyShort,
      partyDetails,
      inCombat: !!this.combat,
      combatRound: this.combat?.round || null,
      stickyEvents: this.stickyEvents.map(e => e.text),
      recentHistory: this.chatHistory.slice(-10),
    };
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}
