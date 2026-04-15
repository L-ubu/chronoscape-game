#!/usr/bin/env node
import { io } from 'socket.io-client';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { parseInput } from './commands.js';
import {
  formatCharacterSheet, formatCombatTracker, formatStatus,
  formatInventory, formatMap, formatHelp, formatDmMessage,
  formatPlayerAction, formatOoc, formatDiceRoll,
  formatSystemMessage, formatRollRequest, box,
  setSneakyMode, isSneaky, animateDiceRoll,
} from './display.js';
import { CLASS_DATA, HIT_DICE, RACES, CLASSES, GAME_REGIONS, ALIGNMENTS } from '../lib/class-data.js';

const NEON = chalk.hex('#00fa6c');
const DIM = chalk.gray;
const RED = chalk.hex('#ff4444');
const CYAN = chalk.hex('#00ccff');
const WHITE = chalk.white;

// Parse CLI args
const args = process.argv.slice(2);
let playerName = null;
let serverUrl = `http://localhost:${process.env.PORT || 3000}`;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name' || args[i] === '-n') playerName = args[++i];
  else if (args[i] === '--server' || args[i] === '-s') serverUrl = args[++i];
  else if (!args[i].startsWith('-')) playerName = args[i];
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// Get player name if not provided
if (!playerName) {
  playerName = await prompt(NEON('Enter your name: '));
  if (!playerName.trim()) {
    console.log(RED('Name is required.'));
    process.exit(1);
  }
  playerName = playerName.trim();
}

// Connect to server
console.log(DIM(`Connecting to ${serverUrl}...`));
const socket = io(serverUrl);

let characterCreationHistory = [];
let inCharacterCreation = false;
let characterName = null;

socket.on('connect', () => {
  console.log(NEON(`Connected! Joining as ${playerName}...`));
  socket.emit('join', { name: playerName });
});

socket.on('connect_error', (err) => {
  console.log(RED(`Connection failed: ${err.message}`));
  console.log(DIM(`Is the server running? Start it with: node server.js`));
});

socket.on('disconnect', () => {
  console.log(RED('Disconnected from server.'));
});

// Game events
socket.on('system', (msg) => {
  console.log(formatSystemMessage(msg));
});

socket.on('dm-message', (msg) => {
  console.log(formatDmMessage(msg.text));
});

// Streaming DM responses — text appears word-by-word
let streamBuffer = '';
socket.on('dm-stream-start', () => {
  streamBuffer = '';
  const prefix = isSneaky() ? '\nDM | ' : `\n${chalk.hex('#e066ff')('DM')} ${chalk.gray('|')} `;
  process.stdout.write(prefix);
});

socket.on('dm-stream-chunk', ({ text }) => {
  streamBuffer += text;
  process.stdout.write(text);
});

socket.on('dm-stream-end', () => {
  process.stdout.write('\n\n');
  streamBuffer = '';
});

socket.on('player-action', ({ player, text }) => {
  if (player !== playerName) {
    console.log(formatPlayerAction(player, text));
  }
});

socket.on('ooc', ({ player, text }) => {
  console.log(formatOoc(player, text));
});

socket.on('dice-roll', async (result) => {
  if (result.player === playerName && !isSneaky()) {
    // Animate our own rolls
    const line = await animateDiceRoll(result.player, result);
    console.log(line);
  } else {
    console.log(formatDiceRoll(result.player, result));
  }
});

socket.on('character', (char) => {
  characterName = char.name;
  console.log(formatCharacterSheet(char));
});

socket.on('inventory', (items) => {
  console.log(formatInventory(items));
});

socket.on('status', (status) => {
  console.log(formatStatus(status));
});

socket.on('map', (scene) => {
  console.log(formatMap(scene));
});

socket.on('combat-state', (combat) => {
  console.log(formatCombatTracker(combat));
});

socket.on('combat-action', (action) => {
  console.log(formatSystemMessage({ text: action.text, type: 'combat' }));
});

socket.on('help', (commands) => {
  console.log(formatHelp(commands));
});

socket.on('roll-request', (req) => {
  console.log(formatRollRequest(req));
});

socket.on('scene-change', (scene) => {
  console.log('\n' + box('SCENE', `${CYAN(scene.location)}\n${scene.description}`, 50) + '\n');
});

socket.on('dm-mode-changed', ({ mode, dm }) => {
  console.log(formatSystemMessage({ text: `DM Mode: ${mode.toUpperCase()} (${dm})`, type: 'info' }));
});

socket.on('game-state', (state) => {
  // Show current scene on join
  console.log('\n' + box('SCENE', `${CYAN(state.scene.location)}\n${state.scene.description}`, 50));
  if (state.players.length > 0) {
    const partyList = state.players
      .map(p => p.character ? `${p.name} (${p.character.race} ${p.character.class} Lvl${p.character.level})` : `${p.name} (no character)`)
      .join('\n  ');
    console.log(DIM(`\nParty:\n  ${partyList}\n`));
  }
});

