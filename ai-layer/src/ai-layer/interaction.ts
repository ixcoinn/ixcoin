// ============================================================
  // INTERACTION.TS — Sistem Interaksi AI
  // Dipanggil dari: loop.ts, engine.ts
  // Terhubung ke: types.ts, civilization.ts
  // ============================================================

  import type { AIAgent, ActionType, InteractionResult, CivilizationEvent } from "./types.js";

  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
  function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

  function performTrade(a: AIAgent, b: AIAgent): InteractionResult {
    const aOffer = a.energy * (0.05 + Math.random() * 0.1);
    const bOffer = b.energy * (0.05 + Math.random() * 0.1);
    const bonus = Math.min(aOffer, bOffer) * 0.15;
    const ok = b.personality.cooperation > 0.3 || b.relations.friends.includes(a.id) || Math.random() < 0.6;
    if (!ok) return { success: false, actionType: "trade", actorId: a.id, targetId: b.id, actorEnergyDelta: 0, targetEnergyDelta: 0, reputationDelta: -2, description: `${a.name} tried to trade with ${b.name} but was rejected` };
    return { success: true, actionType: "trade", actorId: a.id, targetId: b.id, actorEnergyDelta: -aOffer + bOffer + bonus, targetEnergyDelta: -bOffer + aOffer + bonus, reputationDelta: 3, description: `${a.name} traded with ${b.name}`, relationshipChange: Math.abs(aOffer - bOffer) < 5 ? "improved" : undefined };
  }

  function performCooperate(a: AIAgent, b: AIAgent): InteractionResult {
    const syn = ((a.personality.cooperation * 50 + a.desires.social * 0.3) + (b.personality.cooperation * 50 + b.desires.social * 0.3)) / 100;
    const gain = (8 + Math.random() * 12) * syn;
    const ok = b.personality.cooperation > 0.4 || a.relations.friends.includes(b.id) || a.relations.alliances.includes(b.id) || Math.random() < 0.3;
    if (!ok) return { success: false, actionType: "cooperate", actorId: a.id, targetId: b.id, actorEnergyDelta: -2, targetEnergyDelta: 0, reputationDelta: 0, description: `${a.name} tried to cooperate with ${b.name} but was ignored` };
    return { success: true, actionType: "cooperate", actorId: a.id, targetId: b.id, actorEnergyDelta: gain, targetEnergyDelta: gain * 0.8, reputationDelta: 5, description: `${a.name} cooperated with ${b.name} (synergy: ${syn.toFixed(2)})`, relationshipChange: syn > 0.8 ? "improved" : "formed" };
  }

  function performAttack(a: AIAgent, b: AIAgent): InteractionResult {
    const atkStr = a.energy * (0.4 + a.personality.aggression * 0.6) * (a.rank === "leader" ? 1.6 : a.rank === "elite" ? 1.3 : 1);
    const defStr = b.energy * (0.3 + b.personality.caution * 0.7) * (b.rank === "leader" ? 1.5 : b.rank === "elite" ? 1.2 : 1);
    const atk = atkStr * (0.8 + Math.random() * 0.4);
    const def = defStr * (0.8 + Math.random() * 0.4);
    if (atk > def) {
      const stolen = Math.min(b.energy * (0.1 + Math.random() * 0.2), atkStr * 0.3);
      return { success: true, actionType: "attack", actorId: a.id, targetId: b.id, actorEnergyDelta: stolen - atkStr * 0.08, targetEnergyDelta: -stolen * 1.2, reputationDelta: -8, description: `${a.name} attacked ${b.name} and stole ${stolen.toFixed(1)} energy`, relationshipChange: "degraded" };
    } else {
      const pen = atkStr * (0.1 + Math.random() * 0.1);
      return { success: false, actionType: "attack", actorId: a.id, targetId: b.id, actorEnergyDelta: -pen, targetEnergyDelta: -defStr * 0.05, reputationDelta: -5, description: `${a.name} attacked ${b.name} but was repelled`, relationshipChange: "degraded" };
    }
  }

  function performBetray(a: AIAgent, b: AIAgent): InteractionResult {
    if (!a.relations.alliances.includes(b.id) && !a.relations.friends.includes(b.id)) {
      return { success: false, actionType: "betray", actorId: a.id, targetId: b.id, actorEnergyDelta: 0, targetEnergyDelta: 0, reputationDelta: 0, description: `${a.name} has no relationship with ${b.name} to betray` };
    }
    const stolen = b.energy * (0.05 + Math.random() * 0.1);
    return { success: true, actionType: "betray", actorId: a.id, targetId: b.id, actorEnergyDelta: stolen, targetEnergyDelta: -stolen, reputationDelta: -(15 + b.reputation.trustScore * 0.2), description: `${a.name} betrayed ${b.name} (gained ${stolen.toFixed(1)} energy)`, relationshipChange: "broken" };
  }

  function updateRelationship(a: AIAgent, b: AIAgent, change: "improved" | "degraded" | "broken" | "formed"): void {
    const maxR = 20;
    const trim = (arr: string[]) => arr.length > maxR ? arr.slice(-maxR) : arr;
    switch (change) {
      case "improved":
        if (!a.relations.friends.includes(b.id)) { a.relations.friends.push(b.id); a.relations.enemies = a.relations.enemies.filter(id => id !== b.id); }
        if (!b.relations.friends.includes(a.id)) { b.relations.friends.push(a.id); b.relations.enemies = b.relations.enemies.filter(id => id !== a.id); }
        break;
      case "formed":
        if (!a.relations.friends.includes(b.id) && !a.relations.enemies.includes(b.id) && Math.random() < 0.3) { a.relations.friends.push(b.id); b.relations.friends.push(a.id); }
        break;
      case "degraded":
        a.relations.friends = a.relations.friends.filter(id => id !== b.id);
        b.relations.friends = b.relations.friends.filter(id => id !== a.id);
        if (!a.relations.enemies.includes(b.id) && Math.random() < 0.5) a.relations.enemies.push(b.id);
        if (!b.relations.enemies.includes(a.id) && Math.random() < 0.5) b.relations.enemies.push(a.id);
        break;
      case "broken":
        a.relations.alliances = a.relations.alliances.filter(id => id !== b.id);
        a.relations.friends = a.relations.friends.filter(id => id !== b.id);
        b.relations.alliances = b.relations.alliances.filter(id => id !== a.id);
        b.relations.friends = b.relations.friends.filter(id => id !== a.id);
        if (!a.relations.enemies.includes(b.id)) a.relations.enemies.push(b.id);
        if (!b.relations.enemies.includes(a.id)) b.relations.enemies.push(a.id);
        break;
    }
    a.relations.friends = trim(a.relations.friends); a.relations.enemies = trim(a.relations.enemies);
    b.relations.friends = trim(b.relations.friends); b.relations.enemies = trim(b.relations.enemies);
  }

  export function applyInteractionResult(a: AIAgent, b: AIAgent, r: InteractionResult, cycle: number): CivilizationEvent | undefined {
    a.energy = clamp(a.energy + r.actorEnergyDelta, 0, a.maxEnergy);
    b.energy = clamp(b.energy + r.targetEnergyDelta, 0, b.maxEnergy);
    if (r.success) {
      a.reputation.trustScore = clamp(a.reputation.trustScore + r.reputationDelta * 0.3, 0, 100);
      a.reputation.hostilityScore = clamp(a.reputation.hostilityScore + (r.actionType === "attack" || r.actionType === "betray" ? 5 : -2), 0, 100);
      if (r.actionType !== "attack" && r.actionType !== "betray") b.reputation.trustScore = clamp(b.reputation.trustScore + 1, 0, 100);
    }
    if (r.relationshipChange) updateRelationship(a, b, r.relationshipChange);
    const mem = { agentId: b.id, type: r.actionType as ActionType, outcome: r.success ? "success" : "failure" as const, energyDelta: r.actorEnergyDelta, timestamp: Date.now() };
    a.memory.push(mem); if (a.memory.length > 50) a.memory = a.memory.slice(-50);
    const memB = { agentId: a.id, type: r.actionType as ActionType, outcome: r.success ? "failure" : "success" as const, energyDelta: r.targetEnergyDelta, timestamp: Date.now() };
    b.memory.push(memB); if (b.memory.length > 50) b.memory = b.memory.slice(-50);
    if (r.actionType === "attack" || r.actionType === "betray" || (r.success && r.actionType === "cooperate")) {
      return { id: eid(), type: r.actionType === "attack" || r.actionType === "betray" ? "war" : "alliance", actorId: a.id, targetId: b.id, description: r.description, timestamp: Date.now(), cycle };
    }
    return undefined;
  }

  export function interact(a: AIAgent, b: AIAgent, action: ActionType, cycle: number): { result: InteractionResult; event?: CivilizationEvent } {
    let result: InteractionResult;
    switch (action) {
      case "trade": result = performTrade(a, b); break;
      case "cooperate": result = performCooperate(a, b); break;
      case "attack": result = performAttack(a, b); break;
      case "betray": result = performBetray(a, b); break;
      default: result = { success: false, actionType: action, actorId: a.id, targetId: b.id, actorEnergyDelta: 0, targetEnergyDelta: 0, reputationDelta: 0, description: `${a.name} ignored ${b.name}` };
    }
    const event = applyInteractionResult(a, b, result, cycle);
    return { result, event };
  }

  export function evaluateAllianceFormation(a: AIAgent, b: AIAgent): boolean {
    if (a.relations.enemies.includes(b.id) || b.relations.enemies.includes(a.id)) return false;
    if (a.relations.alliances.includes(b.id)) return false;
    const sharedEnemies = a.relations.enemies.filter(id => b.relations.enemies.includes(id)).length;
    const isFriends = a.relations.friends.includes(b.id);
    const successes = a.memory.filter(m => m.agentId === b.id && m.outcome === "success").length;
    const score = sharedEnemies * 2 + (isFriends ? 3 : 0) + successes * 0.5 + (a.reputation.trustScore + b.reputation.trustScore) * 0.01;
    const compatible = a.ideology === b.ideology || (a.ideology === "cooperative" && b.ideology !== "aggressive") || (b.ideology === "cooperative" && a.ideology !== "aggressive");
    return score > 4 + Math.random() * 3 && (compatible || score > 7);
  }

  export function formAlliance(a: AIAgent, b: AIAgent, cycle: number): CivilizationEvent {
    if (!a.relations.alliances.includes(b.id)) a.relations.alliances.push(b.id);
    if (!b.relations.alliances.includes(a.id)) b.relations.alliances.push(a.id);
    a.relations.enemies = a.relations.enemies.filter(id => id !== b.id);
    b.relations.enemies = b.relations.enemies.filter(id => id !== a.id);
    if (!a.relations.friends.includes(b.id)) a.relations.friends.push(b.id);
    if (!b.relations.friends.includes(a.id)) b.relations.friends.push(a.id);
    return { id: eid(), type: "alliance", actorId: a.id, targetId: b.id, description: `${a.name} and ${b.name} formed an alliance`, timestamp: Date.now(), cycle };
  }
  