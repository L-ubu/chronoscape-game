import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { networkInterfaces } from 'os';
import { GameState } from './lib/game-state.js';
import { parseDiceNotation } from './lib/dice.js';
import { FEATS } from './lib/class-progression.js';
import { getItemData } from './lib/items.js';
import { buildCharacter, CLASS_DATA, HIT_DICE, RACES, CLASSES, GAME_REGIONS, ALIGNMENTS } from './lib/class-data.js';
import { renderAsciiMap, findLocation } from './lib/world-map.js';
import { lookup, smartLookup } from './lib/dnd-api.js';
import { Combat } from './lib/combat.js';

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve web UI
app.use(express.static(path.join(import.meta.dirname, 'web')));

// API endpoint for character creation data
app.get('/api/class-data', (req, res) => {
  res.json({ classData: CLASS_DATA, hitDice: HIT_DICE, races: RACES, classes: CLASSES, regions: GAME_REGIONS, alignments: ALIGNMENTS });
});

const gameState = new GameState();

// Will be set up in Phase 3 — AI DM
let aiDm = null;
let aiCharacterCreator = null;

// Try to load AI modules (Phase 3)
try {
  const { AiDm } = await import('./lib/ai-dm.js');
  const { AiCharacterCreator } = await import('./lib/ai-character-creator.js');
  aiDm = new AiDm(gameState);
  aiDm.io = io; // Pass socket.io for streaming
  aiCharacterCreator = new AiCharacterCreator();
  console.log('[SERVER] AI DM loaded successfully');
} catch (e) {
  console.log('[SERVER] AI DM not available — running without AI (human DM only)');
}

// Auto-save interval (10 minutes)
let autoSaveInterval = null;

function startAutoSave() {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(() => {
    if (gameState.players.size > 0) {
      const name = gameState.saveSession();
      console.log(`[SERVER] Auto-saved session: ${name}`);
    }
  }, 10 * 60 * 1000);
}

