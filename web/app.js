// Chronoscape Web Client
const socket = io();

// DOM elements
const joinScreen = document.getElementById('join-screen');
const gameScreen = document.getElementById('game-screen');
const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const charSheet = document.getElementById('char-sheet');
const partyList = document.getElementById('party-list');
const combatBar = document.getElementById('combat-bar');
const combatRound = document.getElementById('combat-round');
const combatList = document.getElementById('combat-list');
const charCreationModal = document.getElementById('char-creation-modal');
const manualCreationModal = document.getElementById('manual-creation-modal');
const creationChat = document.getElementById('creation-chat');
const creationInput = document.getElementById('creation-input');

let playerName = '';
let currentCharacter = null;
let creationHistory = [];

// --- Join ---
joinBtn.addEventListener('click', join);
playerNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });

function join() {
  playerName = playerNameInput.value.trim();
  if (!playerName) return;
  socket.emit('join', { name: playerName });
  joinScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  chatInput.focus();
}

// --- Chat Input ---
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';

  if (text.startsWith('/')) {
    const parts = text.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    socket.emit('command', { command, args });
  } else if (text.startsWith('>')) {
    // DM narration
    socket.emit('dm-narrate', { text: text.slice(1).trim() });
  } else {
    socket.emit('action', { text });
  }
}

// Quick action buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    if (cmd.startsWith('/')) {
      const parts = cmd.slice(1).split(/\s+/);
      socket.emit('command', { command: parts[0], args: parts.slice(1).join(' ') });
    }
  });
});

// Sidebar tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// --- Socket Events ---

socket.on('system', msg => {
  addChatMessage('system', msg.text, msg.type);
});

socket.on('dm-message', msg => {
  addChatMessage('dm', msg.text);
});

// Streaming DM responses
let streamDiv = null;
socket.on('dm-stream-start', () => {
  streamDiv = document.createElement('div');
  streamDiv.className = 'msg msg-dm';
  streamDiv.innerHTML = '<span class="msg-label">⚔ DM</span>';
  chatLog.appendChild(streamDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
});

socket.on('dm-stream-chunk', ({ text }) => {
  if (!streamDiv) return;
  // Append text, preserving newlines
  const escaped = escapeHtml(text).replace(/\n/g, '<br>');
  streamDiv.innerHTML += escaped;
  chatLog.scrollTop = chatLog.scrollHeight;
});

socket.on('dm-stream-end', () => {
  streamDiv = null;
});

socket.on('player-action', ({ player, text }) => {
  addChatMessage('action', text, null, player);
});

socket.on('ooc', ({ player, text }) => {
  addChatMessage('ooc', `[OOC] ${player}: ${text}`);
});

socket.on('dice-roll', result => {
  addChatMessage('dice', `${result.player} rolled ${result.label}`);
});

socket.on('character', char => {
  currentCharacter = char;
  renderCharacterSheet(char);
  // Also show in chat as a summary
  addChatMessage('system', `Character: ${char.name} (${char.race} ${char.class} Lvl${char.level})`, 'info');
});

socket.on('inventory', items => {
  if (items.length === 0) {
    addChatMessage('system', 'Inventory is empty.', 'info');
  } else {
    addChatMessage('system', 'Inventory:\n' + items.map((it, i) => `  ${i + 1}. ${it}`).join('\n'), 'info');
  }
});

socket.on('status', status => {
  const conds = status.conditions.length > 0 ? status.conditions.join(', ') : 'none';
  addChatMessage('system',
    `${status.name} — HP: ${status.hp}/${status.maxHp} | AC: ${status.ac} | Conditions: ${conds}`, 'info');
});

socket.on('map', scene => {
  if (scene.mapData) {
    renderMapInChat(scene.mapData);
  } else {
    addChatMessage('system', `📍 ${scene.location}\n${scene.description}`, 'info');
  }
});

socket.on('combat-state', combat => {
  renderCombat(combat);
});

socket.on('combat-action', action => {
  addChatMessage('system', action.text, 'combat');
});

socket.on('help', commands => {
  const text = commands.map(c => `${c.cmd}  —  ${c.desc}`).join('\n');
  addChatMessage('system', text, 'info');
});

socket.on('roll-request', req => {
  addChatMessage('dice', `🎲 DM asks you to roll: ${req.dice} (${req.reason})`);
});

socket.on('scene-change', scene => {
  addChatMessage('dm', `📍 SCENE: ${scene.location}\n${scene.description}`);
});

socket.on('dm-mode-changed', ({ mode, dm }) => {
  addChatMessage('system', `DM Mode: ${mode.toUpperCase()} (${dm})`, 'info');
});

socket.on('game-state', state => {
  addChatMessage('system', `📍 ${state.scene.location} — ${state.scene.description}`, 'info');
  if (state.players.length > 0) {
    const party = state.players.map(p =>
      p.character ? `${p.name} (${p.character.race} ${p.character.class})` : `${p.name}`
    ).join(', ');
    addChatMessage('system', `Party: ${party}`, 'info');
  }
  renderPartyList(state.players);
});

// Character creation
socket.on('needs-character', ({ aiAvailable }) => {
  if (aiAvailable) {
    charCreationModal.classList.remove('hidden');
    // Start AI conversation
    socket.emit('character-creation-chat', {
      message: 'I want to create a new character for Chronoscape.',
      history: [],
    });
    creationHistory = [{ role: 'user', content: 'I want to create a new character for Chronoscape.' }];
  } else {
    manualCreationModal.classList.remove('hidden');
  }
});

socket.on('character-creation-response', response => {
  if (response.message) {
    creationHistory.push({ role: 'assistant', content: response.message });
    appendCreationMessage('ai', response.message);
  }
  if (response.character) {
    charCreationModal.classList.add('hidden');
    currentCharacter = response.character;
    renderCharacterSheet(response.character);
  }
});

// Creation chat
document.getElementById('creation-send-btn').addEventListener('click', sendCreationMessage);
creationInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendCreationMessage(); });

