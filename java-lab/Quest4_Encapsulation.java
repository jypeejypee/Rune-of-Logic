// =====================================================================
//  QUEST 4 — ENCAPSULATION CASTLE: stop Larry the Leak
//
//  Run it:   java Quest4_Encapsulation.java
//
//  Right now Larry wins. Your job: make the Vault refuse him.
// =====================================================================

public class Quest4_Encapsulation {

    public static void main(String[] args) {
        Vault vault = new Vault();
        System.out.println("gold: " + vault.getGold());

        // Larry's trick:
        vault.setGold(-999);
        System.out.println("after Larry: " + vault.getGold());

        if (vault.getGold() < 0) {
            System.out.println("LARRY WINS. Add a guard to setGold!");
        } else {
            System.out.println("ENCAPSULATED! Larry flees.");
        }

        // TODO 1: uncomment this line. Read the error: gold has private access.
        // vault.gold = 1000;

        // TODO 3: once you've written deposit(), try:
        // vault.deposit(50);
        // vault.deposit(-20);
        // System.out.println("after deposits: " + vault.getGold());   // should be 150
    }
}

class Vault {
    private int gold = 100;       // private: only code INSIDE Vault can touch it

    public int getGold() {        // getter: read
        return gold;
    }

    public void setGold(int amount) {   // setter: write
        // TODO 2: add a guard here so negative amounts are rejected.
        gold = amount;
    }

    // TODO 3: write  public void deposit(int amount)  that adds to gold,
    //         but ignores amounts that are zero or negative.
}
