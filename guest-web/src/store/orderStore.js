const KEY = "aadi_orders_v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { byRestaurant: {} };
  } catch {
    return { byRestaurant: {} };
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function newId() {
  // Good enough for UI/dev
  return "G" + Math.floor(Date.now() / 1000) + "-" + Math.random().toString(16).slice(2, 6);
}

/**
 * Order lifecycle:
 * DRAFT -> STAGED -> FIRED -> PREPARING -> READY (later from backend)
 */
export function getOrder(restaurantId) {
  const all = readAll();
  return all.byRestaurant?.[restaurantId] || null;
}

export function createOrUpdateDraft(restaurantId, cart) {
  const all = readAll();
  const existing = all.byRestaurant?.[restaurantId];

  const now = new Date().toISOString();
  const draft = existing && existing.state !== "READY"
    ? { ...existing }
    : {
        id: newId(),
        restaurantId,
        createdAt: now,
      };

  draft.updatedAt = now;
  draft.state = "DRAFT";
  draft.cart = cart; // {items:[...]}
  draft.arrivalPlan = draft.arrivalPlan || { mode: "ETA", etaMinutes: 10 };
  draft.location = draft.location || { enabled: false };
  draft.events = draft.events || [];
  draft.events.push({ at: now, type: "DRAFT_SAVED" });

  all.byRestaurant = all.byRestaurant || {};
  all.byRestaurant[restaurantId] = draft;
  writeAll(all);
  return draft;
}

export function stageOrder(restaurantId, arrivalPlan, locationEnabled) {
  const all = readAll();
  const o = all.byRestaurant?.[restaurantId];
  if (!o) return null;

  const now = new Date().toISOString();
  const staged = {
    ...o,
    updatedAt: now,
    state: "STAGED",
    arrivalPlan: arrivalPlan || o.arrivalPlan,
    location: { enabled: !!locationEnabled },
  };
  staged.events = staged.events || [];
  staged.events.push({ at: now, type: "STAGED" });

  all.byRestaurant[restaurantId] = staged;
  writeAll(all);
  return staged;
}

export function markFired(restaurantId) {
  const all = readAll();
  const o = all.byRestaurant?.[restaurantId];
  if (!o) return null;

  const now = new Date().toISOString();
  const fired = {
    ...o,
    updatedAt: now,
    state: "FIRED",
    firedAt: now,
  };
  fired.events = fired.events || [];
  fired.events.push({ at: now, type: "FIRED" });

  all.byRestaurant[restaurantId] = fired;
  writeAll(all);
  return fired;
}

export function clearOrder(restaurantId) {
  const all = readAll();
  if (all.byRestaurant) delete all.byRestaurant[restaurantId];
  writeAll(all);
}
