import OpenAI from 'openai';
import { rollAbilityScores } from './dice.js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { CLASS_DATA, HIT_DICE, RACES, CLASSES, GAME_REGIONS } from './class-data.js';

// Load .env manually
const envPath = path.join(import.meta.dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const BASE_URL = process.env.BONZAI_BASE_URL || 'https://api-v2.bonzai.iodigital.com/v1';
const API_KEY = process.env.BONZAI_API_KEY;
const MODEL = process.env.BONZAI_MODEL || 'claude-sonnet-4-6';

export class AiCharacterCreator {
  constructor() {
    if (!API_KEY) throw new Error('BONZAI_API_KEY not set in .env');
    this.client = new OpenAI({
      baseURL: BASE_URL,
      apiKey: API_KEY,
    });
  }

  async chat(message, history) {
    // Build class data section dynamically from shared CLASS_DATA
    const classLines = Object.entries(CLASS_DATA).map(([cls, d]) => {
      const parts = [`gear=[${d.gear.join(', ')}]`, `abilities=[${d.abilities.map(a => a.split(' — ')[0]).join(', ')}]`];
      if (d.spells.length > 0) parts.push(`spells=[${d.spells.join(', ')}]`);
      parts.push(`skills=[${d.skills.join(', ')}]`);
      parts.push(`ac=${d.ac ?? 'use_unarmored'}`);
      if (d.spellSlots && Object.keys(d.spellSlots).length > 0) parts.push(`spellSlots=${JSON.stringify(d.spellSlots)}`);
      return `- ${cls.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}: ${parts.join(', ')}`;
    }).join('\n');

    const raceList = RACES.map(r => r.name).join(', ');
    const classList = CLASSES.map(c => `**${c.name}**: ${c.desc}`).join('\n- ');
    const regionList = GAME_REGIONS.map(r => `**${r.name}**: ${r.desc}`).join('\n- ');

    const systemPrompt = `You are helping a player create a character for Chronoscape: The World of Aethermere, a D&D 5e cyberpunk-fantasy setting.

## IMPORTANT: Follow these steps IN ORDER. Ask ONE question per message. Move forward, never repeat a step.

Step 1: Ask what VIBE/PLAYSTYLE they want (melee, stealth, magic, support, hybrid). Suggest 2-3 options briefly.
Step 2: Based on their answer, recommend a CLASS. Present 2-3 fitting classes with one-line descriptions. Let them pick.
Step 3: Recommend a RACE that fits. Present 2-3 options. Let them pick.
Step 4: Ask for their CHARACTER NAME.
Step 5: Ask for a brief BACKGROUND (suggest one if they're stuck).
Step 6: Pick a REGION for them based on their class/background (or let them choose).
Step 7: OUTPUT THE CHARACTER JSON IMMEDIATELY. Do not ask more questions.

If the player says "done", "finish", "create it", or similar at ANY point, skip remaining steps and generate the character NOW using what you know so far (fill in sensible defaults for anything missing).

## Available Options

### Races
${raceList}

### Classes
- ${classList}

### Regions
- ${regionList}

### Class Data (use EXACTLY these for inventory/abilities/spells in the JSON)
${classLines}

## Keep responses SHORT — 2-4 sentences max per message. Be punchy and exciting, not verbose.

## When outputting the character
Wrap in \`\`\`character-json markers. Roll stats using 4d6-drop-lowest method (generate realistic varied scores, NOT all 10s). Use the class data above for inventory, abilities, spells, skills, and AC. Calculate HP = hit die + CON modifier.

\`\`\`character-json
{
  "name": "...", "race": "...", "class": "...", "level": 1,
  "background": "...", "alignment": "...", "region": "...",
  "stats": { "str": 14, "dex": 10, "con": 16, "int": 12, "wis": 13, "cha": 8 },
  "hp": 10, "maxHp": 10, "ac": 12,
  "skills": [...], "inventory": [...], "gold": 15,
  "spellSlots": {}, "maxSpellSlots": {},
  "spells": [...], "abilities": [...],
  "conditions": [], "deathSaves": { "successes": 0, "failures": 0 },
  "xp": 0, "proficiencyBonus": 2
}
\`\`\``;

    // Build messages — history already includes the user's messages, don't double-add
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
    ];
    // Only add message separately if it's not already the last history item
    const lastHistory = history[history.length - 1];
    if (!lastHistory || lastHistory.content !== message || lastHistory.role !== 'user') {
      messages.push({ role: 'user', content: message });
    }

    const response = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages,
    });

    const text = response.choices[0].message.content;

    // Check if AI generated a character
    const charMatch = text.match(/```character-json\n([\s\S]*?)```/);
    let character = null;
    let displayMessage = text;

    if (charMatch) {
      try {
        character = JSON.parse(charMatch[1]);
        // Auto-roll stats if AI didn't provide them properly
        if (!character.stats || Object.values(character.stats).every(v => v === 10)) {
          const scores = rollAbilityScores();
          const names = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
          character.stats = {};
          names.forEach((n, i) => { character.stats[n] = scores[i].total; });
        }
        // Ensure defaults
        character.level = character.level || 1;
        character.conditions = character.conditions || [];
        character.deathSaves = character.deathSaves || { successes: 0, failures: 0 };
        character.xp = character.xp || 0;
        character.proficiencyBonus = character.proficiencyBonus || 2;
        character.inventory = character.inventory || [];
        character.gold = character.gold || 10;
        character.spellSlots = character.spellSlots || {};
        character.maxSpellSlots = character.maxSpellSlots || {};
        character.spells = character.spells || [];
        character.abilities = character.abilities || [];

        // Recalculate HP and AC from stats
        const conMod = Math.floor((character.stats.con - 10) / 2);
        const dexMod = Math.floor((character.stats.dex - 10) / 2);
        const hd = HIT_DICE[character.class?.toLowerCase()] || 8;
        if (!character.hp || character.hp <= 0) {
          character.hp = hd + conMod;
          character.maxHp = character.hp;
        }
        if (!character.ac || character.ac <= 0) {
          character.ac = 10 + dexMod;
        }
      } catch (e) {
        console.error('[AI Character Creator] Failed to parse character JSON:', e.message);
        character = null;
      }
      // Strip JSON from display
      displayMessage = text.replace(/```character-json[\s\S]*?```/, '').trim();
    }

    return { message: displayMessage, character };
  }
}
