// =====================================================================
//  QUEST 1 — METHOD VILLAGE: build your own spells
//
//  Run it (from the java-lab folder):   java Quest1_Methods.java
//
//  In the game you assembled:  public int zap(int power) { return power * 2; }
//  Here you write the real thing. Each TODO is a challenge.
// =====================================================================

public class Quest1_Methods {

    public static void main(String[] args) {
        Hero rook = new Hero();

        int damage = rook.zap(3);           // call the method, CATCH what it returns
        System.out.println("zap(3) returned " + damage);

        rook.shout();                       // a void method: it DOES something, returns nothing

        // TODO 3: uncomment the next line once you've written heal()
        // System.out.println("hp after heal: " + rook.heal(5));
    }
}

class Hero {
    int hp = 15;

    // modifier  return type  name  (parameters)  { body }
    public int zap(int power) {
        return power * 2;
    }

    public void shout() {
        System.out.println("For Codex!");
    }

    // TODO 1: change zap so it returns power * 3. Run again. What printed?

    // TODO 2: try changing 'int' to 'void' on zap and run it.
    //         You'll get TWO errors. 'unexpected return value' is the one the
    //         Compiler Stone showed you. The other is in main: a void method
    //         gives nothing back, so there's nothing to store in 'damage'.
    //         (Then change it back.)

    // TODO 3: write a method called heal that:
    //           - takes an int parameter called amount
    //           - adds amount to hp
    //           - RETURNS the new hp (so the return type is int)
    //         Then uncomment the line in main.
}
