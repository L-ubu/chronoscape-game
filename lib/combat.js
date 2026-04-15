import { rollDie, rollInitiative, parseDiceNotation } from './dice.js';

export class Combat {
  constructor() {
    this.combatants = [];   // { name, initiative, hp, maxHp, ac, stats, isPlayer, conditions, socketId }
    this.turnIndex = 0;
    this.round = 1;
    this.active = false;
  }

  // Start combat with players and enemies
  start(players, enemies) {
    this.combatants = [];
    this.turnIndex = 0;
    this.round = 1;
    this.active = true;

    // Roll initiative for players
    for (const player of players) {
      if (!player.character) continue;
      const c = player.character;
      const dexMod = Math.floor(((c.stats?.dex || 10) - 10) / 2);
      const init = rollInitiative(dexMod);
      this.combatants.push({
        name: c.name,
        initiative: init.total,
        initiativeRoll: init.roll,
        hp: c.hp,
        maxHp: c.maxHp,
        ac: c.ac,
        stats: c.stats,
        isPlayer: true,
        conditions: [...(c.conditions || [])],
        socketId: player.id,
        character: c,
      });
    }

    // Roll initiative for enemies
    for (const enemy of enemies) {
      const dexMod = Math.floor(((enemy.stats?.dex || 10) - 10) / 2);
      const init = rollInitiative(dexMod);
      this.combatants.push({
        name: enemy.name,
        initiative: init.total,
        initiativeRoll: init.roll,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        ac: enemy.ac,
        stats: enemy.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        isPlayer: false,
        conditions: [],
        socketId: null,
        character: null,
      });
    }

    // Sort by initiative (highest first, break ties by DEX)
    this.combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      const aDex = a.stats?.dex || 10;
      const bDex = b.stats?.dex || 10;
      return bDex - aDex;
    });

    return {
      text: `Combat begins! Round 1.`,
      initiativeOrder: this.combatants.map((c, i) => ({
        position: i + 1,
        name: c.name,
        initiative: c.initiative,
        isPlayer: c.isPlayer,
      })),
      currentTurn: this.combatants[0]?.name,
    };
  }

  getCurrentTurn() {
    return this.combatants[this.turnIndex] || null;
  }

  nextTurn() {
    this.turnIndex++;
    if (this.turnIndex >= this.combatants.length) {
      this.turnIndex = 0;
      this.round++;
    }

    // Skip dead combatants
    let safety = 0;
    while (this.combatants[this.turnIndex]?.hp <= 0 && safety < this.combatants.length) {
      this.turnIndex++;
      if (this.turnIndex >= this.combatants.length) {
        this.turnIndex = 0;
        this.round++;
      }
      safety++;
    }

    const current = this.getCurrentTurn();
    return {
      text: `Round ${this.round} — ${current?.name}'s turn.`,
      currentTurn: current?.name,
      round: this.round,
      isPlayer: current?.isPlayer,
      socketId: current?.socketId,
    };
  }

  // Resolve an attack: attacker character attacks target by name
  resolveAttack(attackerChar, targetName) {
    const attacker = this.combatants.find(c => c.name.toLowerCase() === attackerChar.name.toLowerCase());
    const target = this.findCombatant(targetName);
    if (!attacker || !target) {
      return { text: `Could not find target "${targetName}".`, success: false };
    }

    // Roll to hit
    const strMod = Math.floor(((attacker.stats?.str || 10) - 10) / 2);
    const dexMod = Math.floor(((attacker.stats?.dex || 10) - 10) / 2);
    // Use higher of STR/DEX for attack (simplified)
    const attackMod = Math.max(strMod, dexMod) + (attacker.character?.proficiencyBonus || 2);
    const attackRoll = rollDie(20);
    const totalAttack = attackRoll + attackMod;

    const isNat20 = attackRoll === 20;
    const isNat1 = attackRoll === 1;
    const hits = isNat20 || (!isNat1 && totalAttack >= target.ac);

    if (!hits) {
      return {
        text: `${attacker.name} attacks ${target.name}: rolled ${attackRoll}+${attackMod}=${totalAttack} vs AC ${target.ac} — MISS!`,
        attacker: attacker.name,
        target: target.name,
        attackRoll,
        totalAttack,
        targetAc: target.ac,
        hit: false,
        critical: isNat1,
        success: true,
      };
    }

    // Roll damage (default 1d8 + STR/DEX mod)
    const damageDie = rollDie(8);
    const damageMod = Math.max(strMod, dexMod);
    let totalDamage = damageDie + damageMod;
    if (isNat20) totalDamage += rollDie(8); // crit extra die

    this.applyDamage(target.name, totalDamage);

    return {
      text: `${attacker.name} attacks ${target.name}: rolled ${attackRoll}+${attackMod}=${totalAttack} vs AC ${target.ac} — ${isNat20 ? 'CRITICAL ' : ''}HIT for ${totalDamage} damage!${target.hp <= 0 ? ` ${target.name} is DOWN!` : ''}`,
      attacker: attacker.name,
      target: target.name,
      attackRoll,
      totalAttack,
      targetAc: target.ac,
      hit: true,
      critical: isNat20,
      damage: totalDamage,
      targetHp: target.hp,
      targetMaxHp: target.maxHp,
      targetDown: target.hp <= 0,
      success: true,
    };
  }

  // Resolve a spell cast
  resolveSpell(casterChar, spellArgs) {
    const caster = this.combatants.find(c => c.name.toLowerCase() === casterChar.name.toLowerCase());
    if (!caster) return { text: 'Caster not found in combat.', success: false };

    // Parse: "Fireball Glitchborn" or "Healing Word Kael"
    const parts = spellArgs.trim().split(/\s+/);
    const spellName = parts.slice(0, -1).join(' ') || parts[0];
    const targetName = parts[parts.length - 1];
    const target = this.findCombatant(targetName);

    // Generic spell resolution — roll d20 + spellcasting mod
    const intMod = Math.floor(((caster.stats?.int || 10) - 10) / 2);
    const wisMod = Math.floor(((caster.stats?.wis || 10) - 10) / 2);
    const chaMod = Math.floor(((caster.stats?.cha || 10) - 10) / 2);
    const castMod = Math.max(intMod, wisMod, chaMod) + (caster.character?.proficiencyBonus || 2);

    // Spell attack roll
    const spellRoll = rollDie(20);
    const totalSpell = spellRoll + castMod;

    if (target) {
      const hits = spellRoll === 20 || (spellRoll !== 1 && totalSpell >= target.ac);
      if (!hits) {
        return {
          text: `${caster.name} casts ${spellName} at ${target.name}: rolled ${spellRoll}+${castMod}=${totalSpell} vs AC ${target.ac} — MISS!`,
          success: true, hit: false,
        };
      }

      const damage = rollDie(8) + rollDie(8); // generic 2d8 spell damage
      this.applyDamage(target.name, damage);

      return {
        text: `${caster.name} casts ${spellName} at ${target.name}: rolled ${spellRoll}+${castMod}=${totalSpell} — HIT for ${damage} damage!${target.hp <= 0 ? ` ${target.name} is DOWN!` : ''}`,
        spell: spellName,
        caster: caster.name,
        target: target.name,
        hit: true,
        damage,
        success: true,
      };
    }

    return {
      text: `${caster.name} casts ${spellName}. (Target "${targetName}" not found in combat — DM will resolve.)`,
      spell: spellName,
      caster: caster.name,
      success: true,
    };
  }

  applyDamage(targetName, amount) {
    const target = this.findCombatant(targetName);
    if (!target) return;
    target.hp = Math.max(0, target.hp - amount);

    // Sync back to player character if applicable
    if (target.isPlayer && target.character) {
      target.character.hp = target.hp;
    }
  }

  applyHealing(targetName, amount) {
    const target = this.findCombatant(targetName);
    if (!target) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);

    if (target.isPlayer && target.character) {
      target.character.hp = target.hp;
    }
  }

  applyCondition(targetName, condition) {
    const target = this.findCombatant(targetName);
    if (!target) return;
    if (!target.conditions.includes(condition)) {
      target.conditions.push(condition);
    }
    if (target.isPlayer && target.character) {
      target.character.conditions = [...target.conditions];
    }
  }

  removeCondition(targetName, condition) {
    const target = this.findCombatant(targetName);
    if (!target) return;
    target.conditions = target.conditions.filter(c => c !== condition);
    if (target.isPlayer && target.character) {
      target.character.conditions = [...target.conditions];
    }
  }

  deathSave(playerName) {
    const combatant = this.combatants.find(c => c.isPlayer && c.name.toLowerCase() === playerName.toLowerCase());
    if (!combatant || combatant.hp > 0) return { text: 'Not making death saves.', success: false };

    const roll = rollDie(20);
    const ds = combatant.character?.deathSaves || { successes: 0, failures: 0 };

    if (roll === 20) {
      // Nat 20: regain 1 HP
      combatant.hp = 1;
      combatant.character.hp = 1;
      ds.successes = 0;
      ds.failures = 0;
      return { text: `${combatant.name} rolls a NAT 20 death save! They regain 1 HP and are conscious!`, roll, critical: true, alive: true, success: true };
    }
    if (roll === 1) {
      // Nat 1: 2 failures
      ds.failures += 2;
    } else if (roll >= 10) {
      ds.successes++;
    } else {
      ds.failures++;
    }

    if (combatant.character) combatant.character.deathSaves = ds;

    if (ds.successes >= 3) {
      ds.successes = 0;
      ds.failures = 0;
      return { text: `${combatant.name} rolls ${roll} — death save SUCCESS (3/3)! They are stable.`, roll, stable: true, success: true };
    }
    if (ds.failures >= 3) {
      return { text: `${combatant.name} rolls ${roll} — death save FAILURE (3/3). ${combatant.name} has DIED.`, roll, dead: true, success: true };
    }

    return {
      text: `${combatant.name} rolls ${roll} — ${roll >= 10 ? 'success' : 'failure'} (${ds.successes}/3 successes, ${ds.failures}/3 failures)`,
      roll,
      successes: ds.successes,
      failures: ds.failures,
      success: true,
    };
  }

  end() {
    this.active = false;
    // Sync final HP back to all player characters
    for (const c of this.combatants) {
      if (c.isPlayer && c.character) {
        c.character.hp = c.hp;
        c.character.conditions = [...c.conditions];
      }
    }
    return { text: 'Combat has ended.', survivors: this.combatants.filter(c => c.hp > 0).map(c => c.name) };
  }

  findCombatant(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    return this.combatants.find(c => c.name.toLowerCase() === lower)
      || this.combatants.find(c => c.name.toLowerCase().includes(lower));
  }

  getState() {
    return {
      round: this.round,
      turnIndex: this.turnIndex,
      currentTurn: this.combatants[this.turnIndex]?.name,
      combatants: this.combatants.map(c => ({
        name: c.name,
        initiative: c.initiative,
        hp: c.isPlayer ? c.hp : undefined, // hide enemy HP from players
        maxHp: c.isPlayer ? c.maxHp : undefined,
        ac: c.isPlayer ? c.ac : undefined,
        conditions: c.conditions,
        isPlayer: c.isPlayer,
        down: c.hp <= 0,
      })),
    };
  }

  // Get full state (for DM/server use)
  getFullState() {
    return {
      round: this.round,
      turnIndex: this.turnIndex,
      combatants: this.combatants.map(c => ({
        name: c.name,
        initiative: c.initiative,
        hp: c.hp,
        maxHp: c.maxHp,
        ac: c.ac,
        conditions: c.conditions,
        isPlayer: c.isPlayer,
        down: c.hp <= 0,
      })),
    };
  }
}
