import { useEffect, useMemo, useRef, useState } from "react";

/**
 * useOrders: SSE-first, polling fallback (read-only)
 *
 * Endpoints (relative to VITE_API_BASE_URL):
 * - SSE:   GET /tablet/stream
 * - Poll:  GET /tablet/orders?cursor=<cursor>
 *
 * SSE events expected (simple JSON payload in data):
 * - event: snapshot  data: { cursor: string|null, orders: Order[] }
 * - event: upsert    data: { cursor: string|null, order: Order }
 * - event: delete    data: { cursor: string|null, id: string }
 * - event: heartbeat data: { ts: string }   (optional)
 *
 * If SSE fails, we fall back to polling automatically.
 */
export function useOrders({
  pollMs = 3000,
  ordersPath = "/tablet/orders",
  streamPath = "/tablet/stream",
  sseStaleMs = 20000, // if no SSE message within this window, reconnect/fallback
} = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
  const [lastUpdated, setLastUpdated] = useState(null);

  const ordersMapRef = useRef(new Map()); // id -> order
  const cursorRef = useRef(null);

  const [version, setVersion] = useState(0);

  const modeRef = useRef("SSE"); // SSE | POLL
  const failCountRef = useRef(0);

  const esRef = useRef(null);
  const sseLastMsgAtRef = useRef(null);
  const sseWatchdogTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const abortRef = useRef(null);

  function clearPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  function clearSSE() {
    if (sseWatchdogTimerRef.current) {
      clearTimeout(sseWatchdogTimerRef.current);
      sseWatchdogTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  function markLive() {
    failCountRef.current = 0;
    setConnectionStatus("LIVE");
    setLastUpdated(new Date());
  }

  function markReconnecting() {
    setConnectionStatus((prev) => (prev === "LIVE" ? "RECONNECTING" : prev));
  }

  function bump() {
    setVersion((v) => v + 1);
  }

  function applySnapshot(payload) {
    const orders = Array.isArray(payload?.orders) ? payload.orders : [];
    const nextCursor = payload?.cursor ?? null;

    // Snapshot replaces state (handles deletions naturally)
    const m = new Map();
    for (const o of orders) {
      if (o?.id) m.set(o.id, o);
    }
    ordersMapRef.current = m;
    cursorRef.current = nextCursor;

    markLive();
    bump();
  }

  function applyUpsert(payload) {
    const o = payload?.order;
    if (!o?.id) return;

    const nextCursor = payload?.cursor ?? null;
    ordersMapRef.current.set(o.id, o);
    cursorRef.current = nextCursor;

    markLive();
    bump();
  }

  function applyDelete(payload) {
    const id = payload?.id;
    if (!id) return;

    const nextCursor = payload?.cursor ?? null;
    ordersMapRef.current.delete(id);
    cursorRef.current = nextCursor;

    markLive();
    bump();
  }

  async function pollOnce(aliveCheck) {
    const url = new URL(baseUrl + ordersPath);
    if (cursorRef.current) url.searchParams.set("cursor", cursorRef.current);

    abortRef.current = new AbortController();

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: abortRef.current.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!aliveCheck()) return;

    const orders = Array.isArray(data?.orders) ? data.orders : [];
    const nextCursor = data?.cursor ?? null;

    // Polling assumes "upserts" (no deletes) unless your API sends snapshot:true
    if (data?.snapshot === true) {
      applySnapshot({ orders, cursor: nextCursor });
      return;
    }

    for (const o of orders) {
      if (o?.id) ordersMapRef.current.set(o.id, o);
    }
    cursorRef.current = nextCursor;

    markLive();
    bump();
  }

  function startPolling(aliveCheck) {
    clearPolling();
    modeRef.current = "POLL";

    const tick = async () => {
      if (!aliveCheck()) return;

      markReconnecting();

      try {
        await pollOnce(aliveCheck);
        failCountRef.current = 0;
        pollTimerRef.current = setTimeout(tick, pollMs);
      } catch (e) {
        if (!aliveCheck()) return;
        if (e?.name === "AbortError") return;

        failCountRef.current += 1;

        if (failCountRef.current >= 4) setConnectionStatus("OFFLINE");
        else setConnectionStatus("RECONNECTING");

        const backoff = Math.min(20000, 2000 + failCountRef.current * 3000);
        pollTimerRef.current = setTimeout(tick, backoff);
      }
    };

    tick();
  }

  function startSSE(aliveCheck) {
    clearSSE();
    modeRef.current = "SSE";

    markReconnecting();

    const streamUrl = new URL(baseUrl + streamPath);

    // Optional: if your server supports resuming via cursor query param:
    if (cursorRef.current) streamUrl.searchParams.set("cursor", cursorRef.current);

    const es = new EventSource(streamUrl.toString(), { withCredentials: false });
    esRef.current = es;

    const onAnyMessage = () => {
      sseLastMsgAtRef.current = Date.now();
      markLive();
    };

    const parse = (e) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener("open", () => {
      onAnyMessage();
    });

    es.addEventListener("snapshot", (e) => {
      if (!aliveCheck()) return;
      onAnyMessage();
      const payload = parse(e);
      if (payload) applySnapshot(payload);
    });

    es.addEventListener("upsert", (e) => {
      if (!aliveCheck()) return;
      onAnyMessage();
      const payload = parse(e);
      if (payload) applyUpsert(payload);
    });

    es.addEventListener("delete", (e) => {
      if (!aliveCheck()) return;
      onAnyMessage();
      const payload = parse(e);
      if (payload) applyDelete(payload);
    });

    es.addEventListener("heartbeat", () => {
      if (!aliveCheck()) return;
      onAnyMessage();
    });

    // Some servers just send "message" events without named event types
    es.onmessage = (e) => {
      if (!aliveCheck()) return;
      onAnyMessage();
      const payload = parse(e);
      // If it looks like a snapshot, accept it
      if (payload?.orders) applySnapshot(payload);
    };

    es.onerror = () => {
      if (!aliveCheck()) return;

      // If SSE errors, fallback to polling
      clearSSE();
      startPolling(aliveCheck);
    };

    // Watchdog: if stream is silent too long, reconnect; if still bad, fallback to polling
    const watchdog = () => {
      if (!aliveCheck()) return;

      const last = sseLastMsgAtRef.current;
      const stale = last == null ? true : Date.now() - last > sseStaleMs;

      if (stale) {
        // Try one reconnect attempt; if that fails, polling kicks in via onerror.
        clearSSE();
        startSSE(aliveCheck);
        return;
      }

      sseWatchdogTimerRef.current = setTimeout(watchdog, Math.min(5000, sseStaleMs / 2));
    };

    sseWatchdogTimerRef.current = setTimeout(watchdog, Math.min(5000, sseStaleMs / 2));
  }

  useEffect(() => {
    let alive = true;
    const aliveCheck = () => alive;

    // Prefer SSE first
    startSSE(aliveCheck);

    return () => {
      alive = false;
      clearSSE();
      clearPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, ordersPath, streamPath, pollMs, sseStaleMs]);

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
  };
}
