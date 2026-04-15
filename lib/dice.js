// Dice rolling engine — supports standard D&D notation
// Examples: d20, 2d6+3, 4d6kh3, d20 advantage, 3d8-1

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count, sides) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

// Parse and evaluate dice notation
// Supports: 2d6+3, 4d6kh3 (keep highest 3), 4d6kl1 (keep lowest 1), d20, flat numbers
export function parseDiceNotation(notation) {
  const cleaned = notation.trim().toLowerCase();

  // Check for advantage/disadvantage
  if (cleaned === 'd20 advantage' || cleaned === 'd20 adv') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    const total = Math.max(r1, r2);
    return { notation: 'd20 advantage', rolls: [r1, r2], kept: [total], modifier: 0, total, label: `d20 advantage: [${r1}, ${r2}] → ${total}` };
  }
  if (cleaned === 'd20 disadvantage' || cleaned === 'd20 dis') {
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    const total = Math.min(r1, r2);
    return { notation: 'd20 disadvantage', rolls: [r1, r2], kept: [total], modifier: 0, total, label: `d20 disadvantage: [${r1}, ${r2}] → ${total}` };
  }

  // Parse standard notation: XdY[kh/kl Z][+/-M]
  const match = cleaned.match(/^(\d*)d(\d+)(?:k([hl])(\d+))?([+-]\d+)?$/);
  if (!match) {
    // Try plain number
    const num = parseInt(cleaned);
    if (!isNaN(num)) {
      return { notation: cleaned, rolls: [num], kept: [num], modifier: 0, total: num, label: `${num}` };
    }
    return null;
  }

  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const keepMode = match[3]; // 'h' or 'l'
  const keepCount = match[4] ? parseInt(match[4]) : null;
  const modifier = match[5] ? parseInt(match[5]) : 0;

  const rolls = rollDice(count, sides);
  let kept;

  if (keepMode && keepCount) {
    const sorted = [...rolls].sort((a, b) => b - a);
    if (keepMode === 'h') {
      kept = sorted.slice(0, keepCount);
    } else {
      kept = sorted.slice(-keepCount);
    }
  } else {
    kept = [...rolls];
  }

  const sum = kept.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const keepStr = keepMode ? ` keep ${keepMode === 'h' ? 'highest' : 'lowest'} ${keepCount}` : '';
  let label = `${count}d${sides}${keepStr}${modStr}: [${rolls.join(', ')}]`;
  if (keepMode) label += ` → kept [${kept.join(', ')}]`;
  if (modifier) label += ` ${modifier > 0 ? '+' : ''}${modifier}`;
  label += ` = ${total}`;

  return { notation: cleaned, rolls, kept, modifier, total, label };
}

// Roll ability scores: 4d6 drop lowest, 6 times
export function rollAbilityScores() {
  const scores = [];
  for (let i = 0; i < 6; i++) {
    const result = parseDiceNotation('4d6kh3');
    scores.push({ rolls: result.rolls, total: result.total });
  }
  return scores;
}

// Roll initiative: d20 + modifier
export function rollInitiative(modifier = 0) {
  const roll = rollDie(20);
  return { roll, modifier, total: roll + modifier };
}
