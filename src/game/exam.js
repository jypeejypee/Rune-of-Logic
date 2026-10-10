// =====================================================================
//  EXAM-STYLE QUESTIONS — modeled on Oracle 1Z0-808 (Java SE 8 Programmer I)
// ---------------------------------------------------------------------
//  These are ORIGINAL practice questions written to match the exam's
//  objectives and style ("What is the result?", "Compilation fails",
//  tricky-but-legal code). They are not real exam questions.
//
//  They show up more often as you level up and travel further
//  (see examChance in battle.js), and one appears in every Keeper trial.
//
//  As everywhere else: options[0] is the CORRECT answer.
//  `objective` names the 1Z0-808 exam topic it practises.
// =====================================================================

const methods = [
  {
    objective: "Create an overloaded method",
    prompt: "What is the result?",
    code: "public class Test {\n    static void print(int x)     { System.out.print(\"int\"); }\n    static void print(long x)    { System.out.print(\"long\"); }\n    static void print(Integer x) { System.out.print(\"Integer\"); }\n\n    public static void main(String[] args) {\n        byte b = 5;\n        print(b);\n    }\n}",
    options: ["int", "long", "Integer", "Compilation fails"],
    why: "Overload resolution prefers WIDENING over boxing, and the closest widening wins: byte → int beats byte → long. Boxing (Integer) is only tried if no widening match exists.",
  },
  {
    objective: "Create an overloaded method (varargs)",
    prompt: "What is the result?",
    code: "static void go(int... x)     { System.out.print(\"varargs\"); }\nstatic void go(int x, int y) { System.out.print(\"two\"); }\n\npublic static void main(String[] args) {\n    go(1, 2);\n}",
    options: ["two", "varargs", "twovarargs", "Compilation fails: ambiguous call"],
    why: "Varargs has the LOWEST priority in overload resolution. An exact (int, int) match is chosen first, so no ambiguity.",
  },
  {
    objective: "Create an overloaded method",
    prompt: "What is the result of compiling this class?",
    code: "public class Calc {\n    public int  calc(int a) { return a; }\n    public long calc(int a) { return a; }\n}",
    options: ["Compilation fails", "It compiles", "It compiles, but calls are ambiguous at runtime", "It compiles with a warning"],
    why: "Overloads must differ in their PARAMETER lists. A different return type alone is not enough: error: method calc(int) is already defined.",
  },
  {
    objective: "Create methods with return values",
    prompt: "What is the result?",
    code: "public static int test() {\n    return 1;\n    System.out.println(\"done\");\n}",
    options: ["Compilation fails", "It prints done, then returns 1", "It returns 1 and never prints", "A runtime exception is thrown"],
    why: "Code after a return can never run, and Java treats that as an error: unreachable statement.",
  },
  {
    objective: "Create methods with return values",
    prompt: "What is the result of compiling this method?",
    code: "static int sign(int n) {\n    if (n > 0)      return 1;\n    else if (n < 0) return -1;\n}",
    options: ["Compilation fails", "It compiles; sign(0) returns 0", "It compiles; sign(0) throws an exception", "It compiles; sign(0) returns -1"],
    why: "The compiler sees a path (n == 0) with no return. A non-void method must return on EVERY path: error: missing return statement.",
  },
  {
    objective: "Create methods with arguments and return values",
    prompt: "Which method declaration compiles?",
    code: null,
    options: ["public static final void go() { }", "public void static go() { }", "static public go() { }", "void public go() { }"],
    why: "Modifiers (public, static, final) can come in any order, but they ALL go before the return type. And every method needs a return type (void counts).",
  },
  {
    objective: "Create methods with arguments (varargs)",
    prompt: "Which declaration compiles?",
    code: null,
    options: ["void m(int x, String... s)", "void m(String... s, int x)", "void m(String... s, int... x)", "void m(String s...)"],
    why: "Only ONE varargs parameter is allowed, it must be the LAST parameter, and the ... goes after the type.",
  },
];

