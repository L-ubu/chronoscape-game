// D&D 5e API integration (dnd5eapi.co)
// Provides lookup functions for spells, monsters, equipment, conditions, etc.

const BASE = 'https://www.dnd5eapi.co/api/2014';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// Convert name to API index format: "Fire Bolt" -> "fire-bolt"
function toIndex(name) {
  return name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Search an endpoint for a name (fuzzy)
async function searchEndpoint(endpoint, query) {
  const data = await fetchJson(`${BASE}/${endpoint}?name=${encodeURIComponent(query)}`);
  if (!data?.results?.length) return null;
  return data.results;
}

// --- Formatters: turn API JSON into readable text ---

function formatSpell(s) {
  const lines = [`**${s.name}** — Level ${s.level} ${s.school?.name || ''}`];
  lines.push(`Casting Time: ${s.casting_time} | Range: ${s.range} | Duration: ${s.duration}${s.concentration ? ' (C)' : ''}`);
  lines.push(`Components: ${(s.components || []).join(', ')}${s.material ? ` (${s.material})` : ''}`);
  if (s.desc) lines.push(s.desc.join(' '));
  if (s.damage?.damage_at_slot_level) {
    const dmg = Object.entries(s.damage.damage_at_slot_level).map(([l, d]) => `Lvl${l}: ${d}`).join(', ');
    lines.push(`Damage: ${dmg} ${s.damage.damage_type?.name || ''}`);
  }
  if (s.higher_level?.length) lines.push(`At Higher Levels: ${s.higher_level.join(' ')}`);
  if (s.classes?.length) lines.push(`Classes: ${s.classes.map(c => c.name).join(', ')}`);
  return lines.join('\n');
}

function formatMonster(m) {
  const lines = [`**${m.name}** — ${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ''}, ${m.alignment}`];
  lines.push(`AC: ${m.armor_class?.map(a => `${a.value}${a.type ? ` (${a.type})` : ''}`).join(', ') || '?'} | HP: ${m.hit_points} (${m.hit_dice}) | CR: ${m.challenge_rating} (${m.xp} XP)`);
  const spd = m.speed ? Object.entries(m.speed).map(([k, v]) => `${k} ${v}`).join(', ') : '?';
  lines.push(`Speed: ${spd}`);
  lines.push(`STR ${m.strength} DEX ${m.dexterity} CON ${m.constitution} INT ${m.intelligence} WIS ${m.wisdom} CHA ${m.charisma}`);
  if (m.proficiencies?.length) {
    lines.push(`Proficiencies: ${m.proficiencies.map(p => `${p.proficiency?.name} +${p.value}`).join(', ')}`);
  }
  if (m.senses) {
    const senses = Object.entries(m.senses).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ');
    lines.push(`Senses: ${senses}`);
  }
  if (m.special_abilities?.length) {
    lines.push('--- Abilities ---');
    for (const a of m.special_abilities) lines.push(`${a.name}: ${a.desc}`);
  }
  if (m.actions?.length) {
    lines.push('--- Actions ---');
    for (const a of m.actions) lines.push(`${a.name}: ${a.desc}`);
  }
  return lines.join('\n');
}

function formatEquipment(e) {
  const lines = [`**${e.name}** — ${e.equipment_category?.name || 'Equipment'}`];
  if (e.weapon_category) lines.push(`${e.weapon_category} ${e.weapon_range || ''} Weapon`);
  if (e.armor_category) lines.push(`${e.armor_category} Armor`);
  if (e.damage) lines.push(`Damage: ${e.damage.damage_dice} ${e.damage.damage_type?.name || ''}`);
  if (e.two_handed_damage) lines.push(`Two-handed: ${e.two_handed_damage.damage_dice} ${e.two_handed_damage.damage_type?.name || ''}`);
  if (e.armor_class) lines.push(`AC: ${e.armor_class.base}${e.armor_class.dex_bonus ? ' + DEX' : ''}${e.armor_class.max_bonus ? ` (max ${e.armor_class.max_bonus})` : ''}`);
  if (e.cost) lines.push(`Cost: ${e.cost.quantity} ${e.cost.unit}`);
  if (e.weight) lines.push(`Weight: ${e.weight} lb`);
  if (e.properties?.length) lines.push(`Properties: ${e.properties.map(p => p.name).join(', ')}`);
  if (e.desc?.length) lines.push(e.desc.join(' '));
  return lines.join('\n');
}

function formatCondition(c) {
  const lines = [`**${c.name}**`];
  if (c.desc?.length) lines.push(c.desc.join('\n'));
  return lines.join('\n');
}

function formatMagicItem(i) {
  const lines = [`**${i.name}** — ${i.rarity?.name || 'Unknown rarity'}`];
  if (i.desc?.length) lines.push(i.desc.join('\n'));
  if (i.variant) lines.push('(has variants)');
  return lines.join('\n');
}

function formatFeature(f) {
  const lines = [`**${f.name}**${f.level ? ` (Level ${f.level})` : ''}`];
  if (f.class) lines.push(`Class: ${f.class.name}`);
  if (f.desc?.length) lines.push(f.desc.join('\n'));
  return lines.join('\n');
}

// --- Main lookup function ---

export async function lookup(category, query) {
  const cat = category.toLowerCase().replace(/s$/, '');
  const index = toIndex(query);

  // Try direct fetch first, then search
  const endpoints = {
    'spell': 'spells',
    'monster': 'monsters',
    'creature': 'monsters',
    'item': 'equipment',
    'equipment': 'equipment',
    'weapon': 'equipment',
    'armor': 'equipment',
    'condition': 'conditions',
    'magic-item': 'magic-items',
    'magicitem': 'magic-items',
    'feat': 'feats',
    'feature': 'features',
    'class': 'classes',
    'race': 'races',
    'skill': 'skills',
  };

  const endpoint = endpoints[cat] || 'spells';

  // Try direct fetch
  let data = await fetchJson(`${BASE}/${endpoint}/${index}`);

  // If not found, try search
  if (!data) {
    const results = await searchEndpoint(endpoint, query);
    if (results?.length) {
      data = await fetchJson(`https://www.dnd5eapi.co${results[0].url}`);
    }
  }

  if (!data) return null;

  // Format based on endpoint
  switch (endpoint) {
    case 'spells': return { text: formatSpell(data), type: 'spell', raw: data };
    case 'monsters': return { text: formatMonster(data), type: 'monster', raw: data };
    case 'equipment': return { text: formatEquipment(data), type: 'equipment', raw: data };
    case 'conditions': return { text: formatCondition(data), type: 'condition', raw: data };
    case 'magic-items': return { text: formatMagicItem(data), type: 'magic-item', raw: data };
    case 'feats': return { text: formatFeature(data), type: 'feat', raw: data };
    case 'features': return { text: formatFeature(data), type: 'feature', raw: data };
    default: return { text: `**${data.name}**\n${JSON.stringify(data, null, 2).slice(0, 500)}`, type: cat, raw: data };
  }
}

// For AI DM tool use: compact summary for context injection
export async function lookupForAi(category, query) {
  const result = await lookup(category, query);
  if (!result) return `No 5e data found for "${query}" (${category}).`;
  return result.text;
}

// Auto-detect category from a general query like "fireball" or "goblin"
export async function smartLookup(query) {
  const q = query.trim();

  // Try each category in likely order
  for (const cat of ['spells', 'monsters', 'equipment', 'conditions', 'magic-items', 'feats']) {
    const results = await searchEndpoint(cat, q);
    if (results?.length) {
      const data = await fetchJson(`https://www.dnd5eapi.co${results[0].url}`);
      if (data) {
        switch (cat) {
          case 'spells': return { text: formatSpell(data), type: 'spell', raw: data };
          case 'monsters': return { text: formatMonster(data), type: 'monster', raw: data };
          case 'equipment': return { text: formatEquipment(data), type: 'equipment', raw: data };
          case 'conditions': return { text: formatCondition(data), type: 'condition', raw: data };
          case 'magic-items': return { text: formatMagicItem(data), type: 'magic-item', raw: data };
          case 'feats': return { text: formatFeature(data), type: 'feat', raw: data };
        }
      }
    }
  }
  return null;
}