// Character creation flow
socket.on('needs-character', ({ aiAvailable }) => {
  startCharacterCreation(aiAvailable);
});

socket.on('character-creation-response', (response) => {
  if (response.message) {
    characterCreationHistory.push({ role: 'assistant', content: response.message });
    console.log(formatDmMessage(response.message));
  }
  if (response.character) {
    inCharacterCreation = false;
    characterCreationHistory = [];
    console.log(NEON('\nCharacter created! Type /sheet to view.\n'));
  }
});

// Forward DM actions to human DM
socket.on('player-action-for-dm', ({ player, text }) => {
  console.log(`\n${RED('⚔ DM')} ${DIM('│')} ${CYAN(player)} says: "${text}"`);
  console.log(DIM('  (Type your response as DM)'));
});

// Numbered selection helper
async function choose(label, options) {
  console.log(`\n${NEON(label)}`);
  console.log(NEON('─'.repeat(44)));
  options.forEach((opt, i) => {
    console.log(`  ${NEON(`${i + 1})`)} ${WHITE(opt.name)}`);
    if (opt.desc) console.log(`     ${DIM(opt.desc)}`);
  });
  console.log('');
  const answer = await prompt(NEON(`Choose [1-${options.length}]: `));
  const idx = parseInt(answer) - 1;
  if (idx >= 0 && idx < options.length) return options[idx].name;
  // If they typed a name instead of a number, try matching
  const match = options.find(o => o.name.toLowerCase().startsWith(answer.trim().toLowerCase()));
  return match ? match.name : options[0].name;
}

// RACES, CLASSES, GAME_REGIONS, ALIGNMENTS imported from shared class-data.js

async function startCharacterCreation(aiAvailable) {
  console.log('\n' + box('CHARACTER CREATION', 'Welcome to Aethermere! Let\'s build\nyour character for Chronoscape.', 44));

  if (aiAvailable) {
    console.log(`\n  ${NEON('1)')} ${WHITE('AI-Assisted')} ${DIM('— Chat with the AI to craft your character')}`);
    console.log(`  ${NEON('2)')} ${WHITE('Manual')}      ${DIM('— Step-by-step with menus')}\n`);
    const choice = await prompt(NEON('Choose [1-2]: '));
    if (choice.trim() === '1' || choice.toLowerCase().startsWith('a')) {
      inCharacterCreation = true;
      characterCreationHistory = [];
      socket.emit('character-creation-chat', { message: 'I want to create a new character for Chronoscape. Help me figure out what to play — ask me questions about what kind of character I want to be.', history: [] });
      return;
    }
  }

  // Manual creation with rich selection
  console.log(DIM('\n─── Step 1: Identity ───\n'));
  const name = await prompt(NEON('Character name: '));

  const race = await choose('Step 2: Choose Your Race', RACES);
  const charClass = await choose('Step 3: Choose Your Class', CLASSES);
  const region = await choose('Step 4: Choose Starting Region', GAME_REGIONS);
  const alignment = await choose('Step 5: Choose Alignment', ALIGNMENTS);

  console.log(DIM('\n─── Step 6: Background ───'));
  console.log(DIM('A short description of your character\'s past.'));
  console.log(DIM('Examples: "Street urchin turned hacker", "Ex-Axiom Corp scientist"'));
  const background = await prompt(NEON('Background: '));

  console.log(DIM('\n─── Step 7: Ability Scores ───'));
  console.log(DIM('Rolling 4d6, drop lowest, for each stat.\n'));
  const { rollAbilityScores } = await import('../lib/dice.js');
  let scores = rollAbilityScores();
  const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statDescs = ['Strength: melee, carry', 'Dexterity: dodge, stealth', 'Constitution: HP, endure', 'Intelligence: spells, lore', 'Wisdom: perception, will', 'Charisma: persuade, lead'];
  scores.forEach((s, i) => {
    console.log(`  ${NEON(statNames[i])} ${WHITE(String(s.total).padStart(2))} ${DIM(`[${s.rolls.join(',')}]`)}  ${DIM(statDescs[i])}`);
  });

  let accepted = false;
  while (!accepted) {
    const answer = await prompt(NEON('\nAccept stats? (y = accept / r = reroll): '));
    if (answer.toLowerCase().startsWith('y')) {
      accepted = true;
    } else {
      scores = rollAbilityScores();
      console.log(DIM('\nRe-rolling...\n'));
      scores.forEach((s, i) => {
        console.log(`  ${NEON(statNames[i])} ${WHITE(String(s.total).padStart(2))} ${DIM(`[${s.rolls.join(',')}]`)}  ${DIM(statDescs[i])}`);
      });
    }
  }

  const stats = {};
  statNames.forEach((s, i) => { stats[s.toLowerCase()] = scores[i].total; });

  // Calculate HP based on class using shared data
  const hd = HIT_DICE[charClass.toLowerCase()] || 8;
  const conMod = Math.floor((stats.con - 10) / 2);
  const hp = hd + conMod;
  const dexMod = Math.floor((stats.dex - 10) / 2);

  const data = CLASS_DATA[charClass.toLowerCase()] || CLASS_DATA['fighter'];
  const inventory = data.gear;
  const abilities = data.abilities;
  const spells = data.spells;
  const skills = data.skills;
  const spellSlots = data.spellSlots;
  const maxSpellSlots = { ...data.spellSlots };

  // AC: use class-specific AC, or calculate
  let finalAc;
  if (charClass.toLowerCase() === 'barbarian') {
    finalAc = 10 + dexMod + conMod;
  } else if (data.ac != null) {
    finalAc = data.ac;
  } else {
    finalAc = 10 + dexMod;
  }

  console.log(NEON('\n─── Character Summary ───\n'));
  console.log(`  ${WHITE(name || playerName)} the ${race} ${charClass}`);
  console.log(`  ${DIM('Region:')} ${region}  ${DIM('Alignment:')} ${alignment}`);
  console.log(`  ${DIM('HP:')} ${hp}  ${DIM('AC:')} ${finalAc}  ${DIM('Background:')} ${background || 'Adventurer'}`);
  console.log(`  ${DIM('Gear:')} ${inventory.join(', ')}`);
  console.log(`  ${DIM('Skills:')} ${skills.join(', ')}`);
  if (abilities.length > 0) {
    console.log(`  ${DIM('Abilities:')}`);
    abilities.forEach(a => {
      const [aName, ...aDesc] = a.split(' — ');
      console.log(`    ${CYAN(aName)}${aDesc.length ? ` — ${DIM(aDesc.join(' — '))}` : ''}`);
    });
  }
  if (spells.length > 0) {
    console.log(`  ${DIM('Spells:')} ${spells.join(', ')}`);
  }
  console.log('');

  const confirm = await prompt(NEON('Create this character? (y/n): '));
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log(DIM('Starting over...\n'));
    startCharacterCreation(aiAvailable);
    return;
  }

  socket.emit('create-character', {
    name: name || playerName,
    race,
    class: charClass,
    background: background || '',
    region,
    alignment,
    stats,
    hp,
    maxHp: hp,
    ac: finalAc,
    level: 1,
    inventory,
    gold: 15,
    skills,
    abilities,
    spells,
    spellSlots,
    maxSpellSlots,
  });
}

