// =====================================================================
//  QUEST 2 — PARAMETER PLAINS: Brannoc's forge, for real
//
//  Run it:   java Quest2_Parameters.java
//
//  Before you run it, PREDICT what each line prints. Then check.
// =====================================================================

import java.util.ArrayList;

public class Quest2_Parameters {

    // 'x' is a PARAMETER. It receives a COPY of whatever you pass in.
    static void doubleIt(int x) {
        x = x * 2;
        System.out.println("  inside doubleIt, x = " + x);
    }

    // 'bag' receives a copy of the REFERENCE — it points at the same list.
    static void addGem(ArrayList<String> bag) {
        bag.add("gem");
    }

    // Two parameters: the order and types matter, just like the gate.
    static void open(int code, String word) {
        System.out.println("Gate opened with " + code + " and " + word);
    }

    public static void main(String[] args) {
        int coins = 5;
        doubleIt(coins);                    // 'coins' is the ARGUMENT
        System.out.println("coins after doubleIt: " + coins);   // prediction?

        ArrayList<String> bag = new ArrayList<>();
        bag.add("bread");
        addGem(bag);
        System.out.println("bag after addGem: " + bag);         // prediction?

        open(7, "oak");

        // TODO 1: uncomment this line and read the compiler error:
        // open("oak", 7);

        // TODO 2: uncomment this one too. Why does Java refuse?
        // open(3.14, "oak");

        // TODO 3: write a method  static int doubled(int x)  that RETURNS x * 2.
        //         Then make coins actually double with:  coins = doubled(coins);
        //         (That's how you get a value OUT of a method: return it.)
    }
}
