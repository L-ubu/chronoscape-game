import OpenAI from 'openai';
import { loadWorldContext } from './world-loader.js';
import { lookupForAi } from './dnd-api.js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Load .env manually (no dotenv dependency)
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

export class AiDm {
  constructor(gameState) {
    if (!API_KEY) throw new Error('BONZAI_API_KEY not set in .env');
    this.client = new OpenAI({
      baseURL: BASE_URL,
      apiKey: API_KEY,
    });
    this.gameState = gameState;
    this.io = null; // Set by server.js after construction
    this.worldContext = null;
    this.conversationHistory = [];
    this.init();
  }

  init() {
    console.log(`[AI DM] Loading world context from vault...`);
    this.worldContext = loadWorldContext();
    const approxTokens = Math.round(this.worldContext.length / 4);
    console.log(`[AI DM] World context loaded (~${approxTokens} tokens)`);
    console.log(`[AI DM] Using model: ${MODEL} via Bonzai`);
  }

  buildSystemPrompt(stateSummary) {
    return `You are the Dungeon Master for **Chronoscape: The World of Aethermere**, a D&D 5e campaign set in a cyberpunk-fantasy world where ancient draconic magic and bleeding-edge technology coexist in uneasy tension.

## Your Role
You are an expert, engaging DM who:
- Narrates vividly with cyberpunk-noir atmosphere — neon lights, arcane circuits, dragon-tech fusion
- Voices NPCs with distinct personalities drawn from the world lore below
- Calls for ability checks when outcomes are uncertain (tell the player what to roll)
- Triggers combat when appropriate by outputting [COMBAT:START]
- Uses dark humor and the world's unique flavor (assassin gig apps, dragon server farms, dangerous noodle shops)
- Makes meaningful choices matter — player decisions have consequences
- Is fair but dramatic — don't kill players cheaply, but real danger exists

## CRITICAL RULES — Dice and Mechanics
- **NEVER invent or assume dice roll results.** You do NOT roll dice. The player rolls.
- When an action requires a roll (attack, skill check, saving throw), emit a [ROLL_REQUEST] tag and STOP. Describe the setup, then wait for the player to report their roll result before narrating the outcome.
- Example flow: Player says "I attack the guard" → You say "You raise your blade—roll to attack!" [ROLL_REQUEST:d20+5:Attack roll against the guard (AC 15)] → Player responds "I rolled 18" → THEN you narrate the hit and apply damage with [DAMAGE:amount:target].
- **NEVER say "Let's say you rolled a 15" or make up a number.** The player always rolls.
- For enemy attacks and NPC actions, YOU roll — describe the result directly. Example: "The guard swings at you... the blow connects!" [DAMAGE:6:Kira Phase]
- Always use the character's actual stats, abilities, inventory, and HP shown below. Do not invent stats.

## Mechanical Tags
Embed these in your response — the server intercepts them and updates game state. Players only see narrative.

**Combat & Damage:**
- [ROLL_REQUEST:dice:reason] — Ask player to roll. Example: [ROLL_REQUEST:d20+5:Stealth check]
- [DAMAGE:amount:target] — Deal damage to a character. Example: [DAMAGE:8:Kira Phase]
- [HEAL:amount:target] — Restore HP (server clamps to max). Example: [HEAL:7:Kira Phase]
- [COMBAT:START] — Begin combat encounter (rolls initiative for all players)
- [COMBAT:END] — End combat encounter

**Inventory & Conditions:**
- [LOOT:item:target] — Add an item to a player's inventory. Example: [LOOT:Chrome Blade:Kira Phase]
- [CONDITION_ADD:condition:target] — Apply a condition. Example: [CONDITION_ADD:poisoned:Kira Phase]
- [CONDITION_REMOVE:condition:target] — Remove a condition. Example: [CONDITION_REMOVE:stunned:Kira Phase]

**World & Story:**
- [SCENE:location:description] — Change scene/location
- [STICKY:text] — Mark an important event for persistent memory
- [XP:amount:target] — Award XP. Typical: 25-50 minor, 100-200 significant, 300+ boss fights.
- [LOOKUP:category:query] — Look up D&D 5e data (spell, monster, equipment, condition, feat). Only when you need exact mechanical details.

## World Knowledge
${this.worldContext}

## Current Game State
Location: ${stateSummary.location}
${stateSummary.locationDescription}

${stateSummary.partyDetails || (stateSummary.party.length > 0 ? `Party members: ${stateSummary.party.join(', ')}` : 'No characters yet')}
In combat: ${stateSummary.inCombat ? `Yes (Round ${stateSummary.combatRound})` : 'No'}

${stateSummary.stickyEvents.length > 0 ? `Important events so far:\n${stateSummary.stickyEvents.map(e => `- ${e}`).join('\n')}` : ''}

## Guidelines
- **Keep responses to 1-3 short paragraphs (under 150 words).** Be punchy and concise. Only go longer for climactic moments.
- End with a hook or question — give the player something to react to.
- When a player needs to roll, describe the moment of tension, emit [ROLL_REQUEST], and STOP. Don't narrate the outcome yet.
- Use the character's actual abilities and gear from the state above — reference them by name.
- For loot: always emit [LOOT:item:target] so the server adds it to inventory.
- For healing: always emit [HEAL:amount:target] so HP updates properly.
- For damage: always emit [DAMAGE:amount:target] so HP tracks correctly.`;
  }

