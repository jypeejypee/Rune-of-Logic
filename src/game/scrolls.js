// =====================================================================
//  SCROLLS — the cheat-sheet rules you earn. Read them in your Journal (L).
//  They double as exam review notes.
// =====================================================================

export const SCROLLS = {
  methods: {
    title: "Anatomy of a Method",
    lines: [
      "Shape: modifier returnType name(parameters) { body }",
      "Example: public int zap(int power) { return power * 2; }",
      "'void' means the method returns NOTHING.",
      "A non-void method MUST return a value of the promised type.",
      "Call it on an object: hero.zap(3);  mochi.meow();",
    ],
  },
  params: {
    title: "Parameters, Arguments & Passing",
    lines: [
      "Parameter = the slot in the definition: zap(int power).",
      "Argument  = the real value you pass:    zap(3).",
      "Arguments must match parameters in TYPE and ORDER.",
      "Java passes a COPY (pass-by-value). Reassigning a parameter never changes the caller's variable.",
      "But for objects, the copy is a copy of the REFERENCE — so changing the object (bag.add) IS seen by the caller.",
    ],
  },
  static: {
    title: "static vs. instance",
    lines: [
      "instance field: every object has its OWN copy (a.lit, b.lit).",
      "static field: ONE copy shared by the whole class (Lantern.litCount).",
      "Call instance methods on an object: b.light();",
      "Call static methods on the class:   Lantern.lightAll();  Math.max(3, 9);",
      "A static method can't use instance fields directly — it has no object to look at.",
      "main is static so Java can run it before any object exists.",
    ],
  },
  encap: {
    title: "Encapsulation",
    lines: [
      "Make fields private so outside code can't touch them directly.",
      "Getter: public int getGold() { return gold; }        — read",
      "Setter: public void setGold(int amount) { ... }       — write",
      "A setter can GUARD the data: if (amount < 0) return;",
      "Access, most open → most closed: public, protected, (default), private.",
    ],
  },
  final: {
    title: "Victory Scroll — The Four Truths",
    lines: [
      "A method keeps its promise: returnType name(params) { body }.",
      "Java passes copies; mutating a shared object still shows.",
      "static belongs to the class; instance belongs to an object.",
      "Hide fields (private); expose honest, guarded doors (get/set).",
    ],
  },
};
