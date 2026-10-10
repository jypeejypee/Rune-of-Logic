// =====================================================================
//  BATTLE QUESTIONS — asked every time you Attack or cast Magic.
//  In every question, options[0] is the CORRECT answer (the battle
//  screen shuffles them). Add your own! Just copy a block.
//  One question per topic is `hard: true` and has a `clue` — see
//  CLUE_STONES at the bottom.
// =====================================================================

const methods = [
  {
    prompt: "What is the RETURN TYPE?",
    code: "public String getName() {\n    return name;\n}",
    options: ["String", "getName", "public", "name"],
    why: "The return type comes right before the method name. This method hands back a String.",
  },
  {
    prompt: "What does this print?",
    code: "static int triple(int x) {\n    return x * 3;\n}\n\nSystem.out.println(triple(2) + triple(1));",
    options: ["9", "63", "6", "3"],
    why: "triple(2) returns 6 and triple(1) returns 3. The returned values are added: 6 + 3 = 9.",
  },
  {
    prompt: "Which method returns NOTHING?",
    code: null,
    options: ["public void save()", "public int save()", "public String save()", "public boolean save()"],
    why: "'void' means the method gives nothing back. It just does its job.",
  },
  {
    prompt: "What kind of value must this method return?",
    code: "public boolean isAlive() {\n    ...\n}",
    options: ["true or false", "a whole number", "some text", "nothing"],
    why: "boolean has only two values: true and false.",
  },
  {
    prompt: "Why won't this compile?",
    code: "public int getHp() {\n    System.out.println(hp);\n}",
    options: ["It promises an int but never returns one", "You can't print inside a method", "It needs a parameter", "getHp is a reserved word"],
    why: "error: missing return statement. A method that says 'int' MUST return an int, for example: return hp;",
    hard: true,
    clue: "Printing is NOT returning. println shows a value on the screen, but the method still hands NOTHING back to the caller. Look at the return type: what did it promise?",
  },
  {
    prompt: "How do you call 'attack' on the object goblin, passing 5?",
    code: null,
    options: ["goblin.attack(5);", "attack(goblin, 5);", "goblin.attack = 5;", "attack.goblin(5);"],
    why: "object.method(arguments): first the object, then a dot, then the method name and its arguments in parentheses.",
  },
  {
    prompt: "pet() is a void method. What happens here?",
    code: "String s = mochi.pet();",
    options: ["Compile error: a void method returns nothing to store", "s becomes \"\"", "s becomes null", "s becomes \"pet\""],
    why: "A void method gives nothing back, so there's nothing to put in s. error: incompatible types: void cannot be converted to String.",
  },
  {
    prompt: "What is the method's NAME?",
    code: "private double calcTax(double price)",
    options: ["calcTax", "double", "private", "price"],
    why: "modifier (private) → return type (double) → NAME (calcTax) → parameters (double price).",
  },
];

const params = [
  {
    prompt: "Which call is correct?",
    code: "static void greet(String name, int times)",
    options: ['greet("Rook", 3);', 'greet(3, "Rook");', 'greet("Rook");', "greet(Rook, 3);"],
    why: "Arguments must match the parameters in number, type and order: a String first, then an int. Text needs \"quotes\".",
  },
  {
    prompt: "How many PARAMETERS does this method have?",
    code: "static int max(int a, int b)",
    options: ["2", "1", "0", "3"],
    why: "Two slots: int a and int b. Each parameter has a type and a name, separated by commas.",
  },
  {
    prompt: "What does this print?",
    code: "static void reset(int hp) {\n    hp = 0;\n}\n\nint myHp = 20;\nreset(myHp);\nSystem.out.println(myHp);",
    options: ["20", "0", "Compile error", "null"],
    why: "reset got a COPY of myHp. Setting the copy to 0 doesn't touch the original. Pass-by-value.",
  },
  {
    prompt: "What does this print?",
    code: 'static void shout(StringBuilder sb) {\n    sb.append("!");\n}\n\nStringBuilder s = new StringBuilder("hi");\nshout(s);\nSystem.out.println(s);',
    options: ["hi!", "hi", "!", "Compile error"],
    why: "The method got a copy of the REFERENCE, so it points to the same StringBuilder. append() changes that shared object.",
    hard: true,
    clue: "Remember Brannoc and your bag: he got a copy of the ADDRESS, followed it, and put a gem in the REAL bag. A StringBuilder is an object too, so append() changes the one shared object.",
  },
  {
    prompt: "What does this print?",
    code: 'static void rename(String n) {\n    n = "Bob";\n}\n\nString hero = "Rook";\nrename(hero);\nSystem.out.println(hero);',
    options: ["Rook", "Bob", "null", "RookBob"],
    why: "Reassigning the parameter n only changes the local copy. The caller's 'hero' still points to \"Rook\".",
  },
  {
    prompt: "In  square(7)  — what do we call the 7?",
    code: "static int square(int n) { return n * n; }",
    options: ["An argument", "A parameter", "A return type", "A field"],
    why: "n is the parameter (the placeholder). 7 is the argument (the actual value).",
  },
  {
    prompt: "What does this return?",
    code: "static int add(int a, int b) {\n    return a + b;\n}\n\nadd(2, add(3, 4))",
    options: ["9", "7", "5", "Compile error"],
    why: "The inner call runs first: add(3, 4) returns 7. Then add(2, 7) returns 9. A returned value can be an argument!",
  },
  {
    prompt: "Is  avg(4, 6)  allowed?",
    code: "static double avg(double a, double b) {\n    return (a + b) / 2;\n}",
    options: ["Yes — Java widens int to double automatically", "No — you must pass doubles", "Only as avg(4.0, 6)", "Yes, but it returns an int"],
    why: "Java safely converts int → double (no information is lost). The other way, double → int, is NOT automatic.",
  },
];

