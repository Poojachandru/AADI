const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let cursor = 1;

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

const clients = new Set();

function sseWrite(res, event, dataObj) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

function broadcast(event, dataObj) {
  for (const res of clients) {
    try { sseWrite(res, event, dataObj); } catch (_) {}
  }
}

function snapshotPayload() {
  return { cursor: String(cursor++), orders };
}

app.get("/tablet/orders", (req, res) => {
  res.json({ cursor: String(cursor++), orders });
});

app.get("/tablet/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  clients.add(res);
  sseWrite(res, "snapshot", snapshotPayload());

  const hb = setInterval(() => {
    sseWrite(res, "heartbeat", { ts: new Date().toISOString() });
  }, 10000);

  req.on("close", () => {
    clearInterval(hb);
    clients.delete(res);
  });
});

/**
 * NEW: inject fired guest order into restaurant tablet feed
 * POST /tablet/inject
 * Body: { guestOrderId, partySize, table, createdAt, firedAt, items[], flags[], arrival{} }
 */
app.post("/tablet/inject", (req, res) => {
  const b = req.body || {};
  const id = b.guestOrderId || ("GUEST-" + Math.random().toString(16).slice(2, 6));

  const incoming = {
    id, // show guest order id on tablet for now
    status: "INCOMING",
    partySize: b.partySize ?? 2,
    table: b.table ?? null,
    createdAt: b.createdAt || new Date().toISOString(),
    updatedAt: b.firedAt || new Date().toISOString(),
    arrival: b.arrival || { state: "ARRIVED", arrivedAt: new Date().toISOString() },
    items: Array.isArray(b.items) ? b.items : [],
    flags: Array.isArray(b.flags) ? b.flags : [],
    notes: "Fired by AADI (dev)"
  };

  // Upsert into store
  const idx = orders.findIndex((o) => o.id === id);
  if (idx >= 0) orders[idx] = incoming;
  else orders.unshift(incoming);

  // Broadcast to SSE listeners
  broadcast("upsert", { cursor: String(cursor++), order: incoming });

  res.json({ ok: true, id });
});

// Simulation (optional): keep your existing flow
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function upsertOrder(order) {
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  broadcast("upsert", { cursor: String(cursor++), order });
}

setInterval(() => {
  const now = new Date().toISOString();
  const incoming = orders.filter((o) => o.status === "INCOMING");
  const preparing = orders.filter((o) => o.status === "PREPARING");

  if (incoming.length > 0 && Math.random() < 0.5) {
    const o = incoming[randomInt(0, incoming.length - 1)];
    if (Math.random() < 0.6) o.status = "PREPARING";
    o.updatedAt = now;
    upsertOrder(o);
    return;
  }

  if (preparing.length > 0 && Math.random() < 0.5) {
    const o = preparing[randomInt(0, preparing.length - 1)];
    o.status = "READY";
    o.updatedAt = now;
    upsertOrder(o);
    return;
  }
}, 8000);

app.listen(3000, () => {
  console.log("✅ Mock restaurant API running at http://localhost:3000");
  console.log("✅ Poll:  GET  /tablet/orders");
  console.log("✅ SSE:   GET  /tablet/stream");
  console.log("✅ Inject POST /tablet/inject");
});
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let cursor = 1;

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

const clients = new Set();

function sseWrite(res, event, dataObj) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

function broadcast(event, dataObj) {
  for (const res of clients) {
    try { sseWrite(res, event, dataObj); } catch (_) {}
  }
}

function snapshotPayload() {
  return { cursor: String(cursor++), orders };
}

app.get("/tablet/orders", (req, res) => {
  res.json({ cursor: String(cursor++), orders });
});

app.get("/tablet/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  clients.add(res);
  sseWrite(res, "snapshot", snapshotPayload());

  const hb = setInterval(() => {
    sseWrite(res, "heartbeat", { ts: new Date().toISOString() });
  }, 10000);

  req.on("close", () => {
    clearInterval(hb);
    clients.delete(res);
  });
});

/**
 * NEW: inject fired guest order into restaurant tablet feed
 * POST /tablet/inject
 * Body: { guestOrderId, partySize, table, createdAt, firedAt, items[], flags[], arrival{} }
 */
app.post("/tablet/inject", (req, res) => {
  const b = req.body || {};
  const id = b.guestOrderId || ("GUEST-" + Math.random().toString(16).slice(2, 6));

  const incoming = {
    id, // show guest order id on tablet for now
    status: "INCOMING",
    partySize: b.partySize ?? 2,
    table: b.table ?? null,
    createdAt: b.createdAt || new Date().toISOString(),
    updatedAt: b.firedAt || new Date().toISOString(),
    arrival: b.arrival || { state: "ARRIVED", arrivedAt: new Date().toISOString() },
    items: Array.isArray(b.items) ? b.items : [],
    flags: Array.isArray(b.flags) ? b.flags : [],
    notes: "Fired by AADI (dev)"
  };

  // Upsert into store
  const idx = orders.findIndex((o) => o.id === id);
  if (idx >= 0) orders[idx] = incoming;
  else orders.unshift(incoming);

  // Broadcast to SSE listeners
  broadcast("upsert", { cursor: String(cursor++), order: incoming });

  res.json({ ok: true, id });
});

// Simulation (optional): keep your existing flow
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function upsertOrder(order) {
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  broadcast("upsert", { cursor: String(cursor++), order });
}

setInterval(() => {
  const now = new Date().toISOString();
  const incoming = orders.filter((o) => o.status === "INCOMING");
  const preparing = orders.filter((o) => o.status === "PREPARING");

  if (incoming.length > 0 && Math.random() < 0.5) {
    const o = incoming[randomInt(0, incoming.length - 1)];
    if (Math.random() < 0.6) o.status = "PREPARING";
    o.updatedAt = now;
    upsertOrder(o);
    return;
  }

  if (preparing.length > 0 && Math.random() < 0.5) {
    const o = preparing[randomInt(0, preparing.length - 1)];
    o.status = "READY";
    o.updatedAt = now;
    upsertOrder(o);
    return;
  }
}, 8000);

app.listen(3000, () => {
  console.log("✅ Mock restaurant API running at http://localhost:3000");
  console.log("✅ Poll:  GET  /tablet/orders");
  console.log("✅ SSE:   GET  /tablet/stream");
  console.log("✅ Inject POST /tablet/inject");
});