io.on('connection', (socket) => {
  console.log(`[SERVER] New connection: ${socket.id}`);

  // Player joins with a name
  socket.on('join', async ({ name }) => {
    const player = gameState.addPlayer(socket.id, name);
    socket.playerName = name;

    // Notify everyone
    io.emit('system', { text: `${name} has joined the game.`, type: 'join' });

    // Send current state to the new player
    socket.emit('game-state', {
      scene: gameState.currentScene,
      players: gameState.getAllPlayers().map(p => ({
        name: p.name,
        character: p.character ? summarizeCharacter(p.character) : null,
        role: p.role,
      })),
      dmMode: gameState.dmMode,
      inCombat: !!gameState.combat,
    });

    if (player.character) {
      socket.emit('character', enrichCharacter(player.character));
      socket.emit('system', { text: `Welcome back, ${player.character.name}! Type /help for commands.`, type: 'info' });
    } else {
      socket.emit('system', { text: `Welcome to Chronoscape! You don't have a character yet.`, type: 'info' });
      socket.emit('needs-character', { aiAvailable: !!aiCharacterCreator });
    }

    startAutoSave();
  });

  // Player sends a command
  socket.on('command', async ({ command, args }) => {
    const player = gameState.getPlayer(socket.id);
    if (!player) return;

    switch (command) {
      case 'roll': {
        const result = parseDiceNotation(args);
        if (result) {
          const rollName = player.character?.name || player.name;
          io.emit('dice-roll', { player: rollName, ...result });
          gameState.addChatMessage({ role: 'system', text: `${rollName} rolled ${result.label}` });
        } else {
          socket.emit('system', { text: `Invalid dice notation: ${args}. Try: d20, 2d6+3, 4d6kh3`, type: 'error' });
        }
        break;
      }

      case 'sheet': {
        if (!player.character) {
          socket.emit('system', { text: 'No character yet. Create one first!', type: 'error' });
          return;
        }
        socket.emit('character', enrichCharacter(player.character));
        break;
      }

      case 'inventory': {
        if (!player.character) {
          socket.emit('system', { text: 'No character yet.', type: 'error' });
          return;
        }
        if (args) {
          const match = args.match(/^(add|drop)\s+(.+)$/i);
          if (match) {
            const action = match[1].toLowerCase();
            const item = match[2].trim();
            if (action === 'add') {
              player.character.inventory = player.character.inventory || [];
              player.character.inventory.push(item);
              gameState.saveCharacter(player.name, player.character);
              socket.emit('system', { text: `Added "${item}" to inventory.`, type: 'success' });
              io.emit('system', { text: `${player.name} picked up: ${item}`, type: 'info' });
            } else {
              const idx = (player.character.inventory || []).findIndex(i => i.toLowerCase() === item.toLowerCase());
              if (idx >= 0) {
                player.character.inventory.splice(idx, 1);
                gameState.saveCharacter(player.name, player.character);
                socket.emit('system', { text: `Dropped "${item}".`, type: 'success' });
                io.emit('system', { text: `${player.name} dropped: ${item}`, type: 'info' });
              } else {
                socket.emit('system', { text: `"${item}" not in inventory.`, type: 'error' });
              }
            }
          }
        } else {
          socket.emit('inventory', player.character.inventory || []);
        }
        break;
      }

      case 'map': {
        const mapData = renderAsciiMap(gameState.currentScene.location);
        socket.emit('map', {
          ...gameState.currentScene,
          mapData,
        });
        break;
      }

      case 'combat': {
        if (gameState.combat) {
          socket.emit('combat-state', gameState.combat.getState());
        } else {
          socket.emit('system', { text: 'No active combat.', type: 'info' });
        }
        break;
      }

      case 'attack': {
        if (!gameState.combat) {
          socket.emit('system', { text: 'Not in combat.', type: 'error' });
          return;
        }
        if (!player.character) return;
        // Forward to combat system (Phase 4)
        if (gameState.combat) {
          const result = gameState.combat.resolveAttack(player.character, args);
          if (result) {
            io.emit('combat-action', result);
            io.emit('combat-state', gameState.combat.getState());
            // Let AI DM narrate the attack
            if (aiDm && gameState.dmMode === 'ai') {
              await aiDm.narrateCombatAction(result);
            }
          }
        }
        break;
      }

      case 'cast': {
        if (!player.character) return;
        if (gameState.combat) {
          const result = gameState.combat.resolveSpell(player.character, args);
          if (result) {
            io.emit('combat-action', result);
            io.emit('combat-state', gameState.combat.getState());
            if (aiDm && gameState.dmMode === 'ai') {
              await aiDm.narrateCombatAction(result);
            }
          }
        }
        break;
      }

      case 'rest': {
        if (!player.character) return;
        const restType = args?.trim().toLowerCase();
        if (restType === 'short') {
          socket.emit('system', { text: `${player.name} takes a short rest.`, type: 'info' });
          // Hit dice recovery could go here
        } else if (restType === 'long') {
          player.character.hp = player.character.maxHp;
          player.character.spellSlots = { ...player.character.maxSpellSlots };
          gameState.saveCharacter(player.name, player.character);
          socket.emit('character', enrichCharacter(player.character));
          socket.emit('system', { text: `${player.name} takes a long rest. HP fully restored. Spell slots refreshed.`, type: 'success' });
        } else {
          socket.emit('system', { text: 'Usage: /rest short or /rest long', type: 'error' });
        }
        break;
      }

      case 'status': {
        if (!player.character) return;
        const c = player.character;
        socket.emit('status', {
          name: c.name,
          hp: c.hp,
          maxHp: c.maxHp,
          ac: c.ac,
          conditions: c.conditions || [],
          spellSlots: c.spellSlots || {},
          maxSpellSlots: c.maxSpellSlots || {},
        });
        break;
      }

      case 'dm-mode': {
        if (gameState.dmMode === 'ai') {
          gameState.dmMode = 'human';
          gameState.humanDmSocketId = socket.id;
          player.role = 'dm';
          io.emit('system', { text: `${player.name} is now the Dungeon Master. AI DM disabled.`, type: 'info' });
        } else if (gameState.humanDmSocketId === socket.id) {
          gameState.dmMode = 'ai';
          gameState.humanDmSocketId = null;
          player.role = 'player';
          io.emit('system', { text: `AI DM re-enabled. ${player.name} returns to player role.`, type: 'info' });
        } else {
          socket.emit('system', { text: 'Another player is already the DM.', type: 'error' });
        }
        io.emit('dm-mode-changed', { mode: gameState.dmMode, dm: gameState.humanDmSocketId ? player.name : 'AI' });
        break;
      }

      case 'save': {
        const sessionName = gameState.saveSession(args?.trim() || undefined);
        io.emit('system', { text: `Session saved: ${sessionName}`, type: 'success' });
        break;
      }

      case 'load': {
        const name = args?.trim();
        if (!name) {
          const sessions = gameState.listSessions();
          socket.emit('system', { text: `Available sessions:\n${sessions.join('\n') || '(none)'}`, type: 'info' });
          return;
        }
        const data = gameState.loadSession(name);
        if (data) {
          io.emit('system', { text: `Session loaded: ${name}`, type: 'success' });
          // Re-send state to all players
          for (const [sid, p] of gameState.players) {
            const char = gameState.characters.get(p.name);
            if (char) {
              p.character = char;
              io.to(sid).emit('character', enrichCharacter(char));
            }
          }
          io.emit('game-state', {
            scene: gameState.currentScene,
            players: gameState.getAllPlayers().map(p => ({
              name: p.name,
              character: p.character ? summarizeCharacter(p.character) : null,
              role: p.role,
            })),
            dmMode: gameState.dmMode,
            inCombat: !!gameState.combat,
          });
        } else {
          socket.emit('system', { text: `Session "${name}" not found.`, type: 'error' });
        }
        break;
      }

      case 'xp': {
        if (!player.character) {
          socket.emit('system', { text: 'No character yet.', type: 'error' });
          break;
        }
        if (!args?.trim()) {
          // Show current XP and next level threshold
          const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
          const level = player.character.level || 1;
          const xp = player.character.xp || 0;
          const next = level < 20 ? XP_TABLE[level] : 'MAX';
          socket.emit('system', { text: `${player.character.name}: Level ${level} | XP: ${xp} / ${next}`, type: 'info' });
          break;
        }
        // DM can grant XP: /xp <amount> [player]
        const xpMatch = args.match(/^(\d+)\s*(.*)$/);
        if (xpMatch) {
          const amount = parseInt(xpMatch[1]);
          const targetName = xpMatch[2].trim() || player.name;
          const result = gameState.awardXp(targetName, amount);
          if (result) {
            io.emit('system', { text: `${targetName} gained ${amount} XP! (Total: ${result.xp})`, type: 'success' });
            if (result.levelUp) {
              announceLevelUp(targetName, result.levelUp);
            }
          } else {
            socket.emit('system', { text: `Player "${targetName}" not found or has no character.`, type: 'error' });
          }
        }
        break;
      }

      case 'feat': {
        if (!player.character) {
          socket.emit('system', { text: 'No character yet.', type: 'error' });
          break;
        }
        if (!args?.trim()) {
          // List available feats
          const featList = FEATS.map((f, i) => `  ${i + 1}. ${f.name} — ${f.desc}`).join('\n');
          socket.emit('system', { text: `Available feats:\n${featList}\n\nPick one with: /feat <number or name>`, type: 'info' });
        } else {
          const input = args.trim();
          let feat = null;
          const num = parseInt(input);
          if (num >= 1 && num <= FEATS.length) {
            feat = FEATS[num - 1];
          } else {
            feat = FEATS.find(f => f.name.toLowerCase() === input.toLowerCase());
          }
          if (feat) {
            player.character.abilities = player.character.abilities || [];
            if (player.character.abilities.some(a => a.startsWith(feat.name))) {
              socket.emit('system', { text: `You already have ${feat.name}.`, type: 'error' });
            } else {
              player.character.abilities.push(`${feat.name} — ${feat.desc}`);
              gameState.saveCharacter(player.name, player.character);
              socket.emit('character', enrichCharacter(player.character));
              io.emit('system', { text: `${player.character.name} gained the feat: ${feat.name}!`, type: 'success' });
            }
          } else {
            socket.emit('system', { text: `Feat not found: "${input}". Use /feat to see the list.`, type: 'error' });
          }
        }
        break;
      }

      case 'ask': {
        if (!args?.trim()) {
          socket.emit('system', { text: 'Usage: /ask <question> — Ask the AI a question without advancing the game.', type: 'error' });
          break;
        }
        if (aiDm && gameState.dmMode === 'ai') {
          try {
            const answer = await aiDm.respondOoc(player.name, args, gameState.getStateSummary());
            // Streamed already — send final as dm-message for clients that missed the stream
          } catch (err) {
            console.error('[SERVER] AI /ask error:', err.message);
            io.emit('system', { text: 'AI encountered an error answering your question.', type: 'error' });
          }
        } else {
          socket.emit('system', { text: 'AI is not active. Switch to AI DM mode with /dm-mode.', type: 'error' });
        }
        break;
      }

      case 'lookup': {
        if (!args?.trim()) {
          socket.emit('system', { text: 'Usage: /lookup <query> or /lookup spell fireball, /lookup monster goblin, /lookup item longsword, /lookup condition stunned', type: 'error' });
          break;
        }
        const parts = args.trim().match(/^(spell|monster|creature|item|equipment|weapon|armor|condition|feat|feature|class|race|skill)\s+(.+)$/i);
        let result;
        if (parts) {
          result = await lookup(parts[1], parts[2]);
        } else {
          result = await smartLookup(args.trim());
        }
        if (result) {
          socket.emit('system', { text: `📖 5e Reference — ${result.type}\n${result.text}`, type: 'info' });
        } else {
          socket.emit('system', { text: `Nothing found for "${args.trim()}" in the 5e API.`, type: 'error' });
        }
        break;
      }

      case 'help': {
        socket.emit('help', getHelpText());
        break;
      }

      default:
        socket.emit('system', { text: `Unknown command: /${command}. Type /help for available commands.`, type: 'error' });
    }
  });

  // Player sends free-form text (action/speech)
  socket.on('action', async ({ text }) => {
    const player = gameState.getPlayer(socket.id);
    if (!player) return;

    // OOC messages (prefixed with //)
    if (text.startsWith('//')) {
      io.emit('ooc', { player: player.character?.name || player.name, text: text.slice(2).trim() });
      return;
    }

    // Broadcast the player's action (use character name if available)
    const displayName = player.character?.name || player.name;
    io.emit('player-action', { player: displayName, text });
    gameState.addChatMessage({ role: 'player', name: displayName, text });

    // Route to DM
    if (gameState.dmMode === 'ai' && aiDm) {
      try {
        // respond() streams tokens via io events (dm-stream-start/chunk/end)
        const response = await aiDm.respond(player.name, text, gameState.getStateSummary());
        gameState.addChatMessage({ role: 'dm', text: response.narrative });

        // Handle mechanical triggers from the AI
        if (response.mechanics) {
          let stateChanged = false;
          for (const mech of response.mechanics) {
            if (handleMechanic(mech, player)) stateChanged = true;
          }
          // Push updated character sheets to affected players
          if (stateChanged) {
            for (const p of gameState.getAllPlayers()) {
              if (p.character) {
                gameState.saveCharacter(p.name, p.character);
                io.to(p.id).emit('character', enrichCharacter(p.character));
              }
            }
          }
        }
      } catch (err) {
        console.error('[SERVER] AI DM error:', err.message);
        io.emit('system', { text: 'AI DM encountered an error. Try again or switch to human DM with /dm-mode.', type: 'error' });
      }
    } else if (gameState.dmMode === 'human' && gameState.humanDmSocketId) {
      // Forward to human DM
      io.to(gameState.humanDmSocketId).emit('player-action-for-dm', { player: player.name, text });
    }
  });

  // Human DM sends narrative
  socket.on('dm-narrate', ({ text }) => {
    if (socket.id !== gameState.humanDmSocketId) return;
    io.emit('dm-message', { text, type: 'narrative' });
    gameState.addChatMessage({ role: 'dm', text });
  });

  // Character creation messages
  socket.on('create-character', async (data) => {
    if (aiCharacterCreator && data.useAi) {
      // AI-assisted creation — handled as conversation
      socket.emit('system', { text: 'Starting AI-assisted character creation...', type: 'info' });
    } else {
      // Manual creation — buildCharacter fills in class defaults for missing fields
      const character = buildCharacter(data);
      const player = gameState.getPlayer(socket.id);
      if (player) {
        gameState.setCharacter(player.name, character);
        socket.emit('character', enrichCharacter(character));
        io.emit('system', { text: `${character.name} the ${character.race} ${character.class} has joined the party!`, type: 'join' });
      }
    }
  });

  // AI character creation chat
  socket.on('character-creation-chat', async ({ message, history }) => {
    if (!aiCharacterCreator) {
      socket.emit('system', { text: 'AI character creator not available.', type: 'error' });
      return;
    }
    try {
      const response = await aiCharacterCreator.chat(message, history || []);
      socket.emit('character-creation-response', response);

      // If the AI returned a completed character — fill in class defaults for any missing fields
      if (response.character) {
        const character = buildCharacter(response.character);
        const player = gameState.getPlayer(socket.id);
        if (player) {
          gameState.setCharacter(player.name, character);
          socket.emit('character', enrichCharacter(character));
          io.emit('system', { text: `${character.name} the ${character.race} ${character.class} has joined the party!`, type: 'join' });
        }
      }
    } catch (err) {
      console.error('[SERVER] Character creation error:', err.message);
      socket.emit('system', { text: 'AI character creator error. Try manual creation.', type: 'error' });
    }
  });

  socket.on('disconnect', () => {
    const player = gameState.removePlayer(socket.id);
    if (player) {
      io.emit('system', { text: `${player.name} has left the game.`, type: 'leave' });
      if (socket.id === gameState.humanDmSocketId) {
        gameState.dmMode = 'ai';
        gameState.humanDmSocketId = null;
        io.emit('system', { text: 'Human DM disconnected. AI DM re-enabled.', type: 'info' });
      }
    }
    if (gameState.players.size === 0 && autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  });
});

function announceLevelUp(playerName, levelUp) {
  let msg = `LEVEL UP! ${playerName} is now Level ${levelUp.newLevel}! (+${levelUp.hpGain} HP, new max: ${levelUp.newMaxHp})`;
  if (levelUp.newAbilities.length > 0) {
    msg += `\nNew abilities: ${levelUp.newAbilities.map(a => a.split(' — ')[0]).join(', ')}`;
  }
  if (levelUp.newSpells.length > 0) {
    msg += `\nNew spells: ${levelUp.newSpells.join(', ')}`;
  }
  if (levelUp.hasFeat) {
    msg += `\nYou can choose a feat! Use /feat to see options.`;
  }
  io.emit('system', { text: msg, type: 'success' });
  const target = gameState.getPlayerByName(playerName);
  if (target) io.to(target.id).emit('character', enrichCharacter(target.character));
}

// Find a player by character name (case-insensitive)
function findPlayerByCharName(name) {
  const lower = name.toLowerCase().trim();
  for (const p of gameState.getAllPlayers()) {
    if (p.character && p.character.name.toLowerCase() === lower) return p;
  }
  return null;
}

// Handle mechanical triggers from AI DM responses
// Returns true if any character state was modified
function handleMechanic(mech, player) {
  switch (mech.type) {
    case 'roll-request':
      io.to(player.id).emit('roll-request', { reason: mech.reason, dice: mech.dice });
      return false;

    case 'damage': {
      if (!mech.target || !mech.amount) return false;
      // Try combat first, then direct character update
      if (gameState.combat) {
        gameState.combat.applyDamage(mech.target, mech.amount);
        io.emit('combat-state', gameState.combat.getState());
      }
      // Also apply directly to character (works with or without combat)
      const dmgTarget = findPlayerByCharName(mech.target);
      if (dmgTarget?.character) {
        dmgTarget.character.hp = Math.max(0, dmgTarget.character.hp - mech.amount);
        io.emit('system', { text: `${dmgTarget.character.name} takes ${mech.amount} damage! (HP: ${dmgTarget.character.hp}/${dmgTarget.character.maxHp})`, type: 'combat' });
        return true;
      }
      return false;
    }

    case 'heal': {
      if (!mech.target || !mech.amount) return false;
      const healTarget = findPlayerByCharName(mech.target);
      if (healTarget?.character) {
        const c = healTarget.character;
        const before = c.hp;
        c.hp = Math.min(c.maxHp, c.hp + mech.amount);
        const healed = c.hp - before;
        if (healed > 0) {
          io.emit('system', { text: `${c.name} heals ${healed} HP! (HP: ${c.hp}/${c.maxHp})`, type: 'success' });
        }
        return true;
      }
      return false;
    }

    case 'loot': {
      if (!mech.item || !mech.target) return false;
      const lootTarget = findPlayerByCharName(mech.target);
      if (lootTarget?.character) {
        lootTarget.character.inventory = lootTarget.character.inventory || [];
        lootTarget.character.inventory.push(mech.item.trim());
        io.emit('system', { text: `${lootTarget.character.name} obtained: ${mech.item.trim()}`, type: 'success' });
        return true;
      }
      return false;
    }

    case 'condition-add': {
      if (!mech.condition || !mech.target) return false;
      const condTarget = findPlayerByCharName(mech.target);
      if (condTarget?.character) {
        condTarget.character.conditions = condTarget.character.conditions || [];
        const cond = mech.condition.toLowerCase().trim();
        if (!condTarget.character.conditions.includes(cond)) {
          condTarget.character.conditions.push(cond);
          io.emit('system', { text: `${condTarget.character.name} is now ${cond}!`, type: 'combat' });
        }
        return true;
      }
      return false;
    }

    case 'condition-remove': {
      if (!mech.condition || !mech.target) return false;
      const rmCondTarget = findPlayerByCharName(mech.target);
      if (rmCondTarget?.character) {
        const cond = mech.condition.toLowerCase().trim();
        rmCondTarget.character.conditions = (rmCondTarget.character.conditions || []).filter(c => c !== cond);
        io.emit('system', { text: `${rmCondTarget.character.name} is no longer ${cond}.`, type: 'info' });
        return true;
      }
      return false;
    }

    case 'combat-start': {
      const players = gameState.getAllPlayers().filter(p => p.character);
      if (players.length > 0) {
        const combat = new Combat();
        const result = combat.start(players, []);
        gameState.combat = combat;
        io.emit('system', { text: result.text, type: 'combat' });
        io.emit('combat-state', combat.getState());
        // Announce initiative order
        const initOrder = result.initiativeOrder.map(c => `${c.position}. ${c.name} (${c.initiative})`).join(', ');
        io.emit('system', { text: `Initiative: ${initOrder}`, type: 'combat' });
      } else {
        io.emit('system', { text: 'Roll for initiative!', type: 'combat' });
      }
      return false;
    }

    case 'combat-end':
      if (gameState.combat) {
        gameState.combat = null;
        io.emit('system', { text: 'Combat has ended.', type: 'info' });
        io.emit('combat-state', null);
      }
      return false;

    case 'scene-change':
      gameState.currentScene = { location: mech.location, description: mech.description };
      io.emit('scene-change', gameState.currentScene);
      return false;

    case 'sticky-event':
      gameState.addStickyEvent({ text: mech.text });
      return false;

    case 'xp-award': {
      const result = gameState.awardXp(mech.target, mech.amount);
      if (result) {
        io.emit('system', { text: `${mech.target} gained ${mech.amount} XP! (Total: ${result.xp})`, type: 'success' });
        if (result.levelUp) announceLevelUp(mech.target, result.levelUp);
      }
      return true;
    }

    default:
      return false;
  }
}

function summarizeCharacter(c) {
  return {
    name: c.name,
    race: c.race,
    class: c.class,
    level: c.level,
    hp: c.hp,
    maxHp: c.maxHp,
    ac: c.ac,
  };
}

// Enrich character with item details for display
function enrichCharacter(c) {
  if (!c) return c;
  const enriched = { ...c };
  enriched.inventoryDetails = (c.inventory || []).map(itemName => getItemData(itemName));

  // XP info
  const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000];
  enriched.xpToNext = (c.level || 1) < 20 ? XP_TABLE[c.level || 1] : null;

  return enriched;
}