  // Parse mechanical tags from full text and return { narrative, mechanics }
  parseMechanics(text) {
    const mechanics = [];

    for (const m of text.matchAll(/\[ROLL_REQUEST:([^:]+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'roll-request', dice: m[1], reason: m[2] });
    }
    for (const m of text.matchAll(/\[DAMAGE:(\d+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'damage', amount: parseInt(m[1]), target: m[2] });
    }
    for (const m of text.matchAll(/\[HEAL:(\d+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'heal', amount: parseInt(m[1]), target: m[2] });
    }
    if (text.includes('[COMBAT:START]')) mechanics.push({ type: 'combat-start' });
    if (text.includes('[COMBAT:END]')) mechanics.push({ type: 'combat-end' });
    const sceneMatch = text.match(/\[SCENE:([^:]+):([^\]]+)\]/);
    if (sceneMatch) {
      mechanics.push({ type: 'scene-change', location: sceneMatch[1], description: sceneMatch[2] });
    }
    for (const m of text.matchAll(/\[STICKY:([^\]]+)\]/g)) {
      mechanics.push({ type: 'sticky-event', text: m[1] });
    }
    for (const m of text.matchAll(/\[XP:(\d+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'xp-award', amount: parseInt(m[1]), target: m[2] });
    }
    for (const m of text.matchAll(/\[LOOKUP:([^:]+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'lookup', category: m[1], query: m[2] });
    }
    for (const m of text.matchAll(/\[LOOT:([^:]+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'loot', item: m[1], target: m[2] });
    }
    for (const m of text.matchAll(/\[CONDITION_ADD:([^:]+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'condition-add', condition: m[1], target: m[2] });
    }
    for (const m of text.matchAll(/\[CONDITION_REMOVE:([^:]+):([^\]]+)\]/g)) {
      mechanics.push({ type: 'condition-remove', condition: m[1], target: m[2] });
    }

    const narrative = text
      .replace(/\[ROLL_REQUEST:[^\]]+\]/g, '')
      .replace(/\[DAMAGE:[^\]]+\]/g, '')
      .replace(/\[HEAL:[^\]]+\]/g, '')
      .replace(/\[COMBAT:(START|END)\]/g, '')
      .replace(/\[SCENE:[^\]]+\]/g, '')
      .replace(/\[STICKY:[^\]]+\]/g, '')
      .replace(/\[XP:[^\]]+\]/g, '')
      .replace(/\[LOOKUP:[^\]]+\]/g, '')
      .replace(/\[LOOT:[^\]]+\]/g, '')
      .replace(/\[CONDITION_ADD:[^\]]+\]/g, '')
      .replace(/\[CONDITION_REMOVE:[^\]]+\]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { narrative, mechanics };
  }

  // Strip all mechanical tags from text for display
  stripTags(text) {
    return text
      .replace(/\[ROLL_REQUEST:[^\]]+\]/g, '')
      .replace(/\[DAMAGE:[^\]]+\]/g, '')
      .replace(/\[HEAL:[^\]]+\]/g, '')
      .replace(/\[COMBAT:[^\]]+\]/g, '')
      .replace(/\[SCENE:[^\]]+\]/g, '')
      .replace(/\[STICKY:[^\]]+\]/g, '')
      .replace(/\[XP:[^\]]+\]/g, '')
      .replace(/\[LOOKUP:[^\]]+\]/g, '')
      .replace(/\[LOOT:[^\]]+\]/g, '')
      .replace(/\[CONDITION_ADD:[^\]]+\]/g, '')
      .replace(/\[CONDITION_REMOVE:[^\]]+\]/g, '');
  }

  async respond(playerName, action, stateSummary) {
    const systemPrompt = this.buildSystemPrompt(stateSummary);

    this.conversationHistory.push({
      role: 'user',
      content: `[${playerName}]: ${action}`,
    });

    // Keep history manageable
    if (this.conversationHistory.length > 40) {
      this.conversationHistory = this.conversationHistory.slice(-30);
    }

    // Stream the response
    const stream = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
      ],
    });

    // Signal stream start
    if (this.io) this.io.emit('dm-stream-start', {});

    let fullText = '';
    let displayBuffer = ''; // buffer for tag detection during streaming
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        displayBuffer += delta;

        // If buffer contains an opening bracket with no closing bracket, hold it
        const lastOpen = displayBuffer.lastIndexOf('[');
        if (lastOpen >= 0 && !displayBuffer.includes(']', lastOpen)) {
          // Might be a partial tag — emit everything before the bracket
          const safe = displayBuffer.slice(0, lastOpen);
          if (safe && this.io) this.io.emit('dm-stream-chunk', { text: safe });
          displayBuffer = displayBuffer.slice(lastOpen);
        } else {
          // No partial tags — strip complete tags and emit
          const cleaned = this.stripTags(displayBuffer);
          if (cleaned && this.io) this.io.emit('dm-stream-chunk', { text: cleaned });
          displayBuffer = '';
        }
      }
    }
    // Flush remaining buffer
    if (displayBuffer) {
      const cleaned = this.stripTags(displayBuffer);
      if (cleaned && this.io) this.io.emit('dm-stream-chunk', { text: cleaned });
    }

    // Signal stream end
    if (this.io) this.io.emit('dm-stream-end', {});

    this.conversationHistory.push({
      role: 'assistant',
      content: fullText,
    });

    const parsed = this.parseMechanics(fullText);

    // Handle LOOKUP tags: fetch 5e API data and do a follow-up if needed
    const lookups = parsed.mechanics.filter(m => m.type === 'lookup');
    if (lookups.length > 0) {
      const results = await Promise.all(
        lookups.map(async l => {
          const data = await lookupForAi(l.category, l.query);
          return `[5e API: ${l.category} "${l.query}"]\n${data}`;
        })
      );

      // Inject lookup results and get a follow-up response
      this.conversationHistory.push({
        role: 'user',
        content: `[SYSTEM: Here is the 5e reference data you requested. Use it to inform your response but don't quote it verbatim. Continue narrating naturally.]\n\n${results.join('\n\n')}`,
      });

      const followUp = await this.client.chat.completions.create({
        model: MODEL,
        max_tokens: 512,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
        ],
      });

      if (this.io) this.io.emit('dm-stream-start', {});
      let followText = '';
      for await (const chunk of followUp) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          followText += delta;
          if (this.io) this.io.emit('dm-stream-chunk', { text: delta });
        }
      }
      if (this.io) this.io.emit('dm-stream-end', {});

      this.conversationHistory.push({ role: 'assistant', content: followText });

      // Merge follow-up mechanics into the result
      const followParsed = this.parseMechanics(followText);
      parsed.narrative += '\n' + followParsed.narrative;
      parsed.mechanics.push(...followParsed.mechanics.filter(m => m.type !== 'lookup'));
    }

    // Remove lookup entries from final mechanics (they're handled above)
    parsed.mechanics = parsed.mechanics.filter(m => m.type !== 'lookup');

    return parsed;
  }

  async respondOoc(playerName, question, stateSummary) {
    const systemPrompt = `You are a helpful D&D assistant for Chronoscape: The World of Aethermere. A player is asking you an out-of-character question. Answer helpfully about rules, abilities, world lore, game mechanics, or strategy. Do NOT advance the game narrative or trigger any mechanical tags (except LOOKUP). Be concise and informative.

If you need to look up standard D&D 5e rules data to answer accurately, use: [LOOKUP:category:query]
Categories: spell, monster, equipment, condition, feat. Example: [LOOKUP:spell:counterspell]
The server will fetch the data and you'll get a follow-up with the results.

## World Knowledge
${this.worldContext}

## Current Game State
Location: ${stateSummary.location}
${stateSummary.partyDetails || (stateSummary.party.length > 0 ? `Party: ${stateSummary.party.join(', ')}` : 'No characters yet')}`;

    const stream = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: 512,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `[${playerName} asks OOC]: ${question}` },
      ],
    });

    if (this.io) this.io.emit('dm-stream-start', { type: 'ooc' });

    let fullText = '';
    let displayBuffer = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        displayBuffer += delta;
        // Strip tags from display
        const lastOpen = displayBuffer.lastIndexOf('[');
        if (lastOpen >= 0 && !displayBuffer.includes(']', lastOpen)) {
          const safe = displayBuffer.slice(0, lastOpen);
          if (safe && this.io) this.io.emit('dm-stream-chunk', { text: safe });
          displayBuffer = displayBuffer.slice(lastOpen);
        } else {
          const cleaned = this.stripTags(displayBuffer);
          if (cleaned && this.io) this.io.emit('dm-stream-chunk', { text: cleaned });
          displayBuffer = '';
        }
      }
    }
    if (displayBuffer) {
      const cleaned = this.stripTags(displayBuffer);
      if (cleaned && this.io) this.io.emit('dm-stream-chunk', { text: cleaned });
    }

    if (this.io) this.io.emit('dm-stream-end', { type: 'ooc' });

    // Check for LOOKUP tags and do follow-up if needed
    const lookupMatches = [...fullText.matchAll(/\[LOOKUP:([^:]+):([^\]]+)\]/g)];
    if (lookupMatches.length > 0) {
      const results = await Promise.all(
        lookupMatches.map(async m => {
          const data = await lookupForAi(m[1], m[2]);
          return `[5e API: ${m[1]} "${m[2]}"]\n${data}`;
        })
      );

      const followUp = await this.client.chat.completions.create({
        model: MODEL,
        max_tokens: 512,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `[${playerName} asks OOC]: ${question}` },
          { role: 'assistant', content: fullText },
          { role: 'user', content: `[SYSTEM: Here is the 5e reference data you requested. Use it to give a more accurate answer. Be concise.]\n\n${results.join('\n\n')}` },
        ],
      });

      if (this.io) this.io.emit('dm-stream-start', { type: 'ooc' });
      let followText = '';
      for await (const chunk of followUp) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          followText += delta;
          if (this.io) this.io.emit('dm-stream-chunk', { text: delta });
        }
      }
      if (this.io) this.io.emit('dm-stream-end', { type: 'ooc' });
      return (this.stripTags(fullText) + '\n' + followText).trim();
    }

    return this.stripTags(fullText).trim();
  }

  async narrateCombatAction(action) {
    const stream = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: 256,
      stream: true,
      messages: [
        { role: 'system', content: 'You are the DM for Chronoscape, a cyberpunk-fantasy D&D game. Narrate this combat action in 1-2 vivid sentences with neon-noir flair. Be dramatic but concise.' },
        { role: 'user', content: `Narrate this combat result: ${JSON.stringify(action)}` },
      ],
    });

    if (this.io) this.io.emit('dm-stream-start', { type: 'combat' });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        if (this.io) this.io.emit('dm-stream-chunk', { text: delta });
      }
    }

    if (this.io) this.io.emit('dm-stream-end', { type: 'combat' });

    return fullText;
  }
}
