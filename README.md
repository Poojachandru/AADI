# AADI — Arrival-Aware Dine-In 🍽️

**AADI (Arrival-Aware Dine-In)** is a prototype system that rethinks restaurant pre-ordering by aligning food preparation with **actual guest arrival**, not guesswork.

Guests can browse a menu, place an order, and *stage* it in advance.  
The order is **automatically fired to the restaurant when the guest arrives**, ensuring food is prepared at the right time — not too early, not too late.

This repository focuses on **UX, system flow, and realistic restaurant behavior**.

---

## 🚀 Why AADI?

Traditional pre-ordering often fails because:
- Food is prepared too early or too late
- Kitchens lack reliable arrival signals
- Guests lose trust in timing promises

**AADI introduces a staged order lifecycle**:
1. Draft — guest builds order
2. Staged — guest sets ETA or enables location
3. Fired — order automatically sent on arrival
4. Preparing → Ready → Served

This mirrors how restaurants actually operate.

---

##  What This Repo Demonstrates

- End-to-end guest → restaurant flow
- Arrival-aware order firing
- Realistic restaurant tablet UI
- Live order status synchronization
- Production-style UI architecture

⚠️ Payments and authentication are intentionally out of scope.

---

##  Repository Structure

```txt
AADI/
├── guest-web/          # Guest-facing UI (React + Vite)
├── tablet-web/         # Restaurant tablet UI (React + Vite)
├── tablet-mock-api/    # Mock backend simulating kitchen behavior
├── .gitignore
└── README.md
