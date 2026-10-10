// =====================================================================
//  QUEST 3 — STATIC SPIRE: Orrin's lanterns
//
//  Run it:   java Quest3_Static.java
// =====================================================================

import java.util.ArrayList;

public class Quest3_Static {

    public static void main(String[] args) {      // static: runs with no object!
        Lantern a = new Lantern("a");
        Lantern b = new Lantern("b");
        Lantern c = new Lantern("c");

        b.light();                                // instance method: called on an OBJECT
        System.out.println("a.lit=" + a.lit + "  b.lit=" + b.lit + "  c.lit=" + c.lit);
        System.out.println("Lantern.litCount = " + Lantern.litCount);

        Lantern.lightAll();                       // static method: called on the CLASS
        System.out.println("after lightAll: litCount = " + Lantern.litCount);

        // TODO 1: uncomment and read the error. Same one the plaque gave you.
        // Lantern.light();

        // TODO 2: create a 4th lantern d. Print d.lit and Lantern.litCount.
        //         Did making an object change the count?

        // TODO 3: add a static method  static int howManyLit()  to Lantern
        //         that returns litCount, and print Lantern.howManyLit() here.
    }
}

class Lantern {
    String name;
    boolean lit;                 // instance field: every lantern has its own
    static int litCount = 0;     // static field: ONE, shared by the whole class
    static ArrayList<Lantern> all = new ArrayList<>();

    Lantern(String name) {
        this.name = name;
        all.add(this);
    }

    void light() {
        if (!lit) {
            lit = true;
            litCount++;
        }
    }

    static void lightAll() {
        // lit = true;   <- TODO 4: uncomment this. Why can't a static method do that?
        for (Lantern l : all) {
            l.light();
        }
    }
}