function sendCreationMessage() {
  const text = creationInput.value.trim();
  if (!text) return;
  creationInput.value = '';
  creationHistory.push({ role: 'user', content: text });
  appendCreationMessage('user', text);
  socket.emit('character-creation-chat', { message: text, history: creationHistory });
}

function appendCreationMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg msg-${role === 'ai' ? 'dm' : 'action'}`;
  div.innerHTML = `<span class="msg-label">${role === 'ai' ? 'AI' : 'You'}:</span> ${escapeHtml(text).replace(/\n/g, '<br>')}`;
  creationChat.appendChild(div);
  creationChat.scrollTop = creationChat.scrollHeight;
}

// Manual creation — fetch class data from server and populate dropdowns
let classDataCache = null;

async function loadClassData() {
  if (classDataCache) return classDataCache;
  const res = await fetch('/api/class-data');
  classDataCache = await res.json();
  return classDataCache;
}

function populateSelect(selectId, items, descId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.textContent = item.name;
    select.appendChild(opt);
  });
  if (descId) {
    const descEl = document.getElementById(descId);
    const update = () => {
      const found = items.find(i => i.name === select.value);
      descEl.textContent = found?.desc || '';
    };
    select.addEventListener('change', update);
    update();
  }
}

function updateClassPreview() {
  if (!classDataCache) return;
  const cls = document.getElementById('mc-class').value.toLowerCase();
  const data = classDataCache.classData[cls];
  const hitDie = classDataCache.hitDice[cls] || 8;
  const preview = document.getElementById('mc-class-preview');
  if (!data) { preview.innerHTML = ''; return; }

  const gear = data.gear.map(g => `<span class="mc-tag">${escapeHtml(g)}</span>`).join('');
  const skills = data.skills.map(s => `<span class="mc-tag mc-tag-skill">${escapeHtml(s)}</span>`).join('');
  const abilities = data.abilities.map(a => {
    const parts = a.split(' — ');
    return `<div class="mc-ability"><strong>${escapeHtml(parts[0])}</strong>${parts[1] ? ` — <span class="dim">${escapeHtml(parts.slice(1).join(' — '))}</span>` : ''}</div>`;
  }).join('');
  const spells = data.spells.length > 0
    ? data.spells.map(s => `<span class="mc-tag mc-tag-spell">${escapeHtml(s)}</span>`).join('')
    : '<span class="dim">none</span>';
  const acText = data.ac != null ? `AC ${data.ac}` : 'AC varies';
  const slots = Object.keys(data.spellSlots || {}).length > 0
    ? Object.entries(data.spellSlots).map(([l, n]) => `Lvl${l}: ${n}`).join(', ')
    : '';

  preview.innerHTML = `
    <div class="mc-preview-row"><span class="mc-label">Hit Die:</span> d${hitDie} <span class="mc-sep">|</span> <span class="mc-label">AC:</span> ${acText}${slots ? ` <span class="mc-sep">|</span> <span class="mc-label">Slots:</span> ${slots}` : ''}</div>
    <div class="mc-preview-row"><span class="mc-label">Starting Gear:</span> ${gear}</div>
    <div class="mc-preview-row"><span class="mc-label">Skills:</span> ${skills}</div>
    <div class="mc-preview-row"><span class="mc-label">Abilities:</span></div>
    <div class="mc-abilities">${abilities}</div>
    ${data.spells.length > 0 ? `<div class="mc-preview-row"><span class="mc-label">Spells:</span> ${spells}</div>` : ''}
  `;
}

document.getElementById('manual-create-btn').addEventListener('click', async () => {
  charCreationModal.classList.add('hidden');
  manualCreationModal.classList.remove('hidden');
  const data = await loadClassData();
  populateSelect('mc-race', data.races, 'mc-race-desc');
  populateSelect('mc-class', data.classes);
  populateSelect('mc-region', data.regions, 'mc-region-desc');
  populateSelect('mc-alignment', data.alignments);
  document.getElementById('mc-class').addEventListener('change', updateClassPreview);
  updateClassPreview();
  rollManualStats();
});

let manualStats = {};
function rollManualStats() {
  const names = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const descs = ['Melee, carry', 'Dodge, stealth', 'HP, endurance', 'Spells, lore', 'Perception, will', 'Persuade, lead'];
  const display = document.getElementById('mc-stats');
  display.innerHTML = '';
  manualStats = {};
  names.forEach((name, i) => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    const total = rolls[0] + rolls[1] + rolls[2];
    manualStats[name.toLowerCase()] = total;
    const mod = Math.floor((total - 10) / 2);
    const div = document.createElement('div');
    div.className = 'stat-box';
    div.innerHTML = `<div class="stat-label">${name}</div><div class="stat-value">${total}</div><div class="stat-mod">${mod >= 0 ? '+' : ''}${mod}</div><div class="stat-desc">${descs[i]}</div>`;
    display.appendChild(div);
  });
}

document.getElementById('mc-roll-stats').addEventListener('click', rollManualStats);

document.getElementById('mc-create-btn').addEventListener('click', () => {
  const name = document.getElementById('mc-name').value.trim() || playerName;
  const race = document.getElementById('mc-race').value;
  const cls = document.getElementById('mc-class').value;
  const region = document.getElementById('mc-region').value;
  const alignment = document.getElementById('mc-alignment').value;
  const background = document.getElementById('mc-background').value;

  socket.emit('create-character', {
    name, race, class: cls, region, background,
    alignment, stats: manualStats, level: 1,
  });
  manualCreationModal.classList.add('hidden');
});

// --- Rendering ---

function addChatMessage(type, text, subtype, player) {
  const div = document.createElement('div');
  div.className = `msg msg-${type}${subtype ? ' ' + subtype : ''}`;

  switch (type) {
    case 'dm':
      div.innerHTML = `<span class="msg-label">⚔ DM</span>${escapeHtml(text).replace(/\n/g, '<br>')}`;
      break;
    case 'action':
      div.innerHTML = `<span class="msg-label">${escapeHtml(player || '')}</span>${escapeHtml(text)}`;
      break;
    case 'dice':
      div.textContent = `🎲 ${text}`;
      break;
    case 'ooc':
      div.textContent = text;
      break;
    case 'system':
    default:
      div.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  }

  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderCharacterSheet(c) {
  if (!c) return;
  const hpPct = Math.max(0, c.hp / c.maxHp * 100);
  const hpClass = hpPct <= 25 ? 'critical' : hpPct <= 50 ? 'low' : '';
  const profBonus = c.proficiencyBonus || 2;

  const statsHtml = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(s => {
    const val = c.stats?.[s] || 10;
    const mod = Math.floor((val - 10) / 2);
    return `<div class="stat-box">
      <div class="stat-label">${s.toUpperCase()}</div>
      <div class="stat-value">${val}</div>
      <div class="stat-mod">${mod >= 0 ? '+' : ''}${mod}</div>
    </div>`;
  }).join('');

  const conditionsHtml = (c.conditions || []).length > 0
    ? c.conditions.map(co => `<span class="condition-tag">${escapeHtml(co)}</span>`).join('')
    : '<span class="dim">none</span>';

  // Rich inventory with item details
  const items = c.inventoryDetails || (c.inventory || []).map(name => ({ name, type: 'misc' }));
  let inventoryHtml = '';
  if (items.length > 0) {
    const weapons = items.filter(i => i.type === 'weapon');
    const armor = items.filter(i => i.type === 'armor');
    const gear = items.filter(i => i.type !== 'weapon' && i.type !== 'armor');

    if (weapons.length > 0) {
      inventoryHtml += '<div class="inv-category">Weapons</div>';
      inventoryHtml += weapons.map(i => {
        const dmg = i.damage ? `<span class="inv-damage">${escapeHtml(i.damage)}</span>` : '';
        const props = (i.properties || []).length > 0 ? `<span class="inv-props">${escapeHtml(i.properties.join(', '))}</span>` : '';
        const desc = i.desc ? `<div class="inv-desc">${escapeHtml(i.desc)}</div>` : '';
        return `<div class="inv-item-rich"><div class="inv-item-name">${escapeHtml(i.name)}</div><div class="inv-item-stats">${dmg}${props}</div>${desc}</div>`;
      }).join('');
    }
    if (armor.length > 0) {
      inventoryHtml += '<div class="inv-category">Armor</div>';
      inventoryHtml += armor.map(i => {
        const ac = i.ac ? `<span class="inv-damage">AC ${i.ac}</span>` : '';
        const props = (i.properties || []).length > 0 ? `<span class="inv-props">${escapeHtml(i.properties.join(', '))}</span>` : '';
        const desc = i.desc ? `<div class="inv-desc">${escapeHtml(i.desc)}</div>` : '';
        return `<div class="inv-item-rich"><div class="inv-item-name">${escapeHtml(i.name)}</div><div class="inv-item-stats">${ac}${props}</div>${desc}</div>`;
      }).join('');
    }
    if (gear.length > 0) {
      inventoryHtml += '<div class="inv-category">Gear</div>';
      inventoryHtml += gear.map(i => {
        const desc = i.desc ? `<div class="inv-desc">${escapeHtml(i.desc)}</div>` : '';
        return `<div class="inv-item-rich"><div class="inv-item-name">${escapeHtml(i.name)}</div>${desc}</div>`;
      }).join('');
    }
  } else {
    inventoryHtml = '<span class="dim">empty</span>';
  }

  // Abilities
  const abilitiesHtml = (c.abilities || []).length > 0
    ? c.abilities.map(a => {
        const parts = a.split(' — ');
        const name = parts[0];
        const desc = parts.slice(1).join(' — ');
        return `<div class="ability-item"><div class="ability-name">${escapeHtml(name)}</div>${desc ? `<div class="ability-desc">${escapeHtml(desc)}</div>` : ''}</div>`;
      }).join('')
    : '<span class="dim">none</span>';

  // Spells
  const spellsHtml = (c.spells || []).length > 0
    ? `<div class="spell-list">${c.spells.map(s => `<span class="spell-tag">${escapeHtml(s)}</span>`).join('')}</div>`
    : '<span class="dim">none</span>';

  // Spell slots
  let slotsHtml = '';
  if (c.spellSlots && Object.keys(c.spellSlots).length > 0) {
    slotsHtml = Object.entries(c.spellSlots).map(([lvl, cur]) => {
      const max = c.maxSpellSlots?.[lvl] || cur;
      const dots = Array.from({ length: max }, (_, i) => i < cur ? '●' : '○').join(' ');
      return `<div class="slot-row"><span class="slot-level">Lvl ${lvl}</span> <span class="slot-dots">${dots}</span></div>`;
    }).join('');
  }

  // Skills
  const skillsHtml = (c.skills || []).length > 0
    ? c.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')
    : '<span class="dim">none</span>';

  // XP bar
  const xp = c.xp || 0;
  const xpNext = c.xpToNext;
  let xpBarHtml = '';
  if (xpNext) {
    const xpPct = Math.min(100, Math.max(0, xp / xpNext * 100));
    xpBarHtml = `
      <div class="xp-section">
        <div class="xp-label">XP ${xp} / ${xpNext}</div>
        <div class="xp-bar-container"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>
      </div>`;
  }

  charSheet.innerHTML = `
    <div class="char-header">
      <div class="char-name">${escapeHtml(c.name)}</div>
      <div class="char-meta">${c.race} ${c.class} — Level ${c.level}</div>
      <div class="char-meta">${c.region || ''} · ${c.alignment || ''} · ${c.background || ''}</div>
    </div>
    <div class="hp-section">
      <div class="hp-label">HP · AC ${c.ac} · Prof +${profBonus}</div>
      <div class="hp-bar-container">
        <div class="hp-bar-fill ${hpClass}" style="width:${hpPct}%"></div>
        <span class="hp-text">${c.hp} / ${c.maxHp}</span>
      </div>
    </div>
    ${xpBarHtml}
    <div class="stat-grid">${statsHtml}</div>
    <div class="section-label">Skills</div>
    <div class="skills-container">${skillsHtml}</div>
    <div class="section-label">Conditions</div>
    <div>${conditionsHtml}</div>
    <div class="section-label">Abilities</div>
    <div class="abilities-container">${abilitiesHtml}</div>
    <div class="section-label">Spells${slotsHtml ? ' & Slots' : ''}</div>
    <div>${spellsHtml}</div>
    ${slotsHtml ? `<div class="spell-slots">${slotsHtml}</div>` : ''}
    <div class="section-label">Inventory <span class="dim">(${items.length} items${c.gold ? `, ${c.gold}g` : ''})</span></div>
    <div class="inventory-rich">${inventoryHtml}</div>
  `;
}

function renderCombat(combat) {
  if (!combat) {
    combatBar.classList.add('hidden');
    return;
  }
  combatBar.classList.remove('hidden');
  combatRound.textContent = combat.round;
  combatList.innerHTML = combat.combatants.map((c, i) => {
    const classes = ['combat-entry'];
    if (i === combat.turnIndex) classes.push('active');
    if (c.down) classes.push('down');
    const hp = c.isPlayer && c.hp !== undefined ? ` HP:${c.hp}/${c.maxHp}` : '';
    const conds = (c.conditions || []).length > 0 ? ` [${c.conditions.join(',')}]` : '';
    return `<div class="${classes.join(' ')}">${i + 1}. ${escapeHtml(c.name)}${hp}${conds}</div>`;
  }).join('');
}

function renderPartyList(players) {
  if (!players || players.length === 0) {
    partyList.innerHTML = '<p class="dim">No players connected.</p>';
    return;
  }
  partyList.innerHTML = players.map(p => {
    const charInfo = p.character
      ? `${p.character.race} ${p.character.class} Lvl${p.character.level} — HP: ${p.character.hp}/${p.character.maxHp}`
      : 'No character';
    return `<div class="party-member">
      <div class="party-member-name">${escapeHtml(p.name)}${p.role === 'dm' ? ' (DM)' : ''}</div>
      <div class="party-member-info">${charInfo}</div>
    </div>`;
  }).join('');
}

function renderMapInChat(mapData) {
  const div = document.createElement('div');
  div.className = 'msg map-container';

  const gridHtml = mapData.grid.map(row => escapeHtml(row)).join('\n');
  const legendHtml = Object.entries(mapData.locations).map(([name, loc]) => {
    const isCurrent = name === mapData.currentLocation;
    const cls = isCurrent ? 'map-legend-current' : 'map-legend-item';
    const arrow = isCurrent ? '▸ ' : '  ';
    const connects = (loc.connects || []).length > 0 ? ` → ${loc.connects.join(', ')}` : '';
    return `<div class="${cls}"><span class="map-icon">${escapeHtml(loc.icon)}</span>${arrow}${escapeHtml(name)}<span class="map-connects">${escapeHtml(connects)}</span></div>`;
  }).join('');

  const currentLoc = mapData.locations[mapData.currentLocation];
  const locDesc = currentLoc ? currentLoc.desc : '';

  div.innerHTML = `
    <div class="map-header">
      <div class="map-region">${escapeHtml(mapData.region)}</div>
      <div class="map-region-desc">${escapeHtml(mapData.desc)}</div>
    </div>
    <div class="map-grid-wrapper">
      <pre class="map-grid">${gridHtml}</pre>
    </div>
    <div class="map-current">
      <div class="map-current-name">📍 ${escapeHtml(mapData.currentLocation)}</div>
      <div class="map-current-desc">${escapeHtml(locDesc)}</div>
    </div>
    <div class="map-legend">${legendHtml}</div>
  `;

  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
