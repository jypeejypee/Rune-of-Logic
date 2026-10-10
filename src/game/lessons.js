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
      { text: "The five parts, always in this order:\n\npublic        → access modifier (who may call it)\nint           → return type (what it gives back)\nadd           → the name\n(int a, int b) → parameters (its inputs)\n{ ... }       → the body (the instructions)" },
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
    area: "Parameter Plains",
    pages: [
      { text: "PARAMETERS are the input slots in a method's definition.\nARGUMENTS are the real values you pass in when you call it.",
        code: "static int square(int n) {   // n = PARAMETER\n    return n * n;\n}\n\nsquare(7);                   // 7 = ARGUMENT" },
      { text: "Memory trick:\n\nParameter = Placeholder\nArgument  = Actual value" },
    ],
  },
  p2: {
    title: "Type & order matter",
    area: "Parameter Plains",
    pages: [
      { text: "Arguments must match the parameters in NUMBER, TYPE and ORDER.",
        code: "static void open(int code, String word)\n\nopen(7, \"oak\");      // ✔ int, then String\nopen(\"oak\", 7);      // ✘ wrong order\nopen(3.14, \"oak\");   // ✘ a double is not an int\nopen(7);             // ✘ missing an argument" },
      { text: "Java CAN widen safely (int → double), but never narrows by itself (double → int would lose the decimals).",
        code: "static double half(double x) { return x / 2; }\n\nhalf(5);     // ✔ 5 becomes 5.0" },
    ],
  },
  p3: {
    title: "Pass-by-value",
    area: "Parameter Plains",
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
      { text: "That's why main is static: it runs before ANY object exists.\nInside main, you create objects with 'new' and call their methods.",
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

  // ---------------------------------------------------------- FINALE
  x1: {
    title: "The Four Truths",
    area: "The Leaky Class",
    pages: [
      { text: "Everything at once:\n\n1. A method keeps its promise: returnType name(params) { body }\n2. Java passes copies — but changing a shared object still shows\n3. static belongs to the class; instance belongs to an object\n4. Hide fields (private); expose honest, guarded methods" },
    ],
  },
};