const params = [
  {
    objective: "Effect on object references and primitives passed into methods",
    prompt: "What is the result?",
    code: "static void change(int[] arr) {\n    arr[0] = 99;\n    arr = new int[] { 7 };\n}\n\npublic static void main(String[] args) {\n    int[] a = { 1, 2 };\n    change(a);\n    System.out.println(a[0]);\n}",
    options: ["99", "1", "7", "Compilation fails"],
    why: "arr[0] = 99 changes the SHARED array. Then arr is pointed at a new array, but that only changes the local copy of the reference. a still sees the 99.",
  },
  {
    objective: "Effect on object references passed into methods",
    prompt: "What is the result?",
    code: "static void m(StringBuilder sb) {\n    sb.append(\"B\");\n    sb = new StringBuilder(\"C\");\n    sb.append(\"D\");\n}\n\npublic static void main(String[] args) {\n    StringBuilder sb = new StringBuilder(\"A\");\n    m(sb);\n    System.out.println(sb);\n}",
    options: ["AB", "A", "CD", "ABCD"],
    why: "\"B\" is appended to the caller's object. After the reassignment, sb points to a NEW object, so \"D\" goes there, and the caller never sees it.",
  },
  {
    objective: "Effect on primitives and wrappers passed into methods",
    prompt: "What is the result?",
    code: "static void inc(Integer i) {\n    i++;\n}\n\npublic static void main(String[] args) {\n    Integer n = 10;\n    inc(n);\n    System.out.println(n);\n}",
    options: ["10", "11", "Compilation fails", "A NullPointerException is thrown"],
    why: "Integer is immutable. i++ unboxes, adds 1, and boxes a NEW Integer into the local variable i. The caller's n still refers to 10.",
  },
  {
    objective: "Create an overloaded method (widening vs boxing)",
    prompt: "What is the result?",
    code: "static void f(long x)    { System.out.print(\"long\"); }\nstatic void f(Integer x) { System.out.print(\"Integer\"); }\n\npublic static void main(String[] args) {\n    f(5);\n}",
    options: ["long", "Integer", "Compilation fails: ambiguous", "longInteger"],
    why: "Widening (int → long) beats autoboxing (int → Integer). That rule is a classic exam trap.",
  },
  {
    objective: "Apply casting / method invocation conversion",
    prompt: "What is the result?",
    code: "static void take(byte b) { System.out.print(b); }\n\npublic static void main(String[] args) {\n    take(10);\n}",
    options: ["Compilation fails", "10", "A runtime exception is thrown", "0"],
    why: "byte b = 10; would compile (assignment allows narrowing a constant), but METHOD calls don't. 10 is an int, and int → byte is not automatic (error: incompatible types: possible lossy conversion from int to byte). Fix: take((byte) 10).",
  },
  {
    objective: "Use Java primitive types in method calls",
    prompt: "What is the result?",
    code: "static int f(int x) { return x + 1; }\n\npublic static void main(String[] args) {\n    System.out.println(f('A'));\n}",
    options: ["66", "B", "A1", "Compilation fails"],
    why: "char widens to int automatically. 'A' is 65, so f returns 66, and println(int) prints the number.",
  },
  {
    objective: "Manipulate data using the String class (immutability)",
    prompt: "What is the result?",
    code: "String s = \"Java\";\ns.toUpperCase();\ns.concat(\" 8\");\nSystem.out.println(s);",
    options: ["Java", "JAVA 8", "Java 8", "JAVA"],
    why: "Strings are immutable. toUpperCase() and concat() RETURN new Strings, but the results are thrown away. s still refers to \"Java\".",
  },
];

const statics = [
  {
    objective: "Apply the static keyword to methods and fields",
    prompt: "What is the result?",
    code: "public class Counter {\n    static int count = 0;\n    int id;\n    Counter() { id = ++count; }\n\n    public static void main(String[] args) {\n        Counter a = new Counter();\n        Counter b = new Counter();\n        System.out.println(a.id + \" \" + b.id + \" \" + Counter.count);\n    }\n}",
    options: ["1 2 2", "1 1 2", "2 2 2", "0 1 2"],
    why: "count is shared: the first constructor makes it 1 (a.id = 1), the second makes it 2 (b.id = 2). Each object keeps its own id.",
  },
  {
    objective: "Apply the static keyword to methods and fields",
    prompt: "What is the result?",
    code: "public class Test {\n    static String name = \"static\";\n\n    public static void main(String[] args) {\n        Test t = null;\n        System.out.println(t.name);\n    }\n}",
    options: ["static", "A NullPointerException is thrown", "null", "Compilation fails"],
    why: "Static members are resolved by the variable's TYPE at compile time, not by the object. t.name is really Test.name, so no object is needed and there's no NPE.",
  },
  {
    objective: "Apply the static keyword (static and instance initializers)",
    prompt: "What is the result?",
    code: "public class Init {\n    static { System.out.print(\"A \"); }\n    { System.out.print(\"B \"); }\n    Init() { System.out.print(\"C \"); }\n\n    public static void main(String[] args) {\n        System.out.print(\"D \");\n        new Init();\n    }\n}",
    options: ["A D B C", "D A B C", "A B C D", "D B C A"],
    why: "The static block runs ONCE when the class loads, before main. Then main prints D. new Init() runs the instance initializer (B) before the constructor body (C).",
  },
  {
    objective: "Apply the static keyword to methods and fields",
    prompt: "What is the result?",
    code: "public class App {\n    void hello() { System.out.println(\"hi\"); }\n\n    public static void main(String[] args) {\n        hello();\n    }\n}",
    options: ["Compilation fails", "hi", "A runtime exception is thrown", "Nothing is printed"],
    why: "main is static, so it has no object to call hello() on. error: non-static method hello() cannot be referenced from a static context. Fix: new App().hello();",
  },
  {
    objective: "Declare and initialize variables (final static)",
    prompt: "What is the result?",
    code: "public class Config {\n    static final int MAX;\n\n    public static void main(String[] args) {\n        System.out.println(MAX);\n    }\n}",
    options: ["Compilation fails", "0", "null", "An exception is thrown"],
    why: "A static final field gets NO default value. It must be assigned exactly once, at its declaration or in a static block. error: variable MAX might not have been initialized.",
  },
  {
    objective: "Know default values of fields",
    prompt: "What is the result?",
    code: "public class Box {\n    int size;\n    static boolean open;\n\n    public static void main(String[] args) {\n        Box b = new Box();\n        System.out.println(b.size + \" \" + open);\n    }\n}",
    options: ["0 false", "Compilation fails: variables not initialized", "null null", "0 null"],
    why: "FIELDS (instance and static) get default values: 0 for numbers, false for boolean, null for objects. Only LOCAL variables must be initialized before use.",
  },
];

