const BASE =
  import.meta.env.VITE_RESTAURANT_API_BASE_URL || "http://localhost:3000";

export async function fetchGuestOrderStatus(guestOrderId) {
  const res = await fetch(`${BASE}/guest/order/${encodeURIComponent(guestOrderId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`status failed: HTTP ${res.status} ${txt}`);
  }

  return await res.json(); // { found, order }
}
