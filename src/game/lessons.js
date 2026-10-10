// =====================================================================
//  LESSON BOARDS — the notice boards 📋 posted around the map.
//  Walk up, press J, read. Every board you read is saved in your
//  Journal (L) so you can review it before a battle or your exam.
// =====================================================================

export const LESSONS = {
  // ---------------------------------------------------------- METHODS
  m1: {
    title: "What is a METHOD?",
    area: "Method Village",
    pages: [
      { text: "A METHOD is a named block of code that does one job.\n\nYou write it ONCE, then CALL it as many times as you want.",
        code: "public int add(int a, int b) {\n    return a + b;\n}" },
      { text: "The parts, always in this order:\n\npublic        → modifier(s) (who may call it)\nint           → return type (what it gives back)\nadd           → the name\n(int a, int b) → parameters (its inputs)\n{ ... }       → the body (the instructions)\n\nModifiers are optional, and there can be more than one (public static). The return type, name, ( ) and { } are always required." },
    ],
  },
  m2: {
    title: "Return types & void",
    area: "Method Village",
    pages: [
      { text: "The return type is a PROMISE.\n'int' means: \"I will hand back an int.\"",
        code: "public int getAge() {\n    return 17;\n}\n\nint age = getAge();   // age is 17" },
      { text: "'void' means: \"I hand back NOTHING.\"\nA void method DOES something, but returns no value.",
        code: "public void greet() {\n    System.out.println(\"Hi!\");\n}" },
      { text: "Break the promise and Java won't compile it:",
        code: "public int broken() {\n    System.out.println(\"oops\");\n}   // error: missing return statement\n\npublic void bad() {\n    return 5;\n}   // error: unexpected return value" },
    ],
  },
  m3: {
    title: "Calling a method",
    area: "Method Village",
    pages: [
      { text: "Call a method on an object with a DOT:\n\n    object.method(arguments)",
        code: "Hero rook = new Hero();\n\nint dmg = rook.zap(3);   // zap returns 6, stored in dmg\nrook.shout();            // void: nothing to store" },
      { text: "A returned value can be used right where the call is, just like a number:",
        code: "System.out.println(rook.zap(2) + 1);   // prints 5" },
    ],
  },

  // ---------------------------------------------------------- PARAMETERS
  p1: {
    title: "Parameters vs Arguments",
    area: "Method Village",
    pages: [
      { text: "PARAMETERS are the input slots in a method's definition.\nARGUMENTS are the real values you pass in when you call it.",
        code: "static int square(int n) {   // n = PARAMETER\n    return n * n;\n}\n\nsquare(7);                   // 7 = ARGUMENT" },
      { text: "Memory trick:\n\nParameter = Placeholder\nArgument  = Actual value" },
    ],
  },
  p2: {
    title: "Type & order matter",
    area: "Method Village",
    pages: [
      { text: "Arguments must match the parameters in NUMBER, TYPE and ORDER.",
        code: "static void open(int code, String word)\n\nopen(7, \"oak\");      // ✔ int, then String\nopen(\"oak\", 7);      // ✘ wrong order\nopen(3.14, \"oak\");   // ✘ a double is not an int\nopen(7);             // ✘ missing an argument" },
      { text: "Java CAN widen safely (int → double), but never narrows by itself (double → int would lose the decimals).",
        code: "static double half(double x) { return x / 2; }\n\nhalf(5);     // ✔ 5 becomes 5.0" },
    ],
  },
  p3: {
    title: "Pass-by-value",
    area: "Method Village",
    pages: [
      { text: "Java ALWAYS passes a COPY of the value.\nChanging the parameter does NOT change the caller's variable.",
        code: "static void doubleIt(int x) {\n    x = x * 2;          // changes the copy only\n}\n\nint coins = 5;\ndoubleIt(coins);\n// coins is still 5" },
      { text: "With objects, the copy is a copy of the REFERENCE (an address).\nBoth point at the SAME object, so changing the object IS visible.",
        code: "static void addGem(ArrayList<String> bag) {\n    bag.add(\"gem\");    // changes the shared object\n}\n\naddGem(myBag);   // myBag now has a gem" },
      { text: "But REASSIGNING an object parameter still only changes the local copy:",
        code: "static void swap(ArrayList<String> bag) {\n    bag = new ArrayList<>();   // caller doesn't see this\n}" },
    ],
  },

  // ---------------------------------------------------------- STATIC
  s1: {
    title: "Objects & instance fields",
    area: "Static Spire",
    pages: [
      { text: "A CLASS is a blueprint. An OBJECT is one thing built from it with 'new'.\n\nEach object gets its OWN copy of every instance field.",
        code: "class Lantern {\n    boolean lit;     // instance field\n}\n\nLantern a = new Lantern();\nLantern b = new Lantern();\nb.lit = true;    // a.lit is still false" },
    ],
  },
  s2: {
    title: "What static means",
    area: "Static Spire",
    pages: [
      { text: "'static' means: belongs to the CLASS, not to any one object.\nThere is exactly ONE copy, shared by everyone.",
        code: "class Lantern {\n    static int litCount;   // ONE for all lanterns\n}\n\nLantern.litCount++;      // use the CLASS name" },
      { text: "Call static things with the CLASS name.\nCall instance things with an OBJECT.",
        code: "Math.max(3, 9);     // static: no object needed\nLantern.lightAll(); // static\n\nb.light();          // instance: needs object b" },
    ],
  },
  s3: {
    title: "The static rule",
    area: "Static Spire",
    pages: [
      { text: "A static method has no object of its own, so it CAN'T use instance fields or instance methods directly.",
        code: "static void lightAll() {\n    lit = true;   // ✘ error: non-static variable lit\n}                 //   cannot be referenced from a static context" },
      { text: "That's why the classic main is static: Java can call it before ANY object exists.\nInside main, you create objects with 'new' and call their methods.\n\n(Java 25+ also accepts a simpler  void main()  without static, but the static form is the standard one, and the one on the Java 8 exam.)",
        code: "public static void main(String[] args) {\n    Lantern b = new Lantern();\n    b.light();\n}" },
    ],
  },

  // ---------------------------------------------------------- ENCAPSULATION
  e1: {
    title: "Encapsulation",
    area: "Encapsulation Castle",
    pages: [
      { text: "ENCAPSULATION = hide the data, expose controlled methods.\n\nLike a bank: you can't walk into the vault, but you can ask the teller.",
        code: "public class Vault {\n    private int gold = 100;      // hidden\n\n    public int getGold() {       // the teller\n        return gold;\n    }\n}" },
    ],
  },
  e2: {
    title: "Getters & setters",
    area: "Encapsulation Castle",
    pages: [
      { text: "GETTER: reads a private field. Named getX() (or isX() for booleans).\nSETTER: changes a private field. Named setX(value).",
        code: "private int level;\n\npublic int getLevel() {\n    return level;\n}\n\npublic void setLevel(int level) {\n    this.level = level;\n}" },
    ],
  },
  e3: {
    title: "Guarding your data",
    area: "Encapsulation Castle",
    pages: [
      { text: "The real power of a setter: it can say NO.",
        code: "public void setGold(int amount) {\n    if (amount < 0) return;   // the guard\n    gold = amount;\n}" },
      { text: "With a PUBLIC field, nothing can stop bad data:",
        code: "vault.gold = -999;   // a public field lets anyone do this" },
    ],
  },
  e4: {
    title: "Access modifiers",
    area: "Encapsulation Castle",
    pages: [
      { text: "From MOST open to MOST closed:\n\npublic       → everyone\nprotected    → same package + subclasses\n(no keyword) → same package only\nprivate      → only this class\n\nRule of thumb: fields private, methods public." },
    ],
  },

  // ---------------------------------------------------------- THE PRIVATE WILDS (Brannoc)
  w1: {
    title: "Why encapsulate?",
    area: "The Private Wilds",
    pages: [
      { text: "A public field is an unlocked door. ANY code, anywhere, can put ANY value in it, and the class can't stop it:",
        code: "public class Forge {\n    public int heat;\n}\n\nforge.heat = -40;      // frozen solid\nforge.heat = 99999;    // anvil cracked" },
      { text: "Encapsulation gives you three things:\n\n1. VALID DATA: the class rejects bad values.\n2. ONE PLACE TO CHANGE: rules live inside the class, not in 50 callers.\n3. FREEDOM: you can change HOW data is stored later without breaking anyone who uses the class." },
    ],
  },
  w2: {
    title: "Step 1 — Make fields private",
    area: "The Private Wilds",
    pages: [
      { text: "Mark every field private. Now only code INSIDE the class can read or write it.",
        code: "public class Forge {\n    private int heat;\n}\n\n// in another class:\nforge.heat = 50;\n// error: heat has private access in Forge" },
      { text: "Exam trap: private means private to the CLASS, not to the object. Code inside Forge may touch the private fields of ANOTHER Forge object:",
        code: "public boolean hotterThan(Forge other) {\n    return this.heat > other.heat;   // ✔ legal\n}" },
    ],
  },
  w3: {
    title: "Step 2 — Getters (read access)",
    area: "The Private Wilds",
    pages: [
      { text: "A GETTER lets outsiders READ a private field. Rules:\n• public\n• returns the field's type\n• takes NO parameters\n• named get + FieldName",
        code: "public int getHeat() {\n    return heat;\n}" },
      { text: "For boolean fields, the convention is is + FieldName:",
        code: "private boolean lit;\n\npublic boolean isLit() {\n    return lit;\n}" },
      { text: "Careful with objects! Returning a private List hands out the REAL list, and callers can change it. Return a copy instead:",
        code: "public List<String> getTools() {\n    return new ArrayList<>(tools);   // a copy: safe\n}" },
    ],
  },
  w4: {
    title: "Step 3 — Setters (write access)",
    area: "The Private Wilds",
    pages: [
      { text: "A SETTER lets outsiders CHANGE a private field, on the class's terms. Rules:\n• public void\n• ONE parameter of the field's type\n• named set + FieldName",
        code: "public void setHeat(int heat) {\n    if (heat < 0 || heat > 1500) return;   // guard\n    this.heat = heat;\n}" },
      { text: "The guard is the whole point. Without it, a setter is just a public field wearing a disguise.\n\nIf a field should NEVER change from outside, simply don't write a setter for it." },
    ],
  },
  w5: {
    title: "The 'this' keyword",
    area: "The Private Wilds",
    pages: [
      { text: "When a parameter has the same name as a field, the parameter SHADOWS the field. Inside the method, plain 'heat' means the parameter.",
        code: "private int heat;\n\npublic void setHeat(int heat) {\n    heat = heat;        // ✘ parameter = parameter\n}                       //   the field never changes!" },
      { text: "'this' means \"the current object\". this.heat is always the FIELD:",
        code: "public void setHeat(int heat) {\n    this.heat = heat;   // ✔ field = parameter\n}" },
    ],
  },
  w6: {
    title: "Constructors keep objects valid",
    area: "The Private Wilds",
    pages: [
      { text: "A constructor sets the private fields when the object is BORN. Validate there too, so an object can never start in a bad state.",
        code: "public Forge(int heat) {\n    setHeat(heat);      // reuse the setter's guard\n}" },
      { text: "Java gives you a free no-argument constructor ONLY if you write no constructors at all. Write one, and the free one disappears:",
        code: "public class Forge {\n    public Forge(int heat) { ... }\n}\n\nnew Forge();     // ✘ compilation fails" },
      { text: "this(...) calls another constructor of the same class. In Java 8 (and on the exam) it must be the FIRST line. Java 25+ relaxes this a little, but putting it first is still the normal style:",
        code: "public Forge() {\n    this(800);          // default heat\n}" },
    ],
  },
  w7: {
    title: "Access modifiers in depth",
    area: "The Private Wilds",
    pages: [
      { text: "Who can see a member?\n\nRule of thumb: fields private, methods public, helpers private.",
        code: "                class  package  subclass  world\npublic            ✔       ✔        ✔        ✔\nprotected         ✔       ✔        ✔        ✘\n(no modifier)     ✔       ✔        ✘        ✘\nprivate           ✔       ✘        ✘        ✘" },
      { text: "Exam trap: (no modifier) is called package-private. A class in ANOTHER package can't see it, even with an import:",
        code: "package a;  public class A { int x; }\n\npackage b;  ... new A().x\n// error: x is not public in A;\n//        cannot be accessed from outside package" },
    ],
  },
  w8: {
    title: "Secret lesson — Immutable classes",
    area: "The Private Wilds (hidden island)",
    pages: [
      { text: "The strongest encapsulation: an object that can NEVER change after it's built.\n\n1. Make the class final (no sneaky subclasses)\n2. Make every field private final\n3. Set fields only in the constructor\n4. Write NO setters\n5. If a field holds a mutable object (like a List), store and return COPIES of it",
        code: "public final class Rune {\n    private final String name;\n    public Rune(String name) { this.name = name; }\n    public String getName()  { return name; }\n}" },
      { text: "String is immutable. That's why s.toUpperCase() returns a NEW String and leaves s unchanged, a favourite exam trick.",
        code: "String s = \"java\";\ns.toUpperCase();\nSystem.out.println(s);   // java" },
    ],
  },

  // ---------------------------------------------------------- FINALE
  x1: {
    title: "The Four Truths",
    area: "The Leaky Class",
    pages: [
      { text: "Everything at once:\n\n1. A method keeps its promise: returnType name(params) { body }\n2. Java passes copies — but changing a shared object still shows\n3. static belongs to the class; instance belongs to an object\n4. Hide fields (private); expose honest, guarded methods" },
    ],
  },
};
