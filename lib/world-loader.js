import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

const VAULT_ROOT = path.join(import.meta.dirname, '..', '..');

// Read a JSON canvas file and return parsed { nodes, edges }
function readCanvasFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

// Read a markdown file, strip Obsidian-specific syntax, return { frontmatter, body }
function readMarkdownFile(filePath) {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');

  let frontmatter = {};
  let body = raw;

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fmLines = fmMatch[1].split('\n');
    for (const line of fmLines) {
      const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
      if (kv) {
        let val = kv[2].trim().replace(/^["']|["']$/g, '');
        frontmatter[kv[1]] = val;
      }
    }
    body = fmMatch[2];
  }

  // Strip Obsidian syntax
  body = body
    .replace(/!\[\[.*?\]\]/g, '')                    // remove image embeds
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')   // [[link|display]] → display
    .replace(/\[\[([^\]]+)\]\]/g, '$1')              // [[link]] → link
    .replace(/```dataview[\s\S]*?```/g, '')          // remove dataview blocks
    .replace(/```dice[\s\S]*?```/g, '')              // remove dice blocks
    .replace(/\n{3,}/g, '\n\n')                      // collapse blank lines
    .trim();

  return { frontmatter, body };
}

// Recursively find all .md files in a directory
function findMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// Truncate text to approximate token count (rough: 4 chars ≈ 1 token)
function truncateToTokens(text, maxTokens) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[...truncated]';
}

