import chalk from 'chalk';

// Sneaky mode — passthrough functions that return plain text
const plain = (s) => s;
let sneaky = false;

let NEON = chalk.hex('#00fa6c');
let DIM = chalk.gray;
let GOLD = chalk.hex('#ffc800');
let RED = chalk.hex('#ff4444');
let CYAN = chalk.hex('#00ccff');
let PURPLE = chalk.hex('#e066ff');
let WHITE = chalk.white;

export function setSneakyMode(on) {
  sneaky = on;
  if (on) {
    NEON = DIM = GOLD = RED = CYAN = PURPLE = WHITE = plain;
    // Also disable bold/etc on the plain function
    for (const prop of ['bold', 'dim', 'italic', 'underline']) {
      plain[prop] = plain;
    }
  } else {
    NEON = chalk.hex('#00fa6c');
    DIM = chalk.gray;
    GOLD = chalk.hex('#ffc800');
    RED = chalk.hex('#ff4444');
    CYAN = chalk.hex('#00ccff');
    PURPLE = chalk.hex('#e066ff');
    WHITE = chalk.white;
  }
}

export function isSneaky() { return sneaky; }

// Strip ANSI escape codes for accurate length measurement
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Wrap a line to fit within maxWidth, splitting on spaces
function wrapLine(line, maxWidth) {
  const stripped = stripAnsi(line);
  if (stripped.length <= maxWidth) return [line];

  // For lines with ANSI codes, just truncate visually
  // (wrapping with ANSI mid-line is fragile)
  const lines = [];
  let remaining = line;
  while (stripAnsi(remaining).length > maxWidth) {
    // Find a break point near maxWidth in the visible text
    const vis = stripAnsi(remaining);
    let breakAt = vis.lastIndexOf(' ', maxWidth);
    if (breakAt <= 0) breakAt = maxWidth;

    // Map visible position back to raw string position
    let visCount = 0;
    let rawIdx = 0;
    while (rawIdx < remaining.length && visCount < breakAt) {
      if (remaining[rawIdx] === '\x1b') {
        // Skip ANSI sequence
        const end = remaining.indexOf('m', rawIdx);
        if (end >= 0) { rawIdx = end + 1; continue; }
      }
      visCount++;
      rawIdx++;
    }

    lines.push(remaining.slice(0, rawIdx));
    remaining = remaining.slice(rawIdx).replace(/^ /, '');
  }
  if (remaining) lines.push(remaining);
  return lines;
}

export function box(title, content, width = 50) {
  const innerWidth = width;
  const border = NEON('═'.repeat(innerWidth));
  const top = NEON('╔') + border + NEON('╗');
  const bot = NEON('╚') + border + NEON('╝');
  const sep = NEON('╠') + NEON('─'.repeat(innerWidth)) + NEON('╣');

  // Title line — measure stripped length for correct padding
  const titleText = ' ' + NEON.bold(title);
  const titleVis = stripAnsi(titleText).length;
  const titlePad = Math.max(0, innerWidth - titleVis);
  const titleLine = NEON('║') + titleText + ' '.repeat(titlePad) + NEON('║');

  const lines = [];
  for (const rawLine of content.split('\n')) {
    const wrapped = wrapLine(rawLine, innerWidth - 2); // -2 for padding spaces
    for (const wl of wrapped) {
      const visLen = stripAnsi(wl).length;
      const pad = Math.max(0, innerWidth - visLen - 2);
      lines.push(NEON('║') + ' ' + wl + ' '.repeat(pad) + ' ' + NEON('║'));
    }
  }

  return [top, titleLine, sep, ...lines, bot].join('\n');
}

