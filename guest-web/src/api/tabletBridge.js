const BASE =
  import.meta.env.VITE_RESTAURANT_API_BASE_URL || "http://localhost:3000";

/**
 * Push a fired guest order into the restaurant tablet feed (mock/dev).
 * Requires mock endpoint: POST /tablet/inject
 */
export async function injectToRestaurantTablet(firedOrder) {
  const payload = {
    guestOrderId: firedOrder.id,
    restaurantId: firedOrder.restaurantId,
    partySize: firedOrder.partySize || 2,
    table: null,
    createdAt: firedOrder.createdAt,
    firedAt: firedOrder.firedAt || new Date().toISOString(),
    items: (firedOrder.cart?.items || []).map((x) => ({
      name: x.name,
      qty: x.qty,
      station: x.station || null,
    })),
    flags: firedOrder.flags || [],
    arrival: {
      state: "ARRIVED",
      arrivedAt: firedOrder.firedAt || new Date().toISOString(),
    },
  };

  const res = await fetch(`${BASE}/tablet/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`inject failed: HTTP ${res.status} ${txt}`);
  }

  return await res.json();
}
