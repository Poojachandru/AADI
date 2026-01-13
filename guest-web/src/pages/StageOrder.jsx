import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { restaurants } from "../mock/restaurants";
import { getCart } from "../store/cartStore";
import {
  getOrder,
  createOrUpdateDraft,
  stageOrder,
  markFired,
  clearOrder,
} from "../store/orderStore";
import { injectToRestaurantTablet } from "../api/tabletBridge";

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

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

export default function StageOrder() {
  const { restaurantId } = useParams();
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const navigate = useNavigate();

  const [v, setV] = useState(0);
  const order = useMemo(() => getOrder(restaurantId), [restaurantId, v]);

  useEffect(() => {
    if (!restaurantId) return;
    const cart = getCart(restaurantId);
    if (!order && cart.items.length > 0) {
      createOrUpdateDraft(restaurantId, cart);
      setV((x) => x + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const cart = order?.cart || getCart(restaurantId);
  const subtotal = (cart.items || []).reduce((sum, x) => sum + x.priceCents * x.qty, 0);

  const [etaMinutes, setEtaMinutes] = useState(order?.arrivalPlan?.etaMinutes ?? 10);
  const [locationEnabled, setLocationEnabled] = useState(order?.location?.enabled ?? false);

  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  if (!restaurant) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="hero">
            <div className="title">Stage Order</div>
            <div className="subtle">Restaurant not found</div>
            <div className="divider" />
            <Link className="btn" to="/">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  const state = order?.state || ((cart.items || []).length ? "DRAFT" : "DRAFT");

  return (
    <div className="page">
      <div className="topbar">
        <div className="hero">
          <div className="spread">
            <div>
              <div className="kicker">Arrival & Staging</div>
              <div className="title">{restaurant.name}</div>
              <div className="subtle">Stage now. Auto-fire when you enter vicinity.</div>
            </div>

            <div className="row">
              <Link className="btn btnGhost" to={`/r/${restaurantId}/cart`}>Cart</Link>
              <Link className="btn btnGhost" to={`/r/${restaurantId}`}>Menu</Link>
              <Link className="btn btnGhost" to={`/r/${restaurantId}/status`}>Status</Link>
            </div>
          </div>

          <div style={{ height: 10 }} />
          <Timeline state={state} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="sectionTitle">Arrival Settings</div>
          <div className="divider" />

          <div className="list">
            <div className="card cardSoft">
              <div className="spread">
                <div>
                  <div style={{ fontWeight: 950 }}>Arriving in</div>
                  <div className="subtle">Used if location is off (or as backup)</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => setEtaMinutes((m) => Math.max(1, m - 1))}>−</button>
                  <span style={{ minWidth: 34, textAlign: "center", fontWeight: 950 }}>{etaMinutes}m</span>
                  <button className="btn" onClick={() => setEtaMinutes((m) => Math.min(60, m + 1))}>+</button>
                </div>
              </div>
            </div>

            <div className="card cardSoft">
              <div className="spread">
                <div>
                  <div style={{ fontWeight: 950 }}>Location (recommended)</div>
                  <div className="subtle">Auto-fire when you enter the restaurant vicinity</div>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={locationEnabled}
                    onChange={(e) => setLocationEnabled(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div style={{ height: 8 }} />
              <div className="subtle">
                Dev note: geofence wiring later. For now use “Simulate vicinity”.
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="spread">
            <button
              className="btn"
              onClick={() => {
                clearOrder(restaurantId);
                showToast("Cleared staged order");
                setV((x) => x + 1);
              }}
            >
              Reset
            </button>

            {state === "DRAFT" && (
              <button
                className="btn btnPrimary"
                disabled={(cart.items || []).length === 0}
                onClick={() => {
                  stageOrder(restaurantId, { mode: "ETA", etaMinutes }, locationEnabled);
                  showToast("Order staged");
                  setV((x) => x + 1);
                }}
              >
                Stage Now
              </button>
            )}

            {state === "STAGED" && (
              <button
                className="btn btnPrimary"
                onClick={async () => {
                  const fired = markFired(restaurantId);
                  setV((x) => x + 1);
                  showToast("Entered vicinity → Order fired");

                  try {
                    await injectToRestaurantTablet(fired);
                    showToast("Sent to restaurant tablet");
                  } catch {
                    showToast("Fired (tablet inject failed)");
                  }

                  // Go to live tracking screen
                  navigate(`/r/${restaurantId}/status`);
                }}
              >
                Simulate Vicinity → Fire
              </button>
            )}

            {state === "FIRED" && (
              <button
                className="btn btnPrimary"
                onClick={() => navigate(`/r/${restaurantId}/status`)}
              >
                View Status
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="sectionTitle">Order Summary</div>
          <div className="divider" />

          {(cart.items || []).length === 0 ? (
            <div className="subtle">No items. Go back to menu.</div>
          ) : (
            <div className="list">
              {(cart.items || []).map((x) => (
                <div key={x.itemId} className="card cardSoft">
                  <div className="spread">
                    <div>
                      <div style={{ fontWeight: 950 }}>
                        {x.qty}× {x.name}
                      </div>
                      <div className="subtle">{money(x.priceCents)} each</div>
                    </div>
                    <div className="price">{money(x.priceCents * x.qty)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          <div className="spread">
            <span className="subtle">Subtotal</span>
            <span className="price">{money(subtotal)}</span>
          </div>

          <div style={{ height: 10 }} />
          <div className="badges">
            <span className="badge badgeCyan">State: {state}</span>
            {locationEnabled ? (
              <span className="badge badgeAccent">Location On</span>
            ) : (
              <span className="badge">Location Off</span>
            )}
            <span className="badge">ETA {etaMinutes}m</span>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