export function formatCharacterSheet(c) {
  if (!c) return DIM('No character loaded.');

  const hpColor = c.hp <= c.maxHp * 0.25 ? RED : c.hp <= c.maxHp * 0.5 ? GOLD : NEON;
  const hpBar = makeBar(c.hp, c.maxHp, 16, hpColor);

  const mod = (val) => {
    const m = Math.floor(((val || 10) - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  // Stats in 2 rows of 3
  const statRow1 = ['str', 'dex', 'con']
    .map(s => `${s.toUpperCase()} ${WHITE(String(c.stats?.[s] || 10).padStart(2))} ${DIM(`(${mod(c.stats?.[s])})`)}`)
    .join('  ');
  const statRow2 = ['int', 'wis', 'cha']
    .map(s => `${s.toUpperCase()} ${WHITE(String(c.stats?.[s] || 10).padStart(2))} ${DIM(`(${mod(c.stats?.[s])})`)}`)
    .join('  ');

  const conditions = (c.conditions || []).length > 0
    ? RED(c.conditions.join(', '))
    : DIM('none');

  const inventory = (c.inventory || []).length > 0
    ? (c.inventory || []).map(i => `  ${DIM('•')} ${i}`).join('\n')
    : DIM('  (empty)');

  const spellSlots = c.spellSlots && Object.keys(c.spellSlots).length > 0
    ? Object.entries(c.spellSlots)
        .map(([lvl, cur]) => `  Lvl ${lvl}: ${NEON(cur)}/${c.maxSpellSlots?.[lvl] || cur}`)
        .join('\n')
    : DIM('  (none)');

  const spells = (c.spells || []).length > 0
    ? c.spells.map(s => `  ${DIM('•')} ${s}`).join('\n')
    : DIM('  (none)');

  const abilities = (c.abilities || []).length > 0
    ? c.abilities.map(a => `  ${DIM('•')} ${a}`).join('\n')
    : DIM('  (none)');

  const skills = (c.skills || []).length > 0
    ? c.skills.join(', ')
    : DIM('none');

  const profBonus = c.proficiencyBonus || 2;

  const sections = [
    `${CYAN(c.name)}`,
    `${c.race} ${c.class} ${DIM('•')} Level ${c.level}`,
    `${DIM('Background:')} ${c.background || 'Unknown'}`,
    `${DIM('Region:')}     ${c.region || 'Unknown'}`,
    `${DIM('Alignment:')} ${c.alignment || 'Unknown'}`,
    '',
    `${DIM('─── Vitals ───')}`,
    `HP ${hpBar} ${hpColor(`${c.hp}/${c.maxHp}`)}`,
    `AC ${WHITE(c.ac)}  ${DIM('Prof:')} +${profBonus}  ${DIM('XP:')} ${c.xp || 0}`,
    '',
    `${DIM('─── Ability Scores ───')}`,
    statRow1,
    statRow2,
    '',
    `${DIM('─── Skills ───')}`,
    skills,
    '',
    `${DIM('─── Conditions ───')}`,
    conditions,
    '',
    `${GOLD('─── Inventory ───')} ${DIM(`(${(c.inventory || []).length} items, ${c.gold || 0}g)`)}`,
    inventory,
    '',
    `${PURPLE('─── Spells Known ───')}`,
    spells,
    '',
    `${PURPLE('─── Spell Slots ───')}`,
    spellSlots,
    '',
    `${CYAN('─── Class Abilities ───')}`,
    abilities,
  ];

  return box('CHARACTER SHEET', sections.join('\n'), 48);
}

export function formatCombatTracker(combat) {
  if (!combat) return DIM('No active combat.');

  const header = `COMBAT — Round ${combat.round}`;
  const lines = combat.combatants.map((c, i) => {
    const isCurrent = i === combat.turnIndex;
    const arrow = isCurrent ? RED(' > ') : '   ';
    const hpStr = c.isPlayer
      ? `HP: ${c.hp}/${c.maxHp}`
      : `HP: ??`;
    const conds = (c.conditions || []).length > 0
      ? ` [${c.conditions.join(', ')}]`
      : '';
    const name = isCurrent ? WHITE.bold(c.name) : c.name;
    const num = String(i + 1).padStart(2);
    const down = c.down ? RED(' DOWN') : '';
    return `${arrow}${DIM(num + '.')} ${name} ${DIM(`(${hpStr})`)}${conds}${down}`;
  });

  return box(header, lines.join('\n'), 46);
}

export function formatStatus(status) {
  const hpColor = status.hp <= status.maxHp * 0.25 ? RED : status.hp <= status.maxHp * 0.5 ? GOLD : NEON;
  const hpBar = makeBar(status.hp, status.maxHp, 16, hpColor);

  const conditions = (status.conditions || []).length > 0
    ? RED(status.conditions.join(', '))
    : DIM('none');

  const slots = status.spellSlots && Object.keys(status.spellSlots).length > 0
    ? Object.entries(status.spellSlots)
        .map(([lvl, cur]) => `Lvl${lvl}: ${cur}/${status.maxSpellSlots?.[lvl] || cur}`)
        .join(' | ')
    : DIM('none');

  return [
    `${CYAN(status.name)}`,
    `HP ${hpBar} ${hpColor(`${status.hp}/${status.maxHp}`)}  AC: ${status.ac}`,
    `Conditions: ${conditions}`,
    `Spell Slots: ${slots}`,
  ].join('\n');
}

export function formatInventory(items) {
  if (!items || items.length === 0) return DIM('Inventory is empty.');
  const lines = items.map((item, i) => `  ${DIM(`${i + 1}.`)} ${item}`);
  return box('INVENTORY', lines.join('\n'), 36);
}

export function formatMap(scene) {
  if (scene.mapData) {
    const m = scene.mapData;
    const header = `${CYAN(m.region)} — ${DIM(m.desc)}`;
    const grid = m.grid.map(row => {
      // Colorize special characters
      return row.replace(/[#*~^=!ASGDFT]/g, (ch) => GOLD(ch)).replace(/·/g, DIM('·'));
    }).join('\n');
    const legend = Object.entries(m.locations).map(([name, loc]) => {
      const isCurrent = name === m.currentLocation;
      const arrow = isCurrent ? NEON(' >> ') : '    ';
      const nameStr = isCurrent ? WHITE(name) : DIM(name);
      return `${arrow}${GOLD(loc.icon)} ${nameStr}`;
    }).join('\n');
    const currentLoc = m.locations[m.currentLocation];
    const locDesc = currentLoc ? currentLoc.desc : '';
    const content = [
      header, '',
      grid, '',
      `${NEON('You are here:')} ${WHITE(m.currentLocation)}`,
      locDesc, '',
      DIM('Locations:'),
      legend,
    ].join('\n');
    return box('MAP', content, 48);
  }
  return box('MAP', `${NEON('*')} ${WHITE(scene.location || 'Unknown')}\n\n${scene.description || ''}`, 44);
}

export function formatHelp(commands) {
  const lines = commands.map(c => {
    return `${NEON(c.cmd.padEnd(26))} ${DIM(c.desc)}`;
  });
  return box('COMMANDS', lines.join('\n'), 60);
}

export function formatDmMessage(text) {
  return `\n${PURPLE('DM')} ${DIM('|')} ${WHITE(text)}\n`;
}

export function formatPlayerAction(player, text) {
  return `${CYAN(player)} ${DIM('|')} ${text}`;
}

export function formatOoc(player, text) {
  return DIM(`[OOC] ${player}: ${text}`);
}

export function formatDiceRoll(player, result) {
  return `${GOLD('dice')} ${CYAN(player)} rolled ${GOLD(result.label)}`;
}

// Animated dice roll — returns a promise that resolves when animation is done
export async function animateDiceRoll(player, result) {
  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const frames = 8;
  const delay = 60;

  // Spinning phase
  for (let i = 0; i < frames; i++) {
    const face = DICE_FACES[Math.floor(Math.random() * 6)];
    const fake = Math.floor(Math.random() * 20) + 1;
    const line = `  ${GOLD(face)} ${DIM(`rolling... ${fake}`)}`;
    process.stdout.write('\r' + ' '.repeat(50) + '\r' + line);
    await new Promise(r => setTimeout(r, delay + i * 15));
  }

  // Clear and show result
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
  const face = DICE_FACES[Math.min(5, Math.max(0, (result.total || 1) - 1))];
  return `  ${GOLD(face)} ${CYAN(player)} rolled ${GOLD(result.label)}`;
}

export function formatSystemMessage(msg) {
  switch (msg.type) {
    case 'join': return NEON(`> ${msg.text}`);
    case 'leave': return DIM(`< ${msg.text}`);
    case 'error': return RED(`! ${msg.text}`);
    case 'success': return NEON(`+ ${msg.text}`);
    case 'combat': return RED.bold(`! ${msg.text}`);
    case 'info':
    default: return DIM(`- ${msg.text}`);
  }
}

export function formatRollRequest(req) {
  return GOLD(`dice: The DM asks you to roll: ${req.dice} (${req.reason})`);
}

// Utilities
function makeBar(current, max, width, colorFn) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return colorFn('█'.repeat(filled)) + DIM('░'.repeat(empty));
}