const statics = [
  {
    prompt: "light() does litCount++ (litCount is static). What is Lantern.litCount?",
    code: "Lantern a = new Lantern();\nLantern b = new Lantern();\na.light();\nb.light();",
    options: ["2", "1", "0", "Each lantern has its own count"],
    why: "There is only ONE static litCount, shared by all lanterns. Both calls add to it: 2.",
  },
  {
    prompt: "Which of these is called on a CLASS, not an object?",
    code: null,
    options: ["Math.sqrt(16)", "rook.zap(3)", "mochi.meow()", "vault.getGold()"],
    why: "Math is a class name and sqrt is static. The others are called on objects (rook, mochi, vault).",
  },
  {
    prompt: "What is c1.mine?",
    code: "class Counter {\n    int mine;\n}\n\nCounter c1 = new Counter();\nCounter c2 = new Counter();\nc1.mine = 5;\nc2.mine = 1;",
    options: ["5", "1", "6", "0"],
    why: "mine is an INSTANCE field. Each Counter has its own. Changing c2.mine doesn't affect c1.",
  },
  {
    prompt: "Why won't this compile?",
    code: "class Cat {\n    String name = \"Mochi\";\n    static void show() {\n        System.out.println(name);\n    }\n}",
    options: ["A static method can't use the instance field 'name'", "name must be public", "You can't print in a static method", "Cat needs a main method"],
    why: "show() belongs to the class, not to any one Cat, so which Cat's name? error: non-static variable name cannot be referenced from a static context.",
    hard: true,
    clue: "Look for the word 'static' on the METHOD, and no 'static' on the FIELD. A static method runs without any object, so it can't ask \"which cat's name?\". Same as lit = true inside lightAll().",
  },
  {
    prompt: "What does 'static' mean?",
    code: null,
    options: ["It belongs to the class, shared by all objects", "It can never change", "It is private", "It runs faster"],
    why: "static = one copy that belongs to the class itself. (A value that never changes is 'final', not static.)",
  },
  {
    prompt: "Can an INSTANCE method use a static field?",
    code: "class Lantern {\n    static int litCount;\n    void light() { litCount++; }\n}",
    options: ["Yes — every object can see the shared static field", "No, never", "Only if the field is public", "Only from main"],
    why: "Instance → static is fine: the static field is shared and every object can reach it. It's static → instance that fails.",
  },
  {
    prompt: "Which keyword lets main run without creating an object?",
    code: "public ??? void main(String[] args)",
    options: ["static", "final", "private", "new"],
    why: "When the program starts there are no objects yet, so main must be static: it belongs to the class.",
  },
];