function getHelpText() {
  return [
    { cmd: '/roll <dice>', desc: 'Roll dice (d20, 2d6+3, 4d6kh3, d20 advantage)' },
    { cmd: '/sheet [section]', desc: 'View character sheet (or specific section: hp, stats, spells)' },
    { cmd: '/inventory [add/drop item]', desc: 'View or manage inventory' },
    { cmd: '/map', desc: 'ASCII map of current area' },
    { cmd: '/combat', desc: 'View combat state (initiative, HP, conditions)' },
    { cmd: '/attack <target>', desc: 'Attack a target in combat' },
    { cmd: '/cast <spell> [target]', desc: 'Cast a spell' },
    { cmd: '/rest short|long', desc: 'Take a short or long rest' },
    { cmd: '/status', desc: 'Quick view: HP, conditions, spell slots' },
    { cmd: '/xp [amount] [player]', desc: 'View XP or award XP to a player' },
    { cmd: '/feat [name/number]', desc: 'View available feats or pick one on level-up' },
    { cmd: '/save [name]', desc: 'Save current session' },
    { cmd: '/load [name]', desc: 'Load a session (no name = list sessions)' },
    { cmd: '/ask <question>', desc: 'Ask AI a question without advancing the game (OOC)' },
    { cmd: '/lookup <query>', desc: 'Look up D&D 5e spells, monsters, items, conditions, feats' },
    { cmd: '/dm-mode', desc: 'Toggle human DM mode' },
    { cmd: '/help', desc: 'Show this help' },
    { cmd: '/sneaky', desc: 'Stealth mode — strip all colors (boss-friendly)' },
    { cmd: '/unsneaky', desc: 'Restore colors and neon glory' },
    { cmd: '// message', desc: 'Out-of-character chat' },
    { cmd: '(anything else)', desc: 'Free-form action — the DM interprets it' },
  ];
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=3001 node server.js`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const dmLabel = (gameState.dmMode === 'ai' && aiDm) ? 'AI (Claude)' : 'Human';

  // Find LAN IP
  let lanIp = null;
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
    if (lanIp) break;
  }
  const lanUrl = lanIp ? `http://${lanIp}:${PORT}` : 'N/A';

  const W = 56; // inner width
  const pad = (s) => s + ' '.repeat(Math.max(0, W - s.length));
  console.log(`
╔${'═'.repeat(W)}╗
║${pad('     CHRONOSCAPE — The World of Aethermere')}║
║${pad('     D&D Game Server')}║
╠${'═'.repeat(W)}╣
║${pad(`  Local:   http://localhost:${PORT}`)}║
║${pad(`  Network: ${lanUrl}`)}║
║${pad(`  DM Mode: ${dmLabel}`)}║
║${pad('')}║
║${pad('  Terminal: node client/cli.js --name YourName')}║
║${pad(`  Browser:  http://localhost:${PORT}`)}║
║${pad(`  LAN:   cli.js -s ${lanUrl} --name Name`)}║
╚${'═'.repeat(W)}╝
  `);
});

export { io, gameState, aiDm };
