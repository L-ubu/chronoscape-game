# Chronoscape — AI-Powered D&D Game Engine

A multiplayer D&D 5e game engine with an AI Dungeon Master, built for the **Chronoscape: The World of Aethermere** campaign setting — a cyberpunk-fantasy world where draconic magic meets bleeding-edge technology.

## Features

- **AI Dungeon Master** — Streams narrative responses with mechanical tags that automatically update game state (damage, healing, loot, conditions, combat, XP)
- **Multiplayer** — Real-time sessions via Socket.IO, multiple players can join and play together
- **Two clients** — Web UI (browser) and terminal CLI
- **Character creation** — AI-guided conversational flow or manual 5-step creation with live class previews
- **Obsidian vault integration** — Reads your campaign vault (NPCs, bestiary, factions, locations, items, relationships, random tables) and feeds ~14k tokens of world context to the AI DM
- **Full D&D mechanics** — Dice rolling, combat tracker with initiative, inventory, rest mechanics, leveling, lookup commands

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and add your API key
cp .env.example .env

# Start the server
npm start

# Open the web client
open http://localhost:3000

# Or use the terminal client
npm run client
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BONZAI_API_KEY` | API key for the LLM proxy |
| `BONZAI_BASE_URL` | Base URL for the OpenAI-compatible API |
| `BONZAI_MODEL` | Model to use (e.g. `gemini-2.5-flash`, `claude-sonnet-4-6`) |

## Commands

| Command | Description |
|---------|-------------|
| `/roll XdY` | Roll dice (supports advantage, disadvantage, modifiers) |
| `/sheet` | View your character sheet |
| `/inventory` | View inventory |
| `/inventory add/drop <item>` | Manage items |
| `/rest short/long` | Take a rest |
| `/combat` | View combat state |
| `/map` | Show the world map |
| `/lookup npc/location/faction <name>` | Look up vault lore |
| `/status` | View party status |
| `/help` | List all commands |

Anything typed without a `/` prefix is sent to the AI DM as a player action.

## Project Structure

```
server.js              — Express + Socket.IO game server
lib/
  ai-dm.js             — AI DM with streaming + mechanical tag parsing
  ai-character-creator.js — AI-guided character creation
  game-state.js         — Player sessions, character persistence
  world-loader.js       — Reads Obsidian vault into AI context
  combat.js             — Initiative tracker, turn order, HP
  class-data.js         — Custom classes, races, regions, gear
  class-progression.js  — Level-up abilities, spells, progression
  dice.js               — Dice roller with advantage/disadvantage
  items.js              — Item definitions
  dnd-api.js            — D&D 5e SRD API client
  world-map.js          — ASCII world map
web/                    — Browser client (HTML/CSS/JS)
client/                 — Terminal CLI client
test-integration.js     — Integration test suite
```

## Vault Integration

The game server reads markdown files from the parent Obsidian vault to build world context for the AI DM. It loads:

- World overview, continents, planes, timeline
- All 24 NPCs with personality and background
- All 12 bestiary creatures with full stats (AC, HP, CR, abilities)
- 6 factions with leaders and descriptions
- NPC and faction relationship graphs (from `.canvas` files)
- Campaign hooks (The Glitch Plague main arc + side hooks)
- Tech-magic items, house rules, custom classes
- Random encounter and loot tables (per continent)

The vault is expected at `../../` relative to the game directory.
