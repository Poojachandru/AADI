const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let cursor = 1;

// ---- Mock data store ----
let orders = [
  {
    id: "A1032",
    status: "INCOMING",
    partySize: 2,
    table: null,
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    arrival: { state: "ETA", etaMinutes: 6 },
    items: [
      { name: "Burger", qty: 2 },
      { name: "Fries", qty: 1 }
    ],
    flags: ["ALLERGY"]
  },
  {
    id: "A1033",
    status: "PREPARING",
    partySize: 4,
    table: "T12",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    arrival: { state: "ARRIVED", arrivedAt: new Date(Date.now() - 21 * 60 * 1000).toISOString() },
    items: [
      { name: "Margherita Pizza", qty: 1 },
      { name: "Caesar Salad", qty: 2 },
      { name: "Iced Tea", qty: 4 }
    ],
    flags: []
  },
  {
    id: "A1034",
    status: "READY",
    partySize: 1,
    table: "T3",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    arrival: { state: "ARRIVED", arrivedAt: new Date(Date.now() - 21 * 60 * 1000).toISOString() },
    items: [{ name: "Espresso", qty: 1 }],
    flags: ["VIP"]
  }
];

// ---- SSE client registry ----
const clients = new Set();

function sseWrite(res, event, dataObj) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

function broadcast(event, dataObj) {
  for (const res of clients) {
    try {
      sseWrite(res, event, dataObj);
    } catch (_) {
      // ignore
    }
  }
}

function snapshotPayload() {
  return {
    cursor: String(cursor++),
    orders
  };
}

// ---- Polling endpoint ----
app.get("/tablet/orders", (req, res) => {
  res.json({
    cursor: String(cursor++),
    orders
  });
});

// ---- SSE endpoint ----
app.get("/tablet/stream", (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  clients.add(res);

  // Initial snapshot
  sseWrite(res, "snapshot", snapshotPayload());

  // Heartbeat
  const hb = setInterval(() => {
    sseWrite(res, "heartbeat", { ts: new Date().toISOString() });
  }, 10000);

  req.on("close", () => {
    clearInterval(hb);
    clients.delete(res);
  });
});

// ---- Simulation: periodically mutate orders and broadcast upserts ----
function upsertOrder(order) {
  // Update in store
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);

  const payload = {
    cursor: String(cursor++),
    order
  };
  broadcast("upsert", payload);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Every 8 seconds, do something realistic
setInterval(() => {
  const now = new Date().toISOString();

  // 1) Occasionally add a brand new INCOMING order
  if (Math.random() < 0.35) {
    const id = "A" + String(1000 + randomInt(35, 99));
    const newOrder = {
      id,
      status: "INCOMING",
      partySize: randomInt(1, 6),
      table: null,
      createdAt: now,
      updatedAt: now,
      arrival: { state: "ETA", etaMinutes: randomInt(2, 12) },
      items: [
        { name: "Taco", qty: randomInt(1, 3) },
        { name: "Soda", qty: randomInt(1, 2) }
      ],
      flags: Math.random() < 0.2 ? ["VIP"] : []
    };
    upsertOrder(newOrder);
    return;
  }

  // 2) Promote an order through statuses
  const incoming = orders.filter((o) => o.status === "INCOMING");
  const preparing = orders.filter((o) => o.status === "PREPARING");

  if (incoming.length > 0 && Math.random() < 0.6) {
    const o = incoming[randomInt(0, incoming.length - 1)];

    // Simulate arrival sometimes
    if (Math.random() < 0.5) {
      o.arrival = { state: "ARRIVED", arrivedAt: now };
      // Simulate seating sometimes
      if (Math.random() < 0.5) o.table = "T" + randomInt(1, 20);
    }

    // Move to PREPARING sometimes
    if (Math.random() < 0.6) {
      o.status = "PREPARING";
    }

    o.updatedAt = now;
    upsertOrder(o);
    return;
  }

  if (preparing.length > 0) {
    const o = preparing[randomInt(0, preparing.length - 1)];
    // Move to READY
    o.status = "READY";
    o.updatedAt = now;
    upsertOrder(o);
    return;
  }

  // 3) Occasionally delete a very old READY order (simulate pickup)
  const ready = orders.filter((o) => o.status === "READY");
  if (ready.length > 0 && Math.random() < 0.3) {
    const o = ready[randomInt(0, ready.length - 1)];
    orders = orders.filter((x) => x.id !== o.id);
    broadcast("delete", { cursor: String(cursor++), id: o.id });
    return;
  }
}, 8000);

app.listen(3000, () => {
  console.log("✅ Mock tablet API running at http://localhost:3000");
  console.log("✅ Polling:   GET /tablet/orders");
  console.log("✅ SSE:       GET /tablet/stream");
});
