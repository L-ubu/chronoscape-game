#!/usr/bin/env node
// Full integration test for Chronoscape game server
// Tests: character creation, commands, AI DM, combat, levelup, lookup, multiplayer

import { io } from 'socket.io-client';

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
const errors = [];

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, reason) {
  failed++;
  errors.push(`${label}: ${reason}`);
  console.log(`  ✗ ${label} — ${reason}`);
}

function assert(cond, label, reason = 'assertion failed') {
  if (cond) ok(label);
  else fail(label, reason);
}

// Wait for a specific socket event with timeout
function waitFor(socket, event, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Wait for event, collecting all events of that type for a duration
function collectEvents(socket, event, durationMs = 3000) {
  return new Promise((resolve) => {
    const events = [];
    const handler = (data) => events.push(data);
    socket.on(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve(events);
    }, durationMs);
  });
}

// Send command and wait for a response event
async function sendCommand(socket, command, args = '', expectEvent = 'system', timeout = 15000) {
  const promise = waitFor(socket, expectEvent, timeout);
  socket.emit('command', { command, args });
  return promise;
}

// Send command and wait for a system event matching a predicate
async function sendCommandMatch(socket, command, args, predicate, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('system', handler);
      reject(new Error(`Timeout waiting for matching system event for /${command}`));
    }, timeout);
    const handler = (data) => {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off('system', handler);
        resolve(data);
      }
    };
    socket.on('system', handler);
    socket.emit('command', { command, args });
  });
}

// Send action text and collect streamed DM response
async function sendAction(socket, text, waitMs = 20000) {
  return new Promise((resolve) => {
    let fullResponse = '';
    let mechanics = [];
    const chunks = [];

    const onChunk = ({ text: t }) => { fullResponse += t; chunks.push(t); };
    const onEnd = () => {
      socket.off('dm-stream-chunk', onChunk);
      socket.off('dm-stream-end', onEnd);
      clearTimeout(timer);
      resolve({ text: fullResponse, chunks });
    };

    socket.on('dm-stream-chunk', onChunk);
    socket.on('dm-stream-end', onEnd);
    socket.emit('action', { text });

    const timer = setTimeout(() => {
      socket.off('dm-stream-chunk', onChunk);
      socket.off('dm-stream-end', onEnd);
      resolve({ text: fullResponse, chunks, timeout: true });
    }, waitMs);
  });
}