export function loadWorldContext() {
  const sections = [];

  // 1. World Overview
  const overview = readMarkdownFile(path.join(VAULT_ROOT, 'World', 'Overview.md'));
  if (overview) {
    sections.push(`## World Overview\n${truncateToTokens(overview.body, 800)}`);
  }

  // 2. Continents — summary of each
  const continentDirs = ['Luminara', 'Wyrmholt', 'The Shardlands', 'Ferromar'];
  for (const continent of continentDirs) {
    const mainFile = readMarkdownFile(path.join(VAULT_ROOT, 'World', 'Continents', continent, `${continent}.md`));
    if (mainFile) {
      // Just the first section (up to second H2)
      const summary = mainFile.body.split(/\n## /)[0];
      sections.push(`## ${continent}\n${truncateToTokens(summary, 300)}`);
    }

    // Key locations in this continent
    const locDir = path.join(VAULT_ROOT, 'World', 'Continents', continent);
    if (existsSync(locDir)) {
      const locFiles = findMarkdownFiles(locDir)
        .filter(f => path.basename(f) !== `${continent}.md`);
      for (const locFile of locFiles) {
        const loc = readMarkdownFile(locFile);
        if (loc) {
          const name = loc.frontmatter.name || path.basename(locFile, '.md');
          const summary = loc.body.split(/\n## /)[0];
          sections.push(`### ${name}\n${truncateToTokens(summary, 150)}`);
        }
      }
    }
  }

  // 3. Planes
  const planesDir = path.join(VAULT_ROOT, 'World', 'Planes');
  if (existsSync(planesDir)) {
    for (const file of findMarkdownFiles(planesDir)) {
      const plane = readMarkdownFile(file);
      if (plane) {
        const name = plane.frontmatter.name || path.basename(file, '.md');
        const summary = plane.body.split(/\n## /)[0];
        sections.push(`### Plane: ${name}\n${truncateToTokens(summary, 200)}`);
      }
    }
  }

  // 4. History highlights
  const timeline = readMarkdownFile(path.join(VAULT_ROOT, 'World', 'History', 'Timeline.md'));
  if (timeline) {
    sections.push(`## Timeline\n${truncateToTokens(timeline.body, 400)}`);
  }

  // 5. Factions
  const factionsDir = path.join(VAULT_ROOT, 'Factions');
  if (existsSync(factionsDir)) {
    sections.push('## Factions');
    for (const file of findMarkdownFiles(factionsDir)) {
      const faction = readMarkdownFile(file);
      if (faction) {
        const name = faction.frontmatter.name || path.basename(file, '.md');
        const alignment = faction.frontmatter.alignment || '';
        const hq = faction.frontmatter.headquarters || '';
        const leader = faction.frontmatter.leader || '';
        const summary = faction.body.split(/\n## /)[0];
        sections.push(`### ${name} (${alignment})\nHQ: ${hq} | Leader: ${leader}\n${truncateToTokens(summary, 200)}`);
      }
    }
  }

  // 6. Key NPCs — load with personality, role, and key abilities
  const npcDirs = ['Allies', 'Villains', 'Neutral'];
  sections.push('## NPCs');
  for (const sub of npcDirs) {
    const dir = path.join(VAULT_ROOT, 'Characters', 'NPCs', sub);
    if (!existsSync(dir)) continue;
    for (const file of findMarkdownFiles(dir)) {
      const npc = readMarkdownFile(file);
      if (npc) {
        const fm = npc.frontmatter;
        const name = fm.name || path.basename(file, '.md');
        const role = sub === 'Allies' ? 'ally' : sub === 'Villains' ? 'villain' : 'neutral';
        // Extract personality and key details
        const bodySections = npc.body.split(/\n## /);
        const intro = bodySections[0].split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ');
        let personality = '';
        let background = '';
        for (const sec of bodySections.slice(1)) {
          if (sec.toLowerCase().startsWith('personality')) {
            personality = sec.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ');
          }
          if (sec.toLowerCase().startsWith('background')) {
            background = sec.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ');
          }
        }
        const details = [
          `${fm.race || '?'} ${fm.class || '?'}`,
          role,
          fm.faction ? `faction: ${fm.faction}` : '',
          fm.region ? `region: ${fm.region}` : '',
          fm.status ? `status: ${fm.status}` : '',
        ].filter(Boolean).join(', ');
        let entry = `- **${name}** (${details}): ${truncateToTokens(intro, 100)}`;
        if (personality) entry += `\n  Personality: ${truncateToTokens(personality, 80)}`;
        if (background) entry += `\n  Background: ${truncateToTokens(background, 80)}`;
        sections.push(entry);
      }
    }
  }

  // 7. Custom Classes
  const classes = readMarkdownFile(path.join(VAULT_ROOT, 'Rules & Classes', 'Custom Classes.md'));
  if (classes) {
    sections.push(`## Custom Classes\n${truncateToTokens(classes.body, 600)}`);
  }

  // 8. House Rules
  const rules = readMarkdownFile(path.join(VAULT_ROOT, 'Rules & Classes', 'House Rules.md'));
  if (rules) {
    sections.push(`## House Rules\n${truncateToTokens(rules.body, 400)}`);
  }

  // 9. Tech-Magic Items (expanded — AI needs to know what items exist for loot and encounters)
  const items = readMarkdownFile(path.join(VAULT_ROOT, 'Rules & Classes', 'Tech-Magic Items.md'));
  if (items) {
    sections.push(`## Tech-Magic Items\n${truncateToTokens(items.body, 800)}`);
  }

  // 10. Bestiary — full creature details for DM combat reference
  const bestiaryDir = path.join(VAULT_ROOT, 'Characters', 'Bestiary');
  if (existsSync(bestiaryDir)) {
    sections.push('## Bestiary');
    for (const file of findMarkdownFiles(bestiaryDir)) {
      if (path.basename(file) === 'Bestiary Index.md') continue;
      const creature = readMarkdownFile(file);
      if (creature) {
        const name = creature.frontmatter.name || path.basename(file, '.md');
        const cr = creature.frontmatter.challenge_rating || '?';
        const habitat = creature.frontmatter.habitat || '?';

        // Extract stats table values (AC, HP, Speed)
        const acMatch = creature.body.match(/AC\s*\|\s*(.+)/);
        const hpMatch = creature.body.match(/HP\s*\|\s*(.+)/);
        const speedMatch = creature.body.match(/Speed\s*\|\s*(.+)/);
        const ac = acMatch ? acMatch[1].trim() : '?';
        const hp = hpMatch ? hpMatch[1].trim() : '?';
        const speed = speedMatch ? speedMatch[1].trim() : '?';

        // Extract abilities section
        const bodySections = creature.body.split(/\n## /);
        let abilities = '';
        let behavior = '';
        let overview = '';
        for (const sec of bodySections) {
          if (sec.match(/^Stats/i)) {
            // Pull ability list items from under ### Abilities
            const abilityItems = sec.match(/- \*\*[^*]+\*\*.+/g);
            if (abilityItems) {
              abilities = abilityItems.map(a => a.replace(/^- /, '')).join('; ');
            }
          }
          if (sec.match(/^Behavior/i)) {
            behavior = sec.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ');
          }
          if (sec.match(/^Overview/i)) {
            overview = sec.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 1).join(' ');
          }
        }
        // Also check first section for overview
        if (!overview) {
          overview = bodySections[0].split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>')).slice(0, 1).join(' ');
        }

        let entry = `### ${name} (CR ${cr})\nAC: ${ac} | HP: ${hp} | Speed: ${speed} | Habitat: ${habitat}`;
        if (overview) entry += `\n${truncateToTokens(overview, 60)}`;
        if (abilities) entry += `\nAbilities: ${truncateToTokens(abilities, 150)}`;
        if (behavior) entry += `\nBehavior: ${truncateToTokens(behavior, 60)}`;
        sections.push(entry);
      }
    }
  }

  // 11. NPC Relationships — parsed from canvas
  const npcCanvas = readCanvasFile(path.join(VAULT_ROOT, 'NPC Relationships.canvas'));
  if (npcCanvas?.edges?.length) {
    const nodeNames = {};
    for (const node of npcCanvas.nodes) {
      if (node.file) {
        nodeNames[node.id] = path.basename(node.file, '.md');
      }
    }
    const rels = npcCanvas.edges
      .filter(e => nodeNames[e.fromNode] && nodeNames[e.toNode] && e.label)
      .map(e => `${nodeNames[e.fromNode]} → ${nodeNames[e.toNode]}: ${e.label}`);
    if (rels.length) {
      sections.push(`## NPC Relationships\n${rels.join('\n')}`);
    }
  }

  // 12. Faction Relationships — parsed from canvas
  const factionCanvas = readCanvasFile(path.join(VAULT_ROOT, 'Faction Relationships.canvas'));
  if (factionCanvas?.edges?.length) {
    const factionNodes = {};
    for (const node of factionCanvas.nodes) {
      if (node.file) {
        factionNodes[node.id] = path.basename(node.file, '.md');
      }
    }
    const fRels = factionCanvas.edges
      .filter(e => factionNodes[e.fromNode] && factionNodes[e.toNode] && e.label)
      .map(e => `${factionNodes[e.fromNode]} ↔ ${factionNodes[e.toNode]}: ${e.label}`);
    if (fRels.length) {
      sections.push(`## Faction Relationships\n${fRels.join('\n')}`);
    }
  }

  // 13. Main Campaign — The Glitch Plague overview
  const campaign = readMarkdownFile(path.join(VAULT_ROOT, 'Adventures', 'Campaign Hooks', 'The Glitch Plague.md'));
  if (campaign) {
    sections.push(`## Main Campaign: The Glitch Plague\n${truncateToTokens(campaign.body, 600)}`);
  }

  // 14. Other Campaign Hooks — brief summaries
  const hooksDir = path.join(VAULT_ROOT, 'Adventures', 'Campaign Hooks');
  if (existsSync(hooksDir)) {
    for (const file of findMarkdownFiles(hooksDir)) {
      if (path.basename(file) === 'The Glitch Plague.md') continue;
      const hook = readMarkdownFile(file);
      if (hook) {
        const name = hook.frontmatter.name || path.basename(file, '.md');
        const summary = hook.body.split(/\n## /)[0];
        sections.push(`### Campaign Hook: ${name}\n${truncateToTokens(summary, 150)}`);
      }
    }
  }

  // 15. Random Encounter Tables — so the AI DM can roll encounters
  const encounters = readMarkdownFile(path.join(VAULT_ROOT, 'Rules & Classes', 'Random Tables', 'Random Encounters.md'));
  if (encounters) {
    sections.push(`## Random Encounter Tables\n${truncateToTokens(encounters.body, 800)}`);
  }

  // 16. Random Loot Tables — so the AI DM can give appropriate loot
  const loot = readMarkdownFile(path.join(VAULT_ROOT, 'Rules & Classes', 'Random Tables', 'Random Loot.md'));
  if (loot) {
    sections.push(`## Random Loot Tables\n${truncateToTokens(loot.body, 800)}`);
  }

  return sections.join('\n\n');
}

// Load a specific NPC's full details (for when the DM needs deep context)
export function loadNpcDetail(npcName) {
  const npcDirs = ['Allies', 'Villains', 'Neutral'];
  for (const sub of npcDirs) {
    const dir = path.join(VAULT_ROOT, 'Characters', 'NPCs', sub);
    if (!existsSync(dir)) continue;
    for (const file of findMarkdownFiles(dir)) {
      const basename = path.basename(file, '.md');
      if (basename.toLowerCase().includes(npcName.toLowerCase())) {
        const npc = readMarkdownFile(file);
        if (npc) return { ...npc.frontmatter, fullText: npc.body };
      }
    }
  }
  return null;
}

// Load a specific location's full details
export function loadLocationDetail(locationName) {
  const worldDir = path.join(VAULT_ROOT, 'World');
  for (const file of findMarkdownFiles(worldDir)) {
    const basename = path.basename(file, '.md');
    if (basename.toLowerCase().includes(locationName.toLowerCase())) {
      const loc = readMarkdownFile(file);
      if (loc) return { ...loc.frontmatter, fullText: loc.body };
    }
  }
  return null;
}
