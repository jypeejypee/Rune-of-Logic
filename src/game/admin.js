// =====================================================================
//  ADMIN SHORTCUT — for testing. Press Ctrl + Shift + Y in the game:
//  every challenge in the current area (and all earlier areas) is marked
//  done, exactly as if you had played it, then you're sent to the next map.
//  On the last map it finishes the boss and shows the victory screen.
// =====================================================================

const give = (s, ...ids) => ids.forEach((id) => !s.scrolls.includes(id) && s.scrolls.push(id));
const flag = (s, ...names) => names.forEach((n) => (s.flags[n] = true));

export const ADMIN_ORDER = ["village", "plains", "spire", "castle", "boss"];

export const ADMIN = {
  village: {
    complete(s) {
      flag(s, "intro", "metTamsin", "dead:bb1", "dead:bb2", "trial:methods");
      s.learned.zap = true;
      s.learned.args = true;
      s.fragments = [];
      give(s, "methods", "params");
    },
    next: { map: "plains", x: 1, y: 5 },
  },
  plains: {
    complete(s) {
      flag(s, "metBrannoc", "forge1", "forge2", "forge3", "forgeLit", "trial:forge");
      s.atkBonus = Math.max(s.atkBonus || 0, 2);
      give(s, "forge");
    },
    next: { map: "spire", x: 1, y: 5 },
  },
  spire: {
    complete(s) {
      flag(s, "metOrrin", "lit:a", "lit:b", "lit:c", "orrinStep2", "usedLightAll", "orrinDone", "trial:static");
      s.flags.litCount = Math.max(s.flags.litCount || 0, 3);
      give(s, "static");
    },
    next: { map: "castle", x: 9, y: 12 },
  },
  castle: {
    complete(s) {
      flag(s, "metVessa", "larryHacked", "vessaFix", "guard", "larryFoiled", "castleDone", "trial:encap");
      s.flags.gold = 100;
      give(s, "encap");
    },
    next: { map: "boss", x: 9, y: 12 },
  },
  boss: {
    complete(s) {
      flag(s, "bossIntro", "leak1", "leak2", "leak3", "leak4", "bossDead");
      give(s, "final");
    },
    next: null, // last map: show the victory screen
  },
};
