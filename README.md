# AADI — Arrival-Aware Dine-In 🍽️

AADI (Arrival-Aware Dine-In) is a prototype system that allows guests to pre-order food and have it **automatically fired to the restaurant kitchen when they arrive** (or are near arrival).

The system includes:
- A **Guest Web UI** (choose restaurant → menu → cart → stage → fire)
- A **Restaurant Tablet UI** (incoming / preparing / ready)
- A **Mock Restaurant API** that simulates real kitchen behavior

This project is focused on **UX + system flow**, not payments or authentication (yet).

---

##  Core Idea

Traditional pre-ordering causes food to be ready too early or too late.

**AADI solves this by introducing a “staged” order:**
1. Guest builds order
2. Guest stages order with ETA or location
3. Order fires automatically on arrival
4. Restaurant tablet shows it instantly

---

##  Repository Structure

```txt
AADI/
├── guest-web/          # Guest-facing UI (React + Vite)
├── tablet-web/         # Restaurant tablet UI (React + Vite)
├── tablet-mock-api/    # Mock backend (Node + Express)
├── .gitignore
└── README.md
