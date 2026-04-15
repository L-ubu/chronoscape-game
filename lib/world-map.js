// World map data for Chronoscape: Aethermere
// Each location has coordinates on a grid, connections to other locations, and flavor.

export const REGIONS = {
  luminara: {
    name: 'Luminara',
    desc: 'The neon megacity continent. Arcane circuits and holographic billboards light every street.',
    locations: {
      'Prisma City': {
        r: 5, c: 20, icon: '#',
        desc: 'Capital of Luminara. A vertical city of neon spires, data-markets, and underground fight clubs.',
        connects: ['The Undernet', 'Neon District', 'Axiom Corp Tower', 'Outskirts Gate'],
      },
      'Neon District': {
        r: 3, c: 24, icon: '*',
        desc: 'The beating heart of nightlife. Noodle shops, black-market implant dealers, and assassin gig boards.',
        connects: ['Prisma City', 'Syndicate HQ'],
      },
      'The Undernet': {
        r: 8, c: 18, icon: '~',
        desc: 'A labyrinth of data-tunnels beneath the city. Code-ghosts flicker in the dark. Hackers thrive here.',
        connects: ['Prisma City', 'Glitch Collective Den'],
      },
      'Axiom Corp Tower': {
        r: 4, c: 16, icon: 'A',
        desc: 'The gleaming corporate spire. Research labs, executive suites, and secrets best left undiscovered.',
        connects: ['Prisma City'],
      },
      'Syndicate HQ': {
        r: 2, c: 28, icon: 'S',
        desc: 'The Neon Syndicate\'s hidden base. Assassination contracts and smuggling operations.',
        connects: ['Neon District'],
      },
      'Glitch Collective Den': {
        r: 10, c: 16, icon: 'G',
        desc: 'Where digital anarchists gather. Walls covered in living graffiti that rewrites itself.',
        connects: ['The Undernet'],
      },
      'Outskirts Gate': {
        r: 7, c: 10, icon: '=',
        desc: 'The border between Luminara\'s urban sprawl and the wilds beyond.',
        connects: ['Prisma City', 'Dragon\'s Pass'],
      },
    },
  },
  wyrmholt: {
    name: 'Wyrmholt',
    desc: 'Ancient forests under dragon protection. Tech is rare; magic runs deep in the roots.',
    locations: {
      'Thornspire': {
        r: 5, c: 20, icon: '#',
        desc: 'Capital of Wyrmholt. A city grown from living trees, overseen by the Wyrmcouncil.',
        connects: ['Ember Peaks', 'The Rootways', 'Dragon Roost'],
      },
      'Ember Peaks': {
        r: 2, c: 16, icon: '^',
        desc: 'Volcanic mountains where elder dragons nest. The air shimmers with heat and magic.',
        connects: ['Thornspire', 'Dragon Roost'],
      },
      'Dragon Roost': {
        r: 3, c: 25, icon: 'D',
        desc: 'A sacred peak where young dragons are bonded to their riders.',
        connects: ['Thornspire', 'Ember Peaks'],
      },
      'The Rootways': {
        r: 8, c: 20, icon: '~',
        desc: 'Underground tunnels woven from ancient tree roots. The Rootbound guard these passages.',
        connects: ['Thornspire'],
      },
    },
  },
  shardlands: {
    name: 'The Shardlands',
    desc: 'Floating crystalline islands in a sea of wild magic. Reality is... flexible here.',
    locations: {
      'Driftstone Keep': {
        r: 5, c: 20, icon: '#',
        desc: 'Capital of The Shardlands. A fortress built on the largest floating island.',
        connects: ['Crystal Wastes', 'The Rift', 'Sky Docks'],
      },
      'Crystal Wastes': {
        r: 3, c: 14, icon: '*',
        desc: 'A desert of shattered crystals. Wild magic surges make travel dangerous and unpredictable.',
        connects: ['Driftstone Keep'],
      },
      'The Rift': {
        r: 8, c: 22, icon: '!',
        desc: 'A tear in reality itself. Things fall in and don\'t come back the same.',
        connects: ['Driftstone Keep'],
      },
      'Sky Docks': {
        r: 4, c: 26, icon: '=',
        desc: 'Airship port connecting The Shardlands to the rest of Aethermere.',
        connects: ['Driftstone Keep'],
      },
    },
  },
  ferromar: {
    name: 'Ferromar',
    desc: 'Industrial steampunk coast. Factories, shipyards, and the Iron Tide\'s war machines.',
    locations: {
      'Ironhaven': {
        r: 5, c: 20, icon: '#',
        desc: 'Capital of Ferromar. A port city of smokestacks, gear-works, and naval power.',
        connects: ['The Foundry', 'Rustwater Docks', 'Iron Tide Barracks'],
      },
      'The Foundry': {
        r: 3, c: 15, icon: 'F',
        desc: 'Massive industrial complex. Weapons, armor, and war machines are forged here day and night.',
        connects: ['Ironhaven'],
      },
      'Rustwater Docks': {
        r: 7, c: 24, icon: '~',
        desc: 'The seedy port district. Smugglers, pirates, and black-market tech dealers.',
        connects: ['Ironhaven'],
      },
      'Iron Tide Barracks': {
        r: 3, c: 25, icon: 'T',
        desc: 'Military headquarters of the Iron Tide faction. Rows of war machines stand ready.',
        connects: ['Ironhaven'],
      },
    },
  },
  // Cross-region
  'dragons_pass': {
    name: 'Dragon\'s Pass',
    desc: 'The treacherous mountain route connecting Luminara to Wyrmholt.',
    locations: {
      'Dragon\'s Pass': {
        r: 5, c: 20, icon: '^',
        desc: 'A narrow mountain pass guarded by territorial drakes. The only land route between Luminara and Wyrmholt.',
        connects: ['Outskirts Gate', 'Thornspire'],
      },
    },
  },
};