// Main input loop
function showPrompt() {
  const displayName = characterName || playerName;
  const prefix = isSneaky()
    ? `${displayName}> `
    : inCharacterCreation ? chalk.hex('#e066ff')('creation> ') : chalk.hex('#00fa6c')(`${displayName}> `);
  rl.setPrompt(prefix);
  rl.prompt();
}

rl.on('line', (line) => {
  const input = line.trim();
  if (!input) {
    showPrompt();
    return;
  }

  // Character creation mode — send to AI
  if (inCharacterCreation) {
    characterCreationHistory.push({ role: 'user', content: input });
    socket.emit('character-creation-chat', { message: input, history: characterCreationHistory });
    showPrompt();
    return;
  }

  const parsed = parseInput(input);
  if (!parsed) {
    showPrompt();
    return;
  }

  if (parsed.type === 'command') {
    // Client-side commands
    if (parsed.command === 'sneaky') {
      setSneakyMode(true);
      console.log('Sneaky mode ON — colors disabled.');
      showPrompt();
      return;
    }
    if (parsed.command === 'unsneaky') {
      setSneakyMode(false);
      console.log(chalk.hex('#00fa6c')('Sneaky mode OFF — colors restored.'));
      showPrompt();
      return;
    }
    socket.emit('command', { command: parsed.command, args: parsed.args });
  } else {
    // Check if this is a human DM narrating
    const isDmNarrating = input.startsWith('>');
    if (isDmNarrating) {
      socket.emit('dm-narrate', { text: input.slice(1).trim() });
    } else {
      socket.emit('action', { text: parsed.text });
    }
  }

  showPrompt();
});

// Handle display events that may print while user is typing
const originalLog = console.log;
console.log = (...args) => {
  process.stdout.clearLine?.(0);
  process.stdout.cursorTo?.(0);
  originalLog(...args);
  showPrompt();
};

// Start prompt after connection
socket.on('connect', () => {
  setTimeout(showPrompt, 500);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(DIM('\nDisconnecting...'));
  socket.disconnect();
  rl.close();
  process.exit(0);
});