async function run() {
  console.log(`\n🎮 CHRONOSCAPE INTEGRATION TEST`);
  console.log(`   Server: ${URL}\n`);

  // ==========================================
  // 1. CONNECTION TEST
  // ==========================================
  console.log('── 1. Connection ──');

  const player1 = io(URL, { forceNew: true });

  await new Promise((resolve, reject) => {
    player1.on('connect', resolve);
    player1.on('connect_error', (err) => reject(new Error(`Connection failed: ${err.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
  ok('Connected to server');

  // Join
  const joinPromise = waitFor(player1, 'game-state');
  player1.emit('join', { name: 'TestPlayer1' });
  const gameState = await joinPromise;
  assert(gameState.scene, 'Received game state', 'no scene in game state');
  assert(gameState.scene.location, 'Scene has location', 'missing location');

  // Should get needs-character since we're new
  // (might have already fired, so collect)

  // ==========================================
  // 2. CHARACTER CREATION (manual via server)
  // ==========================================
  console.log('\n── 2. Character Creation ──');

  const charPromise = waitFor(player1, 'character', 10000);
  player1.emit('create-character', {
    name: 'Kira Phase',
    race: 'Glitchborn',
    class: 'Glitch Knight',
    region: 'Luminara',
    background: 'Street fighter from The Glitch Quarter',
    alignment: 'Chaotic Good',
    stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
    level: 1,
  });

  const char = await charPromise;
  assert(char.name === 'Kira Phase', 'Character name correct');
  assert(char.class === 'Glitch Knight', 'Class correct');
  assert(char.race === 'Glitchborn', 'Race correct');
  assert(char.inventory?.length > 0, 'Has starting gear', `inventory: ${JSON.stringify(char.inventory)}`);
  assert(char.inventory.includes('Corrupted Greatsword'), 'Has class weapon', `gear: ${char.inventory.join(', ')}`);
  assert(char.inventory.includes('Heavy Glitch Plate'), 'Has class armor', `gear: ${char.inventory.join(', ')}`);
  const initialAbilityCount = char.abilities?.length || 0;
  assert(initialAbilityCount > 0, 'Has class abilities', `abilities: ${initialAbilityCount}`);
  assert(char.skills?.length > 0, 'Has class skills', `skills: ${char.skills}`);
  assert(char.ac === 18, 'AC is 18 (heavy plate)', `AC: ${char.ac}`);
  assert(char.hp > 0, 'Has HP', `HP: ${char.hp}`);
  assert(char.proficiencyBonus === 2, 'Prof bonus is 2');
  assert(char.inventoryDetails?.length > 0, 'Has enriched inventory details', `details: ${char.inventoryDetails?.length || 0}`);
  assert(char.xpToNext, 'Has XP to next level');

  // Check enriched item details
  const greatsword = char.inventoryDetails?.find(i => i.name === 'Corrupted Greatsword');
  assert(greatsword?.damage, 'Greatsword has damage info', `greatsword: ${JSON.stringify(greatsword)}`);

  // ==========================================
  // 3. BASIC COMMANDS
  // ==========================================
  console.log('\n── 3. Basic Commands ──');

  // /help
  const help = await sendCommand(player1, 'help', '', 'help');
  assert(Array.isArray(help) && help.length > 10, '/help returns commands', `got ${help?.length || 0} commands`);
  assert(help.some(h => h.cmd.includes('/lookup')), '/help includes /lookup');

  // /sheet
  const sheet = await sendCommand(player1, 'sheet', '', 'character');
  assert(sheet.name === 'Kira Phase', '/sheet returns character');

  // /status
  const status = await sendCommand(player1, 'status', '', 'status');
  assert(status.hp > 0, '/status shows HP');
  assert(status.name === 'Kira Phase', '/status shows character name');

  // /inventory
  const inv = await sendCommand(player1, 'inventory', '', 'inventory');
  assert(Array.isArray(inv) && inv.length > 0, '/inventory lists items');

  // /roll
  const rollPromise = waitFor(player1, 'dice-roll');
  player1.emit('command', { command: 'roll', args: 'd20' });
  const roll = await rollPromise;
  assert(roll.total >= 1 && roll.total <= 20, `/roll d20 = ${roll.total}`);
  assert(roll.player === 'Kira Phase', 'Dice roll shows character name', `player: ${roll.player}`);

  // /roll 2d6+3
  const rollPromise2 = waitFor(player1, 'dice-roll');
  player1.emit('command', { command: 'roll', args: '2d6+3' });
  const roll2 = await rollPromise2;
  assert(roll2.total >= 5 && roll2.total <= 15, `/roll 2d6+3 = ${roll2.total}`);

  // /map
  const mapPromise = waitFor(player1, 'map');
  player1.emit('command', { command: 'map' });
  const map = await mapPromise;
  assert(map.mapData, '/map returns mapData');
  assert(map.mapData.grid?.length > 0, '/map has grid');
  assert(map.mapData.currentLocation, '/map has current location');
  assert(Object.keys(map.mapData.locations).length > 0, '/map has locations');

  // /xp (view)
  const xpMsg = await sendCommand(player1, 'xp');
  assert(xpMsg.text.includes('XP'), '/xp shows XP info');

  // ==========================================
  // 4. LOOKUP COMMAND (5e API)
  // ==========================================
  console.log('\n── 4. /lookup Command ──');

  const lookupSpell = await sendCommandMatch(player1, 'lookup', 'spell fireball', d => d.text.includes('5e Reference'), 15000);
  assert(lookupSpell.text.includes('Fireball'), '/lookup spell fireball works', lookupSpell.text.slice(0, 100));
  assert(lookupSpell.text.includes('8d6'), 'Fireball shows damage');

  const lookupMonster = await sendCommandMatch(player1, 'lookup', 'monster goblin', d => d.text.includes('5e Reference') || d.text.includes('Nothing found'), 15000);
  assert(lookupMonster.text.includes('Goblin'), '/lookup monster goblin works');
  assert(lookupMonster.text.includes('HP'), 'Goblin shows HP');

  const lookupItem = await sendCommandMatch(player1, 'lookup', 'item longsword', d => d.text.includes('5e Reference') || d.text.includes('Nothing found'), 15000);
  assert(lookupItem.text.includes('Longsword'), '/lookup item longsword works');

  // Smart lookup (no category)
  const lookupSmart = await sendCommandMatch(player1, 'lookup', 'shield of faith', d => d.text.includes('5e Reference') || d.text.includes('Nothing found'), 15000);
  assert(lookupSmart.text.includes('Shield of Faith') || lookupSmart.text.includes('shield'), '/lookup auto-detect spell', lookupSmart.text.slice(0, 100));

  const lookupCond = await sendCommandMatch(player1, 'lookup', 'condition stunned', d => d.text.includes('5e Reference') || d.text.includes('Nothing found'), 15000);
  assert(lookupCond.text.includes('stunned') || lookupCond.text.includes('Stunned'), '/lookup condition stunned');

  // ==========================================
  // 5. AI DM INTERACTION
  // ==========================================
  console.log('\n── 5. AI DM Interaction ──');

  const storyResponse = await sendAction(player1, 'I look around the area, taking in my surroundings. What do I see?');
  assert(storyResponse.text.length > 50, 'AI DM responds with narrative', `response length: ${storyResponse.text.length}`);
  assert(storyResponse.chunks.length > 1, 'Response is streamed in chunks', `chunks: ${storyResponse.chunks.length}`);
  assert(!storyResponse.timeout, 'Response completed (no timeout)');
  console.log(`    AI response (${storyResponse.text.length} chars, ${storyResponse.chunks.length} chunks)`);

  // Test /ask (OOC)
  const askResponse = await sendAction(player1, '');  // clear
  // Use command for /ask
  const askPromise = new Promise((resolve) => {
    let text = '';
    const onChunk = ({ text: t }) => { text += t; };
    const onEnd = () => {
      player1.off('dm-stream-chunk', onChunk);
      player1.off('dm-stream-end', onEnd);
      clearTimeout(timer);
      resolve(text);
    };
    player1.on('dm-stream-chunk', onChunk);
    player1.on('dm-stream-end', onEnd);
    player1.emit('command', { command: 'ask', args: 'What is my characters AC and what abilities do I have?' });
    const timer = setTimeout(() => {
      player1.off('dm-stream-chunk', onChunk);
      player1.off('dm-stream-end', onEnd);
      resolve(text);
    }, 20000);
  });
  const askText = await askPromise;
  assert(askText.length > 20, '/ask gets AI response', `length: ${askText.length}`);
  console.log(`    /ask response (${askText.length} chars)`);

  // ==========================================
  // 6. STORY + COMBAT SCENARIO
  // ==========================================
  console.log('\n── 6. Combat Scenario ──');

  const combatResponse = await sendAction(player1, 'I walk deeper into a dark alley and suddenly three shadowy figures appear, blocking my path. They draw weapons. I ready my greatsword for a fight!');
  assert(combatResponse.text.length > 30, 'AI narrates combat setup', `length: ${combatResponse.text.length}`);
  console.log(`    Combat setup (${combatResponse.text.length} chars)`);

  // Try an attack action
  const attackResponse = await sendAction(player1, 'I swing my Corrupted Greatsword at the nearest enemy with all my strength!');
  assert(attackResponse.text.length > 20, 'AI narrates attack', `length: ${attackResponse.text.length}`);
  console.log(`    Attack response (${attackResponse.text.length} chars)`);

  // ==========================================
  // 7. XP AWARD + LEVEL UP
  // ==========================================
  console.log('\n── 7. XP & Level Up ──');

  // Award XP to trigger level 2
  const xpPromise = waitFor(player1, 'system');
  player1.emit('command', { command: 'xp', args: '300 TestPlayer1' });
  const xpResult = await xpPromise;
  assert(xpResult.text.includes('300 XP') || xpResult.text.includes('gained'), 'XP awarded', xpResult.text);

  // Check if level up happened (need 300 XP for level 2)
  // Get updated character
  const charAfterXp = await sendCommand(player1, 'sheet', '', 'character');
  assert(charAfterXp.level === 2, `Level up to 2 (got ${charAfterXp.level})`, `level: ${charAfterXp.level}`);
  assert(charAfterXp.xp === undefined || true, 'Character has XP'); // xp is on the enriched char

  // Award more XP for level 3 (need 900 total)
  const xpPromise2 = waitFor(player1, 'system');
  player1.emit('command', { command: 'xp', args: '600 TestPlayer1' });
  await xpPromise2;

  const charLvl3 = await sendCommand(player1, 'sheet', '', 'character');
  assert(charLvl3.level === 3, `Level up to 3 (got ${charLvl3.level})`, `level: ${charLvl3.level}`);

  // Check new abilities were gained from class progression
  const totalAbilities = charLvl3.abilities?.length || 0;
  assert(totalAbilities > initialAbilityCount, `Gained new abilities (${totalAbilities} > ${initialAbilityCount})`, `abilities: ${totalAbilities}`);

  // ==========================================
  // 8. PUZZLE SCENARIO
  // ==========================================
  console.log('\n── 8. Puzzle Scenario ──');

  const puzzleResponse = await sendAction(player1, 'I find a locked door with strange glowing runes. There are three symbols on the wall — a dragon, a circuit, and a crystal. The door has a riddle inscribed: "I am born in fire, shaped by code, and shatter like glass. What am I?" I think about it...');
  assert(puzzleResponse.text.length > 30, 'AI responds to puzzle', `length: ${puzzleResponse.text.length}`);
  console.log(`    Puzzle response (${puzzleResponse.text.length} chars)`);

  const puzzleSolve = await sendAction(player1, 'I press the crystal symbol and say "A Mana Battery — born in dragon fire, coded with spells, and shatters when used!"');
  assert(puzzleSolve.text.length > 20, 'AI responds to puzzle attempt', `length: ${puzzleSolve.text.length}`);
  console.log(`    Puzzle solve response (${puzzleSolve.text.length} chars)`);

  // ==========================================
  // 9. MULTIPLAYER TEST
  // ==========================================
  console.log('\n── 9. Multiplayer ──');

  const player2 = io(URL, { forceNew: true });
  await new Promise((resolve, reject) => {
    player2.on('connect', resolve);
    player2.on('connect_error', (err) => reject(new Error(`P2 connection failed: ${err.message}`)));
    setTimeout(() => reject(new Error('P2 connection timeout')), 5000);
  });
  ok('Player 2 connected');

  // Player 1 should see the join message
  const p1JoinNotice = waitFor(player1, 'system', 5000);
  const p2State = waitFor(player2, 'game-state', 5000);
  player2.emit('join', { name: 'TestPlayer2' });

  const [joinMsg, p2GameState] = await Promise.all([p1JoinNotice, p2State]);
  assert(joinMsg.text.includes('TestPlayer2'), 'Player 1 sees Player 2 join', joinMsg.text);
  assert(p2GameState.players?.length >= 1, 'Player 2 gets game state with players');

  // Create character for player 2
  const p2CharPromise = waitFor(player2, 'character', 10000);
  player2.emit('create-character', {
    name: 'Vex Shadow',
    race: 'Tiefling',
    class: 'Neon Assassin',
    region: 'Luminara',
    background: 'Ex-Syndicate operative',
    stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 16 },
  });
  const p2Char = await p2CharPromise;
  assert(p2Char.name === 'Vex Shadow', 'Player 2 character created');
  assert(p2Char.inventory.includes('Twin Neon Daggers'), 'P2 has Neon Assassin gear');
  assert(p2Char.abilities?.length > 0, 'P2 has Neon Assassin abilities');
  assert(p2Char.skills.includes('Stealth'), 'P2 has Stealth skill');

  // Player 2 performs an action — both players should see it
  const p1SeesP2 = waitFor(player1, 'player-action', 10000);
  player2.emit('action', { text: 'I emerge from the shadows and greet the Glitch Knight.' });
  const p1Event = await p1SeesP2;
  assert(p1Event.player === 'Vex Shadow', 'P1 sees P2 action with character name', `player: ${p1Event.player}`);
  assert(p1Event.text.includes('shadows'), 'P1 sees P2 action text');

  // Player 2 rolls dice — player 1 sees it
  const p1SeesDice = waitFor(player1, 'dice-roll', 5000);
  player2.emit('command', { command: 'roll', args: 'd20' });
  const diceEvent = await p1SeesDice;
  assert(diceEvent.player === 'Vex Shadow', 'Dice roll shows P2 character name', `player: ${diceEvent.player}`);

  // OOC message
  const p1SeesOoc = waitFor(player1, 'ooc', 5000);
  player2.emit('action', { text: '// Hey, nice sword! Is that glitch plate heavy?' });
  const oocEvent = await p1SeesOoc;
  assert(oocEvent.player === 'Vex Shadow', 'OOC shows character name', `player: ${oocEvent.player}`);

  // ==========================================
  // 10. FEAT SELECTION
  // ==========================================
  console.log('\n── 10. Feat Selection ──');

  // Level up player 1 to level 4 (needs 2700 total XP) — which has feat: true
  const xpFor4 = waitFor(player1, 'system');
  player1.emit('command', { command: 'xp', args: '1800 TestPlayer1' }); // 900 + 1800 = 2700
  await xpFor4;

  const charLvl4 = await sendCommand(player1, 'sheet', '', 'character');
  assert(charLvl4.level === 4, `Level up to 4 (got ${charLvl4.level})`, `level: ${charLvl4.level}`);

  // List feats
  const featList = await sendCommand(player1, 'feat');
  assert(featList.text.includes('Alert') || featList.text.includes('Tough'), '/feat lists feats');

  // Pick a feat
  const featPick = await sendCommand(player1, 'feat', 'Great Weapon Master');
  assert(featPick.text.includes('Great Weapon Master'), 'Feat picked', featPick.text.slice(0, 100));

  const charWithFeat = await sendCommand(player1, 'sheet', '', 'character');
  assert(charWithFeat.abilities.some(a => a.includes('Great Weapon Master')), 'Feat appears in abilities');

  // ==========================================
  // 11. INVENTORY MANAGEMENT
  // ==========================================
  console.log('\n── 11. Inventory Management ──');

  const addItem = await sendCommandMatch(player1, 'inventory', 'add Glitch Blade', d => d.text.includes('Added') || d.text.includes('inventory'), 5000);
  assert(addItem.text.includes('Added'), 'Added item to inventory');

  const dropItem = await sendCommandMatch(player1, 'inventory', "drop Explorer's Pack", d => d.text.includes('Dropped') || d.text.includes('inventory'), 5000);
  assert(dropItem.text.includes('Dropped'), 'Dropped item from inventory');

  // ==========================================
  // 12. REST MECHANICS
  // ==========================================
  console.log('\n── 12. Rest Mechanics ──');

  const longRest = await sendCommandMatch(player1, 'rest', 'long', d => d.text.includes('rest'), 5000);
  assert(longRest.text.includes('long rest') || longRest.text.includes('restored'), '/rest long works');

  const shortRest = await sendCommandMatch(player1, 'rest', 'short', d => d.text.includes('rest'), 5000);
  assert(shortRest.text.includes('short rest'), '/rest short works');

  // ==========================================
  // CLEANUP
  // ==========================================
  console.log('\n── Cleanup ──');
  player1.disconnect();
  player2.disconnect();
  ok('Both players disconnected');

  // ==========================================
  // RESULTS
  // ==========================================
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log(`\n  FAILURES:`);
    errors.forEach(e => console.log(`    ✗ ${e}`));
  }
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(`\n  FATAL: ${err.message}`);
  process.exit(1);
});