// Find which region a location belongs to
export function findLocation(locationName) {
  const lower = locationName.toLowerCase();
  for (const [regionKey, region] of Object.entries(REGIONS)) {
    for (const [locName, locData] of Object.entries(region.locations)) {
      if (locName.toLowerCase() === lower) {
        return { region: region.name, regionKey, location: locName, ...locData };
      }
    }
  }
  return null;
}

// Get current region's locations for map rendering
export function getRegionMap(locationName) {
  const lower = locationName.toLowerCase();
  for (const [regionKey, region] of Object.entries(REGIONS)) {
    for (const locName of Object.keys(region.locations)) {
      if (locName.toLowerCase() === lower) {
        return { region: region.name, regionKey, locations: region.locations, currentLocation: locName, desc: region.desc };
      }
    }
  }
  // Default to Luminara
  return {
    region: 'Luminara',
    regionKey: 'luminara',
    locations: REGIONS.luminara.locations,
    currentLocation: locationName,
    desc: REGIONS.luminara.desc,
  };
}

// Render ASCII map for terminal
export function renderAsciiMap(locationName) {
  const mapData = getRegionMap(locationName);
  const WIDTH = 40;
  const HEIGHT = 12;

  // Build empty grid
  const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(' '));

  // Place locations
  const locs = Object.entries(mapData.locations);
  for (const [name, loc] of locs) {
    const r = Math.min(HEIGHT - 1, Math.max(0, loc.r));
    const c = Math.min(WIDTH - 2, Math.max(0, loc.c));
    grid[r][c] = loc.icon;

    // Draw connections as dots
    for (const conn of loc.connects || []) {
      const target = mapData.locations[conn];
      if (!target) continue;
      const tr = Math.min(HEIGHT - 1, Math.max(0, target.r));
      const tc = Math.min(WIDTH - 2, Math.max(0, target.c));
      // Simple line drawing
      const dr = Math.sign(tr - r);
      const dc = Math.sign(tc - c);
      let cr = r + dr, cc = c + dc;
      let steps = 0;
      while ((cr !== tr || cc !== tc) && steps < 30) {
        if (cr >= 0 && cr < HEIGHT && cc >= 0 && cc < WIDTH && grid[cr][cc] === ' ') {
          grid[cr][cc] = '·';
        }
        if (cr !== tr) cr += dr;
        if (cc !== tc) cc += dc;
        steps++;
      }
    }
  }

  // Build legend
  const legend = locs.map(([name, loc]) => {
    const marker = name === mapData.currentLocation ? '>>>' : '   ';
    return `${marker} ${loc.icon} ${name}`;
  });

  return {
    region: mapData.region,
    regionDesc: mapData.desc,
    currentLocation: mapData.currentLocation,
    grid: grid.map(row => row.join('')),
    legend,
    locations: mapData.locations,
  };
}