const encap = [
  {
    prompt: "From ANOTHER class, what happens?",
    code: "class Player {\n    private int hp;\n}\n\nPlayer p = new Player();\np.hp = 50;",
    options: ["Compile error: hp has private access", "hp becomes 50", "hp becomes 0", "It crashes while running"],
    why: "private fields can only be touched by code inside their own class. Outsiders must use methods.",
  },
  {
    prompt: "Correct SETTER for the field 'level'?",
    code: "private int level;",
    options: ["public void setLevel(int level)", "public int setLevel()", "public void level(int x)", "private void setLevel(int level)"],
    why: "Setter convention: public void setX(type x). It takes the new value and returns nothing. A private setter is useless to outsiders.",
  },
  {
    prompt: "Why use getters/setters instead of public fields?",
    code: null,
    options: ["To control access and protect the data", "They make code run faster", "Java requires them", "They make code shorter"],
    why: "A setter can check and reject bad values. A public field can be set to anything by anyone.",
  },
  {
    prompt: "age was 20. What is age after setAge(200)?",
    code: "public void setAge(int a) {\n    if (a < 0 || a > 150) return;\n    age = a;\n}",
    options: ["20", "200", "150", "0"],
    why: "200 > 150, so the guard returns early before 'age = a' runs. age stays 20.",
    hard: true,
    clue: "Read the guard line first. If the check is true, 'return;' leaves the method right away, and the line 'age = a;' never runs. Is 200 > 150?",
  },
  {
    prompt: "Which modifier makes something visible ONLY inside its own class?",
    code: null,
    options: ["private", "public", "protected", "(no modifier)"],
    why: "private is the most restrictive. public is visible everywhere, protected and default are visible within the package.",
  },
  {
    prompt: "A boolean field 'alive' usually has a getter named…",
    code: "private boolean alive;",
    options: ["isAlive()", "getalive()", "alive()", "setAlive()"],
    why: "For booleans, Java convention uses 'is': isAlive(), isEmpty(), isLit().",
  },
  {
    prompt: "What is encapsulation?",
    code: null,
    options: ["Hiding data and only allowing access through methods", "Making everything static", "Putting all code in main", "Deleting unused fields"],
    why: "Encapsulation = private data + public methods that control how the data is read and changed.",
  },
  {
    prompt: "What does 'this' refer to inside an instance method?",
    code: "public void setHeat(int heat) {\n    this.heat = heat;\n}",
    options: ["The current object — the one the method was called on", "The class itself", "The parameter heat", "The method's return value"],
    why: "'this' is the object running the method. this.heat is the FIELD; plain heat is the PARAMETER that shadows it.",
  },
  {
    prompt: "Which class is properly encapsulated?",
    code: null,
    options: [
      "private fields + public getters/setters",
      "public fields + private getters/setters",
      "public fields, no methods",
      "static fields + static methods only",
    ],
    why: "Hide the data (private fields), expose controlled access (public methods). That's the recipe.",
  },
  {
    prompt: "What's wrong with this setter?",
    code: "private int heat;\n\npublic void setHeat(int heat) {\n    heat = heat;\n}",
    options: ["It assigns the parameter to itself; the field never changes", "Nothing — it works fine", "Setters can't have parameters", "It must return an int"],
    why: "The parameter shadows the field, so both sides mean the parameter. Fix: this.heat = heat;",
  },
  {
    prompt: "A class has private final fields and NO setters. What does that make it?",
    code: "public final class Point {\n    private final int x, y;\n    public Point(int x, int y) { this.x = x; this.y = y; }\n    public int getX() { return x; }\n    public int getY() { return y; }\n}",
    options: ["Immutable — its state can't change after construction", "Broken — every field needs a setter", "Static", "Abstract"],
    why: "No setters + private final fields = immutable. String works exactly like this.",
  },
  {
    prompt: "Where is the BEST place to reject an invalid value for a private field?",
    code: null,
    options: ["Inside the setter (and the constructor)", "In main, before every call", "Nowhere — Java checks it automatically", "In the getter"],
    why: "The class guards its own data. Every write goes through the setter or constructor, so one check there protects every caller.",
  },
];

// CLUE STONES 🪨 — one per area, far from the entrance. The question marked
// `hard: true` in each topic sends you here if you get it wrong; the stone
// shows that question's `clue`. (world.js places a stone at each spot.)
export const CLUE_STONES = {
  methods: { map: "village", x: 1, y: 12, area: "Method Village", where: "the far south-west corner of Method Village" },
  params: { map: "village", x: 18, y: 2, area: "Method Village", where: "the far north-east corner of Method Village, across the bridge" },
  static: { map: "spire", x: 18, y: 12, area: "Static Spire", where: "the far south-east corner of the Static Spire" },
  encap: { map: "wilds", x: 16, y: 12, area: "the Private Wilds", where: "the far south-east corner of the Private Wilds" },
};

const tag = (list, topic) => list.map((q, i) => ({ ...q, id: `${topic}${i}`, topic }));

export const QUESTIONS = {
  methods: tag(methods, "methods"),
  params: tag(params, "params"),
  static: tag(statics, "static"),
  encap: tag(encap, "encap"),
};
