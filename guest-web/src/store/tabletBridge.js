const BASE = import.meta.env.VITE_RESTAURANT_API_BASE_URL || "http://localhost:3000";

export async function injectToRestaurantTablet(firedOrder) {
  // Fired order -> restaurant tablet order model
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
    arrival: { state: "ARRIVED", arrivedAt: firedOrder.firedAt || new Date().toISOString() },
  };

  const res = await fetch(`${BASE}/tablet/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`inject failed: HTTP ${res.status}`);
  return await res.json();
}