const encap = [
  {
    objective: "Create and overload constructors (default constructor)",
    prompt: "What is the result?",
    code: "public class Hero {\n    String name;\n    Hero(String n) { name = n; }\n\n    public static void main(String[] args) {\n        Hero h = new Hero();\n        System.out.println(h.name);\n    }\n}",
    options: ["Compilation fails", "null", "An empty line is printed", "A NullPointerException is thrown"],
    why: "Java only adds a default no-arg constructor if you write NO constructors. Hero has one taking a String, so new Hero() doesn't exist.",
  },
  {
    objective: "Create constructors (constructor vs method)",
    prompt: "What is the result?",
    code: "public class Car {\n    String model = \"Base\";\n    public void Car() { model = \"Turbo\"; }\n\n    public static void main(String[] args) {\n        System.out.println(new Car().model);\n    }\n}",
    options: ["Base", "Turbo", "Compilation fails", "null"],
    why: "A constructor has NO return type. 'public void Car()' is just a method that happens to share the class name, and it's never called. The default constructor runs instead.",
  },
  {
    objective: "Apply encapsulation principles (this and shadowing)",
    prompt: "What is the result?",
    code: "public class Player {\n    private int score;\n    public void setScore(int score) { score = score; }\n    public int getScore() { return score; }\n\n    public static void main(String[] args) {\n        Player p = new Player();\n        p.setScore(50);\n        System.out.println(p.getScore());\n    }\n}",
    options: ["0", "50", "Compilation fails", "null"],
    why: "Inside setScore, 'score' means the PARAMETER (it shadows the field). score = score assigns the parameter to itself. The field stays 0. Fix: this.score = score;",
  },
  {
    objective: "Apply access modifiers",
    prompt: "What is the result?",
    code: "public class Vault {\n    private int gold = 100;\n\n    public static void main(String[] args) {\n        Vault v = new Vault();\n        System.out.println(v.gold);\n    }\n}",
    options: ["100", "Compilation fails: gold has private access", "0", "An exception is thrown"],
    why: "private means private to the CLASS, not to the object. main is written inside Vault, so it may read v.gold.",
  },
  {
    objective: "Apply access modifiers (package-private)",
    prompt: "What is the result of compiling B?",
    code: "package a;\npublic class A {\n    int x = 1;          // no modifier\n}\n\npackage b;\nimport a.A;\npublic class B {\n    public static void main(String[] args) {\n        System.out.println(new A().x);\n    }\n}",
    options: ["Compilation fails", "It prints 1", "It prints 0", "It compiles, but throws at runtime"],
    why: "No modifier means package-private: only classes in package a can see x. B is in package b. error: x is not public in A; cannot be accessed from outside package.",
  },
  {
    objective: "Apply encapsulation principles to a class",
    prompt: "Which change makes this class properly encapsulated?",
    code: "public class Account {\n    public double balance;\n    public double getBalance()         { return balance; }\n    public void   setBalance(double b) { balance = b; }\n}",
    options: ["Make balance private", "Make the getter and setter private", "Make the class final", "Make balance static"],
    why: "Encapsulation means hiding the FIELD and exposing access through methods. While balance is public, the getter and setter can be bypassed completely.",
  },
  {
    objective: "Declare final variables (final references)",
    prompt: "What is the result?",
    code: "final StringBuilder sb = new StringBuilder(\"Hi\");\nsb.append(\"!\");\nSystem.out.println(sb);",
    options: ["Hi!", "Hi", "Compilation fails: sb is final", "A runtime exception is thrown"],
    why: "final locks the REFERENCE (you can't write sb = new ...), not the object. Calling append() on the same object is fine.",
  },
];

const tag = (list, topic) => list.map((q, i) => ({ ...q, id: `${topic}X${i}`, topic, exam: true }));

export const EXAM = {
  methods: tag(methods, "methods"),
  params: tag(params, "params"),
  static: tag(statics, "static"),
  encap: tag(encap, "encap"),
};
