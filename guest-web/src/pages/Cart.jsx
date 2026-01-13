import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { restaurants } from "../mock/restaurants";
import { getCart, updateQty, clearCart } from "../store/cartStore";
import { createOrUpdateDraft } from "../store/orderStore";

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Cart() {
  const { restaurantId } = useParams();
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const navigate = useNavigate();

  const [v, setV] = useState(0);
  const cart = useMemo(() => getCart(restaurantId), [restaurantId, v]);
  const subtotal = cart.items.reduce((sum, x) => sum + x.priceCents * x.qty, 0);

  if (!restaurant) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="hero">
            <div className="title">Cart</div>
            <div className="subtle">Restaurant not found</div>
            <div className="divider" />
            <Link className="btn" to="/">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="hero">
          <div className="spread">
            <div>
              <div className="kicker">Cart</div>
              <div className="title">{restaurant.name}</div>
              <div className="subtle">Review items before staging the order.</div>
            </div>
            <div className="row">
              <Link className="btn btnGhost" to={`/r/${restaurantId}`}>Back to Menu</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="sectionTitle">Items</div>
          <div className="divider" />

          {cart.items.length === 0 ? (
            <div className="subtle">Your cart is empty.</div>
          ) : (
            <div className="list">
              {cart.items.map((x) => (
                <div key={x.itemId} className="card cardSoft">
                  <div className="spread">
                    <div>
                      <div style={{ fontWeight: 950 }}>{x.name}</div>
                      <div className="subtle">{money(x.priceCents)} each</div>
                    </div>

                    <div className="row">
                      <button
                        className="btn"
                        onClick={() => {
                          updateQty(restaurantId, x.itemId, x.qty - 1);
                          setV((n) => n + 1);
                        }}
                      >
                        −
                      </button>

                      <span style={{ minWidth: 26, textAlign: "center", fontWeight: 950 }}>
                        {x.qty}
                      </span>

                      <button
                        className="btn"
                        onClick={() => {
                          updateQty(restaurantId, x.itemId, x.qty + 1);
                          setV((n) => n + 1);
                        }}
                      >
                        +
                      </button>
                    </div>
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

          <div style={{ height: 12 }} />

          <div className="spread">
            <button
              className="btn"
              onClick={() => {
                clearCart(restaurantId);
                setV((n) => n + 1);
              }}
            >
              Clear
            </button>

            <button
              className="btn btnPrimary"
              disabled={cart.items.length === 0}
              onClick={() => {
                // Save draft order before staging
                createOrUpdateDraft(restaurantId, cart);
                navigate(`/r/${restaurantId}/stage`);
              }}
            >
              Stage Order
            </button>
          </div>
        </div>

        <div className="card">
          <div className="sectionTitle">What happens next</div>
          <div className="divider" />
          <div className="subtle">
            You’ll stage the order, set arrival (ETA) or enable location, and AADI will auto-fire
            when you enter the restaurant vicinity. The restaurant tablet will show it immediately.
          </div>

          <div style={{ height: 12 }} />
          <div className="badges">
            <span className="badge badgeCyan">Draft → Staged</span>
            <span className="badge badgeAccent">Staged → Fired</span>
          </div>
        </div>
      </div>
    </div>
  );
}
