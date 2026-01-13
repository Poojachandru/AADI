import { useEffect, useMemo, useRef, useState } from "react";

/**
 * POLLING ONLY (tablet)
 * GET {VITE_API_BASE_URL}/tablet/orders?cursor=<cursor>
 * Response: { cursor: string|null, orders: Order[] }
 */
export function useOrders({ pollMs = 2000, path = "/tablet/orders" } = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

  const [connectionStatus, setConnectionStatus] = useState("CONNECTING"); // CONNECTING|LIVE|RECONNECTING|OFFLINE
  const [lastUpdated, setLastUpdated] = useState(null);

  // Debug
  const [lastUrl, setLastUrl] = useState("—");
  const [lastError, setLastError] = useState(null);

  const ordersMapRef = useRef(new Map());
  const cursorRef = useRef(null);
  const failRef = useRef(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = null;
    let abort = null;

    async function tick() {
      if (!alive) return;

      setConnectionStatus((prev) => (prev === "LIVE" ? "RECONNECTING" : prev));

      const url = new URL(baseUrl + path);
      if (cursorRef.current) url.searchParams.set("cursor", cursorRef.current);
      setLastUrl(url.toString());

      abort = new AbortController();

      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: abort.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const orders = Array.isArray(data?.orders) ? data.orders : [];
        const nextCursor = data?.cursor ?? null;

        for (const o of orders) {
          if (o?.id) ordersMapRef.current.set(o.id, o);
        }
        cursorRef.current = nextCursor;

        failRef.current = 0;
        setLastError(null);
        setConnectionStatus("LIVE");
        setLastUpdated(new Date());
        setVersion((v) => v + 1);

        timer = setTimeout(tick, pollMs);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;

        failRef.current += 1;
        setLastError(e?.message || String(e));

        if (failRef.current >= 4) setConnectionStatus("OFFLINE");
        else setConnectionStatus("RECONNECTING");

        const backoff = Math.min(20000, 2000 + failRef.current * 3000);
        timer = setTimeout(tick, backoff);
      }
    }

    tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (abort) abort.abort();
    };
  }, [baseUrl, path, pollMs]);

  const ordersByStatus = useMemo(() => {
    void version;

    const incoming = [];
    const preparing = [];
    const ready = [];

    for (const o of ordersMapRef.current.values()) {
      if (o.status === "INCOMING") incoming.push(o);
      else if (o.status === "PREPARING") preparing.push(o);
      else if (o.status === "READY") ready.push(o);
    }

    const byCreatedAt = (a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "");

    incoming.sort(byCreatedAt);
    preparing.sort(byCreatedAt);
    ready.sort(byCreatedAt);

    return { incoming, preparing, ready };
  }, [version]);

  return {
    ordersByStatus: ordersByStatus ?? { incoming: [], preparing: [], ready: [] },
    connectionStatus,
    lastUpdated,
    debug: { mode: "POLL", lastUrl, lastError },
  };
}
