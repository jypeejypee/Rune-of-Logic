// =====================================================================
//  QUEST 5 — THE LEAKY CLASS: the final boss, for real
//
//  Run it:   java Quest5_LeakyClass.java
//
//  ⚠️  RED ERRORS IN YOUR EDITOR ARE NORMAL HERE. NOTHING IS BROKEN.
//  This file is broken ON PURPOSE: the errors are the boss's weak spots.
//  Your editor (VS Code, IntelliJ, ...) will underline them in red and
//  `java Quest5_LeakyClass.java` will refuse to run. That's the fight.
//
//  Fix the four leaks in Account (each one is marked LEAK below).
//  Every fix makes some red go away. Two leaks show red errors; the other
//  two compile fine but give the wrong balance, so read them carefully.
//  When it compiles and prints "BOSS DEFEATED", you've won for real.
//
//  Stuck? Each leak matches one 💧 leak in the game's boss arena.
// =====================================================================

public class Quest5_LeakyClass {

    public static void main(String[] args) {
        Account acc = new Account();
        acc.deposit(100);
        acc.addInterest();          // +5%  -> 105.0

        boolean honest = acc.getBalance() == 105.0;
        System.out.println("balance: " + acc.getBalance());
        System.out.println(honest ? "BOSS DEFEATED. The Leaky Class is refactored!" : "Still leaking... check deposit() and addInterest().");

        // When you've made balance private, this line should NOT compile.
        // Uncomment it to prove the leak is sealed — then comment it out again.
        // acc.balance = -1000000;
    }
}

class Account {
    public double balance;                 // LEAK 1: anyone can write to this

    public double getBalance() {
        return;                            // LEAK 2: promises a double, returns nothing
    }

    void deposit(double amount) {
        amount = amount + 10;              // LEAK 3: only changes the local copy
    }

    public static void addInterest() {     // LEAK 4: static can't see 'balance'
        balance = balance * 1.05;
    }
}
