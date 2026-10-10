// =====================================================================
//  QUEST 5 — THE LEAKY CLASS: the final boss, for real
//
//  Run it:   java Quest5_LeakyClass.java
//
//  This file DOES NOT COMPILE yet. That's the fight.
//  Fix the four leaks in Account (marked LEAK). When it compiles and
//  prints "BOSS DEFEATED", you've won for real.
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
