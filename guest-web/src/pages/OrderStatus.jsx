import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { restaurants } from "../mock/restaurants";
import { getOrder } from "../store/orderStore";
import { fetchGuestOrderStatus } from "../api/restaurantApi";

function Timeline({ state }) {
  const steps = ["DRAFT", "STAGED", "FIRED", "PREPARING", "READY"];
  const idx = steps.indexOf(state || "DRAFT");

  return (
    <div className="timeline">
      {steps.map((s, i) => (
        <div key={s} className={`tstep ${i <= idx ? "tstepOn" : ""}`}>
          <div className="tdot" />
          <div className="tlabel">{s}</div>
        </div>
      ))}
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

export default function OrderStatus() {
  const { restaurantId } = useParams();
  const restaurant = restaurants.find((r) => r.id === restaurantId);

  const local = useMemo(() => getOrder(restaurantId), [restaurantId]);
  const guestOrderId = local?.id;

  const [remote, setRemote] = useState(null);
  const [err, setErr] = useState(null);
  const [tick, setTick] = useState(0);

  const localState = local?.state || "DRAFT";
  const effectiveState =
    remote?.order?.status === "READY"
      ? "READY"
      : remote?.order?.status === "PREPARING"
        ? "PREPARING"
        : localState;

  useEffect(() => {
    if (!guestOrderId) return;

    let alive = true;
    let timer = null;

    const poll = async () => {
      try {
        const data = await fetchGuestOrderStatus(guestOrderId);
        if (!alive) return;
        setRemote(data);
        setErr(null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (!alive) return;
        setTick((t) => t + 1);
        timer = setTimeout(poll, 2000);
      }
    };

    poll();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [guestOrderId]);

  if (!restaurant) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="hero">
            <div className="title">Order Status</div>
            <div className="subtle">Restaurant not found</div>
            <div className="divider" />
            <Link className="btn" to="/">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!guestOrderId) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="hero">
            <div className="kicker">Order Status</div>
            <div className="title">{restaurant.name}</div>
            <div className="subtle">No active order found. Create one from the menu.</div>
            <div className="divider" />
            <Link className="btn btnPrimary" to={`/r/${restaurantId}`}>
              Go to Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ro = remote?.order;

  return (
    <div className="page">
      <div className="topbar">
        <div className="hero">
          <div className="spread">
            <div>
              <div className="kicker">Order Status</div>
              <div className="title">{restaurant.name}</div>
              <div className="subtle">
                Order <span className="badge badgeCyan">{guestOrderId}</span>
              </div>
            </div>
            <div className="row">
              <Link className="btn btnGhost" to={`/r/${restaurantId}`}>
                Menu
              </Link>
              <Link className="btn btnGhost" to={`/r/${restaurantId}/stage`}>
                Staging
              </Link>
            </div>
          </div>

          <div style={{ height: 10 }} />
          <Timeline state={effectiveState} />

          <div style={{ height: 10 }} />
          <div className="subtle">
            Last refresh: {new Date().toLocaleTimeString()} • {err ? `Error: ${err}` : "Live"}
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="sectionTitle">Live from Restaurant</div>
          <div className="divider" />

          {!remote ? (
            <div className="subtle">Loading status…</div>
          ) : remote.found === false ? (
            <div className="subtle">
              Restaurant hasn’t received this order yet (or it was cleared).
            </div>
          ) : (
            <>
              <div className="badges">
                <span className="badge badgeAccent">Status: {ro.status}</span>
                <span className="badge">Table: {ro.table ?? "Unseated"}</span>
                <span className="badge">Fired: {fmtTime(ro.updatedAt || ro.createdAt)}</span>
              </div>

              <div style={{ height: 12 }} />

              <div className="list">
                {(ro.items || []).map((it, idx) => (
                  <div key={idx} className="card cardSoft">
                    <div className="spread">
                      <div style={{ fontWeight: 950 }}>
                        {it.qty ?? 1}× {it.name}
                      </div>
                      {it.station ? <span className="badge">{it.station}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="sectionTitle">What to expect</div>
          <div className="divider" />
          <div className="subtle">
            When you enter the vicinity, AADI fires the order. The kitchen moves it to PREPARING and
            READY. This screen will reflect that state live.
          </div>

          <div style={{ height: 12 }} />
          <div className="badges">
            <span className="badge badgeCyan">Fired → Preparing</span>
            <span className="badge badgeAccent">Preparing → Ready</span>
          </div>

          <div style={{ height: 12 }} />
          <div className="subtle">
            Debug: refresh tick {tick}
          </div>
        </div>
      </div>
    </div>
  );
}
